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

import { describe, expect, test } from '@jest/globals';
import { resolve } from 'path';
import { createGraphManagerStateFromGrammar } from '../../utils/testUtils.js';
import { integrationTest } from '@finos/legend-shared/test';
import {
  type V1_ArtifactGenerationExtensionOutput,
  type V1_PureGraphManager,
  PackageableElementExplicitReference,
  stub_RawLambda,
  V1_ArtifactGenerationExtensionInput,
  V1_buildArtifactsByExtensionElement,
} from '@finos/legend-graph';
import {
  guaranteeNonNullable,
  guaranteeType,
  type PlainObject,
} from '@finos/legend-shared';
import {
  DataSpace,
  DataSpaceElementPointer,
  DSL_DataSpace_GraphManagerPreset,
  resolveUsableDataSpaceClasses,
} from '@finos/legend-extension-dsl-data-space/graph';
import {
  TEST__provideMockedQueryEditorStore,
  TEST_QUERY_NAME,
  TEST__setUpDataSpaceExistingQueryEditor,
} from '@finos/legend-application-query';
import { DSL_DataSpace_LegendApplicationPlugin } from '@finos/legend-extension-dsl-data-space/application';
import { ENGINE_TEST_SUPPORT__generateArtifacts } from '@finos/legend-graph/test';
import { QUERY_BUILDER_TEST_ID } from '@finos/legend-query-builder';
import { waitFor, getByText, fireEvent } from '@testing-library/dom';
import { act } from 'react';
import { DepotGeneration, StoredFileGeneration } from '@finos/legend-storage';

const V1_DATASPACE_ANALYTICS_ARTIFACT_EXTENSION_KEY = 'dataSpace-analytics';

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

  expect(expectedClasses.toSorted()).toEqual(
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
  expect(expectedClasses.toSorted()).toEqual(
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
  expect(expectedClasses.toSorted()).toEqual(
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
  expect(expectedClasses.toSorted()).toEqual(
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

  expect(expectedClasses.toSorted()).toEqual(
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

type ModelCoverageTestCase = [
  string,
  {
    dataspacePath: string;
    executionContext: string;
    classPath: string;
    mappedPropertyNames: string[];
    inputFileDir: string;
    inputFilePath: string;
  },
];

const MODEL_COVERAGE_CASES: ModelCoverageTestCase[] = [
  [
    'simple relational model with data product',
    {
      dataspacePath:
        'showcase::northwind::dataspace::NorthwindDataSpaceWithExecutables',
      executionContext: 'externally-public-PROD',
      classPath: 'showcase::northwind::model::Order',
      mappedPropertyNames: ['Id'],
      inputFileDir: 'model',
      inputFilePath: 'TEST_DATA_Dataspace-Executables.pure',
    },
  ],
  [
    'mapping analysis sample model',
    {
      dataspacePath: 'showcase::analytics::dataspace::SampleDataSpace',
      executionContext: 'externally-public-PROD',
      classPath: 'showcase::analytics::mapping::domain::Person',
      mappedPropertyNames: ['First Name'],
      inputFileDir: 'model',
      inputFilePath: 'TEST_DATA_Dataspace-MappingAnalysisSampleModel.pure',
    },
  ],
];

describe(
  integrationTest('Build minimal graph from data product artifacts'),
  () => {
    test.each(MODEL_COVERAGE_CASES)(
      '%s',
      async (
        testName: ModelCoverageTestCase[0],
        testCase: ModelCoverageTestCase[1],
      ) => {
        const {
          dataspacePath,
          executionContext,
          classPath,
          mappedPropertyNames,
          inputFileDir,
          inputFilePath,
        } = testCase;
        const graphManagerState = await createGraphManagerStateFromGrammar(
          resolve(__dirname, inputFileDir),
          inputFilePath,
        );
        const graphManager =
          graphManagerState.graphManager as V1_PureGraphManager;
        const input = new V1_ArtifactGenerationExtensionInput(
          graphManager.getFullGraphModelData(graphManagerState.graph),
          [dataspacePath],
        );
        const artifacts = V1_buildArtifactsByExtensionElement(
          (await ENGINE_TEST_SUPPORT__generateArtifacts(
            input,
          )) as unknown as V1_ArtifactGenerationExtensionOutput,
        );
        const dataspaceArtifacts = artifacts.values
          .filter(
            (artifact) =>
              artifact.extension ===
              V1_DATASPACE_ANALYTICS_ARTIFACT_EXTENSION_KEY,
          )
          .flatMap((artifact) =>
            artifact.artifactsByExtensionElements
              .filter(
                (e) =>
                  e.extension === V1_DATASPACE_ANALYTICS_ARTIFACT_EXTENSION_KEY,
              )
              .flatMap((e) => e.files),
          );
        const fileGens = dataspaceArtifacts.map((file) => {
          const storedFileGeneration = new StoredFileGeneration();
          storedFileGeneration.groupId = 'engine-test';
          storedFileGeneration.artifactId = 'test';
          storedFileGeneration.versionId = '1.0.0';
          storedFileGeneration.type =
            V1_DATASPACE_ANALYTICS_ARTIFACT_EXTENSION_KEY;
          storedFileGeneration.path = dataspacePath;
          const depotGeneration = new DepotGeneration();
          depotGeneration.content = file.content;
          depotGeneration.path = file.fileName;
          storedFileGeneration.file = depotGeneration;
          return storedFileGeneration;
        });
        const analyticsResult = JSON.parse(
          guaranteeNonNullable(
            fileGens.find((file) =>
              file.file.path.includes('AnalyticsResult.json'),
            )?.file.content,
            'fail to generate analytics result artifact',
          ),
        ) as PlainObject;
        const mockedQueryEditorStore = TEST__provideMockedQueryEditorStore({
          extraPlugins: [new DSL_DataSpace_LegendApplicationPlugin()],
          extraPresets: [new DSL_DataSpace_GraphManagerPreset()],
        });
        mockedQueryEditorStore.setExistingQueryName(TEST_QUERY_NAME);
        const { renderResult, queryBuilderState } =
          await TEST__setUpDataSpaceExistingQueryEditor(
            mockedQueryEditorStore,
            analyticsResult,
            dataspacePath,
            executionContext,
            stub_RawLambda(),
            [],
            true,
            fileGens.map((fileGen) => ({
              groupId: fileGen.groupId,
              artifactId: fileGen.artifactId,
              versionId: fileGen.versionId,
              type: fileGen.type,
              path: fileGen.path,
              file: {
                content: fileGen.file.content,
                path: fileGen.file.path,
              },
            })),
          );
        const _modelClass =
          queryBuilderState.graphManagerState.graph.getClass(classPath);
        await act(async () => {
          queryBuilderState.changeClass(_modelClass);
        });
        const explorerPanel = await waitFor(() =>
          renderResult.getByTestId(
            QUERY_BUILDER_TEST_ID.QUERY_BUILDER_EXPLORER,
          ),
        );
        await waitFor(() =>
          mappedPropertyNames.forEach((name) => getByText(explorerPanel, name)),
        );
        await act(async () => {
          fireEvent.click(renderResult.getByTitle('See more options'));
        });
        await act(async () => {
          fireEvent.click(renderResult.getByText('About Data Product'));
        });
        const aboutDataSpaceModal = await waitFor(() =>
          renderResult.getByRole('dialog'),
        );
        await waitFor(() => getByText(aboutDataSpaceModal, executionContext));
      },
    );
  },
);
