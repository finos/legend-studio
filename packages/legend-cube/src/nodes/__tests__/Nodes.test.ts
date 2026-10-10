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
import { unitTest } from '../../__test-utils__/CubeTestUtils.js';
import {
  column,
  TestBinaryNode,
  TestUnaryNode,
  testSpecCodec,
} from '../../__test-utils__/CubeTestNodes.js';
import { FilterOperator } from '../../filter/FilterOperator.js';
import {
  ColumnComparisonFilter,
  UnsupportedFilter,
} from '../../filter/FilterTree.js';
import { type QueryNode, UNRESOLVED } from '../../graph/QueryNode.js';
import type { RelationExpr } from '../../ir/CubeIR.js';
import { MESSAGE_SOURCE_SCHEMA_UNRESOLVED } from '../../messages/CubeMessages.js';
import { Schema } from '../../schema/Schema.js';
import { FILTER_CODEC } from '../../spec/codecs/FilterCodec.js';
import { JOIN_CODEC } from '../../spec/codecs/JoinCodec.js';
import { RELATIONAL_TABLE_SOURCE_CODEC } from '../../spec/codecs/RelationalTableSourceCodec.js';
import type { JsonObject } from '../../utils/Json.js';
import {
  type AnyNodeDefinition,
  CONCAT_DEFINITION,
  createNodeRegistry,
  DATA_PRODUCT_ACCESS_POINT_SOURCE_DEFINITION,
  INGEST_DATASET_SOURCE_DEFINITION,
  DISTINCT_DEFINITION,
  DROP_DEFINITION,
  FILTER_DEFINITION,
  GROUP_DEFINITION,
  JOIN_DEFINITION,
  LIMIT_DEFINITION,
  NodeRegistry,
  PARTITION_DEFINITION,
  RELATIONAL_TABLE_SOURCE_DEFINITION,
  RENAME_DEFINITION,
  RESTRICT_DEFINITION,
  SLICE_DEFINITION,
  SORT_DEFINITION,
  type TransformDefinition,
} from '../NodeRegistry.js';
import {
  getRelationalDisplayName,
  type RelationalTableCoordinates,
  RelationalTableSource,
  type SnapshotColumnRest,
} from '../sources/RelationalTableSource.js';
import { Concat } from '../transforms/Concat.js';
import { Partition } from '../transforms/Partition.js';
import { Distinct } from '../transforms/Distinct.js';
import { Drop } from '../transforms/Drop.js';
import { Filter } from '../transforms/Filter.js';
import { Group } from '../transforms/Group.js';
import { Join, JoinType } from '../transforms/Join.js';
import { Limit } from '../transforms/Limit.js';
import { Rename } from '../transforms/Rename.js';
import { Restrict } from '../transforms/Restrict.js';
import { Slice } from '../transforms/Slice.js';
import { Sort } from '../transforms/Sort.js';
import { UnknownNode } from '../UnknownNode.js';

const COORDINATES = {
  database: 'test::Northwind',
  schema: 'NORTHWIND',
  table: 'ORDERS',
};
const ORDERS_SCHEMA = new Schema([column('ORDER_ID', 'Int')]);

