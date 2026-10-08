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
import { useApplicationStore } from '@finos/legend-application';
import { Schema } from '@finos/legend-cube';
import {
  TEST__createCubeApplicationStore,
  TEST__createCubeHost,
} from '../__test-utils__/CubeTestApplication.js';
import { TEST__renderInCubeApplication } from '../__test-utils__/CubePageTestUtils.js';
import { CubeEngineError } from '../graph-manager/CubeEngine.js';
import {
  CUBE_NORTHWIND_MODEL,
  CUBE_NORTHWIND_RUNTIME,
} from '../stores/fixtures/CubeNorthwindModel.js';

const AppName: React.FC = () => (
  <div data-testid="app-name">{useApplicationStore().config.appName}</div>
);

describe('Cube test harness', () => {
  test('Renders an element inside an initialized Legend application', async () => {
    const applicationStore = TEST__createCubeApplicationStore();
    const { getByTestId } = await TEST__renderInCubeApplication(
      <AppName />,
      applicationStore,
      'app-name',
    );
    expect(applicationStore.initState.hasSucceeded).toBe(true);
    expect(getByTestId('app-name').textContent).toBe('TEST');
  });

  test('Builds a host over a fake engine that answers the bundled model', async () => {
    const { host, fake } = TEST__createCubeHost();
    const outline = await host.modelCatalog.loadOutline(CUBE_NORTHWIND_MODEL);
    expect(outline.runtimes.map((runtime) => runtime.path)).toContain(
      CUBE_NORTHWIND_RUNTIME,
    );
    const typed = await host.engine.resolveSchemas(
      CUBE_NORTHWIND_MODEL,
      new Map([
        ['relational101', ['db', 'NORTHWIND', 'ORDERS']],
        ['relational102', ['db', 'NORTHWIND', 'MISSING']],
      ]),
    );
    expect(typed.get('relational101')).toBeInstanceOf(Schema);
    expect(typed.get('relational102')).toBeInstanceOf(CubeEngineError);
    expect(fake.loadModel).toHaveBeenCalledTimes(1);
  });
});
