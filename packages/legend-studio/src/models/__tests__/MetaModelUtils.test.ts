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

import {
  extractElementNameFromPath,
  fromElementPathToMappingElementId,
  matchFunctionName,
} from '../MetaModelUtils';
import { unitTest } from '@finos/legend-shared';

test(unitTest('Extract element name in full element path'), () => {
  expect(extractElementNameFromPath('namePart')).toBe('namePart');
  expect(extractElementNameFromPath('p1::p2::p3::namePart')).toBe('namePart');
});

test(unitTest('Matches function name'), () => {
  expect(matchFunctionName('fnX', 'p1::p2::p3::fnX')).toBe(true);
  expect(matchFunctionName('fnX', 'fnX')).toBe(true);
  expect(matchFunctionName('p5::fnX', 'p1::p2::p3::fnX')).toBe(false);
  expect(matchFunctionName('p3::fnX', 'p1::p2::p3::fnX')).toBe(false);
  expect(matchFunctionName('fnY', 'fnX')).toBe(false);
});

test(unitTest('Converts element path to mapping element default ID'), () => {
  expect(
    fromElementPathToMappingElementId(
      'meta::pure::mapping::modelToModel::test::shared::dest::Person',
    ),
  ).toBe('meta_pure_mapping_modelToModel_test_shared_dest_Person');
  expect(fromElementPathToMappingElementId('Person')).toBe('Person');
});
