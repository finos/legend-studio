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

import { expect, jest, test } from '@jest/globals';
import { unitTest } from '../../__test-utils__/CubeTestUtils.js';
import type * as CubeTypeModule from '../CubeType.js';
import { EnumType, OpaqueType, PrimitiveType } from '../CubeType.js';
import {
  areCompatibleTypes,
  getLeastCommonAncestor,
} from '../TypeCompatibility.js';
import { checkValue, parseValue } from '../../values/ValueEntry.js';

/**
 * A second copy of the module, as when two versions of the package are
 * installed, gives types that are not the same instances. Equality is
 * structural, so they must still behave as the same types.
 */
test(unitTest('Types are equal across copies of their module'), async () => {
  let copy: typeof CubeTypeModule | undefined;
  await jest.isolateModulesAsync(async () => {
    copy = await import('../CubeType.js');
  });
  if (!copy) {
    throw new Error('The module copy did not load');
  }
  expect(copy.PrimitiveType).not.toBe(PrimitiveType);

  const varchar5 = copy.PrimitiveType.get('Varchar', [5]);
  expect(varchar5).not.toBe(PrimitiveType.get('Varchar', [5]));
  expect(varchar5.equals(PrimitiveType.get('Varchar', [5]))).toBe(true);
  expect(PrimitiveType.get('Varchar', [5]).equals(varchar5)).toBe(true);
  expect(varchar5.equals(PrimitiveType.get('Varchar', [6]))).toBe(false);

  const color = new copy.EnumType('my::model::Color', ['RED', 'GREEN']);
  expect(color.equals(new EnumType('my::model::Color', ['BLUE']))).toBe(true);
  expect(color.equals(new EnumType('my::model::Size', ['RED']))).toBe(false);

  const unknown = copy.OpaqueType.get('my::model::Unknown');
  expect(unknown.equals(OpaqueType.get('my::model::Unknown'))).toBe(true);
  expect(unknown.equals(OpaqueType.get('my::model::Unknown', [1]))).toBe(false);

  // the rules that build on equality and on the type's kind
  expect(
    areCompatibleTypes(color, new EnumType('my::model::Color', ['RED'])),
  ).toBe(true);
  expect(
    getLeastCommonAncestor(
      copy.PrimitiveType.get('Varchar', [15]),
      PrimitiveType.get('Varchar', [2]),
    )?.equals(PrimitiveType.get('String')),
  ).toBe(true);
  expect(parseValue('RED', color)).toEqual({ kind: 'enum', value: 'RED' });
  expect(
    checkValue(
      { kind: 'integer', value: '300' },
      copy.PrimitiveType.get('TinyInt'),
    ),
  ).toEqual({ reason: 'outOfRange', text: '300' });
});
