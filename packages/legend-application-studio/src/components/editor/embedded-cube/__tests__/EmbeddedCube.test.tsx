/**
 * Copyright (c) 2026-present, Goldman Sachs
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

import { afterEach, describe, expect, jest, test } from '@jest/globals';
import { act, findByText, fireEvent, waitFor } from '@testing-library/react';
import {
  CubeDataProductEnvironmentType,
  CubeEngineError,
  CubeEngineErrorKind,
  formatCubeIngestUrn,
  type CubeEngine,
} from '@finos/legend-cube-builder';
import type { IngestDefinition } from '@finos/legend-graph';
import type { Entity } from '@finos/legend-storage';
import {
  PrimitiveType,
  Schema,
  SchemaColumn,
  type IR,
  type ModelContext,
} from '@finos/legend-cube';
import type { PlainObject } from '@finos/legend-shared';
import { integrationTest } from '@finos/legend-shared/test';
import {
  TEST__openElementFromExplorerTree,
  TEST__provideMockedEditorStore,
  TEST__setUpEditorWithDefaultSDLCData,
} from '../../__test-utils__/EditorComponentTestUtils.js';
import { LEGEND_STUDIO_TEST_ID } from '../../../../__lib__/LegendStudioTesting.js';
import {
  LEGEND_STUDIO_CUBE_MESSAGE,
  LEGEND_STUDIO_CUBE_PROJECT_PRODUCER,
  LegendStudioCubeIngestCatalog,
} from '../../../../stores/editor/embedded-cube/LegendStudioCubeIngestCatalog.js';
import {
  LEGEND_STUDIO_CUBE_DATA_PRODUCT_MESSAGE,
  LegendStudioCubeDataProductCatalog,
} from '../../../../stores/editor/embedded-cube/LegendStudioCubeDataProductCatalog.js';
import {
  LEGEND_STUDIO_CUBE_WORKSPACE_MESSAGE,
  LEGEND_STUDIO_CUBE_WORKSPACE_VERSION,
  LegendStudioCubeWorkspace,
} from '../../../../stores/editor/embedded-cube/LegendStudioCubeWorkspace.js';
import { getIngestDataSetNames } from '../../../../stores/graph-modifier/DSL_Ingest_GraphModifierHelper.js';
import type { EditorStore } from '../../../../stores/editor/EditorStore.js';

jest.mock('@finos/legend-lego/code-editor', () => ({
  CodeEditor: () => null,
}));

jest.mock('react-oidc-context', () => {
  const { MOCK__reactOIDCContext } = jest.requireActual<{
    MOCK__reactOIDCContext: unknown;
  }>('@finos/legend-shared/test');
  return MOCK__reactOIDCContext;
});

(global as unknown as { IntersectionObserver: unknown }).IntersectionObserver =
  jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }));

const INGEST_PATH = 'demo::ingest::TradesIngest';

const column = (name: string, fullPath: string): object => ({
  name,
  genericType: {
    rawType: { _type: 'packageableType', fullPath },
    typeArguments: [],
    multiplicityArguments: [],
    typeVariableValues: [],
  },
  multiplicity: { lowerBound: 1, upperBound: 1 },
});

const TRADES_INGEST: PlainObject<Entity> = {
  path: INGEST_PATH,
  classifierPath:
    'meta::external::ingest::specification::metamodel::IngestDefinition',
  content: {
    _type: 'ingestDefinition',
    name: 'TradesIngest',
    package: 'demo::ingest',
    appDirDeployment: { appDirId: 12345, level: 'DEPLOYMENT' },
    datasets: [
      {
        name: 'TRADES',
        primaryKey: ['TRADE_ID'],
        source: {
          _type: 'serializedSource',
          schema: {
            _type: 'relationType',
            columns: [
              column('TRADE_ID', 'Integer'),
              column('DESK_ID', 'Integer'),
              column('NOTIONAL_USD', 'Float'),
            ],
          },
        },
      },
      {
        name: 'DESKS',
        primaryKey: ['ID'],
        source: {
          _type: 'serializedSource',
          schema: {
            _type: 'relationType',
            columns: [column('ID', 'Integer'), column('DESK', 'String')],
          },
        },
      },
    ],
  },
};

const LAKEHOUSE_RUNTIME: PlainObject<Entity> = {
  path: 'demo::ingest::LakehouseRuntime',
  classifierPath: 'meta::pure::runtime::PackageableRuntime',
  content: {
    _type: 'runtime',
    name: 'LakehouseRuntime',
    package: 'demo::ingest',
    runtimeValue: {
      _type: 'LakehouseRuntime',
      environment: 'demo-dev',
      warehouse: 'DEMO_WH',
      connectionStores: [],
      connections: [],
      mappings: [],
    },
  },
};

const DATA_PRODUCT_PATH = 'demo::dataProduct::TradesDataProduct';

/** A lakehouse access point reading a data set of TradesIngest as it is */
const accessPoint = (id: string, dataSet: string): object => ({
  _type: 'lakehouseAccessPoint',
  id,
  title: dataSet,
  targetEnvironment: 'Snowflake',
  func: {
    _type: 'lambda',
    body: [
      {
        _type: 'classInstance',
        type: 'I',
        value: { metadata: false, path: [INGEST_PATH, dataSet] },
      },
    ],
    parameters: [],
  },
});

