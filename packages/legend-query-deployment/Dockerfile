FROM finos/legend-shared-server:0.22.0
COPY dist/query /app/bin/webapp-content/web/query/
CMD java -cp /app/bin/webapp-content:/app/bin/* \
org.finos.legend.server.shared.staticserver.Server server /config/httpConfig.json
