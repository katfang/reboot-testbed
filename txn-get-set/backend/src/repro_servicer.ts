import { ReaderContext, TransactionContext, WriterContext } from "@reboot-dev/reboot"
import { errors_pb } from "@reboot-dev/reboot-api";

import {
  Empty,
  ReproGame,
  ReproPiece,
  ReproLocPieceIndex,
  MoveRequest
} from "../../api/repro/v1/repro_rbt.js"

const WHITE_PAWN = "white-pawn"
const LOCATION_ID = "empty-loc";

export class ReproGameServicer extends ReproGame.Servicer {
  async runQueue(
    context: TransactionContext,
    state: ReproGame.State,
    request: Empty
  ) {
    try {
      await ReproPiece.ref(WHITE_PAWN).idempotently().movePiece(context, { locId: LOCATION_ID });
    } catch (e) {
      console.log("!!! error: ", e);
    }
    return {};
  }
}

export class ReproPieceServicer extends ReproPiece.Servicer {
  async movePiece(
    context: TransactionContext,
    state: ReproPiece.State,
    request: MoveRequest
  ) {
    let pieceId = null; 

    // try get, if it doesn't exist, that's totally fine.
    try {
      console.log("!!! want to get");
      pieceId = (await ReproLocPieceIndex.ref(request.locId).get(context)).pieceId;
      // If we successfully get a piece, we should throw (represents a pawn trying to move forward into a space where a piece already is.)
    } catch (e) {
      if (e instanceof ReproLocPieceIndex.GetAborted && e.error instanceof errors_pb.StateNotConstructed) {
        pieceId = null;
      }
    }

    console.log("!!! want to set");
    await ReproLocPieceIndex.ref(request.locId).set(
      context,
      { pieceId: context.stateId }
    );

    return {};
  }
}

export class ReproLocPieceIndexServicer extends ReproLocPieceIndex.Servicer {
  async get(
    context: ReaderContext,
    state: ReproLocPieceIndex.State,
    request: Empty
  ) {
    // Two possible responses for there not being an object:
    // * an error from reboot saying nothing at that index
    // * empty string for pieceId
    return state;
  }

  async set(
    context: WriterContext,
    state: ReproLocPieceIndex.State,
    request: ReproLocPieceIndex.State
  ) {
    console.log("!!! set");
    state.pieceId = request.pieceId;
    return {};
  }

}