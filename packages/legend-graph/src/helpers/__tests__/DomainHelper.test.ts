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

import { unitTest } from '@finos/legend-shared';
import { Package } from '../../models/metamodels/pure/packageableElements/domain/Package';
import { getOrCreatePackage } from '../DomainHelper';

test(unitTest('Get or create package utility properly handle cache'), () => {
  const root = new Package('ROOT');
  const packageCache = new Map<string, Package>();
  getOrCreatePackage(root, 'model1::model2', true, packageCache);
  getOrCreatePackage(root, 'model1::model2', true, packageCache);
  getOrCreatePackage(root, 'model1::model3', true, packageCache);
  getOrCreatePackage(root, 'model0::model1', true, packageCache);
  expect(packageCache.size).toBe(5);
});
