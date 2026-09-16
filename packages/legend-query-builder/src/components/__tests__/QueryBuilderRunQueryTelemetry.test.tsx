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

import { expect, test } from '@jest/globals';
import {
  type RenderResult,
  fireEvent,
  getByText,
  act,
} from '@testing-library/react';
import { TEST_DATA__simpleProjection } from '../../stores/__tests__/TEST_DATA__QueryBuilder_Generic.js';
import { TEST_DATA__ModelCoverageAnalysisResult_ComplexRelational } from '../../stores/__tests__/TEST_DATA__ModelCoverageAnalysisResult.js';
import TEST_DATA__ComplexRelationalModel from '../../stores/__tests__/TEST_DATA__QueryBuilder_Model_ComplexRelational.json' with { type: 'json' };
import {
  type PlainObject,
  guaranteeNonNullable,
  guaranteeType,
} from '@finos/legend-shared';
import { createSpy, integrationTest } from '@finos/legend-shared/test';
import {
  create_RawLambda,
  stub_RawLambda,
  GRAPH_MANAGER_EVENT,
  V1_EXECUTION_RESULT,
  V1_PureGraphManager,
} from '@finos/legend-graph';
import { TEST__setUpQueryBuilder } from '../__test-utils__/QueryBuilderComponentTestUtils.js';
import type { QueryBuilderState } from '../../stores/QueryBuilderState.js';
import { QUERY_BUILDER_EVENT } from '../../__lib__/QueryBuilderEvent.js';

const TEST_CLASS_PATH = 'model::pure::tests::model::simple::Person';
const TEST_MAPPING_PATH = 'model::relational::tests::simpleRelationalMapping';
const TEST_RUNTIME_PATH = 'model::MyRuntime';

const mockedResult = {
  builder: {
    _type: 'tdsBuilder',
    columns: [
      {
        name: 'Edited First Name',
        type: 'String',
        relationalType: 'VARCHAR(200)',
      },
    ],
  },
  activities: [{ _type: 'relational', comment: '', sql: 'select' }],
  result: {
    columns: ['Edited First Name'],
    rows: [{ values: ['John'] }],
  },
};

type LoggedTelemetryEvent = {
  eventType: string;
  data: PlainObject;
};

const getLoggedPayload = (
  loggedEvents: LoggedTelemetryEvent[],
  eventType: string,
): PlainObject | undefined =>
  loggedEvents.find((event) => event.eventType === eventType)?.data;

/**
 * Sets up a real query builder state (same model / mapping / runtime / query as
 * the sibling `QueryBuilderRunQuery` tests) and captures every telemetry event
 * emitted from that point on.
 */
const TEST__setUpRunQueryTelemetry = async (): Promise<{
  renderResult: RenderResult;
  queryBuilderState: QueryBuilderState;
  pureManager: V1_PureGraphManager;
  loggedEvents: LoggedTelemetryEvent[];
}> => {
  const { renderResult, queryBuilderState } = await TEST__setUpQueryBuilder(
    TEST_DATA__ComplexRelationalModel,
    stub_RawLambda(),
    TEST_MAPPING_PATH,
    TEST_RUNTIME_PATH,
    TEST_DATA__ModelCoverageAnalysisResult_ComplexRelational,
  );
  const _personClass =
    queryBuilderState.graphManagerState.graph.getClass(TEST_CLASS_PATH);
  await act(async () => {
    queryBuilderState.changeSourceElement(_personClass);
  });
  await act(async () => {
    queryBuilderState.initializeWithQuery(
      create_RawLambda(
        TEST_DATA__simpleProjection.parameters,
        TEST_DATA__simpleProjection.body,
      ),
    );
  });
  const pureManager = guaranteeType(
    queryBuilderState.graphManagerState.graphManager,
    V1_PureGraphManager,
  );
  const loggedEvents: LoggedTelemetryEvent[] = [];
  createSpy(
    queryBuilderState.applicationStore.telemetryService,
    'logEvent',
  ).mockImplementation((eventType: string, data: PlainObject) => {
    loggedEvents.push({ eventType, data });
  });
  return { renderResult, queryBuilderState, pureManager, loggedEvents };
};

/**
 * Drives a real `runQuery()` through the UI. Depending on the query, clicking
 * "Run Query" either runs straight away or first opens the parameter/milestoning
 * dialog which carries its own "Run" button.
 */
const TEST__runQuery = async (renderResult: RenderResult): Promise<void> => {
  await act(async () => {
    fireEvent.click(renderResult.getByText('Run Query'));
  });
  const dialog = renderResult.queryByRole('dialog');
  if (dialog) {
    await act(async () => {
      fireEvent.click(getByText(dialog, 'Run'));
    });
  }
};

const mockSuccessfulExecution = (pureManager: V1_PureGraphManager): void => {
  const executionResultMap = new Map<string, string>();
  executionResultMap.set(V1_EXECUTION_RESULT, JSON.stringify(mockedResult));
  createSpy(pureManager.engine, 'runQueryAndReturnMap').mockResolvedValue(
    executionResultMap,
  );
};

