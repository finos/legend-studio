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
import type { JsonObject } from '@finos/legend-cube';
import { RawLambda } from '@finos/legend-graph';
import {
  buildCubeDataSpaceQuery,
  CUBE_DATA_SPACE_QUERY_PROBLEM,
  getCubeDataSpaceQueryShapeProblem,
  substituteCubeDataSpaceVariables,
} from '../LegendAnalyticsCubeDataSpaceQuery.js';
import {
  TEST__COVID_DATA,
  TEST__covidQuery,
  TEST__filter,
  TEST__func,
  TEST__project,
  TEST__setUpCubeQueryBuilder,
} from './LegendAnalyticsDataSpaceTestUtils.js';

const projectOf = (relation: JsonObject | undefined): JsonObject =>
  ((relation?.body as JsonObject[] | undefined) ?? [])[0] as JsonObject;

describe('A data space source from the query builder', () => {
  test("Is the class, its filter and its columns: the query builder's lambda, and the same query as a Relation, with no from()", async () => {
    const state = await TEST__setUpCubeQueryBuilder();
    const query = TEST__covidQuery(
      TEST__project(TEST__filter(TEST__COVID_DATA, 'caseType', 'Confirmed'), [
        ['id', 'Id'],
        ['cases', 'Cases'],
      ]),
    );
    state.initializeWithQuery(
      new RawLambda(query.parameters as object, query.body as object),
    );
    expect(state.isQuerySupported).toBe(true);
    const result = buildCubeDataSpaceQuery(state);
    if (!('edit' in result)) {
      throw new Error(result.problem);
    }
    const { edit } = result;
    expect(edit.mapping).toBe('mapping::CovidDataMapping');
    expect(edit.runtime).toBe('runtime::H2Runtime');
    expect(edit.coordinates.dataSpace).toBe('domain::COVIDDatapace');
    expect(edit.coordinates.executionContext).toBe('dummyContext');
    expect(edit.coordinates.entity).toBe('domain::COVIDData');
    // the query builder's own lambda, as it writes it, to open it again
    expect(projectOf(edit.coordinates.query)).toMatchObject({
      _type: 'func',
      function: 'project',
    });
    // the typed form: the filter kept, the columns a col spec array, and no from()
    const relation = projectOf(edit.coordinates.relation);
    expect(edit.coordinates.relation.parameters).toEqual([]);
    expect(relation.function).toBe('project');
    const [rows, columns] = relation.parameters as JsonObject[];
    expect(rows).toMatchObject({ _type: 'func', function: 'filter' });
    expect((rows?.parameters as JsonObject[] | undefined)?.[0]).toMatchObject({
      function: 'getAll',
    });
    expect(columns).toMatchObject({
      _type: 'classInstance',
      type: 'colSpecArray',
    });
    expect(
      (
        (columns?.value as JsonObject | undefined)?.colSpecs as JsonObject[]
      ).map((spec) => spec.name),
    ).toEqual(['Id', 'Cases']);
    expect(JSON.stringify(edit.coordinates.relation)).not.toContain(
      '"function":"from"',
    );
    // the writer is back as it was: the query builder goes on writing TDS, with no from()
    const [rebuilt] = state.buildQuery().body as JsonObject[];
    expect(rebuilt?.function).toBe('project');
    expect(
      ((rebuilt?.parameters as JsonObject[] | undefined) ?? [])[1],
    ).toMatchObject({ _type: 'collection' });
  });

  test('Asks for an entity and a column, and refuses what are Cube steps after the source, saying which', async () => {
    const state = await TEST__setUpCubeQueryBuilder();
    // a class picked, no column
    expect(buildCubeDataSpaceQuery(state)).toEqual({
      problem: CUBE_DATA_SPACE_QUERY_PROBLEM.NO_COLUMN,
    });
    const columns: [string, string][] = [['id', 'Id']];
    const cases: [JsonObject, string][] = [
      [
        TEST__func('take', [
          TEST__project(TEST__COVID_DATA, columns),
          { _type: 'integer', value: 10 },
        ]),
        CUBE_DATA_SPACE_QUERY_PROBLEM.QUERY_OPTIONS,
      ],
      [
        TEST__func('distinct', [TEST__project(TEST__COVID_DATA, columns)]),
        CUBE_DATA_SPACE_QUERY_PROBLEM.QUERY_OPTIONS,
      ],
    ];
    cases.forEach(([body, problem]) => {
      const query = TEST__covidQuery(body);
      state.initializeWithQuery(
        new RawLambda(query.parameters as object, query.body as object),
      );
      expect(buildCubeDataSpaceQuery(state)).toEqual({ problem });
    });
  });
});

