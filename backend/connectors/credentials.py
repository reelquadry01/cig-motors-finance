"""Fernet-based credential encryption for connector secrets.

Encrypted values are stored as environment variables using the naming
convention ``CRED_<connector_id>_<field_name>``.  The encryption key is
read from ``CRED_ENCRYPTION_KEY`` and auto-generated on first use.

Usage::

    from backend.connectors.credentials import encrypt, decrypt, get_or_create_key

    key = get_or_create_key()
    enc = encrypt("s3cret_p@ss", key)
    dec = decrypt(enc, key)  # -> "s3cret_p@ss"
"""
from __future__ import annotations

import base64
import logging
import os
import secrets
from typing import Optional

logger = logging.getLogger(__name__)

_ENV_KEY = "CRED_ENCRYPTION_KEY"


def get_or_create_key() -> str:
    """Return the Fernet key from the environment, generating one if absent."""
    key = os.getenv(_ENV_KEY)
    if key:
        return key
    key = generate_key()
    os.environ[_ENV_KEY] = key
    logger.info("Auto-generated CRED_ENCRYPTION_KEY (first run)")
    return key


def generate_key() -> str:
    """Generate a new Fernet-compatible base64 key."""
    from cryptography.fernet import Fernet

    return Fernet.generate_key().decode()


def encrypt(plain_text: str, key: Optional[str] = None) -> str:
    """Encrypt *plain_text* with Fernet and return a base64 string."""
    from cryptography.fernet import Fernet

    if key is None:
        key = get_or_create_key()
    f = Fernet(key.encode() if isinstance(key, str) else key)
    return f.encrypt(plain_text.encode()).decode()


def decrypt(cipher_text: str, key: Optional[str] = None) -> str:
    """Decrypt a Fernet-encrypted base64 string."""
    from cryptography.fernet import Fernet

    if key is None:
        key = get_or_create_key()
    f = Fernet(key.encode() if isinstance(key, str) else key)
    return f.decrypt(cipher_text.encode()).decode()


# ── Per-connector credential helpers ────────────────────────────────


def _env_var_name(connector_id: str, field_name: str) -> str:
    """Build the env-var name for a stored credential.

    Example: ``CRED_sql_001_host``
    """
    safe_id = connector_id.replace("-", "_").replace(" ", "_").lower()
    safe_field = field_name.replace("-", "_").replace(" ", "_").lower()
    return f"CRED_{safe_id}_{safe_field}"


def store_credential(connector_id: str, field_name: str, plain_text: str) -> str:
    """Encrypt and store a credential in the environment.

    Returns the env-var name used.
    """
    key = get_or_create_key()
    enc = encrypt(plain_text, key)
    env_name = _env_var_name(connector_id, field_name)
    os.environ[env_name] = enc
    return env_name


def load_credential(connector_id: str, field_name: str) -> Optional[str]:
    """Load and decrypt a credential from the environment.

    Returns *None* if the env-var doesn't exist.
    """
    env_name = _env_var_name(connector_id, field_name)
    enc = os.getenv(env_name)
    if enc is None:
        return None
    try:
        return decrypt(enc)
    except Exception as exc:
        logger.warning("Failed to decrypt %s: %s", env_name, exc)
        return None


def clear_credential(connector_id: str, field_name: str) -> None:
    """Remove a stored credential from the environment."""
    env_name = _env_var_name(connector_id, field_name)
    os.environ.pop(env_name, None)


def store_credentials_batch(
    connector_id: str,
    values: dict[str, str],
) -> list[str]:
    """Store multiple credentials at once.  Returns list of env-var names."""
    return [
        store_credential(connector_id, field, plain)
        for field, plain in values.items()
        if plain
    ]


def load_credentials_batch(
    connector_id: str,
    field_names: list[str],
) -> dict[str, Optional[str]]:
    """Load multiple credentials at once."""
    return {f: load_credential(connector_id, f) for f in field_names}


def clear_all_credentials(connector_id: str) -> None:
    """Remove all stored credentials for a connector.

    Scans environment for matching prefix and deletes them.
    """
    prefix = f"CRED_{connector_id.replace('-', '_').replace(' ', '_').lower()}_"
    to_delete = [k for k in os.environ if k.startswith(prefix)]
    for k in to_delete:
        os.environ.pop(k, None)
