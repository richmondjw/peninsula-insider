"""Native, isolated SQLite transaction harness. Not a production DB adapter.

Only operates the explicit caller-owned test database. No networking or credentials.
JSON request on stdin; one immutable snapshot plus a CAS-controlled active pointer.
"""
import hashlib
import json
import os
import sqlite3
import sys


def run(path, request):
    db = sqlite3.connect(path, timeout=5, isolation_level=None)
    db.execute("PRAGMA synchronous=FULL")
    db.execute("CREATE TABLE IF NOT EXISTS snapshots (token TEXT PRIMARY KEY, payload TEXT NOT NULL)")
    db.execute("CREATE TABLE IF NOT EXISTS active (slot INTEGER PRIMARY KEY CHECK(slot=1), token TEXT NOT NULL REFERENCES snapshots(token))")
    db.execute("PRAGMA foreign_keys=ON")
    if request["action"] == "read":
        row = db.execute("SELECT s.token,s.payload FROM active a JOIN snapshots s ON s.token=a.token WHERE a.slot=1").fetchone()
        return dict(zip(("token", "payload"), row)) if row else None
    if request["action"] != "commit":
        raise ValueError("unsupported action")
    value = request["prepared"]
    if hashlib.sha256(value["payload"].encode()).hexdigest() != value["token"]:
        raise ValueError("prepared digest mismatch")
    db.execute("BEGIN IMMEDIATE")
    try:
        row = db.execute("SELECT token FROM active WHERE slot=1").fetchone()
        current = row[0] if row else None
        if current == value["token"]:
            db.execute("ROLLBACK")
            return {"committed": True, "retry": True}
        if current != value["expectedToken"]:
            raise ValueError("predecessor changed")
        db.execute("INSERT OR IGNORE INTO snapshots(token,payload) VALUES(?,?)", (value["token"], value["payload"]))
        if request.get("crash") == "after-insert":
            os._exit(75)
        db.execute("INSERT INTO active(slot,token) VALUES(1,?) ON CONFLICT(slot) DO UPDATE SET token=excluded.token", (value["token"],))
        if request.get("crash") == "after-pointer":
            os._exit(75)
        if request.get("fail"):
            raise ValueError("injected failure")
        db.execute("COMMIT")
        if request.get("crash") == "after-commit":
            os._exit(75)
        return {"committed": True, "retry": False}
    except Exception:
        db.execute("ROLLBACK")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    try:
        print(json.dumps(run(sys.argv[1], json.load(sys.stdin))))
    except Exception as exc:
        print(json.dumps({"error": str(exc)}))
        sys.exit(1)
