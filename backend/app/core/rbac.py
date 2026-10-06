"""
PARK — RBAC Dependency Factory
====================================
"""

from fastapi import Depends

from backend.app.core.auth import AuthedUser, get_current_user
from backend.app.core.error_handler import PermissionError_
from backend.app.core.permissions import has_permission


def require_permission(permission: str):
    async def _dependency(user: AuthedUser = Depends(get_current_user)) -> AuthedUser:
        if not has_permission(user.role, permission):
            raise PermissionError_()
        return user

    return _dependency


def require_role(*roles):
    async def _dependency(user: AuthedUser = Depends(get_current_user)) -> AuthedUser:
        if user.role not in roles:
            raise PermissionError_()
        return user

    return _dependency
