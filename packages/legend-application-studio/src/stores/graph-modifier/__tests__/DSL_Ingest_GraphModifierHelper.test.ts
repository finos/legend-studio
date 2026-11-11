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

import { test, expect } from '@jest/globals';
import { unitTest } from '@finos/legend-shared/test';
import {
  TEST__buildGraphWithEntities,
  TEST__getTestGraphManagerState,
} from '@finos/legend-graph/test';
import {
  ExtendedIngestDefinition,
  IngestDefinition,
} from '@finos/legend-graph';
import type { PlainObject } from '@finos/legend-shared';
import type { Entity } from '@finos/legend-storage';
import {
  getIngestDataSets,
  getIngestMaterializedViewReads,
  getIngestMaterializedViews,
  ingestDefinition_addMaterializedView,
  ingestDefinition_updateMaterializedView,
  type IngestDataSet,
} from '../DSL_Ingest_GraphModifierHelper.js';

const INGEST_PATH = 'model::PersonIngest';
const CLASSIFIER_PATH =
  'meta::external::ingest::specification::metamodel::IngestDefinition';

const buildEntities = (_type: string): Entity[] => [
  {
    path: INGEST_PATH,
    classifierPath: CLASSIFIER_PATH,
    content: {
      _type,
      batchAttributesGenerator: {
        _type: 'packageableElementPointer',
        path: 'model::batchAttributes__Any_1_',
      },
      datasets: [],
      name: 'PersonIngest',
      package: 'model',
    },
  },
];

const LAMBDA = {
  _type: 'lambda',
  body: [{ _type: 'string', value: 'a' }],
  parameters: [],
};
const OPTIONS = { primaryKey: [], sensitivity: 'DP10' };

test(
  unitTest('Editing an extended ingest definition keeps its _type'),
  async () => {
    const graphManagerState = TEST__getTestGraphManagerState();
    await TEST__buildGraphWithEntities(
      graphManagerState,
      buildEntities('extendedIngestDefinition'),
    );
    const ingest = graphManagerState.graph.getIngestDefinition(INGEST_PATH);
    expect(ingest).toBeInstanceOf(ExtendedIngestDefinition);

    ingestDefinition_addMaterializedView(ingest, 'View', LAMBDA, OPTIONS);
    ingestDefinition_updateMaterializedView(ingest, 'View', LAMBDA, OPTIONS);

    const content =
      graphManagerState.graphManager.elementToEntity(ingest).content;
    expect(content._type).toBe('extendedIngestDefinition');
    expect(content.batchAttributesGenerator).toBeDefined();
    expect(content.datasets).toHaveLength(1);
  },
);

test(
  unitTest('Editing a plain ingest definition keeps its _type'),
  async () => {
    const graphManagerState = TEST__getTestGraphManagerState();
    await TEST__buildGraphWithEntities(
      graphManagerState,
      buildEntities('ingestDefinition'),
    );
    const ingest = graphManagerState.graph.getIngestDefinition(INGEST_PATH);
    ingestDefinition_addMaterializedView(ingest, 'View', LAMBDA, OPTIONS);
    expect(
      graphManagerState.graphManager.elementToEntity(ingest).content._type,
    ).toBe('ingestDefinition');
  },
);

// The data sets' columns, read for display from the definition's JSON as
// Legend Cube's reader types them for its flow
// (`V1_CubeIngestDefinition.test.ts`), where it lists what Cube refuses

interface TestColumn {
  name: string;
  path: string;
  params?: number[];
  multiplicity?: { lowerBound: number; upperBound?: number };
}

const column = (
  name: string,
  path: string,
  params: number[] = [],
  multiplicity: { lowerBound: number; upperBound?: number } = {
    lowerBound: 1,
    upperBound: 1,
  },
): TestColumn => ({ name, path, params, multiplicity });

