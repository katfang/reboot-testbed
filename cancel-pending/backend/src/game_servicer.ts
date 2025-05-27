import { ReaderContext, TransactionContext, WriterContext } from "@reboot-dev/reboot";

import {
  AckMoveRequest,
  AssignTeamRequest,
  BoardPiecesResponse,
  CancelMoveRequest,
  Game,
  GetOutstandingMovesRequest,
  InitGameRequest,
  ListOfMoves
} from "../../api/cheaoss/v1/game_rbt.js"

import {
  InvalidMoveError,
  Move,
  MoveCannotBeCanceledError,
  MoveRequest,
  MoveStatus
} from "../../api/cheaoss/v1/move_rbt.js"

import {
  Piece,
  PieceType,
} from "../../api/cheaoss/v1/piece_rbt.js"

import { EmptyRequest } from "../../api/cheaoss/v1/util_pb.js"
import { Team } from "../../api/cheaoss/v1/cheaoss_pb.js";
import { pieceToLocId, validateMovementPattern } from "./piece_servicer.js";
import { LocPieceIndex } from "../../api/cheaoss/v1/piece_rbt.js";
import { errors_pb } from "@reboot-dev/reboot-api";

const BOARD_SIZE = 1;
const BACK_ROW: PieceType[] = [
  PieceType.ROOK,
  PieceType.KNIGHT,
  PieceType.BISHOP,
  PieceType.QUEEN,
  PieceType.KING,
  PieceType.BISHOP,
  PieceType.KNIGHT,
  PieceType.ROOK
];

function pieceId(gameId: string, team: Team, startingRow: number, startingCol: number, index: number, pieceType: PieceType): string {
  let teamStr = "u"; // Unknown
  switch(team as Team) {
    case Team.WHITE:
      teamStr = "w";
      break;
    case Team.BLACK:
      teamStr = "b";
      break;
    case Team.TEAM_UNKNOWN:
    default:
      teamStr = "u";
      break;
  }
  switch(pieceType as PieceType) {
    case PieceType.PAWN:
      return `${gameId}-${teamStr}-${startingRow}-${startingCol}-p${index}`;
    default:
      return `${gameId}-${teamStr}-${startingRow}-${startingCol}-${index}`;
  }
}

function pieceIds(gameId: string, startingRow: number, startingCol: number): string[] {
  let keys: string[] = [];
  for (const [index, item] of BACK_ROW.entries()) {
    keys.push(pieceId(gameId, Team.WHITE, startingRow, startingCol, index, item));
    keys.push(pieceId(gameId, Team.WHITE, startingRow, startingCol, index, PieceType.PAWN));
    keys.push(pieceId(gameId, Team.BLACK, startingRow, startingCol, index, item));
    keys.push(pieceId(gameId, Team.BLACK, startingRow, startingCol, index, PieceType.PAWN));
  }
  return keys;
}

function flipTeam(team: Team): Team {
  if (team === Team.WHITE) return Team.BLACK;
  else if (team === Team.BLACK) return Team.WHITE;
  else return Team.TEAM_UNKNOWN;
}

export class GameServicer extends Game.Servicer {

  async assignTeam(
    context: WriterContext,
    state: Game.State,
    request: AssignTeamRequest
  ) {
    // if we've seen the player before, return their existing team
    if (state.players[request.playerId] !== undefined) {
      return { team: state.players[request.playerId] };
    }

    // assume that init game has been run
    // TODO: possibly should throw an error if we ever have unknown team
    const team = state.nextTeamAssignment;
    state.nextTeamAssignment = flipTeam(team);
    state.players[request.playerId] = team;
    return { team: team };
  }

  async initGame(
    context: TransactionContext,
    state: Game.State,
    request: InitGameRequest
  ) {
    // add only two pawns
    await Piece.ref(pieceId(context.stateId, Team.WHITE, 0, 0, 0, PieceType.PAWN))
      .idempotently()
      .makePiece(
        context,
        new Piece.State({
          team: Team.WHITE,
          type: PieceType.PAWN,
          loc: {
            row: 0,
            col: 0
          }
        })
      );
    await Piece.ref(pieceId(context.stateId, Team.BLACK, 0, 0, 1, PieceType.PAWN))
      .idempotently()
      .makePiece(
        context,
        new Piece.State({
          team: Team.BLACK,
          type: PieceType.PAWN,
          loc: {
            row: 1,
            col: 1
          }
        })
      );

    state.pieceIds = [
      pieceId(context.stateId, Team.WHITE, 0, 0, 0, PieceType.PAWN),
      pieceId(context.stateId, Team.BLACK, 0, 0, 1, PieceType.PAWN)
    ];
    state.players = {};
    state.nextTeamAssignment = Team.WHITE;
    state.nextTeamToMove = Team.WHITE;
    state.whiteMovesQueue = [];
    state.blackMovesQueue = [];
    state.outstandingPlayerMoves = {};
    state.outstandingPieceMoves = {};

    return {};
  }

