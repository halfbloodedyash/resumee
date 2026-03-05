"""Authentication module — validates Supabase JWTs on incoming requests.

Usage in routers:

    from app.auth import get_current_user

    @router.get("/protected")
    async def protected(user: dict = Depends(get_current_user)):
        user_id = user["sub"]
        ...
"""

import logging
from typing import Any

import jwt
from jwt import PyJWKClient
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import settings

logger = logging.getLogger(__name__)

_bearer_scheme = HTTPBearer(auto_error=False)

# JWKS client for ES256 token validation — caches the public keys
_jwks_url = f"{settings.supabase_url}/auth/v1/.well-known/jwks.json"
_jwks_client = PyJWKClient(_jwks_url, cache_keys=True)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
) -> dict[str, Any]:
    """Decode and verify the Supabase access-token JWT.

    Returns the full JWT payload dict.  The caller typically needs
    ``payload["sub"]`` which is the Supabase user UUID.

    Raises 401 if the token is missing, expired, or invalid.
    """
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials

    try:
        # Get the signing key from JWKS based on the token's kid header
        signing_key = _jwks_client.get_signing_key_from_jwt(token)
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["ES256"],
            audience="authenticated",
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError as e:
        logger.warning("Invalid JWT: %s", e)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )


def get_user_id(user: dict[str, Any] = Depends(get_current_user)) -> str:
    """Convenience dependency that returns just the user UUID string."""
    return user["sub"]
