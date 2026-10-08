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
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describeDocument } from '../../__test-utils__/CubeSpecTestUtils.js';
import { column, resolvedTable } from '../../__test-utils__/CubeTestNodes.js';
import { unitTest } from '../../__test-utils__/CubeTestUtils.js';
import { FilterOperator } from '../../filter/FilterOperator.js';
import {
  ColumnComparisonFilter,
  CompositeFilter,
  NotFilter,
  UnsupportedFilter,
} from '../../filter/FilterTree.js';
import { Connection } from '../../graph/Connection.js';
import { CubeDocument } from '../../graph/CubeDocument.js';
import { Query } from '../../graph/Query.js';
import { UNRESOLVED } from '../../graph/QueryNode.js';
import { buildSchemasAndValidity } from '../../inference/SchemaInference.js';
import { QueryEmitter } from '../../ir/QueryEmitter.js';
import {
  createNodeRegistry,
  FILTER_DEFINITION,
  JOIN_DEFINITION,
  NodeRegistry,
  RELATIONAL_TABLE_SOURCE_DEFINITION,
} from '../../nodes/NodeRegistry.js';
import { RelationalTableSource } from '../../nodes/sources/RelationalTableSource.js';
import { Filter } from '../../nodes/transforms/Filter.js';
import { Join, JoinType } from '../../nodes/transforms/Join.js';
import { Drop } from '../../nodes/transforms/Drop.js';
import { Limit } from '../../nodes/transforms/Limit.js';
import { UnknownNode } from '../../nodes/UnknownNode.js';
import { Schema } from '../../schema/Schema.js';
import type { JsonObject, JsonValue } from '../../utils/Json.js';
import {
  decodeCubeSpec,
  encodeCubeSpec,
  parseCubeSpec,
} from '../CubeSpecCodec.js';

// PLAN §10.3, "Settled in M1.6": what a reader can't understand degrades to
// the smallest part and is re-saved as it was (R86, R100, R102-R114)

const UNSUPPORTED_MESSAGE = 'This filter is not supported yet.';
const UNSUPPORTED_DESCRIPTION = '(unsupported filter)';

/** A value users typed, which must never show in a description */
const SECRET = 'swordfish-4711';
const SECRET_NUMBER = 47114711;

const COORDINATES = {
  database: 'test::Northwind',
  schema: 'NORTHWIND',
  table: 'ORDERS',
};

const RELATIONAL = {
  kind: 'relational',
  id: 'relational101',
  database: 'test::Northwind',
  schema: 'NORTHWIND',
  table: 'ORDERS',
  schemaSnapshot: [
    { name: 'COUNTRY', type: { path: 'String' }, nullable: true },
    { name: 'QTY', type: { path: 'Integer' }, nullable: false },
    { name: 'ACTIVE', type: { path: 'Boolean' }, nullable: false },
  ],
};

const RELATIONAL_2 = {
  kind: 'relational',
  id: 'relational102',
  database: 'test::Northwind',
  schema: 'NORTHWIND',
  table: 'CUSTOMERS',
  schemaSnapshot: [
    { name: 'CODE', type: { path: 'String' }, nullable: false },
    { name: 'CITY', type: { path: 'String' }, nullable: true },
  ],
};

const COUNTRY_IS_FRANCE = {
  column: 'COUNTRY',
  operator: 'Equal',
  value: { kind: 'string', value: 'France' },
};

const QTY_IN = {
  column: 'QTY',
  operator: 'In',
  value: [
    { kind: 'integer', value: '1' },
    { kind: 'integer', value: '2' },
  ],
};

const QTY_OVER_5 = {
  column: 'QTY',
  operator: 'GreaterThan',
  value: { kind: 'integer', value: '5' },
};

/** A saved spec: a resolved table feeding `filter101`, which has this filter */
const filterSpec = (filter: JsonValue): JsonObject => ({
  formatVersion: 1,
  query: {
    selected: 'filter101',
    nodes: [
      RELATIONAL,
      {
        kind: 'filter',
        id: 'filter101',
        inputs: ['relational101'],
        filter,
      },
    ],
  },
});

/** The spec text after a decode and an encode */
const reSave = (json: unknown): string =>
  JSON.stringify(encodeCubeSpec(decodeCubeSpec(json).document));

/** The saved node with this id */
const savedNode = (spec: JsonObject, id: string): JsonValue | undefined =>
  ((spec.query as JsonObject).nodes as readonly JsonObject[]).find(
    (node) => node.id === id,
  );

const describeConnections = (query: Query): string[] =>
  query.connections
    .map(
      (connection) =>
        `${connection.source} -> ${connection.target}.${connection.port}`,
    )
    .sort();

const readFixture = (file: string): unknown =>
  JSON.parse(readFileSync(resolve(__dirname, 'fixtures', file), 'utf-8'));

interface UnsupportedCase {
  readonly name: string;
  readonly rule: JsonValue;
  /** What the rule holds that a description must never show */
  readonly secret: string;
}