describe(unitTest('Relational table source'), () => {
  test('Is a source of type "relational"', () => {
    const source = new RelationalTableSource('relational101', COORDINATES);
    expect(source.type).toBe('relational');
    expect(source.ports).toEqual([]);
    expect(source.portLabels).toEqual([]);
    expect(source.database).toBe('test::Northwind');
    expect(source.schema).toBe('NORTHWIND');
    expect(source.table).toBe('ORDERS');
  });

  test('Is invalid until resolved to a schema', () => {
    const unresolved = new RelationalTableSource('relational101', COORDINATES);
    const errors: string[] = [];
    expect(unresolved.validate([], errors)).toBe(false);
    expect(errors).toEqual([MESSAGE_SOURCE_SCHEMA_UNRESOLVED]);
    expect(errors).toEqual([
      'Required schema of this source could not be resolved.',
    ]);
    expect(unresolved.schematize([])).toBeUndefined();
    expect(unresolved.describe()).toBe('(unknown)');

    const resolved = unresolved.withResolution({
      kind: 'resolved',
      schema: ORDERS_SCHEMA,
    });
    expect(resolved.id).toBe(unresolved.id);
    expect(resolved.key).not.toBe(unresolved.key);
    expect(resolved.table).toBe('ORDERS');
    expect(resolved.validate([])).toBe(true);
    expect(resolved.schematize([])).toBe(ORDERS_SCHEMA);
    expect(resolved.describe()).toBe('Table "ORDERS" from schema "NORTHWIND"');
  });

  test('Reports the first line of a failed resolution', () => {
    const errors: string[] = [];
    const failed = new RelationalTableSource('relational101', COORDINATES, {
      kind: 'failed',
      message: 'Table "ORDERS" not found\nat line 1',
    });
    expect(failed.validate([], errors)).toBe(false);
    expect(errors).toEqual(['Table "ORDERS" not found']);
    expect(failed.describe()).toBe('Table "ORDERS" from schema "NORTHWIND"');

    const blankErrors: string[] = [];
    new RelationalTableSource('relational101', COORDINATES, {
      kind: 'failed',
      message: '\nsecond line',
    }).validate([], blankErrors);
    expect(blankErrors).toEqual([MESSAGE_SOURCE_SCHEMA_UNRESOLVED]);
  });

  test.each<[string, unknown]>([
    ['no coordinates', undefined],
    ['null', null],
    ['a string', 'NORTHWIND.ORDERS'],
    ['a missing table', { database: 'test::Northwind', schema: 'NORTHWIND' }],
    ['an empty schema', { ...COORDINATES, schema: '' }],
    ['a database that is not a string', { ...COORDINATES, database: 1 }],
  ])('Refuses coordinates with %s', (_, coordinates) => {
    expect(() =>
      RelationalTableSource.fromCoordinates('relational101', coordinates),
    ).toThrow();
  });

  test('Builds an unresolved source from coordinates', () => {
    const source = RelationalTableSource.fromCoordinates('relational101', {
      ...COORDINATES,
      extra: 'ignored',
    });
    expect(source.resolution.kind).toBe('unresolved');
    expect(source.table).toBe('ORDERS');
    expect(
      () =>
        new RelationalTableSource('relational101', {
          ...COORDINATES,
          table: '',
        }),
    ).toThrow();
  });
});

describe(unitTest('Unknown node'), () => {
  test('Has one synthetic port per input, is never valid and never accepts new inputs', () => {
    const node = new UnknownNode('pivot101', 2);
    expect(node.type).toBe('unknown');
    expect(node.ports).toEqual(['in0', 'in1']);
    expect(node.acceptsNewInputs).toBe(false);
    expect(node.describe()).toBe('Unknown Transform "pivot101"');
    const errors: string[] = [];
    expect(node.validate([ORDERS_SCHEMA, ORDERS_SCHEMA], errors)).toBe(false);
    expect(errors).toEqual([]);
    expect(node.schematize([ORDERS_SCHEMA, ORDERS_SCHEMA])).toBeUndefined();
    expect(new UnknownNode('source101', 0).ports).toEqual([]);
  });

  test('Needs a whole, non-negative number of inputs', () => {
    expect(() => new UnknownNode('pivot101', -1)).toThrow();
    expect(() => new UnknownNode('pivot101', 1.5)).toThrow();
  });
});

