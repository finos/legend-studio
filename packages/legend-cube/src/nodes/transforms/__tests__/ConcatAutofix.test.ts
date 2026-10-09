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

import { describe, expect, test } from '@jest/globals';
import {
  column,
  resolvedTable,
  TestBinaryNode,
  TestUnaryNode,
} from '../../../__test-utils__/CubeTestNodes.js';
import { unitTest } from '../../../__test-utils__/CubeTestUtils.js';
import { Connection } from '../../../graph/Connection.js';
import { Query } from '../../../graph/Query.js';
import type { QueryNode } from '../../../graph/QueryNode.js';
import { buildSchemasAndValidity } from '../../../inference/SchemaInference.js';
import { Schema, type SchemaColumn } from '../../../schema/Schema.js';
import { createNodeRegistry } from '../../NodeRegistry.js';
import { Concat, validateConcatSchemas } from '../Concat.js';
import {
  canRenameConcatInput,
  canRestrictConcatInput,
  planConcatRename,
  planConcatRestrict,
  renameConcatInput,
  restrictConcatInput,
} from '../ConcatAutofix.js';
import { Rename, type RenameMapping } from '../Rename.js';
import { Restrict } from '../Restrict.js';

const P = 'meta::pure::precisePrimitives::';
const int = (name: string, nullable = false): SchemaColumn =>
  column(name, `${P}Int`, nullable);
const bigInt = (name: string): SchemaColumn => column(name, `${P}BigInt`);
const string = (name: string): SchemaColumn => column(name, 'String');
const varchar = (name: string, length: number): SchemaColumn =>
  column(name, `${P}Varchar`, false, [length]);

/** A schema of Int columns, not nullable, with these names */
const ints = (...names: string[]): Schema =>
  new Schema(names.map((name) => int(name)));

/** Each mapping as `from->to`, in the plan's order */
const pairsOf = (
  mappings: readonly RenameMapping[] | undefined,
): string[] | undefined => mappings?.map(({ from, to }) => `${from}->${to}`);

/**
 * The rename plan, with the Concat's setting, checked to make the Concat
 * valid when a Rename applies it to the second input
 */
const renamePlan = (
  first: Schema,
  second: Schema,
  widenTypes = false,
): string[] | undefined => {
  const mappings = planConcatRename(first, second, widenTypes);
  if (mappings) {
    const renamed = new Rename('rename', mappings).schematize([second]);
    expect(renamed).toBeDefined();
    expect(
      validateConcatSchemas(first, renamed as Schema, undefined, widenTypes),
    ).toBe(true);
  }
  return pairsOf(mappings);
};

/**
 * The restrict plan, with the Concat's setting, checked to make the Concat
 * valid when a Restrict applies it to the input it names
 */
const restrictPlan = (
  first: Schema,
  second: Schema,
  widenTypes = false,
): ReturnType<typeof planConcatRestrict> => {
  const fix = planConcatRestrict(first, second, widenTypes);
  if (fix) {
    const restrict = new Restrict('restrict', fix.columns);
    const kept = restrict.schematize([fix.input === 0 ? first : second]);
    expect(kept).toBeDefined();
    expect(
      validateConcatSchemas(
        fix.input === 0 ? (kept as Schema) : first,
        fix.input === 0 ? second : (kept as Schema),
        undefined,
        widenTypes,
      ),
    ).toBe(true);
  }
  return fix;
};

