#!/usr/bin/env python3
"""Apply this folder's oMLX settings and make a per-machine API key.

    python3 omlx/setup.py                  # on the Mac mini: settings + a key for this Mac
    python3 omlx/setup.py macbook-pro-m2   # on the Mac mini: a key for another Mac, to copy over

Settings are merged into ~/.omlx (oMLX's own files keep everything else, secrets included).
Each key is an oMLX sub-key, so it can be revoked on its own in the admin page (http://127.0.0.1:8000/admin).
"""
import datetime
import json
import os
import secrets
import socket
import subprocess
import sys
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
OMLX = Path.home() / ".omlx"
KEYS = Path.home() / ".config" / "omlx"


def merge(dst: dict, src: dict) -> dict:
    for k, v in src.items():
        dst[k] = merge(dst.get(k) or {}, v) if isinstance(v, dict) else v
    return dst


def expand(v):
    if isinstance(v, str) and v.startswith("~/"):
        return os.path.expanduser(v)
    if isinstance(v, list):
        return [expand(x) for x in v]
    if isinstance(v, dict):
        return {k: expand(x) for k, x in v.items()}
    return v


def main() -> None:
    if not (OMLX / "settings.json").exists():
        sys.exit("Open oMLX.app once first, so it creates ~/.omlx.")
    client = sys.argv[1] if len(sys.argv) > 1 else None

    subprocess.run([str(OMLX / "bin" / "omlx"), "stop"], capture_output=True)  # oMLX rewrites its files on exit

    settings = json.loads((OMLX / "settings.json").read_text())
    merge(settings, expand(json.loads((HERE / "settings.json").read_text())))
    model_settings = json.loads((OMLX / "model_settings.json").read_text()) if (OMLX / "model_settings.json").exists() else {"version": 1, "models": {}}
    merge(model_settings, json.loads((HERE / "model_settings.json").read_text()))
    (OMLX / "models").mkdir(exist_ok=True)

    name = f"{client or socket.gethostname().split('.')[0]}-pi"
    key_file = KEYS / ("api-key" if client is None else f"{client}.key")
    sub_keys = settings.setdefault("auth", {}).setdefault("sub_keys", [])
    if not any(k.get("name") == name for k in sub_keys) or not key_file.exists():
        key = "sk-" + secrets.token_urlsafe(32)
        sub_keys[:] = [k for k in sub_keys if k.get("name") != name]
        sub_keys.append({"key": key, "name": name, "created_at": datetime.datetime.now().isoformat(timespec="seconds")})
        KEYS.mkdir(parents=True, exist_ok=True)
        KEYS.chmod(0o700)
        fd = os.open(key_file, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
        with os.fdopen(fd, "w") as f:
            f.write(key + "\n")

    (OMLX / "settings.json").write_text(json.dumps(settings, indent=2))
    (OMLX / "model_settings.json").write_text(json.dumps(model_settings, indent=2))

    def up(wait: int) -> bool:
        for _ in range(wait):
            with socket.socket() as s:
                if s.connect_ex(("127.0.0.1", settings["server"]["port"])) == 0:
                    return True
            time.sleep(1)
        return False

    # `omlx start` needs the menu bar app running; open it first if it isn't.
    subprocess.run([str(OMLX / "bin" / "omlx"), "start"], capture_output=True)
    if not up(10):
        subprocess.run(["open", "-a", "oMLX"])
        time.sleep(5)
        subprocess.run([str(OMLX / "bin" / "omlx"), "start"], capture_output=True)
        if not up(30):
            sys.exit("oMLX didn't start: open oMLX.app and press Start Server.")
    print(f"oMLX settings applied. Key '{name}' is in {key_file}")
    if client:
        print(f"Copy it to the other Mac as ~/.config/omlx/api-key (chmod 600).")


if __name__ == "__main__":
    main()