// each rule is unreadable at its own level, and nowhere above or beside it
const UNSUPPORTED_CASES: readonly UnsupportedCase[] = [
  {
    name: 'a group with an unknown op',
    rule: {
      op: 'xor',
      rules: [
        COUNTRY_IS_FRANCE,
        {
          column: 'COUNTRY',
          operator: 'Equal',
          value: { kind: 'string', value: SECRET },
        },
      ],
    },
    secret: SECRET,
  },
  {
    // keys out of the canonical order: re-saved as read, not re-encoded
    name: 'a comparison with an unknown operator',
    rule: {
      operator: 'Between',
      column: 'COUNTRY',
      value: [
        { kind: 'string', value: 'A' },
        { kind: 'string', value: SECRET },
      ],
    },
    secret: SECRET,
  },
  {
    name: 'a comparison without an operator',
    rule: { column: 'COUNTRY', value: { kind: 'string', value: SECRET } },
    secret: SECRET,
  },
  {
    name: 'a comparison without a column',
    rule: { operator: 'Equal', value: { kind: 'string', value: SECRET } },
    secret: SECRET,
  },
  {
    name: 'a comparison whose column is not a string',
    rule: {
      column: 4711,
      operator: 'Equal',
      value: { kind: 'string', value: SECRET },
    },
    secret: SECRET,
  },
  {
    name: 'a value of an unknown kind',
    rule: {
      column: 'COUNTRY',
      operator: 'Equal',
      value: { kind: 'money', value: SECRET },
    },
    secret: SECRET,
  },
  {
    name: 'a value that is a JSON number',
    rule: {
      column: 'QTY',
      operator: 'Equal',
      value: { kind: 'integer', value: SECRET_NUMBER },
    },
    secret: String(SECRET_NUMBER),
  },
  {
    name: 'a boolean value given as a string',
    rule: {
      column: 'ACTIVE',
      operator: 'Equal',
      value: { kind: 'boolean', value: 'true' },
    },
    secret: 'true',
  },
  {
    name: 'an invalid item without text',
    rule: {
      column: 'COUNTRY',
      operator: 'In',
      value: [{ kind: 'string', value: SECRET }, { kind: 'invalid' }],
    },
    secret: SECRET,
  },
  {
    name: 'an extra key on a comparison',
    rule: {
      column: 'COUNTRY',
      operator: 'Equal',
      value: { kind: 'string', value: SECRET },
      caseInsensitive: true,
    },
    secret: SECRET,
  },
  {
    name: 'an extra key on a group',
    rule: {
      op: 'or',
      rules: [
        COUNTRY_IS_FRANCE,
        {
          column: 'COUNTRY',
          operator: 'Equal',
          value: { kind: 'string', value: SECRET },
        },
      ],
      label: 'Europe',
    },
    secret: SECRET,
  },
  {
    name: 'an extra key on a not',
    rule: {
      op: 'not',
      rule: {
        column: 'COUNTRY',
        operator: 'StartsWith',
        value: { kind: 'string', value: SECRET },
      },
      reason: null,
    },
    secret: SECRET,
  },
  {
    name: 'an extra key on a literal value',
    rule: {
      column: 'COUNTRY',
      operator: 'Equal',
      value: { kind: 'string', value: SECRET, caseInsensitive: true },
    },
    secret: SECRET,
  },
  {
    name: 'an extra key on an invalid value',
    rule: {
      column: 'QTY',
      operator: 'Equal',
      value: { kind: 'invalid', text: SECRET, reason: 'not a number' },
    },
    secret: SECRET,
  },
  {
    // R100: only kind 'invalid' carries text, so this is not an invalid value
    name: 'a literal value with text instead of value',
    rule: {
      column: 'COUNTRY',
      operator: 'Equal',
      value: { kind: 'string', text: SECRET },
    },
    secret: SECRET,
  },
  {
    name: 'a group whose rules is not a list',
    rule: {
      op: 'and',
      rules: {
        first: {
          column: 'COUNTRY',
          operator: 'Equal',
          value: { kind: 'string', value: SECRET },
        },
      },
    },
    secret: SECRET,
  },
  {
    name: 'a not without a rule',
    rule: { op: 'not' },
    secret: '{"op":"not"}',
  },
  {
    // the secret is in a good item: the whole comparison is kept as saved
    name: 'an In list with one bad item',
    rule: {
      column: 'COUNTRY',
      operator: 'In',
      value: [
        { kind: 'string', value: SECRET },
        { kind: 'string', value: 7 },
        { kind: 'string', value: 'Spain' },
      ],
    },
    secret: SECRET,
  },
  // R86: a null where a rule or a value should be is unreadable too, never a
  // decode error
  {
    // in a group beside readable rules, and as the rule of a not
    name: 'a rule that is null',
    rule: null,
    secret: 'null',
  },
  {
    name: 'a comparison whose value is null',
    rule: { column: 'COUNTRY', operator: 'Equal', value: null },
    secret: '"value":null',
  },
  {
    name: 'an In list with a null item',
    rule: {
      column: 'COUNTRY',
      operator: 'In',
      value: [{ kind: 'string', value: SECRET }, null],
    },
    secret: SECRET,
  },
];

describe(unitTest('Saved spec: unsupported filter rules'), () => {
  test.each(UNSUPPORTED_CASES)(
    'Keeps $name as an unsupported rule beside readable ones',
    ({ rule, secret }) => {
      // the case itself holds what it checks for
      expect(JSON.stringify(rule)).toContain(secret);
      const json = filterSpec({
        op: 'and',
        rules: [COUNTRY_IS_FRANCE, rule, QTY_IN],
      });
      const { document } = decodeCubeSpec(json);
      const node = document.query.getNode('filter101') as Filter;
      expect(node).toBeInstanceOf(Filter);

      // the parent and the siblings are read as usual
      const group = node.filter as CompositeFilter;
      expect(group).toBeInstanceOf(CompositeFilter);
      expect(group.rules.map((rule_) => rule_.kind)).toEqual([
        'comparison',
        'unsupported',
        'comparison',
      ]);
      expect(group.rules[0]?.toString()).toBe('COUNTRY is "France"');

      // the rule keeps its JSON, and is re-saved verbatim at the same place
      const unsupported = group.rules[1] as UnsupportedFilter;
      expect(unsupported).toBeInstanceOf(UnsupportedFilter);
      expect(unsupported.json).toEqual(rule);
      expect(reSave(json)).toBe(JSON.stringify(json));

      // never valid, with the unsupported message only
      const errors: string[] = [];
      expect(unsupported.validate(new Schema([]), errors)).toBe(false);
      expect(errors).toEqual([UNSUPPORTED_MESSAGE]);
      const { validity } = buildSchemasAndValidity(
        document.query,
        createNodeRegistry().queryRules,
      );
      expect(validity.get('relational101')).toEqual([]);
      expect(validity.get('filter101')).toEqual([UNSUPPORTED_MESSAGE]);
      const emitter = new QueryEmitter(document.query);
      expect(emitter.canEmit('relational101')).toBe(true);
      expect(emitter.canEmit('filter101')).toBe(false);

      // descriptions never show the JSON
      expect(unsupported.toString()).toBe(UNSUPPORTED_DESCRIPTION);
      expect(unsupported.toRedactedString()).toBe(UNSUPPORTED_DESCRIPTION);
      [
        group.toString(),
        group.toRedactedString(),
        node.describe(),
        node.describeRedacted(),
      ].forEach((text) => {
        expect(text).toContain(UNSUPPORTED_DESCRIPTION);
        expect(text).not.toContain(secret);
        expect(text).not.toContain(JSON.stringify(rule));
      });
    },
  );

  test.each(UNSUPPORTED_CASES)(
    'Keeps the not around $name, with only its rule unsupported',
    ({ rule }) => {
      const json = filterSpec({
        op: 'and',
        rules: [COUNTRY_IS_FRANCE, { op: 'not', rule }],
      });
      const { document } = decodeCubeSpec(json);
      const group = (document.query.getNode('filter101') as Filter)
        .filter as CompositeFilter;
      expect(group).toBeInstanceOf(CompositeFilter);
      const negation = group.rules[1] as NotFilter;
      expect(negation).toBeInstanceOf(NotFilter);
      expect(negation.rule).toBeInstanceOf(UnsupportedFilter);
      expect((negation.rule as UnsupportedFilter).json).toEqual(rule);
      expect(negation.toString()).toBe(`not (${UNSUPPORTED_DESCRIPTION})`);
      expect(reSave(json)).toBe(JSON.stringify(json));
    },
  );

  test.each([
    ['a string', SECRET],
    ['a number', SECRET_NUMBER],
  ])('Keeps a filter that is %s as an unsupported root', (_, filter) => {
    const json = filterSpec(filter);
    const { document } = decodeCubeSpec(json);
    const node = document.query.getNode('filter101') as Filter;
    // the node is still a filter: only its rule is unreadable
    expect(node).toBeInstanceOf(Filter);
    expect(node.filter).toBeInstanceOf(UnsupportedFilter);
    expect((node.filter as UnsupportedFilter).json).toBe(filter);
    expect(reSave(json)).toBe(JSON.stringify(json));

    expect(node.describe()).toBe(`Filter by ${UNSUPPORTED_DESCRIPTION}`);
    expect(node.describeRedacted()).toBe(
      `Filter by ${UNSUPPORTED_DESCRIPTION}`,
    );
    expect(node.describe()).not.toContain(String(filter));
    const errors: string[] = [];
    expect(node.validate([new Schema([column('QTY')])], errors)).toBe(false);
    expect(errors).toEqual([UNSUPPORTED_MESSAGE]);
    expect(
      buildSchemasAndValidity(document.query).validity.get('filter101'),
    ).toEqual([UNSUPPORTED_MESSAGE]);
    expect(new QueryEmitter(document.query).canEmit('filter101')).toBe(false);
  });

  test('Reads the unsupported rule back as it saved it', () => {
    const json = filterSpec({
      op: 'or',
      rules: [QTY_OVER_5, { op: 'xor', rules: [COUNTRY_IS_FRANCE] }],
    });
    const { document } = decodeCubeSpec(json);
    const again = decodeCubeSpec(encodeCubeSpec(document)).document;
    expect(describeDocument(again)).toEqual(describeDocument(document));
  });
});

