/**
 * Copyright (c) 2026-present, Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// What a definition flow (`@finos/legend-cube-builder/definition-flow`)
// says: a data product's access point definition, drawn read-only

export const CUBE_DEFINITION_FLOW_MESSAGE = {
  /** A source other than an ingest data set: `what` names it, e.g. "a table, #>{…}#" */
  SOURCE: (what: string): string =>
    `Cube draws a definition that reads ingest data sets, #I{…}#, and this one reads ${what}.`,
  TABLE: 'a table, #>{…}#',
  ACCESS_POINT: "a data product's access point, #P{…}#",
  FUNCTION: (name: string): string => `the function ${name}()`,
  OTHER: 'another source',
};

export const CUBE_DEFINITION_FLOW_LABEL = {
  /** In the tooltip of a data set whose columns the host didn't give */
  UNKNOWN_COLUMNS: "Its columns aren't known.",
  /** What the output step's label says on hover: nothing runs in a flow */
  OUTPUT_TITLE: 'The output step: the definition gives its rows',
};
