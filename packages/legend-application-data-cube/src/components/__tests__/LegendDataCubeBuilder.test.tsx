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
  createMock,
  createSpy,
  integrationTest,
} from '@finos/legend-shared/test';
import { expect, jest, test } from '@jest/globals';
import {
  findByText,
  fireEvent,
  getAllByTitle,
  getByRole,
  getByText,
  queryByText,
  screen,
  waitFor,
} from '@testing-library/dom';
import {
  TEST__provideMockedLegendDataCubeBuilderStore,
  TEST__setUpDataCubeBuilder,
} from '../__test-utils__/LegendDataCubeStoreTestUtils.js';
import {
  NetworkClientError,
  type PlainObject,
  guaranteeNonNullable,
  guaranteeType,
  isNonNullable,
} from '@finos/legend-shared';
import { MockedMonacoEditorAPI } from '@finos/legend-lego/code-editor/test';
import {
  type V1_Lambda,
  PersistentDataCube,
  V1_CFloat,
  V1_CInteger,
  V1_CString,
  V1_Query,
} from '@finos/legend-graph';
import depotEntities from './TEST_DATA__DSL_DataSpace_Entities.json' with { type: 'json' };
import { LegendDataCubePluginManager } from '../../application/LegendDataCubePluginManager.js';
import {
  ApplicationStore,
  type VersionReleaseNotes,
} from '@finos/legend-application';
import { TEST__getTestLegendDataCubeApplicationConfig } from '../../application/__test-utils__/LegendDataCubeApplicationTestUtils.js';
import { ENGINE_TEST_SUPPORT__JSONToGrammar_lambda } from '@finos/legend-graph/test';
import { LegendQueryDataCubeSource } from '../../stores/model/LegendQueryDataCubeSource.js';

// Mock the LegendDataCubeDuckDBEngine module because it causes
// problems when running in the jest environment.
jest.mock('../../stores/LegendDataCubeDuckDBEngine', () => {
  return {
    LegendDataCubeDuckDBEngine: jest.fn(() => ({
      initialize: jest.fn(),
      dispose: jest.fn(),
    })),
  };
});

test(
  integrationTest('Load DataCube window appears on first load'),
  async () => {
    const mockedLegendDataCubeBuilderStore =
      await TEST__provideMockedLegendDataCubeBuilderStore();
    await TEST__setUpDataCubeBuilder(mockedLegendDataCubeBuilderStore);
    await screen.findByPlaceholderText('Search for DataCube(s) by name or ID');
  },
);

test(
  integrationTest('New DataCube window appears on button click'),
  async () => {
    const mockedLegendDataCubeBuilderStore =
      await TEST__provideMockedLegendDataCubeBuilderStore();
    await TEST__setUpDataCubeBuilder(mockedLegendDataCubeBuilderStore);
    await screen.findByPlaceholderText('Search for DataCube(s) by name or ID');
    fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }));
    fireEvent.click(
      guaranteeNonNullable(
        (await screen.findAllByRole('button', { name: 'New DataCube' }))[0],
      ),
    );
    await screen.findByText('Choose Source Type:');
  },
);

test(integrationTest('Loads DataCube from Legend Query'), async () => {
  MockedMonacoEditorAPI.remeasureFonts.mockReturnValue(undefined);

  const mockDataCubeId = 'test-data-cube-id';
  const mockDataCube: PersistentDataCube =
    PersistentDataCube.serialization.fromJson({
      id: mockDataCubeId,
      name: `${mockDataCubeId}-name`,
      description: undefined,
      content: {
        query: `select(~[Id, 'Case Type'])`,
        source: {
          queryId: `${mockDataCubeId}-query-id`,
          _type: 'legendQuery',
        },
        configuration: {
          name: `${mockDataCubeId}-query-name`,
          columns: [
            { name: 'Id', type: 'Integer' },
            { name: 'Case Type', type: 'String' },
          ],
        },
      },
    });
  const mockQuery: V1_Query = V1_Query.serialization.fromJson({
    name: `${mockDataCubeId}-query-name`,
    id: `${mockDataCubeId}-query-id`,
    versionId: 'latest',
    groupId: 'com.legend',
    artifactId: 'test-project',
    content: `|domain::COVIDData.all()->project(~[Id:x|$x.id, 'Case Type':x|$x.caseType])`,
    executionContext: {
      dataSpacePath: 'domain::COVIDDatapace',
      executionKey: 'dummyContext',
      _type: 'dataSpaceExecutionContext',
    },
  });
  const mockedLegendDataCubeBuilderStore =
    await TEST__provideMockedLegendDataCubeBuilderStore();
  await TEST__setUpDataCubeBuilder(
    guaranteeNonNullable(mockedLegendDataCubeBuilderStore),
    mockDataCube,
    mockQuery,
    depotEntities,
  );
  await screen.findByText('test-data-cube-id-query-name');
  expect(
    (await screen.findAllByText('Id', {}, { timeout: 10000 })).length,
  ).toBeGreaterThanOrEqual(1);
  await screen.findByText('Case Type', {}, { timeout: 10000 });
  await screen.findByText('1', {}, { timeout: 10000 });
  await screen.findByText('Confirmed', {}, { timeout: 10000 });
  await screen.findByText('2', {}, { timeout: 10000 });
  await screen.findByText('Active', {}, { timeout: 10000 });
});

test(
  integrationTest('Loads DataCube from Legend Query with multi-line lambda'),
  async () => {
    MockedMonacoEditorAPI.remeasureFonts.mockReturnValue(undefined);

    const mockDataCubeId = 'test-data-cube-id';
    const mockDataCube: PersistentDataCube =
      PersistentDataCube.serialization.fromJson({
        id: mockDataCubeId,
        name: `${mockDataCubeId}-name`,
        description: undefined,
        content: {
          query: `select(~[Id, 'Case Type'])`,
          source: {
            queryId: `${mockDataCubeId}-query-id`,
            _type: 'legendQuery',
          },
          configuration: {
            name: `${mockDataCubeId}-query-name`,
            columns: [
              { name: 'Id', type: 'Integer' },
              { name: 'Case Type', type: 'String' },
            ],
          },
        },
      });
    const mockQuery: V1_Query = V1_Query.serialization.fromJson({
      name: `${mockDataCubeId}-query-name`,
      id: `${mockDataCubeId}-query-id`,
      versionId: 'latest',
      groupId: 'com.legend',
      artifactId: 'test-project',
      content: `{|let date = now(); domain::COVIDData.all()->project(~[Id:x|$x.id, 'Case Type':x|$x.caseType]);}`,
      executionContext: {
        dataSpacePath: 'domain::COVIDDatapace',
        executionKey: 'dummyContext',
        _type: 'dataSpaceExecutionContext',
      },
    });
    const mockedLegendDataCubeBuilderStore =
      await TEST__provideMockedLegendDataCubeBuilderStore();

    await TEST__setUpDataCubeBuilder(
      mockedLegendDataCubeBuilderStore,
      mockDataCube,
      mockQuery,
      depotEntities,
    );

    // Verify grid renders
    await screen.findByText('test-data-cube-id-query-name');
    expect(
      (await screen.findAllByText('Id', {}, { timeout: 10000 })).length,
    ).toBeGreaterThanOrEqual(1);
    await screen.findByText('Case Type', {}, { timeout: 10000 });
    await screen.findByText('1', {}, { timeout: 10000 });
    await screen.findByText('Confirmed', {}, { timeout: 10000 });
    await screen.findByText('2', {}, { timeout: 10000 });
    await screen.findByText('Active', {}, { timeout: 10000 });

    // Verify runQuery was called with correct lambda
    const runQueryCall = guaranteeNonNullable(
      (
        mockedLegendDataCubeBuilderStore.engineServerClient
          .runQuery as unknown as jest.SpiedFunction<
          typeof mockedLegendDataCubeBuilderStore.engineServerClient.runQuery
        >
      ).mock.lastCall,
    );
    const lambdaGrammar = await ENGINE_TEST_SUPPORT__JSONToGrammar_lambda(
      runQueryCall[0].function as PlainObject<V1_Lambda>,
    );
    expect(lambdaGrammar).toBe(
      "{|\nlet date = now();\ndomain::COVIDData.all()->project(~[Id:x|$x.id, 'Case Type':x|$x.caseType])->select(~[Id, 'Case Type'])->slice(0, 500)->meta::pure::mapping::from(mapping::CovidDataMapping, runtime::H2Runtime);\n}",
    );
  },
);

