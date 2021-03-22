/**
 * Copyright Goldman Sachs
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

import { unitTest } from '@finos/legend-studio-shared';
import { V1_recursiveChangeObjectValues } from '../../../../../transformation/pureGraph/to/dependencyDisambiguator/V1_DependencyDisambiguatorHelper';

test(unitTest('Recursive process object values'), () => {
  const obj: Record<PropertyKey, unknown> = {
    a: 'valueA',
    b: { c: 'valueC', d: 'valueD', e: [{ f: 'valueF', g: 'valueG' }] },
  };
  const funcDoNothing = (value: string): string => value;
  const funcAddPrefix = (value: string): string => `prefix::${value}`;
  expect(V1_recursiveChangeObjectValues(obj, [], funcAddPrefix)).toEqual(obj);
  expect(
    V1_recursiveChangeObjectValues(
      obj,
      ['valueA', 'valueC', 'valueD', 'valueF'],
      funcDoNothing,
    ),
  ).toEqual(obj);
  expect(
    V1_recursiveChangeObjectValues(
      obj,
      ['valueA', 'valueC', 'valueD', 'valueF'],
      funcAddPrefix,
    ),
  ).toEqual({
    a: 'prefix::valueA',
    b: {
      c: 'prefix::valueC',
      d: 'prefix::valueD',
      e: [{ f: 'prefix::valueF', g: 'valueG' }],
    },
  });
  expect(
    V1_recursiveChangeObjectValues(obj, ['valueG', 'valueC'], funcAddPrefix),
  ).toEqual({
    a: 'valueA',
    b: {
      c: 'prefix::valueC',
      d: 'valueD',
      e: [{ f: 'valueF', g: 'prefix::valueG' }],
    },
  });
});
