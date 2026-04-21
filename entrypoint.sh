#!/bin/sh
set -e

PORT=${PORT:-8080}

# Inject PORT into nginx config
sed -i "s/__PORT__/$PORT/" /etc/nginx/conf.d/default.conf

# Inject API_URL into env.js (only substitutes ${API_URL}, leaves other $ untouched)
envsubst '${API_URL}' < /usr/share/nginx/html/env.js.template > /usr/share/nginx/html/env.js

exec nginx -g 'daemon off;'
