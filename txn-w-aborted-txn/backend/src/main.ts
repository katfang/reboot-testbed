import { Application, ExternalContext } from "@reboot-dev/reboot";
import { ReproGame, ReproPiece } from "../../api/repro/v1/repro_rbt.js";
import { ReproGameServicer, ReproPieceServicer } from "./repro_servicer.js";

const initialize = async (context: ExternalContext) => {
  // Uncommenting this will also cause the error.
  // await ReproPiece.ref("white-pawn").idempotently().movePiece(context);
};

new Application({
  servicers: [
    ReproGameServicer,
    ReproPieceServicer,
  ],
  initialize,
}).run();