const dataSet = (
  name: string,
  columns: TestColumn[],
  writeMode?: string,
): PlainObject => ({
  name,
  primaryKey: columns.slice(0, 1).map((each) => each.name),
  source: {
    _type: 'ingestSource',
    schema: {
      _type: 'schema',
      columns: columns.map((each) => ({
        name: each.name,
        genericType: {
          rawType: { _type: 'packageableType', fullPath: each.path },
          typeArguments: [],
          multiplicityArguments: [],
          typeVariableValues: (each.params ?? []).map((value) => ({
            _type: 'integer',
            value,
          })),
        },
        multiplicity: each.multiplicity,
      })),
    },
  },
  ...(writeMode ? { writeMode: { _type: writeMode } } : {}),
});

const ingestWith = (content: PlainObject): IngestDefinition => {
  const ingest = new IngestDefinition('TradesIngest');
  ingest.content = { _type: 'ingestDefinition', ...content };
  return ingest;
};

/** Each data set as lines: its columns, `name: type multiplicity`, its key and what adds a column marked */
const describeDataSets = (
  dataSets: IngestDataSet[],
): Record<string, PlainObject> =>
  Object.fromEntries(
    dataSets.map((each) => [
      each.name,
      {
        ...(each.isMaterializedView ? { isMaterializedView: true } : {}),
        writeMode: each.writeMode,
        columns: each.columns.map(
          (each_column) =>
            `${each_column.name}: ${each_column.type} ${each_column.multiplicity}${
              each_column.isPrimaryKey ? ' (key)' : ''
            }${each_column.addedBy ? ` (added by ${each_column.addedBy})` : ''}`,
        ),
        notes: each.notes,
      },
    ]),
  );

const TRADES = dataSet('TRADES', [
  column('TRADE_ID', 'meta::pure::precisePrimitives::BigInt'),
  column('DESK', 'meta::pure::precisePrimitives::Varchar', [20]),
  column('PRICE', 'Numeric', [18, 4], { lowerBound: 0, upperBound: 1 }),
  column('QUANTITY', 'meta::pure::metamodel::type::Integer'),
  column('TRADED_ON', 'StrictDate'),
]);

const ADDED_BATCH_MILESTONED = [
  'LAKE_DIGEST: String [1] - Required (added by batch_milestoned)',
  'LAKE_IN_ID: Integer [1] - Required (added by batch_milestoned)',
  'LAKE_OUT_ID: Integer [1] - Required (added by batch_milestoned)',
];

