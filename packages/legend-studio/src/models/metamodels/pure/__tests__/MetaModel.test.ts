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

import { hashLambda } from '../../../MetaModelUtility';
import {
  losslessParse,
  losslessStringify,
  unitTest,
} from '@finos/legend-studio-shared';
import { ROOT_PACKAGE_NAME } from '../../../MetaModelConst';
import { Package } from '../model/packageableElements/domain/Package';
import {
  ObjectInputData,
  ObjectInputType,
} from '../model/packageableElements/store/modelToModel/mapping/ObjectInputData';
import { Class } from '../model/packageableElements/domain/Class';
import { PackageableElementExplicitReference } from '../model/packageableElements/PackageableElementReference';

test(unitTest('Create valid and invalid packages on a root package'), () => {
  const _root = new Package(ROOT_PACKAGE_NAME.MAIN);
  const createPackage = (packageName: string): void => {
    Package.getOrCreatePackage(_root, packageName, true);
  };
  const validPackage = 'model::myPackage';
  createPackage(validPackage);
  const rootChildren = _root.children;
  expect(rootChildren.length).toBe(1);
  const modelPackage = rootChildren[0];
  expect(modelPackage.name).toBe('model');
  expect(modelPackage instanceof Package).toBeTrue();
  const modelPackageChildren = (modelPackage as Package).children;
  expect(modelPackageChildren.length).toBe(1);
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

test(
  unitTest(
    'Lambda hash should ignore sourceInformation and ignore object properties order',
  ),
  () => {
    const lambda1 = {
      parameters: [{ a: 1 }, { b: 2 }],
      body: { a: 3 },
    };

    const lambda2 = {
      parameters: [{ a: 1 }, { b: 2, sourceInformation: {} }],
      body: {
        a: 3,
        sourceInformation: {},
      },
    };

    const lambda3 = {
      parameters: [{ b: 2 }, { a: 1 }],
      body: { a: 3 },
    };
    expect(hashLambda(lambda1.parameters, lambda1.body)).toEqual(
      hashLambda(lambda2.parameters, lambda2.body),
    );
    expect(hashLambda(lambda1.parameters, lambda1.body)).not.toEqual(
      hashLambda(lambda3.parameters, lambda3.body),
    );
  },
);

test(unitTest('JSON Object input data should be minified'), () => {
  const test1 = new ObjectInputData(
    PackageableElementExplicitReference.create(Class.createStub()),
    ObjectInputType.JSON,
    '{"a":1}',
  );

  const test2 = new ObjectInputData(
    PackageableElementExplicitReference.create(Class.createStub()),
    ObjectInputType.JSON,
    '{\n  "a":1\n}',
  );

  const test3 = new ObjectInputData(
    PackageableElementExplicitReference.create(Class.createStub()),
    ObjectInputType.JSON,
    '{\n  "a":1, \n "b" : {\n  "b1":"hello"\n} \n}',
  );

  expect(test1.data === losslessStringify(losslessParse(test1.data)));
  expect(test2.data === losslessStringify(losslessParse(test2.data)));
  expect(test3.data === losslessStringify(losslessParse(test3.data)));
});
