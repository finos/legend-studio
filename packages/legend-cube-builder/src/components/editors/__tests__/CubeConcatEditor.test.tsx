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
  Concat,
  Connection,
  CubeDocument,
  EnumType,
  PrimitiveType,
  Query,
  type QueryNode,
  RelationalTableSource,
  Rename,
  type RenameMapping,
  Restrict,
  Schema,
  SchemaColumn,
} from '@finos/legend-cube';
import {
  act,
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import {
  CONCAT_EDITOR_TEXT,
  CONCAT_RENAME_FIX_TEXT,
  CONCAT_RENAME_FIX_TITLE,
  getConcatRestrictFixText,
  getConcatRestrictFixTitle,
  READ_ONLY_CUBE_TITLE,
} from '../../../__lib__/LegendCubeLabels.js';
import { LEGEND_CUBE_TEST_ID } from '../../../__lib__/LegendCubeTesting.js';
import { TEST__findCanvasNode } from '../../../__test-utils__/CubeCanvasTestUtils.js';
import {
  CUSTOMERS_COLUMNS,
  NORTHWIND_DATABASE,
  NORTHWIND_RUNTIME,
  northwindTable,
  ORDERS_COLUMNS,
} from '../../../__test-utils__/CubeNorthwindTestQueries.js';
import {
  TEST__importDocument,
  TEST__renderInCubeApplication,
} from '../../../__test-utils__/CubePageTestUtils.js';
import { TEST__createCubeHost } from '../../../__test-utils__/CubeTestApplication.js';
import {
  FAKE_NORTHWIND_OUTLINE,
  type FakeCubeEngine,
} from '../../../__test-utils__/FakeCubeEngine.js';
import {
  type CubeModelOutline,
  CubeTableFlag,
} from '../../../graph-manager/CubeEngine.js';
import { CubeEditorState } from '../../../stores/CubeEditorState.js';
import { CUBE_NORTHWIND_MODEL } from '../../../stores/fixtures/CubeNorthwindModel.js';
import { CubeCanvas } from '../../canvas/CubeCanvas.js';
import { CubeNodeEditorPanel } from '../CubeNodeEditorPanel.js';

const CONTEXT = { model: CUBE_NORTHWIND_MODEL, runtime: NORTHWIND_RUNTIME };
const P = 'meta::pure::precisePrimitives::';
const SPEC_MESSAGE = 'Both input schemas must be identical.';
/** How the editor marks a name or type that differs from the other input's */
const ERROR_COLOUR = 'text-[var(--color-status-error)]';
const COMPANY_CITY_COUNTRY = ['COMPANY_NAME', 'CITY', 'COUNTRY'];

const varchar = (name: string, length: number, nullable = true) =>
  new SchemaColumn(name, PrimitiveType.get(`${P}Varchar`, [length]), nullable);

/** SUPPLIERS, typed as the engine types the Cube fixture */
const SUPPLIERS_COLUMNS = [
  new SchemaColumn('SUPPLIER_ID', PrimitiveType.get(`${P}SmallInt`), false),
  varchar('COMPANY_NAME', 40, false),
  varchar('CONTACT_NAME', 30),
  varchar('CONTACT_TITLE', 30),
  varchar('ADDRESS', 60),
  varchar('CITY', 15),
  varchar('REGION', 15),
  varchar('POSTAL_CODE', 10),
  varchar('COUNTRY', 15),
  varchar('PHONE', 24),
  varchar('FAX', 24),
  varchar('HOMEPAGE', 256),
];

/** CUBETEST.ALLTYPES' key and text column, as the engine types them */
const ALLTYPES_COLUMNS = [
  new SchemaColumn('ID', PrimitiveType.get(`${P}Int`), false),
  varchar('VC', 20),
];

/** CUBETEST.PROBLEM_OTHER: its O column is OTHER, which Cube types as a bare String */
const PROBLEM_OTHER_COLUMNS = [
  new SchemaColumn('ID', PrimitiveType.get(`${P}Int`), false),
  new SchemaColumn('O', PrimitiveType.get('String'), true),
];

const cubeTestTable = (
  id: string,
  name: string,
  columns: SchemaColumn[],
): RelationalTableSource =>
  new RelationalTableSource(
    id,
    { database: NORTHWIND_DATABASE, schema: 'CUBETEST', table: name },
    { kind: 'resolved', schema: new Schema(columns) },
  );

/** The fake's outline, with CUBETEST's ALLTYPES and PROBLEM_OTHER, whose O column Cube can't type */
const OUTLINE_WITH_PROBLEM_OTHER: CubeModelOutline = {
  ...FAKE_NORTHWIND_OUTLINE,
  databases: FAKE_NORTHWIND_OUTLINE.databases.map((database) => ({
    ...database,
    schemas: [
      ...database.schemas,
      {
        name: 'CUBETEST',
        tables: [
          {
            name: 'ALLTYPES',
            isView: false,
            columnCount: 12,
            flags: [],
            untypedColumns: [],
          },
          {
            name: 'PROBLEM_OTHER',
            isView: false,
            columnCount: PROBLEM_OTHER_COLUMNS.length,
            flags: [CubeTableFlag.TYPE_UNKNOWN],
            untypedColumns: ['O'],
          },
        ],
      },
    ],
  })),
};

/**
 * One input of the concat: a table, then a Restrict to the columns when they
 * are given, then a Rename when there are mappings, each feeding the next
 */
const arm = (
  side: 1 | 2,
  source: RelationalTableSource,
  columns?: readonly string[],
  mappings: readonly RenameMapping[] = [],
): QueryNode[] => [
  source,
  ...(columns ? [new Restrict(`restrict10${side}`, columns)] : []),
  ...(mappings.length ? [new Rename(`rename10${side}`, mappings)] : []),
];

/** concat101 of the two inputs, on its First and Second, captured at the concat */
const concatOf = (
  first: readonly QueryNode[],
  second: readonly QueryNode[],
): Query => {
  const concat = new Concat('concat101');
  return new Query(
    [...first, ...second, concat],
    [first, second].flatMap((nodes, side) =>
      nodes.map((node, index) => {
        const next = nodes[index + 1];
        return next
          ? new Connection(node.id, next.id, next.ports[0] as string)
          : new Connection(node.id, concat.id, concat.ports[side] as string);
      }),
    ),
    concat.id,
  );
};

/** CUSTOMERS restricted to the columns, as the first input */
const customers = (columns = COMPANY_CITY_COUNTRY): QueryNode[] =>
  arm(
    1,
    northwindTable('relational101', 'CUSTOMERS', CUSTOMERS_COLUMNS),
    columns,
  );

/** SUPPLIERS restricted to the columns, as the second input */
const suppliers = (columns = COMPANY_CITY_COUNTRY): QueryNode[] =>
  arm(
    2,
    northwindTable('relational102', 'SUPPLIERS', SUPPLIERS_COLUMNS),
    columns,
  );

/** ORDERS restricted to some columns, each renamed (`[column, new name]`), as the second input */
const ordersAs = (renames: [string, string][]): QueryNode[] =>
  arm(
    2,
    northwindTable('relational102', 'ORDERS', ORDERS_COLUMNS),
    renames.map(([from]) => from),
    renames
      .filter(([from, to]) => from !== to)
      .map(([from, to]) => ({ from, to })),
  );

const render = async (
  query: Query,
  prepare?: (fake: FakeCubeEngine) => void,
): Promise<CubeEditorState> => {
  const { host, fake } = TEST__createCubeHost();
  prepare?.(fake);
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
  return editorState;
};

const panel = (): HTMLElement =>
  screen.getByTestId(LEGEND_CUBE_TEST_ID.NODE_EDITOR);

const openConcat = async (): Promise<HTMLElement> => {
  fireEvent.click(await TEST__findCanvasNode('concat101'));
  return screen.findByTestId(LEGEND_CUBE_TEST_ID.NODE_EDITOR);
};

/** Waits for the editor to have loaded the model's outline, so a missing warning means something */
const outlineLoaded = async (editorState: CubeEditorState): Promise<void> =>
  waitFor(() => expect(editorState.modelOutline).toBeDefined());

const problems = (): string[] =>
  Array.from(
    within(panel()).queryByRole('alert', { name: 'Problems' })?.children ?? [],
  ).map((problem) => problem.textContent ?? '');

const comparison = (): HTMLElement =>
  within(panel()).getByRole('table', { name: 'Columns by position' });

/** The table's body rows, each as its cells: the position, then the First and Second input's columns */
const bodyRows = (): HTMLElement[][] =>
  within(comparison())
    .getAllByRole('row')
    .slice(1)
    .map((row) => Array.from(row.children) as HTMLElement[]);

/** Each position as shown: `#`, then each input's column as `name type`, or `(none)` */
const positions = (): string[][] =>
  bodyRows().map((cells) =>
    cells.map((cell) =>
      cell.children.length
        ? Array.from(cell.children)
            .map((part) => part.textContent)
            .join(' ')
        : (cell.textContent ?? ''),
    ),
  );

const SIDES = ['First', 'Second'];

/**
 * What the table marks in the error colour, each as `<#> <input> <name, type
 * or (none)>: <its title>`, in order
 */
const marks = (): string[] =>
  bodyRows().flatMap(([, ...cells], index) =>
    cells.flatMap((cell, side) => {
      const [name, type] = Array.from(cell.children) as HTMLElement[];
      const parts: [string, HTMLElement][] =
        name && type
          ? [
              ['name', name],
              ['type', type],
            ]
          : [['(none)', cell]];
      return parts
        .filter(([, part]) => part.classList.contains(ERROR_COLOUR))
        .map(
          ([what, part]) =>
            `${index + 1} ${SIDES[side]} ${what}: ${part.getAttribute('title')}`,
        );
    }),
  );

const cellParts = (
  position: number,
  side: 0 | 1,
): { name: HTMLElement; type: HTMLElement } => {
  const [name, type] = Array.from(
    (bodyRows()[position - 1] as HTMLElement[])[side + 1]?.children ?? [],
  ) as HTMLElement[];
  return { name: name as HTMLElement, type: type as HTMLElement };
};

const TYPE_UNKNOWN = /^type unknown: /u;

beforeEach(() => {
  localStorage.clear();
});

describe('Concat editor', () => {
  test('Shows its label and help, says what Concat requires, and labels its inputs First and Second', async () => {
    await render(concatOf(customers(), suppliers()));
    const editor = await openConcat();
    expect(within(editor).getByText('Concatenate Another Input')).toBeDefined();
    expect(within(editor).getByText('concat101')).toBeDefined();
    expect(within(editor).getByRole('img', { name: 'Help' }).title).toBe(
      'Combines the rows of the two previous data sets, keeping duplicates, in no particular order. Both must have the same columns: the same names, in the same order, with the same types.',
    );
    expect(within(editor).getByText(CONCAT_EDITOR_TEXT)).toBeDefined();
    expect(CONCAT_EDITOR_TEXT).toBe(
      'Gives the rows of both inputs, keeping duplicates, in no particular order. Both must have the same columns, matched by position: the same names, in the same order, with the same types.',
    );
    expect(
      within(comparison())
        .getAllByRole('columnheader')
        .map((header) => header.textContent),
    ).toEqual(['#', 'First', 'Second']);
    // the canvas labels the edges into the concat the same way
    expect(
      screen
        .getAllByTestId(LEGEND_CUBE_TEST_ID.CANVAS_EDGE_LABEL)
        .map((label) => label.textContent),
    ).toEqual(['First', 'Second']);
  });

  test('Lists matching inputs position by position, nothing marked, with no problem and nothing to apply', async () => {
    const editorState = await render(concatOf(customers(), suppliers()));
    await openConcat();
    expect(positions()).toEqual([
      ['1', 'COMPANY_NAME Varchar(40)', 'COMPANY_NAME Varchar(40)'],
      ['2', 'CITY Varchar(15)?', 'CITY Varchar(15)?'],
      ['3', 'COUNTRY Varchar(15)?', 'COUNTRY Varchar(15)?'],
    ]);
    expect(marks()).toEqual([]);
    // an unmarked name's title is the name itself; an unmarked type has none
    const { name, type } = cellParts(2, 1);
    expect(name.getAttribute('title')).toBe('CITY');
    expect(type.getAttribute('title')).toBeNull();
    expect(problems()).toEqual([]);
    expect(editorState.analysis.validity.get('concat101')).toEqual([]);
    expect(within(panel()).queryByRole('button', { name: 'Apply' })).toBeNull();
    expect(
      within(panel()).queryByRole('button', { name: 'Cancel' }),
    ).toBeNull();
    // no column of either input is untyped
    await outlineLoaded(editorState);
    expect(within(panel()).queryByText(TYPE_UNKNOWN)).toBeNull();
    // closing stores nothing
    const { query } = editorState.document;
    fireEvent.click(
      within(panel()).getByRole('button', { name: 'Close the editor' }),
    );
    expect(screen.queryByTestId(LEGEND_CUBE_TEST_ID.NODE_EDITOR)).toBeNull();
    expect(editorState.document.query === query).toBe(true);
    expect(editorState.history).toHaveLength(0);
  });

  test('Marks a name that differs at a position on both sides, saying what the other input has there', async () => {
    const editorState = await render(
      concatOf(
        customers(),
        ordersAs([
          ['SHIP_NAME', 'COMPANY_NAME'],
          ['SHIP_CITY', 'CITY'],
          ['SHIP_REGION', 'SHIP_REGION'],
        ]),
      ),
    );
    await openConcat();
    expect(positions()).toEqual([
      ['1', 'COMPANY_NAME Varchar(40)', 'COMPANY_NAME Varchar(40)?'],
      ['2', 'CITY Varchar(15)?', 'CITY Varchar(15)?'],
      ['3', 'COUNTRY Varchar(15)?', 'SHIP_REGION Varchar(15)?'],
    ]);
    expect(marks()).toEqual([
      '3 First name: The second input has SHIP_REGION here',
      '3 Second name: The first input has COUNTRY here',
    ]);
    expect(problems()).toEqual([
      SPEC_MESSAGE,
      'Column 3 is "COUNTRY" in the first input and "SHIP_REGION" in the second: columns are matched by position.',
    ]);
    expect(editorState.analysis.validity.get('concat101')).toEqual(problems());
    expect(within(panel()).queryByRole('button', { name: 'Apply' })).toBeNull();
  });

  test('Marks a type that differs, a Varchar of another length, on both sides', async () => {
    await render(
      concatOf(
        customers(['CONTACT_NAME', 'CITY', 'COUNTRY']),
        ordersAs([
          ['SHIP_NAME', 'CONTACT_NAME'],
          ['SHIP_CITY', 'CITY'],
          ['SHIP_COUNTRY', 'COUNTRY'],
        ]),
      ),
    );
    await openConcat();
    expect(positions()).toEqual([
      ['1', 'CONTACT_NAME Varchar(30)?', 'CONTACT_NAME Varchar(40)?'],
      ['2', 'CITY Varchar(15)?', 'CITY Varchar(15)?'],
      ['3', 'COUNTRY Varchar(15)?', 'COUNTRY Varchar(15)?'],
    ]);
    expect(marks()).toEqual([
      '1 First type: The second input has Varchar(40)? here',
      '1 Second type: The first input has Varchar(30)? here',
    ]);
    expect(problems()).toEqual([
      SPEC_MESSAGE,
      'Column "CONTACT_NAME" is Varchar(30) in the first input and Varchar(40) in the second.',
    ]);
  });

  test('Shows the paths of two different types that share a short name', async () => {
    await render(
      concatOf(
        [
          northwindTable('relational101', 'CUSTOMERS', [
            new SchemaColumn('REGION', new EnumType('a::Region', ['EU']), true),
          ]),
        ],
        [
          northwindTable('relational102', 'SUPPLIERS', [
            new SchemaColumn(
              'REGION',
              new EnumType('b::Region', ['EU']),
              false,
            ),
          ]),
        ],
      ),
    );
    await openConcat();
    expect(positions()).toEqual([
      ['1', 'REGION a::Region?', 'REGION b::Region'],
    ]);
    expect(marks()).toEqual([
      '1 First type: The second input has b::Region here',
      '1 Second type: The first input has a::Region? here',
    ]);
    expect(problems()).toEqual([
      SPEC_MESSAGE,
      'Column "REGION" is a::Region in the first input and b::Region in the second.',
    ]);
  });

  test('Marks the names of inputs whose columns are the same in another order, with one message for the order', async () => {
    await render(
      concatOf(
        customers(),
        ordersAs([
          ['SHIP_NAME', 'COMPANY_NAME'],
          ['SHIP_CITY', 'COUNTRY'],
          ['SHIP_COUNTRY', 'CITY'],
        ]),
      ),
    );
    await openConcat();
    expect(positions()).toEqual([
      ['1', 'COMPANY_NAME Varchar(40)', 'COMPANY_NAME Varchar(40)?'],
      ['2', 'CITY Varchar(15)?', 'COUNTRY Varchar(15)?'],
      ['3', 'COUNTRY Varchar(15)?', 'CITY Varchar(15)?'],
    ]);
    expect(marks()).toEqual([
      '2 First name: The second input has COUNTRY here',
      '2 Second name: The first input has CITY here',
      '3 First name: The second input has CITY here',
      '3 Second name: The first input has COUNTRY here',
    ]);
    expect(problems()).toEqual([
      SPEC_MESSAGE,
      'The inputs have the same columns in a different order: columns are matched by position.',
    ]);
  });

  test('Shows (none) where only one input has a column, and lists the counts as a problem', async () => {
    const editorState = await render(
      concatOf(customers(), suppliers(['COMPANY_NAME', 'CITY'])),
    );
    await openConcat();
    expect(positions()).toEqual([
      ['1', 'COMPANY_NAME Varchar(40)', 'COMPANY_NAME Varchar(40)'],
      ['2', 'CITY Varchar(15)?', 'CITY Varchar(15)?'],
      ['3', 'COUNTRY Varchar(15)?', '(none)'],
    ]);
    expect(marks()).toEqual([
      '3 Second (none): Only the first input has a column here',
    ]);
    // the spec's message first, then Cube's
    expect(problems()).toEqual([
      SPEC_MESSAGE,
      'The first input has 3 columns and the second 2.',
    ]);
    expect(editorState.analysis.validity.get('concat101')).toEqual(problems());
    expect(editorState.analysis.schemas.get('concat101')).toBeUndefined();
    expect(within(panel()).queryByRole('button', { name: 'Apply' })).toBeNull();
    expect(
      within(panel()).queryByRole('button', { name: 'Cancel' }),
    ).toBeNull();
  });

  test('Does not mark a column nullable in one input only', async () => {
    const editorState = await render(
      concatOf(
        customers(['CUSTOMER_ID', 'COMPANY_NAME']),
        ordersAs([
          ['CUSTOMER_ID', 'CUSTOMER_ID'],
          ['SHIP_NAME', 'COMPANY_NAME'],
        ]),
      ),
    );
    await openConcat();
    expect(positions()).toEqual([
      ['1', 'CUSTOMER_ID Varchar(5)', 'CUSTOMER_ID Varchar(5)?'],
      ['2', 'COMPANY_NAME Varchar(40)', 'COMPANY_NAME Varchar(40)?'],
    ]);
    expect(marks()).toEqual([]);
    expect(problems()).toEqual([]);
    // the concat's columns are nullable, as the second input's are
    expect(
      editorState.analysis.schemas
        .get('concat101')
        ?.columns.map((column) => column.nullable),
    ).toEqual([true, true]);
  });

  test('Follows its inputs when they are swapped, from the canvas menu or the editor state, one undo step each', async () => {
    const editorState = await render(
      concatOf(customers(), suppliers(['COMPANY_NAME', 'CITY'])),
    );
    await openConcat();
    fireEvent.contextMenu(await TEST__findCanvasNode('concat101'));
    const menu = await screen.findByRole('menu');
    fireEvent.click(within(menu).getByRole('button', { name: 'Swap Inputs' }));
    expect(editorState.document.query.getInputIds('concat101')).toEqual([
      'restrict102',
      'restrict101',
    ]);
    expect(editorState.history).toHaveLength(1);
    // the panel goes on, on the concat, its columns swapped
    expect(editorState.nodeEditor.nodeId).toBe('concat101');
    expect(positions()).toEqual([
      ['1', 'COMPANY_NAME Varchar(40)', 'COMPANY_NAME Varchar(40)'],
      ['2', 'CITY Varchar(15)?', 'CITY Varchar(15)?'],
      ['3', '(none)', 'COUNTRY Varchar(15)?'],
    ]);
    expect(marks()).toEqual([
      '3 First (none): Only the second input has a column here',
    ]);
    expect(problems()).toEqual([
      SPEC_MESSAGE,
      'The first input has 2 columns and the second 3.',
    ]);
    // and back, from the editor's state
    act(() => editorState.nodeEditor.swapInputs());
    expect(editorState.document.query.getInputIds('concat101')).toEqual([
      'restrict101',
      'restrict102',
    ]);
    expect(editorState.history).toHaveLength(2);
    expect(positions().at(-1)).toEqual(['3', 'COUNTRY Varchar(15)?', '(none)']);
    expect(problems()).toEqual([
      SPEC_MESSAGE,
      'The first input has 3 columns and the second 2.',
    ]);
    expect(editorState.nodeEditor.notice).toBeUndefined();
  });

  test("Warns, once the model's outline loads, about each column whose real type Cube doesn't know", async () => {
    let answer: (outline: CubeModelOutline) => void = () => undefined;
    const editorState = await render(
      concatOf(
        [
          cubeTestTable(
            'relational101',
            'PROBLEM_OTHER',
            PROBLEM_OTHER_COLUMNS,
          ),
        ],
        [
          cubeTestTable(
            'relational102',
            'PROBLEM_OTHER',
            PROBLEM_OTHER_COLUMNS,
          ),
        ],
      ),
      (fake) =>
        fake.loadModel.mockReturnValueOnce(
          new Promise((resolve) => {
            answer = resolve;
          }),
        ),
    );
    await openConcat();
    expect(positions()).toEqual([
      ['1', 'ID Int', 'ID Int'],
      ['2', 'O String?', 'O String?'],
    ]);
    // not known before the outline
    expect(within(panel()).queryByText(TYPE_UNKNOWN)).toBeNull();
    await act(async () => {
      answer(OUTLINE_WITH_PROBLEM_OTHER);
    });
    const warning = await within(panel()).findByText(TYPE_UNKNOWN);
    expect(warning.textContent).toBe(
      "type unknown: Cube doesn't know the real type of O (first input), O (second input), so the database may not combine the inputs' values",
    );
    expect(warning.title).toBe(
      "A column's type (OTHER or ARRAY) is not known to Cube.",
    );
    // a warning, not a problem
    expect(problems()).toEqual([]);
    expect(editorState.analysis.validity.get('concat101')).toEqual([]);
  });

  test('Names only the untyped column, through a Rename, on the input it is in', async () => {
    const editorState = await render(
      concatOf(
        arm(1, cubeTestTable('relational101', 'ALLTYPES', ALLTYPES_COLUMNS), [
          'ID',
          'VC',
        ]),
        arm(
          2,
          cubeTestTable(
            'relational102',
            'PROBLEM_OTHER',
            PROBLEM_OTHER_COLUMNS,
          ),
          undefined,
          [{ from: 'O', to: 'VC' }],
        ),
      ),
      (fake) => fake.loadModel.mockResolvedValue(OUTLINE_WITH_PROBLEM_OTHER),
    );
    await openConcat();
    expect((await within(panel()).findByText(TYPE_UNKNOWN)).textContent).toBe(
      "type unknown: Cube doesn't know the real type of VC (second input), so the database may not combine the inputs' values",
    );
    expect(marks()).toEqual([
      '2 First type: The second input has String? here',
      '2 Second type: The first input has Varchar(20)? here',
    ]);
    expect(problems()).toEqual([
      SPEC_MESSAGE,
      'Column "VC" is Varchar(20) in the first input and String in the second.',
    ]);
    act(() => editorState.nodeEditor.swapInputs());
    expect(within(panel()).getByText(TYPE_UNKNOWN).textContent).toBe(
      "type unknown: Cube doesn't know the real type of VC (first input), so the database may not combine the inputs' values",
    );
  });

  test('Shows the same comparison in a read-only cube, with nothing to apply', async () => {
    const query = concatOf(customers(), suppliers(['COMPANY_NAME', 'CITY']));
    const editorState = await render(new Query());
    await TEST__importDocument(
      editorState,
      new CubeDocument({ context: CONTEXT, query }),
      true,
    );
    await openConcat();
    expect(positions()).toEqual([
      ['1', 'COMPANY_NAME Varchar(40)', 'COMPANY_NAME Varchar(40)'],
      ['2', 'CITY Varchar(15)?', 'CITY Varchar(15)?'],
      ['3', 'COUNTRY Varchar(15)?', '(none)'],
    ]);
    expect(marks()).toEqual([
      '3 Second (none): Only the first input has a column here',
    ]);
    expect(problems()).toEqual([
      SPEC_MESSAGE,
      'The first input has 3 columns and the second 2.',
    ]);
    expect(within(panel()).queryByRole('button', { name: 'Apply' })).toBeNull();
    expect(editorState.nodeEditor.canSwapInputs).toBe(false);
    act(() => editorState.nodeEditor.swapInputs());
    expect(editorState.document.query.getInputIds('concat101')).toEqual([
      'restrict101',
      'restrict102',
    ]);
  });

  test('Shows that an input is missing instead of the comparison', async () => {
    await render(
      new Query(
        [...customers(), new Concat('concat101')],
        [
          new Connection('relational101', 'restrict101', 'tds'),
          new Connection('restrict101', 'concat101', 'tds1'),
        ],
        'concat101',
      ),
    );
    const editor = await openConcat();
    expect(within(editor).getByRole('alert').textContent).toBe(
      'This node requires more inputs. Please drag and drop another input to associate.',
    );
    expect(
      within(editor).queryByRole('table', { name: 'Columns by position' }),
    ).toBeNull();
    expect(problems()).toEqual([]);
  });

  test('Shows that an input is invalid instead of the comparison', async () => {
    await render(concatOf(customers(['COMPANY_NAME', 'NOPE']), suppliers()));
    const editor = await openConcat();
    expect(within(editor).getByRole('alert').textContent).toBe(
      'This node depends on some invalid inputs. Please correct these first.',
    );
    expect(
      within(editor).queryByRole('table', { name: 'Columns by position' }),
    ).toBeNull();
    expect(problems()).toEqual([]);
  });
});

describe('Concat editor, its autofixes (PLAN §11.5, Q6)', () => {
  const button = (name: string): HTMLButtonElement =>
    within(panel()).getByRole<HTMLButtonElement>('button', { name });

  /** The items of a fix's list of columns */
  const fixList = (name: string): string[] =>
    within(within(panel()).getByRole('list', { name }))
      .getAllByRole('listitem')
      .map((item) => item.textContent ?? '');

  /** Neither fix is offered: no text, no list, no button */
  const expectNoFix = (): void => {
    const editor = panel();
    expect(within(editor).queryByText(CONCAT_RENAME_FIX_TEXT)).toBeNull();
    expect(within(editor).queryByText(/which can be dropped:$/u)).toBeNull();
    ['Columns to rename', 'Columns to drop'].forEach((name) =>
      expect(within(editor).queryByRole('list', { name })).toBeNull(),
    );
    ['Rename them', 'Drop them'].forEach((name) =>
      expect(within(editor).queryByRole('button', { name })).toBeNull(),
    );
  };

  /** The second input has REGION where the first has CITY */
  const regionForCity = (): Query =>
    concatOf(customers(), suppliers(['COMPANY_NAME', 'REGION', 'COUNTRY']));

  /** The second input has SUPPLIER_ID before the first input's columns */
  const supplierIdToo = (): Query =>
    concatOf(customers(), suppliers(['SUPPLIER_ID', ...COMPANY_CITY_COUNTRY]));

  const MATCHED = [
    ['1', 'COMPANY_NAME Varchar(40)', 'COMPANY_NAME Varchar(40)'],
    ['2', 'CITY Varchar(15)?', 'CITY Varchar(15)?'],
    ['3', 'COUNTRY Varchar(15)?', 'COUNTRY Varchar(15)?'],
  ];

  test("Offers to give the second input's differing names the first input's, then adds a Rename before it, as one undo step", async () => {
    const editorState = await render(regionForCity());
    await openConcat();
    const regionMarks = [
      '2 First name: The second input has REGION here',
      '2 Second name: The first input has CITY here',
    ];
    expect(marks()).toEqual(regionMarks);
    expect(within(panel()).getByText(CONCAT_RENAME_FIX_TEXT)).toBeDefined();
    expect(CONCAT_RENAME_FIX_TEXT).toBe(
      "The second input's columns can take the first input's names:",
    );
    expect(fixList('Columns to rename')).toEqual(['REGION → CITY']);
    expect(button('Rename them').disabled).toBe(false);
    expect(button('Rename them').title).toBe(CONCAT_RENAME_FIX_TITLE);
    expect(CONCAT_RENAME_FIX_TITLE).toBe(
      "Add a Rename before the second input that gives these columns the first input's names, as one step to undo",
    );
    // the counts match: nothing to drop
    expect(
      within(panel()).queryByRole('button', { name: 'Drop them' }),
    ).toBeNull();
    const before = editorState.document.query;
    fireEvent.click(button('Rename them'));
    const { query } = editorState.document;
    expect(query.getInputIds('concat101')).toEqual([
      'restrict101',
      'rename101',
    ]);
    expect(query.getInputIds('rename101')).toEqual(['restrict102']);
    expect((query.getNode('rename101') as Rename).mappings).toEqual([
      { from: 'REGION', to: 'CITY' },
    ]);
    expect(editorState.history).toHaveLength(1);
    expect(editorState.history.at(-1)?.query === before).toBe(true);
    expect(await TEST__findCanvasNode('rename101')).toBeDefined();
    // the panel goes on, on the concat, now valid, with nothing marked or to fix
    expect(editorState.nodeEditor.nodeId).toBe('concat101');
    expect(editorState.nodeEditor.notice).toBeUndefined();
    expect(positions()).toEqual(MATCHED);
    expect(marks()).toEqual([]);
    expect(problems()).toEqual([]);
    expect(editorState.analysis.validity.get('concat101')).toEqual([]);
    expectNoFix();
    // Undo brings back the marks, the problems and the fix
    act(() => editorState.undo());
    expect(editorState.document.query.getNode('rename101')).toBeUndefined();
    expect(editorState.nodeEditor.nodeId).toBe('concat101');
    expect(marks()).toEqual(regionMarks);
    expect(problems()).toEqual([
      SPEC_MESSAGE,
      'Column 2 is "CITY" in the first input and "REGION" in the second: columns are matched by position.',
    ]);
    expect(fixList('Columns to rename')).toEqual(['REGION → CITY']);
    expect(button('Rename them').disabled).toBe(false);
  });

  test('Offers to rename a column whose name differs only in case', async () => {
    const editorState = await render(
      concatOf(
        customers(),
        arm(
          2,
          northwindTable('relational102', 'SUPPLIERS', SUPPLIERS_COLUMNS),
          COMPANY_CITY_COUNTRY,
          [{ from: 'CITY', to: 'city' }],
        ),
      ),
    );
    await openConcat();
    expect(marks()).toEqual([
      '2 First name: The second input has city here',
      '2 Second name: The first input has CITY here',
    ]);
    expect(fixList('Columns to rename')).toEqual(['city → CITY']);
    fireEvent.click(button('Rename them'));
    // after the Rename the second input already had
    expect(editorState.document.query.getInputIds('concat101')).toEqual([
      'restrict101',
      'rename103',
    ]);
    expect(editorState.document.query.getInputIds('rename103')).toEqual([
      'rename102',
    ]);
    expect(marks()).toEqual([]);
    expect(problems()).toEqual([]);
    expectNoFix();
  });

  test('Keeps the node Execute runs selected, even the input the Rename goes after', async () => {
    const editorState = await render(regionForCity());
    act(() => editorState.select('restrict102'));
    await openConcat();
    fireEvent.click(button('Rename them'));
    expect(editorState.document.query.selected).toBe('restrict102');
    expect(editorState.history).toHaveLength(2);
  });

  test('Offers to drop the columns only the second input has, naming it, then adds a Restrict before it, as one undo step', async () => {
    const editorState = await render(supplierIdToo());
    await openConcat();
    const text =
      "The second input has columns the first doesn't, which can be dropped:";
    expect(getConcatRestrictFixText('second', 'first')).toBe(text);
    expect(within(panel()).getByText(text)).toBeDefined();
    expect(fixList('Columns to drop')).toEqual(['SUPPLIER_ID']);
    expect(button('Drop them').disabled).toBe(false);
    expect(button('Drop them').title).toBe(
      getConcatRestrictFixTitle('second', 'first'),
    );
    expect(getConcatRestrictFixTitle('second', 'first')).toBe(
      "Add a Restrict before the second input that keeps only the first input's columns, as one step to undo",
    );
    // the counts differ: nothing to rename
    expect(
      within(panel()).queryByRole('button', { name: 'Rename them' }),
    ).toBeNull();
    const before = editorState.document.query;
    fireEvent.click(button('Drop them'));
    const { query } = editorState.document;
    expect(query.getInputIds('concat101')).toEqual([
      'restrict101',
      'restrict103',
    ]);
    expect(query.getInputIds('restrict103')).toEqual(['restrict102']);
    expect((query.getNode('restrict103') as Restrict).columns).toEqual(
      COMPANY_CITY_COUNTRY,
    );
    expect(editorState.history).toHaveLength(1);
    expect(editorState.history.at(-1)?.query === before).toBe(true);
    expect(await TEST__findCanvasNode('restrict103')).toBeDefined();
    expect(editorState.nodeEditor.nodeId).toBe('concat101');
    expect(positions()).toEqual(MATCHED);
    expect(marks()).toEqual([]);
    expect(problems()).toEqual([]);
    expect(editorState.analysis.validity.get('concat101')).toEqual([]);
    expectNoFix();
    act(() => editorState.undo());
    expect(problems()).toEqual([
      SPEC_MESSAGE,
      'The first input has 3 columns and the second 4.',
    ]);
    expect(fixList('Columns to drop')).toEqual(['SUPPLIER_ID']);
    expect(button('Drop them').disabled).toBe(false);
  });

  test('Names the first input when it is the wider one, and adds the Restrict before it', async () => {
    const editorState = await render(
      concatOf(
        customers([
          'CUSTOMER_ID',
          'COMPANY_NAME',
          'CONTACT_NAME',
          'CITY',
          'COUNTRY',
        ]),
        suppliers(),
      ),
    );
    await openConcat();
    const text =
      "The first input has columns the second doesn't, which can be dropped:";
    expect(getConcatRestrictFixText('first', 'second')).toBe(text);
    expect(within(panel()).getByText(text)).toBeDefined();
    expect(fixList('Columns to drop')).toEqual(['CUSTOMER_ID', 'CONTACT_NAME']);
    expect(button('Drop them').title).toBe(
      getConcatRestrictFixTitle('first', 'second'),
    );
    expect(getConcatRestrictFixTitle('first', 'second')).toBe(
      "Add a Restrict before the first input that keeps only the second input's columns, as one step to undo",
    );
    fireEvent.click(button('Drop them'));
    const { query } = editorState.document;
    expect(query.getInputIds('concat101')).toEqual([
      'restrict103',
      'restrict102',
    ]);
    expect(query.getInputIds('restrict103')).toEqual(['restrict101']);
    expect(editorState.history).toHaveLength(1);
    expect(positions()).toEqual(MATCHED);
    expect(problems()).toEqual([]);
    expectNoFix();
  });

  test.each<{ name: string; query: () => Query; problems: number }>([
    {
      name: 'matching inputs',
      query: () => concatOf(customers(), suppliers()),
      problems: 0,
    },
    {
      name: 'types that differ, under the same names',
      query: () =>
        concatOf(
          customers(['CONTACT_NAME', 'CITY', 'COUNTRY']),
          ordersAs([
            ['SHIP_NAME', 'CONTACT_NAME'],
            ['SHIP_CITY', 'CITY'],
            ['SHIP_COUNTRY', 'COUNTRY'],
          ]),
        ),
      problems: 2,
    },
    {
      name: 'a name whose type differs too',
      query: () =>
        concatOf(customers(), suppliers(['SUPPLIER_ID', 'CITY', 'COUNTRY'])),
      problems: 2,
    },
    {
      name: 'a wider input whose kept columns have other types',
      query: () =>
        concatOf(
          customers(['CONTACT_NAME', 'CITY', 'COUNTRY']),
          ordersAs([
            ['ORDER_ID', 'ORDER_ID'],
            ['SHIP_NAME', 'CONTACT_NAME'],
            ['SHIP_CITY', 'CITY'],
            ['SHIP_COUNTRY', 'COUNTRY'],
          ]),
        ),
      problems: 2,
    },
    {
      name: 'the same columns in another order',
      query: () =>
        concatOf(
          customers(),
          ordersAs([
            ['SHIP_NAME', 'COMPANY_NAME'],
            ['SHIP_CITY', 'COUNTRY'],
            ['SHIP_COUNTRY', 'CITY'],
          ]),
        ),
      problems: 2,
    },
  ])('Offers no fix for $name', async ({ query, problems: count }) => {
    await render(query());
    await openConcat();
    // the comparison shows, so the fix would show with it
    expect(comparison()).toBeDefined();
    expect(problems()).toHaveLength(count);
    expectNoFix();
  });

  test.each([
    { fix: 'Rename them', list: 'Columns to rename', query: regionForCity },
    { fix: 'Drop them', list: 'Columns to drop', query: supplierIdToo },
  ])(
    'Shows the fix in a read-only cube, "$fix" disabled',
    async ({ fix, list, query }) => {
      const editorState = await render(new Query());
      await TEST__importDocument(
        editorState,
        new CubeDocument({ context: CONTEXT, query: query() }),
        true,
      );
      await openConcat();
      expect(fixList(list)).toHaveLength(1);
      expect(button(fix).disabled).toBe(true);
      expect(button(fix).title).toBe(READ_ONLY_CUBE_TITLE);
      const { document } = editorState;
      fireEvent.click(button(fix));
      act(() => {
        editorState.nodeEditor.renameConcatInput();
        editorState.nodeEditor.restrictConcatInput();
      });
      expect(editorState.document === document).toBe(true);
      expect(within(panel()).getByRole('list', { name: list })).toBeDefined();
    },
  );
});
