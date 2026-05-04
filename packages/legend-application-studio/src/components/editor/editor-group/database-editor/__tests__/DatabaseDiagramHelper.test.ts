/**
 * Copyright (c) 2020-present, Goldman Sachs
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

import { describe, test, expect } from '@jest/globals';
import { Pair } from '@finos/legend-shared';
import { unitTest } from '@finos/legend-shared/test';
import {
  Column,
  ColumnExplicitReference,
  Database,
  DynaFunction,
  Integer,
  Join,
  Schema,
  Table,
  TableAlias,
  TableAliasColumn,
  TableExplicitReference,
  VarChar,
  View,
} from '@finos/legend-graph';
import {
  FILTER_FORMULA_PLACEHOLDER,
  JOIN_FORMULA_PLACEHOLDER,
  VIEW_COLUMN_FORMULA_PLACEHOLDER,
  VIEW_GROUP_BY_FORMULA_PLACEHOLDER,
  buildJoinEdges,
  collectForeignKeyColumns,
  estimateNodeHeight,
  getColumnTypeLabel,
  getOrderedRelations,
  getRelationColumnCount,
  getRelationId,
  getTableColumns,
  isCrossDatabaseJoin,
  isPrimaryKey,
  isSelfJoin,
  isView,
  layoutDatabaseDiagram,
  resolveFilterFormula,
  resolveJoinFormula,
  resolveViewColumnFormula,
  resolveViewGroupByFormula,
  type DatabaseDiagramRelationNode,
} from '../DatabaseDiagramHelper.js';

/**
 * Helpers to build a small in-memory `Database` graph without going through
 * the engine or graph manager. Real metamodel instances are required because
 * `DatabaseDiagramHelper` uses `instanceof Column` and `instanceof View`.
 */

const makeColumn = (
  owner: Table | View,
  name: string,
  type: Integer | VarChar = new Integer(),
): Column => {
  const column = new Column();
  column.name = name;
  column.type = type;
  column.owner = owner;
  return column;
};

const makeAlias = (name: string, table: Table): TableAlias => {
  const alias = new TableAlias();
  alias.name = name;
  alias.relation = TableExplicitReference.create(table);
  return alias;
};

const makeAliasColumn = (
  alias: TableAlias,
  column: Column,
): TableAliasColumn => {
  const ref = new TableAliasColumn();
  ref.alias = alias;
  ref.column = ColumnExplicitReference.create(column);
  ref.columnName = column.name;
  return ref;
};

interface TestFixture {
  database: Database;
  schemaA: Schema;
  schemaB: Schema;
  person: Table;
  personId: Column;
  personName: Column;
  order: Table;
  orderId: Column;
  orderPersonId: Column;
  product: Table;
  productId: Column;
  personView: View;
  personOrderJoin: Join;
}

const buildTestDatabase = (): TestFixture => {
  const database = new Database('TestDB');

  // Schema "sales" — contains tables Person and Order plus a view.
  const schemaA = new Schema('sales', database);
  // Schema "catalog" — contains table Product. Used to verify that schemas
  // are sorted alphabetically (catalog < sales).
  const schemaB = new Schema('catalog', database);
  database.schemas = [schemaA, schemaB];

  // Person table
  const person = new Table('Person', schemaA);
  const personId = makeColumn(person, 'id', new Integer());
  const personName = makeColumn(person, 'name', new VarChar(100));
  person.columns = [personId, personName];
  person.primaryKey = [personId];

  // Order table — has FK-like column person_id
  const order = new Table('Order', schemaA);
  const orderId = makeColumn(order, 'id', new Integer());
  const orderPersonId = makeColumn(order, 'person_id', new Integer());
  order.columns = [orderId, orderPersonId];
  order.primaryKey = [orderId];

  schemaA.tables = [order, person]; // intentionally unsorted

  // PersonView — a view in schema "sales"
  const personView = new View('PersonView', schemaA);
  const viewIdCol = makeColumn(personView, 'id', new VarChar(50));
  personView.columns = [viewIdCol];
  personView.primaryKey = [viewIdCol];
  // `getRelationColumnCount` only reads `length` on `columnMappings`, so for
  // pure-helper tests we don't need real `ColumnMapping` instances.
  personView.columnMappings = [{} as never, {} as never, {} as never];
  schemaA.views = [personView];

  // Product table in the other schema
  const product = new Table('Product', schemaB);
  const productId = makeColumn(product, 'id', new Integer());
  product.columns = [productId];
  product.primaryKey = [productId];
  schemaB.tables = [product];

  // Person ↔ Order join (operation = (person.id = order.person_id))
  const pAlias = makeAlias('p', person);
  const oAlias = makeAlias('o', order);

  const lhs = makeAliasColumn(pAlias, personId);
  const rhs = makeAliasColumn(oAlias, orderPersonId);

  const eqOp = new DynaFunction('equal');
  eqOp.parameters = [lhs, rhs];

  const personOrderJoin = new Join('Person_Order');
  personOrderJoin.owner = database;
  personOrderJoin.operation = eqOp;
  // Mirrors how the V1 builder populates aliases — both directions.
  personOrderJoin.aliases = [
    new Pair(pAlias, oAlias),
    new Pair(oAlias, pAlias),
  ];

  database.joins = [personOrderJoin];

  return {
    database,
    schemaA,
    schemaB,
    person,
    personId,
    personName,
    order,
    orderId,
    orderPersonId,
    product,
    productId,
    personView,
    personOrderJoin,
  };
};

