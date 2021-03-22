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

import { fromElementPathToMappingElementId } from '../MetaModelUtility';
import { unitTest } from '@finos/legend-studio-shared';

test(unitTest('Converts element path to mapping element default ID'), () => {
  const _class =
    'meta::pure::mapping::modelToModel::test::shared::dest::Person';
  const expected = 'meta_pure_mapping_modelToModel_test_shared_dest_Person';
  expect(fromElementPathToMappingElementId(_class)).toBe(expected);
});
