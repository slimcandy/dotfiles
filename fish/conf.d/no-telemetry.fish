# Opt out of telemetry and update nags
set -gx DO_NOT_TRACK 1                  # common opt-out: gh and others
set -gx HOMEBREW_NO_ANALYTICS 1
set -gx NEXT_TELEMETRY_DISABLED 1
set -gx DENO_NO_UPDATE_CHECK 1
set -gx NPM_CONFIG_UPDATE_NOTIFIER false
