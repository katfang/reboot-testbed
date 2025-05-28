import { ReaderContext, TransactionContext, WriterContext } from "@reboot-dev/reboot";

import {
  AckMoveRequest,
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
import { errors_pb } from "@reboot-dev/reboot-api";

// REPRO: if PIECES_PER_TEAM = 1, this works as expected.
const PIECES_PER_TEAM = 5;

function pieceId(gameId: string, team: Team, index: number, pieceType: PieceType): string {
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
      return `${gameId}-${teamStr}-p${index}`;
    default:
      return `${gameId}-${teamStr}-${index}`;
  }
}

function flipTeam(team: Team): Team {
  if (team === Team.WHITE) return Team.BLACK;
  else if (team === Team.BLACK) return Team.WHITE;
  else return Team.TEAM_UNKNOWN;
}

export class GameServicer extends Game.Servicer {

  async initGame(
    context: TransactionContext,
    state: Game.State,
    request: InitGameRequest
  ) {
    let keysList: string[][] = [];
    // make the new subboard
    keysList.push(await this.makeInitialBoardPieces(context, context.stateId));

    state.pieceIds = keysList.flat();
    state.players = {};
    state.nextTeamAssignment = Team.WHITE;
    state.nextTeamToMove = Team.WHITE;
    state.movesQueue = [];
    state.outstandingPlayerMoves = {};
    state.outstandingPieceMoves = {};

    return {};
  }

  async makeInitialBoardPieces(
    context: TransactionContext,
    stateId: string,
  ) {
    let pieceIds = [];
    for (let index = 0; index < PIECES_PER_TEAM; index++) {
      const whitePieceId = pieceId(stateId, Team.WHITE, index, PieceType.PAWN);
      pieceIds.push(whitePieceId);
      await Piece.ref(whitePieceId)
        .idempotently()
        .makePiece(
          context,
          new Piece.State({
            team: Team.WHITE,
            type: PieceType.PAWN,
            loc: {
              row: 1,
              col: index
            }
          })
        );
      const blackPieceId = pieceId(stateId, Team.BLACK, index, PieceType.PAWN)
      pieceIds.push(blackPieceId);
      await Piece.ref(blackPieceId)
        .idempotently()
        .makePiece(
          context,
          new Piece.State({
            team: Team.BLACK,
            type: PieceType.PAWN,
            loc: {
              row: 8-2,
              col: index
            }
          })
        );
    }
    return pieceIds;
  }

  async boardPieces(
    context: ReaderContext,
    state: Game.State,
    request: EmptyRequest
  ) {
    const response = new BoardPiecesResponse();
    // TODO: is there a way to create this
    // const pieces = new Map<string, PieceMessage>();

    // make the new subboard
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
    } else if (piece.loc?.row !== request.start.row || piece.loc?.col !== request.start.col) {
        throw new Game.QueueMoveAborted(
          new InvalidMoveError({
            message: "That piece isn't there anymore."
          })
        );
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
    state.movesQueue.push(request);

    // update the indices
    state.outstandingPieceMoves[request.pieceId] = true;
    if (request.playerId in state.outstandingPlayerMoves) {
      state.outstandingPlayerMoves[request.playerId].moveIds.push(moveId);
    } else {
      state.outstandingPlayerMoves[request.playerId] = new ListOfMoves({ moveIds: [moveId] });;
    }

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
    state.movesQueue = state.movesQueue.filter(qMove =>
      qMove.playerId !== playerId || qMove.pieceId !== pieceId
    );

    // mark move as canceled
    await Move.ref(request.moveId).setStatus(context, {
      status: MoveStatus.MOVE_CANCELED,
    });

    return {};
  }

  async queues(
    context: ReaderContext,
    state: Game.State,
    request: EmptyRequest
  ) {
    return {
      movesQueue: state.movesQueue,
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