const TRADES_DATA_PRODUCT: PlainObject<Entity> = {
  path: DATA_PRODUCT_PATH,
  classifierPath:
    'meta::external::catalog::dataProduct::specification::metamodel::DataProduct',
  content: {
    _type: 'dataProduct',
    name: 'TradesDataProduct',
    package: 'demo::dataProduct',
    title: 'Trades',
    accessPointGroups: [
      {
        id: 'trading',
        title: 'Trading',
        accessPoints: [
          accessPoint('trades', 'TRADES'),
          accessPoint('desks', 'DESKS'),
        ],
      },
    ],
  },
};

/** An engine that types `#P{…}#` lambdas as the workspace's TRADES and DESKS, recording its calls */
const fakeTypingEngine = (): {
  engine: CubeEngine;
  typeLambdas: jest.Mock<CubeEngine['typeLambdas']>;
} => {
  const typeLambdas = jest.fn<CubeEngine['typeLambdas']>(
    async (_model: ModelContext, lambdas: ReadonlyMap<string, IR>) =>
      new Map(
        [...lambdas].map(([nodeId, ir]) => {
          const text = JSON.stringify(ir);
          return [
            nodeId,
            text.includes('"desks"')
              ? new Schema([
                  new SchemaColumn('ID', PrimitiveType.get('Integer'), false),
                  new SchemaColumn('DESK', PrimitiveType.get('String'), false),
                ])
              : text.includes('"trades"')
                ? new Schema([
                    new SchemaColumn(
                      'TRADE_ID',
                      PrimitiveType.get('Integer'),
                      false,
                    ),
                  ])
                : new CubeEngineError(
                    CubeEngineErrorKind.COMPILE,
                    'unknown access point',
                    nodeId,
                  ),
          ];
        }),
      ),
  );
  return { engine: { typeLambdas } as unknown as CubeEngine, typeLambdas };
};

/** The lambda a cube of TRADES alone gives */
const TRADES_LAMBDA = {
  _type: 'lambda',
  body: [
    {
      _type: 'classInstance',
      type: 'I',
      multiplicity: { lowerBound: 1, upperBound: 1 },
      value: { path: [INGEST_PATH, 'TRADES'], metadata: false },
    },
  ],
  parameters: [],
};

const setUp = async (
  entities: PlainObject<Entity>[],
): Promise<{
  editorStore: EditorStore;
  renderResult: Awaited<
    ReturnType<typeof TEST__setUpEditorWithDefaultSDLCData>
  >;
}> => {
  const editorStore = TEST__provideMockedEditorStore();
  editorStore.applicationStore.config.options.NonProductionFeatureFlag = true;
  const renderResult = await TEST__setUpEditorWithDefaultSDLCData(editorStore, {
    entities,
  });
  return { editorStore, renderResult };
};

const ingestOf = (editorStore: EditorStore): IngestDefinition =>
  editorStore.graphManagerState.graph.getNullableElement(
    INGEST_PATH,
  ) as IngestDefinition;

afterEach(() => {
  jest.restoreAllMocks();
});

