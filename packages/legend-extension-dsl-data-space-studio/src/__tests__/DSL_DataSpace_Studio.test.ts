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

import { expect, test, describe, beforeEach, jest } from '@jest/globals';
import { unitTest } from '@finos/legend-shared/test';
import { guaranteeType } from '@finos/legend-shared';
import {
  TEST__GraphManagerPluginManager,
  TEST__getTestGraphManagerState,
} from '@finos/legend-graph/test';
import {
  type GraphManagerState,
  type PackageableElementReference,
  type Mapping,
  type StereotypeExplicitReference,
  type TagExplicitReference,
  type PackageableRuntime,
  type PackageableElement,
  Package,
  DataProduct,
  InternalDataProductType,
  TaggedValue,
  NativeModelAccess,
  NativeModelExecutionContext,
  stub_RawLambda,
  InLineSampleQuery,
  PackageableElementSampleQuery,
} from '@finos/legend-graph';
import {
  DataSpace,
  DataSpaceExecutableTemplate,
  DataSpaceExecutionContext,
  DataSpacePackageableElementExecutable,
  DSL_DataSpace_GraphManagerPreset,
} from '@finos/legend-extension-dsl-data-space/graph';
import { convertDataSpaceToDataProduct } from '../stores/DataSpaceToDataProductConverter.js';

const pluginManager = new TEST__GraphManagerPluginManager();
pluginManager.usePresets([new DSL_DataSpace_GraphManagerPreset()]).install();

const createMockPackageableElement = (name: string, path: string) => ({
  valueForSerialization: path,
  _UUID: `${name}-uuid`,
  value: {
    name: name,
    path: path,
  },
});

const createTestDataSpace = (
  graphManagerState: GraphManagerState,
): DataSpace => {
  const dataSpace = new DataSpace('TestDataSpace');
  dataSpace.title = 'Test DataSpace Title';
  dataSpace.description = 'Test DataSpace Description';

  const testPackage = new Package('dataspace');
  graphManagerState.graph.addElement(testPackage, 'test');
  dataSpace.package = testPackage;

  const execContext = new DataSpaceExecutionContext();
  execContext.name = 'default';
  execContext.description = 'Default execution context';

  const mockMapping = createMockPackageableElement(
    'TestMapping',
    'test::mapping::TestMapping',
  );
  const mockRuntime = {
    valueForSerialization: 'test::runtime::TestRuntime',
    _UUID: 'test-uuid',
    value: {
      name: 'TestRuntime',
      path: 'test::runtime::TestRuntime',
    },
  };

  execContext.mapping = mockMapping as PackageableElementReference<Mapping>;
  execContext.defaultRuntime =
    mockRuntime as PackageableElementReference<PackageableRuntime>;

  const templateExecutable = new DataSpaceExecutableTemplate();
  templateExecutable.id = 'template1';
  templateExecutable.title = 'Template Executable ';
  templateExecutable.description = 'A template executable for testing';
  templateExecutable.executionContextKey = execContext.name;
  templateExecutable.query = stub_RawLambda();

  const packageableElementExecutable =
    new DataSpacePackageableElementExecutable();
  packageableElementExecutable.id = 'packageable1';
  packageableElementExecutable.title = 'Packageable Element Executable';
  packageableElementExecutable.description =
    'A packageable element executable for testing';
  packageableElementExecutable.executionContextKey = execContext.name;
  const mockQuery = createMockPackageableElement(
    'TestQuery',
    'test::query::TestQuery',
  );
  packageableElementExecutable.executable =
    mockQuery as PackageableElementReference<PackageableElement>;

  dataSpace.executionContexts = [execContext];
  dataSpace.defaultExecutionContext = execContext;
  dataSpace.executables = [templateExecutable, packageableElementExecutable];

  return dataSpace;
};

