/**
 * Copyright (c) 2020-present, Goldman Sachs
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

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { cleanup } from '@testing-library/react';
import { integrationTest, createMock } from '@finos/legend-shared/test';
import { guaranteeNonNullable, guaranteeType } from '@finos/legend-shared';
import {
  ConcreteFunctionDefinition,
  IngestDefinition,
  Database,
} from '@finos/legend-graph';
import {
  AccessorQueryBuilderState,
  QueryBuilderActionConfig,
  QueryBuilderAdvancedWorkflowState,
  getCompatibleRuntimesFromAccessorOwner,
} from '@finos/legend-query-builder';
import { TEST_DATA__QueryBuilder_Accessors } from '@finos/legend-query-builder/test';
import { TEST__setUpEditorWithDefaultSDLCData } from '../../../__test-utils__/EditorComponentTestUtils.js';
import { TEST__buildQueryBuilderMockedEditorStore } from '../../../../__test-utils__/EmbeddedQueryBuilderTestUtils.js';
import { GraphCompilationOutcome } from '../../../../../stores/editor/EditorGraphState.js';
import { promoteQueryToFunction } from '../../uml-editor/ClassQueryBuilder.js';

describe(integrationTest('Promote accessor query to function'), () => {
  let MOCK__editorStore: ReturnType<
    typeof TEST__buildQueryBuilderMockedEditorStore
  >;

  afterAll(() => {
    cleanup();
  });

  beforeAll(async () => {
    MOCK__editorStore = TEST__buildQueryBuilderMockedEditorStore();
    await TEST__setUpEditorWithDefaultSDLCData(MOCK__editorStore, {
      entities: TEST_DATA__QueryBuilder_Accessors,
    });
    MOCK__editorStore.graphState.setMostRecentCompilationOutcome(
      GraphCompilationOutcome.SUCCEEDED,
    );
  });

  test('promotes IngestDefinition accessor query to a ConcreteFunctionDefinition', async () => {
    const ingest = guaranteeType(
      MOCK__editorStore.graphManagerState.graph.getElement(
        'ingestion::CARBON_DIOXIDE_EMISSIONS',
      ),
      IngestDefinition,
    );

    const queryBuilderState = new AccessorQueryBuilderState(
      MOCK__editorStore.applicationStore,
      undefined,
      MOCK__editorStore.graphManagerState,
      QueryBuilderAdvancedWorkflowState.INSTANCE,
      QueryBuilderActionConfig.INSTANCE,
    );
    queryBuilderState.changeAccessorOwner(ingest);
    const compatibleRuntimes = getCompatibleRuntimesFromAccessorOwner(
      ingest,
      MOCK__editorStore.graphManagerState,
    );
    queryBuilderState.changeSelectedRuntime(
      guaranteeNonNullable(compatibleRuntimes[0]),
    );

    const accessor = guaranteeNonNullable(queryBuilderState.sourceAccessor);
    const packagePath = guaranteeNonNullable(
      accessor.parentElement.package,
    ).path;
    const functionName = `${accessor.accessor}_QueryFunction`;

    // avoid the side-effect of opening a tab on the editor store after creation
    MOCK__editorStore.graphEditorMode.openElement = createMock();

    await promoteQueryToFunction(
      packagePath,
      functionName,
      MOCK__editorStore.embeddedQueryBuilderState,
      queryBuilderState,
    );

    const created = MOCK__editorStore.graphManagerState.graph.allOwnElements
      .filter(
        (e): e is ConcreteFunctionDefinition =>
          e instanceof ConcreteFunctionDefinition,
      )
      .find((f) => f.package?.path === packagePath);

    expect(created).toBeDefined();
    // function name is suffixed with the function signature
    expect(guaranteeNonNullable(created).name.startsWith(functionName)).toBe(
      true,
    );
    // accessor queries have no input parameters
    expect(guaranteeNonNullable(created).parameters).toHaveLength(0);
    // the lambda body must be carried over
    expect(
      guaranteeNonNullable(created).expressionSequence.length,
    ).toBeGreaterThan(0);
  });

  test('promotes Database accessor query to a ConcreteFunctionDefinition', async () => {
    const database = guaranteeType(
      MOCK__editorStore.graphManagerState.graph.getElement(
        'database::TestDatabase',
      ),
      Database,
    );

    const queryBuilderState = new AccessorQueryBuilderState(
      MOCK__editorStore.applicationStore,
      undefined,
      MOCK__editorStore.graphManagerState,
      QueryBuilderAdvancedWorkflowState.INSTANCE,
      QueryBuilderActionConfig.INSTANCE,
    );
    queryBuilderState.changeAccessorOwner(database);
    const compatibleRuntimes = getCompatibleRuntimesFromAccessorOwner(
      database,
      MOCK__editorStore.graphManagerState,
    );
    queryBuilderState.changeSelectedRuntime(
      guaranteeNonNullable(compatibleRuntimes[0]),
    );

    const accessor = guaranteeNonNullable(queryBuilderState.sourceAccessor);
    const packagePath = guaranteeNonNullable(
      accessor.parentElement.package,
    ).path;
    const functionName = `${accessor.accessor}_QueryFunction`;

    MOCK__editorStore.graphEditorMode.openElement = createMock();

    await promoteQueryToFunction(
      packagePath,
      functionName,
      MOCK__editorStore.embeddedQueryBuilderState,
      queryBuilderState,
    );

    const created = MOCK__editorStore.graphManagerState.graph.allOwnElements
      .filter(
        (e): e is ConcreteFunctionDefinition =>
          e instanceof ConcreteFunctionDefinition,
      )
      .find((f) => f.package?.path === packagePath);

    expect(created).toBeDefined();
    expect(guaranteeNonNullable(created).name.startsWith(functionName)).toBe(
      true,
    );
    expect(guaranteeNonNullable(created).parameters).toHaveLength(0);
  });
});
