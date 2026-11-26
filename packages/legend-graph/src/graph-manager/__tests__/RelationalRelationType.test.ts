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

import { beforeAll, describe, expect, test } from '@jest/globals';
import { unitTest } from '@finos/legend-shared/test';
import {
  type PlainObject,
  guaranteeNonNullable,
  guaranteeType,
} from '@finos/legend-shared';
import type { Entity } from '@finos/legend-storage';
import {
  TEST__buildGraphWithEntities,
  TEST__getTestGraphManagerState,
} from '../__test-utils__/GraphManagerTestUtils.js';
import {
  RELATIONAL_COLUMN_TYPE_NOTE,
  buildRelationTypeFromRelationalRelation,
} from '../../graph/helpers/STO_Relational_RelationTypeHelper.js';
import { PrimitiveInstanceValue } from '../../graph/metamodel/pure/valueSpecification/InstanceValue.js';
import type { RelationType } from '../../graph/metamodel/pure/packageableElements/relation/RelationType.js';
import type { Schema } from '../../graph/metamodel/pure/packageableElements/store/relational/model/Schema.js';
import { Table } from '../../graph/metamodel/pure/packageableElements/store/relational/model/Table.js';
import { View } from '../../graph/metamodel/pure/packageableElements/store/relational/model/View.js';
import { Column } from '../../graph/metamodel/pure/packageableElements/store/relational/model/Column.js';
import { VarChar } from '../../graph/metamodel/pure/packageableElements/store/relational/model/RelationalDataType.js';

const buildColumn = (
  name: string,
  type: PlainObject,
  nullable?: boolean,
  extra?: PlainObject,
): PlainObject => ({
  name,
  type,
  ...(nullable === undefined ? {} : { nullable }),
  stereotypes: [],
  taggedValues: [],
  ...extra,
});

const TEST_DATA__entities: Entity[] = [
  {
    path: 'test::Doc',
    classifierPath: 'meta::pure::metamodel::extension::Profile',
    content: {
      _type: 'profile',
      name: 'Doc',
      package: 'test',
      stereotypes: [{ value: 'important' }],
      tags: [{ value: 'note' }],
    },
  },
  {
    path: 'test::TypesDb',
    classifierPath: 'meta::relational::metamodel::Database',
    content: {
      _type: 'relational',
      name: 'TypesDb',
      package: 'test',
      filters: [],
      joins: [],
      schemas: [
        {
          name: 'S',
          tables: [
            {
              name: 'T',
              primaryKey: [],
              columns: [
                buildColumn('VC', { _type: 'Varchar', size: 10 }, true, {
                  stereotypes: [{ profile: 'test::Doc', value: 'important' }],
                  taggedValues: [
                    {
                      tag: { profile: 'test::Doc', value: 'note' },
                      value: 'a note',
                    },
                  ],
                }),
                buildColumn('CH', { _type: 'Char', size: 5 }, true),
                buildColumn('I', { _type: 'Integer' }, false),
                // no `nullable`: the engine reads it as `false`
                buildColumn('NO_FLAG', { _type: 'Integer' }),
                buildColumn('F', { _type: 'Float' }, true),
                buildColumn('R', { _type: 'Real' }, true),
                buildColumn(
                  'DEC',
                  { _type: 'Decimal', precision: 10, scale: 2 },
                  true,
                ),
                buildColumn('TS', { _type: 'Timestamp' }, true),
                buildColumn('B', { _type: 'Bit' }, true),
                buildColumn('O', { _type: 'Other' }, true),
                buildColumn('J', { _type: 'Json' }, true),
                buildColumn('"quoted col"', { _type: 'Varchar', size: 3 }),
              ],
            },
            {
              name: 'BIN',
              primaryKey: [],
              columns: [buildColumn('PAYLOAD', { _type: 'Binary', size: 16 })],
            },
            {
              name: 'VARBIN',
              primaryKey: [],
              columns: [
                buildColumn('PAYLOAD', { _type: 'Varbinary', size: 16 }),
              ],
            },
          ],
          views: [],
        },
      ],
    },
  },
];

const graphManagerState = TEST__getTestGraphManagerState();

beforeAll(async () => {
  await TEST__buildGraphWithEntities(graphManagerState, TEST_DATA__entities);
});

const getSchema = (): Schema =>
  guaranteeNonNullable(
    graphManagerState.graph
      .getDatabase('test::TypesDb')
      .schemas.find((schema) => schema.name === 'S'),
  );

const getTable = (name: string): Table =>
  guaranteeNonNullable(getSchema().tables.find((table) => table.name === name));

