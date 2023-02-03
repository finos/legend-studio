FROM finos/legend-shared-server:0.23.3
COPY dist/query /app/bin/webapp-content/web/query/

RUN mkdir -p /config
COPY config/httpConfig.json /config/httpConfig.json
COPY config/uiConfig.json /config/uiConfig.json

COPY entrypoint.sh /entrypoint.sh
CMD /entrypoint.sh