test(
  unitTest(
    "Reads each data set's columns for display, as Legend Cube's cases declare them, then those its write mode adds, in the engine's order",
  ),
  () => {
    const ingest = ingestWith({
      writeMode: { _type: 'batch_milestoned' },
      datasets: [
        TRADES,
        dataSet(
          'DESKS',
          [column('DESK', 'String')],
          'batch_milestoned_business_temporal',
        ),
        dataSet('FLAGS', [column('FLAG', 'Boolean')], 'append_only'),
        {
          name: 'DAILY',
          primaryKey: [],
          source: {
            _type: 'FunctionSource',
            function: { _type: 'lambda', body: [], parameters: [] },
          },
        },
        dataSet('EMPTY', []),
        dataSet('TAGS', [column('TAG', 'String', [], { lowerBound: 0 })]),
        dataSet('COLORS', [column('COLOR', 'test::Color')]),
        dataSet('CLASH', [column('LAKE_IN_ID', 'Integer')]),
        { name: 'NO_SOURCE', primaryKey: [] },
        {
          name: 'NO_SCHEMA',
          primaryKey: [],
          source: { _type: 'ingestSource' },
        },
      ],
    });
    const dataSets = getIngestDataSets(ingest);
    expect(describeDataSets(dataSets)).toEqual({
      TRADES: {
        writeMode: 'batch_milestoned',
        columns: [
          'TRADE_ID: BigInt [1] - Required (key)',
          'DESK: Varchar(20) [1] - Required',
          'PRICE: Numeric(18, 4) [0..1] - Optional',
          'QUANTITY: Integer [1] - Required',
          'TRADED_ON: StrictDate [1] - Required',
          ...ADDED_BATCH_MILESTONED,
        ],
        notes: [],
      },
      // its own write mode, over the definition's
      DESKS: {
        writeMode: 'batch_milestoned_business_temporal',
        columns: [
          'DESK: String [1] - Required (key)',
          ...[
            'LAKE_DIGEST: String',
            'LAKE_IN_ID: Integer',
            'LAKE_OUT_ID: Integer',
            'LAKE_FROM: Timestamp',
            'LAKE_THRU: Timestamp',
          ].map(
            (each) =>
              `${each} [1] - Required (added by batch_milestoned_business_temporal)`,
          ),
        ],
        notes: [],
      },
      FLAGS: {
        writeMode: 'append_only',
        columns: ['FLAG: Boolean [1] - Required (key)'],
        notes: [],
      },
      // a view's columns come from its function
      DAILY: {
        isMaterializedView: true,
        writeMode: 'batch_milestoned',
        columns: [],
        notes: [],
      },
      // none of its own, so none from its write mode either
      EMPTY: {
        writeMode: 'batch_milestoned',
        columns: [],
        notes: ['No columns declared.'],
      },
      // a column of many values is listed, as is one of a type Cube doesn't know
      TAGS: {
        writeMode: 'batch_milestoned',
        columns: ['TAG: String [*] - List (key)', ...ADDED_BATCH_MILESTONED],
        notes: [],
      },
      COLORS: {
        writeMode: 'batch_milestoned',
        columns: [
          'COLOR: Color [1] - Required (key)',
          ...ADDED_BATCH_MILESTONED,
        ],
        notes: [],
      },
      // the column it declares is listed, and not again as one its write mode adds
      CLASH: {
        writeMode: 'batch_milestoned',
        columns: [
          'LAKE_IN_ID: Integer [1] - Required (key)',
          ADDED_BATCH_MILESTONED[0],
          ADDED_BATCH_MILESTONED[2],
        ],
        notes: [
          'It declares LAKE_IN_ID, which its write mode, batch milestoned, adds too: it is listed once.',
        ],
      },
      NO_SOURCE: {
        writeMode: 'batch_milestoned',
        columns: [],
        notes: ['No columns declared.'],
      },
      NO_SCHEMA: {
        writeMode: 'batch_milestoned',
        columns: [],
        notes: ['No columns declared.'],
      },
    });
    // the type's full path, for its tooltip; a column the write mode adds is never in the key
    const trades = dataSets.find((each) => each.name === 'TRADES');
    expect(trades?.columns.map((each) => each.typePath)).toEqual([
      'meta::pure::precisePrimitives::BigInt',
      'meta::pure::precisePrimitives::Varchar',
      'Numeric',
      'meta::pure::metamodel::type::Integer',
      'StrictDate',
      'String',
      'Integer',
      'Integer',
    ]);
    expect(trades?.declaredColumnCount).toBe(5);
  },
);

test(
  unitTest(
    "A write mode it doesn't know, the data set's or the definition's, adds no column and says so",
  ),
  () => {
    expect(
      describeDataSets(
        getIngestDataSets(
          ingestWith({
            writeMode: { _type: 'nightly_snapshot' },
            datasets: [
              dataSet('TRADES', [column('TRADE_ID', 'Integer')]),
              dataSet('DESKS', [column('DESK', 'String')], 'toString'),
              dataSet('FLAGS', [column('FLAG', 'Boolean')], 'append_only'),
            ],
          }),
        ),
      ),
    ).toEqual({
      TRADES: {
        writeMode: 'nightly_snapshot',
        columns: ['TRADE_ID: Integer [1] - Required (key)'],
        notes: [
          "Its write mode, nightly snapshot, may add columns, which aren't shown.",
        ],
      },
      DESKS: {
        writeMode: 'toString',
        columns: ['DESK: String [1] - Required (key)'],
        notes: [
          "Its write mode, toString, may add columns, which aren't shown.",
        ],
      },
      FLAGS: {
        writeMode: 'append_only',
        columns: ['FLAG: Boolean [1] - Required (key)'],
        notes: [],
      },
    });
  },
);