describe(unitTest('Node registry'), () => {
  test('Has the relational table, data product and ingest data set sources and the transforms, in menu order, by default', () => {
    const registry = createNodeRegistry();
    const definition = registry.get('relational');
    expect(definition).toBe(RELATIONAL_TABLE_SOURCE_DEFINITION);
    expect(definition?.label).toBe('Relational Database Table');
    expect(definition?.beta).toBe(false);
    expect(registry.sources.map((d) => d.type)).toEqual([
      'relational',
      'dataProductAccessPoint',
      'ingestDataset',
    ]);
    const dataProduct = registry.get('dataProductAccessPoint');
    expect(dataProduct).toBe(DATA_PRODUCT_ACCESS_POINT_SOURCE_DEFINITION);
    expect(dataProduct?.label).toBe('Data Product');
    expect(dataProduct?.beta).toBe(true);
    const ingest = registry.get('ingestDataset');
    expect(ingest).toBe(INGEST_DATASET_SOURCE_DEFINITION);
    expect(ingest?.label).toBe('Ingest Dataset');
    expect(ingest?.beta).toBe(true);
    // transforms in the spec's menu order (§7): Sort, Group, Filter, Restrict, Rename, Distinct, Drop, Limit, Slice, Concat, Join, then Partition
    expect(registry.transforms).toEqual([
      SORT_DEFINITION,
      GROUP_DEFINITION,
      FILTER_DEFINITION,
      RESTRICT_DEFINITION,
      RENAME_DEFINITION,
      DISTINCT_DEFINITION,
      DROP_DEFINITION,
      LIMIT_DEFINITION,
      SLICE_DEFINITION,
      CONCAT_DEFINITION,
      JOIN_DEFINITION,
      PARTITION_DEFINITION,
    ]);
    expect(registry.get('sort')).toBe(SORT_DEFINITION);
    expect(registry.get('group')).toBe(GROUP_DEFINITION);
    expect(registry.get('filter')).toBe(FILTER_DEFINITION);
    expect(registry.get('limit')).toBe(LIMIT_DEFINITION);
    expect(registry.get('concat')).toBe(CONCAT_DEFINITION);
    expect(registry.get('join')).toBe(JOIN_DEFINITION);
    expect(registry.get('partition')).toBe(PARTITION_DEFINITION);
    // a window is the only node a run binds with a let (PLAN §8.6)
    expect(
      registry.transforms
        .filter((transform) => transform.isolationBoundary)
        .map((transform) => transform.type),
    ).toEqual(['partition']);
    // the relational sources' database rule, and the one-kind rule once
    expect(registry.queryRules).toHaveLength(2);
  });

  test('Creates a sort with no key yet', () => {
    expect(SORT_DEFINITION.kind).toBe('transform');
    expect(SORT_DEFINITION.type).toBe('sort');
    expect(SORT_DEFINITION.label).toBe('Sort by Column');
    expect(SORT_DEFINITION.icon).toBe('sort');
    expect(SORT_DEFINITION.beta).toBe(false);
    const sort = SORT_DEFINITION.create('sort101');
    expect(sort).toBeInstanceOf(Sort);
    expect(sort.id).toBe('sort101');
    expect(sort.sorts).toEqual([]);
  });

  test('Creates a group with no key and no aggregation yet', () => {
    expect(GROUP_DEFINITION.kind).toBe('transform');
    expect(GROUP_DEFINITION.type).toBe('group');
    expect(GROUP_DEFINITION.label).toBe('Group by Column');
    expect(GROUP_DEFINITION.icon).toBe('group');
    expect(GROUP_DEFINITION.beta).toBe(false);
    const group = GROUP_DEFINITION.create('group101');
    expect(group).toBeInstanceOf(Group);
    expect(group.id).toBe('group101');
    expect(group.columns).toEqual([]);
    expect(group.aggregations).toEqual([]);
  });

  test('Creates a partition with no partition column, sort or window function yet', () => {
    expect(PARTITION_DEFINITION.kind).toBe('transform');
    expect(PARTITION_DEFINITION.type).toBe('partition');
    expect(PARTITION_DEFINITION.label).toBe('Apply Window Functions');
    expect(PARTITION_DEFINITION.icon).toBe('partition');
    expect(PARTITION_DEFINITION.beta).toBe(false);
    expect(PARTITION_DEFINITION.isolationBoundary).toBe(true);
    const node = PARTITION_DEFINITION.create('partition101');
    expect(node).toBeInstanceOf(Partition);
    expect(node.id).toBe('partition101');
    expect(node.columns).toEqual([]);
    expect(node.sorts).toEqual([]);
    expect(node.aggregations).toEqual([]);
  });

  test('Creates a concat that converts no types', () => {
    expect(CONCAT_DEFINITION.kind).toBe('transform');
    expect(CONCAT_DEFINITION.type).toBe('concat');
    expect(CONCAT_DEFINITION.label).toBe('Concatenate Another Input');
    expect(CONCAT_DEFINITION.icon).toBe('concat');
    expect(CONCAT_DEFINITION.beta).toBe(false);
    const concat = CONCAT_DEFINITION.create('concat101');
    expect(concat).toBeInstanceOf(Concat);
    expect(concat.id).toBe('concat101');
    expect(concat.widenTypes).toBe(false);
  });

  test('Creates a filter with no filter yet', () => {
    expect(FILTER_DEFINITION.kind).toBe('transform');
    expect(FILTER_DEFINITION.type).toBe('filter');
    expect(FILTER_DEFINITION.label).toBe('Filter by Column');
    expect(FILTER_DEFINITION.icon).toBe('filter');
    expect(FILTER_DEFINITION.beta).toBe(false);
    const filter = FILTER_DEFINITION.create('filter101');
    expect(filter).toBeInstanceOf(Filter);
    expect(filter.id).toBe('filter101');
    expect(filter.filter).toBeUndefined();
  });

  test('Creates a restrict with no column yet', () => {
    expect(RESTRICT_DEFINITION.kind).toBe('transform');
    expect(RESTRICT_DEFINITION.type).toBe('restrict');
    expect(RESTRICT_DEFINITION.label).toBe('Restrict Columns');
    expect(RESTRICT_DEFINITION.icon).toBe('restrict');
    expect(RESTRICT_DEFINITION.beta).toBe(false);
    const restrict = RESTRICT_DEFINITION.create('restrict101');
    expect(restrict).toBeInstanceOf(Restrict);
    expect(restrict.id).toBe('restrict101');
    expect(restrict.columns).toEqual([]);
  });

  test('Creates a rename with no mapping yet', () => {
    expect(RENAME_DEFINITION.kind).toBe('transform');
    expect(RENAME_DEFINITION.type).toBe('rename');
    expect(RENAME_DEFINITION.label).toBe('Rename Columns');
    expect(RENAME_DEFINITION.icon).toBe('rename');
    expect(RENAME_DEFINITION.beta).toBe(false);
    const rename = RENAME_DEFINITION.create('rename101');
    expect(rename).toBeInstanceOf(Rename);
    expect(rename.id).toBe('rename101');
    expect(rename.mappings).toEqual([]);
  });

  test('Creates a distinct, which has nothing to set', () => {
    expect(DISTINCT_DEFINITION.kind).toBe('transform');
    expect(DISTINCT_DEFINITION.type).toBe('distinct');
    expect(DISTINCT_DEFINITION.label).toBe('Distinct Values');
    expect(DISTINCT_DEFINITION.icon).toBe('distinct');
    expect(DISTINCT_DEFINITION.beta).toBe(false);
    const distinct = DISTINCT_DEFINITION.create('distinct101');
    expect(distinct).toBeInstanceOf(Distinct);
    expect(distinct.id).toBe('distinct101');
  });

  test('Creates a drop of 10 rows', () => {
    expect(DROP_DEFINITION.kind).toBe('transform');
    expect(DROP_DEFINITION.type).toBe('drop');
    expect(DROP_DEFINITION.label).toBe('Drop first <x> rows');
    expect(DROP_DEFINITION.icon).toBe('drop');
    expect(DROP_DEFINITION.beta).toBe(false);
    const drop = DROP_DEFINITION.create('drop101');
    expect(drop).toBeInstanceOf(Drop);
    expect(drop.id).toBe('drop101');
    expect(drop.size).toBe(10);
  });

  test('Creates a limit of 10 rows', () => {
    expect(LIMIT_DEFINITION.kind).toBe('transform');
    expect(LIMIT_DEFINITION.type).toBe('limit');
    expect(LIMIT_DEFINITION.label).toBe('Take first <x> rows');
    expect(LIMIT_DEFINITION.icon).toBe('limit');
    expect(LIMIT_DEFINITION.beta).toBe(false);
    const limit = LIMIT_DEFINITION.create('limit101');
    expect(limit).toBeInstanceOf(Limit);
    expect(limit.id).toBe('limit101');
    expect(limit.size).toBe(10);
  });

  test('Creates a slice of rows 10 to 20', () => {
    expect(SLICE_DEFINITION.kind).toBe('transform');
    expect(SLICE_DEFINITION.type).toBe('slice');
    expect(SLICE_DEFINITION.label).toBe('Take rows <x> to <y>');
    expect(SLICE_DEFINITION.icon).toBe('slice');
    expect(SLICE_DEFINITION.beta).toBe(false);
    const slice = SLICE_DEFINITION.create('slice101');
    expect(slice).toBeInstanceOf(Slice);
    expect(slice.id).toBe('slice101');
    expect([slice.start, slice.stop]).toEqual([10, 20]);
  });

  test('Describes nodes without user values for logs', () => {
    const source = new RelationalTableSource('relational101', COORDINATES);
    expect(source.describeRedacted()).toBe(source.describe());
    const join = JOIN_DEFINITION.create('join101');
    expect(join.describeRedacted()).toBe('Join additional input');
    expect(new UnknownNode('u', 1).describeRedacted()).toBe(
      'Unknown Transform "u"',
    );
  });

  test('Creates a join with the default settings', () => {
    expect(JOIN_DEFINITION.kind).toBe('transform');
    expect(JOIN_DEFINITION.type).toBe('join');
    expect(JOIN_DEFINITION.label).toBe('Join Another Input');
    expect(JOIN_DEFINITION.icon).toBe('join');
    expect(JOIN_DEFINITION.beta).toBe(false);
    const join = JOIN_DEFINITION.create('join101');
    expect(join).toBeInstanceOf(Join);
    expect(join.id).toBe('join101');
    expect(join.leftColumns).toEqual([]);
    expect(join.rightColumns).toEqual([]);
    expect(join.joinType).toBe(JoinType.LEFT_OUTER);
  });

  test('Builds and resolves sources through the definition', () => {
    const source = RELATIONAL_TABLE_SOURCE_DEFINITION.fromCoordinates(
      'relational101',
      COORDINATES,
    );
    const resolved = RELATIONAL_TABLE_SOURCE_DEFINITION.resolve(source, {
      kind: 'resolved',
      schema: ORDERS_SCHEMA,
    });
    expect(resolved.schematize([])).toBe(ORDERS_SCHEMA);
  });

  test('Refuses duplicate and reserved types', () => {
    const transform: TransformDefinition = {
      kind: 'transform',
      type: TestBinaryNode.TYPE,
      label: 'Test',
      icon: 'test',
      beta: true,
      create: (id) => new TestBinaryNode(id),
      emit: (node, [left]) => left as RelationExpr,
      spec: testSpecCodec((id) => new TestBinaryNode(id)),
    };
    const registry = new NodeRegistry([transform]);
    expect(registry.transforms).toEqual([transform]);
    expect(registry.get('missing')).toBeUndefined();
    expect(() => registry.register(transform)).toThrow(
      'Node type "testBinary" is already registered',
    );
    expect(() =>
      registry.register({ ...transform, type: UnknownNode.TYPE }),
    ).toThrow('Node type "unknown" is reserved');
    expect(() => new NodeRegistry([{ ...transform, type: 'unknown' }])).toThrow(
      'Node type "unknown" is reserved',
    );
  });
});

