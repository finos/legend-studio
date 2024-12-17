#!/bin/bash

PROTOCOL=${PROTOCOL:-http}
ENGINE_HOST=${ENGINE_HOST:-localhost}
ENGINE_PORT=${ENGINE_PORT:-6300}
DEPOT_HOST=${DEPOT_HOST:-localhost}
DEPOT_PORT=${DEPOT_PORT:-7000}

sed -i 's~${PROTOCOL}~'$PROTOCOL'~g' /config/config.json
sed -i 's~${ENGINE_HOST}~'$ENGINE_HOST'~g' /config/config.json
sed -i 's~${ENGINE_PORT}~'$ENGINE_PORT'~g' /config/config.json
sed -i 's~${DEPOT_HOST}~'$DEPOT_HOST'~g' /config/config.json
sed -i 's~${DEPOT_PORT}~'$DEPOT_PORT'~g' /config/config.json

java -cp /app/bin/webapp-content:/app/bin/* org.finos.legend.server.shared.staticserver.Server server /config/server-config.json

