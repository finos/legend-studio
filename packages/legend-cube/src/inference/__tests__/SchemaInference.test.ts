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
  resolvedTable,
  TestBinaryNode,
  TestUnaryNode,
} from '../../__test-utils__/CubeTestNodes.js';
import { Connection } from '../../graph/Connection.js';
import { Query } from '../../graph/Query.js';
import {
  validate,
  validateAllItems,
  ensureSchemas,
} from '../ValidationUtils.js';
import type { Schema } from '../../schema/Schema.js';
import {
  ERR_INCOMPLETE,
  ERR_OTHER,
  ERR_SCHEMAS,
  MESSAGE_DIFFERENT_DATABASES,
  MESSAGE_SOURCE_SCHEMA_UNRESOLVED,
} from '../../messages/CubeMessages.js';
import { createNodeRegistry } from '../../nodes/NodeRegistry.js';
import {
  RelationalTableSource,
  relationalSourcesShareDatabase,
} from '../../nodes/sources/RelationalTableSource.js';
import { UnknownNode } from '../../nodes/UnknownNode.js';
import {
  buildSchemasAndValidity,
  isIncompleteError,
  isSchemasError,
} from '../SchemaInference.js';

const edge = (s: string, t: string, port = 'tds'): Connection =>
  new Connection(s, t, port);

const ORDERS = resolvedTable('orders', 'ORDERS', [
  column('ORDER_ID', 'Int'),
  column('CUSTOMER_ID', 'Varchar', true, [5]),
]);
const CUSTOMERS = resolvedTable('customers', 'CUSTOMERS', [
  column('CUSTOMER_ID', 'Varchar', false, [5]),
  column('COMPANY_NAME', 'Varchar', false, [40]),
]);

/** orders ─┐
 *          ├─► join ─► first ─► second
 * customers┘ */
const joinChain = (): Query =>
  new Query(
    [
      ORDERS,
      CUSTOMERS,
      new TestBinaryNode('join'),
      new TestUnaryNode('first'),
      new TestUnaryNode('second'),
    ],
    [
      edge('orders', 'join', 'tds1'),
      edge('customers', 'join', 'tds2'),
      edge('join', 'first'),
      edge('first', 'second'),
    ],
    'second',
  );

const names = (
  result: ReturnType<typeof buildSchemasAndValidity>,
  id: string,
): string[] | undefined => result.schemas.get(id)?.names();

