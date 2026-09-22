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

import { describe, test, expect } from '@jest/globals';
import { unitTest } from '@finos/legend-shared/test';
import { QueryBuilderState } from '../QueryBuilderState.js';
import { QueryBuilderTDSState } from '../fetch-structure/tds/QueryBuilderTDSState.js';
import { QueryBuilderRelationColumnProjectionColumnState } from '../fetch-structure/tds/projection/QueryBuilderProjectionColumnState.js';

/**
 * `getQueryInfo()` is the shape-only query summary attached to every execution
 * telemetry event. It reads across a dozen sub-states, so we invoke it with a
 * hand-rolled `this` rather than standing up a full QueryBuilderState — the
 * point here is the branching (milestoning precedence, the TDS-only section,
 * the typed-fetch-structure check), not graph wiring.
 */

type Overrides = {
  milestoningKind?:
    | 'get-all'
    | 'all-versions'
    | 'all-versions-in-range'
    | 'none';
  parameterCount?: number;
  constantCount?: number;
  filterNodeCount?: number;
  filterIsEmpty?: boolean;
  watermarkValue?: unknown;
  implementation?: unknown;
  unsupportedRawLambda?: unknown;
};

const buildStub = (overrides: Overrides = {}): unknown => ({
  milestoningState: {
    milestoningKind: overrides.milestoningKind ?? 'none',
  },
  fetchStructureState: {
    implementation: overrides.implementation ?? { type: 'GRAPH_FETCH' },
  },
  parametersState: {
    parameterStates: new Array(overrides.parameterCount ?? 0).fill(undefined),
  },
  constantState: {
    constants: new Array(overrides.constantCount ?? 0).fill(undefined),
  },
  filterState: {
    isEmpty: overrides.filterIsEmpty ?? true,
    nodes: new Map(
      new Array(overrides.filterNodeCount ?? 0)
        .fill(undefined)
        .map((_, idx) => [String(idx), undefined]),
    ),
  },
  watermarkState: { value: overrides.watermarkValue },
  unsupportedQueryState: { rawLambda: overrides.unsupportedRawLambda },
});

/**
 * A stand-in that passes the `instanceof QueryBuilderTDSState` check in
 * `getQueryInfo()` without constructing the real thing.
 */
const buildTDSImplementation = (config: {
  projectionColumns?: unknown[];
  windowColumnCount?: number;
  aggregationColumnCount?: number;
  postFilterNodeCount?: number;
  limit?: number | undefined;
  distinct?: boolean;
  sortColumnCount?: number;
  slice?: unknown;
}): unknown => {
  const implementation = Object.create(
    QueryBuilderTDSState.prototype,
  ) as object;
  // `type` is a getter on the prototype, so it has to be defined rather than
  // assigned
  Object.defineProperty(implementation, 'type', {
    value: 'TABULAR_DATA_STRUCTURE',
    enumerable: true,
  });
  return Object.assign(implementation, {
    projectionColumns: config.projectionColumns ?? [],
    windowState: {
      windowColumns: new Array(config.windowColumnCount ?? 0).fill(undefined),
    },
    aggregationState: {
      columns: new Array(config.aggregationColumnCount ?? 0).fill(undefined),
    },
    postFilterState: {
      nodes: new Map(
        new Array(config.postFilterNodeCount ?? 0)
          .fill(undefined)
          .map((_, idx) => [String(idx), undefined]),
      ),
    },
    resultSetModifierState: {
      limit: config.limit,
      distinct: config.distinct ?? false,
      sortColumns: new Array(config.sortColumnCount ?? 0).fill(undefined),
      slice: config.slice,
    },
  });
};

const getQueryInfo = (
  stub: unknown,
): ReturnType<typeof QueryBuilderState.prototype.getQueryInfo> =>
  QueryBuilderState.prototype.getQueryInfo.call(stub as never);