describe(unitTest('Node contracts'), () => {
  const resolved = new RelationalTableSource('relational101', COORDINATES, {
    kind: 'resolved',
    schema: ORDERS_SCHEMA,
  });

  test('Every node checks that it gets one input schema per port', () => {
    const wrongCount = /input schema/u;
    [resolved, new RelationalTableSource('relational102', COORDINATES)].forEach(
      (source) => {
        expect(() => source.validate([ORDERS_SCHEMA])).toThrow(wrongCount);
        expect(() => source.schematize([ORDERS_SCHEMA])).toThrow(wrongCount);
      },
    );
    const unknown = new UnknownNode('pivot101', 2);
    expect(() => unknown.validate([ORDERS_SCHEMA])).toThrow(wrongCount);
    expect(() => unknown.schematize([ORDERS_SCHEMA])).toThrow(wrongCount);
    expect(() => unknown.validate([null, null] as unknown as Schema[])).toThrow(
      wrongCount,
    );
    const unary = new TestUnaryNode('unary101');
    expect(() => unary.schematize([])).toThrow(wrongCount);
    expect(() => unary.schematize([ORDERS_SCHEMA, ORDERS_SCHEMA])).toThrow(
      wrongCount,
    );
    expect(() => unary.schematize([null] as unknown as Schema[])).toThrow(
      wrongCount,
    );
  });

  test('Binary nodes label their ports Left and Right; others have no labels', () => {
    const binary = new TestBinaryNode('binary101');
    expect(binary.ports).toEqual(['tds1', 'tds2']);
    expect(binary.portLabels).toEqual(['Left', 'Right']);
    expect(new TestUnaryNode('unary101').ports).toEqual(['tds']);
    expect(new TestUnaryNode('unary101').portLabels).toEqual([]);
    expect(new UnknownNode('pivot101', 2).portLabels).toEqual([]);
  });

  test('Keys increase with every new node, even with the same id', () => {
    const first = new TestUnaryNode('same');
    const second = new TestUnaryNode('same');
    expect(second.key).toBeGreaterThan(first.key);
  });

  test.each<[string, Record<string, unknown>]>([
    ['an empty database', { ...COORDINATES, database: '' }],
    ['an empty schema', { ...COORDINATES, schema: '' }],
    ['an empty table', { ...COORDINATES, table: '' }],
    ['a database that is not a string', { ...COORDINATES, database: 1 }],
  ])('The relational source constructor refuses %s', (_, coordinates) => {
    expect(
      () =>
        new RelationalTableSource(
          'relational101',
          coordinates as unknown as RelationalTableCoordinates,
        ),
    ).toThrow();
  });

  test('Shows quoted schema and table names without their quotes', () => {
    const quoted = { ...COORDINATES, schema: '"My Schema"', table: '"a.b"' };
    const source = new RelationalTableSource('relational101', quoted, {
      kind: 'resolved',
      schema: ORDERS_SCHEMA,
    });
    expect(source.describe()).toBe('Table "a.b" from schema "My Schema"');
    // the stored names keep their quotes: the engine needs them
    expect(source.table).toBe('"a.b"');
    expect(
      source
        .withResolution({ kind: 'failed', message: 'not found' })
        .describe(),
    ).toBe('Table "a.b" from schema "My Schema"');
    // a lone quote character is a name, not a quoted one
    expect(
      new RelationalTableSource(
        'relational102',
        { ...COORDINATES, table: '"' },
        {
          kind: 'resolved',
          schema: ORDERS_SCHEMA,
        },
      ).describe(),
    ).toBe('Table """ from schema "NORTHWIND"');
  });

  test('Drops one pair of surrounding quotes from a name for display, and nothing else', () => {
    expect(getRelationalDisplayName('"a.b"')).toBe('a.b');
    expect(getRelationalDisplayName('""a""')).toBe('"a"');
    expect(getRelationalDisplayName('ORDERS')).toBe('ORDERS');
    expect(getRelationalDisplayName('"a')).toBe('"a');
    expect(getRelationalDisplayName('"')).toBe('"');
    expect(getRelationalDisplayName('""')).toBe('');
  });
});

