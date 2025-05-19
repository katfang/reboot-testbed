import { ReaderContext, TransactionContext, WriterContext } from "@reboot-dev/reboot"

import {
  Empty,
  ReproGame,
  ReproPiece,
  ReproLocPieceIndex,
  InvalidMoveError
} from "../../api/repro/v1/repro_rbt.js"

const WHITE_PAWN = "white-pawn"
const LOCATION_ID = "2-0";

export class ReproGameServicer extends ReproGame.Servicer {
  async runQueue(
    context: TransactionContext,
    state: ReproGame.State,
    request: Empty
  ) {
    try {
      await ReproPiece.ref(WHITE_PAWN).idempotently().movePiece(context);
    } catch (e) {
      let handled = false;
      if (e instanceof ReproPiece.MovePieceAborted) {
        if (e.error instanceof InvalidMoveError) {
          console.log("handled");
          handled = true;
        }
      }

      if (!handled) {
        console.log("not handled", e);
        throw e;
      }
    }
    return {};
  }
}

export class ReproPieceServicer extends ReproPiece.Servicer {
  async movePiece(
    context: TransactionContext,
    state: ReproPiece.State,
    request: Empty
  ) {
    throw new ReproPiece.MovePieceAborted(
      new InvalidMoveError({
        message: "Aborting pon purpose so we can catch it."
      })
    );
    return {};
  }
}