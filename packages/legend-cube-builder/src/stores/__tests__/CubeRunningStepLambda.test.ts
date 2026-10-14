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

import { describe, expect, test } from '@jest/globals';
import { CubeDocument, Query } from '@finos/legend-cube';
import {
  NORTHWIND_RUNTIME,
  sliceQuery,
} from '../../__test-utils__/CubeNorthwindTestQueries.js';
import { TEST__createCubeHost } from '../../__test-utils__/CubeTestApplication.js';
import { CubeEditorState } from '../CubeEditorState.js';
import { buildCubeRunningStepLambda } from '../CubeRunningStepLambda.js';
import { CUBE_NORTHWIND_MODEL } from '../fixtures/CubeNorthwindModel.js';

const CONTEXT = { model: CUBE_NORTHWIND_MODEL, runtime: NORTHWIND_RUNTIME };

/** Every function a lambda's JSON applies, at any depth */
const functionsOf = (json: unknown): string[] =>
  Array.isArray(json)
    ? json.flatMap(functionsOf)
    : json !== null && typeof json === 'object'
      ? [
          ...((json as { _type?: unknown })._type === 'func'
            ? [String((json as { function?: unknown }).function)]
            : []),
          ...Object.values(json).flatMap(functionsOf),
        ]
      : [];

describe('The lambda of the step that runs, for a host to keep', () => {
  test('Is the query of the step that runs, with no runtime, no row limit and none of the source information Cube stamps', async () => {
    const state = new CubeEditorState(
      TEST__createCubeHost().host,
      new CubeDocument({ context: CONTEXT, query: sliceQuery() }),
    );
    expect(state.execution.canExecute).toBe(true);
    const lambda = await buildCubeRunningStepLambda(state);
    expect(lambda._type).toBe('lambda');
    expect(lambda.parameters).toEqual([]);
    const functions = functionsOf(lambda);
    expect(functions).toContain('join');
    expect(functions).toContain('filter');
    expect(functions).not.toContain('from');
    expect(functions).not.toContain('limit');
    const text = JSON.stringify(lambda);
    expect(text).not.toContain('sourceInformation');
    // the filter's employee ids are plain JSON numbers, not lossless ones
    expect(text).toMatch(/"_type":"integer","value":\d+/u);
  });

  test("Fails when Execute can't run, e.g. on an empty cube", async () => {
    const state = new CubeEditorState(
      TEST__createCubeHost().host,
      new CubeDocument({ context: CONTEXT, query: new Query([], []) }),
    );
    expect(state.execution.canExecute).toBe(false);
    await expect(buildCubeRunningStepLambda(state)).rejects.toThrow();
  });
});