describe(unitTest('Nodes, more cases'), () => {
  const resolvedWith = (table: string): RelationalTableSource =>
    new RelationalTableSource(
      'relational101',
      { ...COORDINATES, table },
      {
        kind: 'resolved',
        schema: ORDERS_SCHEMA,
      },
    );

  test('Strips exactly one surrounding pair of quotes', () => {
    // a doubled quote inside a quoted name stays
    expect(resolvedWith('"a""b"').describe()).toBe(
      'Table "a""b" from schema "NORTHWIND"',
    );
    // a quote on one side only is part of the name
    expect(resolvedWith('"ab').describe()).toBe(
      'Table ""ab" from schema "NORTHWIND"',
    );
    expect(resolvedWith('ab"').describe()).toBe(
      'Table "ab"" from schema "NORTHWIND"',
    );
  });

  test('Reports the schema error when the first line of a failure is blank', () => {
    const errors: string[] = [];
    new RelationalTableSource('relational101', COORDINATES, {
      kind: 'failed',
      message: '  \nsecond line',
    }).validate([], errors);
    expect(errors).toEqual([MESSAGE_SOURCE_SCHEMA_UNRESOLVED]);
    const trimmed: string[] = [];
    new RelationalTableSource('relational101', COORDINATES, {
      kind: 'failed',
      message: '  Table missing  \nmore',
    }).validate([], trimmed);
    expect(trimmed).toEqual(['Table missing']);
  });

  test('Lists sources and transforms apart', () => {
    const transform: TransformDefinition = {
      kind: 'transform',
      type: TestUnaryNode.TYPE,
      label: 'Test',
      icon: 'test',
      beta: false,
      create: (id) => new TestUnaryNode(id),
      emit: (node, [input]) => input as RelationExpr,
      spec: testSpecCodec((id) => new TestUnaryNode(id)),
    };
    const registry = new NodeRegistry([
      RELATIONAL_TABLE_SOURCE_DEFINITION,
      transform,
    ]);
    expect(registry.sources).toEqual([RELATIONAL_TABLE_SOURCE_DEFINITION]);
    expect(registry.transforms).toEqual([transform]);
    expect(registry.queryRules).toHaveLength(1);
    expect(new NodeRegistry([transform]).sources).toEqual([]);
    expect(new NodeRegistry([transform]).queryRules).toEqual([]);
  });

  test('Every registry is a new one', () => {
    const first = createNodeRegistry();
    const second = createNodeRegistry();
    expect(first).not.toBe(second);
    first.register({
      kind: 'transform',
      type: TestUnaryNode.TYPE,
      label: 'Test',
      icon: 'test',
      beta: false,
      create: (id) => new TestUnaryNode(id),
      emit: (node, [input]) => input as RelationExpr,
      spec: testSpecCodec((id) => new TestUnaryNode(id)),
    });
    expect(second.get(TestUnaryNode.TYPE)).toBeUndefined();
    expect(createNodeRegistry().get(TestUnaryNode.TYPE)).toBeUndefined();
  });
});

