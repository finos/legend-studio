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
  Query,
  type QueryNode,
  Rename,
  type RenameMapping,
  Restrict,
  SchemaColumn,
} from '@finos/legend-cube';
import { runInAction } from 'mobx';
import { TEST__createCubeHost } from '../../__test-utils__/CubeTestApplication.js';
import {
  CUSTOMERS_COLUMNS,
  NORTHWIND_RUNTIME,
  northwindTable,
  ORDERS_COLUMNS,
} from '../../__test-utils__/CubeNorthwindTestQueries.js';
import { CUBE_NORTHWIND_MODEL } from '../fixtures/CubeNorthwindModel.js';
import { CubeEditorState } from '../CubeEditorState.js';

// The node editor's Concat autofixes (PLAN §11.5, Q6; requirement C-17): a
// Rename before the second input, or a Restrict before the wider one, each
// offered only when it makes the concat valid, as one undo step

const CONTEXT = { model: CUBE_NORTHWIND_MODEL, runtime: NORTHWIND_RUNTIME };
const COMPANY_CITY_COUNTRY = ['COMPANY_NAME', 'CITY', 'COUNTRY'];
const SPEC_MESSAGE = 'Both input schemas must be identical.';

/**
 * One input of the concat: a table, then a Restrict to the columns when they
 * are given, then a Rename when there are mappings, each feeding the next
 */
const arm = (
  side: 1 | 2,
  table: string,
  tableColumns: SchemaColumn[],
  columns?: readonly string[],
  mappings: readonly RenameMapping[] = [],
): QueryNode[] => [
  northwindTable(`relational10${side}`, table, tableColumns),
  ...(columns ? [new Restrict(`restrict10${side}`, columns)] : []),
  ...(mappings.length ? [new Rename(`rename10${side}`, mappings)] : []),
];

/** CUSTOMERS restricted to the columns, as the input on that side */
const customers = (
  columns: readonly string[] = COMPANY_CITY_COUNTRY,
  side: 1 | 2 = 1,
  mappings: readonly RenameMapping[] = [],
): QueryNode[] => arm(side, 'CUSTOMERS', CUSTOMERS_COLUMNS, columns, mappings);

/** ORDERS restricted to some columns, each renamed (`[column, new name]`), as the second input */
const ordersAs = (renames: [string, string][]): QueryNode[] =>
  arm(
    2,
    'ORDERS',
    ORDERS_COLUMNS,
    renames.map(([from]) => from),
    renames
      .filter(([from, to]) => from !== to)
      .map(([from, to]) => ({ from, to })),
  );

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

/** The second input has REGION where the first has CITY */
const regionForCity = (): Query =>
  concatOf(customers(), customers(['COMPANY_NAME', 'REGION', 'COUNTRY'], 2));

/** The second input has CUSTOMER_ID before the first input's columns */
const secondWider = (): Query =>
  concatOf(customers(), customers(['CUSTOMER_ID', ...COMPANY_CITY_COUNTRY], 2));

/** The first input has CUSTOMER_ID and CONTACT_NAME among the second input's columns */
const firstWider = (): Query =>
  concatOf(
    customers([
      'CUSTOMER_ID',
      'COMPANY_NAME',
      'CONTACT_NAME',
      'CITY',
      'COUNTRY',
    ]),
    customers(COMPANY_CITY_COUNTRY, 2),
  );

const createState = (query: Query): CubeEditorState =>
  new CubeEditorState(
    TEST__createCubeHost().host,
    new CubeDocument({ context: CONTEXT, query }),
  );

/** A cube on the query, its node editor open on the concat */
const openConcat = (query: Query): CubeEditorState => {
  const state = createState(query);
  state.nodeEditor.open('concat101');
  return state;
};

/** Calls both fixes, expecting neither to change the cube */
const expectNoFix = (state: CubeEditorState): void => {
  const { nodeEditor } = state;
  expect(nodeEditor.canRenameConcatInput).toBe(false);
  expect(nodeEditor.canRestrictConcatInput).toBe(false);
  const { document, history } = state;
  nodeEditor.renameConcatInput();
  nodeEditor.restrictConcatInput();
  expect(state.document === document).toBe(true);
  expect(state.history === history).toBe(true);
};

/** The panel goes on, on the concat as the cube now has it, with nothing to apply and no notice */
const expectPanelOnConcat = (state: CubeEditorState): void => {
  const { nodeEditor } = state;
  const concat = state.document.query.getNode('concat101');
  expect(nodeEditor.nodeId).toBe('concat101');
  expect(nodeEditor.node === concat).toBe(true);
  expect(nodeEditor.draft?.original === concat).toBe(true);
  expect(nodeEditor.hasChanges).toBe(false);
  expect(nodeEditor.notice).toBeUndefined();
};

