---
'@finos/legend-application-studio': patch
'@finos/legend-cube': patch
'@finos/legend-cube-builder': patch
---

Legend Cube reads a lambda back into steps (Import Pure): the engine's or Cube's JSON of a lambda to Cube's IR, a run's own parts taken off, lambdas compared as the same Pure, and the relation read into steps, each checked by writing it again. `CubeEditor` opens on a host's lambda (`initialLambda`); Studio's Create MatView with Cube button is now Create MatView, and it lists the definition's materialized views to edit: Cube opens on the view, read back, and Save MatView replaces it in place, first asking again for its data's classification when it has none and for its primary key when a key column is gone. The Cube menu's Import Pure reads a pasted Pure query, or its JSON, into steps in place of the cube.