describe(unitTest('Unknown keys on nodes'), () => {
  // keys a newer version saved on a node, kept for re-saving
  const REST: JsonObject = {
    color: 'blue',
    tags: ['a', null],
    layout: { x: 1, y: null },
  };
  const RESOLVED = { kind: 'resolved', schema: ORDERS_SCHEMA } as const;

  test('Default to none', () => {
    const nodes: QueryNode[] = [
      new TestUnaryNode('unary101'),
      new TestBinaryNode('binary101'),
      new Filter('filter101'),
      new Join('join101'),
      new RelationalTableSource('relational101', COORDINATES),
      new UnknownNode('pivot101', 1, { kind: 'pivot', color: 'blue' }),
      FILTER_DEFINITION.create('filter102'),
      JOIN_DEFINITION.create('join102'),
      // the source picker's extra keys are not unknown keys of a saved node
      RelationalTableSource.fromCoordinates('relational102', {
        ...COORDINATES,
        color: 'blue',
      }),
    ];
    nodes.forEach((node) => {
      expect(node.rest).toEqual({});
      expect(Object.isFrozen(node.rest)).toBe(true);
    });
  });

  test('A join keeps them through its edits', () => {
    const join = new Join(
      'join101',
      {
        leftColumns: ['CUSTOMER_ID'],
        rightColumns: ['ID'],
        joinType: JoinType.INNER,
      },
      REST,
    );
    expect(join.rest).toBe(REST);
    const edited = join.withSettings({ joinType: JoinType.FULL_OUTER });
    expect(edited.joinType).toBe(JoinType.FULL_OUTER);
    expect(edited.rest).toBe(REST);
    expect(join.withSettings({}).rest).toBe(REST);
    const swapped = join.withSwappedInputs();
    expect(swapped.leftColumns).toEqual(['ID']);
    expect(swapped.rightColumns).toEqual(['CUSTOMER_ID']);
    expect(swapped.rest).toBe(REST);
    expect(swapped.withSwappedInputs().rest).toBe(REST);
    // and a join without any keeps none
    expect(new Join('join102').withSwappedInputs().rest).toEqual({});
  });

  test('A filter keeps them through its edits', () => {
    const filter = new Filter('filter101', undefined, REST);
    expect(filter.rest).toBe(REST);
    const filtered = filter.withFilter(
      new ColumnComparisonFilter('ORDER_ID', FilterOperator.IS_EMPTY),
    );
    expect(filtered.filter?.kind).toBe('comparison');
    expect(filtered.rest).toBe(REST);
    expect(filtered.withFilter(undefined).rest).toBe(REST);
    expect(new Filter('filter102').withFilter(undefined).rest).toEqual({});
  });

  test('A relational source keeps them through every resolution', () => {
    const source = new RelationalTableSource(
      'relational101',
      COORDINATES,
      UNRESOLVED,
      REST,
    );
    expect(source.rest).toBe(REST);
    [
      RESOLVED,
      UNRESOLVED,
      { kind: 'failed', message: 'Table "ORDERS" not found' } as const,
    ].forEach((resolution) => {
      expect(source.withResolution(resolution).rest).toBe(REST);
      expect(
        RELATIONAL_TABLE_SOURCE_DEFINITION.resolve(source, resolution).rest,
      ).toBe(REST);
    });
  });

  test("A relational source keeps its snapshot columns' unknown keys through every resolution", () => {
    const plain = new RelationalTableSource('relational101', COORDINATES);
    expect(plain.columnRest).toBeInstanceOf(Map);
    expect(plain.columnRest.size).toBe(0);
    expect(plain.withResolution(RESOLVED).columnRest.size).toBe(0);
    expect(
      RelationalTableSource.fromCoordinates('relational102', COORDINATES)
        .columnRest.size,
    ).toBe(0);

    const columnRest = new Map<string, SnapshotColumnRest>([
      [
        'ORDER_ID',
        { column: { description: 'The order' }, type: { unsigned: true } },
      ],
    ]);
    const source = new RelationalTableSource(
      'relational101',
      COORDINATES,
      RESOLVED,
      REST,
      columnRest,
    );
    expect(source.columnRest).toBe(columnRest);
    [
      RESOLVED,
      { kind: 'resolved', schema: new Schema([]) } as const,
      UNRESOLVED,
      { kind: 'failed', message: 'Table "ORDERS" not found' } as const,
    ].forEach((resolution) => {
      const resolved = source.withResolution(resolution);
      expect(resolved.columnRest).toBe(columnRest);
      expect(resolved.rest).toBe(REST);
      expect(
        RELATIONAL_TABLE_SOURCE_DEFINITION.resolve(source, resolution)
          .columnRest,
      ).toBe(columnRest);
    });
  });
});

