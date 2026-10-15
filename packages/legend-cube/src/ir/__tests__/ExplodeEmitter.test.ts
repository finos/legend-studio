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
import { listOrigins } from '../../__test-utils__/CubeIRTestUtils.js';
import { column, resolvedTable } from '../../__test-utils__/CubeTestNodes.js';
import { unitTest } from '../../__test-utils__/CubeTestUtils.js';
import { Connection } from '../../graph/Connection.js';
import { Query } from '../../graph/Query.js';
import type { QueryNode } from '../../graph/QueryNode.js';
import { MESSAGE_VARIANT_UNSUPPORTED_DATABASE } from '../../messages/CubeMessages.js';
import { Explode } from '../../nodes/transforms/Explode.js';
import { Schema } from '../../schema/Schema.js';
import { PRIMITIVE_TYPE_PATH } from '../../types/PrimitiveTypeRegistry.js';
import { storeAccessor } from '../CubeIR.js';
import {
  dependsOnDatabaseType,
  getDatabaseProblemOfType,
  getDatabaseProblems,
  needsDatabaseType,
} from '../CubeDialects.js';
import { emitExplode } from '../emitters/ExplodeEmitter.js';
import { printIR } from '../IRPrinter.js';
import { QueryEmitter } from '../QueryEmitter.js';

const VARIANT = PRIMITIVE_TYPE_PATH.VARIANT;
const EVENTS = '#>{test::Northwind.NORTHWIND.EVENTS}#';
const COLUMNS = [column('ID'), column('PAYLOAD', VARIANT, true)];

/** EVENTS, then the nodes, the last selected */
const eventsThen = (...nodes: QueryNode[]): Query => {
  const all = [resolvedTable('relational101', 'EVENTS', COLUMNS), ...nodes];
  return new Query(
    all,
    all
      .slice(1)
      .map(
        (node, index) =>
          new Connection((all[index] as QueryNode).id, node.id, 'tds'),
      ),
    all.at(-1)?.id,
  );
};

const exploded = (node: Explode): string =>
  printIR(new QueryEmitter(eventsThen(node)).emitRelation(node.id));

const ITEMS = new Explode('explode101', 'PAYLOAD', ['order', 'items'], 'item');

describe(unitTest('Explode Array emission (PLAN §11.20)'), () => {
  test("Flattens the array at the path in a lateral, the input's columns kept", () => {
    expect(exploded(ITEMS)).toBe(
      `${EVENTS}->lateral({x | $x.PAYLOAD->get('order')->get('items')` +
        `->toMany(@${VARIANT})->flatten(~item)})`,
    );
  });

  test('Flattens the column itself with no key, and quotes keys and names that need it', () => {
    expect(exploded(new Explode('explode101', 'PAYLOAD', [], 'an item'))).toBe(
      `${EVENTS}->lateral({x | $x.PAYLOAD->toMany(@${VARIANT})->flatten(~'an item')})`,
    );
    expect(
      exploded(new Explode('explode101', 'PAYLOAD', ["it's"], 'e')),
    ).toContain(`->get('it\\'s')`);
  });

  test('Marks the lateral and every part of it with the node', () => {
    expect(
      listOrigins(new QueryEmitter(eventsThen(ITEMS)).emitRelation(ITEMS.id)),
    ).toEqual([
      'lateral@explode101:explode',
      expect.stringContaining(EVENTS),
      'flatten@explode101:explode',
      'toMany@explode101:explode',
      'get@explode101:explode',
      'get@explode101:explode',
      '.PAYLOAD@explode101:explode',
      "'order'@explode101:explode",
      "'items'@explode101:explode",
    ]);
  });

  test('Refuses to emit with no input, or when its columns differ from its schema', () => {
    const accessor = storeAccessor(['test::Northwind', 'NORTHWIND', 'EVENTS']);
    expect(() =>
      emitExplode(ITEMS, [], { inputSchemas: [], schema: new Schema([]) }),
    ).toThrow(`Can't emit explode "explode101": it needs one input`);
    expect(() =>
      emitExplode(ITEMS, [accessor], {
        inputSchemas: [new Schema(COLUMNS)],
        schema: new Schema(COLUMNS),
      }),
    ).toThrow(
      `Explode "explode101" would produce ID, PAYLOAD, item, but its schema is ID, PAYLOAD`,
    );
  });
});

describe(unitTest('Explode Array on each database (PLAN §11.20)'), () => {
  test('Runs on the databases with the Variant functions, or where none is known, and is refused on the others', () => {
    ['Snowflake', 'Databricks', 'Postgres', 'DuckDB', undefined].forEach(
      (databaseType) =>
        expect(getDatabaseProblems(ITEMS, databaseType)).toEqual([]),
    );
    expect(getDatabaseProblems(ITEMS, 'H2')).toEqual([
      MESSAGE_VARIANT_UNSUPPORTED_DATABASE('H2'),
    ]);
    // before it exists, as the palette asks
    expect(getDatabaseProblemOfType('explode', 'SqlServer')).toBe(
      MESSAGE_VARIANT_UNSUPPORTED_DATABASE('SqlServer'),
    );
    expect(getDatabaseProblemOfType('explode', 'DuckDB')).toBeUndefined();
    expect(getDatabaseProblemOfType('explode', undefined)).toBeUndefined();
  });

  test('Depends on the database type, so a run loads it', () => {
    expect(dependsOnDatabaseType(ITEMS)).toBe(true);
    expect(needsDatabaseType(eventsThen(ITEMS), 'explode101')).toBe(true);
  });

  test('Never emits one for a database that refuses it, and emits it for the others or to type', () => {
    const emitter = new QueryEmitter(eventsThen(ITEMS));
    const lambda = (databaseType?: string): unknown =>
      emitter.emitExecutionLambda({
        rowLimit: 1000,
        runtime: 'test::Runtime',
        databaseType,
      });
    expect(() => lambda('H2')).toThrow(
      MESSAGE_VARIANT_UNSUPPORTED_DATABASE('H2'),
    );
    expect(printIR(lambda('Snowflake') as never)).toContain('->lateral(');
    expect(printIR(lambda() as never)).toContain('->lateral(');
    expect(() => emitter.emitTypingLambda('explode101')).not.toThrow();
  });
});
