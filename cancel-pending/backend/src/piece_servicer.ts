import { ReaderContext, TransactionContext, WriterContext } from "@reboot-dev/reboot";

import {
  Location,
  LocationRequiredError,
} from "../../api/cheaoss/v1/move_pb.js"

import {
  LocPieceIndex,
  Piece,
} from "../../api/cheaoss/v1/piece_rbt.js"

import { EmptyRequest } from "../../api/cheaoss/v1/util_pb.js"

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

}

export function pieceToGameId(pieceId: string) {
  return pieceId.split("-", 1)[0];
}

/**
 * @param pieceId Can be pieceId or gameId
 */
export function pieceToLocId(pieceId: string, row: number, col: number) {
  return `${pieceToGameId(pieceId)}-${row}-${col}`;
}

/**
 * PieceId can actually be any piece on the board, what we actually want is the game-id on its id.
 */
function pieceToLocIdRef(pieceId: string, loc: Location) {
  // clean abstraction wise, I hate the string-split, but it will in fact get us the game id
  let locId = pieceToLocId(pieceId, loc.row, loc.col);
  return LocPieceIndex.ref(locId);
}

export class LocPieceIndexServicer extends LocPieceIndex.Servicer {
  async get(
    context: WriterContext,
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
    let oldPieceId = state.pieceId;
    state.pieceId = request.pieceId;
    return {
      pieceId: oldPieceId
    };
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