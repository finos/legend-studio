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
import { Distinct } from '../../nodes/transforms/Distinct.js';
import { Drop } from '../../nodes/transforms/Drop.js';
import { Filter } from '../../nodes/transforms/Filter.js';
import { Join } from '../../nodes/transforms/Join.js';
import { Limit } from '../../nodes/transforms/Limit.js';
import { Slice } from '../../nodes/transforms/Slice.js';
import { Sort, SortDirection } from '../../nodes/transforms/Sort.js';
import { SchemaColumn } from '../../schema/Schema.js';
import { OpaqueType } from '../../types/CubeType.js';
import {
  CUBE_DIALECT_WORKAROUNDS,
  getDialectWorkarounds,
  needsDatabaseType,
} from '../CubeDialects.js';
import { printIR } from '../IRPrinter.js';
import { QueryEmitter } from '../QueryEmitter.js';

const RUNTIME = 'test::Runtime';
const ORDERS = '#>{test::Northwind.NORTHWIND.ORDERS}#';
const COLUMNS = [column('ORDER_ID'), column('SHIP_COUNTRY', 'String', true)];

/** ORDERS (or a table with these columns), then the nodes, the last selected */
const ordersThen = (
  nodes: QueryNode[],
  columns: SchemaColumn[] = COLUMNS,
): Query => {
  const all = [resolvedTable('relational101', 'ORDERS', columns), ...nodes];
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

const byOrderIdDesc = (): Sort =>
  new Sort('sort101', [{ column: 'ORDER_ID', direction: SortDirection.DESC }]);

const run = (query: Query, databaseType?: string): string =>
  printIR(
    new QueryEmitter(query).emitExecutionLambda({
      rowLimit: 1000,
      runtime: RUNTIME,
      databaseType,
    }),
  );

const originsOf = (query: Query, databaseType: string): string[] =>
  listOrigins(
    new QueryEmitter(query).emitExecutionLambda({
      rowLimit: 1000,
      runtime: RUNTIME,
      databaseType,
    }),
  );

describe(unitTest('Dialect workarounds'), () => {
  test('Knows the databases that need them, and gives none to any other', () => {
    expect(Object.fromEntries(CUBE_DIALECT_WORKAROUNDS)).toEqual({
      SqlServer: { drop: true, slice: true, limit: false, distinct: true },
      Sybase: { drop: true, slice: true, limit: false, distinct: false },
      SybaseIQ: { drop: true, slice: true, limit: true, distinct: true },
      DB2: { drop: true, slice: false, limit: false, distinct: false },
      MemSQL: { drop: true, slice: false, limit: false, distinct: false },
      ClickHouse: { drop: true, slice: false, limit: false, distinct: false },
    });
    const none = { drop: false, slice: false, limit: false, distinct: false };
    // Spanner has no window columns, so never row numbers
    ['H2', 'Postgres', 'Snowflake', 'Spanner', 'BigQuery', 'sqlserver'].forEach(
      (databaseType) =>
        expect(getDialectWorkarounds(databaseType)).toEqual(none),
    );
    expect(getDialectWorkarounds(undefined)).toEqual(none);
    // the type comes from the model: never an object's prototype
    expect(getDialectWorkarounds('constructor')).toEqual(none);
    expect(getDialectWorkarounds('__proto__')).toEqual(none);
  });

  test('Needs the database type only when a Drop, Slice, Limit or Distinct runs', () => {
    expect(
      needsDatabaseType(ordersThen([new Drop('drop101', 5)]), 'drop101'),
    ).toBe(true);
    expect(
      needsDatabaseType(
        ordersThen([new Distinct('distinct101'), new Filter('filter101')]),
        'filter101',
      ),
    ).toBe(true);
    expect(
      needsDatabaseType(ordersThen([new Slice('slice101', 0, 5)]), 'slice101'),
    ).toBe(true);
    expect(
      needsDatabaseType(
        ordersThen([new Slice('slice101', 0, 5), new Filter('filter101')]),
        'filter101',
      ),
    ).toBe(true);
    expect(
      needsDatabaseType(
        ordersThen([byOrderIdDesc(), new Limit('limit101', 5)]),
        'limit101',
      ),
    ).toBe(true);
    expect(
      needsDatabaseType(
        ordersThen([byOrderIdDesc(), new Filter('filter101')]),
        'filter101',
      ),
    ).toBe(false);
    // a Slice after the node that runs plays no part
    expect(
      needsDatabaseType(
        ordersThen([new Filter('filter101'), new Slice('slice101', 0, 5)]),
        'filter101',
      ),
    ).toBe(false);
    // on either side of a join
    const join = new Query(
      [
        resolvedTable('relational101', 'ORDERS', COLUMNS),
        resolvedTable('relational102', 'CUSTOMERS', [column('ORDER_ID')]),
        new Drop('drop101', 5),
        new Join('join101', {
          leftColumns: ['ORDER_ID'],
          rightColumns: ['ORDER_ID'],
        }),
      ],
      [
        new Connection('relational102', 'drop101', 'tds'),
        new Connection('relational101', 'join101', 'leftTds'),
        new Connection('drop101', 'join101', 'rightTds'),
      ],
      'join101',
    );
    expect(needsDatabaseType(join, 'join101')).toBe(true);
    expect(needsDatabaseType(join, 'relational101')).toBe(false);
  });
});

describe(unitTest('Drop and Slice through row numbers'), () => {
  test("Numbers a Drop's rows in its input's order, and keeps those after the size, sorting nothing before", () => {
    const query = ordersThen([byOrderIdDesc(), new Drop('drop101', 10)]);
    expect(run(query, 'SqlServer')).toBe(
      `{| ${ORDERS}->extend([~ORDER_ID->descending()]->over(), ~[cube_rn: {p, w, r | $p->rowNumber($r)}])->filter({row | $row.cube_rn > 10})->select(~[ORDER_ID, SHIP_COUNTRY])->sort(~ORDER_ID->descending())->limit(1001)->from(${RUNTIME})}`,
    );
    expect(originsOf(query, 'SqlServer')).toEqual([
      'from@drop101:from',
      'limit@drop101:limit',
      'sort@drop101:captureSort',
      'select@drop101:select',
      'filter@drop101:rowRange',
      'extend@drop101:rowNumber',
      `${ORDERS}@relational101:accessor`,
      'over@drop101:rowNumber',
      'descending@sort101:sortKey',
      'rowNumber@drop101:rowNumber',
      'greaterThan@drop101:rowRange',
      '.cube_rn@drop101:rowRange',
      '10@drop101:rowRange',
      'descending@sort101:sortKey',
      '1001@drop101:limit',
    ]);
  });

  test("Numbers a Slice's rows and keeps those of its range: from 1, so (start, stop]", () => {
    const query = ordersThen([byOrderIdDesc(), new Slice('slice101', 10, 15)]);
    expect(run(query, 'Sybase')).toContain(
      `${ORDERS}->extend([~ORDER_ID->descending()]->over(), ~[cube_rn: {p, w, r | $p->rowNumber($r)}])->filter({row | ($row.cube_rn > 10) && ($row.cube_rn <= 15)})->select(~[ORDER_ID, SHIP_COUNTRY])`,
    );
    expect(originsOf(query, 'Sybase').filter((o) => o.includes('@-'))).toEqual(
      [],
    );
  });

  test('Numbers the rows by the first column that sorts when nothing orders them', () => {
    const columns = [
      new SchemaColumn('BLOB', OpaqueType.get('my::model::Blob'), true),
      ...COLUMNS,
    ];
    const query = ordersThen([new Drop('drop101', 10)], columns);
    expect(run(query, 'DB2')).toBe(
      `{| ${ORDERS}->extend([~ORDER_ID->ascending()]->over(), ~[cube_rn: {p, w, r | $p->rowNumber($r)}])->filter({row | $row.cube_rn > 10})->select(~[BLOB, ORDER_ID, SHIP_COUNTRY])->limit(1001)->from(${RUNTIME})}`,
    );
    // the default key is the Drop's own, not a Sort's
    expect(originsOf(query, 'DB2')).toContain('ascending@drop101:rowNumber');
  });

  test('Keeps the native form when no column sorts, for the engine to report', () => {
    const query = ordersThen(
      [new Drop('drop101', 10)],
      [new SchemaColumn('BLOB', OpaqueType.get('my::model::Blob'), true)],
    );
    expect(run(query, 'SqlServer')).toBe(
      `{| ${ORDERS}->drop(10)->limit(1001)->from(${RUNTIME})}`,
    );
  });

  test('Takes another name for the row numbers when the input has one in another case', () => {
    // SQL Server and MemSQL compare names without case: CUBE_RN takes cube_rn
    const columns = [...COLUMNS, column('CUBE_RN'), column('Cube_Rn2')];
    expect(
      run(ordersThen([new Drop('drop101', 10)], columns), 'SqlServer'),
    ).toContain(
      '~[cube_rn3: {p, w, r | $p->rowNumber($r)}])->filter({row | $row.cube_rn3 > 10})',
    );
  });

  test('Takes another name for the row numbers when the input has a cube_rn', () => {
    const columns = [...COLUMNS, column('cube_rn'), column('cube_rn2')];
    expect(
      run(ordersThen([new Drop('drop101', 10)], columns), 'MemSQL'),
    ).toContain(
      '~[cube_rn3: {p, w, r | $p->rowNumber($r)}])->filter({row | $row.cube_rn3 > 10})->select(~[ORDER_ID, SHIP_COUNTRY, cube_rn, cube_rn2])',
    );
  });

  test('Writes only what the database needs another way', () => {
    // DB2 and MemSQL skip rows in a Slice, not in a Drop
    const slice = ordersThen([byOrderIdDesc(), new Slice('slice101', 10, 15)]);
    ['DB2', 'MemSQL', 'H2', 'Postgres', 'Spanner'].forEach((databaseType) =>
      expect(run(slice, databaseType)).toContain(
        `${ORDERS}->sort(~ORDER_ID->descending())->slice(10, 15)`,
      ),
    );
    const drop = ordersThen([new Drop('drop101', 10)]);
    expect(run(drop)).toContain(`${ORDERS}->drop(10)`);
    expect(run(drop, 'Postgres')).toContain(`${ORDERS}->drop(10)`);
  });

  test('Takes a Limit after a Sort on several columns by row numbers on Sybase IQ, which plans it by the first key only', () => {
    const byCountryThenId = new Sort('sort101', [
      { column: 'SHIP_COUNTRY', direction: SortDirection.ASC },
      { column: 'ORDER_ID', direction: SortDirection.DESC },
    ]);
    const query = ordersThen([byCountryThenId, new Limit('limit101', 5)]);
    expect(run(query, 'SybaseIQ')).toBe(
      `{| ${ORDERS}->extend([~SHIP_COUNTRY->ascending(), ~ORDER_ID->descending()]->over(), ~[cube_rn: {p, w, r | $p->rowNumber($r)}])->filter({row | $row.cube_rn <= 5})->select(~[ORDER_ID, SHIP_COUNTRY])->sort([~SHIP_COUNTRY->ascending(), ~ORDER_ID->descending()])->limit(1001)->from(${RUNTIME})}`,
    );
    expect(originsOf(query, 'SybaseIQ')).toContain(
      'lessThanEqual@limit101:rowRange',
    );
    expect(
      originsOf(query, 'SybaseIQ').filter((origin) => origin.endsWith('@-')),
    ).toEqual([]);
    // other databases plan it right
    ['SqlServer', 'Sybase', 'MemSQL', 'H2'].forEach((databaseType) =>
      expect(run(query, databaseType)).toContain(
        `${ORDERS}->sort([~SHIP_COUNTRY->ascending(), ~ORDER_ID->descending()])->limit(5)`,
      ),
    );
  });

  test('Takes every Limit by row numbers on Sybase IQ: unsorted by the first column that sorts, else by its order', () => {
    expect(run(ordersThen([new Limit('limit101', 5)]), 'SybaseIQ')).toBe(
      `{| ${ORDERS}->extend([~ORDER_ID->ascending()]->over(), ~[cube_rn: {p, w, r | $p->rowNumber($r)}])->filter({row | $row.cube_rn <= 5})->select(~[ORDER_ID, SHIP_COUNTRY])->limit(1001)->from(${RUNTIME})}`,
    );
    expect(
      run(ordersThen([byOrderIdDesc(), new Limit('limit101', 5)]), 'SybaseIQ'),
    ).toContain(
      `${ORDERS}->extend([~ORDER_ID->descending()]->over(), ~[cube_rn: {p, w, r | $p->rowNumber($r)}])->filter({row | $row.cube_rn <= 5})`,
    );
  });

  test('Names its row numbers around a ROW_NUMBER column on Sybase IQ, where the engine would add a second one', () => {
    const columns = [...COLUMNS, column('ROW_NUMBER')];
    const sql = run(
      ordersThen([new Limit('limit101', 5)], columns),
      'SybaseIQ',
    );
    expect(sql).toContain('~[cube_rn: {p, w, r | $p->rowNumber($r)}]');
    expect(sql).not.toContain('->limit(5)');
  });

  test('Takes a Drop by row numbers on ClickHouse, whose engine SQL runs a descending key into the offset', () => {
    expect(
      run(ordersThen([byOrderIdDesc(), new Drop('drop101', 10)]), 'ClickHouse'),
    ).toContain(
      `${ORDERS}->extend([~ORDER_ID->descending()]->over(), ~[cube_rn: {p, w, r | $p->rowNumber($r)}])->filter({row | $row.cube_rn > 10})`,
    );
    expect(
      run(
        ordersThen([byOrderIdDesc(), new Slice('slice101', 0, 5)]),
        'ClickHouse',
      ),
    ).toContain('->slice(0, 5)');
  });

  test('Types the native form: typing knows no database', () => {
    const query = ordersThen([byOrderIdDesc(), new Drop('drop101', 10)]);
    expect(printIR(new QueryEmitter(query).emitTypingLambda('drop101'))).toBe(
      `{| ${ORDERS}->drop(10)}`,
    );
  });
});

describe(unitTest('Distinct on SQL Server'), () => {
  test('Pads a distinct with a column, so the engine keeps it in its own query', () => {
    const query = ordersThen([new Distinct('distinct101')]);
    expect(run(query, 'SqlServer')).toBe(
      `{| ${ORDERS}->distinct()->extend(~cube_d: x | 1)->select(~[ORDER_ID, SHIP_COUNTRY])->limit(1001)->from(${RUNTIME})}`,
    );
    expect(originsOf(query, 'SqlServer')).toEqual([
      'from@distinct101:from',
      'limit@distinct101:limit',
      'select@distinct101:select',
      'extend@distinct101:distinct',
      'distinct@distinct101:distinct',
      `${ORDERS}@relational101:accessor`,
      '1@distinct101:distinct',
      '1001@distinct101:limit',
    ]);
  });

  test('Pads on Sybase IQ too, which numbers a later Limit inside the select distinct', () => {
    const query = ordersThen([
      new Distinct('distinct101'),
      new Limit('limit101', 5),
    ]);
    // the Limit is numbered too, outside the padded distinct
    expect(run(query, 'SybaseIQ')).toBe(
      `{| ${ORDERS}->distinct()->extend(~cube_d: x | 1)->select(~[ORDER_ID, SHIP_COUNTRY])->extend([~ORDER_ID->ascending()]->over(), ~[cube_rn: {p, w, r | $p->rowNumber($r)}])->filter({row | $row.cube_rn <= 5})->select(~[ORDER_ID, SHIP_COUNTRY])->limit(1001)->from(${RUNTIME})}`,
    );
  });

  test('Pads only on SQL Server and Sybase IQ, and never to type', () => {
    const query = ordersThen([new Distinct('distinct101')]);
    ['Sybase', 'H2', 'DB2', 'MemSQL'].forEach((databaseType) =>
      expect(run(query, databaseType)).toBe(
        `{| ${ORDERS}->distinct()->limit(1001)->from(${RUNTIME})}`,
      ),
    );
    expect(
      printIR(new QueryEmitter(query).emitTypingLambda('distinct101')),
    ).toBe(`{| ${ORDERS}->distinct()}`);
  });

  test('Takes another name for the row numbers when the input has one in another width', () => {
    // a fullwidth ｃｕｂｅ_ｒｎ is cube_rn to a width-insensitive collation
    expect(
      run(
        ordersThen(
          [new Drop('drop101', 10)],
          [...COLUMNS, column('ｃｕｂｅ_ｒｎ')],
        ),
        'SqlServer',
      ),
    ).toContain('~[cube_rn2: {p, w, r | $p->rowNumber($r)}]');
  });

  test('Takes another name for the pad when the input has one in another case', () => {
    expect(
      run(
        ordersThen(
          [new Distinct('distinct101')],
          [...COLUMNS, column('Cube_D')],
        ),
        'SqlServer',
      ),
    ).toContain('->distinct()->extend(~cube_d2: x | 1)');
  });

  test('Takes another name for the pad when the input has a cube_d', () => {
    expect(
      run(
        ordersThen(
          [new Distinct('distinct101')],
          [...COLUMNS, column('cube_d')],
        ),
        'SqlServer',
      ),
    ).toContain(
      '->distinct()->extend(~cube_d2: x | 1)->select(~[ORDER_ID, SHIP_COUNTRY, cube_d])',
    );
  });
});