describe(unitTest('Concat autofix: the Rename plan'), () => {
  test("Gives one differing name of the second input the first input's name", () => {
    expect(planConcatRename(ints('A', 'B', 'C'), ints('A', 'X', 'C'))).toEqual([
      { from: 'X', to: 'B' },
    ]);
    expect(renamePlan(ints('A', 'B', 'C'), ints('A', 'X', 'C'))).toEqual([
      'X->B',
    ]);
  });

  test('Renames several differing names, every column when none matches', () => {
    expect(renamePlan(ints('A', 'B', 'C'), ints('X', 'Y', 'Z'))).toEqual([
      'X->A',
      'Y->B',
      'Z->C',
    ]);
  });

  test('Renames a name that differs only in case', () => {
    expect(
      renamePlan(ints('ORDER_ID', 'NAME'), ints('order_id', 'NAME')),
    ).toEqual(['order_id->ORDER_ID']);
    expect(renamePlan(ints('ID', 'Name'), ints('ID', 'NAME'))).toEqual([
      'NAME->Name',
    ]);
    // a case-only name next to a differing one
    expect(renamePlan(ints('ID', 'CITY'), ints('id', 'TOWN'))).toEqual([
      'id->ID',
      'TOWN->CITY',
    ]);
  });

  test('Maps only the positions whose names differ, in position order', () => {
    expect(
      renamePlan(ints('A', 'B', 'C', 'D'), ints('A', 'x', 'C', 'y')),
    ).toEqual(['x->B', 'y->D']);
    // position order, not the order of the names
    expect(renamePlan(ints('Z', 'B', 'A'), ints('Q', 'B', 'P'))).toEqual([
      'Q->Z',
      'P->A',
    ]);
  });

  test('Ignores nullability', () => {
    expect(
      renamePlan(
        new Schema([int('A'), int('B', true)]),
        new Schema([int('A', true), int('X')]),
      ),
    ).toEqual(['X->B']);
  });

  test.each<[string, Schema, Schema]>([
    ['a second input with more columns', ints('A', 'B'), ints('A', 'X', 'C')],
    ['a second input with fewer columns', ints('A', 'B', 'C'), ints('X', 'Y')],
    ['inputs whose names all match', ints('A', 'B'), ints('A', 'B')],
    ['two empty inputs', new Schema([]), new Schema([])],
    ['the same columns swapped', ints('A', 'B'), ints('B', 'A')],
    [
      'a column at another position of the first input (a partial reorder)',
      ints('A', 'B'),
      ints('B', 'X'),
    ],
    [
      'a column at another position of the first input, in another case',
      ints('A', 'B'),
      ints('b', 'X'),
    ],
    [
      'a type that differs at a renamed position',
      new Schema([int('A'), int('B')]),
      new Schema([int('A'), bigInt('X')]),
    ],
    [
      'a type that differs at another position',
      new Schema([int('A'), int('B')]),
      new Schema([bigInt('A'), int('X')]),
    ],
    [
      'a Varchar length that differs at a renamed position',
      new Schema([int('A'), varchar('B', 5)]),
      new Schema([int('A'), varchar('X', 15)]),
    ],
    [
      'a new name that is not a valid column name',
      ints('A', 'say "hi"'),
      ints('A', 'X'),
    ],
    [
      'a new name longer than 128 code points',
      ints('x'.repeat(129)),
      ints('X'),
    ],
    [
      'a new name that folds to a column the second input keeps',
      ints('A', 'a'),
      ints('X', 'a'),
    ],
    ['two new names that fold to one', ints('A', 'a'), ints('X', 'Y')],
  ])('Plans nothing for %s', (_, first, second) => {
    expect(planConcatRename(first, second)).toBeUndefined();
  });

  test('Refuses a column at another position for the reorder alone, though a Rename would make the Concat valid', () => {
    // b -> A and X -> B: Rename accepts it (b is renamed, so A doesn't collide
    // with it), and the Concat is then valid, but b's values would move to A
    const first = ints('A', 'B');
    const second = ints('b', 'X');
    const rename = new Rename('rename', [
      { from: 'b', to: 'A' },
      { from: 'X', to: 'B' },
    ]);
    expect(rename.validate([second])).toBe(true);
    expect(
      validateConcatSchemas(first, rename.schematize([second]) as Schema),
    ).toBe(true);
    expect(planConcatRename(first, second)).toBeUndefined();
  });

  test('Refuses a new name that folds to a kept column for the Rename alone', () => {
    // X -> A folds to a, which the second input keeps: no column moves, but
    // SQL Server, MemSQL and DuckDB would see A twice
    const errors: string[] = [];
    expect(
      new Rename('rename', [{ from: 'X', to: 'A' }]).validate(
        [ints('X', 'a')],
        errors,
      ),
    ).toBe(false);
    expect(errors).not.toEqual([]);
    expect(planConcatRename(ints('A', 'a'), ints('X', 'a'))).toBeUndefined();
  });
});

