import { Application, ExternalContext } from "@reboot-dev/reboot";
import { Inside } from "../../api/inside/v1/inside_rbt.js";
import { InsideServicer, } from "./inside_servicer.js";

const initialize = async (context: ExternalContext) => {
  // Uncommenting this will also cause the error.
  // await ReproPiece.ref("white-pawn").idempotently().movePiece(context);
  await Inside.ref("thing").add(context, { item: "first thing" });
};

new Application({
  servicers: [InsideServicer],
  initialize,
}).run();