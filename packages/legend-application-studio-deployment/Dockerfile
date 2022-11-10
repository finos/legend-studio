FROM finos/legend-shared-server:0.23.3
COPY dist/studio /app/bin/webapp-content/web/studio/
# TODO: consider supplying a default config file
# However we have 2 config files: (1) for the static server, (2) for the application
# and (2) cannot be easily parameterized, so we will need to do some improvements
# on static server to also support merging (1) and (2) into a single config file
# and at runtime, serve (2)
#
# See https://github.com/finos/legend-sdlc/pull/514
CMD java -cp /app/bin/webapp-content:/app/bin/* \
org.finos.legend.server.shared.staticserver.Server server /config/httpConfig.json
