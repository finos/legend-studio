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

import { describe, test, expect, jest } from '@jest/globals';
import type {
  Column,
  DefaultMenuItem,
  GetContextMenuItemsParams,
  MenuItemDef,
} from 'ag-grid-community';
import { generateMenuBuilder } from '../DataCubeGridMenuBuilder.js';
import { DataCubeGridControllerState } from '../DataCubeGridControllerState.js';
import { CORE_PURE_PATH, PRIMITIVE_TYPE } from '@finos/legend-graph';
import {
  DataCubeColumnConfiguration,
  DataCubeConfiguration,
} from '../../../core/model/DataCubeConfiguration.js';
import { INTERNAL__GRID_CLIENT_MISSING_VALUE } from '../DataCubeGridClientEngine.js';

// ---------------------------------------------------------------------------
// Helpers — minimal fakes for the grid client API and the controller/view
// dependencies `generateMenuBuilder` reaches into while building the menu.
// ---------------------------------------------------------------------------

const makeColumn = (colId: string): Column =>
  ({ getColId: () => colId }) as unknown as Column;

interface MockApi {
  getCellRanges: ReturnType<typeof jest.fn>;
  getAllDisplayedColumns: ReturnType<typeof jest.fn>;
  getDisplayedRowCount: ReturnType<typeof jest.fn>;
  clearRangeSelection: ReturnType<typeof jest.fn>;
  addCellRange: ReturnType<typeof jest.fn>;
  copySelectedRangeToClipboard: ReturnType<typeof jest.fn>;
  autoSizeColumns: ReturnType<typeof jest.fn>;
  setColumnWidths: ReturnType<typeof jest.fn>;
  sizeColumnsToFit: ReturnType<typeof jest.fn>;
}

const makeMockApi = (
  cellRanges: unknown[] | null,
  allColumns: Column[] = [],
  displayedRowCount = 0,
): MockApi => ({
  getCellRanges: jest.fn(() => cellRanges),
  getAllDisplayedColumns: jest.fn(() => allColumns),
  getDisplayedRowCount: jest.fn(() => displayedRowCount),
  clearRangeSelection: jest.fn(),
  addCellRange: jest.fn(),
  copySelectedRangeToClipboard: jest.fn(),
  autoSizeColumns: jest.fn(),
  setColumnWidths: jest.fn(),
  sizeColumnsToFit: jest.fn(),
});

/** A bare-bones fake `DataCubeGridControllerState` — just enough surface
 * area for `generateMenuBuilder` to build the full menu without a column
 * selected, without throwing. */
const makeController = (): DataCubeGridControllerState =>
  ({
    view: {
      dataCube: {
        telemetryService: { sendTelemetry: jest.fn() },
        alertService: { alertUnhandledError: jest.fn() },
      },
      engine: {
        getDataFromSource: jest.fn(() => ({})),
        getFilterOperation: jest.fn(),
      },
      getInitialSource: jest.fn(() => ({})),
      alertService: { alert: jest.fn(), alertUnhandledError: jest.fn() },
      filter: { display: { open: jest.fn() } },
      editor: {
        display: { isOpen: false, open: jest.fn() },
        setCurrentTab: jest.fn(),
        columnProperties: { setSelectedColumnName: jest.fn() },
      },
      extend: { openNewColumnEditor: jest.fn() },
      grid: { exportEngine: {} },
    },
    getColumnConfiguration: jest.fn(() => undefined),
    leafExtendedColumns: [],
    groupExtendedColumns: [],
    sortColumns: [],
    verticalPivotColumns: [],
    horizontalPivotColumns: [],
    horizontalPivotCastColumns: [],
    configuration: { columns: [] },
    getSortableColumn: jest.fn(() => undefined),
    getVerticalPivotableColumn: jest.fn(() => undefined),
    getHorizontalPivotableColumn: jest.fn(() => undefined),
    clearFilters: jest.fn(),
  }) as unknown as DataCubeGridControllerState;

const findCopySubMenu = (
  items: (DefaultMenuItem | MenuItemDef)[],
): MenuItemDef[] => {
  const copy = items.find(
    (item): item is MenuItemDef =>
      typeof item !== 'string' && item.name === 'Copy',
  );
  return (copy?.subMenu ?? []).filter(
    (item): item is MenuItemDef => typeof item !== 'string',
  );
};

const buildCopyMenu = (
  cellRanges: unknown[] | null,
  fromHeader: boolean,
  allColumns: Column[] = [],
  displayedRowCount = 0,
) => {
  const controller = makeController();
  const builder = generateMenuBuilder(controller);
  const api = makeMockApi(cellRanges, allColumns, displayedRowCount);
  const params = {
    api,
    column: null,
    node: null,
    value: null,
  } as unknown as GetContextMenuItemsParams;
  const items = builder(params, fromHeader);
  const copyItems = findCopySubMenu(items);
  const byName = Object.fromEntries(copyItems.map((item) => [item.name, item]));
  return { byName, api };
};

