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
import { CubeDocument } from '../../graph/CubeDocument.js';
import { FILTER_DEFINITION, NodeRegistry } from '../../nodes/NodeRegistry.js';
import { UnknownNode } from '../../nodes/UnknownNode.js';
import type { JsonObject } from '../../utils/Json.js';
import { FILTER_CODEC } from '../codecs/FilterCodec.js';
import {
  CUBE_SPEC_MIGRATIONS,
  CURRENT_FORMAT_VERSION,
  type CubeSpecMigration,
  decodeCubeSpec,
  encodeCubeSpec,
  getUtf8ByteLength,
  MAX_SPEC_BYTES,
  migrateCubeSpec,
  parseCubeSpec,
  serializeCubeSpec,
} from '../CubeSpecCodec.js';
import { CubeSpecDecodeError } from '../SpecReader.js';

// ---------------------------------------- helpers ----------------------------------------

/** The decode error `read` throws; anything else, or no error, fails the test */
const decodeErrorOf = (read: () => unknown): CubeSpecDecodeError => {
  try {
    read();
  } catch (error) {
    if (error instanceof CubeSpecDecodeError) {
      return error;
    }
    throw error;
  }
  throw new Error('Expected a CubeSpecDecodeError, but the spec was read');
};

/** Where decoding the JSON fails, and why */
const failureOf = (json: unknown): [string, string] => {
  const { path, detail } = decodeErrorOf(() => decodeCubeSpec(json));
  return [path, detail];
};

const DATABASE = 'showcase::northwind::store::NorthwindDatabase';
const RUNTIME = 'showcase::northwind::mapping::StoreRuntime';
const VARCHAR = 'meta::pure::precisePrimitives::Varchar';
const SNAPSHOT = 'query.nodes[0].schemaSnapshot';
const TYPE = 'query.nodes[0].schemaSnapshot[0].type';
const WIDTHS = 'meta.presentation.columnWidths';
const EURO = '€'; // 1 UTF-16 unit, 3 UTF-8 bytes

const RELATIONAL_101 = {
  kind: 'relational',
  id: 'relational101',
  database: DATABASE,
  schema: 'NORTHWIND',
  table: 'ORDERS',
};
const RELATIONAL_102 = { ...RELATIONAL_101, id: 'relational102' };
const FILTER_101 = { kind: 'filter', id: 'filter101', inputs: [null] };
const JOIN_101 = {
  kind: 'join',
  id: 'join101',
  inputs: [null, null],
  joinType: 'INNER',
  leftColumns: ['CUSTOMER_ID'],
  rightColumns: ['CUSTOMER_ID'],
};
const ORDER_ID = {
  name: 'ORDER_ID',
  type: { path: 'Integer' },
  nullable: false,
};
const LOCAL_MODEL = { kind: 'local', id: 'cube-northwind' };
const PROJECT_MODEL = {
  kind: 'project',
  groupId: 'org.finos.legend',
  artifactId: 'northwind',
  versionId: '1.0.0',
};

/** A document whose query has these nodes, and this selected node */
const withNodes = (
  nodes: readonly unknown[],
  selected?: string,
): Record<string, unknown> => ({
  formatVersion: 1,
  query: selected === undefined ? { nodes } : { selected, nodes },
});

/** A document whose one node is this relational source, `relational101` */
const withSource = (node: unknown): Record<string, unknown> =>
  withNodes([node], 'relational101');
const withSnapshot = (schemaSnapshot: unknown): Record<string, unknown> =>
  withSource({ ...RELATIONAL_101, schemaSnapshot });
const withType = (type: unknown): Record<string, unknown> =>
  withSnapshot([{ name: 'REGION', type, nullable: true }]);
/** A document whose one node is this join, `join101` */
const withJoin = (node: unknown): Record<string, unknown> =>
  withNodes([node], 'join101');
const withContext = (context: unknown): Record<string, unknown> => ({
  formatVersion: 1,
  context,
  query: { nodes: [] },
});
const withModel = (model: unknown): Record<string, unknown> =>
  withContext({ model, runtime: RUNTIME });
const withMeta = (meta: unknown): Record<string, unknown> => ({
  formatVersion: 1,
  query: { nodes: [] },
  meta,
});
const withPresentation = (presentation: unknown): Record<string, unknown> =>
  withMeta({ presentation });
const withWidths = (columnWidths: unknown): Record<string, unknown> =>
  withPresentation({ columnWidths });

/** The message `JSON.parse` gives for the text, which differs between Node versions */
const jsonParseMessage = (text: string): string => {
  try {
    JSON.parse(text);
  } catch (error) {
    return (error as Error).message;
  }
  throw new Error(`"${text}" is valid JSON`);
};

// ---------------------------------------- decode errors ----------------------------------------

