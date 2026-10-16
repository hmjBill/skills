#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Canvas CLI Cookie Bridge (v2)

Local HTTP bridge that lets API-token-based Canvas clients work against an
institution that disables student API tokens (e.g. SLCC).

It accepts requests on 127.0.0.1:<PORT>, swaps the Authorization header for
the browser session cookie (canvas_session + _csrf_token), injects the CSRF
header for write methods, and forwards everything to the Canvas instance.

Read-only by *capability*, not by policy: writes are forwarded (with CSRF)
because the Canvas web UI itself writes with the same session cookie. If the
institution rejects cookie-authenticated writes, those requests fail at
upstream with upstream's own status code - the bridge does not fake results.

NEVER logs headers, cookies, or bodies. Log lines: time, method, path,
upstream status, bytes, duration.
"""

import json
import logging
import logging.handlers
import os
import socket
import ssl
import sys
import threading
import time
from http.client import HTTPSConnection, HTTPException
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

# --------------------------------------------------------------------------
# Configuration - change these three constants to retarget another school.
# The environment variables exist so tests can point the bridge at a mock
# upstream; normal deployments only need the constants (or nothing at all).
# --------------------------------------------------------------------------
UPSTREAM_HOST = os.environ.get("CANVAS_BRIDGE_UPSTREAM", "slcc.instructure.com")
UPSTREAM_PORT = int(os.environ.get("CANVAS_BRIDGE_UPSTREAM_PORT", "443"))
LISTEN_HOST = "127.0.0.1"
LISTEN_PORT = int(os.environ.get("CANVAS_BRIDGE_PORT", "8902"))
INSECURE_TLS = os.environ.get("CANVAS_BRIDGE_INSECURE") == "1"  # testing only

PROGRAM_DATA = os.environ.get(
    "CANVAS_BRIDGE_DATA_DIR",
    os.path.join(os.environ.get("ProgramData", r"C:\ProgramData"), "CanvasCLI-Bridge"),
)
COOKIE_FILE = os.path.join(PROGRAM_DATA, "cookie.json")
LOG_FILE = os.path.join(PROGRAM_DATA, "bridge.log")

MAX_BODY_BYTES = 64 * 1024 * 1024      # request bodies buffered in memory
UPSTREAM_TIMEOUT = 30                   # connect timeout, seconds
READ_TIMEOUT = 600                      # idle read timeout for large payloads
HOP_BY_HOP = {
    "connection", "keep-alive", "proxy-authenticate", "proxy-authorization",
    "te", "trailer", "transfer-encoding", "upgrade", "host",
    "accept-encoding",   # always request identity so bodies stay inspectable
    "authorization",     # token-based auth is replaced by cookie auth
}
WRITE_METHODS = {"POST", "PUT", "PATCH", "DELETE"}

# --------------------------------------------------------------------------
# Logging: file only (pythonw has no stderr), never headers/cookies/bodies.
# --------------------------------------------------------------------------
os.makedirs(PROGRAM_DATA, exist_ok=True)

logger = logging.getLogger("bridge")
logger.setLevel(logging.INFO)
_handler = logging.handlers.RotatingFileHandler(
    LOG_FILE, maxBytes=5 * 1024 * 1024, backupCount=2, encoding="utf-8")
_handler.setFormatter(logging.Formatter("%(asctime)s %(message)s"))
logger.addHandler(_handler)


def log(line: str) -> None:
    try:
        logger.info(line)
    except Exception:
        pass  # never let logging kill a request thread


def load_cookie() -> dict:
    try:
        with open(COOKIE_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        session = data.get("canvas_session") or ""
        csrf = data.get("_csrf_token") or ""
        fetched = data.get("fetched_at") or "?"
        return {"session": session, "csrf": csrf, "fetched": fetched}
    except FileNotFoundError:
        return {}
    except Exception as exc:
        log(f"cookie-file-error {type(exc).__name__}")
        return {}


class BridgeHandler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"
    server_version = "CanvasCLIBridge/2.0"
    sys_version = ""

    # ---- plumbing ---------------------------------------------------------
    def log_message(self, fmt, *args):  # silence default stderr logging
        pass

    def _send_json(self, status: int, payload: dict) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(body)

    def _read_body(self):
        """Return the request body bytes, or None when there is none."""
        te = (self.headers.get("Transfer-Encoding") or "").lower()
        if "chunked" in te:
            self._send_json(411, {"error": "chunked request bodies are not "
                                           "supported by the bridge"})
            raise ValueError("chunked")
        length = int(self.headers.get("Content-Length") or 0)
        if length == 0:
            return None
        if length > MAX_BODY_BYTES:
            self._send_json(413, {"error": "body too large for bridge"})
            raise ValueError("too-large")
        return self.rfile.read(length)

    # ---- management endpoints --------------------------------------------
    def _handle_bridge_path(self, path: str) -> bool:
        if path != "/__bridge/health":
            self._send_json(404, {"error": "unknown bridge endpoint"})
            return True
        cookie = load_cookie()
        age = "?"
        if cookie.get("fetched") and cookie["fetched"] != "?":
            try:
                from datetime import datetime
                fetched = datetime.fromisoformat(cookie["fetched"])
                age = round((datetime.now(fetched.tzinfo) - fetched).total_seconds() / 86400, 2)
            except Exception:
                pass
        self._send_json(200, {
            "bridge": "canvas-cli-cookie-bridge/2.0",
            "upstream": UPSTREAM_HOST,
            "listen": f"{LISTEN_HOST}:{LISTEN_PORT}",
            "session_present": bool(cookie.get("session")),
            "csrf_present": bool(cookie.get("csrf")),
            "cookie_age_days": age,
        })
        return True

    # ---- main dispatch ----------------------------------------------------
    def _proxy(self):
        started = time.time()
        path = self.path

        if path.startswith("/__bridge/"):
            try:
                if self._handle_bridge_path(path):
                    return
            finally:
                pass
            return

        cookie = load_cookie()
        if not cookie.get("session"):
            log(f"{self.command} {path} -> 503 no-cookie")
            self._send_json(503, {
                "error": "bridge has no session cookie",
                "hint": "run refresh-cookie.cmd to grab a fresh session "
                        "from the daily browser",
            })
            return

        try:
            body = self._read_body()
        except ValueError:
            return  # response already sent

        # Build upstream headers: strip hop-by-hop + auth, add cookie/authz.
        headers = {}
        for key, value in self.headers.items():
            if key.lower() in HOP_BY_HOP:
                continue
            headers[key] = value
        headers["Host"] = UPSTREAM_HOST
        headers["Accept-Encoding"] = "identity"
        headers["Cookie"] = f"canvas_session={cookie['session']}; _csrf_token={cookie['csrf']}"
        if self.command in WRITE_METHODS:
            headers["X-CSRF-Token"] = cookie["csrf"]
            headers["X-Requested-With"] = "XMLHttpRequest"
            headers["Referer"] = f"https://{UPSTREAM_HOST}/"
        if body is not None:
            headers["Content-Length"] = str(len(body))
        else:
            headers.pop("Content-Length", None)

        try:
            tls = ssl._create_unverified_context() if INSECURE_TLS else None
            conn = HTTPSConnection(UPSTREAM_HOST, UPSTREAM_PORT,
                                   timeout=UPSTREAM_TIMEOUT, context=tls)
            conn.request(self.command, path, body=body, headers=headers)
            resp = conn.getresponse()
            resp_body = resp.read()
        except (socket.timeout, TimeoutError):
            log(f"{self.command} {path} -> 504 upstream-timeout")
            self._send_json(504, {"error": "upstream timeout"})
            return
        except (OSError, HTTPException) as exc:
            log(f"{self.command} {path} -> 502 {type(exc).__name__}")
            self._send_json(502, {"error": f"upstream connection failed: {type(exc).__name__}"})
            return

        # Strip the legacy XSSI prefix if present so strict JSON parsers work.
        prefix_len = len(b"while(1);")
        ctype = (resp.getheader("Content-Type") or "").lower()
        if "json" in ctype and resp_body[:prefix_len] == b"while(1);":
            resp_body = resp_body[prefix_len:].lstrip()

        # Relay status + headers, rewriting only Location/Link back to us.
        self.send_response(resp.status, resp.reason)
        for key, value in resp.getheaders():
            low = key.lower()
            if low in HOP_BY_HOP or low == "content-length":
                continue
            if low in ("location", "link") and UPSTREAM_HOST in (value or ""):
                value = value.replace(f"https://{UPSTREAM_HOST}",
                                      f"http://{LISTEN_HOST}:{LISTEN_PORT}")
            self.send_header(key, value)
        self.send_header("Content-Length", str(len(resp_body)))
        self.end_headers()
        if self.command != "HEAD" and resp_body:
            self.wfile.write(resp_body)

        conn.close()
        duration = round((time.time() - started) * 1000)
        log(f"{self.command} {path} -> {resp.status} {len(resp_body)}B {duration}ms")

    do_GET = do_POST = do_PUT = do_PATCH = do_DELETE = do_HEAD = do_OPTIONS = _proxy


def main() -> int:
    # pythonw runs with sys.stderr = None; guard everything.
    try:
        httpd = ThreadingHTTPServer((LISTEN_HOST, LISTEN_PORT), BridgeHandler)
    except OSError as exc:
        log(f"startup-failed port {LISTEN_PORT}: {exc}")
        return 1
    httpd.daemon_threads = True
    log(f"started {LISTEN_HOST}:{LISTEN_PORT} -> {UPSTREAM_HOST}")
    print(f"bridge listening on {LISTEN_HOST}:{LISTEN_PORT} -> {UPSTREAM_HOST}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        log("stopped")
    return 0


if __name__ == "__main__":
    if sys.stdout is None:  # pythonw: stdout is None as well
        sys.stdout = open(os.devnull, "w")
    if sys.stderr is None:
        sys.stderr = open(os.devnull, "w")
    sys.exit(main())