describe(unitTest('Concat autofix: the Restrict plan'), () => {
  test("Restricts a wider second input to the first input's columns, naming the ones it drops", () => {
    expect(restrictPlan(ints('A', 'C'), ints('A', 'B', 'C', 'D'))).toEqual({
      input: 1,
      columns: ['A', 'C'],
      dropped: ['B', 'D'],
    });
    expect(restrictPlan(ints('A', 'B'), ints('A', 'B', 'C'))).toEqual({
      input: 1,
      columns: ['A', 'B'],
      dropped: ['C'],
    });
  });

  test("Restricts a wider first input to the second input's columns", () => {
    expect(restrictPlan(ints('A', 'B', 'C', 'D', 'E'), ints('B', 'D'))).toEqual(
      { input: 0, columns: ['B', 'D'], dropped: ['A', 'C', 'E'] },
    );
    expect(restrictPlan(ints('X', 'A'), ints('A'))).toEqual({
      input: 0,
      columns: ['A'],
      dropped: ['X'],
    });
  });

  test("Keeps and drops columns in the wider input's order", () => {
    expect(
      restrictPlan(
        ints('B', 'D', 'F'),
        ints('A', 'B', 'C', 'D', 'E', 'F', 'G'),
      ),
    ).toEqual({
      input: 1,
      columns: ['B', 'D', 'F'],
      dropped: ['A', 'C', 'E', 'G'],
    });
  });

  test('Ignores nullability, and the types of the columns it drops', () => {
    expect(
      restrictPlan(
        new Schema([int('A', true)]),
        new Schema([int('A'), int('B', true)]),
      ),
    ).toEqual({ input: 1, columns: ['A'], dropped: ['B'] });
    expect(
      restrictPlan(
        new Schema([int('A'), varchar('B', 5)]),
        new Schema([int('A')]),
      ),
    ).toEqual({ input: 0, columns: ['A'], dropped: ['B'] });
  });

  test.each<[string, Schema, Schema]>([
    ['inputs with as many columns', ints('A', 'B'), ints('A', 'C')],
    ['inputs that match', ints('A', 'B'), ints('A', 'B')],
    ['an empty first input', new Schema([]), ints('A')],
    ['an empty second input', ints('A', 'B'), new Schema([])],
    ['columns in another order', ints('B', 'A'), ints('A', 'B', 'C')],
    [
      'columns in another order, the first wider',
      ints('A', 'B', 'C'),
      ints('C', 'A'),
    ],
    ['a column the wider input lacks', ints('A', 'Z'), ints('A', 'B', 'C')],
    ['a column in another case', ints('a', 'B'), ints('A', 'B', 'C')],
    [
      'a type that differs on a kept column',
      new Schema([bigInt('A')]),
      new Schema([int('A'), int('B')]),
    ],
    [
      'a Varchar length that differs on a kept column',
      new Schema([int('A'), varchar('B', 5), int('C')]),
      new Schema([int('A'), varchar('B', 15)]),
    ],
  ])('Plans nothing for %s', (_, first, second) => {
    expect(planConcatRestrict(first, second)).toBeUndefined();
  });
});

