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
  fireEvent,
  waitFor,
  within,
  type RenderResult,
} from '@testing-library/react';
import { LEGEND_CUBE_TEST_ID } from '@finos/legend-cube-builder/definition-flow';
import { LineageModel, type IngestDefinition } from '@finos/legend-graph';
import { guaranteeNonNullable, type PlainObject } from '@finos/legend-shared';
import { integrationTest } from '@finos/legend-shared/test';
import type { Entity } from '@finos/legend-storage';
import { runInAction } from 'mobx';
import {
  TEST__openElementFromExplorerTree,
  TEST__provideMockedEditorStore,
  TEST__setUpEditorWithDefaultSDLCData,
} from '../../../__test-utils__/EditorComponentTestUtils.js';
import { LEGEND_STUDIO_TEST_ID } from '../../../../../__lib__/LegendStudioTesting.js';
import type { EditorStore } from '../../../../../stores/editor/EditorStore.js';
import { IngestDefinitionEditorState } from '../../../../../stores/editor/editor-state/element-editor-state/ingest/IngestDefinitionEditorState.js';
import { IngestDefinitionFlowState } from '../../../../../stores/editor/editor-state/element-editor-state/ingest/IngestDefinitionFlowState.js';
import TEST_DATA from './TEST_DATA__IngestDefinitionFlow.json' with { type: 'json' };

// the Pure of the whole definition, or of one view, shows what it is given
jest.mock('@finos/legend-lego/code-editor', () => ({
  CodeEditor: (props: { inputValue: string }) => (
    <pre data-testid="code-editor">{props.inputValue}</pre>
  ),
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

// The ResizeObserver polyfill of the test setup calls `getComputedStyle` on
// every observed element after every DOM change, which the canvas makes slow;
// no test here needs a resize
(global as unknown as { ResizeObserver: unknown }).ResizeObserver = jest
  .fn()
  .mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }));

const INGEST_PATH = TEST_DATA.ingestDefinition;
/** A definition of the same project with no materialized view */
const PLAIN_INGEST_PATH = 'markets::ingest::ReferenceDataIngest';

/** The definition's Pure, as the engine would write it, on one line */
const DEFINITION_PURE = `###Ingest IngestDefinition ${INGEST_PATH} {}`;
/** RANKED_POSITIONS's own Pure, as the engine would write its function */
const RANKED_POSITIONS_PURE =
  '|#I{markets::ingest::TradePositionsIngest.EOD_POSITIONS}#->olapGroupBy()';

/** A view's function, as the definition's content holds it, as JSON */
const getViewBody = (name: string): string =>
  JSON.stringify(
    (
      (TEST_DATA.entities[0]?.content.datasets as PlainObject[]).find(
        (dataSet) => dataSet.name === name,
      )?.source as { function: { body: unknown } } | undefined
    )?.function.body,
  );

/**
 * The engine writes the Pure of the definition's lambdas, which the editor
 * gets as it opens: these views', by the view's name
 */
const mockViewPure = (
  editorStore: EditorStore,
  pureByView: Record<string, string>,
): void => {
  const pureByBody = new Map(
    Object.entries(pureByView).map(([name, pure]) => [getViewBody(name), pure]),
  );
  jest
    .spyOn(editorStore.graphManagerState.graphManager, 'lambdasToPureCode')
    .mockImplementation((lambdas) =>
      Promise.resolve(
        new Map(
          Array.from(lambdas.entries()).flatMap(([id, lambda]) => {
            const pure = pureByBody.get(JSON.stringify(lambda.body));
            return pure === undefined ? [] : [[id, pure]];
          }),
        ),
      ),
    );
};

const setUp = async (
  path = INGEST_PATH,
  beforeOpen?: (editorStore: EditorStore) => void,
): Promise<{
  editorStore: EditorStore;
  renderResult: RenderResult;
  editorGroup: HTMLElement;
}> => {
  const editorStore = TEST__provideMockedEditorStore();
  const renderResult = await TEST__setUpEditorWithDefaultSDLCData(editorStore, {
    entities: TEST_DATA.entities as PlainObject<Entity>[],
  });
  jest
    .spyOn(editorStore.graphManagerState.graphManager, 'entitiesToPureCode')
    .mockResolvedValue(DEFINITION_PURE);
  beforeOpen?.(editorStore);
  // the definition's Pure answers at once: in act, as the tab opens
  await act(async () => {
    await TEST__openElementFromExplorerTree(path, renderResult);
  });
  const editorGroup = await waitFor(() =>
    renderResult.getByTestId(LEGEND_STUDIO_TEST_ID.EDITOR_GROUP),
  );
  return { editorStore, renderResult, editorGroup };
};

const getEditorState = (
  editorStore: EditorStore,
): IngestDefinitionEditorState =>
  editorStore.tabManagerState.getCurrentEditorState(
    IngestDefinitionEditorState,
  );

