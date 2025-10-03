from rebootdev.aio.auth import Auth, token_verifiers
from rebootdev.aio.contexts import ReaderContext
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
            user_id=None,
            properties={
                "SCOPE": "global",
            },
        )