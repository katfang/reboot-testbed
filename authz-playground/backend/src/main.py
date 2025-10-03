import asyncio
from inside.v1.inside_rbt import Inside 
from inside_servicer import InsideServicer 
from reboot.aio.applications import Application
from rebootdev.aio.external import InitializeContext
from token_verifier import TokenVerifier

async def initialize(context: InitializeContext):
    inside = Inside.ref('inside-instance')

    await inside.add(
        context,
        item='first item',
    )


async def main():
    application = Application(
        servicers=[InsideServicer],
        initialize=initialize,
        token_verifier=TokenVerifier(),
    )

    await application.run()


if __name__ == '__main__':
    asyncio.run(main())