test(integrationTest('Loads DataCube from FreeformTDSExpression'), async () => {
  MockedMonacoEditorAPI.remeasureFonts.mockReturnValue(undefined);

  const testDataSetupSqls =
    '[\'DROP TABLE IF EXISTS COVID_DATA;CREATE TABLE COVID_DATA(ID INT PRIMARY KEY,FIPS VARCHAR(200),DATE DATE,CASE_TYPE VARCHAR(200),CASES FLOAT,LAST_REPORTED_FLAG BIT);INSERT INTO COVID_DATA VALUES(1, "1", "2021-04-01", "Confirmed", 405.34343, 0);INSERT INTO COVID_DATA VALUES(2, "2", "2021-05-01", "Active", 290.2332233333, 1);INSERT INTO COVID_DATA VALUES(3, "3", "2021-08-01", "Active", 20.2332233333, 1);\']';

  const model = {
    _type: 'text',
    code: `###Runtime\nRuntime H2::Runtime\n{\n  mappings: [];\n  connections: [\nH2::Database: [\n  connection_1: H2::Connection\n]\n  ];\n}\n###Connection\nRelationalDatabaseConnection H2::Connection\n{\n  store: H2::Database;\n  type: H2;\n  specification: LocalH2\n  {\ntestDataSetupSqls: ${testDataSetupSqls};\n  };\n  auth: DefaultH2;\n}\n###Relational\nDatabase H2::Database (\n  Schema default (\nTable COVID_DATA (\n  ID INT,\n  FIPS VARCHAR(200),\n  DATE DATE,\n  CASE_TYPE VARCHAR(200),\nCASES FLOAT,\nLAST_REPORTED_FLAG BIT\n)\n)\n)\n`,
  };
  const mockDataCubeId = 'test-freeform-tds-datacube-id';
  const mockDataCube: PersistentDataCube =
    PersistentDataCube.serialization.fromJson({
      id: mockDataCubeId,
      name: `${mockDataCubeId}-name`,
      description: undefined,
      content: {
        query: `select(~[ID])`,
        source: {
          _type: 'freeformTDSExpression',
          query: `#>{H2::Database.COVID_DATA}#->select(~[ID])->limit(2)`,
          runtime: 'H2::Connection',
          mapping: '',
          model,
        },
        configuration: {
          name: `${mockDataCubeId}-freeform-query-name`,
          columns: [{ name: 'ID', type: 'Integer' }],
        },
      },
    });

  const mockedLegendDataCubeBuilderStore =
    await TEST__provideMockedLegendDataCubeBuilderStore();
  await TEST__setUpDataCubeBuilder(
    guaranteeNonNullable(mockedLegendDataCubeBuilderStore),
    mockDataCube,
    undefined,
    depotEntities,
  );

  await screen.findByText('test-freeform-tds-datacube-id-freeform-query-name');
  expect(
    (await screen.findAllByText('ID', {}, { timeout: 10000 })).length,
  ).toBeGreaterThanOrEqual(1);
});

test(
  integrationTest(
    'Automatically converts TDS query to Relation query when loading DataCube from Legend Query',
  ),
  async () => {
    MockedMonacoEditorAPI.remeasureFonts.mockReturnValue(undefined);

    const mockDataCubeId = 'test-data-cube-id';
    const mockDataCube: PersistentDataCube =
      PersistentDataCube.serialization.fromJson({
        id: mockDataCubeId,
        name: `${mockDataCubeId}-name`,
        description: undefined,
        content: {
          query: `select(~[Id, 'Case Type'])`,
          source: {
            queryId: `${mockDataCubeId}-query-id`,
            _type: 'legendQuery',
          },
          configuration: {
            name: `${mockDataCubeId}-query-name`,
            columns: [
              { name: 'Id', type: 'Integer' },
              { name: 'Case Type', type: 'String' },
            ],
          },
        },
      });
    const mockQuery: V1_Query = V1_Query.serialization.fromJson({
      name: `${mockDataCubeId}-query-name`,
      id: `${mockDataCubeId}-query-id`,
      versionId: 'latest',
      groupId: 'com.legend',
      artifactId: 'test-project',
      content: `|domain::COVIDData.all()->project([x|$x.id,x|$x.caseType],['Id','Case Type'])`,
      executionContext: {
        dataSpacePath: 'domain::COVIDDatapace',
        executionKey: 'dummyContext',
        _type: 'dataSpaceExecutionContext',
      },
    });
    const mockedLegendDataCubeBuilderStore =
      await TEST__provideMockedLegendDataCubeBuilderStore();

    await TEST__setUpDataCubeBuilder(
      mockedLegendDataCubeBuilderStore,
      mockDataCube,
      mockQuery,
      depotEntities,
    );

    // Verify grid renders
    await screen.findByText(
      'test-data-cube-id-query-name',
      {},
      { timeout: 10000 },
    );
    expect(
      (await screen.findAllByText('Id', {}, { timeout: 10000 })).length,
    ).toBeGreaterThanOrEqual(1);
    await screen.findByText('Case Type', {}, { timeout: 10000 });
    await screen.findByText('1', {}, { timeout: 10000 });
    await screen.findByText('Confirmed', {}, { timeout: 10000 });
    await screen.findByText('2', {}, { timeout: 10000 });
    await screen.findByText('Active', {}, { timeout: 10000 });

    // Verify runQuery was called with correct lambda
    const runQueryCall = guaranteeNonNullable(
      (
        mockedLegendDataCubeBuilderStore.engineServerClient
          .runQuery as unknown as jest.SpiedFunction<
          typeof mockedLegendDataCubeBuilderStore.engineServerClient.runQuery
        >
      ).mock.lastCall,
    );
    const lambdaGrammar = await ENGINE_TEST_SUPPORT__JSONToGrammar_lambda(
      runQueryCall[0].function as PlainObject<V1_Lambda>,
    );
    expect(lambdaGrammar).toBe(
      "|domain::COVIDData.all()->project(~[Id:x: domain::COVIDData[1]|$x.id, 'Case Type':x: domain::COVIDData[1]|$x.caseType])->select(~[Id, 'Case Type'])->slice(0, 500)->meta::pure::mapping::from(mapping::CovidDataMapping, runtime::H2Runtime)",
    );
  },
);

// ----------------- PARAMETER EDITING TESTS -----------------

