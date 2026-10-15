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
import {
  act,
  findByText,
  findByTitle,
  fireEvent,
  waitFor,
  within,
} from '@testing-library/react';
import {
  CubeDataProductEnvironmentType,
  CubeEngineError,
  CubeEngineErrorKind,
  formatCubeIngestUrn,
  LEGEND_CUBE_TEST_ID,
  serializeCubeLambdaForHost,
  type CubeEngine,
} from '@finos/legend-cube-builder';
import { DataProductConfig } from '@finos/legend-extension-dsl-data-product';
import type { IngestDefinition } from '@finos/legend-graph';
import type { Entity } from '@finos/legend-storage';
import {
  aggregationColSpec,
  colSpec,
  colSpecArray,
  columnAccess,
  func,
  ingestAccessor,
  lambda,
  literal,
  PrimitiveType,
  Schema,
  SchemaColumn,
  variable,
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
import { EMBEDDED_CUBE_TEST_ID } from '../EmbeddedCubeEditor.js';

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

/** As Cube writes a Filter and a Group of TRADES: the desks' big notionals */
const BIG_TRADES_LAMBDA = serializeCubeLambdaForHost(
  lambda(
    [],
    [
      func('groupBy', [
        func('filter', [
          ingestAccessor([INGEST_PATH, 'TRADES']),
          lambda(
            ['row'],
            [
              func('greaterThan', [
                columnAccess('row', 'NOTIONAL_USD'),
                literal({ kind: 'float', value: '1000000.0' }),
              ]),
            ],
          ),
        ]),
        colSpecArray([colSpec('DESK_ID')]),
        colSpecArray([
          aggregationColSpec(
            'TOTAL_USD',
            lambda(['x'], [columnAccess('x', 'NOTIONAL_USD')]),
            lambda(['y'], [func('sum', [variable('y')])]),
          ),
        ]),
      ]),
    ],
  ),
);

/** TradesIngest with a materialized view Cube wrote, BIG_TRADES, its data set saying what's given */
const tradesIngestWithView = (view: PlainObject): PlainObject<Entity> => ({
  ...TRADES_INGEST,
  content: {
    ...(TRADES_INGEST.content as PlainObject),
    datasets: [
      ...((TRADES_INGEST.content as PlainObject).datasets as object[]),
      {
        name: 'BIG_TRADES',
        source: { _type: 'FunctionSource', function: BIG_TRADES_LAMBDA },
        ...view,
      },
    ],
  },
});

/** TradesIngest with a materialized view keyed and classified */
const TRADES_INGEST_WITH_VIEW = tradesIngestWithView({
  primaryKey: ['DESK_ID'],
  privacyClassification: { sensitivity: 'DP10' },
});

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
      "Create MatView opens Cube on the definition, and Add MatView adds the cube's lambda to it as a data set",
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
      fireEvent.click(await findByText(editorGroup, 'Create MatView'));
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
      // its data must be classified: typed, as Studio's config gives no
      // classifications to pick from
      expect(embeddedCubeState.classifications).toEqual([]);
      expect(
        embeddedCubeState.getMaterializedViewClassificationProblem(' '),
      ).toBe("Classify the materialized view's data.");
      expect(
        embeddedCubeState.getMaterializedViewClassificationProblem('DP10'),
      ).toBeUndefined();

      const ingest = ingestOf(editorStore);
      const hashBefore = ingest.hashCode;
      act(() => {
        embeddedCubeState.addMaterializedView('TRADES_VIEW', TRADES_LAMBDA, {
          primaryKey: [],
          sensitivity: '',
        });
      });
      expect(embeddedCubeState.isOpen).toBe(true);
      expect(getIngestDataSetNames(ingest)).toEqual(['TRADES', 'DESKS']);
      act(() => {
        embeddedCubeState.addMaterializedView('TRADES_VIEW', TRADES_LAMBDA, {
          primaryKey: ['TRADE_ID'],
          sensitivity: ' DP10 ',
        });
      });
      expect(embeddedCubeState.isOpen).toBe(false);
      expect(getIngestDataSetNames(ingest)).toEqual([
        'TRADES',
        'DESKS',
        'TRADES_VIEW',
      ]);
      // with every key the engine gives a data set it parses
      const added = (ingest.content.datasets as { name: string }[]).at(-1);
      expect(added).toEqual({
        name: 'TRADES_VIEW',
        primaryKey: ['TRADE_ID'],
        privacyClassification: { sensitivity: 'DP10' },
        source: { _type: 'FunctionSource', function: TRADES_LAMBDA },
        ingestPartitionColumns: [],
        preprocessors: [],
        storageLayoutClusterColumns: [],
        storageLayoutPartitionColumns: [],
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
      "Add MatView asks for the view's name, a classification of its data, and a primary key among the columns of the step that runs",
    ),
    async () => {
      const { editorStore, renderResult } = await setUp([
        TRADES_INGEST,
        LAKEHOUSE_RUNTIME,
      ]);
      const dataProductConfig = new DataProductConfig();
      dataProductConfig.classifications = ['DP00', 'DP10', 'DP20'];
      editorStore.applicationStore.config.options.dataProductConfig =
        dataProductConfig;
      await TEST__openElementFromExplorerTree(INGEST_PATH, renderResult);
      const editorGroup = await waitFor(() =>
        renderResult.getByTestId(LEGEND_STUDIO_TEST_ID.EDITOR_GROUP),
      );
      fireEvent.click(await findByText(editorGroup, 'Create MatView'));
      // the cube reads TRADES
      fireEvent.click(
        await renderResult.findByRole('button', { name: /^Ingest Dataset/u }),
      );
      fireEvent.click(
        within(
          await renderResult.findByRole('list', { name: 'Ingest definitions' }),
        ).getByText('TradesIngest'),
      );
      const dataSets = await renderResult.findByRole('list', {
        name: 'Data sets',
      });
      fireEvent.click(within(dataSets).getByText('TRADES'));
      const sourceDialog = dataSets.closest('[role="dialog"]') as HTMLElement;
      fireEvent.click(
        within(sourceDialog).getByRole('button', { name: 'Add' }),
      );
      await waitFor(() =>
        expect(
          renderResult.queryByRole('list', { name: 'Data sets' }),
        ).toBeNull(),
      );

      const addMatView = await renderResult.findByRole('button', {
        name: 'Add MatView',
      });
      await waitFor(() =>
        expect((addMatView as HTMLButtonElement).disabled).toBe(false),
      );
      fireEvent.click(addMatView);
      const form = await renderResult.findByTestId(
        EMBEDDED_CUBE_TEST_ID.ADD_MATERIALIZED_VIEW,
      );
      const matViewDialog = form.closest('[role="dialog"]') as HTMLElement;
      const add = within(matViewDialog).getByRole<HTMLButtonElement>('button', {
        name: 'Add',
      });
      fireEvent.change(within(form).getByLabelText('Materialized view name'), {
        target: { value: 'TRADES_VIEW' },
      });
      // a classification is needed: one of the data product's
      const classification = within(form).getByLabelText<HTMLSelectElement>(
        'Data classification',
      );
      expect([...classification.options].map((option) => option.value)).toEqual(
        ['', 'DP00', 'DP10', 'DP20'],
      );
      expect(add.disabled).toBe(true);
      fireEvent.change(classification, { target: { value: 'DP10' } });
      expect(add.disabled).toBe(false);
      // the key is any of the cube's columns, kept in their order
      const keyColumns = within(form).getByRole('list', {
        name: 'Primary key columns',
      });
      expect(
        within(keyColumns)
          .getAllByRole('checkbox')
          .map((box) => box.closest('label')?.textContent),
      ).toEqual(['TRADE_ID', 'DESK_ID', 'NOTIONAL_USD']);
      fireEvent.click(within(keyColumns).getByLabelText('DESK_ID'));
      fireEvent.click(within(keyColumns).getByLabelText('TRADE_ID'));
      fireEvent.click(add);

      const ingest = ingestOf(editorStore);
      expect(editorStore.embeddedCubeState.isOpen).toBe(false);
      expect((ingest.content.datasets as PlainObject[]).at(-1)).toMatchObject({
        name: 'TRADES_VIEW',
        primaryKey: ['TRADE_ID', 'DESK_ID'],
        privacyClassification: { sensitivity: 'DP10' },
        source: {
          _type: 'FunctionSource',
          function: { _type: 'lambda', parameters: [] },
        },
      });
    },
  );

  test(
    integrationTest(
      'Edit MatView reads the view back into the steps that wrote it, and Save MatView replaces it in place',
    ),
    async () => {
      const { editorStore, renderResult } = await setUp([
        TRADES_INGEST_WITH_VIEW,
        LAKEHOUSE_RUNTIME,
      ]);
      await TEST__openElementFromExplorerTree(INGEST_PATH, renderResult);
      const editorGroup = await waitFor(() =>
        renderResult.getByTestId(LEGEND_STUDIO_TEST_ID.EDITOR_GROUP),
      );
      fireEvent.click(
        await findByTitle(editorGroup, 'Edit a materialized view with Cube'),
      );
      fireEvent.click(await renderResult.findByText('Edit MatView BIG_TRADES'));
      const { embeddedCubeState } = editorStore;
      expect(embeddedCubeState.matView).toBe('BIG_TRADES');
      await renderResult.findByText(
        `Edit MatView BIG_TRADES of ${INGEST_PATH} with Cube`,
      );
      // the view's three steps, on Cube's canvas, and nothing to say: Cube
      // writes them back the same
      await waitFor(() =>
        expect(
          renderResult.queryAllByTestId(LEGEND_CUBE_TEST_ID.CANVAS_NODE),
        ).toHaveLength(3),
      );
      expect(
        renderResult.queryByTestId(LEGEND_CUBE_TEST_ID.LAMBDA_IMPORT),
      ).toBeNull();
      await renderResult.findByRole('button', { name: 'Save MatView' });
      // its classification and its key, among the step's columns, are kept:
      // nothing to ask again
      expect(
        embeddedCubeState.getMaterializedViewSaveProblems([
          'DESK_ID',
          'TOTAL_USD',
        ]),
      ).toEqual([]);

      const ingest = ingestOf(editorStore);
      const hashBefore = ingest.hashCode;
      act(() => {
        embeddedCubeState.saveMaterializedView(TRADES_LAMBDA);
      });
      expect(embeddedCubeState.isOpen).toBe(false);
      // replaced where it was, its other keys kept, with the lists the
      // engine reads that it lacked
      expect(getIngestDataSetNames(ingest)).toEqual([
        'TRADES',
        'DESKS',
        'BIG_TRADES',
      ]);
      expect((ingest.content.datasets as object[]).at(-1)).toEqual({
        name: 'BIG_TRADES',
        primaryKey: ['DESK_ID'],
        privacyClassification: { sensitivity: 'DP10' },
        source: { _type: 'FunctionSource', function: TRADES_LAMBDA },
        ingestPartitionColumns: [],
        preprocessors: [],
        storageLayoutClusterColumns: [],
        storageLayoutPartitionColumns: [],
      });
      expect(
        ingest.TEMPORARY_MATVIEW_FUNCTION_DATA_SETS?.map((each) => [
          each.name,
          each.source.function.body,
        ]),
      ).toEqual([['BIG_TRADES', TRADES_LAMBDA.body]]);
      expect(ingest.hashCode).not.toBe(hashBefore);
      await renderResult.findByText(
        'Saved materialized view BIG_TRADES of TradesIngest',
      );
    },
  );

  test(
    integrationTest(
      "Save MatView asks again for what a view can't be saved with as it was: a classification of its data it lacks, and a primary key whose column is gone",
    ),
    async () => {
      // as Studio wrote a view before it asked for a classification, keyed
      // by a column the view's rows no longer have
      const { editorStore, renderResult } = await setUp([
        tradesIngestWithView({ primaryKey: ['TRADE_ID'] }),
        LAKEHOUSE_RUNTIME,
      ]);
      await TEST__openElementFromExplorerTree(INGEST_PATH, renderResult);
      const editorGroup = await waitFor(() =>
        renderResult.getByTestId(LEGEND_STUDIO_TEST_ID.EDITOR_GROUP),
      );
      fireEvent.click(
        await findByTitle(editorGroup, 'Edit a materialized view with Cube'),
      );
      fireEvent.click(await renderResult.findByText('Edit MatView BIG_TRADES'));
      const { embeddedCubeState } = editorStore;
      const problems = [
        'BIG_TRADES has no classification of its data.',
        "Its primary key's TRADE_ID is no longer a column of the cube.",
      ];
      expect(
        embeddedCubeState.getMaterializedViewSaveProblems([
          'DESK_ID',
          'TOTAL_USD',
        ]),
      ).toEqual(problems);
      // the key isn't checked when Cube doesn't know the step's columns
      expect(
        embeddedCubeState.getMaterializedViewSaveProblems(undefined),
      ).toEqual(['BIG_TRADES has no classification of its data.']);

      const saveMatView = await renderResult.findByRole('button', {
        name: 'Save MatView',
      });
      await waitFor(() =>
        expect((saveMatView as HTMLButtonElement).disabled).toBe(false),
      );
      fireEvent.click(saveMatView);
      const form = await renderResult.findByTestId(
        EMBEDDED_CUBE_TEST_ID.SAVE_MATERIALIZED_VIEW,
      );
      expect(
        within(
          within(form).getByRole('list', { name: 'Why Save MatView asks' }),
        )
          .getAllByRole('listitem')
          .map((item) => item.textContent),
      ).toEqual(problems);
      const saveDialog = form.closest('[role="dialog"]') as HTMLElement;
      const save = within(saveDialog).getByRole<HTMLButtonElement>('button', {
        name: 'Save',
      });
      // its data must be classified: typed, as Studio's config gives no
      // classifications to pick from
      expect(save.disabled).toBe(true);
      fireEvent.change(within(form).getByLabelText('Data classification'), {
        target: { value: 'DP20' },
      });
      expect(save.disabled).toBe(false);
      // the key starts on the columns of it the step still has: none
      const keyColumns = within(form).getByRole('list', {
        name: 'Primary key columns',
      });
      expect(
        within(keyColumns)
          .getAllByRole<HTMLInputElement>('checkbox')
          .map((box) => [box.closest('label')?.textContent, box.checked]),
      ).toEqual([
        ['DESK_ID', false],
        ['TOTAL_USD', false],
      ]);
      fireEvent.click(within(keyColumns).getByLabelText('DESK_ID'));
      fireEvent.click(save);

      const ingest = ingestOf(editorStore);
      expect(embeddedCubeState.isOpen).toBe(false);
      expect((ingest.content.datasets as PlainObject[]).at(-1)).toMatchObject({
        name: 'BIG_TRADES',
        primaryKey: ['DESK_ID'],
        privacyClassification: { sensitivity: 'DP20' },
        source: {
          _type: 'FunctionSource',
          function: { _type: 'lambda', parameters: [] },
        },
        ingestPartitionColumns: [],
        preprocessors: [],
        storageLayoutClusterColumns: [],
        storageLayoutPartitionColumns: [],
      });
      await renderResult.findByText(
        'Saved materialized view BIG_TRADES of TradesIngest',
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
