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

import { beforeEach, describe, expect, test } from '@jest/globals';
import {
  ColumnComparisonFilter,
  CompositeFilter,
  CompositeFilterOperator,
  Connection,
  CubeDocument,
  EnumType,
  Filter,
  FilterOperator,
  type FilterRule,
  PrimitiveType,
  Query,
  SchemaColumn,
  UnsupportedFilter,
} from '@finos/legend-cube';
import { fireEvent, screen, within } from '@testing-library/react';
import { FILTER_FLOAT_COMPARISON_HINT } from '../../../__lib__/LegendCubeLabels.js';
import { LEGEND_CUBE_TEST_ID } from '../../../__lib__/LegendCubeTesting.js';
import { TEST__findCanvasNode } from '../../../__test-utils__/CubeCanvasTestUtils.js';
import {
  NORTHWIND_RUNTIME,
  northwindTable,
  ORDERS_COLUMNS,
  SLICE_FILTER,
  sliceQuery,
} from '../../../__test-utils__/CubeNorthwindTestQueries.js';
import { TEST__renderInCubeApplication } from '../../../__test-utils__/CubePageTestUtils.js';
import { TEST__createCubeHost } from '../../../__test-utils__/CubeTestApplication.js';
import { CubeEditorState } from '../../../stores/CubeEditorState.js';
import { CUBE_NORTHWIND_MODEL } from '../../../stores/fixtures/CubeNorthwindModel.js';
import { CubeCanvas } from '../../canvas/CubeCanvas.js';
import { CubeNodeEditorPanel } from '../CubeNodeEditorPanel.js';

const CONTEXT = { model: CUBE_NORTHWIND_MODEL, runtime: NORTHWIND_RUNTIME };

/** The Northwind slice, its Filter with the given rule (none by default) */
const slice = (filter?: FilterRule): Query =>
  sliceQuery().replace(new Filter('filter101', filter));

/** ORDERS with a few more columns, filtered */
const ordersFiltered = (columns: SchemaColumn[], filter?: FilterRule): Query =>
  new Query(
    [
      northwindTable('relational101', 'ORDERS', columns),
      new Filter('filter101', filter),
    ],
    [new Connection('relational101', 'filter101', 'tds')],
    'filter101',
  );

const render = async (query: Query): Promise<CubeEditorState> => {
  const { host } = TEST__createCubeHost();
  const editorState = new CubeEditorState(
    host,
    new CubeDocument({ context: CONTEXT, query }),
  );
  await TEST__renderInCubeApplication(
    <div style={{ display: 'flex' }}>
      <div style={{ width: 800, height: 400 }}>
        <CubeCanvas editorState={editorState} />
      </div>
      <CubeNodeEditorPanel editorState={editorState} />
    </div>,
    host.applicationStore,
    LEGEND_CUBE_TEST_ID.CANVAS,
  );
  fireEvent.click(await TEST__findCanvasNode('filter101'));
  await screen.findByTestId(LEGEND_CUBE_TEST_ID.NODE_EDITOR);
  return editorState;
};

const panel = (): HTMLElement =>
  screen.getByTestId(LEGEND_CUBE_TEST_ID.NODE_EDITOR);

const conditions = (): HTMLElement[] =>
  within(panel()).getAllByTestId(LEGEND_CUBE_TEST_ID.FILTER_CONDITION);

const condition = (index: number): HTMLElement =>
  conditions()[index] as HTMLElement;

const operatorLabels = (row: HTMLElement): string[] =>
  Array.from(
    within(row).getByLabelText<HTMLSelectElement>('Filter operator').options,
  ).map((option) => option.text);

const pickColumn = (row: HTMLElement, name: string): void => {
  fireEvent.change(within(row).getByLabelText('Filter column'), {
    target: { value: name },
  });
};

const pickOperator = (row: HTMLElement, operator: FilterOperator): void => {
  fireEvent.change(within(row).getByLabelText('Filter operator'), {
    target: { value: operator },
  });
};

/** Types a value, as a user does: click the value, type, leave the input */
const typeValue = (row: HTMLElement, label: string, text: string): void => {
  fireEvent.click(within(row).getByRole('button', { name: label }));
  const input = within(row).getByRole<HTMLInputElement>('textbox', {
    name: label,
  });
  fireEvent.change(input, { target: { value: text } });
  fireEvent.blur(input);
};

const button = (name: string): HTMLButtonElement =>
  within(panel()).getByRole<HTMLButtonElement>('button', { name });

const problems = (): string[] =>
  Array.from(
    within(panel()).queryByRole('alert', { name: 'Problems' })?.children ?? [],
  ).map((problem) => problem.textContent ?? '');

const P = 'meta::pure::precisePrimitives::';

beforeEach(() => {
  localStorage.clear();
});