describe(unitTest('Unknown node, as saved'), () => {
  test('Has no saved JSON by default', () => {
    const node = new UnknownNode('pivot101', 1);
    expect(node.json).toEqual({});
    expect(Object.isFrozen(node.json)).toBe(true);
    expect(node.savedKind).toBeUndefined();
    expect(node.rest).toEqual({});
  });

  test('Keeps the JSON it was saved with, and reads the kind it was saved as', () => {
    const json: JsonObject = {
      kind: 'pivot',
      rows: ['SHIP_COUNTRY'],
      note: null,
    };
    const node = new UnknownNode('pivot101', 1, json);
    expect(node.json).toEqual({
      kind: 'pivot',
      rows: ['SHIP_COUNTRY'],
      note: null,
    });
    expect(node.savedKind).toBe('pivot');
    // it is still of the reserved type, and describes itself by id
    expect(node.type).toBe('unknown');
    expect(node.describe()).toBe('Unknown Transform "pivot101"');
    // what it was saved with is its JSON, not unknown keys of a known node
    expect(node.rest).toEqual({});
    // a node saved with the reserved kind itself
    expect(
      new UnknownNode('unknown101', 0, { kind: 'unknown' }).savedKind,
    ).toBe('unknown');
  });

  test.each<[string, JsonObject]>([
    ['no kind', { rows: [] }],
    ['a number', { kind: 5 }],
    ['null', { kind: null }],
    ['a boolean', { kind: true }],
    ['an object', { kind: { name: 'pivot' } }],
    ['a list', { kind: ['pivot'] }],
  ])('Has no saved kind when its JSON has %s for one', (_, json) => {
    expect(new UnknownNode('pivot101', 1, json).savedKind).toBeUndefined();
  });

  test('Has inputs when it has ports, or when told it was saved with an empty list', () => {
    expect(new UnknownNode('pivot101', 2).hasInputs).toBe(true);
    expect(new UnknownNode('pivot101', 1, {}).hasInputs).toBe(true);
    // ports can't be without inputs
    expect(new UnknownNode('pivot101', 2, {}, false).hasInputs).toBe(true);
    expect(new UnknownNode('source101', 0).hasInputs).toBe(false);
    expect(new UnknownNode('source101', 0, {}, false).hasInputs).toBe(false);
    // saved with `inputs: []`
    expect(new UnknownNode('source101', 0, {}, true).hasInputs).toBe(true);
  });
});

