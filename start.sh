#!/bin/sh
cd "$(dirname "$0")"
(sleep 1; (xdg-open http://127.0.0.1:4310/ || open http://127.0.0.1:4310/) >/dev/null 2>&1) &
exec node server.js
