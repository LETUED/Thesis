"""InMemoryTTLCache 단위 테스트 — 모든 API 엔드포인트가 공유하는 캐시의 TTL 계약.

결정성: 시간(time.monotonic)을 mock 하지 않고 ttl_sec 부호로 fresh/만료를 결정한다.
- ttl_sec=100  → 미래 만료(=fresh 히트)
- ttl_sec=-1   → 이미 만료(set 시점보다 과거 → get 즉시 miss)
default TTL 동작은 default_ttl_sec 를 주입해 검증한다.
"""

from __future__ import annotations

from app.data.collector import InMemoryTTLCache
from app.models import MarketSnapshot


def _snap() -> MarketSnapshot:
    return MarketSnapshot()


def test_get_returns_fresh_value():
    cache = InMemoryTTLCache()
    snap = _snap()
    cache.set("k", snap, ttl_sec=100)
    assert cache.get("k") is snap


def test_get_missing_key_is_none():
    cache = InMemoryTTLCache()
    assert cache.get("nope") is None
    assert cache.get_stale("nope") is None


def test_expired_get_is_none_but_stale_returns_last():
    cache = InMemoryTTLCache()
    snap = _snap()
    cache.set("k", snap, ttl_sec=-1)  # 이미 만료
    assert cache.get("k") is None  # 만료 → miss
    assert cache.get_stale("k") is snap  # 가용성 폴백: 마지막 값 유지


def test_keys_are_independent():
    cache = InMemoryTTLCache()
    a, b = _snap(), _snap()
    cache.set("a", a, ttl_sec=100)
    cache.set("b", b, ttl_sec=100)
    assert cache.get("a") is a
    assert cache.get("b") is b
    assert cache.get("c") is None


def test_default_ttl_used_when_ttl_none():
    # default_ttl_sec 가 ttl_sec=None 일 때 적용되는지 — fresh/만료 양쪽 확인.
    fresh = InMemoryTTLCache(default_ttl_sec=100)
    s1 = _snap()
    fresh.set("k", s1)  # ttl_sec 생략 → default 100(fresh)
    assert fresh.get("k") is s1

    expired = InMemoryTTLCache(default_ttl_sec=-1)
    s2 = _snap()
    expired.set("k", s2)  # default -1 → 즉시 만료
    assert expired.get("k") is None
    assert expired.get_stale("k") is s2


def test_set_overwrites_existing_key():
    cache = InMemoryTTLCache()
    old, new = _snap(), _snap()
    cache.set("k", old, ttl_sec=100)
    cache.set("k", new, ttl_sec=100)
    assert cache.get("k") is new
