from inside.v1.inside_rbt import (
    Inside,
    InsideListRequest,
    InsideListResponse,
    InsideAddRequest,
    InsideAddResponse,
)
from rbt.v1alpha1 import errors_pb2
from google.protobuf.message import Message
from rebootdev.aio.auth.authorizers import allow, allow_if
from rebootdev.aio.contexts import ReaderContext, WriterContext
from typing import Optional

def scope_inside(
    *,
    context: ReaderContext,
    state: Optional[Message],
    request: Optional[Message],
    **kwargs,
):
    if context.auth is None:
        return errors_pb2.Unauthenticated()
    
    if context.auth.properties["SCOPE"] == "inside":
        return errors_pb2.Ok() 
    
    return errors_pb2.PermissionDenied() 

def scope_global(
    *,
    context: ReaderContext,
    state: Optional[Message],
    request: Optional[Message],
    **kwargs,
):
    if context.auth is None:
        return errors_pb2.Unauthenticated()
    
    if context.auth.properties["SCOPE"] == "global":
        return errors_pb2.Ok() 
    
    return errors_pb2.PermissionDenied() 

class InsideServicer(Inside.Servicer):

    def authorizer(self):
        return Inside.Authorizer(
            list_all=allow_if(any=[scope_inside, scope_global]),
            add=allow_if(all=[scope_inside])
        )

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