// name, type path, type parameters and multiplicity of each column
const describeColumns = (relationType: RelationType): unknown[] =>
  relationType.columns.map((column) => [
    column.name,
    column.genericType.value.rawType,
    (column.genericType.value.typeVariableValues ?? []).map(
      (value) => guaranteeType(value, PrimitiveInstanceValue).values[0],
    ),
    [column.multiplicity.lowerBound, column.multiplicity.upperBound],
  ]);

const type = (path: string) => graphManagerState.graph.getType(path);

describe(unitTest('buildRelationTypeFromRelationalRelation'), () => {
  test('types table columns as the engine does', () => {
    const { relationType, columnNotes } =
      buildRelationTypeFromRelationalRelation(
        getTable('T'),
        graphManagerState.graph,
      );

    expect(describeColumns(relationType)).toEqual([
      ['VC', type('meta::pure::precisePrimitives::Varchar'), [10], [0, 1]],
      // the engine drops the length
      ['CH', type('meta::pure::precisePrimitives::Varchar'), [1], [0, 1]],
      ['I', type('meta::pure::precisePrimitives::Int'), [], [1, 1]],
      ['NO_FLAG', type('meta::pure::precisePrimitives::Int'), [], [1, 1]],
      ['F', type('meta::pure::precisePrimitives::Float4'), [], [0, 1]],
      ['R', type('meta::pure::precisePrimitives::Double'), [], [0, 1]],
      ['DEC', type('meta::pure::precisePrimitives::Numeric'), [10, 2], [0, 1]],
      ['TS', type('meta::pure::precisePrimitives::Timestamp'), [], [0, 1]],
      ['B', type('Boolean'), [], [0, 1]],
      ['O', type('String'), [], [0, 1]],
      ['J', type('meta::pure::metamodel::variant::Variant'), [], [0, 1]],
      // one pair of quotes is stripped
      [
        'quoted col',
        type('meta::pure::precisePrimitives::Varchar'),
        [3],
        [1, 1],
      ],
    ]);
    expect(Array.from(columnNotes.entries())).toEqual([
      ['CH', RELATIONAL_COLUMN_TYPE_NOTE.CHAR_LENGTH_DROPPED],
      ['O', RELATIONAL_COLUMN_TYPE_NOTE.TYPE_UNKNOWN],
    ]);
  });

  test('keeps column stereotypes and tagged values', () => {
    const vc = guaranteeNonNullable(
      buildRelationTypeFromRelationalRelation(
        getTable('T'),
        graphManagerState.graph,
      ).relationType.columns[0],
    );

    expect(vc.stereotypes.map((stereotype) => stereotype.value.value)).toEqual([
      'important',
    ]);
    expect(
      vc.taggedValues.map((taggedValue) => [
        taggedValue.tag.value.value,
        taggedValue.value,
      ]),
    ).toEqual([['note', 'a note']]);
  });

  test('types every view column Varchar(0)[0..1], as the engine does', () => {
    const view = new View('V', getSchema());
    const id = new Column();
    id.name = 'ID';
    id.type = new VarChar(50);
    id.nullable = false;
    id.owner = view;
    view.columns = [id];

    const { relationType, columnNotes } =
      buildRelationTypeFromRelationalRelation(view, graphManagerState.graph);

    expect(describeColumns(relationType)).toEqual([
      ['ID', type('meta::pure::precisePrimitives::Varchar'), [0], [0, 1]],
    ]);
    expect(columnNotes.get('ID')).toBe(
      RELATIONAL_COLUMN_TYPE_NOTE.VIEW_COLUMN_UNTYPED,
    );
  });

  test('throws for a table the engine cannot type', () => {
    expect(() =>
      buildRelationTypeFromRelationalRelation(
        getTable('BIN'),
        graphManagerState.graph,
      ),
    ).toThrow(
      `Can't type column 'PAYLOAD' of table 'S.BIN' as the engine does: the engine can't type a BINARY or VARBINARY column`,
    );
    expect(() =>
      buildRelationTypeFromRelationalRelation(
        getTable('VARBIN'),
        graphManagerState.graph,
      ),
    ).toThrow(`Can't type column 'PAYLOAD' of table 'S.VARBIN'`);

    // a generated Lakehouse table has columns without a type
    const untyped = new Table('GENERATED', getSchema());
    const column = new Column();
    column.name = 'X';
    column.owner = untyped;
    untyped.columns = [column];
    expect(() =>
      buildRelationTypeFromRelationalRelation(untyped, graphManagerState.graph),
    ).toThrow(
      `Can't type column 'X' of table 'S.GENERATED' as the engine does: the column has no type`,
    );
  });
});
