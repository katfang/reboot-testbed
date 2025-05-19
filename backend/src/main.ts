import { Application, ExternalContext } from "@reboot-dev/reboot";
import { Game } from "../../api/cheaoss/v1/game_rbt.js";
import { GameServicer } from "./game_servicer.js";
import { PieceServicer, LocPieceIndexServicer } from "./piece_servicer.js";
import { MoveServicer } from "./move_servicer.js";

const initialize = async (context: ExternalContext) => {
  const game = Game.ref("singleton");
  await game
    .unidempotently()
    .initGame(context);
};

new Application({
  servicers: [GameServicer, PieceServicer, LocPieceIndexServicer, MoveServicer],
  initialize,
}).run();