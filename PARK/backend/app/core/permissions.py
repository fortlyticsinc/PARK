"""
PARK — Permission Matrix (single source of truth)
======================================================
"""

from enum import Enum


class Role(str, Enum):
    STUDENT = "student"
    SUPERVISOR = "supervisor"
    COORDINATOR = "coordinator"
    ADMIN = "admin"


S, SUP, C, A = Role.STUDENT, Role.SUPERVISOR, Role.COORDINATOR, Role.ADMIN

PERMISSIONS: dict[str, set[Role]] = {
    "pairing:view": {S, SUP, C, A},
    "pairing:create": {C, A},
    "pairing:update": {C, A},
    "pairing:delete": {C, A},
    "pairing:bulk_import": {C, A},

    "chapter:submit": {S},
    "chapter:view": {S, SUP, C, A},
    "chapter:approve": {SUP, A},
    "chapter:comment": {SUP, A},

    # Scheduling is now supervisor-initiated (it's an announcement to
    # their whole cohort, not a personal log any pairing member can
    # write) — students lose "log" but keep "view" for what's scheduled.
    "meeting:log": {SUP, A},
    "meeting:view": {S, SUP, C, A},
    "meeting:edit": {SUP, A},

    # Certificate of completion — only the supervisor who owns the
    # pairing (or an admin) can confirm completion and mint one;
    # viewing is available to the pairing's participants plus dept staff.
    "certificate:issue": {SUP, A},
    "certificate:view": {S, SUP, C, A},

    "message:send": {S, SUP, A},
    "message:view": {S, SUP, A},

    "repository:search": {S, SUP, C, A},
    "repository:manage": {C, A},

    "dashboard:view": {C, A},
    "sms:bulk_send": {C, A},

    "user:view": {SUP, C, A},
    "user:manage": {C, A},   # FIX: was {A} only — coordinators must be able to create supervisor accounts
    "user:deactivate_student": {SUP, C, A},
    "user:bulk_import": {C, A},
    "guideline:view": {S, SUP, C},
    "guideline:manage": {C},

    "broadcast:send": {SUP},
    "broadcast:view": {S, SUP},
}


def has_permission(role: Role, permission: str) -> bool:
    allowed_roles = PERMISSIONS.get(permission)
    if not allowed_roles:
        return False
    return role in allowed_roles