describe(unitTest('Saved spec: unknown nodes'), () => {
  test('Keeps a node of an unregistered kind with all its fields, and re-saves it verbatim', () => {
    const json = {
      formatVersion: 1,
      query: {
        selected: 'pivot101',
        nodes: [
          RELATIONAL,
          {
            kind: 'pivot',
            id: 'pivot101',
            inputs: ['relational101'],
            rows: ['COUNTRY'],
            values: [
              {
                column: 'QTY',
                aggregation: 'sum',
                options: { nulls: null, labels: ['Total', null] },
              },
            ],
            sort: null,
            zeta: { nested: { deeper: [1, 'two', null, { flag: false }] } },
            alpha: true,
          },
        ],
      },
    };
    const { document } = decodeCubeSpec(json);
    const node = document.query.getNode('pivot101') as UnknownNode;
    expect(node).toBeInstanceOf(UnknownNode);
    expect(node.type).toBe('unknown');
    expect(node.savedKind).toBe('pivot');
    expect(node.describe()).toBe('Unknown Transform "pivot101"');
    expect(node.ports).toEqual(['in0']);
    expect(node.hasInputs).toBe(true);
    expect(describeConnections(document.query)).toEqual([
      'relational101 -> pivot101.in0',
    ]);
    // `kind` included; `id` and `inputs` come from the query
    expect(JSON.stringify(node.json)).toBe(
      JSON.stringify({
        kind: 'pivot',
        rows: ['COUNTRY'],
        values: [
          {
            column: 'QTY',
            aggregation: 'sum',
            options: { nulls: null, labels: ['Total', null] },
          },
        ],
        sort: null,
        zeta: { nested: { deeper: [1, 'two', null, { flag: false }] } },
        alpha: true,
      }),
    );
    expect(reSave(json)).toBe(JSON.stringify(json));

    // and through any number of round trips
    let saved: unknown = json;
    for (let round = 0; round < 3; round += 1) {
      saved = encodeCubeSpec(decodeCubeSpec(saved).document);
    }
    expect(JSON.stringify(saved)).toBe(JSON.stringify(json));
  });

  test('Keeps a node of kind unknown as an Unknown node', () => {
    const json = {
      formatVersion: 1,
      query: {
        selected: 'unknown101',
        nodes: [
          RELATIONAL,
          {
            kind: 'unknown',
            id: 'unknown101',
            inputs: ['relational101'],
            payload: { mode: 'raw', limits: [10, null] },
          },
        ],
      },
    };
    const { document } = decodeCubeSpec(json);
    const node = document.query.getNode('unknown101') as UnknownNode;
    expect(node).toBeInstanceOf(UnknownNode);
    expect(node.savedKind).toBe('unknown');
    expect(node.json).toEqual({
      kind: 'unknown',
      payload: { mode: 'raw', limits: [10, null] },
    });
    expect(reSave(json)).toBe(JSON.stringify(json));
  });

  const CROSS_JOIN_SPEC = {
    formatVersion: 1,
    query: {
      selected: 'join101',
      nodes: [
        RELATIONAL,
        RELATIONAL_2,
        {
          kind: 'join',
          id: 'join101',
          inputs: ['relational101', 'relational102'],
          joinType: 'CROSS',
          leftColumns: ['COUNTRY'],
          rightColumns: ['CODE'],
          hint: { broadcast: 'right', retries: null },
        },
      ],
    },
  };

  test('Keeps a join of an unknown join type as an Unknown node of kind join', () => {
    const { document } = decodeCubeSpec(CROSS_JOIN_SPEC);
    const node = document.query.getNode('join101') as UnknownNode;
    expect(node).toBeInstanceOf(UnknownNode);
    expect(node.savedKind).toBe('join');
    expect(JSON.stringify(node.json)).toBe(
      JSON.stringify({
        kind: 'join',
        joinType: 'CROSS',
        leftColumns: ['COUNTRY'],
        rightColumns: ['CODE'],
        hint: { broadcast: 'right', retries: null },
      }),
    );
    expect(node.ports).toEqual(['in0', 'in1']);
    expect(describeConnections(document.query)).toEqual([
      'relational101 -> join101.in0',
      'relational102 -> join101.in1',
    ]);
    // written back with kind 'join' and its own fields
    expect(reSave(CROSS_JOIN_SPEC)).toBe(JSON.stringify(CROSS_JOIN_SPEC));

    // it is invalid and can't run, but the rest of the query can
    const { validity } = buildSchemasAndValidity(
      document.query,
      createNodeRegistry().queryRules,
    );
    // an Unknown node gives no reason, so it shows the generic error
    expect(validity.get('join101')).toEqual(['This graph node is invalid.']);
    expect(validity.get('relational101')).toEqual([]);
    const emitter = new QueryEmitter(document.query);
    expect(emitter.canEmit('join101')).toBe(false);
    expect(emitter.canEmit('relational102')).toBe(true);
  });

  test("Doesn't swap the inputs of an Unknown node, even with both fed", () => {
    const { query } = decodeCubeSpec(CROSS_JOIN_SPEC).document;
    expect(query.getInputIds('join101')).toEqual([
      'relational101',
      'relational102',
    ]);
    expect(query.canSwapInputs('join101')).toBe(false);
    expect(() => query.swapInputs('join101')).toThrow(
      `Can't swap the inputs of node "join101"`,
    );
  });

  test("Doesn't reuse the id of an Unknown node saved as a join", () => {
    const { query } = decodeCubeSpec(CROSS_JOIN_SPEC).document;
    expect(query.nodes.some((node) => node.type === Join.TYPE)).toBe(false);
    const id = query.generateId(Join.TYPE);
    expect(id).not.toBe('join101');
    expect(query.getNode(id)).toBeUndefined();
    // the lowest free number, since join101 is taken
    expect(id).toBe('join1');
  });

  const inputsSpec = (node: JsonObject): JsonObject => ({
    formatVersion: 1,
    query: {
      selected: 'relational101',
      nodes: [RELATIONAL, RELATIONAL_2, node],
    },
  });

  test('Gives an Unknown node saved without inputs no ports, and re-saves it without inputs', () => {
    const json = inputsSpec({ kind: 'chart', id: 'chart101', style: 'bar' });
    const { document } = decodeCubeSpec(json);
    const node = document.query.getNode('chart101') as UnknownNode;
    expect(node.ports).toEqual([]);
    expect(node.hasInputs).toBe(false);
    expect(document.query.connections).toEqual([]);
    expect(savedNode(encodeCubeSpec(document), 'chart101')).toEqual({
      kind: 'chart',
      id: 'chart101',
      style: 'bar',
    });
    expect(reSave(json)).toBe(JSON.stringify(json));
  });

  test('Keeps the empty inputs of an Unknown node saved with inputs []', () => {
    const json = inputsSpec({
      kind: 'chart',
      id: 'chart101',
      inputs: [],
      style: 'bar',
    });
    const { document } = decodeCubeSpec(json);
    const node = document.query.getNode('chart101') as UnknownNode;
    expect(node.ports).toEqual([]);
    expect(node.hasInputs).toBe(true);
    expect(reSave(json)).toBe(JSON.stringify(json));
  });

  test('Gives an Unknown node one port per input, connecting only the non-null ones', () => {
    const json = inputsSpec({
      kind: 'union',
      id: 'union101',
      inputs: [null, 'relational101', null, 'relational102'],
      distinct: false,
    });
    const { document } = decodeCubeSpec(json);
    const node = document.query.getNode('union101') as UnknownNode;
    expect(node.ports).toEqual(['in0', 'in1', 'in2', 'in3']);
    expect(document.query.getInputIds('union101')).toEqual([
      undefined,
      'relational101',
      undefined,
      'relational102',
    ]);
    expect(describeConnections(document.query)).toEqual([
      'relational101 -> union101.in1',
      'relational102 -> union101.in3',
    ]);
    expect(reSave(json)).toBe(JSON.stringify(json));
  });

  // PLAN §10.3, Settled in M1.6: a known node whose settings can't be read
  // keeps its inputs, even when their count doesn't fit its kind's ports
  test.each([
    {
      name: 'one input',
      inputs: ['relational101'],
      ports: ['in0'],
      inputIds: ['relational101'],
      connections: ['relational101 -> join101.in0'],
    },
    {
      name: 'three inputs',
      inputs: ['relational101', null, 'relational102'],
      ports: ['in0', 'in1', 'in2'],
      inputIds: ['relational101', undefined, 'relational102'],
      connections: [
        'relational101 -> join101.in0',
        'relational102 -> join101.in2',
      ],
    },
  ])(
    'Keeps a join of an unknown join type saved with $name as an Unknown node with a port per input',
    ({ inputs, ports, inputIds, connections }) => {
      const json = inputsSpec({
        kind: 'join',
        id: 'join101',
        inputs,
        joinType: 'CROSS',
        leftColumns: [],
        rightColumns: [],
      });
      const { document } = decodeCubeSpec(json);
      const node = document.query.getNode('join101') as UnknownNode;
      expect(node).toBeInstanceOf(UnknownNode);
      expect(node.savedKind).toBe('join');
      expect(node.ports).toEqual(ports);
      expect(document.query.getInputIds('join101')).toEqual(inputIds);
      expect(describeConnections(document.query)).toEqual(connections);
      expect(reSave(json)).toBe(JSON.stringify(json));
    },
  );

  test('Keeps a join of an unknown join type saved without inputs as an Unknown node without ports', () => {
    const json = inputsSpec({
      kind: 'join',
      id: 'join101',
      joinType: 'CROSS',
      leftColumns: [],
      rightColumns: [],
    });
    const { document } = decodeCubeSpec(json);
    const node = document.query.getNode('join101') as UnknownNode;
    expect(node).toBeInstanceOf(UnknownNode);
    expect(node.savedKind).toBe('join');
    expect(node.ports).toEqual([]);
    expect(node.hasInputs).toBe(false);
    expect(document.query.connections).toEqual([]);
    expect(reSave(json)).toBe(JSON.stringify(json));
  });

  test('Re-opens a newer cube after its Unknown node lost its input, and refuses to rewire it', () => {
    const json = readFixture('newer-version.cube.json');
    const { document } = decodeCubeSpec(json);
    expect(document.query.getNode('pivot101')).toBeInstanceOf(UnknownNode);
    expect(document.query.getInputIds('pivot101')).toEqual(['filter101']);

    // removing the source first, so the filter has nothing to heal with
    const withoutSource = document.query.remove('relational101');
    expect(withoutSource.getInputIds('filter101')).toEqual([undefined]);
    expect(withoutSource.getInputIds('pivot101')).toEqual(['filter101']);
    const edited = withoutSource.remove('filter101');
    expect(edited.getInputIds('pivot101')).toEqual([undefined]);
    expect(edited.connections).toEqual([]);

    const saved = encodeCubeSpec(document.withQuery(edited));
    expect(JSON.stringify(saved.query)).toBe(
      JSON.stringify({
        selected: 'pivot101',
        nodes: [
          {
            kind: 'pivot',
            id: 'pivot101',
            inputs: [null],
            rows: ['SHIP_CITY'],
            values: [{ column: 'FREIGHT', aggregation: 'sum' }],
          },
        ],
      }),
    );

    // decodes again, as an object and as exported text
    const again = decodeCubeSpec(saved).document;
    expect(
      describeDocument(parseCubeSpec(JSON.stringify(saved)).document),
    ).toEqual(describeDocument(again));
    const pivot = again.query.getNode('pivot101') as UnknownNode;
    expect(pivot).toBeInstanceOf(UnknownNode);
    expect(pivot.savedKind).toBe('pivot');
    expect(pivot.ports).toEqual(['in0']);
    expect(again.query.getInputIds('pivot101')).toEqual([undefined]);
    expect(again.rest).toEqual({
      description: 'A field this version does not know',
    });
    expect(again.meta.rest).toEqual({
      drilldown: { levels: ['SHIP_COUNTRY', 'SHIP_CITY'] },
    });
    expect(JSON.stringify(encodeCubeSpec(again))).toBe(JSON.stringify(saved));

    // its port stays empty: nothing can be wired into it
    const query = again.query.add(
      resolvedTable('relational102', 'ORDERS', [column('ORDER_ID')]),
    );
    expect(query.canConnect('relational102', 'pivot101')).toBe(false);
    expect(query.canConnect('relational102', 'pivot101', 'in0')).toBe(false);
    expect(() => query.connect('relational102', 'pivot101')).toThrow(
      `Can't connect node "relational102" to node "pivot101"`,
    );
    expect(() => query.connect('relational102', 'pivot101', 'in0')).toThrow(
      `Can't connect node "relational102" to node "pivot101" on port "in0"`,
    );
    expect(query.canMove('pivot101', 'relational102')).toBe(false);
    expect(query.canSwapInputs('pivot101')).toBe(false);
    expect(() => query.swapInputs('pivot101')).toThrow(
      `Can't swap the inputs of node "pivot101"`,
    );
  });

  test('Keeps ids as saved, and continues each type from the highest one', () => {
    const json = {
      formatVersion: 1,
      query: {
        selected: 'filter105',
        nodes: [
          RELATIONAL,
          {
            kind: 'filter',
            id: 'filter101',
            inputs: ['relational101'],
            filter: COUNTRY_IS_FRANCE,
          },
          {
            kind: 'filter',
            id: 'myFilter',
            inputs: ['filter101'],
            filter: QTY_OVER_5,
          },
          { kind: 'filter', id: 'filter105', inputs: ['myFilter'] },
        ],
      },
    };
    const { query } = decodeCubeSpec(json).document;
    expect(query.nodes.map((node) => node.id)).toEqual([
      'relational101',
      'filter101',
      'myFilter',
      'filter105',
    ]);
    expect(query.getNode('myFilter')).toBeInstanceOf(Filter);
    expect(query.generateId(Filter.TYPE)).toBe('filter106');
    expect(query.generateId(RelationalTableSource.TYPE)).toBe('relational102');
    expect(reSave(json)).toBe(JSON.stringify(json));
  });

  // an Unknown node's `id` and `inputs` are regenerated from the query (R104),
  // even when its JSON was built with those keys
  test('Writes the id and inputs of an Unknown node from the query, never from its JSON', () => {
    const document = new CubeDocument({
      query: new Query(
        [
          resolvedTable('relational101', 'ORDERS', [column('QTY')]),
          new UnknownNode('pivot101', 1, {
            kind: 'pivot',
            id: 'stale',
            inputs: ['gone'],
            rows: ['QTY'],
          }),
        ],
        [new Connection('relational101', 'pivot101', 'in0')],
        'pivot101',
      ),
    });
    // by position: the id written may not be the node's
    const saved = (encodeCubeSpec(document).query as JsonObject)
      .nodes as readonly JsonValue[];
    expect(JSON.stringify(saved[1])).toBe(
      JSON.stringify({
        kind: 'pivot',
        id: 'pivot101',
        inputs: ['relational101'],
        rows: ['QTY'],
      }),
    );
  });
});