describe(unitTest('Saved spec decode errors'), () => {
  test.each<[string, unknown]>([
    ['an empty query', { formatVersion: 1, query: { nodes: [] } }],
    ['a relational source', withSource(RELATIONAL_101)],
    ['a source with a snapshot', withSnapshot([ORDER_ID])],
    ['a parameterized type', withType({ path: VARCHAR, params: [15] })],
    ['an enumeration type', withType({ path: 'my::Region', values: ['EMEA'] })],
    ['a join', withJoin(JOIN_101)],
    ['a filter', withNodes([FILTER_101], 'filter101')],
    ['a local model', withModel({ ...LOCAL_MODEL, label: 'Northwind' })],
    ['a project model', withModel(PROJECT_MODEL)],
    [
      'a presentation',
      withPresentation({
        showGraph: false,
        columnWidths: [{ column: 'COMPANY_NAME', width: 180 }],
      }),
    ],
    ['a name', { formatVersion: 1, name: 'Orders', query: { nodes: [] } }],
  ])('Reads %s, which the failing cases start from', (_, json) => {
    expect(decodeCubeSpec(json).readOnly).toBe(false);
  });

  test('Reports the path and the problem', () => {
    const error = decodeErrorOf(() =>
      decodeCubeSpec(
        withSource({
          kind: 'relational',
          id: 'relational101',
          schema: 'NORTHWIND',
          table: 'ORDERS',
        }),
      ),
    );
    expect(error.name).toBe('CubeSpecDecodeError');
    expect(error.path).toBe('query.nodes[0].database');
    expect(error.detail).toBe('is required');
    expect(error.message).toBe('query.nodes[0].database: is required');

    // the document itself has an empty path, which the message leaves out
    const root = decodeErrorOf(() => decodeCubeSpec([]));
    expect(root.path).toBe('');
    expect(root.message).toBe('must be an object');
  });

  test.each<[string, unknown, string, string]>([
    ['a root that is a list', [], '', 'must be an object'],
    ['a root that is null', null, '', 'must be an object'],
    ['a root that is a string', '{"formatVersion":1}', '', 'must be an object'],
    ['a root that is a number', 1, '', 'must be an object'],
    [
      'a missing formatVersion',
      { query: { nodes: [] } },
      'formatVersion',
      'is required',
    ],
    [
      'a formatVersion that is a string',
      { formatVersion: '1', query: { nodes: [] } },
      'formatVersion',
      'must be a whole number of at least 1',
    ],
    [
      'a fractional formatVersion',
      { formatVersion: 1.5, query: { nodes: [] } },
      'formatVersion',
      'must be a whole number of at least 1',
    ],
    [
      'a formatVersion of 0',
      { formatVersion: 0, query: { nodes: [] } },
      'formatVersion',
      'must be a whole number of at least 1',
    ],
    [
      'a negative formatVersion',
      { formatVersion: -1, query: { nodes: [] } },
      'formatVersion',
      'must be a whole number of at least 1',
    ],
    [
      // whole, but past the integers a double holds exactly
      'a formatVersion past the safe integers',
      { formatVersion: 2 ** 53, query: { nodes: [] } },
      'formatVersion',
      'must be a whole number of at least 1',
    ],
    [
      'a formatVersion set to null',
      { formatVersion: null, query: { nodes: [] } },
      'formatVersion',
      'must be a whole number of at least 1',
    ],
    ['a missing query', { formatVersion: 1 }, 'query', 'is required'],
    [
      'a query set to null',
      { formatVersion: 1, query: null },
      'query',
      'is required',
    ],
    [
      'a query that is a list',
      { formatVersion: 1, query: [] },
      'query',
      'must be an object',
    ],
    [
      'a query that is a string',
      { formatVersion: 1, query: 'relational101' },
      'query',
      'must be an object',
    ],
    [
      'a query without nodes',
      { formatVersion: 1, query: {} },
      'query.nodes',
      'is required',
    ],
    [
      'nodes set to null',
      { formatVersion: 1, query: { nodes: null } },
      'query.nodes',
      'is required',
    ],
    [
      'nodes that are not a list',
      { formatVersion: 1, query: { nodes: { relational101: RELATIONAL_101 } } },
      'query.nodes',
      'must be a list',
    ],
    [
      'a name set to null',
      { formatVersion: 1, name: null, query: { nodes: [] } },
      'name',
      'must be a string',
    ],
    [
      'a name that is a number',
      { formatVersion: 1, name: 1997, query: { nodes: [] } },
      'name',
      'must be a string',
    ],
  ])('Refuses %s', (_, json, path, detail) => {
    expect(failureOf(json)).toEqual([path, detail]);
  });

  test.each<[string, unknown, string, string]>([
    [
      'a node that is a string',
      withNodes(['relational101']),
      'query.nodes[0]',
      'must be an object',
    ],
    [
      'a node set to null',
      withNodes([null]),
      'query.nodes[0]',
      'must be an object',
    ],
    [
      'a node that is a list',
      withNodes([[]]),
      'query.nodes[0]',
      'must be an object',
    ],
    [
      'a node without a kind',
      withNodes([{ id: 'relational101' }]),
      'query.nodes[0].kind',
      'is required',
    ],
    [
      'an empty kind',
      withNodes([{ kind: '', id: 'relational101' }]),
      'query.nodes[0].kind',
      'must not be empty',
    ],
    [
      'a kind that is a number',
      withNodes([{ kind: 1, id: 'relational101' }]),
      'query.nodes[0].kind',
      'must be a string',
    ],
    [
      'a kind set to null',
      withNodes([{ kind: null, id: 'relational101' }]),
      'query.nodes[0].kind',
      'must be a string',
    ],
    [
      'a node without an id',
      withNodes([
        {
          kind: 'relational',
          database: DATABASE,
          schema: 'NORTHWIND',
          table: 'ORDERS',
        },
      ]),
      'query.nodes[0].id',
      'is required',
    ],
    [
      'an empty id',
      withNodes([{ ...RELATIONAL_101, id: '' }]),
      'query.nodes[0].id',
      'must not be empty',
    ],
    [
      'an id that is a number',
      withNodes([{ ...RELATIONAL_101, id: 101 }]),
      'query.nodes[0].id',
      'must be a string',
    ],
    [
      'an id set to null',
      withNodes([{ ...RELATIONAL_101, id: null }]),
      'query.nodes[0].id',
      'must be a string',
    ],
    [
      'a node of an unknown kind without an id',
      withNodes([{ kind: 'pivot', rows: ['SHIP_CITY'] }]),
      'query.nodes[0].id',
      'is required',
    ],
    [
      'a repeated id',
      withNodes(
        [RELATIONAL_101, { ...FILTER_101, id: 'relational101' }],
        'relational101',
      ),
      'query.nodes[1].id',
      'repeats the id "relational101"',
    ],
    [
      'a repeated id on a node of an unknown kind',
      withNodes(
        [RELATIONAL_101, { kind: 'pivot', id: 'relational101' }],
        'relational101',
      ),
      'query.nodes[1].id',
      'repeats the id "relational101"',
    ],
  ])('Refuses %s', (_, json, path, detail) => {
    expect(failureOf(json)).toEqual([path, detail]);
  });

  test.each<[string, unknown, string, string]>([
    [
      'inputs that are not a list',
      withNodes(
        [RELATIONAL_101, { ...FILTER_101, inputs: 'relational101' }],
        'filter101',
      ),
      'query.nodes[1].inputs',
      'must be a list',
    ],
    [
      'inputs set to null',
      withNodes([RELATIONAL_101, { ...FILTER_101, inputs: null }], 'filter101'),
      'query.nodes[1].inputs',
      'must be a list',
    ],
    [
      'an input that is a boolean',
      withNodes(
        [RELATIONAL_101, { ...FILTER_101, inputs: [true] }],
        'filter101',
      ),
      'query.nodes[1].inputs[0]',
      'must be a node id or null',
    ],
    [
      'an empty input',
      withNodes([RELATIONAL_101, { ...FILTER_101, inputs: [''] }], 'filter101'),
      'query.nodes[1].inputs[0]',
      'must be a node id or null',
    ],
    [
      'an input that is a number',
      withNodes(
        [RELATIONAL_101, { ...FILTER_101, inputs: [101] }],
        'filter101',
      ),
      'query.nodes[1].inputs[0]',
      'must be a node id or null',
    ],
    [
      'an input that is a node reference object',
      withNodes(
        [
          RELATIONAL_101,
          {
            ...FILTER_101,
            inputs: [{ _type: 'nodeRef', nodeId: 'relational101' }],
          },
        ],
        'filter101',
      ),
      'query.nodes[1].inputs[0]',
      'must be a node id or null',
    ],
    [
      'inputs of a node of an unknown kind that are not a list',
      withNodes([{ kind: 'pivot', id: 'pivot101', inputs: {} }], 'pivot101'),
      'query.nodes[0].inputs',
      'must be a list',
    ],
    [
      'an input of a node of an unknown kind that is a number',
      withNodes(
        [{ kind: 'pivot', id: 'pivot101', inputs: [null, 1] }],
        'pivot101',
      ),
      'query.nodes[0].inputs[1]',
      'must be a node id or null',
    ],
    [
      'a filter without inputs',
      withNodes([{ kind: 'filter', id: 'filter101' }], 'filter101'),
      'query.nodes[0].inputs',
      'must list the 1 input(s) of a filter node, in port order',
    ],
    [
      'a filter with no input',
      withNodes([{ ...FILTER_101, inputs: [] }], 'filter101'),
      'query.nodes[0].inputs',
      'must list the 1 input(s) of a filter node, in port order',
    ],
    [
      'a filter with two inputs',
      withNodes([{ ...FILTER_101, inputs: [null, null] }], 'filter101'),
      'query.nodes[0].inputs',
      'must list the 1 input(s) of a filter node, in port order',
    ],
    [
      'a join without inputs',
      withJoin({
        kind: 'join',
        id: 'join101',
        joinType: 'INNER',
        leftColumns: ['CUSTOMER_ID'],
        rightColumns: ['CUSTOMER_ID'],
      }),
      'query.nodes[0].inputs',
      'must list the 2 input(s) of a join node, in port order',
    ],
    [
      'a join with one input',
      withJoin({ ...JOIN_101, inputs: [null] }),
      'query.nodes[0].inputs',
      'must list the 2 input(s) of a join node, in port order',
    ],
    [
      'a join with three inputs',
      withJoin({ ...JOIN_101, inputs: [null, null, null] }),
      'query.nodes[0].inputs',
      'must list the 2 input(s) of a join node, in port order',
    ],
    [
      'a source with an input',
      withNodes(
        [RELATIONAL_101, { ...RELATIONAL_102, inputs: ['relational101'] }],
        'relational102',
      ),
      'query.nodes[1].inputs',
      'must be left out: a relational node has no inputs',
    ],
    [
      'a source with a null input',
      withSource({ ...RELATIONAL_101, inputs: [null] }),
      'query.nodes[0].inputs',
      'must be left out: a relational node has no inputs',
    ],
  ])('Refuses %s', (_, json, path, detail) => {
    expect(failureOf(json)).toEqual([path, detail]);
  });

  test.each<[string, unknown, string, string]>([
    [
      'an input naming a missing node',
      withNodes([{ ...FILTER_101, inputs: ['relational999'] }], 'filter101'),
      'query.nodes[0].inputs[0]',
      '"relational999" is not a node of the query',
    ],
    [
      'one node feeding two nodes',
      withNodes(
        [
          RELATIONAL_101,
          { ...FILTER_101, inputs: ['relational101'] },
          { kind: 'filter', id: 'filter102', inputs: ['relational101'] },
        ],
        'filter102',
      ),
      'query.nodes[2].inputs[0]',
      'node "relational101" already feeds another node',
    ],
    [
      'one node feeding both inputs of a join',
      withNodes(
        [
          RELATIONAL_101,
          { ...JOIN_101, inputs: ['relational101', 'relational101'] },
        ],
        'join101',
      ),
      'query.nodes[1].inputs[1]',
      'node "relational101" already feeds another node',
    ],
    [
      'a cycle',
      withNodes(
        [
          { kind: 'filter', id: 'filter101', inputs: ['filter102'] },
          { kind: 'filter', id: 'filter102', inputs: ['filter101'] },
        ],
        'filter102',
      ),
      'query.nodes',
      'Query has a cycle through node "filter101"',
    ],
    [
      'a cycle through a join',
      withNodes(
        [
          RELATIONAL_101,
          { ...JOIN_101, inputs: ['relational101', 'filter101'] },
          { ...FILTER_101, inputs: ['join101'] },
        ],
        'join101',
      ),
      'query.nodes',
      'Query has a cycle through node "join101"',
    ],
    [
      'a node that is its own input',
      withNodes([{ ...FILTER_101, inputs: ['filter101'] }], 'filter101'),
      'query.nodes',
      'Query has a cycle through node "filter101"',
    ],
    [
      'nodes without a selected node',
      withNodes([RELATIONAL_101]),
      'query.selected',
      'is required',
    ],
    [
      'a selected node in a query with no nodes',
      withNodes([], 'relational101'),
      'query.selected',
      'must be left out of a query with no nodes',
    ],
    [
      'a selected node that is not in the query',
      withNodes([RELATIONAL_101], 'filter101'),
      'query.selected',
      '"filter101" is not a node of the query',
    ],
    [
      'an empty selected node',
      withNodes([RELATIONAL_101], ''),
      'query.selected',
      'must not be empty',
    ],
    [
      'a selected node that is a number',
      { formatVersion: 1, query: { selected: 101, nodes: [RELATIONAL_101] } },
      'query.selected',
      'must be a string',
    ],
    [
      'a selected node set to null',
      { formatVersion: 1, query: { selected: null, nodes: [] } },
      'query.selected',
      'must be a string',
    ],
  ])('Refuses %s', (_, json, path, detail) => {
    expect(failureOf(json)).toEqual([path, detail]);
  });

  test.each<[string, unknown, string, string]>([
    [
      'a relational source without a database',
      withSource({
        kind: 'relational',
        id: 'relational101',
        schema: 'NORTHWIND',
        table: 'ORDERS',
      }),
      'query.nodes[0].database',
      'is required',
    ],
    [
      'an empty database',
      withSource({ ...RELATIONAL_101, database: '' }),
      'query.nodes[0].database',
      'must not be empty',
    ],
    [
      'a database that is a number',
      withSource({ ...RELATIONAL_101, database: 1 }),
      'query.nodes[0].database',
      'must be a string',
    ],
    [
      'a database set to null',
      withSource({ ...RELATIONAL_101, database: null }),
      'query.nodes[0].database',
      'must be a string',
    ],
    [
      'a relational source without a schema',
      withSource({
        kind: 'relational',
        id: 'relational101',
        database: DATABASE,
        table: 'ORDERS',
      }),
      'query.nodes[0].schema',
      'is required',
    ],
    [
      'an empty schema',
      withSource({ ...RELATIONAL_101, schema: '' }),
      'query.nodes[0].schema',
      'must not be empty',
    ],
    [
      'a schema that is a list',
      withSource({ ...RELATIONAL_101, schema: ['NORTHWIND'] }),
      'query.nodes[0].schema',
      'must be a string',
    ],
    [
      'a relational source without a table',
      withSource({
        kind: 'relational',
        id: 'relational101',
        database: DATABASE,
        schema: 'NORTHWIND',
      }),
      'query.nodes[0].table',
      'is required',
    ],
    [
      'an empty table',
      withSource({ ...RELATIONAL_101, table: '' }),
      'query.nodes[0].table',
      'must not be empty',
    ],
    [
      'a table that is an object',
      withSource({ ...RELATIONAL_101, table: { name: 'ORDERS' } }),
      'query.nodes[0].table',
      'must be a string',
    ],
    [
      'a schemaSnapshot that is not a list',
      withSnapshot({ ORDER_ID: { path: 'Integer' } }),
      SNAPSHOT,
      'must be a list',
    ],
    [
      'a schemaSnapshot set to null',
      withSnapshot(null),
      SNAPSHOT,
      'must be a list',
    ],
    [
      'a snapshot column that is a string',
      withSnapshot(['ORDER_ID']),
      `${SNAPSHOT}[0]`,
      'must be an object',
    ],
    [
      'a snapshot column without a name',
      withSnapshot([{ type: { path: 'Integer' }, nullable: false }]),
      `${SNAPSHOT}[0].name`,
      'is required',
    ],
    [
      'a snapshot column with an empty name',
      withSnapshot([{ ...ORDER_ID, name: '' }]),
      `${SNAPSHOT}[0].name`,
      'must not be empty',
    ],
    [
      'a snapshot column name that is a number',
      withSnapshot([{ ...ORDER_ID, name: 1 }]),
      `${SNAPSHOT}[0].name`,
      'must be a string',
    ],
    [
      'a repeated snapshot column name',
      withSnapshot([ORDER_ID, { ...ORDER_ID, nullable: true }]),
      `${SNAPSHOT}[1].name`,
      'repeats the column "ORDER_ID"',
    ],
    [
      'a snapshot column without a type',
      withSnapshot([{ name: 'ORDER_ID', nullable: false }]),
      `${SNAPSHOT}[0].type`,
      'is required',
    ],
    [
      'a snapshot column type set to null',
      withSnapshot([{ ...ORDER_ID, type: null }]),
      `${SNAPSHOT}[0].type`,
      'is required',
    ],
    [
      'a snapshot column type that is a string',
      withSnapshot([{ ...ORDER_ID, type: 'Integer' }]),
      `${SNAPSHOT}[0].type`,
      'must be an object',
    ],
    [
      'a snapshot column without nullable',
      withSnapshot([{ name: 'ORDER_ID', type: { path: 'Integer' } }]),
      `${SNAPSHOT}[0].nullable`,
      'is required',
    ],
    [
      'nullable that is a string',
      withSnapshot([{ ...ORDER_ID, nullable: 'false' }]),
      `${SNAPSHOT}[0].nullable`,
      'must be true or false',
    ],
    [
      'nullable that is a number',
      withSnapshot([{ ...ORDER_ID, nullable: 0 }]),
      `${SNAPSHOT}[0].nullable`,
      'must be true or false',
    ],
    [
      'nullable set to null',
      withSnapshot([{ ...ORDER_ID, nullable: null }]),
      `${SNAPSHOT}[0].nullable`,
      'must be true or false',
    ],
  ])('Refuses %s', (_, json, path, detail) => {
    expect(failureOf(json)).toEqual([path, detail]);
  });

  test.each<[string, unknown, string, string]>([
    [
      'a type without a path',
      withType({ params: [15] }),
      `${TYPE}.path`,
      'is required',
    ],
    [
      'an empty type path',
      withType({ path: '' }),
      `${TYPE}.path`,
      'must not be empty',
    ],
    [
      'a type path that is a number',
      withType({ path: 1 }),
      `${TYPE}.path`,
      'must be a string',
    ],
    [
      'type params that are not a list',
      withType({ path: VARCHAR, params: 15 }),
      `${TYPE}.params`,
      'must be a list',
    ],
    [
      'type params set to null',
      withType({ path: VARCHAR, params: null }),
      `${TYPE}.params`,
      'must be a list',
    ],
    [
      'a type param that is a string',
      withType({ path: VARCHAR, params: ['15'] }),
      `${TYPE}.params[0]`,
      'must be a finite number',
    ],
    [
      'a type param set to null',
      withType({
        path: 'meta::pure::precisePrimitives::Numeric',
        params: [10, null],
      }),
      `${TYPE}.params[1]`,
      'must be a finite number',
    ],
    [
      // R56: it would be saved as null, which can't be read
      'a type param that is not finite',
      withType({ path: VARCHAR, params: [Infinity] }),
      `${TYPE}.params[0]`,
      'must be a finite number',
    ],
    [
      'a type param that is not a number',
      withType({ path: 'my::Unknown', params: [1, NaN] }),
      `${TYPE}.params[1]`,
      'must be a finite number',
    ],
    [
      'enumeration values together with params',
      withType({ path: 'my::Region', params: [1], values: ['EMEA'] }),
      TYPE,
      'an enumeration has values, not parameters',
    ],
    [
      'empty enumeration values',
      withType({ path: 'my::Region', values: [] }),
      `${TYPE}.values`,
      'must not be empty',
    ],
    [
      'repeated enumeration values',
      withType({ path: 'my::Region', values: ['EMEA', 'APAC', 'EMEA'] }),
      `${TYPE}.values`,
      'must not repeat a value',
    ],
    [
      'an enumeration value that is a number',
      withType({ path: 'my::Region', values: ['EMEA', 1] }),
      `${TYPE}.values[1]`,
      'must be a non-empty string',
    ],
    [
      'an empty enumeration value',
      withType({ path: 'my::Region', values: [''] }),
      `${TYPE}.values[0]`,
      'must be a non-empty string',
    ],
    [
      'enumeration values that are not a list',
      withType({ path: 'my::Region', values: 'EMEA' }),
      `${TYPE}.values`,
      'must be a list',
    ],
    [
      'enumeration values set to null',
      withType({ path: 'my::Region', values: null }),
      `${TYPE}.values`,
      'must be a list',
    ],
  ])('Refuses %s', (_, json, path, detail) => {
    expect(failureOf(json)).toEqual([path, detail]);
  });

  test.each<[string, unknown, string, string]>([
    [
      'a join without a joinType',
      withJoin({
        kind: 'join',
        id: 'join101',
        inputs: [null, null],
        leftColumns: ['CUSTOMER_ID'],
        rightColumns: ['CUSTOMER_ID'],
      }),
      'query.nodes[0].joinType',
      'is required',
    ],
    [
      'a joinType that is a number',
      withJoin({ ...JOIN_101, joinType: 1 }),
      'query.nodes[0].joinType',
      'must be a string',
    ],
    [
      'a joinType set to null',
      withJoin({ ...JOIN_101, joinType: null }),
      'query.nodes[0].joinType',
      'must be a string',
    ],
    [
      'a join without leftColumns',
      withJoin({
        kind: 'join',
        id: 'join101',
        inputs: [null, null],
        joinType: 'INNER',
        rightColumns: ['CUSTOMER_ID'],
      }),
      'query.nodes[0].leftColumns',
      'is required',
    ],
    [
      'leftColumns that are not a list',
      withJoin({ ...JOIN_101, leftColumns: 'CUSTOMER_ID' }),
      'query.nodes[0].leftColumns',
      'must be a list',
    ],
    [
      'leftColumns set to null',
      withJoin({ ...JOIN_101, leftColumns: null }),
      'query.nodes[0].leftColumns',
      'must be a list',
    ],
    [
      'a left column that is a number',
      withJoin({ ...JOIN_101, leftColumns: ['CUSTOMER_ID', 1] }),
      'query.nodes[0].leftColumns[1]',
      'must be a string',
    ],
    [
      'a join without rightColumns',
      withJoin({
        kind: 'join',
        id: 'join101',
        inputs: [null, null],
        joinType: 'INNER',
        leftColumns: ['CUSTOMER_ID'],
      }),
      'query.nodes[0].rightColumns',
      'is required',
    ],
    [
      'rightColumns that are not a list',
      withJoin({ ...JOIN_101, rightColumns: { 0: 'CUSTOMER_ID' } }),
      'query.nodes[0].rightColumns',
      'must be a list',
    ],
    [
      'a right column set to null',
      withJoin({ ...JOIN_101, rightColumns: [null] }),
      'query.nodes[0].rightColumns[0]',
      'must be a string',
    ],
    [
      // malformed fields are decode errors even when the join type is unreadable
      'a join of an unknown type without leftColumns',
      withJoin({
        kind: 'join',
        id: 'join101',
        inputs: [null, null],
        joinType: 'CROSS',
        rightColumns: [],
      }),
      'query.nodes[0].leftColumns',
      'is required',
    ],
    [
      'a filter set to null',
      withNodes([{ ...FILTER_101, filter: null }], 'filter101'),
      'query.nodes[0].filter',
      'must not be null',
    ],
  ])('Refuses %s', (_, json, path, detail) => {
    expect(failureOf(json)).toEqual([path, detail]);
  });

  test.each<[string, unknown, string, string]>([
    [
      'a context that is a string',
      withContext('cube-northwind'),
      'context',
      'must be an object',
    ],
    [
      'a context set to null',
      withContext(null),
      'context',
      'must be an object',
    ],
    [
      'a context that is a list',
      withContext([]),
      'context',
      'must be an object',
    ],
    [
      'a context without a model',
      withContext({ runtime: RUNTIME }),
      'context.model',
      'is required',
    ],
    [
      'a model set to null',
      withContext({ model: null }),
      'context.model',
      'is required',
    ],
    [
      'a model that is a string',
      withModel('cube-northwind'),
      'context.model',
      'must be an object',
    ],
    [
      'a model without a kind',
      withModel({ id: 'cube-northwind' }),
      'context.model.kind',
      'is required',
    ],
    [
      // nothing can be resolved without a model this version knows
      'a model of an unknown kind',
      withModel({ kind: 'remote', id: 'cube-northwind' }),
      'context.model.kind',
      '"remote" is not a known model kind',
    ],
    [
      'a local model without an id',
      withModel({ kind: 'local' }),
      'context.model.id',
      'is required',
    ],
    [
      'a local model with an empty id',
      withModel({ kind: 'local', id: '' }),
      'context.model.id',
      'must not be empty',
    ],
    [
      'a label that is a number',
      withModel({ ...LOCAL_MODEL, label: 1 }),
      'context.model.label',
      'must be a string',
    ],
    [
      'a label set to null',
      withModel({ ...LOCAL_MODEL, label: null }),
      'context.model.label',
      'must be a string',
    ],
    [
      'a project model without a groupId',
      withModel({
        kind: 'project',
        artifactId: 'northwind',
        versionId: '1.0.0',
      }),
      'context.model.groupId',
      'is required',
    ],
    [
      'a project model without an artifactId',
      withModel({
        kind: 'project',
        groupId: 'org.finos.legend',
        versionId: '1.0.0',
      }),
      'context.model.artifactId',
      'is required',
    ],
    [
      'a project model without a versionId',
      withModel({
        kind: 'project',
        groupId: 'org.finos.legend',
        artifactId: 'northwind',
      }),
      'context.model.versionId',
      'is required',
    ],
    [
      'a project model with an empty versionId',
      withModel({ ...PROJECT_MODEL, versionId: '' }),
      'context.model.versionId',
      'must not be empty',
    ],
    [
      'an empty runtime',
      withContext({ model: LOCAL_MODEL, runtime: '' }),
      'context.runtime',
      'must not be empty',
    ],
    [
      'a runtime that is a number',
      withContext({ model: LOCAL_MODEL, runtime: 1 }),
      'context.runtime',
      'must be a string',
    ],
    [
      'a runtime set to null',
      withContext({ model: LOCAL_MODEL, runtime: null }),
      'context.runtime',
      'must be a string',
    ],
  ])('Refuses %s', (_, json, path, detail) => {
    expect(failureOf(json)).toEqual([path, detail]);
  });

  test.each<[string, unknown, string, string]>([
    [
      'meta that is a string',
      withMeta('presentation'),
      'meta',
      'must be an object',
    ],
    ['meta set to null', withMeta(null), 'meta', 'must be an object'],
    ['meta that is a list', withMeta([]), 'meta', 'must be an object'],
    [
      'a presentation that is a list',
      withPresentation([]),
      'meta.presentation',
      'must be an object',
    ],
    [
      'a presentation set to null',
      withPresentation(null),
      'meta.presentation',
      'must be an object',
    ],
    [
      'showGraph that is a string',
      withPresentation({ showGraph: 'false' }),
      'meta.presentation.showGraph',
      'must be true or false',
    ],
    [
      'showGraph set to null',
      withPresentation({ showGraph: null }),
      'meta.presentation.showGraph',
      'must be true or false',
    ],
    [
      'columnWidths keyed by column name',
      withWidths({ COMPANY_NAME: 180 }),
      WIDTHS,
      'must be a list',
    ],
    ['columnWidths set to null', withWidths(null), WIDTHS, 'must be a list'],
    [
      'a width item that is a string',
      withWidths(['COMPANY_NAME']),
      `${WIDTHS}[0]`,
      'must be an object',
    ],
    [
      'a width item without its column',
      withWidths([{ width: 180 }]),
      `${WIDTHS}[0].column`,
      'is required',
    ],
    [
      'a width item whose column is a number',
      withWidths([{ column: 1, width: 180 }]),
      `${WIDTHS}[0].column`,
      'must be a string',
    ],
    [
      'a width item without its width',
      withWidths([{ column: 'COMPANY_NAME' }]),
      `${WIDTHS}[0].width`,
      'is required',
    ],
    [
      'a width of 0',
      withWidths([
        { column: 'COMPANY_NAME', width: 180 },
        { column: 'CONTACT_NAME', width: 0 },
      ]),
      `${WIDTHS}[1].width`,
      'must be a positive number',
    ],
    [
      'a negative width',
      withWidths([{ column: 'COMPANY_NAME', width: -180 }]),
      `${WIDTHS}[0].width`,
      'must be a positive number',
    ],
    [
      'an infinite width',
      withWidths([{ column: 'COMPANY_NAME', width: Infinity }]),
      `${WIDTHS}[0].width`,
      'must be a positive number',
    ],
    [
      'a width of NaN, which JSON writes as null',
      withWidths([{ column: 'COMPANY_NAME', width: null }]),
      `${WIDTHS}[0].width`,
      'must be a positive number',
    ],
    [
      'a width of NaN',
      withWidths([{ column: 'COMPANY_NAME', width: NaN }]),
      `${WIDTHS}[0].width`,
      'must be a positive number',
    ],
    [
      'a width that is a string',
      withWidths([{ column: 'COMPANY_NAME', width: '180' }]),
      `${WIDTHS}[0].width`,
      'must be a positive number',
    ],
  ])('Refuses %s', (_, json, path, detail) => {
    expect(failureOf(json)).toEqual([path, detail]);
  });

  test("Reports a node its constructor refuses at the node's path", () => {
    const registry = new NodeRegistry([
      {
        ...FILTER_DEFINITION,
        spec: {
          ...FILTER_CODEC,
          decode: () => {
            throw new Error('A filter node needs a filter rule');
          },
        },
      },
    ]);
    const error = decodeErrorOf(() =>
      decodeCubeSpec(withNodes([FILTER_101], 'filter101'), { registry }),
    );
    expect([error.path, error.detail]).toEqual([
      'query.nodes[0]',
      'A filter node needs a filter rule',
    ]);
  });
});