describe('Filter editor', () => {
  test('Builds the Part B rules, applied as one undo step, and the filter turns valid', async () => {
    const editorState = await render(slice());
    expect(problems()).toEqual(['Filter cannot be empty.']);
    pickColumn(condition(0), 'SHIP_COUNTRY');
    typeValue(condition(0), 'Filter value', 'France');

    fireEvent.click(button('Add condition'));
    pickColumn(condition(1), 'ORDER_DATE');
    pickOperator(condition(1), FilterOperator.GREATER_THAN_OR_EQUAL);
    fireEvent.click(
      within(condition(1)).getByRole('button', { name: 'Filter value' }),
    );
    // a date is picked with a date input
    const date = within(condition(1)).getByLabelText<HTMLInputElement>(
      'Filter value',
    );
    expect(date.type).toBe('date');
    fireEvent.change(date, { target: { value: '1997-01-01' } });
    fireEvent.blur(date);

    fireEvent.click(button('Add condition'));
    pickColumn(condition(2), 'EMPLOYEE_ID');
    pickOperator(condition(2), FilterOperator.IN);
    typeValue(condition(2), 'Add filter value', '1');
    typeValue(condition(2), 'Add filter value', '4');

    expect(problems()).toEqual([]);
    fireEvent.click(button('Apply'));
    const stored = editorState.document.query.getNode('filter101') as Filter;
    expect(stored.filter?.toString()).toBe(SLICE_FILTER.toString());
    expect(editorState.history).toHaveLength(1);
    expect(editorState.analysis.validity.get('filter101')).toEqual([]);
  });

  test('Stores nothing for an untouched blank condition: no undo step, and the filter still says it is empty', async () => {
    const editorState = await render(slice());
    expect(conditions()).toHaveLength(1);
    expect(button('Apply').disabled).toBe(true);
    fireEvent.click(button('Add condition'));
    fireEvent.click(button('Add group'));
    expect(button('Apply').disabled).toBe(true);
    fireEvent.click(
      within(panel()).getByRole('button', { name: 'Close the editor' }),
    );
    expect(editorState.history).toHaveLength(0);
    expect(editorState.analysis.validity.get('filter101')).toEqual([
      'Filter cannot be empty.',
    ]);
  });

  test("Offers the operators of the column's type", async () => {
    await render(slice());
    const row = condition(0);
    expect(
      within(row).getByLabelText<HTMLSelectElement>('Filter operator').disabled,
    ).toBe(true);
    pickColumn(row, 'EMPLOYEE_ID');
    const numeric = operatorLabels(condition(0));
    pickColumn(condition(0), 'SHIP_CITY');
    const text = operatorLabels(condition(0));
    expect(numeric).toContain('is greater than');
    expect(numeric).not.toContain('contains');
    expect(text).toContain('contains');
    expect(text).not.toContain('is greater than');
  });

  test('Keeps a value that is not one of the column type, marked as such whether shown or typed in', async () => {
    const editorState = await render(slice());
    pickColumn(condition(0), 'EMPLOYEE_ID');
    typeValue(condition(0), 'Filter value', 'abc');
    const message = 'Filter value "abc" is not a valid SmallInt.';
    const shown = within(condition(0)).getByRole('button', {
      name: 'Filter value',
    });
    expect(shown.textContent).toBe('abc');
    expect(shown.getAttribute('aria-invalid')).toBe('true');
    expect(shown.title).toBe(message);
    fireEvent.click(shown);
    const typed = within(condition(0)).getByRole('textbox', {
      name: 'Filter value',
    });
    expect(typed.getAttribute('aria-invalid')).toBe('true');
    expect(typed.title).toBe(message);
    fireEvent.blur(typed);
    expect(problems()).toEqual([message]);
    fireEvent.click(button('Apply'));
    const stored = editorState.document.query.getNode('filter101') as Filter;
    expect((stored.filter as ColumnComparisonFilter).value).toEqual({
      kind: 'invalid',
      text: 'abc',
    });
  });

  test('Shows (blank) for a value not entered yet', async () => {
    await render(slice());
    pickColumn(condition(0), 'SHIP_CITY');
    expect(
      within(condition(0)).getByRole('button', { name: 'Filter value' })
        .textContent,
    ).toBe('(blank)');
  });

  test('Hints that an exact comparison on a floating-point column may not match', async () => {
    await render(slice());
    pickColumn(condition(0), 'FREIGHT');
    expect(
      within(condition(0)).getByText(FILTER_FLOAT_COMPARISON_HINT),
    ).toBeDefined();
    pickOperator(condition(0), FilterOperator.GREATER_THAN);
    expect(
      within(condition(0)).queryByText(FILTER_FLOAT_COMPARISON_HINT),
    ).toBeNull();
  });

  test('Tells that negated conditions keep the rows with no value', async () => {
    await render(slice());
    expect(
      within(panel()).getByText(
        /also keeps the rows where its column is empty \(NULL\)/u,
      ),
    ).toBeDefined();
  });

  test('Shows a rule it cannot read as such, and keeps it through Apply', async () => {
    const unsupported = new UnsupportedFilter({ op: 'between', low: 1 });
    const editorState = await render(
      slice(
        new CompositeFilter(CompositeFilterOperator.AND, [
          new ColumnComparisonFilter('SHIP_COUNTRY', FilterOperator.EQUAL, {
            kind: 'string',
            value: 'France',
          }),
          unsupported,
        ]),
      ),
    );
    // in its place, and as a problem
    expect(
      within(panel()).getAllByText('This filter is not supported yet.'),
    ).toHaveLength(2);
    expect(problems()).toEqual(['This filter is not supported yet.']);
    // the rest stays editable
    typeValue(condition(0), 'Filter value', 'Spain');
    fireEvent.click(button('Apply'));
    const stored = (editorState.document.query.getNode('filter101') as Filter)
      .filter as CompositeFilter;
    expect(stored.rules[0]?.toString()).toBe('SHIP_COUNTRY is "Spain"');
    expect(stored.rules[1]).toBe(unsupported);
  });

  test('Negates a condition through its operator, and groups with Not', async () => {
    const editorState = await render(
      slice(
        new ColumnComparisonFilter('SHIP_COUNTRY', FilterOperator.EQUAL, {
          kind: 'string',
          value: 'France',
        }),
      ),
    );
    const negate = within(condition(0)).getByRole('button', {
      name: 'Negate the condition',
    });
    expect(negate.getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(negate);
    expect(
      within(condition(0)).getByLabelText<HTMLSelectElement>('Filter operator')
        .value,
    ).toBe(FilterOperator.NOT_EQUAL);
    fireEvent.click(button('Add group'));
    fireEvent.click(button('Negate the group'));
    expect(button('Remove the negation')).toBeDefined();
    pickColumn(condition(1), 'SHIP_CITY');
    typeValue(condition(1), 'Filter value', 'Paris');
    fireEvent.change(
      within(panel()).getByLabelText('Combine the conditions with'),
      { target: { value: CompositeFilterOperator.OR } },
    );
    fireEvent.click(button('Apply'));
    expect(
      (
        editorState.document.query.getNode('filter101') as Filter
      ).filter?.toString(),
    ).toBe('SHIP_COUNTRY is not "France" or not (SHIP_CITY is "Paris")');
  });

  test('Picks an enumeration value or a boolean, never typed, and a date-time with seconds', async () => {
    const columns = [
      ...ORDERS_COLUMNS,
      new SchemaColumn(
        'STATUS',
        new EnumType('test::Status', ['OPEN', 'SHIPPED']),
        true,
      ),
      new SchemaColumn('PAID', PrimitiveType.get('Boolean'), true),
      new SchemaColumn('SHIPPED_AT', PrimitiveType.get(`${P}Timestamp`), true),
    ];
    const editorState = await render(ordersFiltered(columns));
    pickColumn(condition(0), 'STATUS');
    const status = within(condition(0)).getByLabelText<HTMLSelectElement>(
      'Filter value',
    );
    expect(status.tagName).toBe('SELECT');
    expect(Array.from(status.options).map((option) => option.text)).toEqual([
      '(blank)',
      'OPEN',
      'SHIPPED',
    ]);
    fireEvent.change(status, { target: { value: 'SHIPPED' } });

    fireEvent.click(button('Add condition'));
    pickColumn(condition(1), 'PAID');
    const paid = within(condition(1)).getByLabelText<HTMLSelectElement>(
      'Filter value',
    );
    expect(Array.from(paid.options).map((option) => option.text)).toEqual([
      '(blank)',
      'true',
      'false',
    ]);
    fireEvent.change(paid, { target: { value: 'true' } });

    fireEvent.click(button('Add condition'));
    pickColumn(condition(2), 'SHIPPED_AT');
    fireEvent.click(
      within(condition(2)).getByRole('button', { name: 'Filter value' }),
    );
    const shippedAt = within(condition(2)).getByLabelText<HTMLInputElement>(
      'Filter value',
    );
    expect(shippedAt.type).toBe('datetime-local');
    expect(shippedAt.step).toBe('1');
    fireEvent.change(shippedAt, { target: { value: '1997-01-01T10:30:00' } });
    fireEvent.blur(shippedAt);

    fireEvent.click(button('Apply'));
    expect(
      (
        editorState.document.query.getNode('filter101') as Filter
      ).filter?.toString(),
    ).toBe(
      'STATUS is SHIPPED and PAID is true and SHIPPED_AT is 1997-01-01T10:30:00',
    );
  });

  test('Removes a value from a list, and a condition', async () => {
    const editorState = await render(
      slice(
        new CompositeFilter(CompositeFilterOperator.AND, [
          new ColumnComparisonFilter('EMPLOYEE_ID', FilterOperator.IN, [
            { kind: 'integer', value: '1' },
            { kind: 'integer', value: '4' },
          ]),
          new ColumnComparisonFilter('SHIP_CITY', FilterOperator.IS_EMPTY),
        ]),
      ),
    );
    fireEvent.click(
      within(condition(0)).getByRole('button', {
        name: 'Remove filter value 1',
      }),
    );
    fireEvent.click(
      within(condition(1)).getByRole('button', {
        name: 'Remove the condition',
      }),
    );
    fireEvent.click(button('Apply'));
    expect(
      (
        editorState.document.query.getNode('filter101') as Filter
      ).filter?.toString(),
    ).toBe('EMPLOYEE_ID is in list of (4)');
  });
});
