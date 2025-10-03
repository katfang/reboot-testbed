# hack to get the modules to import 
import sys
sys.path.append("/workspaces/reboot-testbed/authz-playground/backend/src")
sys.path.append("/workspaces/reboot-testbed/authz-playground/backend/api")

import asyncio
from inside.v1.inside_rbt import Inside 
from rebootdev.aio.external import ExternalContext

async def tester():
    token = "i-am-a-token"

    context = ExternalContext(
        name="send message",
        url="http://localhost:9991",
        bearer_token=token
    )

    inside = Inside.ref("inside-instance")

    response = await inside.add(context, item='second item')

    response = await inside.list_all(context)
    print(response)

asyncio.run(tester())