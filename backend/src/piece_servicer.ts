import { ReaderContext, TransactionContext, WriterContext } from "@reboot-dev/reboot";

import {
  InvalidMoveError,
  Location,
  LocationRequiredError,
  MoveRequest
} from "../../api/cheaoss/v1/move_pb.js"

import {
  LocPieceIndex,
  Piece,
  PieceType,
} from "../../api/cheaoss/v1/piece_rbt.js"

import { EmptyRequest, EmptyResponse } from "../../api/cheaoss/v1/util_pb.js"
import { Team } from "../../api/cheaoss/v1/cheaoss_pb.js";
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

export class PieceServicer extends Piece.Servicer {
  async makePiece(
    context: TransactionContext,
    state: Piece.State,
    request: Piece.State
  ) {
    if (request.loc === undefined) {
      throw new Piece.MakePieceAborted(new LocationRequiredError());
    }
    state.team = request.team;
    state.type = request.type;
    state.loc = request.loc;
    state.hasMoved = false;
    await pieceToLocIdRef(context.stateId, state.loc).set(
      context,
      { pieceId: context.stateId }
    );
    return {};
  }

  async piece(
    context: ReaderContext,
    state: Piece.State,
    request: EmptyRequest,
  ) {
    return state;
  }

  async movePiece(
    context: TransactionContext,
    state: Piece.State,
    request: MoveRequest
  ) {
    // Data validation check -- should not happen since queueMove does this check before adding it to the queue.
    if (request.start === undefined || request.end === undefined) {
      throw new Piece.MovePieceAborted(
        new InvalidMoveError({
          message: "Move requests must have a start and an end"
        })
      )
    }
    // check the piece is in the right place
    if (state.loc?.row !== request.start.row && state.loc?.col !== request.start.col) {
      throw new Piece.MovePieceAborted(
        new InvalidMoveError({
          message: "Piece not found at starting location."
        })
      );
    }

    console.log("!!! Before validate movement pattern");
    const check = validateMovementPattern(state, request.start, request.end);
    console.log("!!! After validate movement pattern");
    if (check instanceof InvalidMoveError) {
      throw new Piece.MovePieceAborted(check);
    } else {
      // validate with the other pieces on the board
      console.log("!!! Before validate move with board");
      const checkBoard = await validateMoveWithBoard(context, check, state , request.start, request.end);
      console.log("!!! After validate move with board");
      if (checkBoard instanceof InvalidMoveError) {
        throw new Piece.MovePieceAborted(checkBoard);
      } else if (typeof checkBoard === "string") {
        // remove piece if it is there
        Piece.ref(checkBoard).remove(context);
      }

      // update the location
      state.loc = request.end;
      state.hasMoved = true;

      // update the idnex
      console.log("!!! clear", request.start);
      await pieceToLocIdRef(context.stateId, request.start).clear(context);
      console.log("!!! 2", context.stateId, request.end);
      console.log("!!! set", request.end);
      try {
      await pieceToLocIdRef(context.stateId, request.end).set(
        context,
        { pieceId: context.stateId }
      );
      } catch (e) {
        console.error("!!! error", e);
      }
      console.log("!!! 3");
      return {};
    }
  }

  async remove(
    context: TransactionContext,
    state: Piece.State,
    request: EmptyRequest
  ) {
    state.hasMoved = true;
    if (state.loc !== undefined) {
      await pieceToLocIdRef(context.stateId, state.loc).clear(context);
    }
    state.loc = undefined;
    return {};
  }
}

/**
 * EXPECTATION: this is only called from PieceServicer. Expects a Piece context.
 * returns
 *  1. InvalidMoveError -- if the validation doesn't check
 *  2. pieceId -- if there is a piece to capture
 *  3. null -- the piece is free to move there; there is nothing to capture
 */
