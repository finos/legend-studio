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

import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import {
  act,
  fireEvent,
  getAllByText,
  getAllByTitle,
  getByPlaceholderText,
  getByText,
  getByTitle,
  queryAllByTitle,
  queryByPlaceholderText,
  queryByTitle,
  waitFor,
} from '@testing-library/react';
import { integrationTest, createSpy } from '@finos/legend-shared/test';
import {
  TEST__openElementFromExplorerTree,
  TEST__provideMockedEditorStore,
  TEST__setUpEditorWithDefaultSDLCData,
} from '../../../__test-utils__/EditorComponentTestUtils.js';
import { LEGEND_STUDIO_TEST_ID } from '../../../../../__lib__/LegendStudioTesting.js';
import TEST_DATA__SimpleRelationalEntities from '../../function-activator/__tests__/TEST_DATA__SimpleRelationalEntities.json' with { type: 'json' };
import {
  DATABASE_EDITOR_TAB,
  DatabaseEditorState,
} from '../../../../../stores/editor/editor-state/element-editor-state/DatabaseEditorState.js';
import { MockedMonacoEditorInstance } from '@finos/legend-lego/code-editor/test';

// React Flow measures the canvas with ResizeObserver and IntersectionObserver.
// ResizeObserver is already polyfilled by the shared DOM setup; mirror the
// IntersectionObserver mock used by other component tests
// (see DataProductEditor.test.tsx) so the canvas can mount.
(global as unknown as { IntersectionObserver: unknown }).IntersectionObserver =
  jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }));

const JOIN_FORMULA_PLACEHOLDER = 'join [...]';
const JOIN_FORMULAS = new Map([
  ['FirmPerson', 'FirmTable.firm_id = PersonTable.firm_id'],
  ['FirmAddress', 'FirmTable.firm_id = AddressTable.firm_id'],
  ['HobbyPerson', 'HobbyTable.id = PersonTable.hobby_id'],
]);

