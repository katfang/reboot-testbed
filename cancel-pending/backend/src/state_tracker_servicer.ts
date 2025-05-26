import { ReaderContext, WriterContext } from "@reboot-dev/reboot";
import {
  ListOfIds,
  StateTracker,
  TrackRequest
} from "../../api/tracker/v1/state_tracker_rbt.js"
import { Empty } from "@bufbuild/protobuf";

export class StateTrackerServicer extends StateTracker.Servicer {
  async get(
    context: WriterContext,
    state: StateTracker.State,
    request: Empty
  ) {
    if (state.tracked === undefined) {
      state.tracked = {};
    }
    return state;
  }

  async track(
    context: WriterContext,
    state: StateTracker.State,
    request: TrackRequest
  ) {
    // set up initial state if not yet created
    if (state.tracked === undefined) {
      state.tracked = {};
    }
    if (!(request.key in state.tracked)) {
      state.tracked[request.key] = new ListOfIds();
    }

    // add the things to track
    state.tracked[request.key].ids.push(...request.toTrack);
    return {};
  }

  async clearAll(
    context: WriterContext,
    state: StateTracker.State,
    request: Empty
  ) {
    state.tracked = {};
    return {};
  }
}