test(
  integrationTest(
    'DataCube with LegendQueryDataCubeSource shows parameters in title bar and allows editing parameters on click',
  ),
  async () => {
    MockedMonacoEditorAPI.remeasureFonts.mockReturnValue(undefined);

    const mockDataCubeId = 'test-data-cube-id';
    const mockDataCube: PersistentDataCube =
      PersistentDataCube.serialization.fromJson({
        id: mockDataCubeId,
        name: `${mockDataCubeId}-name`,
        description: undefined,
        content: {
          query: `select(~[Id, 'Case Type'])`,
          source: {
            queryId: `${mockDataCubeId}-query-id`,
            parameterValues: [
              [
                '{"_type": "var", "genericType": {"rawType": {"_type": "packageableType", "fullPath": "Integer"}}, "multiplicity": {"lowerBound": 1, "upperBound": 1}, "name": "minId"}',
                '{"_type": "integer", "value": 1}',
              ],
            ],
            _type: 'legendQuery',
          },
          configuration: {
            name: `${mockDataCubeId}-query-name`,
            columns: [
              { name: 'Id', type: 'Integer' },
              { name: 'Case Type', type: 'String' },
            ],
          },
        },
      });
    const mockQuery: V1_Query = V1_Query.serialization.fromJson({
      name: `${mockDataCubeId}-query-name`,
      id: `${mockDataCubeId}-query-id`,
      versionId: 'latest',
      groupId: 'com.legend',
      artifactId: 'test-project',
      content: `{minId: Integer[1]|domain::COVIDData.all()->filter(x|$x.id >= $minId)->project(~[Id:x|$x.id, 'Case Type':x|$x.caseType])}`,
      executionContext: {
        dataSpacePath: 'domain::COVIDDatapace',
        executionKey: 'dummyContext',
        _type: 'dataSpaceExecutionContext',
      },
    });
    const mockedLegendDataCubeBuilderStore =
      await TEST__provideMockedLegendDataCubeBuilderStore();
    await TEST__setUpDataCubeBuilder(
      guaranteeNonNullable(mockedLegendDataCubeBuilderStore),
      mockDataCube,
      mockQuery,
      depotEntities,
    );

    // Test that initial query loads correctly
    await screen.findByText('test-data-cube-id-query-name');
    expect(
      (await screen.findAllByText('Id', {}, { timeout: 10000 })).length,
    ).toBeGreaterThanOrEqual(1);
    await screen.findByText('Case Type', {}, { timeout: 10000 });
    await screen.findByText('1', {}, { timeout: 10000 });
    await screen.findByText('Confirmed', {}, { timeout: 10000 });
    await screen.findByText('2', {}, { timeout: 10000 });
    await screen.findByText('Active', {}, { timeout: 10000 });

    // Change parameter value
    await screen.findByText('Parameters:');
    const paramButton = await screen.findByText('minId');
    fireEvent.click(paramButton);
    await screen.findByText('DataCube Source');
    const valueSpecEditorInput = await screen.findByDisplayValue('1');
    fireEvent.change(valueSpecEditorInput, {
      target: { value: '2' },
    });
    fireEvent.blur(valueSpecEditorInput);
    const updateButton = await screen.findByRole('button', {
      name: 'Update Query Parameters',
    });
    fireEvent.click(updateButton);

    // Test that update button is disabled after click
    expect(updateButton.hasAttribute('disabled')).toBe(true);

    // Test that parameter value is updated
    await waitFor(
      () =>
        expect(
          screen.queryByRole('button', { name: 'Update Query Parameters' }),
        ).toBeNull(),
      { timeout: 10000 },
    );
    await waitFor(() =>
      expect(
        mockedLegendDataCubeBuilderStore.builder?.source instanceof
          LegendQueryDataCubeSource,
      ).toBe(true),
    );
    expect(
      (
        mockedLegendDataCubeBuilderStore.builder
          ?.source as LegendQueryDataCubeSource
      ).parameterValues,
    ).toHaveLength(1);
    expect(
      (
        mockedLegendDataCubeBuilderStore.builder
          ?.source as LegendQueryDataCubeSource
      ).parameterValues[0]?.valueSpec instanceof V1_CInteger,
    ).toBe(true);
    expect(
      (
        mockedLegendDataCubeBuilderStore.builder
          ?.source as LegendQueryDataCubeSource
      ).parameterValues[0]?.valueSpec instanceof V1_CInteger,
    ).toBe(true);
    expect(
      (
        (
          mockedLegendDataCubeBuilderStore.builder
            ?.source as LegendQueryDataCubeSource
        ).parameterValues[0]?.valueSpec as V1_CInteger
      ).value,
    ).toBe(2);

    // Test that query executes with updated paramter value
    expect(
      (await screen.findAllByText('Id', {}, { timeout: 10000 })).length,
    ).toBeGreaterThanOrEqual(1);
    await screen.findByText('Case Type', {}, { timeout: 10000 });
    expect(screen.queryByText('1')).toBeNull();
    expect(screen.queryByText('Confirmed')).toBeNull();
    await screen.findByText('2', {}, { timeout: 10000 });
    await screen.findByText('Active', {}, { timeout: 10000 });
  },
);

test(
  integrationTest(
    'DataCube with LegendQueryDataCubeSource disables Update Query Parameters button if parameters are invalid',
  ),
  async () => {
    MockedMonacoEditorAPI.remeasureFonts.mockReturnValue(undefined);

    const mockDataCubeId = 'test-data-cube-id';
    const mockDataCube: PersistentDataCube =
      PersistentDataCube.serialization.fromJson({
        id: mockDataCubeId,
        name: `${mockDataCubeId}-name`,
        description: undefined,
        content: {
          query: `select(~[Id, 'Case Type'])`,
          source: {
            queryId: `${mockDataCubeId}-query-id`,
            parameterValues: [
              [
                '{"_type": "var", "genericType": {"rawType": {"_type": "packageableType", "fullPath": "String"}}, "multiplicity": {"lowerBound": 1, "upperBound": 1}, "name": "searchString"}',
                '{"_type": "string", "value": "testValue"}',
              ],
            ],
            _type: 'legendQuery',
          },
          configuration: {
            name: `${mockDataCubeId}-query-name`,
            columns: [
              { name: 'Id', type: 'Integer' },
              { name: 'Case Type', type: 'String' },
            ],
          },
        },
      });
    const mockQuery: V1_Query = V1_Query.serialization.fromJson({
      name: `${mockDataCubeId}-query-name`,
      id: `${mockDataCubeId}-query-id`,
      versionId: 'latest',
      groupId: 'com.legend',
      artifactId: 'test-project',
      content: `{searchString: String[1]|domain::COVIDData.all()->filter(x|$x.caseType == $searchString)->project(~[Id:x|$x.id, 'Case Type':x|$x.caseType])}`,
      executionContext: {
        dataSpacePath: 'domain::COVIDDatapace',
        executionKey: 'dummyContext',
        _type: 'dataSpaceExecutionContext',
      },
    });
    const mockedLegendDataCubeBuilderStore =
      await TEST__provideMockedLegendDataCubeBuilderStore();
    await TEST__setUpDataCubeBuilder(
      guaranteeNonNullable(mockedLegendDataCubeBuilderStore),
      mockDataCube,
      mockQuery,
      depotEntities,
    );

    // Test that initial query loads correctly
    await screen.findByText('test-data-cube-id-query-name');

    // Change parameter value to invalid value
    await screen.findByText('Parameters:');
    const paramButton = await screen.findByText('searchString');
    fireEvent.click(paramButton);
    await screen.findByText('DataCube Source');
    const valueSpecEditorInput = await screen.findByDisplayValue('testValue');
    fireEvent.change(valueSpecEditorInput, {
      target: { value: '' },
    });
    fireEvent.blur(valueSpecEditorInput);
    await screen.findByPlaceholderText('(empty)');

    // Test that button is disabled
    expect(
      (
        await screen.findByRole('button', { name: 'Update Query Parameters' })
      ).hasAttribute('disabled'),
    ).toBe(true);
  },
);