// ---------------------------------------- what decode accepts ----------------------------------------

describe(unitTest('Saved spec decode edge cases'), () => {
  test('Accepts an empty inputs list on a source, and saves it without one', () => {
    const { document } = decodeCubeSpec(
      withSource({ ...RELATIONAL_101, inputs: [] }),
    );
    expect(document.query.nodes[0]?.ports).toEqual([]);
    expect(JSON.stringify(encodeCubeSpec(document))).toBe(
      JSON.stringify({
        formatVersion: 1,
        query: { selected: 'relational101', nodes: [RELATIONAL_101] },
      }),
    );
  });

  test('Accepts an input naming a node that comes later', () => {
    const json = {
      formatVersion: 1,
      query: {
        selected: 'filter101',
        nodes: [{ ...FILTER_101, inputs: ['relational101'] }, RELATIONAL_101],
      },
    };
    const { document } = decodeCubeSpec(json);
    expect(document.query.nodes.map((node) => node.id)).toEqual([
      'filter101',
      'relational101',
    ]);
    expect(document.query.getInputIds('filter101')).toEqual(['relational101']);
    expect(JSON.stringify(encodeCubeSpec(document))).toBe(JSON.stringify(json));
  });

  test('Keeps an empty name', () => {
    const json = { formatVersion: 1, name: '', query: { nodes: [] } };
    const { document } = decodeCubeSpec(json);
    expect(document.name).toBe('');
    expect(JSON.stringify(encodeCubeSpec(document))).toBe(JSON.stringify(json));
  });

  test('Keeps nulls in unknown keys and in a node of an unknown kind', () => {
    // only a known field set to null is malformed
    const json = {
      formatVersion: 1,
      query: {
        selected: 'pivot101',
        nodes: [{ kind: 'pivot', id: 'pivot101', rows: null }],
        layout: null,
      },
      description: null,
    };
    expect(JSON.stringify(encodeCubeSpec(decodeCubeSpec(json).document))).toBe(
      JSON.stringify(json),
    );
  });
});

