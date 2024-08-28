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

import { expect, test } from '@jest/globals';
import type { Entity } from '@finos/legend-storage';
import { unitTest } from '@finos/legend-shared/test';
import {
  TEST_DATA__roundtrip,
  TEST_DATA__DSL_DataSpace_Model,
} from './TEST_DATA__DSL_DataSpace_Roundtrip.js';
import { DSL_DataSpace_GraphManagerPreset } from '../DSL_DataSpace_GraphManagerPreset.js';
import {
  TEST__GraphManagerPluginManager,
  TEST__buildGraphWithEntities,
  TEST__checkBuildingElementsRoundtrip,
  TEST__getTestGraphManagerState,
} from '@finos/legend-graph/test';
import { DataSpace } from '../../graph/metamodel/pure/model/packageableElements/dataSpace/DSL_DataSpace_DataSpace.js';
import { guaranteeNonNullable, guaranteeType } from '@finos/legend-shared';
import { getExecutionContextFromDataspaceExecutable } from '../DSL_DataSpace_GraphManagerHelper.js';

const pluginManager = new TEST__GraphManagerPluginManager();
pluginManager.usePresets([new DSL_DataSpace_GraphManagerPreset()]).install();

test(unitTest('Data space import resolution roundtrip'), async () => {
  await TEST__checkBuildingElementsRoundtrip(
    TEST_DATA__roundtrip as Entity[],
    pluginManager,
  );
});

test(
  unitTest('Get execution context from data space executables'),
  async () => {
    const graphManagerState = TEST__getTestGraphManagerState(pluginManager);
    await TEST__buildGraphWithEntities(
      graphManagerState,
      TEST_DATA__DSL_DataSpace_Model,
      {
        TEMPORARY__preserveSectionIndex: true,
      },
    );
    const covidDataspace = guaranteeType(
      guaranteeNonNullable(
        graphManagerState.graph.allElements.findLast(
          (e) => e instanceof DataSpace && e.path === 'domain::COVIDDatapace',
        ),
        'fail to find a dataspace',
      ),
      DataSpace,
    );
    expect(covidDataspace.executables).toHaveLength(3);
    const templateWithFunctionPointer = covidDataspace.executables?.findLast(
      (e) => e.title === 'templateWithFunctionPointer',
    );
    expect(templateWithFunctionPointer).not.toBeNull();
    const executionContextFromExecutableWithFunctionPointer =
      getExecutionContextFromDataspaceExecutable(
        covidDataspace,
        guaranteeNonNullable(templateWithFunctionPointer),
      );
    expect(executionContextFromExecutableWithFunctionPointer).not.toBeNull();
    expect(executionContextFromExecutableWithFunctionPointer?.name).toBe(
      'dummyContext',
    );

    const templateWithService = covidDataspace.executables?.findLast(
      (e) => e.title === 'templateWithService',
    );
    expect(templateWithService).not.toBeNull();
    const executionContextFromExecutableWithService =
      getExecutionContextFromDataspaceExecutable(
        covidDataspace,
        guaranteeNonNullable(templateWithService),
      );
    expect(executionContextFromExecutableWithService).not.toBeNull();
    expect(executionContextFromExecutableWithService?.name).toBe(
      'dummyContext',
    );

    const templateWithInlineQuery = covidDataspace.executables?.findLast(
      (e) => e.title === 'templateWithInlineQuery',
    );
    expect(templateWithInlineQuery).not.toBeNull();
    const executionContextFromExecutableWithInlineQuery =
      getExecutionContextFromDataspaceExecutable(
        covidDataspace,
        guaranteeNonNullable(templateWithInlineQuery),
      );
    expect(executionContextFromExecutableWithInlineQuery).not.toBeNull();
    expect(executionContextFromExecutableWithInlineQuery?.name).toBe(
      'dummyContext',
    );
  },
);
