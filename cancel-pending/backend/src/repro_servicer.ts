import { ReaderContext, TransactionContext, WriterContext } from "@reboot-dev/reboot"

import {
  AckMoveRequest,
  Empty,
  Game,
  Move,
  MoveRequest,
  MoveStatus,
  SetStatusRequest
} from "../../api/repro/v1/repro_rbt.js"

export class GameServicer extends Game.Servicer {

  async queueMove(context: TransactionContext, state: Game.State, request: MoveRequest) {
    if (state.moves === undefined) {
      state.moves = [];
    }
    if (state.moveIds === undefined) {
      state.moveIds = [];
    }
    state.moves.push(request);
    state.moveIds.push(request.id);
    await Move.ref(request.id).store(context, {
      id: request.id,
      status: MoveStatus.MOVE_QUEUED
    });
    return {};
  }

  async cancelMove(context: TransactionContext, state: Game.State, request: MoveRequest) {
    state.moves = state.moves.filter(item => item.id !== request.id);
    state.moveIds = state.moveIds.filter(item => item !== request.id);
    await Move.ref(request.id).setStatus(context, {
      status: MoveStatus.MOVE_CANCELED
    });
    return {};
  }

  async ackMove(context: TransactionContext, state: Game.State, request: AckMoveRequest) {
    await Move.ref(request.moveId).setStatus(context, { status: MoveStatus.MOVE_ACKED });
    return {};
  }

  async moves(context: ReaderContext, state: Game.State, request: Empty) {
    return { moves: state.moves };
  }

  async movesById(context: ReaderContext, state: Game.State, request: Empty) {
    let moves: { [id: string ]: Move } = {};
    for (const moveId of state.moveIds) {
      moves[moveId] = await Move.ref(moveId).get(context);
    }
    console.log("!!! get moves by id", moves);
    return { movesById: moves };
  }
}

export class MoveServicer extends Move.Servicer {
  async store(context: WriterContext, state: Move.State, request: Move.State) {
    state.id = request.id;
    state.status = request.status;
    return {};
  }
  async setStatus(context: WriterContext, state: Move.State, request: SetStatusRequest) {
    state.status = request.status;
    return {};
  }
  async get(context: ReaderContext, state: Move.State, request: Empty) {
    return state;
  }
}