// ---------------------------------------- spec text ----------------------------------------

/**
 * Spec text of exactly `bytes` UTF-8 bytes, padded in its name with 3-byte
 * characters, so it is far fewer UTF-16 units. The arithmetic doesn't use
 * the function under test: the rest of the text is ASCII.
 */
const specTextOfBytes = (bytes: number): { text: string; name: string } => {
  const base = JSON.stringify({
    formatVersion: 1,
    name: '',
    query: { nodes: [] },
  });
  const room = bytes - base.length;
  const name = EURO.repeat(Math.floor(room / 3)) + 'a'.repeat(room % 3);
  return {
    text: JSON.stringify({ formatVersion: 1, name, query: { nodes: [] } }),
    name,
  };
};

/** A document whose serialized spec is exactly `bytes` UTF-8 bytes */
const documentOfBytes = (bytes: number): CubeDocument => {
  const room = bytes - serializeCubeSpec(new CubeDocument({ name: '' })).length;
  return new CubeDocument({
    name: EURO.repeat(Math.floor(room / 3)) + 'a'.repeat(room % 3),
  });
};

describe(unitTest('Saved spec text'), () => {
  test('Caps specs at 1 MiB', () => {
    expect(MAX_SPEC_BYTES).toBe(1048576);
  });

  test.each([
    'not a cube',
    '',
    '{"formatVersion": 1,}',
    "{'formatVersion': 1}",
  ])('Refuses text that is not JSON: %j', (text) => {
    const error = decodeErrorOf(() => parseCubeSpec(text));
    expect([error.path, error.detail]).toEqual([
      '',
      `is not valid JSON (${jsonParseMessage(text)})`,
    ]);
  });

  test('Reads the document of valid text', () => {
    const { document, formatVersion, readOnly } = parseCubeSpec(
      '{"formatVersion": 1, "name": "Orders", "query": {"nodes": []}}',
    );
    expect(document.name).toBe('Orders');
    expect(formatVersion).toBe(1);
    expect(readOnly).toBe(false);
  });

  test('Refuses a number past the double range, which JSON reads as Infinity', () => {
    // R56: the text is valid JSON, but the number can't be saved back
    const text = JSON.stringify(
      withType({ path: 'my::Unknown', params: [15] }),
    ).replace('[15]', '[1e400]');
    const error = decodeErrorOf(() => parseCubeSpec(text));
    expect([error.path, error.detail]).toEqual([
      `${TYPE}.params[0]`,
      'must be a finite number',
    ]);
  });

  test('Refuses text over the cap before parsing it', () => {
    const error = decodeErrorOf(() =>
      parseCubeSpec('x'.repeat(MAX_SPEC_BYTES + 1)),
    );
    expect([error.path, error.detail]).toEqual(['', 'is over 1048576 bytes']);
    expect(error.message).toBe('is over 1048576 bytes');
  });

  test('Measures the cap in UTF-8 bytes, not UTF-16 units', () => {
    const text = EURO.repeat(400000);
    expect(text.length).toBeLessThan(MAX_SPEC_BYTES);
    const error = decodeErrorOf(() => parseCubeSpec(text));
    expect([error.path, error.detail]).toEqual(['', 'is over 1048576 bytes']);
  });

  test('Accepts text of exactly the cap, and refuses one byte more', () => {
    const { text, name } = specTextOfBytes(MAX_SPEC_BYTES);
    expect(text.length).toBeLessThan(MAX_SPEC_BYTES / 2);
    expect(parseCubeSpec(text).document.name).toBe(name);

    // still valid JSON, one byte larger
    const error = decodeErrorOf(() => parseCubeSpec(`${text} `));
    expect([error.path, error.detail]).toEqual(['', 'is over 1048576 bytes']);
  });

  test('Refuses to serialize a document over the cap', () => {
    const document = new CubeDocument({ name: EURO.repeat(400000) });
    expect(() => serializeCubeSpec(document)).toThrow(
      new Error(
        'The cube is too large to save: its spec is over 1048576 bytes',
      ),
    );
  });

  test('Serializes a document of exactly the cap, and refuses one byte more', () => {
    const document = documentOfBytes(MAX_SPEC_BYTES);
    const text = serializeCubeSpec(document);
    expect(text.length).toBeLessThan(MAX_SPEC_BYTES / 2);
    expect(parseCubeSpec(text).document.name).toBe(document.name);

    const larger = document.withName(`${document.name ?? ''}a`);
    expect(() => serializeCubeSpec(larger)).toThrow(
      new Error(
        'The cube is too large to save: its spec is over 1048576 bytes',
      ),
    );
  });

  test.each<[string, string, number]>([
    ['the empty string', '', 0],
    ['ASCII text', 'Cube', 4],
    ['U+007F, the last 1-byte character', '\u007f', 1],
    ['U+0080, the first 2-byte character', '\u0080', 2],
    ['an accented letter', 'é', 2],
    ['U+07FF, the last 2-byte character', '߿', 2],
    ['U+0800, the first 3-byte character', 'ࠀ', 3],
    ['the euro sign', EURO, 3],
    ['U+FFFF, the last 3-byte character', '￿', 3],
    ['U+10000, the first 4-byte character', '\u{10000}', 4],
    ['a surrogate pair', '\u{1f600}', 4],
    ['a lone high surrogate', '\ud83d', 3],
    ['a lone low surrogate', '\ude00', 3],
    ['a reversed surrogate pair', '\ude00\ud83d', 6],
    ['mixed text', `a${EURO}\u{1f600}é`, 10],
  ])('Counts the UTF-8 bytes of %s', (_, text, bytes) => {
    expect(getUtf8ByteLength(text)).toBe(bytes);
  });
});