describe(unitTest('Schema inference'), () => {
  test('Propagates schemas through a valid graph', () => {
    const query = joinChain();
    const result = buildSchemasAndValidity(query);
    expect(names(result, 'join')).toEqual([
      'ORDER_ID',
      'CUSTOMER_ID',
      'COMPANY_NAME',
    ]);
    expect(names(result, 'second')).toEqual(names(result, 'join'));
    query.nodes.forEach((node) =>
      expect(result.validity.get(node.id)).toEqual([]),
    );
    expect(query.validate(result.validity)).toBe(true);
  });

  test('Passes input schemas in port order', () => {
    const swapped = buildSchemasAndValidity(joinChain().swapInputs('join'));
    expect(names(swapped, 'join')).toEqual([
      'CUSTOMER_ID',
      'COMPANY_NAME',
      'ORDER_ID',
    ]);
  });

  test('An empty port makes the node incomplete, and every node downstream reports the upstream problem once', () => {
    // disconnect the right input of the binary node
    const query = joinChain().remove('customers');
    const result = buildSchemasAndValidity(query);
    expect(result.validity.get('orders')).toEqual([]);
    expect(result.schemas.get('join')).toBeUndefined();
    expect(result.validity.get('join')).toEqual([ERR_INCOMPLETE]);
    ['first', 'second'].forEach((id) => {
      expect(result.schemas.get(id)).toBeUndefined();
      expect(result.validity.get(id)).toEqual([ERR_SCHEMAS]);
    });
    expect(query.validate(result.validity)).toBe(false);
  });

  test('An invalid node reports its own errors, has no schema, and poisons only what is downstream', () => {
    const query = joinChain().replace(
      new TestUnaryNode('first', 'First is misconfigured.'),
    );
    const result = buildSchemasAndValidity(query);
    expect(result.validity.get('join')).toEqual([]);
    expect(result.validity.get('first')).toEqual(['First is misconfigured.']);
    expect(result.schemas.get('first')).toBeUndefined();
    expect(result.validity.get('second')).toEqual([ERR_SCHEMAS]);
  });

  test('An invalid node without a reason gets the generic error', () => {
    class SilentNode extends TestUnaryNode {
      override validate(): boolean {
        return false;
      }
    }
    const result = buildSchemasAndValidity(
      new Query(
        [ORDERS, new SilentNode('silent')],
        [edge('orders', 'silent')],
        'silent',
      ),
    );
    expect(result.validity.get('silent')).toEqual([ERR_OTHER]);
  });

  test('A node that is valid but gives no schema is invalid', () => {
    class NoSchemaNode extends TestUnaryNode {
      override schematize(): undefined {
        return undefined;
      }
    }
    const result = buildSchemasAndValidity(
      new Query(
        [ORDERS, new NoSchemaNode('n'), new TestUnaryNode('after')],
        [edge('orders', 'n'), edge('n', 'after')],
        'after',
      ),
    );
    expect(result.validity.get('n')).toEqual([ERR_OTHER]);
    expect(result.validity.get('after')).toEqual([ERR_SCHEMAS]);
  });

  test('Visits every node, including those the selected node does not depend on', () => {
    const query = joinChain().add(
      resolvedTable('products', 'PRODUCTS', [column('PRODUCT_ID', 'Int')]),
    );
    const result = buildSchemasAndValidity(query);
    expect(result.validity.get('products')).toEqual([]);
    expect(names(result, 'products')).toEqual(['PRODUCT_ID']);
  });

  test('Reports the resolution of sources', () => {
    const coordinates = {
      database: 'test::Northwind',
      schema: 'NORTHWIND',
      table: 'ORDERS',
    };
    const result = buildSchemasAndValidity(
      new Query(
        [
          new RelationalTableSource('pending', coordinates),
          new RelationalTableSource('failed', coordinates, {
            kind: 'failed',
            message: 'Table ORDERS not found\n  at line 3',
          }),
        ],
        [],
        'pending',
      ),
    );
    expect(result.validity.get('pending')).toEqual([
      MESSAGE_SOURCE_SCHEMA_UNRESOLVED,
    ]);
    expect(result.validity.get('failed')).toEqual(['Table ORDERS not found']);
  });

  test('An unknown node keeps its edges, is invalid, and makes downstream nodes report it', () => {
    const query = new Query(
      [
        ORDERS,
        CUSTOMERS,
        new UnknownNode('pivot101', 2),
        new TestUnaryNode('n'),
      ],
      [
        edge('orders', 'pivot101', 'in0'),
        edge('customers', 'pivot101', 'in1'),
        edge('pivot101', 'n'),
      ],
      'n',
    );
    expect(query.getInputIds('pivot101')).toEqual(['orders', 'customers']);
    const result = buildSchemasAndValidity(query);
    expect(result.validity.get('pivot101')).toEqual([ERR_OTHER]);
    expect(result.validity.get('n')).toEqual([ERR_SCHEMAS]);
    // an empty synthetic port makes it incomplete, like any node
    expect(
      buildSchemasAndValidity(query.remove('customers')).validity.get(
        'pivot101',
      ),
    ).toEqual([ERR_INCOMPLETE]);
  });

  test('Tells upstream problems and incomplete nodes apart', () => {
    expect(isSchemasError(ERR_SCHEMAS)).toBe(true);
    expect(isSchemasError(ERR_INCOMPLETE)).toBe(false);
    expect(isIncompleteError(ERR_INCOMPLETE)).toBe(true);
    expect(isIncompleteError(ERR_OTHER)).toBe(false);
  });
});

describe(unitTest('Query rules'), () => {
  const otherDatabase = resolvedTable(
    'customers',
    'CUSTOMERS',
    [column('CUSTOMER_ID', 'Varchar', false, [5])],
    'other::Database',
  );

  test('Every relational source must use the database of the first one', () => {
    const query = joinChain().replace(otherDatabase);
    const result = buildSchemasAndValidity(
      query,
      createNodeRegistry().queryRules,
    );
    expect(result.validity.get('orders')).toEqual([]);
    expect(result.validity.get('customers')).toEqual([
      MESSAGE_DIFFERENT_DATABASES('other::Database', 'test::Northwind'),
    ]);
    expect(result.validity.get('customers')).toEqual([
      'Sources from different databases are not supported yet; "other::Database" differs from "test::Northwind".',
    ]);
    expect(result.schemas.get('customers')).toBeUndefined();
    expect(result.validity.get('join')).toEqual([ERR_SCHEMAS]);
    expect(result.validity.get('second')).toEqual([ERR_SCHEMAS]);
  });

  test('Rule errors are kept alongside the other errors of a node', () => {
    // an incomplete node named by a rule reports both
    const query = new Query([new TestUnaryNode('n')], [], 'n');
    const result = buildSchemasAndValidity(query, [
      () => new Map([['n', ['Rule broken.']]]),
    ]);
    expect(result.validity.get('n')).toEqual(['Rule broken.', ERR_INCOMPLETE]);
  });

  test('Rules apply only when given', () => {
    const query = joinChain().replace(otherDatabase);
    expect(buildSchemasAndValidity(query).validity.get('customers')).toEqual(
      [],
    );
  });
});

