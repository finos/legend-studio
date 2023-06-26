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

import { test, expect } from '@jest/globals';
import { unitTest } from '@finos/legend-shared/test';
import { Multiplicity, VariableExpression } from '@finos/legend-graph';
import { generateServiceURL } from '../ServiceRegisterModal.js';

test(unitTest('Test Generate service URL'), () => {
  const params = [
    new VariableExpression('param1', Multiplicity.ONE),
    new VariableExpression('param2', Multiplicity.ZERO_ONE),
    new VariableExpression('param3', Multiplicity.ZERO_MANY),
  ];
  expect(generateServiceURL('/myServiceUrl', params)).toEqual(
    '/myServiceUrl/{param1}/{param2}',
  );
  expect(generateServiceURL('/myServiceUrl', [])).toEqual('/myServiceUrl');
  expect(generateServiceURL('/myServiceUrl', undefined)).toEqual(
    '/myServiceUrl',
  );
  expect(generateServiceURL(undefined, undefined).split('/')).toHaveLength(2);
  const withUUID = generateServiceURL(undefined, params).split('/');
  expect(withUUID).toHaveLength(4);
  expect(withUUID[2]).toEqual(`{param1}`);
  expect(withUUID[3]).toEqual(`{param2}`);
});