/** Overview | Pure */
const getViewSwitch = (editorGroup: HTMLElement): HTMLElement =>
  within(editorGroup).getByLabelText('Show the definition as');

/** The materialized views, then the other data sets, down the left */
const getViewList = (editorGroup: HTMLElement): HTMLElement =>
  within(editorGroup).getByLabelText('Materialized views and data sets');

/** Each row of the list: a view's name and its number of steps, or a data set's and its number of columns */
const getViewRows = (editorGroup: HTMLElement): string[] =>
  Array.from(
    getViewList(editorGroup).querySelectorAll(
      '.ingest-definition-flow__list__item',
    ),
  ).map((row) =>
    Array.from(row.children)
      .map((part) => part.textContent)
      .join(' | '),
  );

/** The picked view: its head, then its flow */
const getViewPanel = (editorGroup: HTMLElement, name: string): HTMLElement =>
  within(editorGroup).getByLabelText(name);

const findFlowNodes = async (
  panel: HTMLElement,
  count: number,
): Promise<HTMLElement[]> => {
  const flow = await within(panel).findByTestId(
    LEGEND_CUBE_TEST_ID.DEFINITION_FLOW,
  );
  await waitFor(() =>
    expect(
      within(flow).getAllByTestId(LEGEND_CUBE_TEST_ID.CANVAS_NODE),
    ).toHaveLength(count),
  );
  return within(flow).getAllByTestId(LEGEND_CUBE_TEST_ID.CANVAS_NODE);
};

/** The panel header's buttons, by their text or title */
const getHeaderActions = (editorGroup: HTMLElement): string[] =>
  Array.from(
    editorGroup.querySelectorAll(
      '.ingest-definition-editor__main-panel .panel__header__actions button',
    ),
  ).map((button) => {
    // a button with an icon only, e.g. a dropdown's, by its title
    const text = button.textContent ?? '';
    return text.length ? text : (button.getAttribute('title') ?? '');
  });

/** The definition's own section, above its views and data sets */
const getDefinitionSection = (editorGroup: HTMLElement): HTMLElement =>
  within(editorGroup).getByRole('region', { name: 'Definition' });

/** The settings the definition's section always shows, by label */
const getMainSettings = (section: HTMLElement): Record<string, string> =>
  Object.fromEntries(
    Array.from(
      section.querySelectorAll('.ingest-definition-section__setting'),
    ).map((setting) => [
      setting.querySelector('dt')?.textContent ?? '',
      setting.querySelector('dd')?.textContent ?? '',
    ]),
  );

/** A property's value as text: its chips, or its list's items, apart */
const getValueText = (value: Element): string => {
  const chips = value.querySelectorAll('.ingest-definition-properties__chip');
  const items = value.querySelectorAll('li');
  return chips.length
    ? Array.from(chips, (chip) => chip.textContent).join(', ')
    : items.length
      ? Array.from(items, (item) => item.textContent).join('; ')
      : (value.textContent ?? '');
};

/** The rows of property sheets, by label */
const getProperties = (element: HTMLElement): Record<string, string> =>
  Object.fromEntries(
    Array.from(
      element.querySelectorAll('.ingest-definition-properties__row'),
    ).map((row) => [
      row.querySelector('dt')?.textContent ?? '',
      getValueText(guaranteeNonNullable(row.querySelector('dd'))),
    ]),
  );

/** The classification and residency beside the picked view's or data set's name */
const getHeadChips = (panel: HTMLElement): (string | null)[] =>
  Array.from(
    panel.querySelectorAll(
      '.ingest-definition-flow__view__head .ingest-definition-properties__chip',
    ),
    (chip) => chip.textContent,
  );

/** Shows a panel's tab: a view's Flow or Metadata, a data set's Schema or Metadata */
const showTab = async (panel: HTMLElement, tab: string): Promise<void> => {
  await act(async () => {
    fireEvent.click(within(panel).getByRole('tab', { name: tab }));
  });
};

const isTabShown = (panel: HTMLElement, tab: string): boolean =>
  within(panel)
    .getByRole('tab', { name: tab })
    .getAttribute('aria-selected') === 'true';

/** The picked view's or data set's Metadata, by label, its tab shown */
const getMetadata = async (
  panel: HTMLElement,
): Promise<Record<string, string>> => {
  await showTab(panel, 'Metadata');
  return getProperties(
    within(panel).getByLabelText(
      `Metadata of ${panel.getAttribute('aria-label') ?? ''}`,
    ),
  );
};

/** A name that picks it in the list, e.g. in a view's Reads or a data set's Read by */
const followLink = async (
  element: HTMLElement,
  name: string,
): Promise<void> => {
  const link = Array.from(
    element.querySelectorAll<HTMLElement>('.ingest-definition-flow__link'),
  ).find((each) => each.textContent === name);
  expect(link).toBeDefined();
  await act(async () => {
    fireEvent.click(link as HTMLElement);
  });
};