// PLAN §11.5, Q5 and Q6: a plan is offered when the Concat is valid after
// it, so with Convert types on, types that convert don't stop it
describe(unitTest('Concat autofix: the plans, converting types'), () => {
  test.each<[string, Schema, Schema, string[]]>([
    [
      'a type that differs at a renamed position',
      new Schema([int('A'), int('B')]),
      new Schema([int('A'), bigInt('X')]),
      ['X->B'],
    ],
    [
      'a type that differs at another position',
      new Schema([int('A'), int('B')]),
      new Schema([bigInt('A'), int('X')]),
      ['X->B'],
    ],
    [
      'a Varchar length that differs at a renamed position',
      new Schema([int('A'), varchar('B', 5)]),
      new Schema([int('A'), varchar('X', 15)]),
      ['X->B'],
    ],
    [
      'a Varchar and String at a renamed position',
      new Schema([int('A'), varchar('B', 5)]),
      new Schema([int('A'), string('X')]),
      ['X->B'],
    ],
  ])(
    'Plans a Rename for %s only when the Concat converts types',
    (_, first, second, pairs) => {
      expect(planConcatRename(first, second)).toBeUndefined();
      expect(planConcatRename(first, second, false)).toBeUndefined();
      expect(renamePlan(first, second, true)).toEqual(pairs);
    },
  );

  test('Plans the same Rename for equal types whatever the setting', () => {
    expect(renamePlan(ints('A', 'B', 'C'), ints('A', 'X', 'C'), true)).toEqual([
      'X->B',
    ]);
    expect(renamePlan(ints('ID', 'CITY'), ints('id', 'TOWN'), true)).toEqual([
      'id->ID',
      'TOWN->CITY',
    ]);
  });

  test.each<[string, Schema, Schema]>([
    [
      "a type that can't be converted at a renamed position",
      new Schema([int('A'), int('B')]),
      new Schema([int('A'), string('X')]),
    ],
    [
      "a type that can't be converted at another position",
      new Schema([int('A'), int('B')]),
      new Schema([string('A'), int('X')]),
    ],
    ['the same columns swapped', ints('A', 'B'), ints('B', 'A')],
    [
      'a new name that folds to a column the second input keeps',
      ints('A', 'a'),
      ints('X', 'a'),
    ],
    ['a second input with more columns', ints('A', 'B'), ints('A', 'X', 'C')],
  ])('Plans no Rename for %s, converting types', (_, first, second) => {
    expect(planConcatRename(first, second, true)).toBeUndefined();
  });

  test.each<[string, Schema, Schema, ReturnType<typeof planConcatRestrict>]>([
    [
      'a type that differs on a kept column',
      new Schema([bigInt('A')]),
      new Schema([int('A'), int('B')]),
      { input: 1, columns: ['A'], dropped: ['B'] },
    ],
    [
      'a Varchar length that differs on a kept column',
      new Schema([int('A'), varchar('B', 5), int('C')]),
      new Schema([int('A'), varchar('B', 15)]),
      { input: 0, columns: ['A', 'B'], dropped: ['C'] },
    ],
    [
      'String and a Varchar on a kept column',
      new Schema([string('A')]),
      new Schema([varchar('A', 15), int('B')]),
      { input: 1, columns: ['A'], dropped: ['B'] },
    ],
  ])(
    'Plans a Restrict for %s only when the Concat converts types',
    (_, first, second, fix) => {
      expect(planConcatRestrict(first, second)).toBeUndefined();
      expect(planConcatRestrict(first, second, false)).toBeUndefined();
      expect(restrictPlan(first, second, true)).toEqual(fix);
    },
  );

  test('Plans the same Restrict for equal types whatever the setting', () => {
    expect(
      restrictPlan(ints('A', 'C'), ints('A', 'B', 'C', 'D'), true),
    ).toEqual({ input: 1, columns: ['A', 'C'], dropped: ['B', 'D'] });
  });

  test("Plans no Restrict when a kept column's type can't be converted, whatever the dropped columns' types", () => {
    expect(
      planConcatRestrict(
        new Schema([string('A')]),
        new Schema([int('A'), int('B')]),
        true,
      ),
    ).toBeUndefined();
    // a dropped column's type is never compared
    expect(
      restrictPlan(
        new Schema([int('A'), string('B')]),
        new Schema([bigInt('A')]),
        true,
      ),
    ).toEqual({ input: 0, columns: ['A'], dropped: ['B'] });
    // nor are the names of columns in another order
    expect(
      planConcatRestrict(ints('B', 'A'), ints('A', 'B', 'C'), true),
    ).toBeUndefined();
  });
});

/** relational101 on First (tds1) and relational102 on Second (tds2) of the node, which feeds filter101 */
const wired = (
  first: Schema,
  second: Schema,
  selected = 'concat101',
  node: QueryNode = new Concat('concat101'),
  extra: QueryNode[] = [],
): Query =>
  new Query(
    [
      resolvedTable('relational101', 'FIRST', [...first.columns]),
      resolvedTable('relational102', 'SECOND', [...second.columns]),
      node,
      new TestUnaryNode('filter101'),
      ...extra,
    ],
    [
      new Connection('relational101', node.id, 'tds1'),
      new Connection('relational102', node.id, 'tds2'),
      new Connection(node.id, 'filter101', 'tds'),
    ],
    selected,
  );

const infer = (query: Query): ReturnType<typeof buildSchemasAndValidity> =>
  buildSchemasAndValidity(query, createNodeRegistry().queryRules);

/** The schemas of the node's inputs */
const inputSchemas = (
  query: Query,
  nodeId = 'concat101',
): [Schema | undefined, Schema | undefined] => {
  const { schemas } = infer(query);
  const [first, second] = query.getInputIds(nodeId);
  return [schemas.get(first ?? ''), schemas.get(second ?? '')];
};

const rename = (query: Query): Query =>
  renameConcatInput(query, 'concat101', ...inputSchemas(query));

const restrict = (query: Query): Query =>
  restrictConcatInput(query, 'concat101', ...inputSchemas(query));

/** Each connection into the node as `source>port` */
const feeds = (query: Query, nodeId: string): string[] =>
  query.connections
    .filter((connection) => connection.target === nodeId)
    .map((connection) => `${connection.source}>${connection.port}`)
    .sort();

