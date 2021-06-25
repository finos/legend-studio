FROM finos/legend-shared-server:0.13.0
COPY dist/studio /app/bin/webapp-content/web/studio
CMD java -cp /app/bin/webapp-content:/app/bin/* org.finos.legend.server.shared.staticserver.Server server /config/httpConfig.json