// every unknown key moves after the known keys of its object, in the order read
const INTERLEAVED = {
  zetaTop: 'z',
  formatVersion: 1,
  name: 'Unknown keys',
  alphaTop: { nested: [1, null] },
  context: {
    zetaContext: 1,
    // kept whole, in the order read (PLAN §6.2.2)
    model: {
      zetaModel: 'z',
      _type: 'text',
      alphaModel: null,
      code: '###Relational',
    },
    runtime: 'test::Runtime',
    alphaContext: [true],
  },
  query: {
    zetaQuery: 'z',
    nodes: [
      {
        kind: 'relational',
        zetaNode: 1,
        id: 'relational101',
        database: 'test::Northwind',
        schema: 'NORTHWIND',
        table: 'ORDERS',
        schemaSnapshot: [
          {
            zetaColumn: 'z',
            name: 'COUNTRY',
            type: {
              zetaType: 'z',
              path: 'meta::pure::precisePrimitives::Varchar',
              alphaType: null,
              params: [15],
            },
            nullable: true,
            alphaColumn: { list: [1] },
          },
          { name: 'QTY', type: { path: 'Integer' }, nullable: false },
          {
            name: 'STATUS',
            type: {
              zetaEnum: 'z',
              path: 'my::Status',
              values: ['OPEN', 'SHUT'],
              alphaEnum: null,
            },
            nullable: false,
          },
        ],
        alphaNode: null,
      },
      RELATIONAL_2,
      {
        kind: 'join',
        id: 'join101',
        zetaJoin: 'z',
        inputs: ['relational101', 'relational102'],
        joinType: 'INNER',
        leftColumns: ['COUNTRY'],
        rightColumns: ['CODE'],
        alphaJoin: [null],
      },
      {
        kind: 'filter',
        id: 'filter101',
        inputs: ['join101'],
        zetaFilter: { level: 1 },
        filter: COUNTRY_IS_FRANCE,
        alphaFilter: false,
      },
    ],
    selected: 'filter101',
    alphaQuery: 2,
  },
  meta: {
    zetaMeta: 'z',
    presentation: {
      zetaPresentation: 'z',
      columnWidths: [
        { zetaWidth: 'z', width: 120, column: 'COUNTRY', alphaWidth: null },
      ],
      showGraph: false,
      alphaPresentation: {},
    },
    drilldown: { levels: ['COUNTRY'] },
  },
};