test(
  unitTest("Reads what it can of a definition's data sets, and never throws"),
  () => {
    expect(getIngestDataSets(ingestWith({}))).toEqual([]);
    expect(getIngestDataSets(ingestWith({ datasets: {} }))).toEqual([]);
    const withOdds = ingestWith({
      writeMode: 'batch_milestoned',
      datasets: [
        'TRADES',
        42,
        null,
        { primaryKey: ['ID'] },
        {
          name: 'DESKS',
          primaryKey: ['DESK', 7],
          source: {
            _type: 'ingestSource',
            schema: {
              columns: [
                { genericType: { rawType: { fullPath: 'String' } } },
                'DESK',
                {
                  name: 'DESK',
                  genericType: {
                    rawType: {
                      fullPath: 'meta::pure::precisePrimitives::Varchar',
                    },
                    typeVariableValues: [{ _type: 'integer', value: 64 }],
                  },
                  multiplicity: { lowerBound: 2, upperBound: 5 },
                },
                { name: 'REGION' },
                {
                  name: 'BOOKS',
                  genericType: { rawType: { fullPath: 'String' } },
                  multiplicity: { lowerBound: 1 },
                },
              ],
            },
          },
        },
        {
          name: 'BROKEN_VIEW',
          primaryKey: [],
          source: { _type: 'FunctionSource', function: 'not a lambda' },
        },
      ],
    });
    // a write mode that isn't an object is none; a column with no name is left
    // out and counted; one with no type or multiplicity shows what it has
    expect(describeDataSets(getIngestDataSets(withOdds))).toEqual({
      DESKS: {
        writeMode: undefined,
        columns: [
          'DESK: Varchar(64) [2..5] - Must have from 2 to 5 value(s) (key)',
          'REGION: ? ',
          'BOOKS: String [1..*] - Must have at least 1 value(s)',
        ],
        notes: ["One of its columns has no name, and isn't shown."],
      },
      // a view, which says it can't be read: the views' list leaves it out
      BROKEN_VIEW: {
        isMaterializedView: true,
        writeMode: undefined,
        columns: [],
        notes: ["It is a materialized view whose function can't be read."],
      },
    });
    expect(
      getIngestMaterializedViews(withOdds).map((view) => view.name),
    ).toEqual([]);
  },
);

test(
  unitTest(
    "Lists the ingest data sets a view's function reads, once each, in the order it reads them",
  ),
  () => {
    const accessor = (path: string[], type = 'I'): PlainObject => ({
      _type: 'classInstance',
      type,
      value: { path, metadata: false },
    });
    const ingest = ingestWith({
      datasets: [
        {
          name: 'POSITIONS',
          source: {
            _type: 'FunctionSource',
            function: {
              _type: 'lambda',
              parameters: [],
              body: [
                {
                  _type: 'func',
                  function: 'letFunction',
                  parameters: [
                    { _type: 'string', value: 'eod' },
                    accessor(['demo::TradesIngest', 'EOD']),
                  ],
                },
                {
                  _type: 'func',
                  function: 'join',
                  parameters: [
                    { _type: 'var', name: 'eod' },
                    {
                      _type: 'func',
                      function: 'concatenate',
                      parameters: [
                        accessor(['demo::OtherIngest', 'DESKS']),
                        accessor(['demo::TradesIngest', 'EOD']),
                        accessor(['demo::Product', 'desks'], 'P'),
                        accessor(['demo::TradesIngest']),
                      ],
                    },
                  ],
                },
              ],
            },
          },
        },
      ],
    });
    const [view] = getIngestMaterializedViews(ingest);
    expect(
      view
        ? getIngestMaterializedViewReads(view).map(
            (each) => `${each.ingestDefinition}.${each.dataSet}`,
          )
        : undefined,
    ).toEqual(['demo::TradesIngest.EOD', 'demo::OtherIngest.DESKS']);
  },
);
