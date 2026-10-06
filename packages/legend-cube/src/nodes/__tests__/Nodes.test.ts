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
} from '../../__test-utils__/CubeTestNodes.js';
import { MESSAGE_SOURCE_SCHEMA_UNRESOLVED } from '../../messages/CubeMessages.js';
import { Schema } from '../../schema/Schema.js';
import {
  createNodeRegistry,
  NodeRegistry,
  RELATIONAL_TABLE_SOURCE_DEFINITION,
  type TransformDefinition,
} from '../NodeRegistry.js';
import {
  type RelationalTableCoordinates,
  RelationalTableSource,
} from '../sources/RelationalTableSource.js';
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
  test('Has the relational table source by default', () => {
    const registry = createNodeRegistry();
    const definition = registry.get('relational');
    expect(definition).toBe(RELATIONAL_TABLE_SOURCE_DEFINITION);
    expect(definition?.label).toBe('Relational Database Table');
    expect(definition?.beta).toBe(false);
    expect(registry.sources.map((d) => d.type)).toEqual(['relational']);
    expect(registry.transforms).toEqual([]);
    expect(registry.queryRules).toHaveLength(1);
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
    };
    const registry = new NodeRegistry([transform]);
    expect(registry.transforms).toEqual([transform]);
    expect(registry.get('missing')).toBeUndefined();
    expect(() => registry.register(transform)).toThrow();
    expect(() =>
      registry.register({ ...transform, type: UnknownNode.TYPE }),
    ).toThrow();
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
    });
    expect(second.get(TestUnaryNode.TYPE)).toBeUndefined();
    expect(createNodeRegistry().get(TestUnaryNode.TYPE)).toBeUndefined();
  });
});