describe(unitTest('A filter node with an unsupported rule'), () => {
  test('Is invalid with the unsupported message and describes the rule without its JSON', () => {
    const rule = new UnsupportedFilter({
      column: 'ORDER_ID',
      operator: 'Between',
      value: [
        { kind: 'integer', value: '1' },
        { kind: 'integer', value: '5' },
      ],
    });
    const filter = new Filter('filter101', rule);
    expect(filter.filter).toBe(rule);
    const errors: string[] = [];
    expect(filter.validate([ORDERS_SCHEMA], errors)).toBe(false);
    expect(errors).toEqual(['This filter is not supported yet.']);
    expect(filter.schematize([ORDERS_SCHEMA])).toBeUndefined();
    expect(filter.describe()).toBe('Filter by (unsupported filter)');
    expect(filter.describeRedacted()).toBe('Filter by (unsupported filter)');
  });
});

describe(unitTest('Saved-spec hooks of the registry'), () => {
  test('Every definition has a spec codec, listing the keys it writes', () => {
    expect(RELATIONAL_TABLE_SOURCE_DEFINITION.spec).toBe(
      RELATIONAL_TABLE_SOURCE_CODEC,
    );
    expect(RELATIONAL_TABLE_SOURCE_DEFINITION.spec.keys).toEqual([
      'database',
      'schema',
      'table',
      'schemaSnapshot',
    ]);
    expect(FILTER_DEFINITION.spec).toBe(FILTER_CODEC);
    expect(FILTER_DEFINITION.spec.keys).toEqual(['filter']);
    expect(JOIN_DEFINITION.spec).toBe(JOIN_CODEC);
    expect(JOIN_DEFINITION.spec.keys).toEqual([
      'joinType',
      'leftColumns',
      'rightColumns',
    ]);
    const registry = createNodeRegistry();
    [...registry.sources, ...registry.transforms].forEach(
      (definition: AnyNodeDefinition) => {
        expect(typeof definition.spec.encode).toBe('function');
        expect(typeof definition.spec.decode).toBe('function');
        // the codec handles kind, id and inputs, never the node's own fields
        ['kind', 'id', 'inputs'].forEach((key) =>
          expect(definition.spec.keys).not.toContain(key),
        );
      },
    );
  });

  test.each<[string, AnyNodeDefinition, () => QueryNode]>([
    [
      'an unresolved source',
      RELATIONAL_TABLE_SOURCE_DEFINITION,
      () => new RelationalTableSource('relational101', COORDINATES),
    ],
    [
      'a resolved source',
      RELATIONAL_TABLE_SOURCE_DEFINITION,
      () =>
        new RelationalTableSource('relational101', COORDINATES, {
          kind: 'resolved',
          schema: ORDERS_SCHEMA,
        }),
    ],
    [
      'a filter without a filter',
      FILTER_DEFINITION,
      () => new Filter('filter101'),
    ],
    [
      'a filter',
      FILTER_DEFINITION,
      () =>
        new Filter(
          'filter101',
          new ColumnComparisonFilter('ORDER_ID', FilterOperator.IS_EMPTY),
        ),
    ],
    [
      'a join',
      JOIN_DEFINITION,
      () =>
        new Join('join101', {
          leftColumns: ['A'],
          rightColumns: ['B'],
          joinType: JoinType.RIGHT_OUTER,
        }),
    ],
  ])(
    'Writes the fields of %s in the order of its keys, and reads them back with the unknown keys given',
    (_, definition, build) => {
      const { spec } = definition as TransformDefinition;
      const node = build();
      const json = spec.encode(node);
      expect(Object.keys(json)).toEqual(
        spec.keys.filter((key) => Object.keys(json).includes(key)),
      );
      const rest: JsonObject = { color: 'blue' };
      const decoded = spec.decode(node.id, json, 'query.nodes[0]', rest);
      expect(decoded.type).toBe(definition.type);
      expect(decoded.id).toBe(node.id);
      expect(decoded.key).not.toBe(node.key);
      expect(decoded.rest).toBe(rest);
      expect(spec.encode(decoded)).toEqual(json);
    },
  );
});