const CANONICAL = {
  formatVersion: 1,
  name: 'Unknown keys',
  context: {
    model: {
      zetaModel: 'z',
      _type: 'text',
      alphaModel: null,
      code: '###Relational',
    },
    runtime: 'test::Runtime',
    zetaContext: 1,
    alphaContext: [true],
  },
  query: {
    selected: 'filter101',
    nodes: [
      {
        kind: 'relational',
        id: 'relational101',
        database: 'test::Northwind',
        schema: 'NORTHWIND',
        table: 'ORDERS',
        schemaSnapshot: [
          {
            name: 'COUNTRY',
            type: {
              path: 'meta::pure::precisePrimitives::Varchar',
              params: [15],
              zetaType: 'z',
              alphaType: null,
            },
            nullable: true,
            zetaColumn: 'z',
            alphaColumn: { list: [1] },
          },
          { name: 'QTY', type: { path: 'Integer' }, nullable: false },
          {
            name: 'STATUS',
            // an enumeration type too: after its path and values
            type: {
              path: 'my::Status',
              values: ['OPEN', 'SHUT'],
              zetaEnum: 'z',
              alphaEnum: null,
            },
            nullable: false,
          },
        ],
        zetaNode: 1,
        alphaNode: null,
      },
      RELATIONAL_2,
      {
        kind: 'join',
        id: 'join101',
        inputs: ['relational101', 'relational102'],
        joinType: 'INNER',
        leftColumns: ['COUNTRY'],
        rightColumns: ['CODE'],
        zetaJoin: 'z',
        alphaJoin: [null],
      },
      {
        kind: 'filter',
        id: 'filter101',
        inputs: ['join101'],
        filter: COUNTRY_IS_FRANCE,
        zetaFilter: { level: 1 },
        alphaFilter: false,
      },
    ],
    zetaQuery: 'z',
    alphaQuery: 2,
  },
  meta: {
    presentation: {
      showGraph: false,
      columnWidths: [
        { column: 'COUNTRY', width: 120, zetaWidth: 'z', alphaWidth: null },
      ],
      zetaPresentation: 'z',
      alphaPresentation: {},
    },
    zetaMeta: 'z',
    drilldown: { levels: ['COUNTRY'] },
  },
  zetaTop: 'z',
  alphaTop: { nested: [1, null] },
};