  async boardPieces(
    context: ReaderContext,
    state: Game.State,
    request: EmptyRequest
  ) {
    const response = new BoardPiecesResponse();
    // TODO: is there a way to create this
    // const pieces = new Map<string, PieceMessage>();

    for (const pieceId of state.pieceIds) {
      response.pieces[pieceId] = await Piece.ref(pieceId).piece(context);
    }
    return response;
  }

  async queueMove(
    context: TransactionContext,
    state: Game.State,
    request: MoveRequest
  ) {
    let pieceRef = Piece.ref(request.pieceId);
    let piece;
    try {
      piece = await pieceRef.piece(context);
    } catch (e) {
      // TODO: what actually do we get if a piece doesn't exist --
      // you get a `PiecePieceAborted: rbt.v1alpha1.StateNotConstructed`
      // which I guess ... is sort of handled ... in that it'll throw before we get here.
      // TODO: this might actually swallow more than we expect.
      throw new Game.QueueMoveAborted(
        new InvalidMoveError({
          message: "Piece not found"
        })
      );
    }

    // Outstanding moves check
    if (request.pieceId in state.outstandingPieceMoves) {
      // Make sure each piece has one move outstanding
      throw new Game.QueueMoveAborted(
        new InvalidMoveError({
          message: "This piece is already getting moved by someone else."
        })
      );
    }

    // Data validation check
    if (request.start === undefined || request.end === undefined) {
      throw new Game.QueueMoveAborted(
        new InvalidMoveError({
          message: "Move requests must have a start and an end"
        })
      )
    }

    // Chess logic checks
    if (state.players[request.playerId] !== piece.team) {
      throw new Game.QueueMoveAborted(
        new InvalidMoveError({
          message: "You can only move your team's pieces."
        })
      );
    } else if (piece.loc?.row !== request.start.row || piece.loc?.col !== request.start.col) {
        throw new Game.QueueMoveAborted(
          new InvalidMoveError({
            message: "That piece isn't there anymore."
          })
        );
    } else {
      const pieceToCheck = new Piece.State();
      pieceToCheck.copyFrom(piece); // TODO: some left over troubles from the fact I called it PieceMethod.Piece & have a message caleld Piece
      const check = validateMovementPattern(pieceToCheck, request.start, request.end);
      if (check instanceof InvalidMoveError) {
        throw new Game.QueueMoveAborted(check);
      }
    }

    // store the move
    let moveId = `${request.playerId}-${request.pieceId}`;
    await Move.ref(moveId).store(
      context,
      {
        playerId: request.playerId,
        pieceId: request.pieceId,
        start: request.start,
        end: request.end,
        status: MoveStatus.MOVE_QUEUED
      }
    )

    // queue the move
    if (state.players[request.playerId] == Team.WHITE) {
      state.whiteMovesQueue.push(request);
    } else if (state.players[request.playerId] == Team.BLACK) {
      state.blackMovesQueue.push(request);
    }


    // update the indices
    state.outstandingPieceMoves[request.pieceId] = true;
    if (request.playerId in state.outstandingPlayerMoves) {
      state.outstandingPlayerMoves[request.playerId].moveIds.push(moveId);
    } else {
      state.outstandingPlayerMoves[request.playerId] = new ListOfMoves({ moveIds: [moveId] });;
    }

    await this.ref().schedule().runQueue(context);

    return { moveId: moveId };
  }