async function validateMoveWithBoard(
  context: ReaderContext|WriterContext|TransactionContext,
  validationNeeded: MoveValidation,
  piece: Piece.State,
  start: Location,
  end: Location
): Promise<InvalidMoveError|string|null> {
  // TODO: need to make sure you're not trying to take your own piece.

  // returns null if nothing in any of the spots
  // by default, uses end of move request, but for king castling, needs a different end loc check
  async function checkClear(endLoc?: Location): Promise<InvalidMoveError|string|null> {
    let endCheck = (endLoc) ? endLoc: end;
    let rowDiff = endCheck.row - start.row;
    let colDiff = endCheck.col - start.col;
    // make sure there's no pieces along the way
    // luckily, pieces can only move orthogonally or diagonally.
    let bigDiff = Math.max(Math.abs(rowDiff), Math.abs(colDiff));
    for (let i = 1; i < bigDiff; i++) {
      let row = start.row + (Math.sign(rowDiff)*i);
      let col = start.col + (Math.sign(colDiff)*i);
      console.log("!!! get", new Location({row: row, col: col}));
      let locCheck = await getPieceIdAtLocId(
        context,
        context.stateId,
        new Location({ row: row, col: col })
      );
      if (locCheck !== null) {
        return new InvalidMoveError({
          message: "Invalid move. The path must be clear."
        });
      }
    }

    // the path was empty, only a piece at the final location.
    console.log("!!! get", end);
    return await getPieceIdAtLocId(context, context.stateId, end);
  }

  switch (validationNeeded as MoveValidation) {
    case MoveValidation.CHECK_CLEAR_PATH:
      // check each space
      return checkClear();

    case MoveValidation.CHECK_FINAL_SQUARE_CAPTURE:
      // TODO: What does this return (or throw) if there's no piece there.
      return await getPieceIdAtLocId(context, context.stateId, end);

    case MoveValidation.CHECK_PAWN_MOVE:
      let locCheck = await checkClear();
      if (locCheck !== null) {
        return new InvalidMoveError({
          message: "Invalid pawn move. Pawns cannot move forward if another piece is there."
        });
      } else {
        return null;
      }

    case MoveValidation.CHECK_PAWN_CAPTURE:
      // TODO: What does this return (or throw) if there's no piece there.
      let capturePieceId = await getPieceIdAtLocId(context, context.stateId, end);
      if (capturePieceId === null) {
        return new InvalidMoveError({
          message: "Invalid pawn move. If moving diagonally, it must capture. WARNING EN PASSANT NOT IMPLEMENTED"
        });
      } else {
        return capturePieceId;
      }

    case MoveValidation.CHECK_KING_CASTLE:
      let rookPieceId = context.stateId.slice(0, -1);
      let colDiff = end.col - start.col;
      rookPieceId += (colDiff > 0) ? "7" : "0";
      let rookPiece = await Piece.ref(rookPieceId).piece(context);
      if (rookPiece.hasMoved || rookPiece.loc === undefined) {
        return new InvalidMoveError({
          message: "Invalid castle. Cannot castle with a rook that has moved."
        });
      }

      // otherwise check the pieces in between -- this is dependent on rook position, not king.
      let endCheckLoc = rookPiece.loc;
      endCheckLoc.col -= Math.sign(colDiff);

      // otherwise, check the spaces in between
      let locCheckCastle = await checkClear(endCheckLoc); 
      if (locCheckCastle !== null) {
        return new InvalidMoveError({
          message: "Invalid castle. Cannot castle when there are pieces between king and rook."
        });
      }

      // rook hasn't moved, and spaces are clear. valid castle!
      // TODO: technically needs to check if king is in check.
      return null;

    default:
      throw new Piece.MovePieceAborted(new InvalidMoveError({
        message: "Invalid move. Did not pass board validation."
      }))
  }
}

enum MoveValidation {
  INVALID = 0,
  // for all non-pawn, non-knight pieces, this means all spaces in between need to be clear EXCEPT the final square
  CHECK_CLEAR_PATH,
  // for knights (jumps) and kings (moves one square), only need to check that the final square has something to capture
  // pawn capture is still different because for pawns, there MUST be something to capture,
  // whereas for knights, there could be nothing there
  CHECK_FINAL_SQUARE_CAPTURE,
  // pawns can only move forward if there's nothing blocking them.
  CHECK_PAWN_MOVE,
  // a pawn can only move diagonally if it takes a piece or via en passant (ignoring en passant for now)
  CHECK_PAWN_CAPTURE,
  // a king can only castle if it and the rook have not moved
  CHECK_KING_CASTLE,
}

/**
 * This DOES NOT check if other pieces are in the way.
 * Uses start, end b/c piece.loc annoyingly is optional by protobuf
 */