describe(unitTest('Schema inference, more cases'), () => {
  test('Does not depend on the order of the nodes', () => {
    const query = joinChain();
    const expected = buildSchemasAndValidity(query);
    const reversed = buildSchemasAndValidity(
      new Query([...query.nodes].reverse(), query.connections, 'second'),
    );
    query.nodes.forEach((node) => {
      expect(reversed.validity.get(node.id)).toEqual([]);
      expect(names(reversed, node.id)).toEqual(names(expected, node.id));
    });
    // operations that leave the nodes out of chain order
    [
      joinChain().move('first', 'second'),
      joinChain().add(new TestUnaryNode('x'), 'join'),
    ].forEach((edited) => {
      const result = buildSchemasAndValidity(edited);
      edited.nodes.forEach((node) =>
        expect(result.validity.get(node.id)).toEqual([]),
      );
      expect(names(result, 'second')).toEqual(names(expected, 'join'));
    });
  });

  test('Swapping the inputs reaches every node downstream', () => {
    const swapped = buildSchemasAndValidity(joinChain().swapInputs('join'));
    expect(names(swapped, 'second')).toEqual(names(swapped, 'join'));
  });

  test('Keeps every error a node reports, in order, after the rule errors', () => {
    class ManyErrorsNode extends TestUnaryNode {
      override validate(
        inputSchemas: readonly Schema[],
        errors?: string[],
      ): boolean {
        ensureSchemas(inputSchemas, this.ports);
        return validateAllItems(['first', 'second', 'first'], (message) =>
          validate(false, message, errors),
        );
      }
    }
    const query = new Query(
      [ORDERS, new ManyErrorsNode('many')],
      [edge('orders', 'many')],
      'many',
    );
    const result = buildSchemasAndValidity(query, [
      () => new Map([['many', ['rule']]]),
    ]);
    expect(result.validity.get('many')).toEqual([
      'rule',
      'first',
      'second',
      'first',
    ]);
    expect(result.schemas.get('many')).toBeUndefined();
  });

  test('Stops on a cycle instead of recursing forever', () => {
    // a query that breaks the acyclic invariant, which a real Query can't
    const a = new TestUnaryNode('a');
    const b = new TestUnaryNode('b');
    const cyclic = {
      nodes: [a, b],
      getInputIds: (id: string) => (id === 'a' ? ['b'] : ['a']),
      getNode: (id: string) => (id === 'a' ? a : b),
    } as unknown as Query;
    const result = buildSchemasAndValidity(cyclic);
    expect(result.validity.get('a')).toEqual([ERR_SCHEMAS]);
    expect(result.validity.get('b')).toEqual([ERR_SCHEMAS]);
    expect(result.schemas.get('a')).toBeUndefined();
  });

  test('Each error predicate recognizes exactly one sentinel', () => {
    const messages = [ERR_INCOMPLETE, ERR_SCHEMAS, ERR_OTHER, 'Own error.'];
    expect(messages.filter(isSchemasError)).toEqual([ERR_SCHEMAS]);
    expect(messages.filter(isIncompleteError)).toEqual([ERR_INCOMPLETE]);
  });
});