/** The rows of a data set's columns table, each cell's text, in order */
const getColumnRows = (panel: HTMLElement): string[][] =>
  Array.from(panel.querySelectorAll('.ag-center-cols-container .ag-row'))
    .sort(
      (a, b) =>
        Number(a.getAttribute('row-index')) -
        Number(b.getAttribute('row-index')),
    )
    .map((row) =>
      Array.from(row.querySelectorAll('.ag-cell')).map(
        (cell) => cell.textContent ?? '',
      ),
    );

const pick = async (editorGroup: HTMLElement, name: string): Promise<void> => {
  await act(async () => {
    fireEvent.click(within(getViewList(editorGroup)).getByTitle(name));
  });
};

afterEach(() => {
  jest.restoreAllMocks();
});

describe('The Definition tab of an ingest definition with materialized views', () => {
  test(
    integrationTest(
      "Opens on the Overview: the definition's section, then the flow of the first view, Legend Cube drawing it typed by the definition, beside every view with its number of steps",
    ),
    async () => {
      const { editorGroup } = await setUp();

      const viewSwitch = getViewSwitch(editorGroup);
      expect(
        within(viewSwitch).getByText('Overview').getAttribute('aria-pressed'),
      ).toBe('true');
      expect(
        within(viewSwitch).getByText('Pure').getAttribute('aria-pressed'),
      ).toBe('false');
      // the whole definition's Pure waits behind Pure
      expect(within(editorGroup).queryByText(DEFINITION_PURE)).toBeNull();

      // the definition's own section: its name and doc, then the settings
      // every data set follows unless it sets its own
      const section = getDefinitionSection(editorGroup);
      within(section).getByText('TradePositionsIngest');
      within(section).getByText('End-of-day positions for the Markets desks');
      expect(getMainSettings(section)).toEqual({
        Owner: 'Kerberos svc_positions',
        'Read mode': 'Delta · CSV',
        'Write mode': 'append only',
        'Data set group': 'POSITIONS',
        // a compute the project doesn't have, by its name
        Compute: 'MarketsSnowflake',
      });

      // two data sets, a filter, a join and a group
      const panel = getViewPanel(editorGroup, 'POSITIONS_BY_LEGAL_ENTITY');
      await findFlowNodes(panel, 5);
      await waitFor(() =>
        expect(getViewRows(editorGroup)).toEqual([
          'POSITIONS_BY_LEGAL_ENTITY | 5 steps',
          'OPEN_CLIENT_POSITIONS | 3 steps',
          'RANKED_POSITIONS | No flow yet',
          // the other data sets, with their columns, those their write mode adds too
          'EOD_POSITIONS | 9 columns',
          'LEGAL_ENTITIES | 3 columns',
          'CLIENT_POSITIONS | 4 columns',
          'INSTRUMENTS | 5 columns',
          'PENDING_FEED | 0 columns',
        ]),
      );
      expect(
        Array.from(
          getViewList(editorGroup).querySelectorAll(
            '.ingest-definition-flow__list__title',
          ),
        ).map((title) => title.textContent),
      ).toEqual(['Materialized views3', 'Data sets5']);
      expect(
        within(getViewList(editorGroup))
          .getByTitle('POSITIONS_BY_LEGAL_ENTITY')
          .getAttribute('aria-selected'),
      ).toBe('true');

      // its head: the classification of its data, then its Flow, shown, and
      // its Metadata
      expect(getHeadChips(panel)).toEqual(['DP10']);
      expect(isTabShown(panel, 'Flow')).toBe(true);
      expect(isTabShown(panel, 'Metadata')).toBe(false);
      // every data set's columns are known: nothing to warn of
      expect(within(panel).queryByText(/aren't known/u)).toBeNull();
    },
  );

  test(
    integrationTest(
      "All settings opens the definition's other settings below its main ones, its doc not again, and Fewer settings closes them",
    ),
    async () => {
      const { editorGroup } = await setUp();
      await findFlowNodes(
        getViewPanel(editorGroup, 'POSITIONS_BY_LEGAL_ENTITY'),
        5,
      );
      const section = getDefinitionSection(editorGroup);
      const otherSettings = "The definition's other settings";
      expect(within(section).queryByLabelText(otherSettings)).toBeNull();

      await act(async () => {
        fireEvent.click(within(section).getByText('All settings'));
      });
      const others = within(section).getByLabelText(otherSettings);
      // how it reads its files, and the data sets with their own write mode;
      // nothing of a part it doesn't set, e.g. its batches
      expect(getProperties(others)).toEqual({
        'Field delimiter': '|',
        'Record delimiter': '\\n',
        'Header rows skipped': '1',
        'Parse header': 'Yes',
        'Data sets with their own write mode': 'INSTRUMENTS',
      });
      expect(within(others).queryByLabelText('Batches')).toBeNull();
      // its doc shows above, not again as one of its annotations
      expect(
        within(section).getAllByText(
          'End-of-day positions for the Markets desks',
        ),
      ).toHaveLength(1);
      // a data set it names is a link to it
      await followLink(others, 'INSTRUMENTS');
      getViewPanel(editorGroup, 'INSTRUMENTS');

      await act(async () => {
        fireEvent.click(within(section).getByText('Fewer settings'));
      });
      expect(within(section).queryByLabelText(otherSettings)).toBeNull();
      // the settings that matter most stay
      expect(getMainSettings(section).Owner).toBe('Kerberos svc_positions');
    },
  );

  test(
    integrationTest(
      "A view's Metadata: its key, classification, the data sets it reads, how it's written; the tab stays as another view is picked",
    ),
    async () => {
      const { editorGroup } = await setUp();
      const panel = getViewPanel(editorGroup, 'POSITIONS_BY_LEGAL_ENTITY');
      await findFlowNodes(panel, 5);

      expect(await getMetadata(panel)).toEqual({
        'Primary key': 'BUSINESS_DATE, LEGAL_ENTITY_ID, INSTRUMENT_ID',
        Classification: 'DP10',
        Residency: 'None',
        'Data sets': 'EOD_POSITIONS, LEGAL_ENTITIES',
        'Write mode': "append only the definition's",
      });
      expect(isTabShown(panel, 'Metadata')).toBe(true);
      // the flow waits behind Flow
      expect(
        within(panel).queryByTestId(LEGEND_CUBE_TEST_ID.DEFINITION_FLOW),
      ).toBeNull();

      await pick(editorGroup, 'OPEN_CLIENT_POSITIONS');
      const other = getViewPanel(editorGroup, 'OPEN_CLIENT_POSITIONS');
      expect(isTabShown(other, 'Metadata')).toBe(true);
      expect(
        getProperties(
          within(other).getByLabelText('Metadata of OPEN_CLIENT_POSITIONS'),
        ),
      ).toMatchObject({
        'Primary key': 'BUSINESS_DATE, CLIENT_ACCOUNT_ID, INSTRUMENT_ID',
        Classification: 'DP20',
        'Data sets': 'CLIENT_POSITIONS',
      });

      await showTab(other, 'Flow');
      await findFlowNodes(other, 3);
    },
  );

  test(
    integrationTest(
      'Picking a view in the list shows its head and its flow, and the pick stays through a trip to Testing',
    ),
    async () => {
      const { editorGroup } = await setUp();
      await findFlowNodes(
        getViewPanel(editorGroup, 'POSITIONS_BY_LEGAL_ENTITY'),
        5,
      );

      await pick(editorGroup, 'OPEN_CLIENT_POSITIONS');
      const panel = getViewPanel(editorGroup, 'OPEN_CLIENT_POSITIONS');
      // a data set, a filter and a select
      await findFlowNodes(panel, 3);
      expect(
        within(getViewList(editorGroup))
          .getByTitle('OPEN_CLIENT_POSITIONS')
          .getAttribute('aria-selected'),
      ).toBe('true');
      expect(
        within(getViewList(editorGroup))
          .getByTitle('POSITIONS_BY_LEGAL_ENTITY')
          .getAttribute('aria-selected'),
      ).toBe('false');
      expect(getHeadChips(panel)).toEqual(['DP20']);
      expect(
        within(editorGroup).queryByLabelText('POSITIONS_BY_LEGAL_ENTITY'),
      ).toBeNull();

      await act(async () => {
        fireEvent.click(within(editorGroup).getByText('Testing'));
      });
      await act(async () => {
        fireEvent.click(within(editorGroup).getByText('Definition'));
      });
      await findFlowNodes(
        getViewPanel(editorGroup, 'OPEN_CLIENT_POSITIONS'),
        3,
      );
    },
  );

  test(
    integrationTest(
      "A view Legend Cube can't draw says why, and shows its own Pure, as the engine writes its function",
    ),
    async () => {
      // the editor gets the Pure of the definition's lambdas as it opens,
      // once: the engine writes this view's
      const { editorStore, editorGroup } = await setUp(INGEST_PATH, (store) =>
        mockViewPure(store, { RANKED_POSITIONS: RANKED_POSITIONS_PURE }),
      );
      // the spy set before the editor opened
      const lambdasToPureCode = jest.spyOn(
        editorStore.graphManagerState.graphManager,
        'lambdasToPureCode',
      );
      await findFlowNodes(
        getViewPanel(editorGroup, 'POSITIONS_BY_LEGAL_ENTITY'),
        5,
      );

      await pick(editorGroup, 'RANKED_POSITIONS');
      const panel = getViewPanel(editorGroup, 'RANKED_POSITIONS');
      within(panel).getByText(
        'No flow for this view yet: it uses olapGroupBy(), which Cube has no step for yet.',
      );
      // Cube's own words, under Details
      expect(
        panel.querySelector('.ingest-definition-flow__view__note__details')
          ?.textContent,
      ).toMatch(/^Details.*olapGroupBy/u);
      await within(panel).findByText(RANKED_POSITIONS_PURE);
      expect(
        within(panel).queryByTestId(LEGEND_CUBE_TEST_ID.DEFINITION_FLOW),
      ).toBeNull();
      // what it reads comes from its function, flow or none
      expect((await getMetadata(panel))['Data sets']).toBe('EOD_POSITIONS');
      await showTab(panel, 'Flow');
      // the engine writes the view's own function, with the definition's
      // other lambdas, as the editor opens
      expect(lambdasToPureCode).toHaveBeenCalledTimes(1);
      const [lambdas, pretty] = lambdasToPureCode.mock.calls[0] ?? [];
      expect(pretty).toBe(true);
      expect(
        Array.from(lambdas?.values() ?? []).some(
          (lambda) =>
            JSON.stringify(lambda.body) === getViewBody('RANKED_POSITIONS'),
        ),
      ).toBe(true);

      // got once: back on it, its Pure shows again
      await pick(editorGroup, 'OPEN_CLIENT_POSITIONS');
      await pick(editorGroup, 'RANKED_POSITIONS');
      await within(getViewPanel(editorGroup, 'RANKED_POSITIONS')).findByText(
        RANKED_POSITIONS_PURE,
      );
      expect(lambdasToPureCode).toHaveBeenCalledTimes(1);
    },
  );

  test(
    integrationTest(
      "Pure shows the whole definition's Pure under today's header, and Overview comes back to the view picked",
    ),
    async () => {
      const { editorGroup } = await setUp();
      await findFlowNodes(
        getViewPanel(editorGroup, 'POSITIONS_BY_LEGAL_ENTITY'),
        5,
      );
      await pick(editorGroup, 'OPEN_CLIENT_POSITIONS');

      await act(async () => {
        fireEvent.click(within(getViewSwitch(editorGroup)).getByText('Pure'));
      });
      expect(
        within(getViewSwitch(editorGroup))
          .getByText('Pure')
          .getAttribute('aria-pressed'),
      ).toBe('true');
      await within(editorGroup).findByText(DEFINITION_PURE);
      expect(
        within(editorGroup).queryByLabelText(
          'Materialized views and data sets',
        ),
      ).toBeNull();
      // today's header: Lineage, View SQL, and Create MatView with its views
      // to edit
      expect(getHeaderActions(editorGroup)).toEqual([
        'Lineage',
        'View SQL',
        'Create MatView',
        'Edit a materialized view with Cube',
      ]);

      await act(async () => {
        fireEvent.click(
          within(getViewSwitch(editorGroup)).getByText('Overview'),
        );
      });
      await findFlowNodes(
        getViewPanel(editorGroup, 'OPEN_CLIENT_POSITIONS'),
        3,
      );
    },
  );

  test(
    integrationTest(
      "While the Overview shows, the header keeps View SQL and Create MatView, and the view's head has its own Edit in Cube and Lineage",
    ),
    async () => {
      const { editorStore, editorGroup, renderResult } = await setUp();
      await findFlowNodes(
        getViewPanel(editorGroup, 'POSITIONS_BY_LEGAL_ENTITY'),
        5,
      );
      expect(getHeaderActions(editorGroup)).toEqual([
        'View SQL',
        'Create MatView',
      ]);

      // Lineage shows the picked view's lineage, and the dialog names it
      const { graphManager } = editorStore.graphManagerState;
      const generateLineage = jest
        .spyOn(graphManager, 'generateLineage')
        .mockResolvedValue({} as never);
      jest
        .spyOn(graphManager, 'buildLineage')
        .mockReturnValue(new LineageModel());
      await pick(editorGroup, 'OPEN_CLIENT_POSITIONS');
      const panel = getViewPanel(editorGroup, 'OPEN_CLIENT_POSITIONS');
      await act(async () => {
        fireEvent.click(within(panel).getByText('Lineage'));
      });
      const ingest = editorStore.graphManagerState.graph.getNullableElement(
        INGEST_PATH,
      ) as IngestDefinition;
      expect(generateLineage).toHaveBeenCalledTimes(1);
      expect(generateLineage.mock.calls[0]?.[0]).toBe(
        ingest.TEMPORARY_MATVIEW_FUNCTION_DATA_SETS?.find(
          (dataSet) => dataSet.name === 'OPEN_CLIENT_POSITIONS',
        )?.source.function,
      );
      const dialog = await renderResult.findByRole('dialog');
      await within(dialog).findByText('OPEN_CLIENT_POSITIONS');
      expect(
        within(dialog).queryByText('POSITIONS_BY_LEGAL_ENTITY'),
      ).toBeNull();
      await act(async () => {
        fireEvent.click(within(dialog).getByText('Close'));
      });

      // Edit in Cube opens Cube on the picked view
      const editorState = getEditorState(editorStore);
      expect(
        within(panel).getByText('Edit in Cube').closest('button')?.disabled,
      ).toBe(false);
      act(() => {
        fireEvent.click(within(panel).getByText('Edit in Cube'));
        expect(editorStore.embeddedCubeState.ingest).toBe(editorState.ingest);
        expect(editorStore.embeddedCubeState.matView).toBe(
          'OPEN_CLIENT_POSITIONS',
        );
        editorStore.embeddedCubeState.close();
      });

      // not where the definition can't be edited
      act(() => {
        runInAction(() => {
          editorState.isReadOnly = true;
        });
      });
      await waitFor(() =>
        expect(
          within(panel).getByText('Edit in Cube').closest('button')?.disabled,
        ).toBe(true),
      );
    },
  );

  test(
    integrationTest(
      "Shows the view's Pure with why when Legend Cube's code doesn't load, and draws the flow on another try",
    ),
    async () => {
      const loadEntry = jest.spyOn(
        IngestDefinitionFlowState.prototype,
        'loadDefinitionFlowEntry',
      );
      loadEntry.mockRejectedValueOnce(
        new Error('Loading chunk cube-flow failed'),
      );
      const editorStore = TEST__provideMockedEditorStore();
      const logError = jest
        .spyOn(editorStore.applicationStore.logService, 'error')
        .mockImplementation(() => undefined);
      const renderResult = await TEST__setUpEditorWithDefaultSDLCData(
        editorStore,
        { entities: TEST_DATA.entities as PlainObject<Entity>[] },
      );
      mockViewPure(editorStore, {
        POSITIONS_BY_LEGAL_ENTITY: '|positions by legal entity',
      });
      // the failed load answers at once: in act, as the tab opens
      await act(async () => {
        await TEST__openElementFromExplorerTree(INGEST_PATH, renderResult);
      });
      const editorGroup = await waitFor(() =>
        renderResult.getByTestId(LEGEND_STUDIO_TEST_ID.EDITOR_GROUP),
      );

      const panel = getViewPanel(editorGroup, 'POSITIONS_BY_LEGAL_ENTITY');
      await within(panel).findByText(
        "Couldn't load Legend Cube to draw this view.",
      );
      await within(panel).findByText('|positions by legal entity');
      expect(logError).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringContaining('(load): Loading chunk cube-flow failed'),
      );
      // no step counts without Cube
      expect(getViewRows(editorGroup)[0]).toBe('POSITIONS_BY_LEGAL_ENTITY | ');

      await act(async () => {
        fireEvent.click(within(panel).getByText('Try again'));
      });
      await findFlowNodes(
        getViewPanel(editorGroup, 'POSITIONS_BY_LEGAL_ENTITY'),
        5,
      );
      expect(loadEntry).toHaveBeenCalledTimes(2);
    },
  );
});

describe("The Definition tab's data sets, beside the materialized views", () => {
  test(
    integrationTest(
      'Picking a data set shows its columns, read-only, on Schema, and everything else it says on Metadata, while no view is picked',
    ),
    async () => {
      const { editorGroup } = await setUp();
      await findFlowNodes(
        getViewPanel(editorGroup, 'POSITIONS_BY_LEGAL_ENTITY'),
        5,
      );

      await pick(editorGroup, 'EOD_POSITIONS');
      const panel = getViewPanel(editorGroup, 'EOD_POSITIONS');
      const list = getViewList(editorGroup);
      expect(
        within(list).getByTitle('EOD_POSITIONS').getAttribute('aria-selected'),
      ).toBe('true');
      expect(
        within(list)
          .getByTitle('POSITIONS_BY_LEGAL_ENTITY')
          .getAttribute('aria-selected'),
      ).toBe('false');
      expect(
        within(editorGroup).queryByTestId(LEGEND_CUBE_TEST_ID.DEFINITION_FLOW),
      ).toBeNull();

      // its classification and residency beside its name, then its Schema
      expect(getHeadChips(panel)).toEqual(['DP20', 'US only']);
      within(panel).getByText('Read-only here: edit data sets in text mode.');
      expect(isTabShown(panel, 'Schema')).toBe(true);

      // View SQL's headers, and Key
      const grid = within(panel).getByLabelText('Columns of EOD_POSITIONS');
      await waitFor(() => expect(getColumnRows(grid)).toHaveLength(9));
      expect(
        Array.from(grid.querySelectorAll('.ag-header-cell-text')).map(
          (header) => header.textContent,
        ),
      ).toEqual(['Column Name', 'Column Type', 'Multiplicity', 'Key']);
      // a column's description, under its name
      expect(getColumnRows(grid).slice(0, 2)).toEqual([
        [
          'BUSINESS_DATEThe business day the position is as of',
          'StrictDate',
          '[1] - Required',
          'Yes',
        ],
        ['POSITION_ID', 'Varchar(32)', '[1] - Required', 'Yes'],
      ]);
      expect(getColumnRows(grid).at(-1)).toEqual([
        'MARKET_VALUE_USD',
        'Decimal',
        '[0..1] - Optional',
        '',
      ]);
      // its type's path, in a tooltip: a precise primitive's is its name
      expect(within(grid).getAllByTitle('Varchar').length).toBeGreaterThan(0);
      within(panel).getByText('9 columns, as the definition declares them.');

      // everything else it says, a setting it takes from the definition
      // saying so
      expect(await getMetadata(panel)).toEqual({
        'Primary key': 'BUSINESS_DATE, POSITION_ID',
        Classification: 'DP20',
        Residency: 'US',
        Views: 'POSITIONS_BY_LEGAL_ENTITY, RANKED_POSITIONS',
        'Write mode': "append only the definition's",
        Deletes: 'A row whose STATUS is DELETED',
        'Lookup indexes': 'Equality on POSITION_ID',
        Format: "CSV the definition's",
      });
      expect(
        within(panel).queryByLabelText('Columns of EOD_POSITIONS'),
      ).toBeNull();

      // the tab stays as another data set is picked, to compare them
      await pick(editorGroup, 'INSTRUMENTS');
      const instruments = getViewPanel(editorGroup, 'INSTRUMENTS');
      expect(isTabShown(instruments, 'Metadata')).toBe(true);
      expect(
        getProperties(
          within(instruments).getByLabelText('Metadata of INSTRUMENTS'),
        )['Write mode'],
      ).toBe('batch milestoned its own');
    },
  );

  test(
    integrationTest(
      'On Metadata, a data set a view reads picks it, and a view that reads a data set picks it',
    ),
    async () => {
      const { editorGroup } = await setUp();
      await findFlowNodes(
        getViewPanel(editorGroup, 'POSITIONS_BY_LEGAL_ENTITY'),
        5,
      );

      const view = getViewPanel(editorGroup, 'POSITIONS_BY_LEGAL_ENTITY');
      expect((await getMetadata(view))['Data sets']).toBe(
        'EOD_POSITIONS, LEGAL_ENTITIES',
      );
      await followLink(view, 'LEGAL_ENTITIES');
      const dataSet = getViewPanel(editorGroup, 'LEGAL_ENTITIES');
      expect((await getMetadata(dataSet)).Views).toBe(
        'POSITIONS_BY_LEGAL_ENTITY',
      );
      expect(
        within(getViewList(editorGroup))
          .getByTitle('LEGAL_ENTITIES')
          .getAttribute('aria-selected'),
      ).toBe('true');

      await followLink(dataSet, 'POSITIONS_BY_LEGAL_ENTITY');
      // back on the view, on the tab it was on
      const back = getViewPanel(editorGroup, 'POSITIONS_BY_LEGAL_ENTITY');
      expect(isTabShown(back, 'Metadata')).toBe(true);
      await showTab(back, 'Flow');
      await findFlowNodes(back, 5);
      expect(
        within(getViewList(editorGroup))
          .getByTitle('POSITIONS_BY_LEGAL_ENTITY')
          .getAttribute('aria-selected'),
      ).toBe('true');
      expect(
        within(getViewList(editorGroup))
          .getByTitle('LEGAL_ENTITIES')
          .getAttribute('aria-selected'),
      ).toBe('false');

      // a view Cube can't draw reads its data sets too
      await pick(editorGroup, 'RANKED_POSITIONS');
      const ranked = getViewPanel(editorGroup, 'RANKED_POSITIONS');
      await showTab(ranked, 'Metadata');
      await followLink(ranked, 'EOD_POSITIONS');
      getViewPanel(editorGroup, 'EOD_POSITIONS');
    },
  );

  test(
    integrationTest(
      'A data set no view reads says so, and lists the columns its write mode adds after its own, muted',
    ),
    async () => {
      const { editorGroup } = await setUp();
      await findFlowNodes(
        getViewPanel(editorGroup, 'POSITIONS_BY_LEGAL_ENTITY'),
        5,
      );

      await pick(editorGroup, 'INSTRUMENTS');
      const panel = getViewPanel(editorGroup, 'INSTRUMENTS');
      const grid = within(panel).getByLabelText('Columns of INSTRUMENTS');
      await waitFor(() => expect(getColumnRows(grid)).toHaveLength(5));
      expect(getColumnRows(grid)).toEqual([
        ['INSTRUMENT_ID', 'Varchar(32)', '[1] - Required', 'Yes'],
        ['INSTRUMENT_NAME', 'Varchar(200)', '[0..1] - Optional', ''],
        [
          'LAKE_DIGESTadded by batch milestoned',
          'String',
          '[1] - Required',
          '',
        ],
        [
          'LAKE_IN_IDadded by batch milestoned',
          'Integer',
          '[1] - Required',
          '',
        ],
        [
          'LAKE_OUT_IDadded by batch milestoned',
          'Integer',
          '[1] - Required',
          '',
        ],
      ]);
      expect(
        grid.querySelectorAll(
          '.ag-center-cols-container .ingest-definition-flow__data-set__added-column',
        ),
      ).toHaveLength(3);
      within(panel).getByText(
        '2 columns as the definition declares them, then 3 its write mode, batch milestoned, adds.',
      );
      expect(await getMetadata(panel)).toMatchObject({
        Views: 'No view',
        'Write mode': 'batch milestoned its own',
      });
    },
  );

  test(
    integrationTest(
      'A data set that declares no columns says so, with no table',
    ),
    async () => {
      const { editorGroup } = await setUp();
      await findFlowNodes(
        getViewPanel(editorGroup, 'POSITIONS_BY_LEGAL_ENTITY'),
        5,
      );

      await pick(editorGroup, 'PENDING_FEED');
      const panel = getViewPanel(editorGroup, 'PENDING_FEED');
      within(panel).getByText('No columns declared.');
      expect(
        within(panel).queryByLabelText('Columns of PENDING_FEED'),
      ).toBeNull();
      expect(await getMetadata(panel)).toMatchObject({
        'Primary key': 'None',
        Views: 'No view',
      });
    },
  );
});

describe('The Definition tab of an ingest definition without materialized views', () => {
  test(
    integrationTest(
      "Opens on the Overview too: the definition's section, then its data sets, the first one picked, with nothing of Cube loaded",
    ),
    async () => {
      const loadEntry = jest.spyOn(
        IngestDefinitionFlowState.prototype,
        'loadDefinitionFlowEntry',
      );
      const { editorGroup } = await setUp(PLAIN_INGEST_PATH);
      expect(
        within(getViewSwitch(editorGroup))
          .getByText('Overview')
          .getAttribute('aria-pressed'),
      ).toBe('true');
      within(getDefinitionSection(editorGroup)).getByText(
        'ReferenceDataIngest',
      );

      // its data sets alone, its first one picked, on its Schema
      expect(getViewRows(editorGroup)).toEqual(['LEGAL_ENTITIES | 3 columns']);
      expect(
        Array.from(
          getViewList(editorGroup).querySelectorAll(
            '.ingest-definition-flow__list__title',
          ),
          (title) => title.textContent,
        ),
      ).toEqual(['Data sets1']);
      const panel = getViewPanel(editorGroup, 'LEGAL_ENTITIES');
      expect(isTabShown(panel, 'Schema')).toBe(true);
      const grid = within(panel).getByLabelText('Columns of LEGAL_ENTITIES');
      await waitFor(() => expect(getColumnRows(grid)).toHaveLength(3));

      // no view, so no Lineage: Create MatView makes its first one
      expect(getHeaderActions(editorGroup)).toEqual(['Create MatView']);
      expect(loadEntry).not.toHaveBeenCalled();

      // its Pure, one click away
      await act(async () => {
        fireEvent.click(within(getViewSwitch(editorGroup)).getByText('Pure'));
      });
      await within(editorGroup).findByText(DEFINITION_PURE);
      expect(loadEntry).not.toHaveBeenCalled();
    },
  );
});

describe('The Definition tab of an ingest definition whose content Studio cannot read', () => {
  test(
    integrationTest(
      "Is the definition's Pure, saying why, with no Overview | Pure and nothing of Cube loaded",
    ),
    async () => {
      const loadEntry = jest.spyOn(
        IngestDefinitionFlowState.prototype,
        'loadDefinitionFlowEntry',
      );
      const editorStore = TEST__provideMockedEditorStore();
      const [ingest, ...others] = TEST_DATA.entities as PlainObject<Entity>[];
      // a write mode no version of the protocol has
      const unreadable = {
        ...ingest,
        content: {
          ...(ingest?.content as PlainObject),
          writeMode: 'upsert',
        },
      } as PlainObject<Entity>;
      const renderResult = await TEST__setUpEditorWithDefaultSDLCData(
        editorStore,
        { entities: [unreadable, ...others] },
      );
      jest
        .spyOn(editorStore.graphManagerState.graphManager, 'entitiesToPureCode')
        .mockResolvedValue(DEFINITION_PURE);
      await act(async () => {
        await TEST__openElementFromExplorerTree(INGEST_PATH, renderResult);
      });
      const editorGroup = await waitFor(() =>
        renderResult.getByTestId(LEGEND_STUDIO_TEST_ID.EDITOR_GROUP),
      );

      await within(editorGroup).findByText(DEFINITION_PURE);
      within(editorGroup).getByText(
        "Studio can't read this definition's content, so it shows only its Pure.",
      );
      expect(
        within(editorGroup).queryByLabelText('Show the definition as'),
      ).toBeNull();
      expect(
        within(editorGroup).queryByLabelText(
          'Materialized views and data sets',
        ),
      ).toBeNull();
      expect(loadEntry).not.toHaveBeenCalled();
      // its views can still be edited in Cube, from Create MatView's dropdown
      expect(getHeaderActions(editorGroup)).toContain(
        'Edit a materialized view with Cube',
      );
      fireEvent.click(
        within(editorGroup).getByTitle('Edit a materialized view with Cube'),
      );
      await renderResult.findByText('Edit MatView POSITIONS_BY_LEGAL_ENTITY');
    },
  );
});