export function validateMovementPattern(piece: Piece.State, start: Location, end: Location): InvalidMoveError|MoveValidation {
  const rowDiff = end.row - start.row;
  const colDiff = end.col - start.col;
  if (rowDiff === 0 && colDiff === 0) {
    return new InvalidMoveError({
      message: "Invalid move. The piece must move."
    });
  }

  switch (piece.type as PieceType) {

    case PieceType.PAWN:
      // TODO: disallow moving forward if something else is there
      // can only move inc row by 1 if white, dec row by 1 if black.
      let direction = (piece.team === Team.WHITE) ? 1 : -1;
      if (rowDiff === direction) {
        if (colDiff === 0) {
          // moved one space
          return MoveValidation.CHECK_PAWN_MOVE;
        } else if (Math.abs(colDiff) === 1) {
          // move diagonally
          return MoveValidation.CHECK_PAWN_CAPTURE;
        }
      } else if (!piece.hasMoved
          && rowDiff === (2*direction)
          && colDiff === 0
      ) {
        // allowed to move two spaces on first turn
        return MoveValidation.CHECK_PAWN_MOVE;
      }
      return new InvalidMoveError({
        message: "Invalid pawn move."
      });

    case PieceType.BISHOP:
      // must move same number of rows as columns
      if (isDiagMove(rowDiff, colDiff)) {
        return MoveValidation.CHECK_CLEAR_PATH;
      }
      return  new InvalidMoveError({
        message: "Invalid bishop move."
      });

    case PieceType.KNIGHT:
      if ((Math.abs(rowDiff) === 2 && Math.abs(colDiff) === 1)
          || (Math.abs(rowDiff) === 1 && Math.abs(colDiff) === 2)
      ) {
        return MoveValidation.CHECK_FINAL_SQUARE_CAPTURE;
      }
      return new InvalidMoveError({
        message: "Invalid knight move."
      });

    case PieceType.ROOK:
      // TODO: castling
      if (isOrthogonalMove(rowDiff, colDiff)) {
        return MoveValidation.CHECK_CLEAR_PATH;
      }
      return new InvalidMoveError({
        message: "Invalid rook move."
      });

    case PieceType.QUEEN:
      if (isOrthogonalMove(rowDiff, colDiff)
          || isDiagMove(rowDiff, colDiff)
      ) {
        return MoveValidation.CHECK_CLEAR_PATH;
      }
      return new InvalidMoveError({
        message: "Invalid queen move."
      });

    case PieceType.KING:
      // TODO: castling
      if (Math.abs(rowDiff) <= 1 && Math.abs(colDiff) <= 1) {
        return MoveValidation.CHECK_FINAL_SQUARE_CAPTURE;
      } else if (!piece.hasMoved && Math.abs(colDiff) === 2 && rowDiff === 0) {
        return MoveValidation.CHECK_KING_CASTLE;
      }
      return new InvalidMoveError({
        message: "Invalid king move."
      });

    default:
      return new InvalidMoveError({
        message: `Is this even a chess piece? ${piece.type}`
      });
  }
}
function isDiagMove(rowDiff: number, colDiff: number): boolean {
  return Math.abs(rowDiff) === Math.abs(colDiff);
}
function isOrthogonalMove(rowDiff: number, colDiff: number): boolean {
  return rowDiff === 0 || colDiff ===0;
}

export function validateChessMove(piece: Piece.State, end: Location, context?: ReaderContext): InvalidMoveError|null {

  return null;
}

/**
 * PieceId can actually be any piece on the board, what we actually want is the game-id on its id.
 */
function pieceToLocIdRef(pieceId: string, loc: Location) {
  // clean abstraction wise, I hate the string-split, but it will in fact get us the game id
  let gameId = pieceId.split("-", 1)[0];
  let locId = `${gameId}-${loc.row}-${loc.col}`;
  console.log("!!! 5", locId)
  return LocPieceIndex.ref(locId);
}

/**
 * We just have to handle this error too often for it to be littered everywhere
 * pieceId can be for any piece in the game. we just actually need the game id.
 */
async function getPieceIdAtLocId(
  context: ReaderContext|WriterContext|TransactionContext,
  pieceId: string,
  loc: Location
): Promise<string|null> {
  try {
    return (await pieceToLocIdRef(pieceId, loc).get(context)).pieceId;
  } catch (e) {
    if (e instanceof LocPieceIndex.GetAborted && e.error instanceof errors_pb.StateNotConstructed) {
      return null;
    }
  }
  return null;
}


export class LocPieceIndexServicer extends LocPieceIndex.Servicer {
  async get(
    context: ReaderContext,
    state: LocPieceIndex.State,
    request: EmptyRequest
  ) {
    // Two possible responses for there not being an object:
    // * an error from reboot saying nothing at that index
    // * empty string for pieceId
    return state;
  }

  async set(
    context: WriterContext,
    state: LocPieceIndex.State,
    request: LocPieceIndex.State,
  ) {
    console.log("!!! 4");
    state.pieceId = request.pieceId;
    return {};
  }

  async clear(
    context: WriterContext,
    state: LocPieceIndex.State,
    request: EmptyRequest
  ) {
    // !!! Reboot has no real delete, so the best we can do is set it to empty string
    state.pieceId = "";
    return {};
  }
}