  async cancelMove(
    context: TransactionContext,
    state: Game.State,
    request: CancelMoveRequest
  ) {
    // TODO: check you are the player who made the move
    let move;
    try {
      move = await Move.ref(request.moveId).get(context);
    } catch (e) {
      if (e instanceof Move.GetAborted && e.error instanceof errors_pb.StateNotConstructed) {
        throw new Game.CancelMoveAborted(
          new MoveCannotBeCanceledError({
            message: "No such move in the system."
          })
        );
      }
      // dunno this error, throw it.
      throw e;
    }

    if (move.status !== MoveStatus.MOVE_QUEUED) {
      throw new Game.CancelMoveAborted(
        new MoveCannotBeCanceledError({
          message: `Move is in state ${MoveStatus[move.status]}. Cannot be canceled.`
        })
      );
    }

    // get the associated player, piece
    let playerId = move.playerId;
    let pieceId = move.pieceId;

    // remove from piece outstanding moves
    // leave in player outstanding moves for player to ack
    delete state.outstandingPieceMoves[pieceId];

    // remove from queue
    let team = state.players[playerId];
    if (team === Team.WHITE) {
      state.whiteMovesQueue = state.whiteMovesQueue.filter(qMove =>
        qMove.playerId !== playerId || qMove.pieceId !== pieceId
      );
    } else {
      state.blackMovesQueue = state.blackMovesQueue.filter(qMove =>
        qMove.playerId !== playerId || qMove.pieceId !== pieceId
      );
    }

    // mark move as canceled
    await Move.ref(request.moveId).setStatus(context, {
      status: MoveStatus.MOVE_CANCELED,
    });

    return {};
  }

  async runQueue(
    context: TransactionContext,
    state: Game.State,
    request: EmptyRequest
  ) {
    // TODO: check if this works. We're trying to grab the queue
    const queue = (state.nextTeamToMove === Team.WHITE) ? state.whiteMovesQueue : state.blackMovesQueue;

    // If there is no next move to make, get out of here
    if (queue.length === 0) {
      return {};
    }

    // take the move and make it
    let move = queue.shift();
    if (move === undefined) { return {}; } // not possible since length > 0, but making the wiggly lines happy

    // TODO(reboot-dev/reboot#28): workaround for throwing errors on invalid chess moves
    let moveResult = await Piece.ref(move.pieceId).idempotently().movePieceWorkaround(context, move);

    // if the move succeeds, change which team gets to play, and mark move as executed.
    if (moveResult.invalidMove === undefined) {
      // flip the team who can play
      state.nextTeamToMove = flipTeam(state.nextTeamToMove);

      // remove from indices
      // DO NOT remove from player index: AckMove will do that instead b/c we need to make sure the client knows the move has been executed or errored.
      delete state.outstandingPieceMoves[move.pieceId];
      await Move.ref(`${move.playerId}-${move.pieceId}`)
        .idempotently()
        .setStatus(context, { status: MoveStatus.MOVE_EXECUTED });

    } else {
      // invalid chess move, delete the outstanding move and mark as error
      delete state.outstandingPieceMoves[move.pieceId];
      await Move.ref(`${move.playerId}-${move.pieceId}`)
        .idempotently()
        .setStatus(
          context,
          {
            status: MoveStatus.MOVE_ERRORED,
            error: moveResult.invalidMove.message
          }
        );
    }


    // check if there's more moves to run, if so, run the queue in half a second
    const otherQueue = (state.nextTeamToMove === Team.WHITE) ? state.whiteMovesQueue : state.blackMovesQueue;
    if (otherQueue.length > 0) {
      await this.ref().schedule({
        when: new Date(Date.now() + 500)
      }).runQueue(context);
    }

    return {};
  }

  async queues(
    context: ReaderContext,
    state: Game.State,
    request: EmptyRequest
  ) {
    return {
      whiteMovesQueue: state.whiteMovesQueue,
      blackMovesQueue: state.blackMovesQueue
    }
  }

  async getOutstandingMoves(
    context: ReaderContext,
    state: Game.State,
    request: GetOutstandingMovesRequest
  ) {
    let moves: { [id: string ]: Move } = {};
    if (request.playerId in state.outstandingPlayerMoves) {
      let moveIds = state.outstandingPlayerMoves[request.playerId].moveIds;
      // collect all the moves
      for (const moveId of moveIds) {
        moves[moveId] = await Move.ref(moveId).get(context);
      }
    }
    console.log("!!! get outstanding moves", moves);
    return { moves: moves };
  }

  async ackMove(
    context: TransactionContext,
    state: Game.State,
    request: AckMoveRequest
  ) {
    if (!(request.playerId in state.outstandingPlayerMoves)) {
      // there's no moves to acknowledge, what are we doing here.
      return {};
    }

    await Move.ref(request.moveId).ack(context);
    let moveIds = state.outstandingPlayerMoves[request.playerId].moveIds;
    let slice = moveIds.filter(moveId => moveId !== request.moveId);
    state.outstandingPlayerMoves[request.playerId] = new ListOfMoves({ moveIds: slice });
    return {};
  }
}