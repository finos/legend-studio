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
import {
  extractElementNameFromPath,
  fromElementPathToMappingElementId,
  matchFunctionName,
  isValidFullPath,
  isValidPath,
  isValidPathIdentifier,
  resolvePackagePathAndElementName,
  pruneSourceInformation,
} from '../MetaModelUtils.js';
import { parseLosslessJSON, stringifyLosslessJSON } from '@finos/legend-shared';
import { unitTest } from '@finos/legend-shared/test';
import {
  DEPRECATED__ObjectInputData,
  ObjectInputType,
} from '../metamodel/pure/packageableElements/mapping/DEPRECATED__MappingTest.js';
import { PackageableElementExplicitReference } from '../metamodel/pure/packageableElements/PackageableElementReference.js';
import { Class } from '../metamodel/pure/packageableElements/domain/Class.js';

test(unitTest('Source information should be pruned properly'), () => {
  expect(
    pruneSourceInformation({
      parameters: [{ a: 1 }, { b: 2, sourceInformation: {} }],
      body: {
        a: 3,
        sourceInformation: {
          nestedSourceInformation: {},
        },
        someSourceInformation: {},
        classSourceInformation: {},
        profileSourceInformation: {},
      },
    }),
  ).toEqual({
    parameters: [{ a: 1 }, { b: 2 }],
    body: { a: 3 },
  });
});

test(unitTest('JSON Object input data should be minified'), () => {
  const test1 = new DEPRECATED__ObjectInputData(
    PackageableElementExplicitReference.create(new Class('')),
    ObjectInputType.JSON,
    '{"a":1}',
  );

  const test2 = new DEPRECATED__ObjectInputData(
    PackageableElementExplicitReference.create(new Class('')),
    ObjectInputType.JSON,
    '{\n  "a":1\n}',
  );

  const test3 = new DEPRECATED__ObjectInputData(
    PackageableElementExplicitReference.create(new Class('')),
    ObjectInputType.JSON,
    '{\n  "a":1, \n "b" : {\n  "b1":"hello"\n} \n}',
  );

  expect(test1.data === stringifyLosslessJSON(parseLosslessJSON(test1.data)));
  expect(test2.data === stringifyLosslessJSON(parseLosslessJSON(test2.data)));
  expect(test3.data === stringifyLosslessJSON(parseLosslessJSON(test3.data)));
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
  expect(matchFunctionName('fnX', ['p1::p2::p3::fnX'])).toBe(true);
  expect(matchFunctionName('fnX', ['p1::p2::p3::fnX', 'p1::p2::p3::fnY'])).toBe(
    true,
  );
  expect(matchFunctionName('fnX', ['fnX'])).toBe(true);
  expect(
    matchFunctionName('p5::fnX', ['p1::p2::p3::fnX', 'p1::p2::p5::fnX']),
  ).toBe(false);
  expect(
    matchFunctionName('p3::fnX', ['p1::p2::p3::fnX', 'p2::p3::fnX', 'p2::fnY']),
  ).toBe(false);
  expect(matchFunctionName('fnY', ['fnX'])).toBe(false);
});

test(unitTest('Converts element path to mapping element default ID'), () => {
  expect(
    fromElementPathToMappingElementId(
      'meta::pure::mapping::modelToModel::test::shared::dest::Person',
    ),
  ).toBe('meta_pure_mapping_modelToModel_test_shared_dest_Person');
  expect(fromElementPathToMappingElementId('Person')).toBe('Person');
});
