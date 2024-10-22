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
import { guaranteeType } from '@finos/legend-shared';
import { unitTest } from '@finos/legend-shared/test';
import { Package } from '../../metamodel/pure/packageableElements/domain/Package.js';
import {
  getAllClassProperties,
  getClassProperty,
  getMilestoneTemporalStereotype,
  getOrCreatePackage,
} from '../DomainHelper.js';
import { TEST_DATA__Milestoning } from './TEST_DATA__Milestoning.js';
import type { Entity } from '@finos/legend-storage';
import { MILESTONING_STEREOTYPE } from '../../MetaModelConst.js';
import { TEST__getTestGraph } from '../../__test-utils__/GraphTestUtils.js';

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

test(
  unitTest('Class milestoning stereotypes should be identified properly'),
  async () => {
    const graph = await TEST__getTestGraph(TEST_DATA__Milestoning as Entity[]);
    expect(
      getMilestoneTemporalStereotype(graph.getClass('test::C'), graph),
    ).toBe(MILESTONING_STEREOTYPE.BUSINESS_TEMPORAL);
    expect(
      getMilestoneTemporalStereotype(graph.getClass('test::D'), graph),
    ).toBe(MILESTONING_STEREOTYPE.BUSINESS_TEMPORAL);
  },
);

test(unitTest('getClassProperties with clashing properties'), async () => {
  const graph = await TEST__getTestGraph(TEST_DATA__Milestoning as Entity[]);
  const properties = getAllClassProperties(graph.getClass('test::D'));

  expect(properties.length).toEqual(1);
  expect(properties[0]?.name).toEqual('z');
  expect(properties[0]?._OWNER.name).toEqual('D');
});

test(unitTest('getClassProperty with clashing properties'), async () => {
  const graph = await TEST__getTestGraph(TEST_DATA__Milestoning as Entity[]);
  const property = getClassProperty(graph.getClass('test::D'), 'z');

  expect(property._OWNER.name).toEqual('D');
});