beforeEach(() => {
  localStorage.clear();
});

describe('The node editor, renaming the columns of a concat input', () => {
  test('Offers a Rename, and no Restrict, for a name that differs at a position', () => {
    const state = openConcat(regionForCity());
    expect(state.analysis.validity.get('concat101')).toEqual([
      SPEC_MESSAGE,
      'Column 2 is "CITY" in the first input and "REGION" in the second: columns are matched by position.',
    ]);
    expect(state.nodeEditor.canRenameConcatInput).toBe(true);
    expect(state.nodeEditor.canRestrictConcatInput).toBe(false);
    // offering it changes nothing
    expect(state.history).toHaveLength(0);
  });

  test('Puts a Rename before the second input, on its port, as one undo step, and the concat turns valid', () => {
    const state = openConcat(regionForCity());
    const before = state.document.query;
    state.nodeEditor.renameConcatInput();
    const { query } = state.document;
    expect(query.nodes).toHaveLength(before.nodes.length + 1);
    expect(query.getInputIds('concat101')).toEqual([
      'restrict101',
      'rename101',
    ]);
    expect(query.getInputIds('rename101')).toEqual(['restrict102']);
    const rename = query.getNode('rename101');
    expect(rename).toBeInstanceOf(Rename);
    expect((rename as Rename).mappings).toEqual([
      { from: 'REGION', to: 'CITY' },
    ]);
    // every node it didn't add is the one it was
    expect(before.nodes.every((node) => query.getNode(node.id) === node)).toBe(
      true,
    );
    expect(state.analysis.validity.get('concat101')).toEqual([]);
    expect(state.analysis.schemas.get('concat101')?.names()).toEqual(
      COMPANY_CITY_COUNTRY,
    );
    // one undo step, the cube before it
    expect(state.history).toHaveLength(1);
    expect(state.history.at(-1)?.query === before).toBe(true);
    expect(query.selected).toBe('concat101');
    expectPanelOnConcat(state);
    // nothing left to fix
    expect(state.nodeEditor.canRenameConcatInput).toBe(false);
    expect(state.nodeEditor.canRestrictConcatInput).toBe(false);
  });

  test('Undo takes the Rename out, the panel staying on the concat, which offers it again', () => {
    const state = openConcat(regionForCity());
    const before = state.document.query;
    state.nodeEditor.renameConcatInput();
    state.undo();
    const { query } = state.document;
    expect(state.history).toHaveLength(0);
    // a restored query is a new object (PLAN §4.3), of the very nodes it had
    expect(query.nodes).toHaveLength(before.nodes.length);
    expect(
      query.nodes.every((node, index) => node === before.nodes[index]),
    ).toBe(true);
    expect(query.connections).toEqual(before.connections);
    expect(query.selected).toBe(before.selected);
    expect(query.getNode('rename101')).toBeUndefined();
    expect(state.analysis.validity.get('concat101')).toHaveLength(2);
    expectPanelOnConcat(state);
    expect(state.nodeEditor.canRenameConcatInput).toBe(true);
  });

  test('Renames a column whose name differs only in case', () => {
    const state = openConcat(
      concatOf(
        customers(),
        customers(COMPANY_CITY_COUNTRY, 2, [{ from: 'CITY', to: 'city' }]),
      ),
    );
    expect(state.nodeEditor.canRenameConcatInput).toBe(true);
    expect(state.nodeEditor.canRestrictConcatInput).toBe(false);
    state.nodeEditor.renameConcatInput();
    const { query } = state.document;
    // after the Rename the second input already had
    expect(query.getInputIds('concat101')).toEqual([
      'restrict101',
      'rename103',
    ]);
    expect(query.getInputIds('rename103')).toEqual(['rename102']);
    expect((query.getNode('rename103') as Rename).mappings).toEqual([
      { from: 'city', to: 'CITY' },
    ]);
    expect(state.analysis.validity.get('concat101')).toEqual([]);
    expect(state.history).toHaveLength(1);
    expectPanelOnConcat(state);
  });

  test('Keeps the node Execute runs selected, the input it goes after included', () => {
    const state = createState(regionForCity());
    state.select('restrict102');
    expect(state.history).toHaveLength(1);
    state.nodeEditor.open('concat101');
    state.nodeEditor.renameConcatInput();
    expect(state.document.query.selected).toBe('restrict102');
    expect(state.document.query.getInputIds('concat101')).toEqual([
      'restrict101',
      'rename101',
    ]);
    expect(state.history).toHaveLength(2);
    expectPanelOnConcat(state);
  });
});

