import { Application, ExternalContext } from "@reboot-dev/reboot";
import { Game, Move } from "../../api/repro/v1/repro_rbt.js";
import { GameServicer, MoveServicer } from "./repro_servicer.js";

const initialize = async (context: ExternalContext) => {
  // Uncommenting this will also cause the error.
  // await ReproPiece.ref("white-pawn").idempotently().movePiece(context);
};

new Application({
  servicers: [
    GameServicer,
    MoveServicer,
  ],
  initialize,
}).run();