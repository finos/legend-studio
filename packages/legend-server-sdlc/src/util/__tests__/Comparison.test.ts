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

import { unitTest } from '@finos/legend-shared/test';
import { test, expect } from '@jest/globals';
import { Comparison } from '../../models/comparison/Comparison.js';
import { reprocessEntityDiffs } from '../ComparisonHelper.js';
import { EntityChangeType } from '../../models/entity/EntityChange.js';

const comparisonRaw = {
  projectConfigurationUpdated: true,
  toRevisionId: '72ff65b8764af6dcab0f681694787e81015da1e6',
  fromRevisionId: '283020cc03141a1be2373a7b5648bcc26b987994',
  entityDiffs: [
    {
      entityChangeType: 'DELETE',
      newPath:
        '/my-test-project-entities/src/main/legend/model/test_Number_1__String_$0_1$_.json',
      oldPath: 'model::test_Number_1__String_$0_1$_',
    },
    {
      entityChangeType: 'DELETE',
      newPath:
        '/my-test-project-entities/src/main/legend/model/test_String_1__String_MANY_.json',
      oldPath: 'model::test_String_1__String_MANY_',
    },
    {
      entityChangeType: 'CREATE',
      newPath: 'model::Testing',
      oldPath:
        '/my-test-project-test-entities/src/main/pure/model/Testing.pure',
    },
    {
      entityChangeType: 'CREATE',
      newPath: 'model::test_Number_1__String_$0_1$_',
      oldPath:
        '/my-test-project-test-entities/src/main/pure/model/test_Number_1__String_$0_1$_.pure',
    },
  ],
};

test(unitTest('Test Pretty Duration'), () => {
  const comparison = Comparison.serialization.fromJson(comparisonRaw);
  expect(comparison.projectConfigurationUpdated).toBe(true);
  const processed = reprocessEntityDiffs(comparison.entityDiffs);
  expect(processed).toHaveLength(3);

  const modified = processed.find(
    (e) => e.entityChangeType === EntityChangeType.MODIFY,
  );
  expect(modified).toBeDefined();
  expect(modified?.newPath).toEqual('model::test_Number_1__String_$0_1$_');
  expect(modified?.oldPath).toEqual('model::test_Number_1__String_$0_1$_');
  const created = processed.find(
    (e) => e.entityChangeType === EntityChangeType.CREATE,
  );
  expect(created).toBeDefined();
  expect(created?.newPath).toEqual('model::Testing');
  expect(created?.oldPath).toBeUndefined();

  const deleted = processed.find(
    (e) => e.entityChangeType === EntityChangeType.DELETE,
  );
  expect(deleted?.newPath).toBeUndefined();
  expect(deleted?.oldPath).toEqual('model::test_String_1__String_MANY_');
});
