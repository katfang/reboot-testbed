import asyncio

from inside.v1.inside_rbt import Inside
from reboot.aio.applications import Application
from rebootdev.aio.auth import Auth, token_verifiers
from rebootdev.aio.external import InitializeContext
from rebootdev.aio.contexts import ReaderContext

from inside_servicer import InsideServicer
from typing import Optional


class TokenVerifier(token_verifiers.TokenVerifier):
    async def verify_token(
        self,
        context: ReaderContext,
        token: Optional[str],
    ) -> Optional[Auth]:
        print("!!! I have a token", token)

        return Auth(
            # No user ID; the caller isn't authenticated as a human but as a
            # service.
            user_id=token,
            properties={"SCOPE": token},
        )


async def main():
    application = Application(
        servicers=[InsideServicer],
        token_verifier=TokenVerifier(),
    )

    await application.run()


if __name__ == "__main__":
    asyncio.run(main())