describe('The node editor, dropping the columns of the wider concat input', () => {
  test.each([
    {
      wider: 'second',
      query: secondWider,
      inputs: ['restrict101', 'restrict103'],
      after: 'restrict102',
    },
    {
      wider: 'first',
      query: firstWider,
      inputs: ['restrict103', 'restrict102'],
      after: 'restrict101',
    },
  ])(
    "Puts a Restrict before the $wider input, keeping the other input's columns, as one undo step",
    ({ query: create, inputs, after }) => {
      const state = openConcat(create());
      expect(state.analysis.validity.get('concat101')?.[0]).toBe(SPEC_MESSAGE);
      expect(state.nodeEditor.canRestrictConcatInput).toBe(true);
      expect(state.nodeEditor.canRenameConcatInput).toBe(false);
      const before = state.document.query;
      state.nodeEditor.restrictConcatInput();
      const { query } = state.document;
      expect(query.nodes).toHaveLength(before.nodes.length + 1);
      expect(query.getInputIds('concat101')).toEqual(inputs);
      expect(query.getInputIds('restrict103')).toEqual([after]);
      const restrict = query.getNode('restrict103');
      expect(restrict).toBeInstanceOf(Restrict);
      expect((restrict as Restrict).columns).toEqual(COMPANY_CITY_COUNTRY);
      expect(state.analysis.validity.get('concat101')).toEqual([]);
      expect(state.analysis.schemas.get('concat101')?.names()).toEqual(
        COMPANY_CITY_COUNTRY,
      );
      expect(state.history).toHaveLength(1);
      expect(state.history.at(-1)?.query === before).toBe(true);
      expect(query.selected).toBe('concat101');
      expectPanelOnConcat(state);
      expect(state.nodeEditor.canRestrictConcatInput).toBe(false);
      // undo takes it out, and offers it again
      state.undo();
      expect(
        state.document.query.nodes.every(
          (node, index) => node === before.nodes[index],
        ),
      ).toBe(true);
      expect(state.document.query.nodes).toHaveLength(before.nodes.length);
      expect(state.document.query.getInputIds('concat101')).toEqual(
        before.getInputIds('concat101'),
      );
      expectPanelOnConcat(state);
      expect(state.nodeEditor.canRestrictConcatInput).toBe(true);
    },
  );

  test('Keeps the node Execute runs selected, the wider input included', () => {
    const state = createState(firstWider());
    state.select('restrict101');
    state.nodeEditor.open('concat101');
    state.nodeEditor.restrictConcatInput();
    expect(state.document.query.selected).toBe('restrict101');
    expect(state.document.query.getInputIds('concat101')).toEqual([
      'restrict103',
      'restrict102',
    ]);
    expect(state.history).toHaveLength(2);
  });
});