// ---------------------------------------- versions ----------------------------------------

describe(unitTest('Saved spec versions'), () => {
  test('Writes format version 1, with no migrations yet', () => {
    expect(CURRENT_FORMAT_VERSION).toBe(1);
    expect(CUBE_SPEC_MIGRATIONS).toEqual([]);
    expect(encodeCubeSpec(new CubeDocument()).formatVersion).toBe(1);
  });

  test('Reads a current document as editable', () => {
    expect(decodeCubeSpec({ formatVersion: 1, query: { nodes: [] } })).toEqual(
      expect.objectContaining({ formatVersion: 1, readOnly: false }),
    );
  });

  test('Reads a newer document read-only, with the rules of this version', () => {
    const json = {
      formatVersion: 2,
      name: 'Saved by a newer Cube',
      query: {
        selected: 'pivot101',
        nodes: [
          RELATIONAL_101,
          {
            kind: 'pivot',
            id: 'pivot101',
            inputs: ['relational101'],
            rows: ['SHIP_CITY'],
          },
        ],
      },
      layout: { zoom: 2 },
    };
    const { document, formatVersion, readOnly } = decodeCubeSpec(json);
    expect(formatVersion).toBe(2);
    expect(readOnly).toBe(true);
    const pivot = document.query.nodes[1];
    expect(pivot).toBeInstanceOf(UnknownNode);
    expect((pivot as UnknownNode).savedKind).toBe('pivot');

    // saved again, it is written in the current format, without the flag
    expect(JSON.stringify(encodeCubeSpec(document))).toBe(
      JSON.stringify({ ...json, formatVersion: 1 }),
    );
  });

  test.each<[string, unknown, string, string]>([
    [
      'with no query',
      { formatVersion: 2 },
      'query',
      'is required (this cube was saved by a newer version of Cube, in format 2)',
    ],
    [
      'with a source without a database',
      {
        formatVersion: 7,
        query: {
          selected: 'relational101',
          nodes: [
            {
              kind: 'relational',
              id: 'relational101',
              schema: 'NORTHWIND',
              table: 'ORDERS',
            },
          ],
        },
      },
      'query.nodes[0].database',
      'is required (this cube was saved by a newer version of Cube, in format 7)',
    ],
    [
      'with a model of an unknown kind',
      {
        formatVersion: 2,
        context: { model: { kind: 'remote', id: 'cube-northwind' } },
        query: { nodes: [] },
      },
      'context.model.kind',
      '"remote" is not a known model kind (this cube was saved by a newer version of Cube, in format 2)',
    ],
  ])(
    'Names the newer format when a newer document %s cannot be read',
    (_, json, path, detail) => {
      const error = decodeErrorOf(() => decodeCubeSpec(json));
      expect([error.path, error.detail]).toEqual([path, detail]);
      expect(error.message).toBe(`${path}: ${detail}`);
    },
  );

  test('Migrates an older document one step at a time, in order', () => {
    const received: number[] = [];
    const step = (from: number, key: string): CubeSpecMigration => ({
      from,
      migrate: (json) => {
        received.push(json.formatVersion as number);
        return { ...json, [key]: true };
      },
    });
    const json: JsonObject = { formatVersion: 1, query: { nodes: [] } };
    // listed out of order: each step is found by the version it migrates from
    const migrated = migrateCubeSpec(json, 1, 3, [
      step(2, 'second'),
      step(1, 'first'),
    ]);
    expect(received).toEqual([1, 2]);
    expect(migrated).toEqual({
      formatVersion: 3,
      query: { nodes: [] },
      first: true,
      second: true,
    });
    expect(json).toEqual({ formatVersion: 1, query: { nodes: [] } });
  });

  test('Sets the format version after each step, whatever the step returns', () => {
    const migrated = migrateCubeSpec(
      { formatVersion: 1, query: { nodes: [] } },
      1,
      2,
      [{ from: 1, migrate: (json) => ({ ...json, formatVersion: 99 }) }],
    );
    expect(migrated.formatVersion).toBe(2);
  });

  test('Leaves a document already in the target format as it is', () => {
    const json: JsonObject = { formatVersion: 1, query: { nodes: [] } };
    expect(migrateCubeSpec(json, 1)).toBe(json);
  });

  test.each<[string, readonly CubeSpecMigration[] | undefined, number, string]>(
    [
      [
        'a step missing from the chain',
        [{ from: 1, migrate: (json) => json }],
        3,
        "can't be read: there is no migration from format 2",
      ],
      ['no steps', [], 2, "can't be read: there is no migration from format 1"],
      [
        "the format's own migrations, which are none yet",
        undefined,
        2,
        "can't be read: there is no migration from format 1",
      ],
    ],
  )('Refuses to migrate with %s', (_, migrations, to, detail) => {
    const error = decodeErrorOf(() =>
      migrateCubeSpec(
        { formatVersion: 1, query: { nodes: [] } },
        1,
        to,
        migrations,
      ),
    );
    expect([error.path, error.detail]).toEqual(['formatVersion', detail]);
  });
});