const invoke = (item: MenuItemDef | undefined) => item?.action?.({} as never);

// ---------------------------------------------------------------------------

describe('generateMenuBuilder — Copy menu', () => {
  test('exposes exactly the three expected Copy options', () => {
    const { byName } = buildCopyMenu(null, false);
    expect(Object.keys(byName)).toEqual([
      'Plain Text',
      'Selected Rows as Plain Text',
      'Selected Column as Plain Text',
    ]);
  });

  test('all Copy options are disabled when there is no cell selection', () => {
    const { byName } = buildCopyMenu(null, false);
    expect(byName['Plain Text']?.disabled).toBe(true);
    expect(byName['Selected Rows as Plain Text']?.disabled).toBe(true);
    expect(byName['Selected Column as Plain Text']?.disabled).toBe(true);
  });

  test('all Copy options are disabled when the cell range selection is empty', () => {
    const { byName } = buildCopyMenu([], false);
    expect(byName['Plain Text']?.disabled).toBe(true);
    expect(byName['Selected Rows as Plain Text']?.disabled).toBe(true);
    expect(byName['Selected Column as Plain Text']?.disabled).toBe(true);
  });

  test('Plain Text and Selected Column are enabled once cells are selected, regardless of fromHeader', () => {
    for (const fromHeader of [false, true]) {
      const { byName } = buildCopyMenu([{}], fromHeader);
      expect(byName['Plain Text']?.disabled).toBe(false);
      expect(byName['Selected Column as Plain Text']?.disabled).toBe(false);
    }
  });

  test('Selected Rows as Plain Text is enabled with a selection from a body cell (not header)', () => {
    const { byName } = buildCopyMenu([{}], false);
    expect(byName['Selected Rows as Plain Text']?.disabled).toBe(false);
  });

  test('Selected Rows as Plain Text is disabled when the menu is opened from the column header, even with a selection', () => {
    const { byName } = buildCopyMenu([{}], true);
    expect(byName['Selected Rows as Plain Text']?.disabled).toBe(true);
  });

  test('"Plain Text" copies the current selection as-is via the grid clipboard API', () => {
    const range = {
      startRow: { rowIndex: 0 },
      endRow: { rowIndex: 0 },
      columns: [],
    };
    const { byName, api } = buildCopyMenu([range], false);

    invoke(byName['Plain Text']);

    expect(api.copySelectedRangeToClipboard).toHaveBeenCalledTimes(1);
    // no selection expansion should happen for the raw "Plain Text" option
    expect(api.addCellRange).not.toHaveBeenCalled();
  });

  test('"Selected Rows as Plain Text" expands the selection to the full row(s), using all displayed columns', () => {
    const colA = makeColumn('A');
    const colB = makeColumn('B');
    const range = {
      startRow: { rowIndex: 1 },
      endRow: { rowIndex: 1 },
      columns: [colA],
    };
    const { byName, api } = buildCopyMenu([range], false, [colA, colB], 10);

    invoke(byName['Selected Rows as Plain Text']);

    expect(api.addCellRange).toHaveBeenCalledWith(
      expect.objectContaining({
        rowStartIndex: 1,
        rowEndIndex: 1,
        columns: [colA, colB],
      }),
    );
    expect(api.copySelectedRangeToClipboard).toHaveBeenCalledTimes(1);
    // selection is restored to the original range after copying
    expect(api.clearRangeSelection).toHaveBeenCalledTimes(2);
  });

  test('"Selected Column as Plain Text" expands the selection to the full column, spanning all displayed rows', () => {
    const colA = makeColumn('A');
    const range = {
      startRow: { rowIndex: 4 },
      endRow: { rowIndex: 4 },
      columns: [colA],
    };
    const { byName, api } = buildCopyMenu([range], false, [colA], 10);

    invoke(byName['Selected Column as Plain Text']);

    expect(api.addCellRange).toHaveBeenCalledWith(
      expect.objectContaining({
        rowStartIndex: 0,
        rowEndIndex: 9,
        columns: [colA],
      }),
    );
    expect(api.copySelectedRangeToClipboard).toHaveBeenCalledTimes(1);
  });

  test('a disabled Copy option does nothing when there is no selection to act on', () => {
    const { byName, api } = buildCopyMenu(null, false);

    invoke(byName['Selected Rows as Plain Text']);
    invoke(byName['Selected Column as Plain Text']);

    expect(api.addCellRange).not.toHaveBeenCalled();
    expect(api.copySelectedRangeToClipboard).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------

const makeColumnController = (
  configurations: DataCubeColumnConfiguration[],
): DataCubeGridControllerState => {
  const controller = makeController();
  Object.assign(controller, {
    getColumnConfiguration: jest.fn((name: string | undefined) =>
      configurations.find((configuration) => configuration.name === name),
    ),
  });
  Object.assign(controller.view.engine, {
    getFilterOperation: jest.fn((operator: string) => ({
      textLabel: operator,
    })),
  });
  return controller;
};

const buildCellMenu = (
  configuration: DataCubeColumnConfiguration,
  value: unknown,
  fromHeader = false,
) => {
  const controller = makeColumnController([configuration]);
  const params = {
    api: makeMockApi(null),
    column: {
      getColId: () => configuration.name,
      isPinned: () => false,
      isPinnedLeft: () => false,
      isPinnedRight: () => false,
    } as unknown as Column,
    node: null,
    value,
  } as unknown as GetContextMenuItemsParams;
  return generateMenuBuilder(controller)(params, fromHeader);
};

const menuItemNames = (items: (DefaultMenuItem | MenuItemDef | undefined)[]) =>
  items
    .filter(
      (item): item is MenuItemDef =>
        item !== undefined && typeof item !== 'string',
    )
    .map((item) => item.name);

const subMenuItemNames = (
  items: (DefaultMenuItem | MenuItemDef)[],
  name: string,
): string[] =>
  menuItemNames(
    (items.find(
      (item): item is MenuItemDef =>
        typeof item !== 'string' && item.name === name,
    )?.subMenu ?? []) as (DefaultMenuItem | MenuItemDef)[],
  );

describe('generateMenuBuilder — Variant (JSON) column', () => {
  const variantColumn = new DataCubeColumnConfiguration(
    'payload',
    CORE_PURE_PATH.VARIANT,
  );

  test('a JSON cell offers to view its JSON value', () => {
    const items = buildCellMenu(variantColumn, '{"a":1}');
    expect(menuItemNames(items)).toContain('View JSON...');
    expect(subMenuItemNames(items, 'Filter')).toEqual([
      'Filters...',
      'Clear All Filters',
    ]);
  });

  test('an empty JSON cell, or the column header, offers no JSON view', () => {
    expect(
      menuItemNames(
        buildCellMenu(variantColumn, INTERNAL__GRID_CLIENT_MISSING_VALUE),
      ),
    ).not.toContain('View JSON...');
    expect(
      subMenuItemNames(
        buildCellMenu(variantColumn, INTERNAL__GRID_CLIENT_MISSING_VALUE),
        'Filter',
      ),
    ).toEqual([
      'Add Filter: payload is null',
      'Add Filter: payload is not null',
      'Filters...',
      'Clear All Filters',
    ]);
    expect(
      menuItemNames(buildCellMenu(variantColumn, '{"a":1}', true)),
    ).not.toContain('View JSON...');
  });

  test('a text cell holding a JSON object or array can be parsed as JSON', () => {
    const textColumn = new DataCubeColumnConfiguration(
      'note',
      PRIMITIVE_TYPE.STRING,
    );
    expect(
      subMenuItemNames(
        buildCellMenu(textColumn, '{"a":[1,2]}'),
        'Extended Columns',
      ),
    ).toContain('Parse Column note as JSON...');
    expect(
      subMenuItemNames(
        buildCellMenu(textColumn, 'plain text'),
        'Extended Columns',
      ),
    ).not.toContain('Parse Column note as JSON...');
    expect(
      subMenuItemNames(
        buildCellMenu(variantColumn, '{"a":1}'),
        'Extended Columns',
      ),
    ).not.toContain('Parse Column payload as JSON...');
    expect(
      subMenuItemNames(
        buildCellMenu(textColumn, '{"a":[1,2]}', true),
        'Extended Columns',
      ),
    ).not.toContain('Parse Column note as JSON...');
  });

  test('a JSON column can be pivoted vertically but not horizontally', () => {
    const controller = Object.create(
      DataCubeGridControllerState.prototype,
    ) as DataCubeGridControllerState;
    const configuration = new DataCubeConfiguration();
    configuration.columns = [variantColumn];
    Object.assign(controller, {
      configuration,
      groupExtendedColumns: [],
      horizontalPivotColumns: [],
    });
    expect(controller.getVerticalPivotableColumn('payload')).toBe(
      variantColumn,
    );
    expect(controller.getHorizontalPivotableColumn('payload')).toBeUndefined();
  });
});
