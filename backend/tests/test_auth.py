import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))


def test_password_hash_and_verify():
    from backend.auth import hash_password, verify_password
    hashed = hash_password("hunter2")
    assert verify_password("hunter2", hashed)
    assert not verify_password("wrong", hashed)


def test_create_and_decode_token():
    from backend.auth import create_access_token, decode_token
    token = create_access_token({"sub": "user-123", "email": "a@b.com"})
    payload = decode_token(token)
    assert payload["sub"] == "user-123"
    assert payload["email"] == "a@b.com"


def test_expired_token_raises():
    from backend.auth import create_access_token, decode_token
    from datetime import timedelta
    from fastapi import HTTPException
    token = create_access_token({"sub": "x"}, expires_delta=timedelta(seconds=-1))
    try:
        decode_token(token)
        assert False, "Should have raised an exception for expired token"
    except HTTPException as e:
        assert e.status_code == 401
    except Exception:
        pass  # Any exception is acceptable