describe(unitTest('Query rules, more cases'), () => {
  const onDatabase = (id: string, database: string): RelationalTableSource =>
    resolvedTable(id, id.toUpperCase(), [column('ID')], database);

  test('Sources on one database are all valid', () => {
    const query = joinChain();
    const result = buildSchemasAndValidity(
      query,
      createNodeRegistry().queryRules,
    );
    query.nodes.forEach((node) =>
      expect(result.validity.get(node.id)).toEqual([]),
    );
    expect(query.validate(result.validity)).toBe(true);
  });

  test('Flags only the sources on another database than the first source', () => {
    const query = new Query(
      [
        onDatabase('a', 'db::A'),
        onDatabase('b', 'db::A'),
        onDatabase('c', 'db::C'),
      ],
      [],
      'a',
    );
    const result = buildSchemasAndValidity(
      query,
      createNodeRegistry().queryRules,
    );
    expect(result.validity.get('a')).toEqual([]);
    expect(result.validity.get('b')).toEqual([]);
    expect(result.validity.get('c')).toEqual([
      MESSAGE_DIFFERENT_DATABASES('db::C', 'db::A'),
    ]);
  });

  test('Counts every source, connected or not, in node order', () => {
    const query = new Query(
      [onDatabase('a', 'db::A'), onDatabase('b', 'db::B')],
      [],
      'b',
    );
    const result = buildSchemasAndValidity(
      query,
      createNodeRegistry().queryRules,
    );
    expect(result.validity.get('a')).toEqual([]);
    expect(result.validity.get('b')).toEqual([
      MESSAGE_DIFFERENT_DATABASES('db::B', 'db::A'),
    ]);
  });

  test('Finds nothing with no source or one source', () => {
    expect(relationalSourcesShareDatabase(new Query()).size).toBe(0);
    expect(
      relationalSourcesShareDatabase(
        new Query([onDatabase('a', 'db::A')], [], 'a'),
      ).size,
    ).toBe(0);
  });

  test('A source with a rule error still reports its own problems', () => {
    const query = new Query(
      [
        onDatabase('a', 'db::A'),
        new RelationalTableSource('b', {
          database: 'db::B',
          schema: 'S',
          table: 'U',
        }),
      ],
      [],
      'a',
    );
    const result = buildSchemasAndValidity(
      query,
      createNodeRegistry().queryRules,
    );
    expect(result.validity.get('b')).toEqual([
      MESSAGE_DIFFERENT_DATABASES('db::B', 'db::A'),
      MESSAGE_SOURCE_SCHEMA_UNRESOLVED,
    ]);
  });
});

describe(unitTest('Schema inference, rule and memoisation cases'), () => {
  test('Keeps the errors of every rule for a node, in rule order', () => {
    const query = new Query([new TestUnaryNode('n')], [], 'n');
    const result = buildSchemasAndValidity(query, [
      () => new Map([['n', ['A.']]]),
      () => new Map([['n', ['B.']]]),
    ]);
    expect(result.validity.get('n')).toEqual(['A.', 'B.', ERR_INCOMPLETE]);
  });

  test('Puts rule errors before the upstream sentinel', () => {
    const query = new Query(
      [
        new RelationalTableSource('s', {
          database: 'db::A',
          schema: 'S',
          table: 'T',
        }),
        new TestUnaryNode('n'),
      ],
      [edge('s', 'n')],
      'n',
    );
    const result = buildSchemasAndValidity(query, [
      () => new Map([['n', ['Rule.']]]),
    ]);
    expect(result.validity.get('n')).toEqual(['Rule.', ERR_SCHEMAS]);
    expect(result.schemas.get('n')).toBeUndefined();
  });

  test('Keeps the first source first when a source is replaced', () => {
    const a = resolvedTable('a', 'A', [column('ID')], 'db::A');
    const b = resolvedTable('b', 'B', [column('ID')], 'db::B');
    const query = new Query([a, b], [], 'a').replace(
      resolvedTable('a', 'A', [column('ID')], 'db::A'),
    );
    const result = buildSchemasAndValidity(
      query,
      createNodeRegistry().queryRules,
    );
    expect(result.validity.get('a')).toEqual([]);
    expect(result.validity.get('b')).toEqual([
      MESSAGE_DIFFERENT_DATABASES('db::B', 'db::A'),
    ]);
  });

  test('Validates and schematizes every node once', () => {
    const calls = new Map<string, number>();
    const count = (key: string): void => {
      calls.set(key, (calls.get(key) ?? 0) + 1);
    };
    class CountingNode extends TestUnaryNode {
      override validate(
        inputSchemas: readonly Schema[],
        errors?: string[],
      ): boolean {
        count(`validate:${this.id}`);
        return super.validate(inputSchemas, errors);
      }
      override schematize(inputSchemas: readonly Schema[]): Schema | undefined {
        count(`schematize:${this.id}`);
        return super.schematize(inputSchemas);
      }
    }
    const query = new Query(
      [
        ORDERS,
        new CountingNode('c1'),
        new CountingNode('c2'),
        new CountingNode('c3'),
      ],
      [edge('orders', 'c1'), edge('c1', 'c2'), edge('c2', 'c3')],
      'c3',
    );
    buildSchemasAndValidity(query);
    expect(Object.fromEntries(calls)).toEqual({
      'validate:c1': 1,
      'schematize:c1': 1,
      'validate:c2': 1,
      'schematize:c2': 1,
      'validate:c3': 1,
      'schematize:c3': 1,
    });
  });
});
