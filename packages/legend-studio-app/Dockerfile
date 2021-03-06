FROM finos/legend-shared-server:0.7.0
COPY dist/studio /app/bin/webapp-content/web/studio
# TODO: Check if we even need to remove the default config file because Dropwizard might already have overriden it
RUN rm -rf /app/bin/webapp-content/web/studio/config.json
CMD java -cp /app/bin/webapp-content:/app/bin/* org.finos.legend.server.shared.staticserver.Server server /config/httpConfig.json
