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

import { guaranteeType, unitTest } from '@finos/legend-shared';
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

test(unitTest('Create valid and invalid packages on a root package'), () => {
  const _root = new Package('ROOT');
  const createPackage = (packagePath: string): void => {
    getOrCreatePackage(_root, packagePath, true, undefined);
  };
  const validPackage = 'model::myPackage';
  createPackage(validPackage);
  const rootChildren = _root.children;
  expect(rootChildren.length).toBe(1);
  const modelPackage = rootChildren[0];
  expect(modelPackage?.name).toBe('model');
  expect(modelPackage instanceof Package).toBe(true);
  expect(guaranteeType(modelPackage, Package).children.length).toBe(1);
  const invalidPackages = [
    '$implicit',
    'model::$implicit::new',
    'other::$implicit',
  ];
  invalidPackages.forEach((invalid) =>
    expect(() => createPackage(invalid)).toThrowError(
      `Can't create package with reserved name '$implicit'`,
    ),
  );
});