describe(unitTest('Saved spec: unknown keys'), () => {
  test('Keeps the unknown keys of every object on decode', () => {
    const { document } = decodeCubeSpec(INTERLEAVED);
    const { query, context, meta } = document;
    expect(document.rest).toEqual({
      zetaTop: 'z',
      alphaTop: { nested: [1, null] },
    });
    expect(context?.rest).toEqual({ zetaContext: 1, alphaContext: [true] });
    expect(context?.model).toStrictEqual({
      zetaModel: 'z',
      _type: 'text',
      alphaModel: null,
      code: '###Relational',
    });
    expect(document.queryRest).toEqual({ zetaQuery: 'z', alphaQuery: 2 });

    const source = query.getNode('relational101') as RelationalTableSource;
    expect(source.rest).toEqual({ zetaNode: 1, alphaNode: null });
    expect([...source.columnRest.entries()]).toEqual([
      [
        'COUNTRY',
        {
          column: { zetaColumn: 'z', alphaColumn: { list: [1] } },
          type: { zetaType: 'z', alphaType: null },
        },
      ],
      ['STATUS', { column: {}, type: { zetaEnum: 'z', alphaEnum: null } }],
    ]);
    expect(query.getNode('join101')?.rest).toEqual({
      zetaJoin: 'z',
      alphaJoin: [null],
    });
    expect(query.getNode('filter101')?.rest).toEqual({
      zetaFilter: { level: 1 },
      alphaFilter: false,
    });

    expect(meta.rest).toEqual({
      zetaMeta: 'z',
      drilldown: { levels: ['COUNTRY'] },
    });
    expect(meta.presentation.rest).toEqual({
      zetaPresentation: 'z',
      alphaPresentation: {},
    });
    expect(meta.presentation.columnWidths).toEqual([
      {
        column: 'COUNTRY',
        width: 120,
        rest: { zetaWidth: 'z', alphaWidth: null },
      },
    ]);
  });

  test('Writes unknown keys after the known keys of their object, in the order read', () => {
    expect(reSave(INTERLEAVED)).toBe(JSON.stringify(CANONICAL));
    // and once in that order, it stays
    expect(reSave(CANONICAL)).toBe(JSON.stringify(CANONICAL));
    expect(reSave(JSON.parse(reSave(INTERLEAVED)))).toBe(
      JSON.stringify(CANONICAL),
    );
  });

  test('Keeps a model of any kind whole, as a frozen copy', () => {
    // PLAN §6.2.2: only the host reads the model, so a kind Cube can't run
    // still opens and is re-saved exactly
    const model = {
      _type: 'composite',
      zeta: 'z',
      nested: { list: [1, { flag: null }] },
      alpha: null,
    };
    const json = { formatVersion: 1, context: { model }, query: { nodes: [] } };
    const read = decodeCubeSpec(json).document.context?.model;
    expect(read).toStrictEqual(model);
    // a deep copy, frozen all the way down, and the input left as it was
    expect(read).not.toBe(model);
    expect(read?.nested).not.toBe(model.nested);
    expect(Object.isFrozen(read)).toBe(true);
    expect(Object.isFrozen((read?.nested as JsonObject).list)).toBe(true);
    expect(
      Object.isFrozen(((read?.nested as JsonObject).list as JsonValue[])[1]),
    ).toBe(true);
    expect(Object.isFrozen(model.nested)).toBe(false);
    expect(reSave(json)).toBe(JSON.stringify(json));
  });

  test('Keeps a model key named __proto__', () => {
    // JSON.parse makes it an own key, which a copy must not turn into a prototype
    const text =
      '{"formatVersion":1,"context":{"model":{"_type":"text","__proto__":{"a":1},"code":"x"}},"query":{"nodes":[]}}';
    expect(JSON.stringify(encodeCubeSpec(parseCubeSpec(text).document))).toBe(
      text,
    );
  });

  test('Keeps nested objects, arrays and nulls in unknown keys exactly', () => {
    const json = {
      formatVersion: 1,
      query: {
        selected: 'relational101',
        nodes: [
          {
            ...RELATIONAL,
            lineage: {
              steps: [{ from: null, to: ['a', { b: [] }] }],
              empty: {},
            },
          },
        ],
      },
      nested: { level: { deeper: { list: [1, { flag: null }] } } },
      list: [1, 'two', null, [3, [4]], { five: 5 }, true],
      nothing: null,
    };
    const { document } = decodeCubeSpec(json);
    expect(document.rest).toEqual({
      nested: { level: { deeper: { list: [1, { flag: null }] } } },
      list: [1, 'two', null, [3, [4]], { five: 5 }, true],
      nothing: null,
    });
    expect(document.query.getNode('relational101')?.rest).toEqual({
      lineage: { steps: [{ from: null, to: ['a', { b: [] }] }], empty: {} },
    });
    expect(reSave(json)).toBe(JSON.stringify(json));
  });

  test('Never writes an unknown key over a known one', () => {
    const document = new CubeDocument({
      name: 'Real name',
      context: {
        model: { _type: 'text', code: '###Relational' },
        runtime: 'test::Runtime',
        rest: { model: 'fake', runtime: 'fake', extraContext: 2 },
      },
      query: new Query(
        [
          new RelationalTableSource('relational101', COORDINATES, UNRESOLVED, {
            kind: 'fake',
            id: 'fake',
            inputs: ['fake'],
            database: 'fake',
            schema: 'fake',
            table: 'fake',
            schemaSnapshot: [],
            extraRelational: 3,
          }),
          new RelationalTableSource('relational102', {
            ...COORDINATES,
            table: 'CUSTOMERS',
          }),
          new Join(
            'join101',
            {
              joinType: JoinType.INNER,
              leftColumns: ['COUNTRY'],
              rightColumns: ['CODE'],
            },
            {
              kind: 'fake',
              id: 'fake',
              inputs: [],
              joinType: 'CROSS',
              leftColumns: 'fake',
              rightColumns: 'fake',
              extraJoin: 4,
            },
          ),
          new Filter('filter101', undefined, {
            kind: 'fake',
            filter: 'fake',
            extraFilter: 5,
          }),
          new Filter(
            'filter102',
            new ColumnComparisonFilter('COUNTRY', FilterOperator.EQUAL, {
              kind: 'string',
              value: 'France',
            }),
            { inputs: ['fake'], filter: 'fake', extraFilter: 6 },
          ),
        ],
        [
          new Connection('relational101', 'join101', 'leftTds'),
          new Connection('relational102', 'join101', 'rightTds'),
          new Connection('join101', 'filter101', 'tds'),
          new Connection('filter101', 'filter102', 'tds'),
        ],
        'filter102',
      ),
      queryRest: { selected: 'fake', nodes: [], extraQuery: 7 },
      meta: {
        presentation: {
          showGraph: false,
          columnWidths: [
            {
              column: 'COUNTRY',
              width: 120,
              rest: { column: 'fake', width: 1, extraWidth: 8 },
            },
          ],
          rest: { showGraph: true, columnWidths: [], extraPresentation: 9 },
        },
        rest: { presentation: 'fake', extraMeta: 10 },
      },
      rest: {
        formatVersion: 99,
        name: 'fake',
        context: 'fake',
        query: 'fake',
        meta: 'fake',
        extraTop: 11,
      },
    });
    // absent known keys (a snapshot, a filter) stay absent too
    expect(JSON.stringify(encodeCubeSpec(document))).toBe(
      JSON.stringify({
        formatVersion: 1,
        name: 'Real name',
        context: {
          model: { _type: 'text', code: '###Relational' },
          runtime: 'test::Runtime',
          extraContext: 2,
        },
        query: {
          selected: 'filter102',
          nodes: [
            {
              kind: 'relational',
              id: 'relational101',
              database: 'test::Northwind',
              schema: 'NORTHWIND',
              table: 'ORDERS',
              extraRelational: 3,
            },
            {
              kind: 'relational',
              id: 'relational102',
              database: 'test::Northwind',
              schema: 'NORTHWIND',
              table: 'CUSTOMERS',
            },
            {
              kind: 'join',
              id: 'join101',
              inputs: ['relational101', 'relational102'],
              joinType: 'INNER',
              leftColumns: ['COUNTRY'],
              rightColumns: ['CODE'],
              extraJoin: 4,
            },
            {
              kind: 'filter',
              id: 'filter101',
              inputs: ['join101'],
              extraFilter: 5,
            },
            {
              kind: 'filter',
              id: 'filter102',
              inputs: ['filter101'],
              filter: COUNTRY_IS_FRANCE,
              extraFilter: 6,
            },
          ],
          extraQuery: 7,
        },
        meta: {
          presentation: {
            showGraph: false,
            columnWidths: [{ column: 'COUNTRY', width: 120, extraWidth: 8 }],
            extraPresentation: 9,
          },
          extraMeta: 10,
        },
        extraTop: 11,
      }),
    );
  });

  // R114: a column's unknown keys are kept when only the column, or only its
  // type, has some
  test('Keeps the unknown keys of a snapshot column that has them only on the column, or only on its type', () => {
    const json = {
      formatVersion: 1,
      query: {
        selected: 'relational101',
        nodes: [
          {
            kind: 'relational',
            id: 'relational101',
            ...COORDINATES,
            schemaSnapshot: [
              {
                name: 'COUNTRY',
                type: { path: 'String' },
                nullable: true,
                zetaColumn: 'z',
              },
              {
                name: 'QTY',
                type: { path: 'Integer', zetaType: 'z' },
                nullable: false,
              },
              {
                name: 'STATUS',
                type: {
                  path: 'my::Status',
                  values: ['OPEN', 'SHUT'],
                  zetaEnum: null,
                },
                nullable: true,
              },
              { name: 'ACTIVE', type: { path: 'Boolean' }, nullable: false },
            ],
          },
        ],
      },
    };
    const source = decodeCubeSpec(json).document.query.getNode(
      'relational101',
    ) as RelationalTableSource;
    expect([...source.columnRest.entries()]).toStrictEqual([
      ['COUNTRY', { column: { zetaColumn: 'z' }, type: {} }],
      ['QTY', { column: {}, type: { zetaType: 'z' } }],
      ['STATUS', { column: {}, type: { zetaEnum: null } }],
    ]);
    expect(reSave(json)).toBe(JSON.stringify(json));
  });

  // like every other object, a snapshot column and its type never write an
  // unknown key over a known one (R113)
  test('Never writes an unknown key of a snapshot column or its type over a known one', () => {
    const source = new RelationalTableSource(
      'relational101',
      COORDINATES,
      { kind: 'resolved', schema: new Schema([column('QTY')]) },
      undefined,
      new Map([
        [
          'QTY',
          {
            column: {
              name: 'HIJACKED',
              type: 'fake',
              nullable: true,
              extraColumn: 1,
            },
            type: {
              path: 'fake',
              params: [9],
              values: ['fake'],
              extraType: 2,
            },
          },
        ],
      ]),
    );
    const document = new CubeDocument({
      query: new Query([source], [], 'relational101'),
    });
    expect(
      JSON.stringify(savedNode(encodeCubeSpec(document), 'relational101')),
    ).toBe(
      JSON.stringify({
        kind: 'relational',
        id: 'relational101',
        database: 'test::Northwind',
        schema: 'NORTHWIND',
        table: 'ORDERS',
        schemaSnapshot: [
          {
            name: 'QTY',
            type: { path: 'Integer', extraType: 2 },
            nullable: false,
            extraColumn: 1,
          },
        ],
      }),
    );
  });

  // `JSON.parse` makes `__proto__` an own key, which must not set a prototype
  test('Keeps an unknown key named __proto__', () => {
    // only JSON text can hold this key: an object literal sets the prototype
    const text =
      '{"formatVersion":1,"query":{"nodes":[]},"__proto__":{"polluted":true}}';
    expect(reSave(JSON.parse(text))).toBe(text);
  });
});

