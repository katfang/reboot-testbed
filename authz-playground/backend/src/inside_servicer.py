from inside.v1.inside_rbt import (
    Inside,
    InsideListRequest,
    InsideListResponse,
    InsideAddRequest,
    InsideAddResponse,
)
from rebootdev.aio.contexts import ReaderContext, WriterContext

class InsideServicer(Inside.Servicer):

    async def list_all(
        self,
        context: ReaderContext,
        request: InsideListRequest,
    ) -> InsideListResponse:
        return InsideListResponse(items=self.state.items)

    async def add(
        self,
        context: WriterContext,
        request: InsideAddRequest,
    ) -> InsideAddResponse:
        self.state.items.append(request.item)
        return InsideAddResponse()