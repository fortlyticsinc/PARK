"""
PARK — Redis Cache Helper
================================
"""

import json
import logging
import redis.asyncio as redis

from app.core.config import settings

logger = logging.getLogger("p_ark.cache")

_client: redis.Redis | None = None


def _get_client() -> redis.Redis:
    global _client
    if _client is None:
        _client = redis.from_url(settings.REDIS_URL, decode_responses=True)
    return _client


async def cache_get(key: str) -> dict | None:
    try:
        raw = await _get_client().get(key)
        return json.loads(raw) if raw else None
    except Exception as e:
        logger.debug(f"Cache GET skipped ({key}): {e}")
        return None


async def cache_set(key: str, value: dict, ttl_seconds: int) -> None:
    try:
        await _get_client().set(key, json.dumps(value, default=str), ex=ttl_seconds)
    except Exception as e:
        logger.debug(f"Cache SET skipped ({key}): {e}")


async def cache_delete(key: str) -> None:
    try:
        await _get_client().delete(key)
    except Exception as e:
        logger.debug(f"Cache DELETE skipped ({key}): {e}")


async def cache_hash_increment_from(key: str, field: str, initial_value: int) -> int | None:
    try:
        return int(await _get_client().eval(
            "if redis.call('HEXISTS', KEYS[1], ARGV[1]) == 0 then "
            "redis.call('HSET', KEYS[1], ARGV[1], ARGV[2]) end; "
            "return redis.call('HINCRBY', KEYS[1], ARGV[1], 1)",
            1, key, field, initial_value,
        ))
    except Exception as e:
        logger.debug(f"Cache view increment skipped ({key}): {e}")
        return None


async def cache_hash_get_all(key: str) -> dict[str, str]:
    try:
        return await _get_client().hgetall(key)
    except Exception as e:
        logger.debug(f"Cache HGETALL skipped ({key}): {e}")
        return {}


async def cache_acquire_lock(key: str, token: str, ttl_seconds: int) -> bool:
    try:
        return bool(await _get_client().set(key, token, ex=ttl_seconds, nx=True))
    except Exception as e:
        logger.debug(f"Cache lock acquire skipped ({key}): {e}")
        return False


async def cache_release_lock(key: str, token: str) -> None:
    try:
        await _get_client().eval(
            "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
            1, key, token,
        )
    except Exception as e:
        logger.debug(f"Cache lock release skipped ({key}): {e}")