describe('Legend Cube in Studio', () => {
  test(
    integrationTest(
      "Reads the project's own ingest definitions, as the workspace holds them, and runs on its lakehouse runtime",
    ),
    async () => {
      const { editorStore } = await setUp([TRADES_INGEST, LAKEHOUSE_RUNTIME]);
      const workspace = new LegendStudioCubeWorkspace(editorStore);
      const catalog = new LegendStudioCubeIngestCatalog(editorStore, workspace);
      const { PRODUCTION } = CubeDataProductEnvironmentType;
      expect(catalog.environmentTypes).toEqual([PRODUCTION]);
      // one producer, the project, whatever the definitions' deployments
      expect(
        (await catalog.listProducers()).map((each) => each.deploymentId),
      ).toEqual([LEGEND_STUDIO_CUBE_PROJECT_PRODUCER]);
      const urn = formatCubeIngestUrn({
        environmentType: PRODUCTION,
        groupId: 'com.test',
        artifactId: 'string',
        definition: INGEST_PATH,
      });
      const list = await catalog.listDefinitions();
      expect(list.candidates.map((each) => each.urn)).toEqual([urn]);
      // typing and runs read the whole workspace
      expect(
        (await catalog.getModelElements()).map(
          (element) => `${String(element.package)}::${String(element.name)}`,
        ),
      ).toEqual(
        expect.arrayContaining([INGEST_PATH, 'demo::ingest::LakehouseRuntime']),
      );
      const dataSets = await catalog.describe(urn);
      expect(
        dataSets.map((each) => [
          each.name,
          each.schema?.columns.map((col) => col.name),
        ]),
      ).toEqual([
        ['TRADES', ['TRADE_ID', 'DESK_ID', 'NOTIONAL_USD']],
        ['DESKS', ['ID', 'DESK']],
      ]);
      expect((await catalog.getDefinitionElement(urn))._type).toBe(
        'ingestDefinition',
      );
      const environment = await catalog.resolveEnvironment(PRODUCTION);
      expect(environment.runtimeEnvironment).toBe('demo-dev');
      expect(environment.warehouse).toBe('DEMO_WH');
      expect(await catalog.getRuntimeEnvironment()).toBe('demo-dev');
      const schemas = await catalog.resolveSchemas(
        PRODUCTION,
        new Map([
          [
            'ingest101',
            {
              ingestDefinitionUrn: urn,
              ingestDefinition: INGEST_PATH,
              dataSet: 'DESKS',
            },
          ],
          [
            'ingest102',
            {
              ingestDefinitionUrn: urn,
              ingestDefinition: INGEST_PATH,
              dataSet: 'GONE',
            },
          ],
        ]),
      );
      expect(
        (schemas.get('ingest101') as Schema).columns.map((col) => col.name),
      ).toEqual(['ID', 'DESK']);
      expect(schemas.get('ingest102')).toMatchObject({
        detail: LEGEND_STUDIO_CUBE_MESSAGE.NO_DATA_SET('GONE', INGEST_PATH),
      });
    },
  );

  test(
    integrationTest(
      'Asks for a lakehouse runtime when the project has none to run on',
    ),
    async () => {
      const { editorStore } = await setUp([TRADES_INGEST]);
      const workspace = new LegendStudioCubeWorkspace(editorStore);
      const catalog = new LegendStudioCubeIngestCatalog(editorStore, workspace);
      await expect(
        catalog.resolveEnvironment(CubeDataProductEnvironmentType.PRODUCTION),
      ).rejects.toMatchObject({
        detail: LEGEND_STUDIO_CUBE_WORKSPACE_MESSAGE.NO_RUNTIME,
      });
      await expect(workspace.resolveRuntime()).rejects.toMatchObject({
        detail: LEGEND_STUDIO_CUBE_WORKSPACE_MESSAGE.NO_RUNTIME,
      });
    },
  );

  test(
    integrationTest(
      "Create MatView with Cube opens Cube on the definition, and Add as MatView adds the cube's lambda to it as a data set",
    ),
    async () => {
      const { editorStore, renderResult } = await setUp([
        TRADES_INGEST,
        LAKEHOUSE_RUNTIME,
      ]);
      await TEST__openElementFromExplorerTree(INGEST_PATH, renderResult);
      const editorGroup = await waitFor(() =>
        renderResult.getByTestId(LEGEND_STUDIO_TEST_ID.EDITOR_GROUP),
      );
      fireEvent.click(
        await findByText(editorGroup, 'Create MatView with Cube'),
      );
      const { embeddedCubeState } = editorStore;
      expect(embeddedCubeState.isOpen).toBe(true);
      await renderResult.findByText(
        `Create MatView for ${INGEST_PATH} with Cube`,
      );

      // a name already used, or that isn't one, is refused
      expect(embeddedCubeState.getMaterializedViewNameProblem('')).toBe(
        'Name the materialized view.',
      );
      expect(
        embeddedCubeState.getMaterializedViewNameProblem('TRADES'),
      ).toContain('already has a data set named TRADES');
      expect(
        embeddedCubeState.getMaterializedViewNameProblem('1 TRADES'),
      ).toBeDefined();
      expect(
        embeddedCubeState.getMaterializedViewNameProblem('TRADES_VIEW'),
      ).toBeUndefined();

      const ingest = ingestOf(editorStore);
      const hashBefore = ingest.hashCode;
      act(() => {
        embeddedCubeState.addMaterializedView('TRADES_VIEW', TRADES_LAMBDA);
      });
      expect(embeddedCubeState.isOpen).toBe(false);
      expect(getIngestDataSetNames(ingest)).toEqual([
        'TRADES',
        'DESKS',
        'TRADES_VIEW',
      ]);
      const added = (ingest.content.datasets as { name: string }[]).at(-1);
      expect(added).toEqual({
        name: 'TRADES_VIEW',
        primaryKey: [],
        source: { _type: 'FunctionSource', function: TRADES_LAMBDA },
      });
      expect(
        ingest.TEMPORARY_MATVIEW_FUNCTION_DATA_SETS?.map((each) => each.name),
      ).toEqual(['TRADES_VIEW']);
      // a change Studio sees
      expect(ingest.hashCode).not.toBe(hashBefore);
      await renderResult.findByText(
        'Added materialized view TRADES_VIEW to TradesIngest',
      );
    },
  );

  test(
    integrationTest(
      "Reads the project's own data products, their lakehouse access points typed on the workspace",
    ),
    async () => {
      const { editorStore } = await setUp([
        TRADES_INGEST,
        TRADES_DATA_PRODUCT,
        LAKEHOUSE_RUNTIME,
      ]);
      const workspace = new LegendStudioCubeWorkspace(editorStore);
      const { engine, typeLambdas } = fakeTypingEngine();
      const catalog = new LegendStudioCubeDataProductCatalog(
        editorStore,
        workspace,
        engine,
      );
      const [candidate, ...others] = await catalog.search();
      expect(others).toEqual([]);
      expect(candidate).toMatchObject({
        dataProductPath: DATA_PRODUCT_PATH,
        title: 'Trades',
        groupId: 'com.test',
        artifactId: 'string',
        versionId: LEGEND_STUDIO_CUBE_WORKSPACE_VERSION,
      });
      const description = await catalog.describe(
        candidate as NonNullable<typeof candidate>,
      );
      expect(
        description.groups.map((group) => [
          group.title,
          group.accessPoints.map((point) => [
            point.id,
            point.schema?.columns.map((col) => col.name),
          ]),
        ]),
      ).toEqual([
        [
          'Trading',
          [
            ['trades', ['TRADE_ID']],
            ['desks', ['ID', 'DESK']],
          ],
        ],
      ]);
      // one typing call for the product, on a model of the workspace's project
      expect(typeLambdas).toHaveBeenCalledTimes(1);
      expect(typeLambdas.mock.calls[0]?.[0]).toMatchObject({
        _type: 'cubeDataProduct',
        groupId: 'com.test',
        artifactId: 'string',
        versionId: LEGEND_STUDIO_CUBE_WORKSPACE_VERSION,
      });
      const schemas = await catalog.resolveSchemas(
        {
          groupId: 'com.test',
          artifactId: 'string',
          versionId: LEGEND_STUDIO_CUBE_WORKSPACE_VERSION,
          environmentType: CubeDataProductEnvironmentType.PRODUCTION,
        },
        new Map([
          [
            'dataProductAccessPoint101',
            {
              dataProduct: DATA_PRODUCT_PATH,
              accessPointGroup: 'trading',
              accessPoint: 'desks',
            },
          ],
          [
            'dataProductAccessPoint102',
            {
              dataProduct: DATA_PRODUCT_PATH,
              accessPointGroup: 'trading',
              accessPoint: 'gone',
            },
          ],
        ]),
      );
      expect(
        (schemas.get('dataProductAccessPoint101') as Schema).columns.map(
          (col) => col.name,
        ),
      ).toEqual(['ID', 'DESK']);
      expect(schemas.get('dataProductAccessPoint102')).toMatchObject({
        detail: LEGEND_STUDIO_CUBE_DATA_PRODUCT_MESSAGE.NO_ACCESS_POINT(
          'gone',
          DATA_PRODUCT_PATH,
        ),
      });
      expect(catalog.getMarketplaceLink()).toBeUndefined();
    },
  );

  test(
    integrationTest(
      "Gives Cube the workspace as the model, and the project's lakehouse runtime to run on",
    ),
    async () => {
      const { editorStore } = await setUp([
        TRADES_INGEST,
        TRADES_DATA_PRODUCT,
        LAKEHOUSE_RUNTIME,
      ]);
      const workspace = new LegendStudioCubeWorkspace(editorStore);
      expect(await workspace.resolveRuntime()).toEqual({
        path: 'demo::ingest::LakehouseRuntime',
        environment: 'demo-dev',
        label: 'demo-dev, from demo::ingest::LakehouseRuntime',
        warehouse: 'DEMO_WH',
      });
      expect(await workspace.resolveEnvironment()).toBe('demo-dev');
      const model = await workspace.getProjectModel();
      expect(model._type).toBe('data');
      expect(
        (model.elements as PlainObject[])
          .map(
            (element) => `${String(element.package)}::${String(element.name)}`,
          )
          .sort(),
      ).toEqual(
        [
          DATA_PRODUCT_PATH,
          INGEST_PATH,
          'demo::ingest::LakehouseRuntime',
        ].sort(),
      );
    },
  );
});