test(
  integrationTest(
    "DataCube with LegendQueryDataCubeSource doesn't change parameters when cancel button is clicked",
  ),
  async () => {
    MockedMonacoEditorAPI.remeasureFonts.mockReturnValue(undefined);

    const mockDataCubeId = 'test-data-cube-id';
    const mockDataCube: PersistentDataCube =
      PersistentDataCube.serialization.fromJson({
        id: mockDataCubeId,
        name: `${mockDataCubeId}-name`,
        description: undefined,
        content: {
          query: `select(~[Id, 'Case Type'])`,
          source: {
            queryId: `${mockDataCubeId}-query-id`,
            parameterValues: [
              [
                '{"_type": "var", "genericType": {"rawType": {"_type": "packageableType", "fullPath": "Integer"}}, "multiplicity": {"lowerBound": 1, "upperBound": 1}, "name": "minId"}',
                '{"_type": "integer", "value": 1}',
              ],
            ],
            _type: 'legendQuery',
          },
          configuration: {
            name: `${mockDataCubeId}-query-name`,
            columns: [
              { name: 'Id', type: 'Integer' },
              { name: 'Case Type', type: 'String' },
            ],
          },
        },
      });
    const mockQuery: V1_Query = V1_Query.serialization.fromJson({
      name: `${mockDataCubeId}-query-name`,
      id: `${mockDataCubeId}-query-id`,
      versionId: 'latest',
      groupId: 'com.legend',
      artifactId: 'test-project',
      content: `{minId: Integer[1]|domain::COVIDData.all()->filter(x|$x.id >= $minId)->project(~[Id:x|$x.id, 'Case Type':x|$x.caseType])}`,
      executionContext: {
        dataSpacePath: 'domain::COVIDDatapace',
        executionKey: 'dummyContext',
        _type: 'dataSpaceExecutionContext',
      },
    });
    const mockedLegendDataCubeBuilderStore =
      await TEST__provideMockedLegendDataCubeBuilderStore();
    await TEST__setUpDataCubeBuilder(
      guaranteeNonNullable(mockedLegendDataCubeBuilderStore),
      mockDataCube,
      mockQuery,
      depotEntities,
    );

    // Test that initial query loads correctly
    await screen.findByText('test-data-cube-id-query-name');
    expect(
      (await screen.findAllByText('Id', {}, { timeout: 10000 })).length,
    ).toBeGreaterThanOrEqual(1);
    await screen.findByText('Case Type', {}, { timeout: 10000 });
    await screen.findByText('1', {}, { timeout: 10000 });
    await screen.findByText('Confirmed', {}, { timeout: 10000 });
    await screen.findByText('2', {}, { timeout: 10000 });
    await screen.findByText('Active', {}, { timeout: 10000 });

    // Change parameter value
    await screen.findByText('Parameters:');
    const paramButton = await screen.findByText('minId');
    fireEvent.click(paramButton);
    await screen.findByText('DataCube Source');
    const valueSpecEditorInput = await screen.findByDisplayValue('1');
    fireEvent.change(valueSpecEditorInput, {
      target: { value: '2' },
    });
    fireEvent.blur(valueSpecEditorInput);
    await screen.findByDisplayValue('2');

    // Click cancel
    fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }));

    // Test that parameter value is not updated
    await waitFor(() =>
      expect(
        screen.queryByRole('button', { name: 'Update Query Parameters' }),
      ).toBeNull(),
    );
    await waitFor(() =>
      expect(
        mockedLegendDataCubeBuilderStore.builder?.source instanceof
          LegendQueryDataCubeSource,
      ).toBe(true),
    );
    expect(
      (
        mockedLegendDataCubeBuilderStore.builder
          ?.source as LegendQueryDataCubeSource
      ).parameterValues,
    ).toHaveLength(1);
    expect(
      (
        mockedLegendDataCubeBuilderStore.builder
          ?.source as LegendQueryDataCubeSource
      ).parameterValues[0]?.valueSpec instanceof V1_CInteger,
    ).toBe(true);
    expect(
      (
        mockedLegendDataCubeBuilderStore.builder
          ?.source as LegendQueryDataCubeSource
      ).parameterValues[0]?.valueSpec instanceof V1_CInteger,
    ).toBe(true);
    expect(
      (
        (
          mockedLegendDataCubeBuilderStore.builder
            ?.source as LegendQueryDataCubeSource
        ).parameterValues[0]?.valueSpec as V1_CInteger
      ).value,
    ).toBe(1);

    // Test that re-opening parameter editor panel resets the editor to the current parameter value
    fireEvent.click(paramButton);
    await screen.findByText('DataCube Source');
    await screen.findByDisplayValue('1');
    expect(screen.queryByDisplayValue('2')).toBeNull();
  },
);

test(
  integrationTest(
    'DataCube uses raw source parameter value if name and type matches query lambda parameter',
  ),
  async () => {
    MockedMonacoEditorAPI.remeasureFonts.mockReturnValue(undefined);

    const mockDataCubeId = 'test-data-cube-id';
    const mockDataCube: PersistentDataCube =
      PersistentDataCube.serialization.fromJson({
        id: mockDataCubeId,
        name: `${mockDataCubeId}-name`,
        description: undefined,
        content: {
          query: `select(~[Id, 'Case Type'])`,
          source: {
            queryId: `${mockDataCubeId}-query-id`,
            parameterValues: [
              [
                '{"_type": "var", "genericType": {"rawType": {"_type": "packageableType", "fullPath": "Integer"}}, "multiplicity": {"lowerBound": 1, "upperBound": 1}, "name": "minId"}',
                '{"_type": "integer", "value": 24}',
              ],
            ],
            _type: 'legendQuery',
          },
          configuration: {
            name: `${mockDataCubeId}-query-name`,
            columns: [
              { name: 'Id', type: 'Integer' },
              { name: 'Case Type', type: 'String' },
            ],
          },
        },
      });
    const mockQuery: V1_Query = V1_Query.serialization.fromJson({
      name: `${mockDataCubeId}-query-name`,
      id: `${mockDataCubeId}-query-id`,
      versionId: 'latest',
      groupId: 'com.legend',
      artifactId: 'test-project',
      content: `{minId: Integer[1]|domain::COVIDData.all()->filter(x|$x.id >= $minId)->project(~[Id:x|$x.id, 'Case Type':x|$x.caseType])}`,
      defaultParameterValues: [{ name: 'minId', content: '5' }],
      executionContext: {
        dataSpacePath: 'domain::COVIDDatapace',
        executionKey: 'dummyContext',
        _type: 'dataSpaceExecutionContext',
      },
    });
    const mockedLegendDataCubeBuilderStore =
      await TEST__provideMockedLegendDataCubeBuilderStore();
    await TEST__setUpDataCubeBuilder(
      guaranteeNonNullable(mockedLegendDataCubeBuilderStore),
      mockDataCube,
      mockQuery,
      depotEntities,
    );

    // Test that parameter value from raw source is used
    await screen.findByText('test-data-cube-id-query-name');
    await screen.findByText('Parameters:');
    await screen.findByText('minId');
    await screen.findByText('24');

    // Teset that parameter value has the correct name, type, and value
    const source = guaranteeType(
      mockedLegendDataCubeBuilderStore.builder?.source,
      LegendQueryDataCubeSource,
    );
    expect(source.parameterValues[0]?.variable?.name).toBe('minId');
    const parameterValue = guaranteeType(
      source.parameterValues[0]?.valueSpec,
      V1_CInteger,
    );
    expect(parameterValue.value).toBe(24);
  },
);