describe(unitTest('Saved spec: unknown keys through edits'), () => {
  const EDIT_SPEC = {
    formatVersion: 1,
    query: {
      selected: 'filter101',
      nodes: [
        {
          kind: 'relational',
          id: 'relational101',
          database: 'test::Northwind',
          schema: 'NORTHWIND',
          table: 'ORDERS',
          schemaSnapshot: [
            {
              name: 'COUNTRY',
              type: { path: 'String', unit: 'iso-3166' },
              nullable: true,
              note: 'kept',
            },
            { name: 'QTY', type: { path: 'Integer' }, nullable: false },
          ],
          owner: 'ops',
        },
        RELATIONAL_2,
        {
          kind: 'join',
          id: 'join101',
          inputs: ['relational101', 'relational102'],
          joinType: 'LEFT_OUTER',
          leftColumns: ['COUNTRY'],
          rightColumns: ['CODE'],
          hint: { broadcast: 'right' },
        },
        {
          kind: 'filter',
          id: 'filter101',
          inputs: ['join101'],
          filter: COUNTRY_IS_FRANCE,
          comment: 'only France',
        },
      ],
    },
  };

  const decodeEditSpec = (): CubeDocument => decodeCubeSpec(EDIT_SPEC).document;

  const saveNode = (document: CubeDocument, query: Query, id: string): string =>
    JSON.stringify(savedNode(encodeCubeSpec(document.withQuery(query)), id));

  test('Keeps the unknown keys of a join whose settings change', () => {
    const document = decodeEditSpec();
    const join = document.query.getNode('join101') as Join;
    const edited = join.withSettings({ joinType: JoinType.INNER });
    expect(edited.rest).toEqual({ hint: { broadcast: 'right' } });
    expect(saveNode(document, document.query.replace(edited), 'join101')).toBe(
      JSON.stringify({
        kind: 'join',
        id: 'join101',
        inputs: ['relational101', 'relational102'],
        joinType: 'INNER',
        leftColumns: ['COUNTRY'],
        rightColumns: ['CODE'],
        hint: { broadcast: 'right' },
      }),
    );
  });

  test('Keeps the unknown keys of a join whose inputs swap', () => {
    const document = decodeEditSpec();
    const query = document.query.swapInputs('join101');
    expect(query.getNode('join101')?.rest).toEqual({
      hint: { broadcast: 'right' },
    });
    expect(saveNode(document, query, 'join101')).toBe(
      JSON.stringify({
        kind: 'join',
        id: 'join101',
        inputs: ['relational102', 'relational101'],
        joinType: 'LEFT_OUTER',
        leftColumns: ['CODE'],
        rightColumns: ['COUNTRY'],
        hint: { broadcast: 'right' },
      }),
    );
  });

  test('Keeps the unknown keys of a filter whose filter changes', () => {
    const document = decodeEditSpec();
    const filter = document.query.getNode('filter101') as Filter;
    const edited = filter.withFilter(
      new ColumnComparisonFilter('QTY', FilterOperator.GREATER_THAN, {
        kind: 'integer',
        value: '5',
      }),
    );
    expect(edited.rest).toEqual({ comment: 'only France' });
    expect(
      saveNode(document, document.query.replace(edited), 'filter101'),
    ).toBe(
      JSON.stringify({
        kind: 'filter',
        id: 'filter101',
        inputs: ['join101'],
        filter: QTY_OVER_5,
        comment: 'only France',
      }),
    );
    // and when the filter is cleared
    expect(
      saveNode(
        document,
        document.query.replace(filter.withFilter(undefined)),
        'filter101',
      ),
    ).toBe(
      JSON.stringify({
        kind: 'filter',
        id: 'filter101',
        inputs: ['join101'],
        comment: 'only France',
      }),
    );
  });

  test('Keeps the unknown keys of a re-resolved source, and of its columns that still exist', () => {
    const document = decodeEditSpec();
    const source = document.query.getNode(
      'relational101',
    ) as RelationalTableSource;
    const edited = source.withResolution({
      kind: 'resolved',
      schema: new Schema([
        column('COUNTRY', 'Varchar', true, [30]),
        column('CITY', 'String', true),
      ]),
    });
    expect(edited.rest).toEqual({ owner: 'ops' });
    expect(
      saveNode(document, document.query.replace(edited), 'relational101'),
    ).toBe(
      JSON.stringify({
        kind: 'relational',
        id: 'relational101',
        database: 'test::Northwind',
        schema: 'NORTHWIND',
        table: 'ORDERS',
        schemaSnapshot: [
          {
            name: 'COUNTRY',
            type: {
              path: 'meta::pure::precisePrimitives::Varchar',
              params: [30],
              unit: 'iso-3166',
            },
            nullable: true,
            note: 'kept',
          },
          { name: 'CITY', type: { path: 'String' }, nullable: true },
        ],
        owner: 'ops',
      }),
    );
  });

  test("Doesn't write the unknown keys of a column the re-resolved source lost", () => {
    const document = decodeEditSpec();
    const source = document.query.getNode(
      'relational101',
    ) as RelationalTableSource;
    const edited = source.withResolution({
      kind: 'resolved',
      schema: new Schema([column('QTY'), column('CITY', 'String', true)]),
    });
    expect(
      saveNode(document, document.query.replace(edited), 'relational101'),
    ).toBe(
      JSON.stringify({
        kind: 'relational',
        id: 'relational101',
        database: 'test::Northwind',
        schema: 'NORTHWIND',
        table: 'ORDERS',
        schemaSnapshot: [
          { name: 'QTY', type: { path: 'Integer' }, nullable: false },
          { name: 'CITY', type: { path: 'String' }, nullable: true },
        ],
        owner: 'ops',
      }),
    );
    // nor any snapshot once unresolved, but the node's own keys stay
    expect(
      saveNode(
        document,
        document.query.replace(source.withResolution(UNRESOLVED)),
        'relational101',
      ),
    ).toBe(
      JSON.stringify({
        kind: 'relational',
        id: 'relational101',
        database: 'test::Northwind',
        schema: 'NORTHWIND',
        table: 'ORDERS',
        owner: 'ops',
      }),
    );
  });
});

