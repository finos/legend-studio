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
  hashLambda,
  isValidFullPath,
  isValidPath,
  isValidPathIdentifier,
  resolvePackagePathAndElementName,
} from '../MetaModelUtils';
import {
  losslessParse,
  losslessStringify,
  unitTest,
} from '@finos/legend-shared';
import { ROOT_PACKAGE_NAME } from '../MetaModelConst';
import { Package } from '../models/packageableElements/domain/Package';
import {
  ObjectInputData,
  ObjectInputType,
} from '../models/packageableElements/store/modelToModel/mapping/ObjectInputData';
import { Class } from '../models/packageableElements/domain/Class';
import { PackageableElementExplicitReference } from '../models/packageableElements/PackageableElementReference';

test(unitTest('Create valid and invalid packages on a root package'), () => {
  const _root = new Package(ROOT_PACKAGE_NAME.MAIN);
  const createPackage = (packagePath: string): void => {
    Package.getOrCreatePackage(_root, packagePath, true);
  };
  const validPackage = 'model::myPackage';
  createPackage(validPackage);
  const rootChildren = _root.children;
  expect(rootChildren.length).toBe(1);
  const modelPackage = rootChildren[0];
  expect(modelPackage.name).toBe('model');
  expect(modelPackage instanceof Package).toBe(true);
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

test(unitTest('Resolve package path and element name'), () => {
  expect(resolvePackagePathAndElementName('something::somethingElse')).toEqual([
    'something',
    'somethingElse',
  ]);
  expect(
    resolvePackagePathAndElementName('something::a::somethingElse'),
  ).toEqual(['something::a', 'somethingElse']);
  expect(resolvePackagePathAndElementName('b')).toEqual(['', 'b']);
  expect(
    resolvePackagePathAndElementName('something::b', 'somethingElse'),
  ).toEqual(['something', 'b']);
  expect(resolvePackagePathAndElementName('b', 'somethingElse')).toEqual([
    'somethingElse',
    'b',
  ]);
});

test(unitTest('Check valid path and path identifier'), () => {
  expect(isValidPathIdentifier('')).toBe(false);
  expect(isValidPathIdentifier('$')).toBe(false);
  expect(isValidPathIdentifier('asd')).toBe(true);
  expect(isValidPathIdentifier('asd$')).toBe(true);

  expect(isValidFullPath('')).toBe(false);
  expect(isValidFullPath('something')).toBe(false);
  expect(isValidFullPath('something::')).toBe(false);
  expect(isValidFullPath('::')).toBe(false);
  expect(isValidFullPath(':')).toBe(false);
  expect(isValidFullPath('$123')).toBe(false);
  expect(isValidFullPath('$123::something')).toBe(false);
  expect(isValidFullPath('something::something')).toBe(true);

  expect(isValidPath('')).toBe(false);
  expect(isValidPath('asdas')).toBe(true);
  expect(isValidPath('::')).toBe(false);
  expect(isValidPath(':')).toBe(false);
  expect(isValidPath(',')).toBe(false);
  expect(isValidPath('$123')).toBe(false);
  expect(isValidPath('$123::something')).toBe(false);
  expect(isValidPath('something::something')).toBe(true);
});

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