test(
  integrationTest(
    "DataCube uses query lambda parameter value if name doesn't match raw source",
  ),
  async () => {
    MockedMonacoEditorAPI.remeasureFonts.mockReturnValue(undefined);

    const mockDataCubeId = 'test-data-cube-id';
    const mockDataCube: PersistentDataCube =
      PersistentDataCube.serialization.fromJson({
        id: mockDataCubeId,
        name: `${mockDataCubeId}-name`,
        description: undefined,
        content: {
          query: `select(~[Id, 'Case Type'])`,
          source: {
            queryId: `${mockDataCubeId}-query-id`,
            parameterValues: [
              [
                '{"_type": "var", "genericType": {"rawType": {"_type": "packageableType", "fullPath": "Integer"}}, "multiplicity": {"lowerBound": 1, "upperBound": 1}, "name": "minId"}',
                '{"_type": "integer", "value": 24}',
              ],
            ],
            _type: 'legendQuery',
          },
          configuration: {
            name: `${mockDataCubeId}-query-name`,
            columns: [
              { name: 'Id', type: 'Integer' },
              { name: 'Case Type', type: 'String' },
            ],
          },
        },
      });
    const mockQuery: V1_Query = V1_Query.serialization.fromJson({
      name: `${mockDataCubeId}-query-name`,
      id: `${mockDataCubeId}-query-id`,
      versionId: 'latest',
      groupId: 'com.legend',
      artifactId: 'test-project',
      content: `{maxId: Integer[1]|domain::COVIDData.all()->filter(x|$x.id <= $maxId)->project(~[Id:x|$x.id, 'Case Type':x|$x.caseType])}`,
      defaultParameterValues: [{ name: 'maxId', content: '18' }],
      executionContext: {
        dataSpacePath: 'domain::COVIDDatapace',
        executionKey: 'dummyContext',
        _type: 'dataSpaceExecutionContext',
      },
    });
    const mockedLegendDataCubeBuilderStore =
      await TEST__provideMockedLegendDataCubeBuilderStore();
    await TEST__setUpDataCubeBuilder(
      guaranteeNonNullable(mockedLegendDataCubeBuilderStore),
      mockDataCube,
      mockQuery,
      depotEntities,
    );

    // Test that parameter value from query lambda
    await screen.findByText('test-data-cube-id-query-name');
    await screen.findByText('Parameters:');
    await screen.findByText('maxId');
    await screen.findByText('18');
    expect(screen.queryByText('minId')).toBeNull();
    expect(screen.queryByText('24')).toBeNull();

    // Teset that parameter value has the correct name, type, and value
    const source = guaranteeType(
      mockedLegendDataCubeBuilderStore.builder?.source,
      LegendQueryDataCubeSource,
    );
    expect(source.parameterValues[0]?.variable?.name).toBe('maxId');
    const parameterValue = guaranteeType(
      source.parameterValues[0]?.valueSpec,
      V1_CInteger,
    );
    expect(parameterValue.value).toBe(18);
  },
);

test(
  integrationTest(
    "DataCube uses query lambda parameter value if type doesn't match raw source",
  ),
  async () => {
    MockedMonacoEditorAPI.remeasureFonts.mockReturnValue(undefined);

    const mockDataCubeId = 'test-data-cube-id';
    const mockDataCube: PersistentDataCube =
      PersistentDataCube.serialization.fromJson({
        id: mockDataCubeId,
        name: `${mockDataCubeId}-name`,
        description: undefined,
        content: {
          query: `select(~[Id, 'Case Type'])`,
          source: {
            queryId: `${mockDataCubeId}-query-id`,
            parameterValues: [
              [
                '{"_type": "var", "genericType": {"rawType": {"_type": "packageableType", "fullPath": "Integer"}}, "multiplicity": {"lowerBound": 1, "upperBound": 1}, "name": "minId"}',
                '{"_type": "integer", "value": 24}',
              ],
            ],
            _type: 'legendQuery',
          },
          configuration: {
            name: `${mockDataCubeId}-query-name`,
            columns: [
              { name: 'Id', type: 'Integer' },
              { name: 'Case Type', type: 'String' },
            ],
          },
        },
      });
    const mockQuery: V1_Query = V1_Query.serialization.fromJson({
      name: `${mockDataCubeId}-query-name`,
      id: `${mockDataCubeId}-query-id`,
      versionId: 'latest',
      groupId: 'com.legend',
      artifactId: 'test-project',
      content: `{minId: String[1]|domain::COVIDData.all()->filter(x|$x.caseType == $minId)->project(~[Id:x|$x.id, 'Case Type':x|$x.caseType])}`,
      defaultParameterValues: [{ name: 'minId', content: "'testValue'" }],
      executionContext: {
        dataSpacePath: 'domain::COVIDDatapace',
        executionKey: 'dummyContext',
        _type: 'dataSpaceExecutionContext',
      },
    });
    const mockedLegendDataCubeBuilderStore =
      await TEST__provideMockedLegendDataCubeBuilderStore();
    await TEST__setUpDataCubeBuilder(
      guaranteeNonNullable(mockedLegendDataCubeBuilderStore),
      mockDataCube,
      mockQuery,
      depotEntities,
    );

    // Test that parameter value from query lambda
    await screen.findByText('test-data-cube-id-query-name');
    await screen.findByText('Parameters:');
    await screen.findByText('minId');
    await screen.findByText('testValue');
    expect(screen.queryByText('24')).toBeNull();

    // Teset that parameter value has the correct name, type, and value
    const source = guaranteeType(
      mockedLegendDataCubeBuilderStore.builder?.source,
      LegendQueryDataCubeSource,
    );
    expect(source.parameterValues[0]?.variable?.name).toBe('minId');
    const parameterValue = guaranteeType(
      source.parameterValues[0]?.valueSpec,
      V1_CString,
    );
    expect(parameterValue.value).toBe('testValue');
  },
);

test(
  integrationTest(
    "DataCube builds default value if queryInfo doesn't have a default parameter value",
  ),
  async () => {
    MockedMonacoEditorAPI.remeasureFonts.mockReturnValue(undefined);

    const mockDataCubeId = 'test-data-cube-id';
    const mockDataCube: PersistentDataCube =
      PersistentDataCube.serialization.fromJson({
        id: mockDataCubeId,
        name: `${mockDataCubeId}-name`,
        description: undefined,
        content: {
          query: `select(~[Id, 'Case Type'])`,
          source: {
            queryId: `${mockDataCubeId}-query-id`,
            _type: 'legendQuery',
          },
          configuration: {
            name: `${mockDataCubeId}-query-name`,
            columns: [
              { name: 'Id', type: 'Integer' },
              { name: 'Case Type', type: 'String' },
            ],
          },
        },
      });
    const mockQuery: V1_Query = V1_Query.serialization.fromJson({
      name: `${mockDataCubeId}-query-name`,
      id: `${mockDataCubeId}-query-id`,
      versionId: 'latest',
      groupId: 'com.legend',
      artifactId: 'test-project',
      content: `{minId: Integer[1]|domain::COVIDData.all()->filter(x|$x.id >= $minId)->project(~[Id:x|$x.id, 'Case Type':x|$x.caseType])}`,
      executionContext: {
        dataSpacePath: 'domain::COVIDDatapace',
        executionKey: 'dummyContext',
        _type: 'dataSpaceExecutionContext',
      },
    });
    const mockedLegendDataCubeBuilderStore =
      await TEST__provideMockedLegendDataCubeBuilderStore();
    await TEST__setUpDataCubeBuilder(
      guaranteeNonNullable(mockedLegendDataCubeBuilderStore),
      mockDataCube,
      mockQuery,
      depotEntities,
    );

    // Test that parameter value from raw source is used
    await screen.findByText('test-data-cube-id-query-name');
    await screen.findByText('Parameters:');
    await screen.findByText('minId');
    await screen.findByText('0');

    // Teset that parameter value has the correct name, type, and value
    const source = guaranteeType(
      mockedLegendDataCubeBuilderStore.builder?.source,
      LegendQueryDataCubeSource,
    );
    expect(source.parameterValues[0]?.variable?.name).toBe('minId');
    const parameterValue = guaranteeType(
      source.parameterValues[0]?.valueSpec,
      V1_CInteger,
    );
    expect(parameterValue.value).toBe(0);
  },
);

