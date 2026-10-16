#!/usr/bin/env python3
"""Self-test for the canvas-cli cookie bridge.

Checks, in order:
  1. bridge process reachable, prints health summary
  2. cookie present and how old
  3. real upstream auth works: GET /api/v1/users/self through the bridge
Prints account name only - never cookie values.
"""
import json
import sys
import urllib.request

BASE = "http://127.0.0.1:8902"


def get(path: str):
    req = urllib.request.Request(BASE + path, headers={"Accept": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return resp.status, resp.read()
    except urllib.error.HTTPError as err:
        return err.code, err.read()
    except Exception as exc:  # noqa: BLE001 - report any failure plainly
        return None, str(exc).encode()


def main() -> int:
    status, body = get("/__bridge/health")
    if status != 200:
        print(f"FAIL health: {status} {body[:200]!r}")
        print("bridge not running - run start-bridge.cmd")
        return 1
    health = json.loads(body)
    print(f"bridge   : {health['bridge']} on {health['listen']}")
    print(f"upstream : {health['upstream']}")
    if not health["session_present"]:
        print("cookie   : MISSING - run refresh-cookie.cmd")
        return 1
    print(f"cookie   : session ok, csrf={'ok' if health['csrf_present'] else 'MISSING'}, "
          f"age {health['cookie_age_days']} days")

    status, body = get("/api/v1/users/self")
    if status != 200:
        print(f"FAIL auth: HTTP {status} - {body[:200]!r}")
        print("cookie likely expired - run refresh-cookie.cmd")
        return 1
    me = json.loads(body)
    print(f"auth     : {me.get('name')} (id {me.get('id')})")
    print("all checks passed")
    return 0


if __name__ == "__main__":
    sys.exit(main())