describe(unitTest('Saved spec: operations added since a version'), () => {
  /** The registry of the version before M2: no operation but Filter and Join */
  const M1_REGISTRY = new NodeRegistry([
    RELATIONAL_TABLE_SOURCE_DEFINITION,
    FILTER_DEFINITION,
    JOIN_DEFINITION,
  ]);

  const LIMITED = {
    formatVersion: 1,
    query: {
      selected: 'limit101',
      nodes: [
        RELATIONAL,
        {
          kind: 'drop',
          id: 'drop101',
          inputs: ['relational101'],
          size: 10,
        },
        {
          kind: 'limit',
          id: 'limit101',
          inputs: ['drop101'],
          size: 5,
          note: 'top five',
        },
      ],
    },
  };

  test('Reads M2 operations as Unknown nodes in a version without them, editable, and re-saves them verbatim', () => {
    const { document, readOnly } = decodeCubeSpec(LIMITED, {
      registry: M1_REGISTRY,
    });
    expect(readOnly).toBe(false);
    ['drop101', 'limit101'].forEach((id) => {
      const node = document.query.getNode(id) as UnknownNode;
      expect(node).toBeInstanceOf(UnknownNode);
      expect(node.savedKind).toBe(id.replace('101', ''));
    });
    expect(describeConnections(document.query).sort()).toEqual([
      'drop101 -> limit101.in0',
      'relational101 -> drop101.in0',
    ]);
    expect(JSON.stringify(encodeCubeSpec(document, M1_REGISTRY))).toBe(
      JSON.stringify(LIMITED),
    );
    // a new node would not take a saved node's id
    expect(document.query.generateId('limit')).not.toBe('limit101');
    expect(document.query.generateId('drop')).not.toBe('drop101');
  });

  test('Reads a limit as a Limit in this version, its unknown keys kept', () => {
    const { query } = decodeCubeSpec(LIMITED).document;
    expect(query.getNode('drop101')).toBeInstanceOf(Drop);
    const node = query.getNode('limit101');
    expect(node).toBeInstanceOf(Limit);
    expect((node as Limit).size).toBe(5);
    expect(node?.rest).toEqual({ note: 'top five' });
    expect(reSave(LIMITED)).toBe(JSON.stringify(LIMITED));
  });

  test('Keeps the unknown keys of a limit whose size changes or is cleared', () => {
    const document = decodeCubeSpec(LIMITED).document;
    const limit = document.query.getNode('limit101') as Limit;
    const saved = (edited: Limit): JsonValue | undefined =>
      savedNode(
        encodeCubeSpec(document.withQuery(document.query.replace(edited))),
        'limit101',
      );
    expect(JSON.stringify(saved(limit.withSize(20)))).toBe(
      JSON.stringify({
        kind: 'limit',
        id: 'limit101',
        inputs: ['drop101'],
        size: 20,
        note: 'top five',
      }),
    );
    expect(JSON.stringify(saved(limit.withSize(undefined)))).toBe(
      JSON.stringify({
        kind: 'limit',
        id: 'limit101',
        inputs: ['drop101'],
        note: 'top five',
      }),
    );
  });
});