test(
  integrationTest(
    "DataCube doesn't show raw source parameters that don't exist in the query lambda",
  ),
  async () => {
    MockedMonacoEditorAPI.remeasureFonts.mockReturnValue(undefined);

    const mockDataCubeId = 'test-data-cube-id';
    const mockDataCube: PersistentDataCube =
      PersistentDataCube.serialization.fromJson({
        id: mockDataCubeId,
        name: `${mockDataCubeId}-name`,
        description: undefined,
        content: {
          query: `select(~[Id, 'Case Type'])`,
          source: {
            queryId: `${mockDataCubeId}-query-id`,
            parameterValues: [
              [
                '{"_type": "var", "genericType": {"rawType": {"_type": "packageableType", "fullPath": "Integer"}}, "multiplicity": {"lowerBound": 1, "upperBound": 1}, "name": "minId"}',
                '{"_type": "integer", "value": 24}',
              ],
            ],
            _type: 'legendQuery',
          },
          configuration: {
            name: `${mockDataCubeId}-query-name`,
            columns: [
              { name: 'Id', type: 'Integer' },
              { name: 'Case Type', type: 'String' },
            ],
          },
        },
      });
    const mockQuery: V1_Query = V1_Query.serialization.fromJson({
      name: `${mockDataCubeId}-query-name`,
      id: `${mockDataCubeId}-query-id`,
      versionId: 'latest',
      groupId: 'com.legend',
      artifactId: 'test-project',
      content: `|domain::COVIDData.all()->project(~[Id:x|$x.id, 'Case Type':x|$x.caseType])`,
      executionContext: {
        dataSpacePath: 'domain::COVIDDatapace',
        executionKey: 'dummyContext',
        _type: 'dataSpaceExecutionContext',
      },
    });
    const mockedLegendDataCubeBuilderStore =
      await TEST__provideMockedLegendDataCubeBuilderStore();
    await TEST__setUpDataCubeBuilder(
      guaranteeNonNullable(mockedLegendDataCubeBuilderStore),
      mockDataCube,
      mockQuery,
      depotEntities,
    );

    // Test that parameter value from raw source is used
    await screen.findByText('test-data-cube-id-query-name');
    expect(screen.queryByText('Parameters:')).toBeNull();
    expect(screen.queryByText('minId')).toBeNull();
    expect(screen.queryByText('0')).toBeNull();

    // Test that there are no parameter values
    const source = guaranteeType(
      mockedLegendDataCubeBuilderStore.builder?.source,
      LegendQueryDataCubeSource,
    );
    expect(source.parameterValues).toHaveLength(0);
  },
);

test(
  integrationTest(
    'DataCube properly combines parameters from raw source and query lambda',
  ),
  async () => {
    MockedMonacoEditorAPI.remeasureFonts.mockReturnValue(undefined);

    const mockDataCubeId = 'test-data-cube-id';
    const mockDataCube: PersistentDataCube =
      PersistentDataCube.serialization.fromJson({
        id: mockDataCubeId,
        name: `${mockDataCubeId}-name`,
        description: undefined,
        content: {
          query: `select(~[Id, 'Case Type'])`,
          source: {
            queryId: `${mockDataCubeId}-query-id`,
            parameterValues: [
              [
                '{"_type": "var", "genericType": {"rawType": {"_type": "packageableType", "fullPath": "Integer"}}, "multiplicity": {"lowerBound": 1, "upperBound": 1}, "name": "minId"}',
                '{"_type": "integer", "value": 24}',
              ],
              [
                '{"_type": "var", "genericType": {"rawType": {"_type": "packageableType", "fullPath": "String"}}, "multiplicity": {"lowerBound": 1, "upperBound": 1}, "name": "searchString"}',
                '{"_type": "string", "value": "testValue1"}',
              ],
              [
                '{"_type": "var", "genericType": {"rawType": {"_type": "packageableType", "fullPath": "Integer"}}, "multiplicity": {"lowerBound": 1, "upperBound": 1}, "name": "changedTypeParam"}',
                '{"_type": "integer", "value": 15}',
              ],
            ],
            _type: 'legendQuery',
          },
          configuration: {
            name: `${mockDataCubeId}-query-name`,
            columns: [
              { name: 'Id', type: 'Integer' },
              { name: 'Case Type', type: 'String' },
            ],
          },
        },
      });
    const mockQuery: V1_Query = V1_Query.serialization.fromJson({
      name: `${mockDataCubeId}-query-name`,
      id: `${mockDataCubeId}-query-id`,
      versionId: 'latest',
      groupId: 'com.legend',
      artifactId: 'test-project',
      content: `{minId: Integer[1], changedTypeParam: String[1], noDefaultValueParam: Float[1]|domain::COVIDData.all()->filter(x|$x.id >= $minId)->project(~[Id:x|$x.id, 'Case Type':x|$x.caseType])}`,
      defaultParameterValues: [
        { name: 'minId', content: '5' },
        { name: 'changedTypeParam', content: "'testValue2'" },
      ],
      executionContext: {
        dataSpacePath: 'domain::COVIDDatapace',
        executionKey: 'dummyContext',
        _type: 'dataSpaceExecutionContext',
      },
    });
    const mockedLegendDataCubeBuilderStore =
      await TEST__provideMockedLegendDataCubeBuilderStore();
    await TEST__setUpDataCubeBuilder(
      guaranteeNonNullable(mockedLegendDataCubeBuilderStore),
      mockDataCube,
      mockQuery,
      depotEntities,
    );

    await screen.findByText('test-data-cube-id-query-name');
    await screen.findByText('Parameters:');

    // Test that minId param uses value from raw source
    await screen.findByText('minId');
    await screen.findByText('24');

    // Test that changedTypeParam uses value from query lambda
    await screen.findByText('changedTypeParam');
    await screen.findByText('testValue2');

    // Test that noDefaultValueParam gets built a default value
    await screen.findByText('noDefaultValueParam');
    await screen.findByText('0');

    // Test that searchString param is not shown at all
    expect(screen.queryByText('searchString')).toBeNull();
    expect(screen.queryByText('testValue1')).toBeNull();

    // Check that parameters have correct names, types, and values
    const source = guaranteeType(
      mockedLegendDataCubeBuilderStore.builder?.source,
      LegendQueryDataCubeSource,
    );
    expect(source.parameterValues[0]?.variable?.name).toBe('minId');
    expect(
      guaranteeType(source.parameterValues[0]?.valueSpec, V1_CInteger).value,
    ).toBe(24);
    expect(source.parameterValues[1]?.variable?.name).toBe('changedTypeParam');
    expect(
      guaranteeType(source.parameterValues[1]?.valueSpec, V1_CString).value,
    ).toBe('testValue2');
    expect(source.parameterValues[2]?.variable?.name).toBe(
      'noDefaultValueParam',
    );
    expect(
      guaranteeType(source.parameterValues[2]?.valueSpec, V1_CFloat).value,
    ).toBe(0);
  },
);

test(
  integrationTest(
    'DataCube disables editing parameter values if cache is enabled',
  ),
  async () => {
    MockedMonacoEditorAPI.remeasureFonts.mockReturnValue(undefined);

    const mockDataCubeId = 'test-data-cube-id';
    const mockDataCube: PersistentDataCube =
      PersistentDataCube.serialization.fromJson({
        id: mockDataCubeId,
        name: `${mockDataCubeId}-name`,
        description: undefined,
        content: {
          query: `select(~[Id, 'Case Type'])`,
          source: {
            queryId: `${mockDataCubeId}-query-id`,
            parameterValues: [
              [
                '{"_type": "var", "genericType": {"rawType": {"_type": "packageableType", "fullPath": "Integer"}}, "multiplicity": {"lowerBound": 1, "upperBound": 1}, "name": "minId"}',
                '{"_type": "integer", "value": 1}',
              ],
            ],
            _type: 'legendQuery',
          },
          configuration: {
            name: `${mockDataCubeId}-query-name`,
            columns: [
              { name: 'Id', type: 'Integer' },
              { name: 'Case Type', type: 'String' },
            ],
          },
        },
      });
    const mockQuery: V1_Query = V1_Query.serialization.fromJson({
      name: `${mockDataCubeId}-query-name`,
      id: `${mockDataCubeId}-query-id`,
      versionId: 'latest',
      groupId: 'com.legend',
      artifactId: 'test-project',
      content: `{minId: Integer[1]|domain::COVIDData.all()->filter(x|$x.id >= $minId)->project(~[Id:x|$x.id, 'Case Type':x|$x.caseType])}`,
      executionContext: {
        dataSpacePath: 'domain::COVIDDatapace',
        executionKey: 'dummyContext',
        _type: 'dataSpaceExecutionContext',
      },
    });
    const mockedLegendDataCubeBuilderStore =
      await TEST__provideMockedLegendDataCubeBuilderStore();
    await TEST__setUpDataCubeBuilder(
      guaranteeNonNullable(mockedLegendDataCubeBuilderStore),
      mockDataCube,
      mockQuery,
      depotEntities,
    );
    await waitFor(() =>
      isNonNullable(mockedLegendDataCubeBuilderStore.builder?.dataCube),
    );
    const dataCube = guaranteeNonNullable(
      mockedLegendDataCubeBuilderStore.builder?.dataCube,
    );
    createSpy(dataCube, 'isCachingEnabled').mockReturnValue(true);

    await screen.findByText('test-data-cube-id-query-name');
    await screen.findByText('Parameters:');

    // Check that parameter editing is disabled
    const paramButton = await screen.findByText('minId');
    fireEvent.click(paramButton);
    await screen.findByText('DataCube Source');
    const valueSpecEditorInput = await screen.findByDisplayValue('1');
    expect(valueSpecEditorInput.hasAttribute('disabled')).toBe(true);
    const updateButton = await screen.findByRole('button', {
      name: 'Update Query Parameters',
    });
    expect(updateButton.hasAttribute('disabled')).toBe(true);
    expect(screen.getByText('Parameter editing disabled')).not.toBeNull();
  },
);