describe('The node editor, offering no fix for a concat', () => {
  test("When the first input's name can't be a new name, though the other way round could be", () => {
    const company = CUSTOMERS_COLUMNS[1] as SchemaColumn;
    const city = CUSTOMERS_COLUMNS.find(
      (column) => column.name === 'CITY',
    ) as SchemaColumn;
    // a name with a quote, which Rename refuses as a new name, only on the first input
    const quoted = new SchemaColumn('CITY "X"', city.type, city.nullable);
    const state = openConcat(
      new Query(
        [
          northwindTable('relational101', 'CUSTOMERS', [company, quoted]),
          northwindTable('relational102', 'SUPPLIERS', [company, city]),
          new Concat('concat101'),
        ],
        [
          new Connection('relational101', 'concat101', 'tds1'),
          new Connection('relational102', 'concat101', 'tds2'),
        ],
        'concat101',
      ),
    );
    expect(state.analysis.validity.get('relational101')).toEqual([]);
    expect(state.analysis.validity.get('concat101')).toHaveLength(2);
    expect(state.nodeEditor.canRenameConcatInput).toBe(false);
    const { document } = state;
    state.nodeEditor.renameConcatInput();
    expect(state.document === document).toBe(true);
  });

  /** Cube's message for a name that differs at a position */
  const nameAt = (position: number, first: string, second: string): string =>
    `Column ${position} is "${first}" in the first input and "${second}" in the second: columns are matched by position.`;

  test.each<{ name: string; query: () => Query; problems: string[] }>([
    {
      name: 'matching inputs',
      query: () => concatOf(customers(), customers(undefined, 2)),
      problems: [],
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
      problems: [
        SPEC_MESSAGE,
        'Column "CONTACT_NAME" is Varchar(30) in the first input and Varchar(40) in the second.',
      ],
    },
    {
      name: 'a name whose type differs too, so a Rename leaves it invalid',
      query: () =>
        concatOf(
          customers(['CONTACT_NAME', 'CITY', 'COUNTRY']),
          ordersAs([
            ['SHIP_NAME', 'SHIP_NAME'],
            ['SHIP_CITY', 'CITY'],
            ['SHIP_COUNTRY', 'COUNTRY'],
          ]),
        ),
      problems: [SPEC_MESSAGE, nameAt(1, 'CONTACT_NAME', 'SHIP_NAME')],
    },
    {
      name: 'a wider input whose kept columns have other types, so a Restrict leaves it invalid',
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
      problems: [
        SPEC_MESSAGE,
        'The first input has 3 columns and the second 4.',
      ],
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
      problems: [
        SPEC_MESSAGE,
        'The inputs have the same columns in a different order: columns are matched by position.',
      ],
    },
    {
      name: "a column at another position than the first input's",
      query: () =>
        concatOf(
          customers(),
          ordersAs([
            ['SHIP_NAME', 'COMPANY_NAME'],
            ['SHIP_CITY', 'REGION'],
            ['SHIP_REGION', 'CITY'],
          ]),
        ),
      problems: [
        SPEC_MESSAGE,
        nameAt(2, 'CITY', 'REGION'),
        nameAt(3, 'COUNTRY', 'CITY'),
      ],
    },
    {
      // a Rename would be valid, and the concat after it: only the order check refuses it
      name: 'a column at another position, in another case',
      query: () =>
        concatOf(
          customers(),
          ordersAs([
            ['SHIP_NAME', 'COMPANY_NAME'],
            ['SHIP_CITY', 'REGION'],
            ['SHIP_REGION', 'city'],
          ]),
        ),
      problems: [
        SPEC_MESSAGE,
        nameAt(2, 'CITY', 'REGION'),
        nameAt(3, 'COUNTRY', 'city'),
      ],
    },
    {
      name: 'a narrower input whose columns are in another order in the wider one',
      query: () =>
        concatOf(
          customers(),
          ordersAs([
            ['SHIP_CITY', 'COUNTRY'],
            ['SHIP_COUNTRY', 'CITY'],
          ]),
        ),
      problems: [
        SPEC_MESSAGE,
        'The first input has 3 columns and the second 2.',
      ],
    },
    {
      name: 'a narrower input with a column the wider one lacks',
      query: () =>
        concatOf(customers(), customers(['COMPANY_NAME', 'REGION'], 2)),
      problems: [
        SPEC_MESSAGE,
        'The first input has 3 columns and the second 2.',
      ],
    },
    {
      name: 'an input missing',
      query: () =>
        new Query(
          [...customers(), new Concat('concat101')],
          [
            new Connection('relational101', 'restrict101', 'tds'),
            new Connection('restrict101', 'concat101', 'tds1'),
          ],
          'concat101',
        ),
      problems: [
        'This node requires more inputs. Please drag and drop another input to associate.',
      ],
    },
  ])(
    'For $name, where calling a fix changes nothing',
    ({ query, problems }) => {
      const state = openConcat(query());
      expect(state.analysis.validity.get('concat101')).toEqual(problems);
      expect(state.nodeEditor.nodeId).toBe('concat101');
      expectNoFix(state);
    },
  );

  test('In a read-only cube, where calling a fix changes nothing', async () => {
    for (const create of [regionForCity, secondWider, firstWider]) {
      const state = new CubeEditorState(TEST__createCubeHost().host);
      state.importDocument(
        new CubeDocument({ context: CONTEXT, query: create() }),
        true,
      );
      // let the import's re-check of the tables answer first
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(state.isResolvingSources).toBe(false);
      expect(state.readOnly).toBe(true);
      state.nodeEditor.open('concat101');
      expect(state.nodeEditor.nodeId).toBe('concat101');
      expectNoFix(state);
    }
  });

  test('On another node, or with the panel closed', () => {
    const state = createState(regionForCity());
    expectNoFix(state);
    state.nodeEditor.open('restrict102');
    expectNoFix(state);
    state.nodeEditor.open('concat101');
    expect(state.nodeEditor.canRenameConcatInput).toBe(true);
    state.nodeEditor.cancel();
    expectNoFix(state);
  });

  test('While the concat changed under the panel, until the panel follows it', () => {
    const state = openConcat(regionForCity());
    const concat = state.document.query.getNode('concat101') as Concat;
    runInAction(() => {
      state.applyQuery(
        state.document.query.replace(concat.withWidenTypes(true)),
      );
      // the panel hasn't followed the new concat yet
      expect(state.nodeEditor.node === concat).toBe(false);
      expectNoFix(state);
    });
    // now it has
    expectPanelOnConcat(state);
    expect(state.nodeEditor.canRenameConcatInput).toBe(true);
    state.nodeEditor.renameConcatInput();
    expect(state.document.query.getInputIds('concat101')).toEqual([
      'restrict101',
      'rename101',
    ]);
    // the concat it fixed is the one the panel followed
    expect(
      (state.document.query.getNode('concat101') as Concat).widenTypes,
    ).toBe(true);
    expect(state.history).toHaveLength(2);
  });
});