describe(integrationTest('Database editor'), () => {
  let MOCK__editorStore: ReturnType<typeof TEST__provideMockedEditorStore>;
  let renderResult: Awaited<
    ReturnType<typeof TEST__setUpEditorWithDefaultSDLCData>
  >;
  let formulasResponse: {
    resolve: (formulas: Map<string, string>) => void;
    reject: (error: Error) => void;
  };

  const getEditorGroup = (): HTMLElement =>
    renderResult.getByTestId(LEGEND_STUDIO_TEST_ID.EDITOR_GROUP);
  const getEditorState = (): DatabaseEditorState =>
    MOCK__editorStore.tabManagerState.getCurrentEditorState(
      DatabaseEditorState,
    );
  // Settle the formula engine call inside `act()`: if the flow completes outside
  // `act()`, React's warning is thrown by `disallowConsoleError` inside a MobX
  // reaction, which leaves MobX unable to run any further reactions and the
  // editor stops updating.
  const settleFormulas = async (
    result: Map<string, string> | Error,
  ): Promise<void> =>
    act(async () => {
      if (result instanceof Error) {
        formulasResponse.reject(result);
      } else {
        formulasResponse.resolve(result);
      }
    });

  // NOTE: set up per test (not in `beforeAll`) so `jest.retryTimes()` re-renders
  // the editor on retry; RTL's auto-cleanup empties the DOM after a failed attempt.
  beforeEach(async () => {
    MockedMonacoEditorInstance.getValue.mockReturnValue('');
    MockedMonacoEditorInstance.getRawOptions.mockReturnValue({
      readOnly: true,
    });
    MOCK__editorStore = TEST__provideMockedEditorStore();
    renderResult = await TEST__setUpEditorWithDefaultSDLCData(
      MOCK__editorStore,
      { entities: TEST_DATA__SimpleRelationalEntities },
    );
    // Opening the database eagerly fires the formula loads (one batched engine
    // call for the joins in this database). Hold the engine response so each
    // test decides how and when it settles.
    createSpy(
      MOCK__editorStore.graphManagerState.graphManager,
      'relationalOperationElementToPureCode',
    ).mockReturnValue(
      new Promise((resolve, reject) => {
        formulasResponse = { resolve, reject };
      }),
    );
    await TEST__openElementFromExplorerTree('store::TestDB', renderResult);
  });

  test(
    integrationTest('Database editor renders with VIEW tab active'),
    async () => {
      await settleFormulas(new Map());
      const editorGroup = await waitFor(() => getEditorGroup());

      // Both tab buttons render — `prettyCONSTName` formats them as "View" / "Grammar".
      await waitFor(() => getByText(editorGroup, 'View'));
      await waitFor(() => getByText(editorGroup, 'Grammar'));

      // Read-only badge is always visible.
      await waitFor(() => getByText(editorGroup, 'READ ONLY'));
      await waitFor(() => getByTitle(editorGroup, 'This editor is read-only'));

      // Schema tree contents (VIEW tab is active by default) — schemas default
      // to expanded so table names render immediately. Schema and table names
      // also appear in the ERD canvas nodes, so we use `getAllByText` and just
      // assert at least one occurrence.
      await waitFor(() =>
        expect(getAllByText(editorGroup, 'default').length).toBeGreaterThan(0),
      );
      await waitFor(() =>
        expect(getAllByText(editorGroup, 'PersonTable').length).toBeGreaterThan(
          0,
        ),
      );
      await waitFor(() =>
        expect(getAllByText(editorGroup, 'FirmTable').length).toBeGreaterThan(
          0,
        ),
      );

      // The editor state's selectedTab confirms the default.
      const editorState = getEditorState();
      expect(editorState.selectedTab).toBe(DATABASE_EDITOR_TAB.VIEW);
      expect(editorState.isLoadingJoinFormulas).toBe(false);
    },
  );

  test(
    integrationTest('Database editor shows join formulas once rendered'),
    async () => {
      const editorGroup = await waitFor(() => getEditorGroup());

      // While the engine call is pending, rows show the placeholder and no copy button.
      expect(getEditorState().isLoadingJoinFormulas).toBe(true);
      await waitFor(() =>
        getByTitle(editorGroup, `FirmPerson: ${JOIN_FORMULA_PLACEHOLDER}`),
      );
      expect(queryAllByTitle(editorGroup, 'Copy join formula')).toHaveLength(0);

      await settleFormulas(JOIN_FORMULAS);

      for (const [joinName, formula] of JOIN_FORMULAS) {
        await waitFor(() => getByTitle(editorGroup, `${joinName}: ${formula}`));
        await waitFor(() => getByText(editorGroup, formula));
      }
      expect(getAllByTitle(editorGroup, 'Copy join formula')).toHaveLength(
        JOIN_FORMULAS.size,
      );
      expect(getEditorState().isLoadingJoinFormulas).toBe(false);
      // The copy button sits inside the clickable row, which is a `<button>`.
      expect(editorGroup.querySelector('button button')).toBeNull();
    },
  );

  test(
    integrationTest(
      'Database editor keeps join formula placeholders when rendering fails',
    ),
    async () => {
      const logErrorSpy = createSpy(
        MOCK__editorStore.applicationStore.logService,
        'error',
      );
      const editorGroup = await waitFor(() => getEditorGroup());

      await settleFormulas(new Error('engine is unavailable'));

      for (const joinName of JOIN_FORMULAS.keys()) {
        await waitFor(() =>
          getByTitle(editorGroup, `${joinName}: ${JOIN_FORMULA_PLACEHOLDER}`),
        );
      }
      expect(getEditorState().isLoadingJoinFormulas).toBe(false);
      expect(getEditorState().joinFormulas.size).toBe(0);
      expect(logErrorSpy).toHaveBeenCalled();
    },
  );

  test(
    integrationTest(
      'Database editor copies a join formula without selecting the join',
    ),
    async () => {
      const writeText = jest.fn(() => Promise.resolve());
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText },
        configurable: true,
      });
      const editorGroup = await waitFor(() => getEditorGroup());
      await settleFormulas(JOIN_FORMULAS);

      const formula = JOIN_FORMULAS.get('FirmPerson') as string;
      const row = await waitFor(() =>
        getByTitle(editorGroup, `FirmPerson: ${formula}`),
      );
      const copyButton = getByTitle(row, 'Copy join formula');
      // The "Copied!" state is set once the clipboard write resolves.
      await act(async () => {
        fireEvent.click(copyButton);
      });
      expect(writeText).toHaveBeenCalledWith(formula);
      await waitFor(() => getByTitle(row, 'Copied!'));
      expect(getEditorState().selectedJoin).toBeUndefined();

      // The copy button is also reachable from the keyboard.
      await act(async () => {
        fireEvent.keyDown(getByTitle(row, 'Copied!'), { key: 'Enter' });
      });
      expect(writeText).toHaveBeenCalledTimes(2);
      expect(getEditorState().selectedJoin).toBeUndefined();
    },
  );

  test(
    integrationTest('Database editor selects a join when its row is clicked'),
    async () => {
      const editorGroup = await waitFor(() => getEditorGroup());
      await settleFormulas(JOIN_FORMULAS);

      const row = await waitFor(() =>
        getByTitle(
          editorGroup,
          `FirmAddress: ${JOIN_FORMULAS.get('FirmAddress')}`,
        ),
      );
      fireEvent.click(row);

      expect(getEditorState().selectedJoin?.name).toBe('FirmAddress');
      await waitFor(() =>
        expect(
          row.classList.contains(
            'database-diagram__side-panel__join--selected',
          ),
        ).toBe(true),
      );
    },
  );

  test(
    integrationTest('Database editor filters schemas and joins by search text'),
    async () => {
      const editorGroup = await waitFor(() => getEditorGroup());
      await settleFormulas(JOIN_FORMULAS);
      const searchInput = getByPlaceholderText(
        editorGroup,
        'Filter schemas, tables, columns...',
      );

      fireEvent.change(searchInput, { target: { value: 'firm' } });
      await waitFor(() => getByText(editorGroup, '(2/3)'));
      await waitFor(() => getByText(editorGroup, '(1/1)'));
      expect(
        queryByTitle(
          editorGroup,
          `HobbyPerson: ${JOIN_FORMULAS.get('HobbyPerson')}`,
        ),
      ).toBeNull();

      fireEvent.change(searchInput, { target: { value: 'no-such-thing' } });
      await waitFor(() =>
        getByText(editorGroup, 'No joins match the current filter.'),
      );
      await waitFor(() =>
        getByText(editorGroup, 'No schemas match the current filter.'),
      );

      fireEvent.click(getByTitle(editorGroup, 'Clear filter'));
      expect(getEditorState().searchText).toBe('');
      await waitFor(() =>
        getByTitle(
          editorGroup,
          `HobbyPerson: ${JOIN_FORMULAS.get('HobbyPerson')}`,
        ),
      );
    },
  );

  test(
    integrationTest('Database editor switches between View and Grammar tabs'),
    async () => {
      const grammar = 'Database store::TestDB\n(\n)\n';
      let resolveGrammar: (value: string) => void = () => {};
      createSpy(
        MOCK__editorStore.graphManagerState.graphManager,
        'entitiesToPureCode',
      ).mockReturnValue(
        new Promise((resolve) => {
          resolveGrammar = resolve;
        }),
      );
      const editorGroup = await waitFor(() => getEditorGroup());
      await settleFormulas(JOIN_FORMULAS);

      fireEvent.click(getByText(editorGroup, 'Grammar'));
      await act(async () => {
        resolveGrammar(grammar);
      });
      expect(getEditorState().selectedTab).toBe(DATABASE_EDITOR_TAB.GRAMMAR);
      expect(getEditorState().textContent).toBe(grammar);
      expect(
        queryByPlaceholderText(
          editorGroup,
          'Filter schemas, tables, columns...',
        ),
      ).toBeNull();

      fireEvent.click(getByText(editorGroup, 'View'));
      expect(getEditorState().selectedTab).toBe(DATABASE_EDITOR_TAB.VIEW);
      await waitFor(() =>
        getByPlaceholderText(editorGroup, 'Filter schemas, tables, columns...'),
      );
    },
  );

  test(
    integrationTest('Database editor collapses and expands the side panel'),
    async () => {
      const editorGroup = await waitFor(() => getEditorGroup());
      await settleFormulas(JOIN_FORMULAS);
      expect(queryByTitle(editorGroup, 'Expand panel')).toBeNull();

      fireEvent.click(getByTitle(editorGroup, 'Collapse panel'));
      expect(getEditorState().isSidePanelCollapsed).toBe(true);
      const expandRail = await waitFor(() =>
        getByTitle(editorGroup, 'Expand panel'),
      );

      fireEvent.click(expandRail);
      expect(getEditorState().isSidePanelCollapsed).toBe(false);
      await waitFor(() =>
        expect(queryByTitle(editorGroup, 'Expand panel')).toBeNull(),
      );
    },
  );
});
