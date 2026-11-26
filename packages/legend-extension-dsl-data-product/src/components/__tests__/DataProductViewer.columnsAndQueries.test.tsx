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

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  jest,
  test,
} from '@jest/globals';
import {
  act,
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import {
  type PlainObject,
  guaranteeNonNullable,
  DocumentationEntry,
} from '@finos/legend-shared';
import type * as LegendApplication from '@finos/legend-application';
import { DocumentationService } from '@finos/legend-application';
import {
  type V1_BatchLambdaRelationTypeResponse,
  type V1_DataProduct,
  V1_dataProductModelSchema,
} from '@finos/legend-graph';
import { LEGEND_CUBE_TEST_ID } from '@finos/legend-cube-builder/definition-flow';
import { deserialize } from 'serializr';
import {
  mockEntitlementsSDLCDataProduct,
  mockSDLCDataProduct,
  mockSDLCDataProductDatabricksAP,
  mockSDLCDataProductParameterizedAP,
  mockSDLCDataProductTypedParametersAP,
  mockSDLCDataProductWithSampleValues,
  buildMockDataProductArtifactWithSampleQueries,
  MOCK__TDS_SAMPLE_QUERY_ID,
  MOCK__RELATION_SAMPLE_QUERY_ID,
  MOCK__TDS_COLUMN_SAMPLE_VALUES,
} from '../__test-utils__/TEST_DATA__LakehouseDataProducts.js';
import { createSpy } from '@finos/legend-shared/test';
import {
  MockedMonacoEditorAPI,
  MockedMonacoEditorInstance,
  MockedMonacoEditorModel,
} from '@finos/legend-lego/code-editor/test';
import DEFINITIONS from '../__test-utils__/TEST_DATA__AccessPointDefinitionFlow.json' with { type: 'json' };
import FUNCTIONS from '../__test-utils__/TEST_DATA__AccessPointFunctions.json' with { type: 'json' };
import { DATA_PRODUCT_EVENT } from '../../__lib__/DataProductTelemetryHelper.js';
import { setupLakehouseDataProductTest } from './DataProductViewerTestUtils.js';

jest.mock('react-oidc-context', () => {
  const { MOCK__reactOIDCContext } = jest.requireActual<{
    MOCK__reactOIDCContext: Record<PropertyKey, unknown>;
  }>('@finos/legend-shared/test');
  return MOCK__reactOIDCContext;
});

jest.mock('swiper/react', () => ({
  Swiper: ({}) => <div></div>,
  SwiperSlide: ({}) => <div></div>,
}));

jest.mock('swiper/modules', () => ({
  Navigation: ({}) => <div></div>,
  Pagination: ({}) => <div></div>,
  Autoplay: ({}) => <div></div>,
}));

jest.mock('react-dnd', () => ({
  useDrop: () => [{ isOver: false }, jest.fn()],
  useDrag: () => [{}, jest.fn()],
}));

jest.mock('@finos/legend-application', () => ({
  ...jest.requireActual<typeof LegendApplication>('@finos/legend-application'),
  useApplicationStore: jest.fn().mockReturnValue({
    layoutService: {
      TEMPORARY__isLightColorThemeEnabled: true,
    },
    pluginManager: {
      getApplicationPlugins: jest.fn().mockReturnValue([]),
    },
  }),
}));

// the engine's relation type for the only access point of the mock data products:
// columns without a description
const relationTypeWithColumns =
  (count: number) => async (): Promise<V1_BatchLambdaRelationTypeResponse> => ({
    result: {
      'GROUP1::customer_demographics': {
        _type: 'relationType',
        columns: Array.from({ length: count }, (_, index) => ({
          name: `col_${index + 1}`,
          multiplicity: { lowerBound: 1, upperBound: 1 },
          genericType: {
            multiplicityArguments: [],
            typeArguments: [],
            rawType: { _type: 'packageableType', fullPath: 'String' },
            typeVariableValues: [],
          },
        })),
      },
    } as unknown as V1_BatchLambdaRelationTypeResponse['result'],
    errors: {},
  });

describe('DataProductViewer', () => {
  describe('Access point tabs: Pure Query and the definition', () => {
    const ACCESSOR = '#P{test::Mock_SDLC_DataProduct.customer_demographics}#';
    const DEFINITION =
      "|#I{test::IngestDefinition.CUSTOMERS}#\n  ->filter(c|$c.ACTIVE == 'Y')";
    let writeText: jest.Mock<(text: string) => Promise<void>>;

    beforeEach(() => {
      jest.spyOn(MockedMonacoEditorAPI, 'create').mockReturnValue({
        ...MockedMonacoEditorInstance,
        getValue: jest.fn().mockReturnValue(''),
      });
      jest
        .spyOn(MockedMonacoEditorAPI, 'createModel')
        .mockReturnValue(MockedMonacoEditorModel);
      // jsdom has no clipboard
      writeText = jest
        .fn<(text: string) => Promise<void>>()
        .mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText },
        configurable: true,
      });
    });

    afterEach(() => {
      Reflect.deleteProperty(navigator, 'clipboard');
    });

    // NOTE: these tests find elements by text or by label: a query by role reads
    // every element of the page, which takes seconds on a slow machine
    const openPureQuery = async (): Promise<void> => {
      await screen.findByText('Customer Demographics');
      await act(async () => {
        fireEvent.click(await screen.findByText('Pure Query'));
      });
    };

    // copies a code block, and returns what went to the clipboard
    const copyCode = async (label: string): Promise<string | undefined> => {
      const button = await screen.findByLabelText(label);
      // the clipboard write resolves in a microtask: the async act waits for it
      // and renders "Copied"
      await act(async () => {
        fireEvent.click(button);
      });
      expect(
        button.classList.contains('data-product__viewer__code-copy--copied'),
      ).toBe(true);
      return writeText.mock.lastCall?.[0];
    };

    test('shows Pure Query and Legend Query after Column Specifications, and no Grammar tab', async () => {
      await setupLakehouseDataProductTest(
        mockSDLCDataProduct,
        mockEntitlementsSDLCDataProduct,
        [],
        [],
      );

      const tabList = guaranteeNonNullable(
        (await screen.findByText('Column Specifications')).closest<HTMLElement>(
          '[role=tablist]',
        ),
      );
      const tabs = within(tabList).getAllByRole('tab');
      expect(tabs.map((tab) => tab.textContent)).toEqual([
        'Column Specifications',
        'Pure Query',
        'Legend Query',
        'Service',
        'Datacube',
        'Governance',
        'Power BI',
        'SQL',
      ]);
      expect(within(tabList).queryByText('Grammar')).toBeNull();
    });

    test('Pure Query shows the accessor of the access point, and an example with every column', async () => {
      const { dataProductViewerState } = await setupLakehouseDataProductTest(
        mockSDLCDataProduct,
        mockEntitlementsSDLCDataProduct,
        [],
        [],
      );
      const fetchGrammarSpy = jest.spyOn(
        guaranteeNonNullable(
          dataProductViewerState.apgStates[0]?.accessPointStates[0],
        ),
        'fetchGrammar',
      );

      await openPureQuery();

      screen.getByText(
        "Returns this access point's rows as a relation. Use it in a Pure query, for example in a function in Studio.",
      );
      expect(
        screen.queryByText(/^Replace each parameter with a value/),
      ).toBeNull();
      expect(await copyCode('Copy accessor')).toBe(ACCESSOR);
      await screen.findByText(
        "Every column, first 100 rows. Delete the columns you don't need.",
      );
      expect(await copyCode('Copy example')).toBe(
        `${ACCESSOR}\n  ->select(~[varchar_val, int_val])\n  ->take(100)`,
      );
      // the definition is not what Pure Query shows
      expect(fetchGrammarSpy).not.toHaveBeenCalled();
    });

    test('Pure Query puts the parameters of a parameterized access point in parentheses, with their types', async () => {
      await setupLakehouseDataProductTest(
        mockSDLCDataProductTypedParametersAP,
        mockEntitlementsSDLCDataProduct,
        [],
        [],
      );

      await openPureQuery();

      expect(
        (await screen.findByText(/^Replace each parameter with a value/))
          .textContent,
      ).toBe(
        'Replace each parameter with a value: businessDate (StrictDate), clientAccountId (String).',
      );
      const accessor =
        '#P{test::Mock_SDLC_DataProduct.customer_demographics(businessDate, clientAccountId)}#';
      expect(await copyCode('Copy accessor')).toBe(accessor);
      expect(await copyCode('Copy example')).toBe(
        `${accessor}\n  ->select(~[varchar_val, int_val])\n  ->take(100)`,
      );
    });

    test('Pure Query names a parameter without a type', async () => {
      await setupLakehouseDataProductTest(
        mockSDLCDataProductParameterizedAP,
        mockEntitlementsSDLCDataProduct,
        [],
        [],
      );

      await openPureQuery();

      expect(
        (await screen.findByText(/^Replace each parameter with a value/))
          .textContent,
      ).toBe('Replace each parameter with a value: startDate.');
      expect(await copyCode('Copy accessor')).toBe(
        '#P{test::Mock_SDLC_DataProduct.customer_demographics(startDate)}#',
      );
    });

    test('Pure Query example selects all 20 columns of an access point with 20', async () => {
      await setupLakehouseDataProductTest(
        mockSDLCDataProduct,
        mockEntitlementsSDLCDataProduct,
        [],
        [],
        undefined,
        undefined,
        undefined,
        undefined,
        { batchLambdasRelationType: relationTypeWithColumns(20) },
      );

      await openPureQuery();

      await screen.findByText(
        "Every column, first 100 rows. Delete the columns you don't need.",
      );
      const example = guaranteeNonNullable(await copyCode('Copy example'));
      // too long for one line: the columns go on lines of their own
      expect(example.startsWith(`${ACCESSOR}\n  ->select(~[\n    col_1,`)).toBe(
        true,
      );
      expect(example.endsWith('col_20\n  ])\n  ->take(100)')).toBe(true);
      expect(example.match(/col_\d+/gu)).toEqual(
        Array.from({ length: 20 }, (_, index) => `col_${index + 1}`),
      );
    });

    test('Pure Query example selects no columns by name for an access point with more than 20', async () => {
      await setupLakehouseDataProductTest(
        mockSDLCDataProduct,
        mockEntitlementsSDLCDataProduct,
        [],
        [],
        undefined,
        undefined,
        undefined,
        undefined,
        { batchLambdasRelationType: relationTypeWithColumns(21) },
      );

      await openPureQuery();

      expect(
        (await screen.findByText(/^First 100 rows\. This access point has/))
          .textContent,
      ).toBe(
        'First 100 rows. This access point has 21 columns: add ->select(~[…]) with the ones you need.',
      );
      expect(await copyCode('Copy example')).toBe(`${ACCESSOR}\n  ->take(100)`);
    });

    test('Pure Query shows for a Databricks access point', async () => {
      await setupLakehouseDataProductTest(
        mockSDLCDataProductDatabricksAP,
        mockEntitlementsSDLCDataProduct,
        [],
        [],
      );

      await openPureQuery();

      expect(await copyCode('Copy accessor')).toBe(ACCESSOR);
      expect(
        screen.queryByText(
          'This feature is not supported for access points deployed to Databricks.',
        ),
      ).toBeNull();
    });

    test('the code boxes are as tall as their code, long lines wrapped, the definition up to 20 lines', async () => {
      // NOTE: jsdom lays nothing out, so the editor's content height is given
      // here: the height of its lines once long lines wrap, and its padding
      type ContentSizeListener = (event: {
        contentHeight: number;
        contentHeightChanged: boolean;
      }) => void;
      let contentHeight = 100;
      const contentSizeListeners = new Set<ContentSizeListener>();
      jest.spyOn(MockedMonacoEditorAPI, 'create').mockReturnValue({
        ...MockedMonacoEditorInstance,
        getValue: jest.fn().mockReturnValue(''),
        getContentHeight: jest.fn(() => contentHeight),
        onDidContentSizeChange: jest.fn((listener: ContentSizeListener) => {
          contentSizeListeners.add(listener);
          return { dispose: () => contentSizeListeners.delete(listener) };
        }),
      });
      // as the editor lays its code out again, e.g. in a narrower or wider panel
      const resizeContent = async (height: number): Promise<void> => {
        contentHeight = height;
        await act(async () => {
          contentSizeListeners.forEach((listener) =>
            listener({ contentHeight: height, contentHeightChanged: true }),
          );
        });
      };
      const { dataProductViewerState } = await setupLakehouseDataProductTest(
        mockSDLCDataProduct,
        mockEntitlementsSDLCDataProduct,
        [],
        [],
      );
      createSpy(
        dataProductViewerState.engineServerClient,
        'JSONToGrammar_lambda',
      ).mockResolvedValue(DEFINITION);

      await act(async () => {
        fireEvent.click(await screen.findByText('View definition'));
      });
      const definition = await screen.findByLabelText('Definition');
      // the definition opens on its flow: its Pure is one click away
      await act(async () => {
        fireEvent.click(within(definition).getByText('Pure'));
      });
      const definitionBox = guaranteeNonNullable(
        definition.querySelector<HTMLElement>(
          '.data-product__viewer__code-box',
        ),
      );
      // 2 lines, the first wrapped into 3: as tall as 4 lines, not 2
      await waitFor(() => expect(definitionBox.style.height).toBe('100px'));
      // narrower, a long line wraps into more: the box grows
      await resizeContent(160);
      expect(definitionBox.style.height).toBe('160px');
      // past 20 lines, the box stops growing and the code scrolls
      await resizeContent(600);
      expect(definitionBox.style.height).toBe('420px');
      // wider, fewer wraps: the box shrinks
      await resizeContent(60);
      expect(definitionBox.style.height).toBe('60px');

      // the accessor has no such limit
      await act(async () => {
        fireEvent.click(screen.getByText('Hide definition'));
      });
      contentHeight = 600;
      await openPureQuery();
      const accessorBox = guaranteeNonNullable(
        (await screen.findByLabelText('Copy accessor'))
          .closest('.data-product__viewer__pure-query__block')
          ?.querySelector<HTMLElement>('.data-product__viewer__code-box'),
      );
      await waitFor(() => expect(accessorBox.style.height).toBe('600px'));
    });

    test('Column Specifications shows the column count, and the definition only once opened', async () => {
      const { dataProductViewerState } = await setupLakehouseDataProductTest(
        mockSDLCDataProduct,
        mockEntitlementsSDLCDataProduct,
        [],
        [],
      );
      const jsonToGrammarSpy = createSpy(
        dataProductViewerState.engineServerClient,
        'JSONToGrammar_lambda',
      ).mockResolvedValue(DEFINITION);

      await screen.findByText('Customer Demographics');
      await screen.findByText('2 columns');
      expect(screen.queryByLabelText('Definition')).toBeNull();
      expect(jsonToGrammarSpy).not.toHaveBeenCalled();

      const viewDefinition = await screen.findByText('View definition');
      expect(viewDefinition.tagName).toBe('BUTTON');
      expect(viewDefinition.getAttribute('aria-expanded')).toBe('false');
      await act(async () => {
        fireEvent.click(viewDefinition);
      });

      const definition = await screen.findByLabelText('Definition');
      expect(definition.tagName).toBe('SECTION');
      within(definition).getByText('Definition');
      expect(
        within(definition).getByText(/^How the producer defined/).textContent,
      ).toBe(
        'How the producer defined this access point. To query it, use Pure Query.',
      );
      expect(await copyCode('Copy definition')).toBe(DEFINITION);
      expect(jsonToGrammarSpy).toHaveBeenCalledTimes(1);

      const hideDefinition = screen.getByText('Hide definition');
      expect(hideDefinition).toBe(viewDefinition);
      expect(hideDefinition.getAttribute('aria-expanded')).toBe('true');
      await act(async () => {
        fireEvent.click(hideDefinition);
      });
      expect(screen.queryByLabelText('Definition')).toBeNull();
      // the column grid stays
      screen.getByText('Column Name');
    });
  });

  describe('Access point definition as a Legend Cube flow', () => {
    // the made-up definitions Legend Cube's own tests read
    const PURE =
      "|#I{markets::ingest::TradePositionsIngest.EOD_POSITIONS}#\n  ->filter(p|$p.STATUS == 'SIGNED_OFF')";
    const DATA_PRODUCT = 'test::Mock_SDLC_DataProduct';
    let writeText: jest.Mock<(text: string) => Promise<void>>;

    beforeEach(() => {
      jest.spyOn(MockedMonacoEditorAPI, 'create').mockReturnValue({
        ...MockedMonacoEditorInstance,
        getValue: jest.fn().mockReturnValue(''),
      });
      jest
        .spyOn(MockedMonacoEditorAPI, 'createModel')
        .mockReturnValue(MockedMonacoEditorModel);
      // jsdom has no clipboard
      writeText = jest
        .fn<(text: string) => Promise<void>>()
        .mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText },
        configurable: true,
      });
    });

    afterEach(() => {
      Reflect.deleteProperty(navigator, 'clipboard');
    });

    /** A data product whose access point is defined by the function */
    const dataProductDefinedBy = (func: PlainObject): V1_DataProduct =>
      deserialize(V1_dataProductModelSchema([]), {
        _type: 'dataProduct',
        package: 'test',
        name: 'Mock_SDLC_DataProduct',
        title: 'Mock SDLC Data Product',
        accessPointGroups: [
          {
            _type: 'defaultAccessPointGroup',
            id: 'GROUP1',
            title: 'Main Group Test',
            accessPoints: [
              {
                _type: 'lakehouseAccessPoint',
                id: 'customer_demographics',
                title: 'Customer Demographics',
                targetEnvironment: 'Snowflake',
                func,
              },
            ],
          },
        ],
      });

    /** The ingest definition the definitions read, as Depot's entity holds it */
    const loadTradePositionsIngest = async (
      path: string,
    ): Promise<PlainObject | undefined> =>
      path === DEFINITIONS.ingestDefinition
        ? (DEFINITIONS.ingestDefinitionContent as PlainObject)
        : undefined;

    const setupDefinition = async (
      func: PlainObject,
      loadIngestDefinition?: (path: string) => Promise<PlainObject | undefined>,
    ) => {
      const result = await setupLakehouseDataProductTest(
        dataProductDefinedBy(func),
        mockEntitlementsSDLCDataProduct,
        [],
        [],
        undefined,
        undefined,
        { loadIngestDefinition },
      );
      const jsonToGrammar = createSpy(
        result.dataProductViewerState.engineServerClient,
        'JSONToGrammar_lambda',
      ).mockResolvedValue(PURE);
      const logEvent = jest.spyOn(
        result.dataProductViewerState.applicationStore.telemetryService,
        'logEvent',
      );
      return { ...result, jsonToGrammar, logEvent };
    };

    // NOTE: these tests find elements by text or by label: a query by role reads
    // every element of the page, which takes seconds on a slow machine
    const openDefinition = async (): Promise<HTMLElement> => {
      await screen.findByText('Customer Demographics');
      const toggle = await screen.findByText('View definition');
      await act(async () => {
        fireEvent.click(toggle);
      });
      return screen.findByLabelText('Definition');
    };

    const findFlowNodes = async (
      definition: HTMLElement,
      count: number,
    ): Promise<HTMLElement[]> => {
      const flow = await within(definition).findByTestId(
        LEGEND_CUBE_TEST_ID.DEFINITION_FLOW,
      );
      await waitFor(() =>
        expect(
          within(flow).getAllByTestId(LEGEND_CUBE_TEST_ID.CANVAS_NODE),
        ).toHaveLength(count),
      );
      return within(flow).getAllByTestId(LEGEND_CUBE_TEST_ID.CANVAS_NODE);
    };

    const showsPure = (definition: HTMLElement): boolean =>
      definition.querySelector('.data-product__viewer__code-box') !== null;

    test('opens on the flow Legend Cube draws, typed by the ingest definition the host gives, and Copy copies the Pure', async () => {
      const loadIngestDefinition = jest.fn(loadTradePositionsIngest);
      const { logEvent } = await setupDefinition(
        DEFINITIONS.accessPoints.POSITIONS_BY_LEGAL_ENTITY,
        loadIngestDefinition,
      );

      const definition = await openDefinition();
      // two data sets, a filter, a join and a group
      await findFlowNodes(definition, 5);
      expect(
        within(definition).getByText('Flow').getAttribute('aria-pressed'),
      ).toBe('true');
      expect(showsPure(definition)).toBe(false);
      expect(loadIngestDefinition.mock.calls).toEqual([
        [DEFINITIONS.ingestDefinition],
      ]);
      expect(
        within(definition).queryByText(/^Couldn't load the columns/),
      ).toBeNull();
      expect(logEvent).toHaveBeenCalledWith(
        DATA_PRODUCT_EVENT.SHOW_ACCESS_POINT_DEFINITION_FLOW,
        expect.objectContaining({
          dataProduct: DATA_PRODUCT,
          accessPointGroup: 'GROUP1',
          accessPoint: 'customer_demographics',
          steps: 5,
          unknownDataSets: [],
        }),
      );

      // Copy copies the Pure, whichever view shows
      const copy = await within(definition).findByLabelText('Copy definition');
      await act(async () => {
        fireEvent.click(copy);
      });
      expect(writeText.mock.lastCall?.[0]).toBe(PURE);

      await act(async () => {
        fireEvent.click(within(definition).getByText('Pure'));
      });
      expect(
        within(definition).queryByTestId(LEGEND_CUBE_TEST_ID.DEFINITION_FLOW),
      ).toBeNull();
      expect(showsPure(definition)).toBe(true);

      // the definition is read once: shown again, it opens on the flow
      await act(async () => {
        fireEvent.click(screen.getByText('Hide definition'));
      });
      await findFlowNodes(await openDefinition(), 5);
      expect(loadIngestDefinition).toHaveBeenCalledTimes(1);
      expect(
        logEvent.mock.calls.filter(
          ([event]) =>
            event === DATA_PRODUCT_EVENT.SHOW_ACCESS_POINT_DEFINITION_FLOW,
        ),
      ).toHaveLength(1);
    });

    test("draws the data sets by name when their columns can't be loaded, and says so", async () => {
      const { logEvent } = await setupDefinition(
        DEFINITIONS.accessPoints.POSITIONS_BY_LEGAL_ENTITY,
        () => Promise.reject(new Error('Depot is unavailable')),
      );

      const definition = await openDefinition();
      await findFlowNodes(definition, 5);
      within(definition).getByText(
        "Couldn't load the columns of EOD_POSITIONS and LEGAL_ENTITIES, so the steps after them aren't checked.",
      );
      expect(logEvent).toHaveBeenCalledWith(
        DATA_PRODUCT_EVENT.SHOW_ACCESS_POINT_DEFINITION_FLOW,
        expect.objectContaining({
          unknownDataSets: [
            `${DEFINITIONS.ingestDefinition}.EOD_POSITIONS`,
            `${DEFINITIONS.ingestDefinition}.LEGAL_ENTITIES`,
          ],
        }),
      );
    });

    test("draws a definition of a data set's batch metadata, its columns known with no ingest definition to load", async () => {
      const loadIngestDefinition = jest.fn(loadTradePositionsIngest);
      // the batches that succeeded: `#I{…EOD_POSITIONS|metadata}#`, as
      // legend-graph writes its accessor
      const { logEvent } = await setupDefinition(
        {
          _type: 'lambda',
          parameters: [],
          body: [
            {
              _type: 'func',
              function: 'filter',
              parameters: [
                {
                  _type: 'classInstance',
                  type: 'I',
                  value: {
                    metadata: true,
                    accessorQualifier: 'metadata',
                    path: [DEFINITIONS.ingestDefinition, 'EOD_POSITIONS'],
                  },
                },
                {
                  _type: 'lambda',
                  parameters: [{ _type: 'var', name: 'b' }],
                  body: [
                    {
                      _type: 'func',
                      function: 'equal',
                      parameters: [
                        {
                          _type: 'property',
                          property: 'batch_status',
                          parameters: [{ _type: 'var', name: 'b' }],
                        },
                        { _type: 'string', value: 'SUCCESS' },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
        loadIngestDefinition,
      );

      const definition = await openDefinition();
      // the batch metadata, then the filter
      const [metadata] = await findFlowNodes(definition, 2);
      expect(metadata?.textContent).toContain('EOD_POSITIONS metadata');
      expect(
        within(definition).queryByText(/^No flow for this definition/),
      ).toBeNull();
      expect(
        within(definition).queryByText(/^Couldn't load the columns/),
      ).toBeNull();
      expect(loadIngestDefinition).not.toHaveBeenCalled();
      expect(logEvent).toHaveBeenCalledWith(
        DATA_PRODUCT_EVENT.SHOW_ACCESS_POINT_DEFINITION_FLOW,
        expect.objectContaining({ steps: 2, unknownDataSets: [] }),
      );
    });

    test('draws a definition that takes parameters, each wired into the step that reads it', async () => {
      const { logEvent } = await setupDefinition(
        DEFINITIONS.accessPoints.CLIENT_POSITIONS,
        loadTradePositionsIngest,
      );

      const definition = await openDefinition();
      // the data set, a filter on the two parameters, the columns kept
      await findFlowNodes(definition, 3);
      expect(
        within(definition).getByText('Flow').getAttribute('aria-pressed'),
      ).toBe('true');
      expect(
        within(definition)
          .getAllByTestId(LEGEND_CUBE_TEST_ID.DEFINITION_FLOW_PARAMETER)
          .map((parameter) => parameter.textContent),
      ).toEqual(['$businessDateStrictDate', '$clientAccountIdString']);
      expect(
        within(definition).queryByText(/^No flow for this definition/),
      ).toBeNull();
      expect(logEvent).toHaveBeenCalledWith(
        DATA_PRODUCT_EVENT.SHOW_ACCESS_POINT_DEFINITION_FLOW,
        expect.objectContaining({ steps: 3, unknownDataSets: [] }),
      );
    });

    test("shows the Pure when Legend Cube can't draw the definition, with why, and Flow can't be picked", async () => {
      // a parameter where Cube's flow doesn't show one: a limit's size
      const clientPositions = DEFINITIONS.accessPoints.CLIENT_POSITIONS as {
        parameters: unknown[];
        body: unknown[];
      };
      const { logEvent } = await setupDefinition(
        {
          ...clientPositions,
          parameters: [
            ...clientPositions.parameters,
            {
              _type: 'var',
              name: 'rows',
              genericType: {
                rawType: { _type: 'packageableType', fullPath: 'Integer' },
                typeArguments: [],
                multiplicityArguments: [],
                typeVariableValues: [],
              },
              multiplicity: { lowerBound: 1, upperBound: 1 },
            },
          ],
          body: [
            {
              _type: 'func',
              function: 'limit',
              parameters: [
                clientPositions.body[0],
                { _type: 'var', name: 'rows' },
              ],
            },
          ],
        },
        loadTradePositionsIngest,
      );

      const definition = await openDefinition();
      await within(definition).findByText(
        "No flow for this definition: it uses a parameter in its limit(), which Cube's flow doesn't show yet.",
      );
      // Cube's own words
      within(definition).getByText('Details');
      await waitFor(() => expect(showsPure(definition)).toBe(true));
      const flowOption = within(definition).getByText('Flow');
      expect(flowOption.getAttribute('aria-disabled')).toBe('true');
      expect(
        within(definition).getByText('Pure').getAttribute('aria-pressed'),
      ).toBe('true');
      await act(async () => {
        fireEvent.click(flowOption);
      });
      expect(
        within(definition).queryByTestId(LEGEND_CUBE_TEST_ID.DEFINITION_FLOW),
      ).toBeNull();
      expect(showsPure(definition)).toBe(true);
      expect(logEvent).toHaveBeenCalledWith(
        DATA_PRODUCT_EVENT.REFUSE_ACCESS_POINT_DEFINITION_FLOW,
        expect.objectContaining({
          accessPoint: 'customer_demographics',
          reason: 'parameters',
          functionName: 'limit',
        }),
      );
    });

    test("says when Legend Cube's code didn't load, shows the Pure on demand, and tries again", async () => {
      const { dataProductViewerState, logEvent } = await setupDefinition(
        DEFINITIONS.accessPoints.POSITIONS_BY_LEGAL_ENTITY,
        loadTradePositionsIngest,
      );
      const load = createSpy(
        dataProductViewerState,
        'loadDefinitionFlowEntry',
      ).mockRejectedValueOnce(new Error('Loading chunk cube-flow failed.'));

      const definition = await openDefinition();
      await within(definition).findByText("Couldn't load the flow");
      expect(logEvent).toHaveBeenCalledWith(
        DATA_PRODUCT_EVENT.FAIL_ACCESS_POINT_DEFINITION_FLOW,
        expect.objectContaining({
          accessPoint: 'customer_demographics',
          failure: 'load',
          error: 'Loading chunk cube-flow failed.',
        }),
      );

      await act(async () => {
        fireEvent.click(within(definition).getByText('Show the Pure'));
      });
      await waitFor(() => expect(showsPure(definition)).toBe(true));
      expect(
        within(definition).getByText('Pure').getAttribute('aria-pressed'),
      ).toBe('true');

      await act(async () => {
        fireEvent.click(within(definition).getByText('Flow'));
      });
      await act(async () => {
        fireEvent.click(within(definition).getByText('Try again'));
      });
      await findFlowNodes(definition, 5);
      expect(load).toHaveBeenCalledTimes(2);
    });

    test('says when neither the flow nor the Pure can be shown, and tries both again', async () => {
      const { dataProductViewerState, jsonToGrammar } = await setupDefinition(
        DEFINITIONS.accessPoints.POSITIONS_BY_LEGAL_ENTITY,
        loadTradePositionsIngest,
      );
      const load = createSpy(
        dataProductViewerState,
        'loadDefinitionFlowEntry',
      ).mockRejectedValueOnce(new Error('Loading chunk cube-flow failed.'));
      jsonToGrammar.mockRejectedValueOnce(new Error('The engine is down'));

      const definition = await openDefinition();
      await within(definition).findByText(
        "Couldn't load this access point's definition",
      );
      // neither view to switch to, and no Pure to copy
      expect(within(definition).queryByText('Flow')).toBeNull();
      expect(within(definition).queryByLabelText('Copy definition')).toBeNull();

      await act(async () => {
        fireEvent.click(within(definition).getByText('Try again'));
      });
      await findFlowNodes(definition, 5);
      await within(definition).findByLabelText('Copy definition');
      expect(load).toHaveBeenCalledTimes(2);
      expect(jsonToGrammar).toHaveBeenCalledTimes(2);
    });

    test('keeps a flow that fails while drawing inside the panel', async () => {
      const { dataProductViewerState, logEvent } = await setupDefinition(
        DEFINITIONS.accessPoints.POSITIONS_BY_LEGAL_ENTITY,
        loadTradePositionsIngest,
      );
      const entry = await dataProductViewerState.loadDefinitionFlowEntry();
      createSpy(
        dataProductViewerState,
        'loadDefinitionFlowEntry',
      ).mockResolvedValue({
        ...entry,
        CubeDefinitionFlow: () => {
          throw new Error('The canvas failed');
        },
      });
      // React reports the error the boundary catches
      jest.spyOn(console, 'error').mockImplementation(() => undefined);

      const definition = await openDefinition();
      await within(definition).findByText("Couldn't draw the flow");
      within(definition).getByText('Show the Pure');
      // the rest of the viewer stays
      screen.getByText('Column Name');
      expect(logEvent).toHaveBeenCalledWith(
        DATA_PRODUCT_EVENT.FAIL_ACCESS_POINT_DEFINITION_FLOW,
        expect.objectContaining({
          failure: 'draw',
          error: 'The canvas failed',
        }),
      );
    });

    describe('Calls of user-defined functions (PLAN §11.33)', () => {
      const ACTIVE_ORDERS_PURE = FUNCTIONS.functionPure;
      const loadOrdersIngest = async (
        path: string,
      ): Promise<PlainObject | undefined> =>
        path === FUNCTIONS.ingestDefinition
          ? (FUNCTIONS.ingestDefinitionContent as PlainObject)
          : undefined;

      const setupWithFunctions = async (
        func: PlainObject,
        loadFunctions: (names: readonly string[]) => Promise<PlainObject[]>,
        loadIngestDefinition = loadOrdersIngest,
      ) => {
        const result = await setupLakehouseDataProductTest(
          dataProductDefinedBy(func),
          mockEntitlementsSDLCDataProduct,
          [],
          [],
          undefined,
          undefined,
          { loadIngestDefinition, loadFunctions },
        );
        createSpy(
          result.dataProductViewerState.engineServerClient,
          'JSONToGrammar_lambda',
        ).mockResolvedValue(PURE);
        const jsonToGrammarModel = createSpy(
          result.dataProductViewerState.engineServerClient,
          'JSONToGrammar_model',
        ).mockResolvedValue(ACTIVE_ORDERS_PURE);
        const logEvent = jest.spyOn(
          result.dataProductViewerState.applicationStore.telemetryService,
          'logEvent',
        );
        return { ...result, jsonToGrammarModel, logEvent };
      };

      test('draws a call as a container, its functions loaded before the ingest definitions, and shows its Pure', async () => {
        const order: string[] = [];
        const loadFunctions = jest.fn(async (names: readonly string[]) => {
          order.push(`functions ${names.join(', ')}`);
          return FUNCTIONS.functions as PlainObject[];
        });
        const loadIngestDefinition = jest.fn(async (path: string) => {
          order.push(`ingest ${path}`);
          return loadOrdersIngest(path);
        });
        const { jsonToGrammarModel, logEvent } = await setupWithFunctions(
          FUNCTIONS.accessPoints.active_orders_by_region,
          loadFunctions,
          loadIngestDefinition,
        );
        const definition = await openDefinition();
        // the data set and the filter in the container, the group after it
        await findFlowNodes(definition, 3);
        expect(order).toEqual([
          'functions shop::orders::activeOrders',
          'ingest shop::ingest::OrdersIngest',
        ]);
        const frame = within(definition).getByTestId(
          LEGEND_CUBE_TEST_ID.CANVAS_CONTAINER,
        );
        expect(frame.textContent).toContain('activeOrders()');
        expect(logEvent).toHaveBeenCalledWith(
          DATA_PRODUCT_EVENT.SHOW_ACCESS_POINT_DEFINITION_FLOW,
          expect.objectContaining({
            functionCallsOpened: 1,
            functionCallsClosed: {},
            scalarFunctionSteps: 0,
            functionsUnloaded: false,
          }),
        );

        await act(async () => {
          fireEvent.click(
            within(frame).getByLabelText(
              'Show the Pure of shop::orders::activeOrders',
            ),
          );
        });
        const panel = await within(definition).findByLabelText(
          'Function shop::orders::activeOrders',
        );
        expect(jsonToGrammarModel).toHaveBeenCalledTimes(1);
        // the function's element, through the graph manager's protocol
        expect(jsonToGrammarModel.mock.calls[0]?.[0]).toMatchObject({
          _type: 'data',
          elements: [
            {
              _type: 'function',
              package: 'shop::orders',
              name: 'activeOrders__Relation_1_',
            },
          ],
        });
        expect(
          panel.querySelector('.data-product__viewer__code-box'),
        ).not.toBeNull();
        await act(async () => {
          fireEvent.click(within(panel).getByText('Close'));
        });
        expect(
          within(definition).queryByLabelText(
            'Function shop::orders::activeOrders',
          ),
        ).toBeNull();
      });

      test("draws a function Depot doesn't have as one step, and says the steps after it aren't checked", async () => {
        const { logEvent } = await setupWithFunctions(
          FUNCTIONS.accessPoints.archived_orders,
          async () => [],
        );
        const definition = await openDefinition();
        await findFlowNodes(definition, 2);
        expect(
          within(definition).getByText(
            "archivedOrders() is shown as one step, with no columns known, so the steps after it aren't checked.",
          ),
        ).toBeDefined();
        expect(logEvent).toHaveBeenCalledWith(
          DATA_PRODUCT_EVENT.SHOW_ACCESS_POINT_DEFINITION_FLOW,
          expect.objectContaining({
            functionCallsOpened: 0,
            functionCallsClosed: { notFound: 1 },
          }),
        );
      });

      test('refuses a call as before when its functions fail to load', async () => {
        const { logEvent } = await setupWithFunctions(
          FUNCTIONS.accessPoints.active_orders_by_region,
          async () => {
            throw new Error('Depot is down');
          },
        );
        const definition = await openDefinition();
        await waitFor(() => expect(showsPure(definition)).toBe(true));
        expect(logEvent).toHaveBeenCalledWith(
          DATA_PRODUCT_EVENT.REFUSE_ACCESS_POINT_DEFINITION_FLOW,
          expect.objectContaining({ reason: 'source' }),
        );
      });
    });
  });

  describe('Column Specifications: missing descriptions and sample values', () => {
    const DESCRIPTIONS_URL = 'https://example.com/docs/column-descriptions';
    const SAMPLE_VALUES_URL = 'https://example.com/docs/sample-values';
    // a published version: unlike Studio's preview
    const PROJECT_GAV = {
      groupId: 'com.example.analytics',
      artifactId: 'customer-analytics',
      versionId: '1.2.0',
    };

    // how to add descriptions and sample values, as a deployment configures it
    // (no other entries: these tests need none)
    const configureDocumentation = (): void => {
      jest
        .spyOn(DocumentationService.prototype, 'getDocEntry')
        .mockImplementation((key) => {
          switch (key) {
            case 'dsl-dataproduct.column-descriptions':
              return DocumentationEntry.create({ url: DESCRIPTIONS_URL }, key);
            case 'dsl-dataproduct.sample-values':
              return DocumentationEntry.create({ url: SAMPLE_VALUES_URL }, key);
            default:
              return undefined;
          }
        });
    };

    // the column count, and what the columns lack
    const findColumnsSummary = async (): Promise<HTMLElement> =>
      guaranteeNonNullable(
        (await screen.findByText(/^\d+ columns?$/u)).parentElement,
      );

    const getLinkUrl = (summary: HTMLElement, text: string): string | null =>
      guaranteeNonNullable(
        within(summary).getByText(text).closest('a'),
      ).getAttribute('href');

    test('shows a quiet dash where a column has no description or sample values', async () => {
      await setupLakehouseDataProductTest(
        mockSDLCDataProduct,
        mockEntitlementsSDLCDataProduct,
        [],
        [],
        PROJECT_GAV,
        undefined,
        undefined,
        undefined,
        { batchLambdasRelationType: relationTypeWithColumns(2) },
      );

      await screen.findByText('col_1');
      const emptyCells = document.querySelectorAll(
        '.data-product__viewer__more-info__columns-grid__empty-cell',
      );
      // two columns, without a description or sample values
      expect(emptyCells).toHaveLength(4);
      emptyCells.forEach((cell) => expect(cell.textContent).toBe('—'));
      expect(screen.queryByText('No description provided')).toBeNull();
      expect(screen.queryByText('No sample values provided')).toBeNull();
    });

    test('tells an owner when no column has a description, or there are no sample values, with how to add them', async () => {
      configureDocumentation();
      const { dataProductDataAccessState } =
        await setupLakehouseDataProductTest(
          mockSDLCDataProduct,
          mockEntitlementsSDLCDataProduct,
          [],
          [],
          PROJECT_GAV,
          undefined,
          undefined,
          undefined,
          { batchLambdasRelationType: relationTypeWithColumns(2) },
        );
      act(() => {
        guaranteeNonNullable(dataProductDataAccessState).setDataProductOwners([
          'test-consumer-user-id',
        ]);
      });

      const summary = await findColumnsSummary();
      await waitFor(() =>
        expect(summary.textContent).toContain(
          '2 columns · No descriptions · No sample values',
        ),
      );
      expect(getLinkUrl(summary, 'How to add descriptions')).toBe(
        DESCRIPTIONS_URL,
      );
      expect(getLinkUrl(summary, 'How to add sample values')).toBe(
        SAMPLE_VALUES_URL,
      );
    });

    test('says nothing about descriptions to an owner once a column has one, and shows no link without documentation', async () => {
      const { dataProductDataAccessState } =
        await setupLakehouseDataProductTest(
          mockSDLCDataProduct,
          mockEntitlementsSDLCDataProduct,
          [],
          [],
          PROJECT_GAV,
        );
      act(() => {
        guaranteeNonNullable(dataProductDataAccessState).setDataProductOwners([
          'test-consumer-user-id',
        ]);
      });

      // the default columns have descriptions
      await screen.findByText('Varchar Column Description from field');
      const summary = await findColumnsSummary();
      await waitFor(() =>
        expect(summary.textContent).toBe('2 columns · No sample values'),
      );
      expect(within(summary).queryByRole('link')).toBeNull();
    });

    test('tells anyone else without access that sample values need it, and nothing about descriptions', async () => {
      configureDocumentation();
      await setupLakehouseDataProductTest(
        mockSDLCDataProduct,
        mockEntitlementsSDLCDataProduct,
        [],
        [],
        PROJECT_GAV,
        undefined,
        undefined,
        undefined,
        { batchLambdasRelationType: relationTypeWithColumns(2) },
      );

      // no contract: the user has no access to the group
      await screen.findByText('REQUEST ACCESS');
      const summary = await findColumnsSummary();
      await waitFor(() =>
        expect(summary.textContent).toBe(
          '2 columns · Sample values show once you have access',
        ),
      );
      expect(within(summary).queryByRole('link')).toBeNull();
    });

    test("tells the producer in Studio's preview what the columns lack, with how to add it", async () => {
      configureDocumentation();
      await setupLakehouseDataProductTest(
        mockSDLCDataProduct,
        undefined,
        [],
        [],
        undefined,
        undefined,
        undefined,
        undefined,
        { batchLambdasRelationType: relationTypeWithColumns(2) },
      );

      const summary = await findColumnsSummary();
      await waitFor(() =>
        expect(summary.textContent).toContain(
          '2 columns · No descriptions · No sample values',
        ),
      );
      expect(getLinkUrl(summary, 'How to add descriptions')).toBe(
        DESCRIPTIONS_URL,
      );
      expect(getLinkUrl(summary, 'How to add sample values')).toBe(
        SAMPLE_VALUES_URL,
      );
    });

    test("does not say sample values are missing in Studio's preview when the data product saved some", async () => {
      configureDocumentation();
      await setupLakehouseDataProductTest(
        mockSDLCDataProductWithSampleValues,
        undefined,
        [],
        [],
        undefined,
        undefined,
        undefined,
        undefined,
        { batchLambdasRelationType: relationTypeWithColumns(2) },
      );

      const summary = await findColumnsSummary();
      await waitFor(() =>
        expect(summary.textContent).toContain('2 columns · No descriptions'),
      );
      expect(summary.textContent).not.toContain('No sample values');
      expect(
        within(summary).queryByText('How to add sample values'),
      ).toBeNull();
    });
  });

  describe('Sample Queries — Open in Query', () => {
    test('"Open in Query" button is disabled when openSampleQuery is not provided', async () => {
      const { dataProductViewerState } = await setupLakehouseDataProductTest(
        mockSDLCDataProduct,
        mockEntitlementsSDLCDataProduct,
        [],
        [],
        { groupId: 'com.example', artifactId: 'test', versionId: '1.0.0' },
      );

      await act(async () => {
        await dataProductViewerState.dataProductArtifactPromise;
        dataProductViewerState.dataProductArtifact =
          buildMockDataProductArtifactWithSampleQueries();
      });

      // Confirm sample queries rendered
      await screen.findByText('Sample TDS Query');

      // Navigate to the "Query" tab within the sample query card
      const queryButtons = await screen.findAllByRole('button', {
        name: 'Query',
      });

      const sampleQueryTabButtons = queryButtons.filter(
        (btn) => btn.getAttribute('role') !== 'tab',
      );
      expect(sampleQueryTabButtons.length).toBeGreaterThan(0);
      await act(async () => {
        fireEvent.click(sampleQueryTabButtons[0] as HTMLElement);
      });

      const openInQueryButton = await screen.findByRole('button', {
        name: 'Open in Query',
      });
      expect((openInQueryButton as HTMLButtonElement).disabled).toBe(true);
    });

    test('"Open in Query" button is enabled when openSampleQuery is provided', async () => {
      const mockOpenSampleQuery = jest.fn();
      const { dataProductViewerState } = await setupLakehouseDataProductTest(
        mockSDLCDataProduct,
        mockEntitlementsSDLCDataProduct,
        [],
        [],
        { groupId: 'com.example', artifactId: 'test', versionId: '1.0.0' },
        undefined,
        { openSampleQuery: mockOpenSampleQuery },
      );

      await act(async () => {
        await dataProductViewerState.dataProductArtifactPromise;
        dataProductViewerState.dataProductArtifact =
          buildMockDataProductArtifactWithSampleQueries();
      });

      await screen.findByText('Sample TDS Query');

      const queryButtons = await screen.findAllByRole('button', {
        name: 'Query',
      });
      const sampleQueryTabButtons = queryButtons.filter(
        (btn) => btn.getAttribute('role') !== 'tab',
      );
      await act(async () => {
        fireEvent.click(sampleQueryTabButtons[0] as HTMLElement);
      });

      const openInQueryButton = await screen.findByRole('button', {
        name: 'Open in Query',
      });
      expect((openInQueryButton as HTMLButtonElement).disabled).toBe(false);
    });

    test('clicking "Open in Query" calls openSampleQuery with the correct id for TDS query', async () => {
      const mockOpenSampleQuery = jest.fn();
      const { dataProductViewerState } = await setupLakehouseDataProductTest(
        mockSDLCDataProduct,
        mockEntitlementsSDLCDataProduct,
        [],
        [],
        { groupId: 'com.example', artifactId: 'test', versionId: '1.0.0' },
        undefined,
        { openSampleQuery: mockOpenSampleQuery },
      );

      await act(async () => {
        await dataProductViewerState.dataProductArtifactPromise;
        dataProductViewerState.dataProductArtifact =
          buildMockDataProductArtifactWithSampleQueries();
      });

      await screen.findByText('Sample TDS Query');

      const queryButtons = await screen.findAllByRole('button', {
        name: 'Query',
      });
      const sampleQueryTabButtons = queryButtons.filter(
        (btn) => btn.getAttribute('role') !== 'tab',
      );
      await act(async () => {
        fireEvent.click(sampleQueryTabButtons[0] as HTMLElement);
      });

      const openInQueryButton = await screen.findByRole('button', {
        name: 'Open in Query',
      });
      await act(async () => {
        fireEvent.click(openInQueryButton);
      });

      expect(mockOpenSampleQuery).toHaveBeenCalledWith(
        MOCK__TDS_SAMPLE_QUERY_ID,
      );
    });

    test('clicking "Open in Query" calls openSampleQuery with the correct id for Relation query', async () => {
      const mockOpenSampleQuery = jest.fn();
      const { dataProductViewerState } = await setupLakehouseDataProductTest(
        mockSDLCDataProduct,
        mockEntitlementsSDLCDataProduct,
        [],
        [],
        { groupId: 'com.example', artifactId: 'test', versionId: '1.0.0' },
        undefined,
        { openSampleQuery: mockOpenSampleQuery },
      );

      await act(async () => {
        await dataProductViewerState.dataProductArtifactPromise;
        dataProductViewerState.dataProductArtifact =
          buildMockDataProductArtifactWithSampleQueries();
      });

      await screen.findByText('Sample Relation Query');

      const queryButtons = await screen.findAllByRole('button', {
        name: 'Query',
      });
      const sampleQueryTabButtons = queryButtons.filter(
        (btn) => btn.getAttribute('role') !== 'tab',
      );
      await act(async () => {
        fireEvent.click(sampleQueryTabButtons[1] as HTMLElement);
      });

      const openInQueryButton = await screen.findByRole('button', {
        name: 'Open in Query',
      });
      await act(async () => {
        fireEvent.click(openInQueryButton);
      });

      expect(mockOpenSampleQuery).toHaveBeenCalledWith(
        MOCK__RELATION_SAMPLE_QUERY_ID,
      );
    });

    test('Column Specifications tab shows "Sample Values" column with parsed values for TDS sample query', async () => {
      const { dataProductViewerState } = await setupLakehouseDataProductTest(
        mockSDLCDataProduct,
        mockEntitlementsSDLCDataProduct,
        [],
        [],
        { groupId: 'com.example', artifactId: 'test', versionId: '1.0.0' },
      );

      await act(async () => {
        await dataProductViewerState.dataProductArtifactPromise;
        dataProductViewerState.dataProductArtifact =
          buildMockDataProductArtifactWithSampleQueries();
      });

      await screen.findByText('Sample TDS Query');

      // Column Specifications is the default tab — the "Sample Values" header should be visible
      await screen.findByText('Sample Values');

      // The parsed sample values content should appear in the grid
      await screen.findByText(MOCK__TDS_COLUMN_SAMPLE_VALUES);
    });

    test('Relation sample query Column Specifications shows Description column with tagged value content', async () => {
      const { dataProductViewerState } = await setupLakehouseDataProductTest(
        mockSDLCDataProduct,
        mockEntitlementsSDLCDataProduct,
        [],
        [],
        { groupId: 'com.example', artifactId: 'test', versionId: '1.0.0' },
      );

      await act(async () => {
        dataProductViewerState.dataProductArtifact =
          buildMockDataProductArtifactWithSampleQueries();
      });

      await screen.findByText('Sample Relation Query');
      await screen.findByText('Description');
      await screen.findByText('Relation column description from field');
      await screen.findByText('Legacy relation column description');
    });
  });
});
