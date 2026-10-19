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

import { test, expect } from '@jest/globals';
import { guaranteeNonNullable } from '@finos/legend-shared';
import { unitTest } from '@finos/legend-shared/test';
import type { Entity } from '@finos/legend-storage';
import type { AbstractPureGraphManager } from '../AbstractPureGraphManager.js';
import { TEST__getTestGraphManagerState } from '../__test-utils__/GraphManagerTestUtils.js';
import {
  TEST_DATA__ClassRoundtrip,
  TEST_DATA__EnumerationRoundtrip,
} from './roundtripTestData/TEST_DATA__DomainRoundtrip.js';

const ENTITIES = [
  ...TEST_DATA__ClassRoundtrip,
  ...TEST_DATA__EnumerationRoundtrip,
] as Entity[];
const EDITED_PATH = 'test::A';

const createGraphManager = async (): Promise<AbstractPureGraphManager> => {
  const graphManagerState = TEST__getTestGraphManagerState();
  await graphManagerState.graphManager.initialize({
    env: 'test',
    tabSize: 2,
    clientConfig: {},
  });
  return graphManagerState.graphManager;
};

// a deep copy of the entities, where the first property of `test::A` is renamed
const copyEntities = (options?: { edit?: boolean }): Entity[] =>
  (JSON.parse(JSON.stringify(ENTITIES)) as Entity[]).map((entity) => {
    if (options?.edit && entity.path === EDITED_PATH) {
      const property = guaranteeNonNullable(
        (entity.content as { properties: { name: string }[] }).properties[0],
      );
      property.name = `${property.name}Renamed`;
    }
    return entity;
  });

// the hashes a graph manager that has never hashed anything gives
const freshHashesIndex = async (
  entities: Entity[],
): Promise<Map<string, string>> =>
  (await createGraphManager()).buildHashesIndex(entities);

test(
  unitTest(
    'Hashes index gives the same hashes when it reuses hashes of entities seen before',
  ),
  async () => {
    const graphManager = await createGraphManager();
    const original = await graphManager.buildHashesIndex(copyEntities());
    const edited = await graphManager.buildHashesIndex(
      copyEntities({ edit: true }),
    );
    const originalAgain = await graphManager.buildHashesIndex(copyEntities());

    expect(original).toEqual(await freshHashesIndex(copyEntities()));
    expect(edited).toEqual(
      await freshHashesIndex(copyEntities({ edit: true })),
    );
    expect(originalAgain).toEqual(original);
    expect(
      Array.from(edited.keys()).filter(
        (path) => edited.get(path) !== original.get(path),
      ),
    ).toEqual([EDITED_PATH]);
  },
);

test(
  unitTest(
    'Hashes index gives the same hashes to calls running at the same time',
  ),
  async () => {
    const graphManager = await createGraphManager();
    const [original, edited, originalAgain] = await Promise.all([
      graphManager.buildHashesIndex(copyEntities()),
      graphManager.buildHashesIndex(copyEntities({ edit: true })),
      graphManager.buildHashesIndex(copyEntities()),
    ]);

    expect(original).toEqual(await freshHashesIndex(copyEntities()));
    expect(edited).toEqual(
      await freshHashesIndex(copyEntities({ edit: true })),
    );
    expect(originalAgain).toEqual(original);
  },
);
