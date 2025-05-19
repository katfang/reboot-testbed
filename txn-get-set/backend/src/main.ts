import { Application, ExternalContext } from "@reboot-dev/reboot";
import { ReproPiece, ReproLocPieceIndex } from "../../api/repro/v1/repro_rbt.js";
import { ReproGameServicer, ReproPieceServicer, ReproLocPieceIndexServicer, } from "./repro_servicer.js";

const initialize = async (context: ExternalContext) => {
  // Uncommenting this will also cause the error.
  // await ReproPiece.ref("white-pawn").idempotently().movePiece(context);

  await ReproLocPieceIndex.ref("working-loc").idempotently().set(context, { pieceId: "make-it-work" });
};

new Application({
  servicers: [
    ReproGameServicer,
    ReproPieceServicer,
    ReproLocPieceIndexServicer
  ],
  initialize,
}).run();