test(
  integrationTest(
    'DataCube handles fetching enum parameter values from project correctly',
  ),
  async () => {
    MockedMonacoEditorAPI.remeasureFonts.mockReturnValue(undefined);

    const mockDataCubeId = 'test-data-cube-id';
    const mockDataCube: PersistentDataCube =
      PersistentDataCube.serialization.fromJson({
        id: mockDataCubeId,
        name: `${mockDataCubeId}-name`,
        description: undefined,
        content: {
          query: `select(~[Id, 'Case Type'])`,
          source: {
            queryId: `${mockDataCubeId}-query-id`,
            parameterValues: [
              [
                '{"_type": "var", "genericType": {"rawType": {"_type": "packageableType", "fullPath": "enum::MonthEnum"}}, "multiplicity": {"lowerBound": 1, "upperBound": 1}, "name": "monthEnumParam"}',
                '{"_type": "property", "parameters": [{"_type": "packageableElementPtr", "fullPath": "enum::MonthEnum"}], "property": "April"}',
              ],
            ],
            _type: 'legendQuery',
          },
          configuration: {
            name: `${mockDataCubeId}-query-name`,
            columns: [
              { name: 'Id', type: 'Integer' },
              { name: 'Case Type', type: 'String' },
            ],
          },
        },
      });
    const mockQuery: V1_Query = V1_Query.serialization.fromJson({
      name: `${mockDataCubeId}-query-name`,
      id: `${mockDataCubeId}-query-id`,
      versionId: 'latest',
      groupId: 'com.legend',
      artifactId: 'test-project',
      content: `{monthEnumParam: enum::MonthEnum[1]|domain::COVIDData.all()->project(~[Id:x|$x.id, 'Case Type':x|$x.caseType])}`,
      executionContext: {
        dataSpacePath: 'domain::COVIDDatapace',
        executionKey: 'dummyContext',
        _type: 'dataSpaceExecutionContext',
      },
    });
    const mockedLegendDataCubeBuilderStore =
      await TEST__provideMockedLegendDataCubeBuilderStore();
    await TEST__setUpDataCubeBuilder(
      guaranteeNonNullable(mockedLegendDataCubeBuilderStore),
      mockDataCube,
      mockQuery,
      depotEntities,
    );
    createSpy(
      mockedLegendDataCubeBuilderStore.depotServerClient,
      'getVersionEntity',
    ).mockResolvedValue({
      classifierPath: 'meta::pure::metamodel::type::Enumeration',
      path: 'enum::MonthEnum',
      content: {
        _type: 'Enumeration',
        name: 'MonthEnum',
        package: 'enum',
        values: [
          { value: 'January' },
          { value: 'February' },
          { value: 'March' },
          { value: 'April' },
          { value: 'May' },
          { value: 'June' },
          { value: 'July' },
          { value: 'August' },
          { value: 'September' },
          { value: 'October' },
          { value: 'November' },
          { value: 'December' },
        ],
      },
    });

    // Open parameter editor
    await screen.findByText('Parameters:');
    const paramButton = await screen.findByText('monthEnumParam');
    await screen.findByText('April');
    fireEvent.click(paramButton);
    const sourceViewerPanel = guaranteeNonNullable(
      (await screen.findByText('DataCube Source')).parentElement?.parentElement,
    );

    // Test that other enum values appear when clicking on value spec editor
    const valueSpecEditorInput = await findByText(sourceViewerPanel, 'April');
    expect(screen.queryByText('March')).toBeNull();
    fireEvent.click(valueSpecEditorInput);
    fireEvent.keyDown(valueSpecEditorInput, { key: 'ArrowDown' });
    await screen.findByText('March');
  },
);

test(
  integrationTest(
    'DataCube handles fetching enum parameter values from dependency project correctly',
  ),
  async () => {
    MockedMonacoEditorAPI.remeasureFonts.mockReturnValue(undefined);

    const mockDataCubeId = 'test-data-cube-id';
    const mockDataCube: PersistentDataCube =
      PersistentDataCube.serialization.fromJson({
        id: mockDataCubeId,
        name: `${mockDataCubeId}-name`,
        description: undefined,
        content: {
          query: `select(~[Id, 'Case Type'])`,
          source: {
            queryId: `${mockDataCubeId}-query-id`,
            parameterValues: [
              [
                '{"_type": "var", "genericType": {"rawType": {"_type": "packageableType", "fullPath": "enum::MonthEnum"}}, "multiplicity": {"lowerBound": 1, "upperBound": 1}, "name": "monthEnumParam"}',
                '{"_type": "property", "parameters": [{"_type": "packageableElementPtr", "fullPath": "enum::MonthEnum"}], "property": "April"}',
              ],
            ],
            _type: 'legendQuery',
          },
          configuration: {
            name: `${mockDataCubeId}-query-name`,
            columns: [
              { name: 'Id', type: 'Integer' },
              { name: 'Case Type', type: 'String' },
            ],
          },
        },
      });
    const mockQuery: V1_Query = V1_Query.serialization.fromJson({
      name: `${mockDataCubeId}-query-name`,
      id: `${mockDataCubeId}-query-id`,
      versionId: 'latest',
      groupId: 'com.legend',
      artifactId: 'test-project',
      content: `{monthEnumParam: enum::MonthEnum[1]|domain::COVIDData.all()->project(~[Id:x|$x.id, 'Case Type':x|$x.caseType])}`,
      executionContext: {
        dataSpacePath: 'domain::COVIDDatapace',
        executionKey: 'dummyContext',
        _type: 'dataSpaceExecutionContext',
      },
    });
    const mockedLegendDataCubeBuilderStore =
      await TEST__provideMockedLegendDataCubeBuilderStore();
    await TEST__setUpDataCubeBuilder(
      guaranteeNonNullable(mockedLegendDataCubeBuilderStore),
      mockDataCube,
      mockQuery,
      depotEntities,
    );
    createSpy(
      mockedLegendDataCubeBuilderStore.depotServerClient,
      'getVersionEntity',
    ).mockRejectedValue(
      new NetworkClientError(
        {
          status: 404,
        } as unknown as Response,
        undefined,
      ),
    );
    createSpy(
      mockedLegendDataCubeBuilderStore.depotServerClient,
      'getDependencyEntities',
    ).mockResolvedValue([
      {
        entities: [
          {
            entity: {
              path: 'enum::MonthEnum',
              classifierPath: 'meta::pure::metamodel::type::Enumeration',
              content: {
                _type: 'Enumeration',
                name: 'MonthEnum',
                package: 'enum',
                values: [
                  { value: 'January' },
                  { value: 'February' },
                  { value: 'March' },
                  { value: 'April' },
                  { value: 'May' },
                  { value: 'June' },
                  { value: 'July' },
                  { value: 'August' },
                  { value: 'September' },
                  { value: 'October' },
                  { value: 'November' },
                  { value: 'December' },
                ],
              },
            },
          },
        ],
      },
    ]);

    // Open parameter editor
    await screen.findByText('Parameters:');
    const paramButton = await screen.findByText('monthEnumParam');
    await screen.findByText('April');
    fireEvent.click(paramButton);
    const sourceViewerPanel = guaranteeNonNullable(
      (await screen.findByText('DataCube Source')).parentElement?.parentElement,
    );

    // Test that other enum values appear when clicking on value spec editor
    const valueSpecEditorInput = await findByText(sourceViewerPanel, 'April');
    expect(screen.queryByText('March')).toBeNull();
    fireEvent.click(valueSpecEditorInput);
    fireEvent.keyDown(valueSpecEditorInput, { key: 'ArrowDown' });
    await screen.findByText('March');
  },
);