describe(unitTest('Concat autofix: the query'), () => {
  test('Splices a Rename between the second input and the concat, on Second, and the concat is then valid', () => {
    const query = wired(ints('A', 'B'), ints('A', 'X'));
    expect(infer(query).validity.get('concat101')).not.toEqual([]);
    expect(
      canRenameConcatInput(query, 'concat101', ...inputSchemas(query)),
    ).toBe(true);
    const fixed = rename(query);
    expect(fixed.getInputIds('concat101')).toEqual([
      'relational101',
      'rename101',
    ]);
    expect(feeds(fixed, 'concat101')).toEqual([
      'relational101>tds1',
      'rename101>tds2',
    ]);
    expect(fixed.getInputIds('rename101')).toEqual(['relational102']);
    expect(fixed.getInputIds('filter101')).toEqual(['concat101']);
    expect(fixed.getNode('rename101') instanceof Rename).toBe(true);
    expect(pairsOf((fixed.getNode('rename101') as Rename).mappings)).toEqual([
      'X->B',
    ]);
    // the first input untouched
    expect(
      fixed.getNode('relational101') === query.getNode('relational101'),
    ).toBe(true);
    expect(fixed.getOutputConnection('relational101')?.target).toBe(
      'concat101',
    );
    const { validity, schemas } = infer(fixed);
    expect(validity.get('rename101')).toEqual([]);
    expect(validity.get('concat101')).toEqual([]);
    expect(validity.get('filter101')).toEqual([]);
    expect(schemas.get('concat101')?.names()).toEqual(['A', 'B']);
    expect(fixed.validate(validity)).toBe(true);
  });

  test('Fixes a case-only difference with a Rename that inference accepts', () => {
    const query = wired(ints('ORDER_ID', 'NAME'), ints('order_id', 'NAME'));
    const fixed = rename(query);
    expect(pairsOf((fixed.getNode('rename101') as Rename).mappings)).toEqual([
      'order_id->ORDER_ID',
    ]);
    const { validity, schemas } = infer(fixed);
    expect(validity.get('concat101')).toEqual([]);
    expect(schemas.get('concat101')?.names()).toEqual(['ORDER_ID', 'NAME']);
  });

  test('Leaves the query it fixes as it was', () => {
    const query = wired(ints('A', 'B'), ints('A', 'X'));
    const nodes = query.nodes;
    const connections = query.connections;
    const fixed = rename(query);
    expect(fixed === query).toBe(false);
    expect(query.nodes === nodes).toBe(true);
    expect(query.connections === connections).toBe(true);
    expect(query.nodes.map((node) => node.id)).toEqual([
      'relational101',
      'relational102',
      'concat101',
      'filter101',
    ]);
    expect(query.getNode('rename101')).toBeUndefined();
    expect(query.getInputIds('concat101')).toEqual([
      'relational101',
      'relational102',
    ]);
    expect(query.selected).toBe('concat101');

    const wide = wired(ints('A', 'B', 'C'), ints('A', 'C'));
    const restricted = restrict(wide);
    expect(restricted === wide).toBe(false);
    expect(wide.getNode('restrict101')).toBeUndefined();
    expect(wide.getInputIds('concat101')).toEqual([
      'relational101',
      'relational102',
    ]);
  });

  test('Gives the Rename an id no node has', () => {
    const query = wired(
      ints('A', 'B'),
      ints('A', 'X'),
      'concat101',
      new Concat('concat101'),
      [new Rename('rename101')],
    );
    const fixed = rename(query);
    expect(fixed.getInputIds('concat101')).toEqual([
      'relational101',
      'rename102',
    ]);
    expect(fixed.getInputIds('rename102')).toEqual(['relational102']);
    expect((fixed.getNode('rename101') as Rename).mappings).toEqual([]);
  });

  test('Splices a Restrict between a wider second input and the concat, on Second', () => {
    const query = wired(ints('A', 'C'), ints('A', 'B', 'C', 'D'));
    expect(
      canRestrictConcatInput(query, 'concat101', ...inputSchemas(query)),
    ).toBe(true);
    const fixed = restrict(query);
    expect(feeds(fixed, 'concat101')).toEqual([
      'relational101>tds1',
      'restrict101>tds2',
    ]);
    expect(fixed.getInputIds('restrict101')).toEqual(['relational102']);
    expect((fixed.getNode('restrict101') as Restrict).columns).toEqual([
      'A',
      'C',
    ]);
    expect(
      fixed.getNode('relational101') === query.getNode('relational101'),
    ).toBe(true);
    const { validity, schemas } = infer(fixed);
    expect(validity.get('restrict101')).toEqual([]);
    expect(validity.get('concat101')).toEqual([]);
    expect(schemas.get('concat101')?.names()).toEqual(['A', 'C']);
  });

  test('Splices a Restrict between a wider first input and the concat, on First', () => {
    const query = wired(ints('A', 'B', 'C', 'D'), ints('B', 'D'));
    expect(
      canRestrictConcatInput(query, 'concat101', ...inputSchemas(query)),
    ).toBe(true);
    const fixed = restrict(query);
    expect(feeds(fixed, 'concat101')).toEqual([
      'relational102>tds2',
      'restrict101>tds1',
    ]);
    expect(fixed.getInputIds('concat101')).toEqual([
      'restrict101',
      'relational102',
    ]);
    expect(fixed.getInputIds('restrict101')).toEqual(['relational101']);
    expect((fixed.getNode('restrict101') as Restrict).columns).toEqual([
      'B',
      'D',
    ]);
    expect(
      fixed.getNode('relational102') === query.getNode('relational102'),
    ).toBe(true);
    const { validity, schemas } = infer(fixed);
    expect(validity.get('concat101')).toEqual([]);
    expect(schemas.get('concat101')?.names()).toEqual(['B', 'D']);
  });

  test('Gives the Restrict an id no node has', () => {
    const query = wired(
      ints('A', 'B', 'C'),
      ints('A', 'C'),
      'concat101',
      new Concat('concat101'),
      [new Restrict('restrict101')],
    );
    expect(restrict(query).getInputIds('concat101')).toEqual([
      'restrict102',
      'relational102',
    ]);
  });

  test.each<[string]>([
    ['concat101'],
    ['filter101'],
    ['relational101'],
    ['relational102'],
  ])('Keeps %s selected through the Rename', (selected) => {
    const fixed = rename(wired(ints('A', 'B'), ints('A', 'X'), selected));
    expect(fixed.selected).toBe(selected);
    expect(fixed.getInputIds('rename101')).toEqual(['relational102']);
  });

  test('Keeps the selection on the input it splices after, which adding a node there would move', () => {
    const query = wired(ints('A', 'B'), ints('A', 'X'), 'relational102');
    // Query.add selects a node added after the selected one
    expect(query.add(new Rename('rename101'), 'relational102').selected).toBe(
      'rename101',
    );
    expect(rename(query).selected).toBe('relational102');

    const first = wired(ints('A', 'B', 'C'), ints('A', 'C'), 'relational101');
    expect(
      first.add(new Restrict('restrict101'), 'relational101').selected,
    ).toBe('restrict101');
    expect(restrict(first).selected).toBe('relational101');

    const second = wired(ints('A', 'C'), ints('A', 'B', 'C'), 'relational102');
    expect(restrict(second).selected).toBe('relational102');
    expect(restrict(wired(ints('A', 'C'), ints('A', 'B', 'C'))).selected).toBe(
      'concat101',
    );
  });

  test('Never meets a query with nothing selected: a query with nodes has a selection', () => {
    // so `add` never selects the new node because nothing was
    expect(
      () =>
        new Query(
          wired(ints('A', 'B'), ints('A', 'X')).nodes,
          wired(ints('A', 'B'), ints('A', 'X')).connections,
          undefined,
        ),
    ).toThrow('A query with nodes must have a selected node');
  });
});