describe(unitTest('QueryBuilderState.getQueryInfo'), () => {
  test(
    unitTest('reports the non-TDS base snapshot and omits the TDS section'),
    () => {
      const info = getQueryInfo(
        buildStub({
          implementation: { type: 'GRAPH_FETCH' },
          parameterCount: 2,
          constantCount: 1,
          filterIsEmpty: false,
          filterNodeCount: 3,
          watermarkValue: 'some-watermark',
        }),
      );
      expect(info).toEqual({
        fetchStructureType: 'GRAPH_FETCH',
        isQuerySupported: true,
        parameterCount: 2,
        constantCount: 1,
        hasFilter: true,
        filterNodeCount: 3,
        watermarkEnabled: true,
        milestoningKind: 'none',
      });
      // the TDS-only fields must be absent, not present-and-undefined, so a
      // graph-fetch query does not create empty columns in the warehouse
      expect(Object.keys(info)).not.toContain('projectionColumnCount');
      expect(Object.keys(info)).not.toContain('hasLimit');
    },
  );

  test(unitTest('treats an unset watermark as disabled'), () => {
    expect(
      getQueryInfo(buildStub({ watermarkValue: undefined })).watermarkEnabled,
    ).toBe(false);
  });

  test(
    unitTest('passes through milestoningState.milestoningKind as-is'),
    () => {
      expect(
        getQueryInfo(buildStub({ milestoningKind: 'all-versions-in-range' }))
          .milestoningKind,
      ).toBe('all-versions-in-range');
      expect(
        getQueryInfo(buildStub({ milestoningKind: 'get-all' })).milestoningKind,
      ).toBe('get-all');
      expect(getQueryInfo(buildStub()).milestoningKind).toBe('none');
    },
  );

  test(
    unitTest('reports the TDS section when the fetch structure is TDS'),
    () => {
      const info = getQueryInfo(
        buildStub({
          implementation: buildTDSImplementation({
            projectionColumns: [{}, {}, {}],
            windowColumnCount: 1,
            aggregationColumnCount: 2,
            postFilterNodeCount: 4,
            limit: 1000,
            distinct: true,
            sortColumnCount: 2,
            slice: [0, 10],
          }),
        }),
      );
      expect(info).toEqual(
        expect.objectContaining({
          fetchStructureType: 'TABULAR_DATA_STRUCTURE',
          projectionColumnCount: 3,
          windowColumnCount: 1,
          aggregationColumnCount: 2,
          postFilterNodeCount: 4,
          hasLimit: true,
          hasDistinct: true,
          sortColumnCount: 2,
          hasSlice: true,
        }),
      );
    },
  );

  test(
    unitTest('distinguishes an unset limit/slice from a zero-valued one'),
    () => {
      const info = getQueryInfo(
        buildStub({
          implementation: buildTDSImplementation({
            limit: undefined,
            slice: undefined,
          }),
        }),
      );
      expect(info.hasLimit).toBe(false);
      expect(info.hasSlice).toBe(false);
    },
  );

  test(
    unitTest(
      'isTypedFetchStructure is true only when every projection column is relation-based',
    ),
    () => {
      const relationColumn = Object.create(
        QueryBuilderRelationColumnProjectionColumnState.prototype,
      ) as object;
      const simpleColumn = {};

      expect(
        getQueryInfo(
          buildStub({
            implementation: buildTDSImplementation({
              projectionColumns: [relationColumn, relationColumn],
            }),
          }),
        ).isTypedFetchStructure,
      ).toBe(true);

      // a single non-relation column is enough to make it untyped
      expect(
        getQueryInfo(
          buildStub({
            implementation: buildTDSImplementation({
              projectionColumns: [relationColumn, simpleColumn],
            }),
          }),
        ).isTypedFetchStructure,
      ).toBe(false);
    },
  );

  test(
    unitTest(
      'isTypedFetchStructure is false rather than vacuously true with no columns',
    ),
    () => {
      // `[].every(...)` is true, so the emptiness guard is what keeps a blank
      // TDS query from being reported as a typed relation query
      expect(
        getQueryInfo(
          buildStub({
            implementation: buildTDSImplementation({ projectionColumns: [] }),
          }),
        ).isTypedFetchStructure,
      ).toBe(false);
    },
  );

  test(
    unitTest(
      'isQuerySupported reflects the presence of an unsupported raw lambda',
    ),
    () => {
      expect(getQueryInfo(buildStub()).isQuerySupported).toBe(true);
      // When the query lambda could not be built into the form-mode builder,
      // the raw lambda is stashed on `unsupportedQueryState` and the fallback
      // editor is shown — this is what flips the flag.
      expect(
        getQueryInfo(buildStub({ unsupportedRawLambda: {} })).isQuerySupported,
      ).toBe(false);
    },
  );
});