describe(unitTest('DataSpace to DataProduct Conversion Tests'), () => {
  let graphManagerState: GraphManagerState;
  let testDataSpace: DataSpace;

  beforeEach(async () => {
    graphManagerState = TEST__getTestGraphManagerState(pluginManager);
    await graphManagerState.graphManager.initialize({
      env: 'test',
      tabSize: 2,
      clientConfig: {},
    });
    await graphManagerState.initializeSystem();

    testDataSpace = createTestDataSpace(graphManagerState);
    graphManagerState.graph.addElement(
      testDataSpace,
      testDataSpace.package?.path,
    );
  });

  test('createDataProductFromDataSpace creates valid DataProduct', () => {
    const dataProduct = convertDataSpaceToDataProduct(testDataSpace);

    expect(dataProduct).toBeInstanceOf(DataProduct);
    expect(dataProduct.name).toBe('TestDataProduct');
    expect(dataProduct.title).toBe(testDataSpace.title);
    expect(dataProduct.description).toBe(testDataSpace.description);
    expect(dataProduct.type).toBeInstanceOf(InternalDataProductType);

    expect(dataProduct.accessPointGroups).toHaveLength(0);
    expect(dataProduct.nativeModelAccess).toBeDefined();

    const nativeModelAccess = guaranteeType(
      dataProduct.nativeModelAccess,
      NativeModelAccess,
    );
    expect(nativeModelAccess.defaultExecutionContext.key).toBe(
      testDataSpace.defaultExecutionContext.name,
    );
    expect(nativeModelAccess.featuredElements).toHaveLength(0);
    expect(nativeModelAccess.nativeModelExecutionContexts).toHaveLength(1);

    const nativeModelExecutionContext = guaranteeType(
      nativeModelAccess.nativeModelExecutionContexts[0],
      NativeModelExecutionContext,
    );
    const dataSpaceExecContext = guaranteeType(
      testDataSpace.executionContexts[0],
      DataSpaceExecutionContext,
    );
    expect(nativeModelExecutionContext.mapping).toBe(
      dataSpaceExecContext.mapping,
    );
    expect(nativeModelExecutionContext.runtime).toBe(
      dataSpaceExecContext.defaultRuntime,
    );
    expect(nativeModelExecutionContext.key).toBe(dataSpaceExecContext.name);

    expect(nativeModelAccess.sampleQueries).toHaveLength(2);
    expect(nativeModelAccess.sampleQueries[0]).toBeInstanceOf(
      InLineSampleQuery,
    );
    expect(nativeModelAccess.sampleQueries[1]).toBeInstanceOf(
      PackageableElementSampleQuery,
    );

    const inLineSampleQuery = guaranteeType(
      nativeModelAccess.sampleQueries[0],
      InLineSampleQuery,
    );

    const templateExecutable = guaranteeType(
      testDataSpace.executables?.[0],
      DataSpaceExecutableTemplate,
    );
    expect(inLineSampleQuery.id).toBe(templateExecutable.id);
    expect(inLineSampleQuery.title).toBe(templateExecutable.title);
    expect(inLineSampleQuery.description).toBe(templateExecutable.description);
    expect(inLineSampleQuery.executionContextKey).toBe(
      templateExecutable.executionContextKey,
    );
    expect(inLineSampleQuery.query).toBe(templateExecutable.query);

    const packageableElementSampleQuery = guaranteeType(
      nativeModelAccess.sampleQueries[1],
      PackageableElementSampleQuery,
    );

    const packageableElementExecutable = guaranteeType(
      testDataSpace.executables?.[1],
      DataSpacePackageableElementExecutable,
    );
    expect(packageableElementSampleQuery.id).toBe(
      packageableElementExecutable.id,
    );
    expect(packageableElementSampleQuery.title).toBe(
      packageableElementExecutable.title,
    );
    expect(packageableElementSampleQuery.description).toBe(
      packageableElementExecutable.description,
    );
    expect(packageableElementSampleQuery.executionContextKey).toBe(
      packageableElementExecutable.executionContextKey,
    );
    expect(packageableElementSampleQuery.query).toBe(
      packageableElementExecutable.executable,
    );
  });

  test('DataSpace conversion handles missing diagrams gracefully', () => {
    testDataSpace.diagrams = undefined;

    const dataProduct = convertDataSpaceToDataProduct(testDataSpace);
    const nativeModelAccess = guaranteeType(
      dataProduct.nativeModelAccess,
      NativeModelAccess,
    );

    expect(nativeModelAccess.diagrams).toHaveLength(0);
  });

  test('DataSpace conversion handles missing elements gracefully', () => {
    testDataSpace.elements = undefined;

    const dataProduct = convertDataSpaceToDataProduct(testDataSpace);
    const nativeModelAccess = guaranteeType(
      dataProduct.nativeModelAccess,
      NativeModelAccess,
    );

    expect(nativeModelAccess.featuredElements).toHaveLength(0);
  });

  test('DataSpace conversion with multiple execution contexts', () => {
    const secondExecContext = new DataSpaceExecutionContext();
    secondExecContext.name = 'second';
    const secondMapping = createMockPackageableElement(
      'SecondMapping',
      'test::mapping::SecondMapping',
    );
    secondExecContext.mapping =
      secondMapping as PackageableElementReference<Mapping>;
    secondExecContext.defaultRuntime =
      testDataSpace.defaultExecutionContext.defaultRuntime;

    testDataSpace.executionContexts.push(secondExecContext);

    const dataProduct = convertDataSpaceToDataProduct(testDataSpace);

    expect(dataProduct.nativeModelAccess).toBeDefined();

    const nativeModelAccess = guaranteeType(
      dataProduct.nativeModelAccess,
      NativeModelAccess,
    );
    expect(nativeModelAccess.defaultExecutionContext.key).toBe(
      testDataSpace.defaultExecutionContext.name,
    );
    expect(nativeModelAccess.featuredElements).toHaveLength(0);
    expect(nativeModelAccess.nativeModelExecutionContexts).toHaveLength(2);

    const firstNativeModelExecutionContext = guaranteeType(
      nativeModelAccess.nativeModelExecutionContexts[0],
      NativeModelExecutionContext,
    );
    const firstExecContext = guaranteeType(
      testDataSpace.executionContexts[0],
      DataSpaceExecutionContext,
    );
    expect(firstNativeModelExecutionContext.mapping).toBe(
      firstExecContext.mapping,
    );
    expect(firstNativeModelExecutionContext.runtime).toBe(
      firstExecContext.defaultRuntime,
    );
    expect(firstNativeModelExecutionContext.key).toBe(firstExecContext.name);

    const secondNativeModelExecutionContext = guaranteeType(
      nativeModelAccess.nativeModelExecutionContexts[1],
      NativeModelExecutionContext,
    );
    expect(secondNativeModelExecutionContext.mapping).toBe(
      secondExecContext.mapping,
    );
    expect(secondNativeModelExecutionContext.runtime).toBe(
      secondExecContext.defaultRuntime,
    );
    expect(secondNativeModelExecutionContext.key).toBe(secondExecContext.name);
  });

  test('convertDataspaceToDataProduct function performs complete conversion flow', async () => {
    const mockEditorStore = {
      graphManagerState: graphManagerState,
      tabManagerState: {
        closeTab: jest.fn(),
      },
      explorerTreeState: {
        build: jest.fn(() => Promise.resolve()),
      },
      applicationStore: {
        notificationService: {
          notifySuccess: jest.fn(),
        },
        alertUnhandledError: jest.fn(),
      },
    };

    const convertDataspaceToDataProduct = async () => {
      try {
        const dataProduct = convertDataSpaceToDataProduct(testDataSpace);

        mockEditorStore.graphManagerState.graph.addElement(
          dataProduct,
          testDataSpace.package?.path.replace(/dataspace/, 'dataproduct'),
        );

        mockEditorStore.graphManagerState.graph.deleteElement(testDataSpace);

        const dataSpacePackage = testDataSpace.package;
        if (dataSpacePackage && dataSpacePackage.children.length === 0) {
          mockEditorStore.graphManagerState.graph.deleteElement(
            dataSpacePackage,
          );
        }

        await mockEditorStore.explorerTreeState.build();

        mockEditorStore.tabManagerState.closeTab(testDataSpace);

        mockEditorStore.applicationStore.notificationService.notifySuccess(
          `Successfully converted DataSpace ${testDataSpace.name} to Data Product`,
        );
      } catch (error) {
        mockEditorStore.applicationStore.alertUnhandledError(error as Error);
      }
    };

    const originalDataSpacePath = testDataSpace.path;
    const originalPackagePath = testDataSpace.package?.path;

    expect(
      graphManagerState.graph.getNullableElement(originalDataSpacePath),
    ).toBe(testDataSpace);

    await convertDataspaceToDataProduct();

    expect(
      graphManagerState.graph.getNullableElement(originalDataSpacePath),
    ).toBeUndefined();

    const newPackagePath = originalPackagePath?.replace(
      /dataspace/,
      'dataproduct',
    );
    const createdDataProduct = graphManagerState.graph.getNullableElement(
      `${newPackagePath}::TestDataProduct`,
    );
    expect(createdDataProduct).toBeDefined();
    expect(createdDataProduct).toBeInstanceOf(DataProduct);

    expect(
      graphManagerState.graph.getNullableElement(originalPackagePath ?? ''),
    ).toBeUndefined();

    expect(mockEditorStore.explorerTreeState.build).toHaveBeenCalled();
    expect(mockEditorStore.tabManagerState.closeTab).toHaveBeenCalledWith(
      testDataSpace,
    );
    expect(
      mockEditorStore.applicationStore.notificationService.notifySuccess,
    ).toHaveBeenCalledWith(
      'Successfully converted DataSpace TestDataSpace to Data Product',
    );
  });

  test('Empty package cleanup after DataSpace removal', () => {
    const originalPackage = testDataSpace.package;
    const originalPackagePath = originalPackage?.path;

    graphManagerState.graph.deleteElement(testDataSpace);

    expect(originalPackage?.children).toHaveLength(0);

    if (originalPackage && originalPackage.children.length === 0) {
      graphManagerState.graph.deleteElement(originalPackage);
    }

    expect(
      graphManagerState.graph.getNullableElement(originalPackagePath ?? ''),
    ).toBeUndefined();
  });

  test('DataProduct preserves DataSpace stereotypes and tagged values', () => {
    const mockStereotype1 = {
      value: { name: 'stereotype1', value: 'stereotype1' },
    } as unknown as StereotypeExplicitReference;
    const mockStereotype2 = {
      value: { name: 'stereotype2', value: 'stereotype2' },
    } as unknown as StereotypeExplicitReference;
    testDataSpace.stereotypes = [mockStereotype1, mockStereotype2];
    const mockTag1 = {
      value: { name: 'tag1', value: 'tag1' },
    } as unknown as TagExplicitReference;
    const mockTag2 = {
      value: { name: 'tag2', value: 'tag2' },
    } as unknown as TagExplicitReference;
    const mockTaggedValue1 = new TaggedValue(mockTag1, 'value1');
    const mockTaggedValue2 = new TaggedValue(mockTag2, 'value2');
    testDataSpace.taggedValues = [mockTaggedValue1, mockTaggedValue2];
    const dataProduct = convertDataSpaceToDataProduct(testDataSpace);
    expect(dataProduct.stereotypes).toEqual(testDataSpace.stereotypes);
    expect(dataProduct.taggedValues).toEqual(testDataSpace.taggedValues);
  });
});
