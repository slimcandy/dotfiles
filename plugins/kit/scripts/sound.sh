#!/bin/sh
# Play a macOS system sound by name. Silently does nothing elsewhere.
name="${1:-Hero}"
file="/System/Library/Sounds/${name}.aiff"
if command -v afplay >/dev/null 2>&1 && [ -f "$file" ]; then
  afplay "$file"
fi
exit 0
