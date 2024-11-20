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

import { expect, test } from '@jest/globals';
import { resolve } from 'path';
import { createGraphManagerStateFromGrammar } from '../../utils/testUtils.js';
import { integrationTest } from '@finos/legend-shared/test';
import { PackageableElementExplicitReference } from '@finos/legend-graph';
import { guaranteeNonNullable, guaranteeType } from '@finos/legend-shared';
import {
  DataSpace,
  DataSpaceElementPointer,
  resolveUsableDataSpaceClasses,
} from '@finos/legend-extension-dsl-data-space/graph';

test(integrationTest('TEST_DATA_Dataspace-Executables'), async () => {
  const { modelFileDir, modelFilePath } = {
    modelFileDir: 'model',
    modelFilePath: 'TEST_DATA_Dataspace-Executables.pure',
  };
  const graphManagerState = await createGraphManagerStateFromGrammar(
    resolve(__dirname, modelFileDir),
    modelFilePath,
  );
  const graph = graphManagerState.graph;
  const element = graphManagerState.graph.getElement(
    'showcase::northwind::dataspace::NorthwindDataSpaceWithExecutables',
  );
  expect(element instanceof DataSpace).toEqual(true);
  const dataspace = guaranteeType(element, DataSpace);
  expect(dataspace.executables).toHaveLength(3);
  const defaultMapping = dataspace.defaultExecutionContext.mapping.value;
  expect(defaultMapping.path).toEqual(
    'showcase::northwind::mapping::NorthwindMapping',
  );
  let usableClasses = resolveUsableDataSpaceClasses(
    dataspace,
    defaultMapping,
    graphManagerState,
  );
  let expectedClasses = [
    'showcase::northwind::model::inventory::Product',
    'showcase::northwind::model::geography::SalesRegion',
    'showcase::northwind::model::crm::Employee',
    'showcase::northwind::model::geography::USState',
    'showcase::northwind::model::inventory::ProductCategory',
    'showcase::northwind::model::inventory::Supplier',
    'showcase::northwind::model::OrderLineItem',
    'showcase::northwind::model::crm::ShippingCompany',
    'showcase::northwind::model::crm::Customer',
    'showcase::northwind::model::geography::SalesTerritory',
    'showcase::northwind::model::Order',
  ];

  expect(expectedClasses.sort()).toEqual(
    usableClasses.map((e) => e.path).sort(),
  );
  // 1. include package
  const filterPackage = guaranteeNonNullable(
    graph.getNullablePackage('showcase::northwind::model::inventory'),
  );
  const elementPointer = new DataSpaceElementPointer();
  elementPointer.element =
    PackageableElementExplicitReference.create(filterPackage);
  dataspace.elements = [elementPointer];
  usableClasses = resolveUsableDataSpaceClasses(
    dataspace,
    defaultMapping,
    graphManagerState,
  );
  expectedClasses = [
    'showcase::northwind::model::inventory::Product',
    'showcase::northwind::model::inventory::ProductCategory',
    'showcase::northwind::model::inventory::Supplier',
  ];
  expect(expectedClasses.sort()).toEqual(
    usableClasses.map((e) => e.path).sort(),
  );
  // 2. include package and class
  const _moreClass = graphManagerState.graph.getClass(
    'showcase::northwind::model::geography::SalesTerritory',
  );
  const classPointer = new DataSpaceElementPointer();
  classPointer.element = PackageableElementExplicitReference.create(_moreClass);
  dataspace.elements.push(classPointer);
  expectedClasses.push('showcase::northwind::model::geography::SalesTerritory');
  usableClasses = resolveUsableDataSpaceClasses(
    dataspace,
    defaultMapping,
    graphManagerState,
  );
  expect(expectedClasses.sort()).toEqual(
    usableClasses.map((e) => e.path).sort(),
  );
  // 3. include package and exclude class
  classPointer.exclude = true;
  usableClasses = resolveUsableDataSpaceClasses(
    dataspace,
    defaultMapping,
    graphManagerState,
  );
  expectedClasses = [
    'showcase::northwind::model::inventory::Product',
    'showcase::northwind::model::inventory::ProductCategory',
    'showcase::northwind::model::inventory::Supplier',
  ];
  expect(expectedClasses.sort()).toEqual(
    usableClasses.map((e) => e.path).sort(),
  );
  // 4 filter by model package, then add a package included in the node as an exclude, then add a class as includes. We respect the more explicit declaration here.
  const modelPackage = guaranteeNonNullable(
    graph.getNullablePackage('showcase::northwind::model'),
  );
  const modelPackagePointer = new DataSpaceElementPointer();
  modelPackagePointer.element =
    PackageableElementExplicitReference.create(modelPackage);
  dataspace.elements = [modelPackagePointer];
  usableClasses = resolveUsableDataSpaceClasses(
    dataspace,
    defaultMapping,
    graphManagerState,
  );
  expectedClasses = [
    'showcase::northwind::model::inventory::Product',
    'showcase::northwind::model::geography::SalesRegion',
    'showcase::northwind::model::crm::Employee',
    'showcase::northwind::model::geography::USState',
    'showcase::northwind::model::inventory::ProductCategory',
    'showcase::northwind::model::inventory::Supplier',
    'showcase::northwind::model::OrderLineItem',
    'showcase::northwind::model::crm::ShippingCompany',
    'showcase::northwind::model::crm::Customer',
    'showcase::northwind::model::geography::SalesTerritory',
    'showcase::northwind::model::Order',
  ];

  expect(expectedClasses.sort()).toEqual(
    usableClasses.map((e) => e.path).sort(),
  );
  const inventoryPackage = guaranteeNonNullable(
    graph.getNullablePackage('showcase::northwind::model::inventory'),
  );
  const inventoryPackagePointer = new DataSpaceElementPointer();
  inventoryPackagePointer.element =
    PackageableElementExplicitReference.create(inventoryPackage);
  inventoryPackagePointer.exclude = true;
  dataspace.elements.push(inventoryPackagePointer);
  usableClasses = resolveUsableDataSpaceClasses(
    dataspace,
    defaultMapping,
    graphManagerState,
  );
  expect(usableClasses).toHaveLength(8);
  const productCategory = graphManagerState.graph.getClass(
    'showcase::northwind::model::inventory::ProductCategory',
  );
  const productCategoryPtr = new DataSpaceElementPointer();
  productCategoryPtr.element =
    PackageableElementExplicitReference.create(productCategory);
  dataspace.elements.push(productCategoryPtr);
  usableClasses = resolveUsableDataSpaceClasses(
    dataspace,
    defaultMapping,
    graphManagerState,
  );
  expect(usableClasses).toHaveLength(9);
});