interface Fix {
  readonly verb: string;
  readonly can: typeof canRenameConcatInput;
  readonly fix: typeof renameConcatInput;
  /** Inputs the fix has a plan for */
  readonly fixable: readonly [Schema, Schema];
  /** Inputs it has no plan for */
  readonly unfixable: readonly [Schema, Schema];
}

const FIXES: Fix[] = [
  {
    verb: 'rename',
    can: canRenameConcatInput,
    fix: renameConcatInput,
    fixable: [ints('A', 'B'), ints('A', 'X')],
    unfixable: [ints('A', 'B'), ints('B', 'A')],
  },
  {
    verb: 'restrict',
    can: canRestrictConcatInput,
    fix: restrictConcatInput,
    fixable: [ints('A', 'B', 'C'), ints('A', 'C')],
    unfixable: [ints('A', 'B'), ints('A', 'X')],
  },
];

interface Refusal {
  readonly query: Query;
  readonly nodeId: string;
  readonly first: Schema | undefined;
  readonly second: Schema | undefined;
}

const REFUSALS: [string, (fix: Fix) => Refusal][] = [
  [
    'a binary node that is not a concat',
    ({ fixable: [first, second] }) => ({
      query: wired(first, second, 'binary101', new TestBinaryNode('binary101')),
      nodeId: 'binary101',
      first,
      second,
    }),
  ],
  [
    'a unary node',
    ({ fixable: [first, second] }) => ({
      query: wired(first, second),
      nodeId: 'filter101',
      first,
      second,
    }),
  ],
  [
    'a node not in the query',
    ({ fixable: [first, second] }) => ({
      query: wired(first, second),
      nodeId: 'concat102',
      first,
      second,
    }),
  ],
  [
    'a concat without its second input',
    ({ fixable: [first, second] }) => ({
      query: new Query(
        [
          resolvedTable('relational101', 'FIRST', [...first.columns]),
          new Concat('concat101'),
        ],
        [new Connection('relational101', 'concat101', 'tds1')],
        'concat101',
      ),
      nodeId: 'concat101',
      first,
      second,
    }),
  ],
  [
    'a concat without its first input',
    ({ fixable: [first, second] }) => ({
      query: new Query(
        [
          resolvedTable('relational102', 'SECOND', [...second.columns]),
          new Concat('concat101'),
        ],
        [new Connection('relational102', 'concat101', 'tds2')],
        'concat101',
      ),
      nodeId: 'concat101',
      first,
      second,
    }),
  ],
  [
    "a missing first input's schema",
    ({ fixable: [first, second] }) => ({
      query: wired(first, second),
      nodeId: 'concat101',
      first: undefined,
      second,
    }),
  ],
  [
    "a missing second input's schema",
    ({ fixable: [first, second] }) => ({
      query: wired(first, second),
      nodeId: 'concat101',
      first,
      second: undefined,
    }),
  ],
  [
    'inputs it has no plan for',
    ({ unfixable: [first, second] }) => ({
      query: wired(first, second),
      nodeId: 'concat101',
      first,
      second,
    }),
  ],
];

