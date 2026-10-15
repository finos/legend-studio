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
  ColumnComparisonFilter,
  type CubeDocument,
  Filter,
  FilterOperator,
  Restrict,
  Schema,
  type SchemaColumn,
} from '@finos/legend-cube';
import type { CubeEditorState } from '../CubeEditorState.js';
import { runCubeQuery } from '../CubeQueryRun.js';
import { type CubeJsonSample, inferCubeJsonShape } from './CubeJsonShape.js';

/** How many values Explore JSON reads first (user, 2026-10-14) */
export const CUBE_JSON_SAMPLE_SIZE = 1000;

/** No limit: Read every row (the run's `limit(rowLimit + 1)` then takes them all) */
const EVERY_ROW = Number.MAX_SAFE_INTEGER;

/** The runs that read a Variant column's documents, as Runs lists them */
export const CUBE_JSON_RUN_LABEL = {
  sample: (column: string): string => `Sample of ${column}`,
  everyRow: (column: string): string => `Every value of ${column}`,
};

/**
 * Reads a Variant column's documents (PLAN §11.20) through the cube's own
 * query path, so the read is listed in Runs and can be stopped: the query up
 * to a node, then the column alone and its non-empty values, its first
 * `CUBE_JSON_SAMPLE_SIZE` or every row. Explore JSON reads after the node
 * that ran, the Explode Array editor after its input. `undefined` for a cube
 * with no runtime; a failed or stopped run throws, as `runCubeQuery` does.
 */
export const readCubeJsonSample = async (
  editorState: CubeEditorState,
  options: {
    document: CubeDocument;
    afterId: string;
    column: SchemaColumn;
    everyRow: boolean;
    abortController: AbortController;
  },
): Promise<CubeJsonSample | undefined> => {
  const { document, afterId, column, everyRow, abortController } = options;
  const { context, query } = document;
  if (context?.runtime === undefined) {
    return undefined;
  }
  // each after the one before; the query isn't kept
  const restrict = new Restrict(query.generateId(Restrict.TYPE), [column.name]);
  const nonEmpty = new Filter(
    query.generateId(Filter.TYPE),
    new ColumnComparisonFilter(column.name, FilterOperator.IS_NOT_EMPTY),
  );
  const values = [restrict, nonEmpty].reduce(
    (built, node) => built.add(node, built.selected),
    query.selected === afterId ? query : query.select(afterId),
  );
  const result = await runCubeQuery(editorState, {
    query: values,
    model: context.model,
    runtime: context.runtime,
    schema: new Schema([column]),
    rowLimit: everyRow ? EVERY_ROW : CUBE_JSON_SAMPLE_SIZE,
    abortController,
    label: everyRow
      ? CUBE_JSON_RUN_LABEL.everyRow(column.name)
      : CUBE_JSON_RUN_LABEL.sample(column.name),
  });
  return inferCubeJsonShape(
    result.rows.map((row) => row[0] ?? null),
    !result.limited,
  );
};