describe("A data space source's query, read from its lambda", () => {
  const getAll = TEST__COVID_DATA;
  const project = (rows: JsonObject): JsonObject =>
    TEST__project(rows, [['id', 'Id']]);

  test('Is a class, a filter or none, then columns', () => {
    expect(
      getCubeDataSpaceQueryShapeProblem([project(getAll)]),
    ).toBeUndefined();
    expect(
      getCubeDataSpaceQueryShapeProblem([
        project(TEST__filter(getAll, 'caseType', 'Confirmed')),
      ]),
    ).toBeUndefined();
  });

  test.each([
    ['an aggregate', 'groupBy', CUBE_DATA_SPACE_QUERY_PROBLEM.AGGREGATE],
    ['a window', 'olapGroupBy', CUBE_DATA_SPACE_QUERY_PROBLEM.WINDOW],
    ['a post-filter', 'filter', CUBE_DATA_SPACE_QUERY_PROBLEM.POST_FILTER],
    ['a sort', 'sort', CUBE_DATA_SPACE_QUERY_PROBLEM.QUERY_OPTIONS],
    ['a limit', 'take', CUBE_DATA_SPACE_QUERY_PROBLEM.QUERY_OPTIONS],
    ['a graph fetch', 'serialize', CUBE_DATA_SPACE_QUERY_PROBLEM.GRAPH_FETCH],
    ['anything else', 'concatenate', CUBE_DATA_SPACE_QUERY_PROBLEM.OTHER],
  ])('Refuses %s around the columns', (_, outer, problem) => {
    expect(
      getCubeDataSpaceQueryShapeProblem([TEST__func(outer, [project(getAll)])]),
    ).toBe(problem);
  });

  test('Asks for a column when there is the class only, filtered or not', () => {
    expect(getCubeDataSpaceQueryShapeProblem([getAll])).toBe(
      CUBE_DATA_SPACE_QUERY_PROBLEM.NO_COLUMN,
    );
    expect(
      getCubeDataSpaceQueryShapeProblem([
        TEST__filter(getAll, 'caseType', 'Confirmed'),
      ]),
    ).toBe(CUBE_DATA_SPACE_QUERY_PROBLEM.NO_COLUMN);
  });

  test('Refuses constants, which are lets before the query, and columns of anything but a class', () => {
    expect(
      getCubeDataSpaceQueryShapeProblem([
        TEST__func('letFunction', [{ _type: 'string', value: 'c' }]),
        project(getAll),
      ]),
    ).toBe(CUBE_DATA_SPACE_QUERY_PROBLEM.CONSTANT);
    expect(
      getCubeDataSpaceQueryShapeProblem([
        project(TEST__func('meta::pure::tds::tableToTDS', [])),
      ]),
    ).toBe(CUBE_DATA_SPACE_QUERY_PROBLEM.OTHER);
  });
});

describe("A date-versioned class's dates", () => {
  test('Take their values in place, but inside a lambda that declares a parameter of that name', () => {
    const now: JsonObject = { _type: 'func', function: 'now', parameters: [] };
    const date: JsonObject = { _type: 'var', name: 'businessDate' };
    const query = TEST__func('project', [
      TEST__func('getAll', [{ _type: 'packageableElementPtr' }, date]),
      {
        _type: 'lambda',
        parameters: [{ _type: 'var', name: 'businessDate' }],
        body: [date],
      },
    ]);
    expect(
      substituteCubeDataSpaceVariables(query, new Map([['businessDate', now]])),
    ).toEqual(
      TEST__func('project', [
        TEST__func('getAll', [{ _type: 'packageableElementPtr' }, now]),
        {
          _type: 'lambda',
          parameters: [{ _type: 'var', name: 'businessDate' }],
          body: [date],
        },
      ]),
    );
  });
});
