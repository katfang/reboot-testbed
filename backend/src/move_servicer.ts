import { ReaderContext, WriterContext } from "@reboot-dev/reboot";
import { EmptyRequest } from "../../api/cheaoss/v1/util_pb.js"
import { Move, MoveStatus, SetStatusRequest } from "../../api/cheaoss/v1/move_rbt.js";

export class MoveServicer extends Move.Servicer {

  async store(
    context: WriterContext,
    state: Move.State,
    request: Move.State
  ) {
    state.playerId = request.playerId;
    state.pieceId = request.pieceId;
    state.start = request.start;
    state.end = request.end;
    state.status = request.status;
    // ignores state.error because that should be set by setStatus when status = ERRORED
    return {};
  }

  async setStatus(
    context: WriterContext,
    state: Move.State,
    request: SetStatusRequest
  ) {
    state.status = request.status; 
    state.error = request.error;
    return {};
  } 

  async get(
    context: ReaderContext,
    state: Move.State,
    request: EmptyRequest
  ) {
    return state;
  }

  async clear(
    context: WriterContext,
    state: Move.State,
    request: EmptyRequest
  ) {
    state.start = undefined;
    state.end = undefined;
    state.status = MoveStatus.MOVE_CLEARED;
    state.error = "";
    return {};
  }

}