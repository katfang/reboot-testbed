import { ReaderContext, TransactionContext, WriterContext } from "@reboot-dev/reboot"
import { errors_pb } from "@reboot-dev/reboot-api";

import {
  Inside,
  InsideListRequest,
  InsideListResponse,
  InsideAddRequest,
  InsideClearRequest,
} from "../../api/inside/v1/inside_rbt.js"

const WHITE_PAWN = "white-pawn"
const LOCATION_ID = "empty-loc";

export class InsideServicer extends Inside.Servicer {
  async listAll(
    context: ReaderContext,
    state: Inside.State,
    request: InsideListRequest,
  ) {
    return { items: state.items };
  }

  async add(
    context: WriterContext,
    state: Inside.State,
    request: InsideAddRequest
  ) {
    state.items.push(request.item);
    return {};
  }

  async clear(
    context: WriterContext,
    state: Inside.State,
    request: InsideClearRequest,
  ) {
    state.items.length = 0;
    return {};
  }

}