describe.each(FIXES.map((fix): [string, Fix] => [fix.verb, fix]))(
  unitTest('Concat autofix: refusing to %s'),
  (verb, fix) => {
    test('Has a plan for the inputs the refusals reuse, and none for the others', () => {
      const plan = verb === 'rename' ? planConcatRename : planConcatRestrict;
      expect(plan(...fix.fixable)).toBeDefined();
      expect(plan(...fix.unfixable)).toBeUndefined();
      const query = wired(...fix.fixable);
      expect(fix.can(query, 'concat101', ...inputSchemas(query))).toBe(true);
    });

    test.each(REFUSALS)('Refuses %s', (_, refusal) => {
      const { query, nodeId, first, second } = refusal(fix);
      expect(fix.can(query, nodeId, first, second)).toBe(false);
      expect(() => fix.fix(query, nodeId, first, second)).toThrow(
        new Error(`Can't ${verb} the columns of concat "${nodeId}"`),
      );
    });
  },
);

test(
  unitTest(
    'Concat autofix: each fix refuses the inputs only the other plans for',
  ),
  () => {
    const narrower = wired(ints('A', 'B', 'C'), ints('A', 'C'));
    expect(
      canRenameConcatInput(narrower, 'concat101', ...inputSchemas(narrower)),
    ).toBe(false);
    expect(() => rename(narrower)).toThrow(
      new Error(`Can't rename the columns of concat "concat101"`),
    );
    const renamed = wired(ints('A', 'B'), ints('A', 'X'));
    expect(
      canRestrictConcatInput(renamed, 'concat101', ...inputSchemas(renamed)),
    ).toBe(false);
    expect(() => restrict(renamed)).toThrow(
      new Error(`Can't restrict the columns of concat "concat101"`),
    );
  },
);

