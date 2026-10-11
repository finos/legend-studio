# @finos/legend-mock-server

Legend mock servers to be used for testing and local development.

## Legend Cube's sample projects

`yarn dev:mock-depot-server` (port 6200) also serves Legend Cube's sample projects, `org.finos.legend.cube.samples`:
`cube-sales` (releases 1.0.0, 1.9.0 and 1.10.0, and a master-SNAPSHOT) and `cube-reference`, its dependency, from
`data/cube-depot/projects.json`. It answers the routes Cube's Project tab and the engine's pointer fetch use: the project
list, a project's versions, a version's entities, dependencies and model (`pureModelContextData`). The test project's
answers are unchanged.

To change them, edit `scripts/generate-cube-depot.mjs` and run `node scripts/generate-cube-depot.mjs` with an engine on
:6300; it converts each project's Pure to JSON.
