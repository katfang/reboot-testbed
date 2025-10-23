import { ReaderContext, WriterContext } from "@reboot-dev/reboot"

import {
  Inside,
  InsideListRequest,
  InsideAddRequest,
  InsideClearRequest,
} from "../../api/inside/v1/inside_rbt.js"


export class InsideServicer extends Inside.Servicer {
  async listAll(
    context: ReaderContext,
    request: InsideListRequest,
  ) {
    return { items: this.state.items };
  }

  async add(
    context: WriterContext,
    request: InsideAddRequest
  ) {
    this.state.items.push(request.item);
    return {};
  }

  async clear(
    context: WriterContext,
    request: InsideClearRequest,
  ) {
    this.state.items.length = 0;
    return {};
  }

}