describe('DatabaseDiagramHelper', () => {
  test(unitTest('isView discriminates Table vs. View'), () => {
    const { person, personView } = buildTestDatabase();
    expect(isView(person)).toBe(false);
    expect(isView(personView)).toBe(true);
  });

  test(unitTest('getRelationId returns schema-qualified identifier'), () => {
    const { person, personView } = buildTestDatabase();
    expect(getRelationId(person)).toBe('sales.Person');
    expect(getRelationId(personView)).toBe('sales.PersonView');
  });

  test(unitTest('getColumnTypeLabel returns a non-empty type label'), () => {
    const { personId, personName } = buildTestDatabase();
    // We don't pin the exact format (that is owned by `stringifyDataType`),
    // but it should be a non-empty string mentioning the type name.
    const intLabel = getColumnTypeLabel(personId);
    const varcharLabel = getColumnTypeLabel(personName);
    expect(intLabel.length).toBeGreaterThan(0);
    expect(varcharLabel.length).toBeGreaterThan(0);
    expect(varcharLabel.toUpperCase()).toContain('VARCHAR');
  });

  test(
    unitTest(
      'getTableColumns returns only Column instances, ignoring foreign elements',
    ),
    () => {
      const { person, personId, personName } = buildTestDatabase();
      // Inject a non-Column RelationalOperationElement to simulate the
      // looser typing of `Relation.columns` and verify it gets filtered out.
      const stray = new DynaFunction('not-a-column');
      person.columns = [personId, stray, personName];
      const result = getTableColumns(person);
      expect(result).toHaveLength(2);
      expect(result).toEqual([personId, personName]);
    },
  );

  test(unitTest('isPrimaryKey checks PK membership by column name'), () => {
    const { person, personView } = buildTestDatabase();
    expect(isPrimaryKey(person, 'id')).toBe(true);
    expect(isPrimaryKey(person, 'name')).toBe(false);
    expect(isPrimaryKey(person, 'missing')).toBe(false);
    // Views share the same PK semantics.
    expect(isPrimaryKey(personView, 'id')).toBe(true);
  });

  test(
    unitTest('resolveViewColumnFormula returns mapped value or placeholder'),
    () => {
      const formulas = new Map<string, string>([
        ['sales.PersonView.id', '$src.id->toString()'],
      ]);
      expect(
        resolveViewColumnFormula(formulas, 'sales', 'PersonView', 'id'),
      ).toBe('$src.id->toString()');
      expect(
        resolveViewColumnFormula(formulas, 'sales', 'PersonView', 'name'),
      ).toBe(VIEW_COLUMN_FORMULA_PLACEHOLDER);
      expect(resolveViewColumnFormula(new Map(), 'x', 'y', 'z')).toBe(
        VIEW_COLUMN_FORMULA_PLACEHOLDER,
      );
    },
  );

  test(
    unitTest('resolveFilterFormula returns mapped value or placeholder'),
    () => {
      const formulas = new Map<string, string>([
        ['ActiveOnly', '$x.active == true'],
      ]);
      expect(resolveFilterFormula(formulas, 'ActiveOnly')).toBe(
        '$x.active == true',
      );
      expect(resolveFilterFormula(formulas, 'Missing')).toBe(
        FILTER_FORMULA_PLACEHOLDER,
      );
    },
  );

  test(
    unitTest('resolveJoinFormula returns mapped value or placeholder'),
    () => {
      const formulas = new Map<string, string>([
        ['Person_Order', 'p.id == o.person_id'],
      ]);
      expect(resolveJoinFormula(formulas, 'Person_Order')).toBe(
        'p.id == o.person_id',
      );
      expect(resolveJoinFormula(formulas, 'Missing')).toBe(
        JOIN_FORMULA_PLACEHOLDER,
      );
    },
  );

  test(
    unitTest('resolveViewGroupByFormula returns mapped value or placeholder'),
    () => {
      const formulas = new Map<string, string>([
        ['sales.PersonView.groupBy[0]', '$x.id'],
        ['sales.PersonView.groupBy[1]', '$x.region'],
      ]);
      expect(
        resolveViewGroupByFormula(formulas, 'sales', 'PersonView', 0),
      ).toBe('$x.id');
      expect(
        resolveViewGroupByFormula(formulas, 'sales', 'PersonView', 1),
      ).toBe('$x.region');
      // Missing index falls back to the placeholder.
      expect(
        resolveViewGroupByFormula(formulas, 'sales', 'PersonView', 2),
      ).toBe(VIEW_GROUP_BY_FORMULA_PLACEHOLDER);
      // Wrong view name also misses cleanly.
      expect(resolveViewGroupByFormula(formulas, 'x', 'y', 0)).toBe(
        VIEW_GROUP_BY_FORMULA_PLACEHOLDER,
      );
    },
  );

  test(
    unitTest('getRelationColumnCount counts table columns or view mappings'),
    () => {
      const { person, personView } = buildTestDatabase();
      expect(getRelationColumnCount(person)).toBe(2);
      // The view fixture has 3 columnMappings.
      expect(getRelationColumnCount(personView)).toBe(3);
    },
  );

  test(
    unitTest(
      'collectForeignKeyColumns walks join operation parameters recursively',
    ),
    () => {
      const { database, personId, orderPersonId, person, personName } =
        buildTestDatabase();

      const fkColumns = collectForeignKeyColumns(database);
      // Both join endpoints are FK-like.
      expect(fkColumns.has(personId)).toBe(true);
      expect(fkColumns.has(orderPersonId)).toBe(true);
      // Columns not referenced by any join operation are NOT FK-like.
      expect(fkColumns.has(personName)).toBe(false);

      // Add a nested operation (e.g. AND(eq, eq)) to verify recursion.
      const pAlias = makeAlias('p', person);
      const lhs = makeAliasColumn(pAlias, personName);
      const rhs = makeAliasColumn(pAlias, personName);
      const inner = new DynaFunction('equal');
      inner.parameters = [lhs, rhs];

      const outer = new DynaFunction('and');
      outer.parameters = [inner];

      const nestedJoin = new Join('Nested');
      nestedJoin.owner = database;
      nestedJoin.operation = outer;
      nestedJoin.aliases = [new Pair(pAlias, pAlias)];
      database.joins = [...database.joins, nestedJoin];

      const refreshed = collectForeignKeyColumns(database);
      expect(refreshed.has(personName)).toBe(true);
    },
  );

  describe(unitTest('buildJoinEdges'), () => {
    test('produces one edge per join with stable id and endpoint ids', () => {
      const { database, personOrderJoin } = buildTestDatabase();
      const { edges, foreignStubs } = buildJoinEdges(database);
      expect(foreignStubs).toEqual([]);
      expect(edges).toHaveLength(1);
      const edge = edges[0];
      expect(edge?.id).toBe('join:Person_Order');
      expect(edge?.name).toBe('Person_Order');
      expect(edge?.source).toBe('sales.Person');
      expect(edge?.target).toBe('sales.Order');
      expect(edge?.join).toBe(personOrderJoin);
      expect(edge?.isSelfJoin).toBe(false);
      expect(edge?.isCrossDatabase).toBe(false);
    });

    test('skips joins with no aliases', () => {
      const { database } = buildTestDatabase();
      const empty = new Join('Empty');
      empty.owner = database;
      empty.operation = new DynaFunction('noop');
      empty.aliases = [];
      database.joins = [empty];

      const { edges, foreignStubs } = buildJoinEdges(database);
      expect(edges).toHaveLength(0);
      expect(foreignStubs).toHaveLength(0);
    });

    test('renders self-joins (source === target) as loop edges', () => {
      const { database, person } = buildTestDatabase();
      const alias = makeAlias('a', person);
      const selfJoin = new Join('Self');
      selfJoin.owner = database;
      selfJoin.operation = new DynaFunction('equal');
      selfJoin.aliases = [new Pair(alias, alias)];
      database.joins = [selfJoin];

      const { edges, foreignStubs } = buildJoinEdges(database);
      expect(foreignStubs).toHaveLength(0);
      expect(edges).toHaveLength(1);
      const edge = edges[0];
      expect(edge?.isSelfJoin).toBe(true);
      expect(edge?.source).toBe('sales.Person');
      expect(edge?.target).toBe('sales.Person');
    });

    test('renders cross-database joins via a foreign-relation stub', () => {
      const { database, person } = buildTestDatabase();

      // Build a foreign table that lives in a different database.
      const otherDb = new Database('OtherDB');
      const otherSchema = new Schema('public', otherDb);
      otherDb.schemas = [otherSchema];
      const foreign = new Table('Foreign', otherSchema);
      otherSchema.tables = [foreign];

      const localAlias = makeAlias('p', person);
      const foreignAlias = makeAlias('f', foreign);

      const crossJoin = new Join('Cross');
      crossJoin.owner = database;
      crossJoin.operation = new DynaFunction('equal');
      crossJoin.aliases = [new Pair(localAlias, foreignAlias)];
      database.joins = [crossJoin];

      const { edges, foreignStubs } = buildJoinEdges(database);
      expect(edges).toHaveLength(1);
      const edge = edges[0];
      expect(edge?.isCrossDatabase).toBe(true);
      expect(edge?.isSelfJoin).toBe(false);
      expect(edge?.source).toBe('sales.Person');
      // Target was rewritten to a synthetic stub id pointing at OtherDB.
      expect(edge?.target).toMatch(/^__foreign__:OtherDB::public\.Foreign$/);
      expect(foreignStubs).toHaveLength(1);
      expect(foreignStubs[0]?.schemaName).toBe('public');
      expect(foreignStubs[0]?.relationName).toBe('Foreign');
      expect(foreignStubs[0]?.ownerPath).toBe('OtherDB');
    });
  });

  test(
    unitTest('isSelfJoin returns true only when both endpoints match'),
    () => {
      const { database, person, personOrderJoin } = buildTestDatabase();
      expect(isSelfJoin(personOrderJoin)).toBe(false);

      const alias = makeAlias('a', person);
      const selfJoin = new Join('Self');
      selfJoin.owner = database;
      selfJoin.operation = new DynaFunction('equal');
      selfJoin.aliases = [new Pair(alias, alias)];
      expect(isSelfJoin(selfJoin)).toBe(true);
    },
  );

  test(
    unitTest(
      'isCrossDatabaseJoin returns true when an endpoint lives outside the database',
    ),
    () => {
      const { database, person, personOrderJoin } = buildTestDatabase();
      expect(isCrossDatabaseJoin(personOrderJoin, database)).toBe(false);

      const otherDb = new Database('OtherDB');
      const otherSchema = new Schema('public', otherDb);
      otherDb.schemas = [otherSchema];
      const foreign = new Table('Foreign', otherSchema);
      otherSchema.tables = [foreign];

      const localAlias = makeAlias('p', person);
      const foreignAlias = makeAlias('f', foreign);
      const crossJoin = new Join('Cross');
      crossJoin.owner = database;
      crossJoin.operation = new DynaFunction('equal');
      crossJoin.aliases = [new Pair(localAlias, foreignAlias)];

      expect(isCrossDatabaseJoin(crossJoin, database)).toBe(true);
    },
  );

  test(unitTest('estimateNodeHeight grows linearly with column count'), () => {
    const { person, personView } = buildTestDatabase();
    const tableHeight = estimateNodeHeight(person);
    const viewHeight = estimateNodeHeight(personView);
    // Height must be positive and views (3 mappings) > tables (2 columns).
    expect(tableHeight).toBeGreaterThan(0);
    expect(viewHeight).toBeGreaterThan(tableHeight);
  });

  describe(unitTest('layoutDatabaseDiagram'), () => {
    test('returns positions for every input node', () => {
      const { database } = buildTestDatabase();
      const ordered = getOrderedRelations(database);
      const nodes: DatabaseDiagramRelationNode[] = ordered.map(
        ({ relation }) => ({
          id: getRelationId(relation),
          relation,
          estimatedHeight: estimateNodeHeight(relation),
        }),
      );
      const edges = buildJoinEdges(database).edges;
      const layout = layoutDatabaseDiagram(nodes, edges);

      expect(layout.size).toBe(nodes.length);
      nodes.forEach((node) => {
        const pos = layout.get(node.id);
        expect(pos).toBeDefined();
        expect(typeof pos?.x).toBe('number');
        expect(typeof pos?.y).toBe('number');
        expect(Number.isFinite(pos?.x)).toBe(true);
        expect(Number.isFinite(pos?.y)).toBe(true);
      });
    });

    test('handles an empty graph without throwing', () => {
      const layout = layoutDatabaseDiagram([], []);
      expect(layout.size).toBe(0);
    });
  });

  test(
    unitTest(
      'getOrderedRelations sorts schemas, then tables, then views alphabetically',
    ),
    () => {
      const { database } = buildTestDatabase();
      const ordered = getOrderedRelations(database);
      const ids = ordered.map(({ relation }) => getRelationId(relation));
      // Expected order:
      //   catalog (schema sorted before sales)
      //     Product (table)
      //   sales
      //     Order, Person (tables, alphabetic)
      //     PersonView (view, after tables)
      expect(ids).toEqual([
        'catalog.Product',
        'sales.Order',
        'sales.Person',
        'sales.PersonView',
      ]);
    },
  );
});
