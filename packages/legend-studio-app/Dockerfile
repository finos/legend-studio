FROM finos/legend-shared-server:0.6.0
COPY dist/studio /app/bin/web/studio
RUN cd /app/bin/ && jar cf /app/bin/webapp-content.jar web
RUN rm -rf /app/bin/web
CMD java -cp /app/bin/webapp-content.jar:/app/bin/*-shaded.jar org.finos.legend.server.shared.staticserver.Server server /config/httpConfig.json