test(
  integrationTest(
    'Query Builder run query success telemetry carries the execution context nested under `state`',
  ),
  async () => {
    const { renderResult, pureManager, loggedEvents } =
      await TEST__setUpRunQueryTelemetry();
    mockSuccessfulExecution(pureManager);

    await TEST__runQuery(renderResult);

    const payload = guaranteeNonNullable(
      getLoggedPayload(loggedEvents, QUERY_BUILDER_EVENT.RUN_QUERY__SUCCESS),
      `Expected a '${QUERY_BUILDER_EVENT.RUN_QUERY__SUCCESS}' telemetry event`,
    );
    expect(payload).toEqual(
      expect.objectContaining({
        state: expect.objectContaining({
          class: TEST_CLASS_PATH,
          mapping: TEST_MAPPING_PATH,
          runtime: TEST_RUNTIME_PATH,
        }),
      }),
    );
    // the execution context must NOT be flattened onto the top level: that is
    // what keeps "arrived on mapping X" distinguishable from "querying mapping X"
    expect(payload).not.toHaveProperty('class');
    expect(payload).not.toHaveProperty('mapping');
    expect(payload).not.toHaveProperty('runtime');
  },
);

test(
  integrationTest(
    'Query Builder run query success telemetry carries phase timings including the engine server-call lap',
  ),
  async () => {
    const { renderResult, pureManager, loggedEvents } =
      await TEST__setUpRunQueryTelemetry();
    mockSuccessfulExecution(pureManager);

    await TEST__runQuery(renderResult);

    const payload = guaranteeNonNullable(
      getLoggedPayload(loggedEvents, QUERY_BUILDER_EVENT.RUN_QUERY__SUCCESS),
      `Expected a '${QUERY_BUILDER_EVENT.RUN_QUERY__SUCCESS}' telemetry event`,
    );
    const timings = guaranteeNonNullable(
      payload.timings,
      'Expected run-query success telemetry to carry `timings`',
    ) as PlainObject;
    const timingKeys = Object.keys(timings);
    expect(timingKeys).toEqual(
      expect.arrayContaining([
        QUERY_BUILDER_EVENT.RUN_QUERY__PREPARE,
        QUERY_BUILDER_EVENT.RUN_QUERY__PROCESS_RESULT,
        'total',
      ]),
    );
    // REGRESSION GUARD: the engine laps only make it into `report.timings` if
    // `QueryBuilderResultState.runQuery` passes its `report` as the 6th argument
    // to `graphManager.runQuery`. Drop that argument and the graph manager
    // computes these laps into a throwaway report, silently reverting the
    // feature while every other assertion here still passes.
    expect(timingKeys).toEqual(
      expect.arrayContaining([
        GRAPH_MANAGER_EVENT.V1_ENGINE_OPERATION_SERVER_CALL__SUCCESS,
        GRAPH_MANAGER_EVENT.V1_ENGINE_OPERATION_INPUT__SUCCESS,
      ]),
    );
  },
);

test(
  integrationTest(
    'Query Builder run query launch telemetry carries the execution context nested under `state`',
  ),
  async () => {
    const { renderResult, pureManager, loggedEvents } =
      await TEST__setUpRunQueryTelemetry();
    mockSuccessfulExecution(pureManager);

    await TEST__runQuery(renderResult);

    const payload = guaranteeNonNullable(
      getLoggedPayload(loggedEvents, QUERY_BUILDER_EVENT.RUN_QUERY__LAUNCH),
      `Expected a '${QUERY_BUILDER_EVENT.RUN_QUERY__LAUNCH}' telemetry event`,
    );
    expect(payload).toEqual(
      expect.objectContaining({
        state: expect.objectContaining({
          class: TEST_CLASS_PATH,
          mapping: TEST_MAPPING_PATH,
          runtime: TEST_RUNTIME_PATH,
        }),
      }),
    );
    expect(payload).not.toHaveProperty('class');
  },
);

test(
  integrationTest(
    'Query Builder run query failure telemetry carries the error, the execution context, and the timings collected so far',
  ),
  async () => {
    const { renderResult, pureManager, loggedEvents } =
      await TEST__setUpRunQueryTelemetry();
    createSpy(pureManager.engine, 'runQueryAndReturnMap').mockRejectedValue(
      new Error('boom'),
    );

    await TEST__runQuery(renderResult);

    const payload = guaranteeNonNullable(
      getLoggedPayload(loggedEvents, QUERY_BUILDER_EVENT.RUN_QUERY__FAILURE),
      `Expected a '${QUERY_BUILDER_EVENT.RUN_QUERY__FAILURE}' telemetry event`,
    );
    expect(payload).toEqual(
      expect.objectContaining({
        errorMessage: 'boom',
        errorName: 'Error',
        state: expect.objectContaining({
          class: TEST_CLASS_PATH,
          mapping: TEST_MAPPING_PATH,
          runtime: TEST_RUNTIME_PATH,
        }),
        timings: expect.objectContaining({
          [QUERY_BUILDER_EVENT.RUN_QUERY__PREPARE]: expect.any(Number),
          total: expect.any(Number),
        }),
      }),
    );
    expect(payload).not.toHaveProperty('class');
    expect(
      getLoggedPayload(loggedEvents, QUERY_BUILDER_EVENT.RUN_QUERY__SUCCESS),
    ).toBeUndefined();
  },
);