describe(
  unitTest("Concat autofix: the query, with the concat's setting"),
  () => {
    /** A Concat that converts types (Convert types, PLAN §11.5, Q5) */
    const converting = (): Concat => new Concat('concat101', true);

    /** Each column of the node's schema as `name type` */
    const typesOf = (query: Query, nodeId: string): string[] | undefined =>
      infer(query)
        .schemas.get(nodeId)
        ?.columns.map((c) => `${c.name} ${c.type.displayName}`);

    test('Offers and applies a Rename that only Convert types makes valid', () => {
      const first = new Schema([int('A'), varchar('B', 5)]);
      const second = new Schema([int('A'), varchar('X', 15)]);
      const strict = wired(first, second);
      expect(
        canRenameConcatInput(strict, 'concat101', ...inputSchemas(strict)),
      ).toBe(false);
      expect(() => rename(strict)).toThrow(
        new Error(`Can't rename the columns of concat "concat101"`),
      );

      const query = wired(first, second, 'concat101', converting());
      expect(
        canRenameConcatInput(query, 'concat101', ...inputSchemas(query)),
      ).toBe(true);
      const fixed = rename(query);
      expect(feeds(fixed, 'concat101')).toEqual([
        'relational101>tds1',
        'rename101>tds2',
      ]);
      expect(pairsOf((fixed.getNode('rename101') as Rename).mappings)).toEqual([
        'X->B',
      ]);
      // the concat kept, with its setting
      expect(fixed.getNode('concat101') === query.getNode('concat101')).toBe(
        true,
      );
      const { validity } = infer(fixed);
      expect(validity.get('rename101')).toEqual([]);
      expect(validity.get('concat101')).toEqual([]);
      expect(validity.get('filter101')).toEqual([]);
      expect(typesOf(fixed, 'concat101')).toEqual(['A Int', 'B String']);
      expect(fixed.validate(validity)).toBe(true);
    });

    test('Offers and applies a Restrict that only Convert types makes valid', () => {
      const first = new Schema([int('A'), varchar('B', 5), int('C')]);
      const second = new Schema([bigInt('A'), varchar('B', 15)]);
      const strict = wired(first, second);
      expect(
        canRestrictConcatInput(strict, 'concat101', ...inputSchemas(strict)),
      ).toBe(false);
      expect(() => restrict(strict)).toThrow(
        new Error(`Can't restrict the columns of concat "concat101"`),
      );

      const query = wired(first, second, 'concat101', converting());
      expect(
        canRestrictConcatInput(query, 'concat101', ...inputSchemas(query)),
      ).toBe(true);
      const fixed = restrict(query);
      expect(feeds(fixed, 'concat101')).toEqual([
        'relational102>tds2',
        'restrict101>tds1',
      ]);
      expect((fixed.getNode('restrict101') as Restrict).columns).toEqual([
        'A',
        'B',
      ]);
      expect(fixed.getNode('concat101') === query.getNode('concat101')).toBe(
        true,
      );
      const { validity } = infer(fixed);
      expect(validity.get('restrict101')).toEqual([]);
      expect(validity.get('concat101')).toEqual([]);
      expect(typesOf(fixed, 'concat101')).toEqual(['A Integer', 'B String']);
      expect(fixed.validate(validity)).toBe(true);
    });

    test("Reads the setting from the query's concat, for the schemas the caller gives", () => {
      // an editor asks with its inputs' schemas: the answer follows the concat
      // the query holds, turned off here
      const first = new Schema([int('A'), varchar('B', 5)]);
      const second = new Schema([int('A'), varchar('X', 15)]);
      const query = wired(first, second, 'concat101', converting());
      expect(canRenameConcatInput(query, 'concat101', first, second)).toBe(
        true,
      );
      const off = query.replace(converting().withWidenTypes(false));
      expect((off.getNode('concat101') as Concat).widenTypes).toBe(false);
      expect(canRenameConcatInput(off, 'concat101', first, second)).toBe(false);
      expect(() => renameConcatInput(off, 'concat101', first, second)).toThrow(
        new Error(`Can't rename the columns of concat "concat101"`),
      );
      // and turned back on
      const on = off.replace(
        (off.getNode('concat101') as Concat).withWidenTypes(true),
      );
      expect(canRenameConcatInput(on, 'concat101', first, second)).toBe(true);
      expect(
        pairsOf(
          (
            renameConcatInput(on, 'concat101', first, second).getNode(
              'rename101',
            ) as Rename
          ).mappings,
        ),
      ).toEqual(['X->B']);

      const wide = new Schema([int('A'), varchar('B', 5), int('C')]);
      const narrow = new Schema([int('A'), varchar('B', 15)]);
      const widening = wired(wide, narrow, 'concat101', converting());
      expect(canRestrictConcatInput(widening, 'concat101', wide, narrow)).toBe(
        true,
      );
      const strict = widening.replace(new Concat('concat101'));
      expect(canRestrictConcatInput(strict, 'concat101', wide, narrow)).toBe(
        false,
      );
      expect(() =>
        restrictConcatInput(strict, 'concat101', wide, narrow),
      ).toThrow(new Error(`Can't restrict the columns of concat "concat101"`));
    });

    test("Refuses both fixes when a type can't be converted, converting types", () => {
      const renamed = wired(
        new Schema([int('A'), int('B')]),
        new Schema([int('A'), string('X')]),
        'concat101',
        converting(),
      );
      expect(
        canRenameConcatInput(renamed, 'concat101', ...inputSchemas(renamed)),
      ).toBe(false);
      expect(() => rename(renamed)).toThrow(
        new Error(`Can't rename the columns of concat "concat101"`),
      );
      const restricted = wired(
        new Schema([string('A')]),
        new Schema([int('A'), int('B')]),
        'concat101',
        converting(),
      );
      expect(
        canRestrictConcatInput(
          restricted,
          'concat101',
          ...inputSchemas(restricted),
        ),
      ).toBe(false);
      expect(() => restrict(restricted)).toThrow(
        new Error(`Can't restrict the columns of concat "concat101"`),
      );
    });
  },
);