// -------------------- RELEASE LOG TESTS --------------------

const releaseLog = [
  {
    version: '3.0.0',
    notes: [
      {
        type: 'ENHANCEMENT',
        description:
          'This is a test description for enhancement 1 version 3.0.0',
        docLink: 'https://github.com/finos/legend-engine',
      },

      {
        type: 'ENHANCEMENT',
        description: 'This is a test description for enhancement 2',
        docLink: 'https://github.com/finos/legend-engine',
      },
      {
        type: 'BUG_FIX',
        description: 'This is a bug description for bug fix 1',
      },
      {
        type: 'BUG_FIX',
        description: 'This is a bug description for bug fix 2',
        docLink: 'https://github.com/finos/legend-engine',
      },
    ],
  },
  {
    version: '2.0.0',
    notes: [
      {
        type: 'ENHANCEMENT',
        description: 'This is a test description for enhancement 1',
        docLink: 'https://github.com/finos/legend-engine',
      },
      {
        type: 'ENHANCEMENT',
        description: 'This is a test description for enhancement 2',
        docLink: 'https://github.com/finos/legend-engine',
      },
      {
        type: 'BUG_FIX',
        description:
          'This is a bug description for bug fix for version 2.0.0 bug 1',
      },
      {
        type: 'BUG_FIX',
        description:
          'This is a bug description for bug fix for version 2.0.0 bug 2',
        docLink: 'https://github.com/finos/legend-engine',
      },
    ],
  },
];

test(
  integrationTest(
    'Legend DataCube shows Release Updates from last viewed version',
  ),
  async () => {
    const pluginManager = LegendDataCubePluginManager.create();
    const appStore = new ApplicationStore(
      TEST__getTestLegendDataCubeApplicationConfig(),
      pluginManager,
    );
    const MOCK__lastOpenedVersion = createMock();
    appStore.releaseNotesService.getViewedVersion = MOCK__lastOpenedVersion;
    MOCK__lastOpenedVersion.mockReturnValue('1.0.0');
    appStore.releaseNotesService.configure(releaseLog as VersionReleaseNotes[]);
    const mockedLegendDataCubeBuilderStore =
      await TEST__provideMockedLegendDataCubeBuilderStore({
        applicationStore: appStore,
      });
    await TEST__setUpDataCubeBuilder(mockedLegendDataCubeBuilderStore);

    const windowHeader = guaranteeNonNullable(
      (await screen.findByText('Release Notes')).parentElement,
    );
    const releaseDialog = guaranteeNonNullable(windowHeader.parentElement);
    expect(
      getByText(
        releaseDialog,
        'New features, enhancements and bug fixes that were released',
      ),
    ).not.toBeNull();
    expect(
      getByText(releaseDialog, 'This is a bug description for bug fix 1'),
    ).not.toBeNull();
    expect(
      getByText(
        releaseDialog,
        'This is a test description for enhancement 1 version 3.0.0',
      ),
    ).not.toBeNull();

    expect(getByText(releaseDialog, 'Version 2.0.0')).not.toBeNull();
    expect(getByText(releaseDialog, 'Version 3.0.0')).not.toBeNull();

    expect(getAllByTitle(releaseDialog, 'Visit...')).toHaveLength(6);

    fireEvent.click(getByRole(windowHeader, 'button'));
    expect(screen.queryByText('Release Notes')).toBeNull();
  },
);

test(
  integrationTest('Legend DataCube does not show viewed release notes'),
  async () => {
    const pluginManager = LegendDataCubePluginManager.create();
    const appStore = new ApplicationStore(
      TEST__getTestLegendDataCubeApplicationConfig(),
      pluginManager,
    );
    const MOCK__lastOpenedVersion = createMock();
    appStore.releaseNotesService.getViewedVersion = MOCK__lastOpenedVersion;
    MOCK__lastOpenedVersion.mockReturnValue('2.0.0');
    appStore.releaseNotesService.configure(releaseLog as VersionReleaseNotes[]);
    const mockedLegendDataCubeBuilderStore =
      await TEST__provideMockedLegendDataCubeBuilderStore({
        applicationStore: appStore,
      });
    await TEST__setUpDataCubeBuilder(mockedLegendDataCubeBuilderStore);

    const windowHeader = guaranteeNonNullable(
      (await screen.findByText('Release Notes')).parentElement,
    );
    const releaseDialog = guaranteeNonNullable(windowHeader.parentElement);
    expect(
      getByText(
        releaseDialog,
        'New features, enhancements and bug fixes that were released',
      ),
    ).not.toBeNull();
    expect(
      getByText(releaseDialog, 'This is a bug description for bug fix 1'),
    ).not.toBeNull();
    expect(
      getByText(
        releaseDialog,
        'This is a test description for enhancement 1 version 3.0.0',
      ),
    ).not.toBeNull();

    expect(queryByText(releaseDialog, 'Version 2.0.0')).toBeNull();
    expect(queryByText(releaseDialog, 'Version 3.0.0')).not.toBeNull();

    expect(getAllByTitle(releaseDialog, 'Visit...')).toHaveLength(3);

    fireEvent.click(getByRole(windowHeader, 'button'));
    expect(screen.queryByText('Release Notes')).toBeNull();
  },
);

test(
  integrationTest(
    'Legend DataCube does not render release updates if latest version has been viewed',
  ),
  async () => {
    const pluginManager = LegendDataCubePluginManager.create();
    const appStore = new ApplicationStore(
      TEST__getTestLegendDataCubeApplicationConfig(),
      pluginManager,
    );
    const MOCK__lastOpenedVersion = createMock();
    appStore.releaseNotesService.getViewedVersion = MOCK__lastOpenedVersion;
    MOCK__lastOpenedVersion.mockReturnValue('3.0.0');
    appStore.releaseNotesService.configure(releaseLog as VersionReleaseNotes[]);
    const mockedLegendDataCubeBuilderStore =
      await TEST__provideMockedLegendDataCubeBuilderStore({
        applicationStore: appStore,
      });
    await TEST__setUpDataCubeBuilder(mockedLegendDataCubeBuilderStore);

    expect(screen.queryByText('Release Notes')).toBeNull();
  },
);

test(
  integrationTest(
    'Legend DataCube does not render release updates for new users',
  ),
  async () => {
    const pluginManager = LegendDataCubePluginManager.create();
    const appStore = new ApplicationStore(
      TEST__getTestLegendDataCubeApplicationConfig(),
      pluginManager,
    );
    appStore.releaseNotesService.configure(releaseLog as VersionReleaseNotes[]);
    const mockedLegendDataCubeBuilderStore =
      await TEST__provideMockedLegendDataCubeBuilderStore({
        applicationStore: appStore,
      });
    await TEST__setUpDataCubeBuilder(mockedLegendDataCubeBuilderStore);

    expect(screen.queryByText('Release Notes')).toBeNull();
  },
);
