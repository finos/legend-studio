/**
 * Copyright 2020 Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { unit } from 'Utilities/TestUtil';
import { ROOT_PACKAGE_NAME } from 'MetaModelConst';
import { Package } from 'MM/model/packageableElements/domain/Package';

test(unit('Create valid and invalid packages on a root package'), () => {
  const _root = new Package(ROOT_PACKAGE_NAME.MAIN);
  const createPackage = (packageName: string): void => { Package.getOrCreatePackage(_root, packageName, true) };
  const validPackage = 'model::myPackage';
  createPackage(validPackage);
  const rootChildren = _root.children;
  expect(rootChildren.length).toBe(1);
  const modelPackage = rootChildren[0];
  expect(modelPackage.name).toBe('model');
  expect(modelPackage instanceof Package).toBeTrue();
  const modelPackageChildren = (modelPackage as Package).children;
  expect(modelPackageChildren.length).toBe(1);
  const invalidPackages = ['$implicit', 'model::$implicit::new', 'other::$implicit'];
  invalidPackages.forEach(invalid => expect(() => createPackage(invalid)).toThrowError(`Can't create package with reserved name '${invalid}'`));
});
