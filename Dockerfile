FROM openjdk:11
COPY target/legend-studio-*.jar /app/bin/
CMD java -cp /app/bin/*-shaded.jar org.finos.legend.server.shared.staticserver.Server server /config/httpConfig.json