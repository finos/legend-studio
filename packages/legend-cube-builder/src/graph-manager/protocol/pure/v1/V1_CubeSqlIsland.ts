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

import {
  V1_DataProductAccessor,
  V1_extractAccessorsFromSQL,
  V1_IngestDefinitionAccessor,
} from '@finos/legend-graph';

// What Cube finds in the text of the engine's SQL island, `#SQL{…}#`,
// without parsing the SQL: the engine parses it, Cube keeps it as written

/** `var('name')`: a name of the Pure around the island, which its SQL reads */
const VARIABLE = /\bvar\s*\(\s*'(?<name>[^']+)'\s*\)/gi;

/**
 * The names of the Pure around an island that its SQL reads, `var('name')`,
 * each once, in the order it first reads them
 */
export const V1_findCubeSqlVariables = (sql: string): string[] => [
  ...new Set(
    [...sql.matchAll(VARIABLE)].flatMap((match) =>
      match.groups?.name ? [match.groups.name] : [],
    ),
  ),
];

/** What an island's SQL names in its text, as legend-graph finds them */
export interface V1_CubeSqlSources {
  /** Each ingest data set, `i('definition.dataSet')`: the definition's path, then the data set */
  readonly dataSets: readonly (readonly [string, string])[];
  /** Each access point, `p('dataProduct.accessPoint')`: the data product's path, then its id */
  readonly accessPoints: readonly (readonly [string, string])[];
}

/**
 * The ingest data sets and data product access points an island's SQL names,
 * found by legend-graph, which finds them for Studio's ingest pages too
 */
export const V1_findCubeSqlSources = (sql: string): V1_CubeSqlSources => {
  const named = V1_extractAccessorsFromSQL(sql);
  const pathsOf = (
    type: typeof V1_IngestDefinitionAccessor | typeof V1_DataProductAccessor,
  ): (readonly [string, string])[] =>
    named.flatMap((accessor) => {
      const [owner, name] = accessor.path;
      return accessor instanceof type &&
        owner !== undefined &&
        name !== undefined
        ? [[owner, name] as const]
        : [];
    });
  return {
    dataSets: pathsOf(V1_IngestDefinitionAccessor),
    accessPoints: pathsOf(V1_DataProductAccessor),
  };
};
