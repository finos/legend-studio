FROM finos/legend-shared-server:0.23.5
COPY dist/studio /app/bin/webapp-content/web/studio/

RUN mkdir -p /config
COPY docker/server-config.json /config/server-config.json
COPY docker/config.json /config/config.json
COPY docker/entrypoint.sh /entrypoint.sh

CMD /entrypoint.sh
