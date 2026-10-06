# @finos/legend-cube-builder

The UI and the Legend engine adapter of Legend Cube, a canvas-based visual query builder. The domain model lives in the
host-free [`@finos/legend-cube`](../legend-cube).

Legend Query mounts Legend Cube at `/query/cube` when its `TEMPORARY__enableLegendCube` option is on. The local
development config turns the option on; regenerate that config with
`yarn workspace @finos/legend-application-query-deployment setup`.
