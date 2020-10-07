FROM openjdk:11

COPY target/legend-studio-*-shaded.jar /app/bin/
CMD java -cp /app/bin/*.jar org.finos.legend.shared.staticserver.Server server /config/httpConfig.json
