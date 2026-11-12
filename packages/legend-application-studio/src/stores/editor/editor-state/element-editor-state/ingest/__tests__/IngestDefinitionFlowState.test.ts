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
import { IngestDefinition } from '@finos/legend-graph';
import {
  guaranteeNonNullable,
  guaranteeType,
  type PlainObject,
} from '@finos/legend-shared';
import type { Entity } from '@finos/legend-storage';
import {
  getIngestDataSetColumns,
  getIngestWriteModeLabel,
} from '../IngestDefinitionFlowState.js';

// The data sets' columns, as their table shows them, read from the
// definition's specification, which legend-graph builds from its content

const INGEST_PATH = 'test::TradesIngest';

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

/** A data set as the engine writes it: its columns in a serialized source's relation type */
const dataSet = (
  name: string,
  columns: TestColumn[],
  writeMode?: string,
): PlainObject => ({
  name,
  primaryKey: columns.slice(0, 1).map((each) => each.name),
  source: {
    _type: 'serializedSource',
    schema: {
      _type: 'relationType',
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

/** Each data set's table as lines, `name: type multiplicity`, its key and what adds a column marked, with its notes */
const describeDataSets = async (
  content: PlainObject,
): Promise<Record<string, PlainObject>> => {
  const graphManagerState = TEST__getTestGraphManagerState();
  await TEST__buildGraphWithEntities(graphManagerState, [
    {
      path: INGEST_PATH,
      classifierPath:
        'meta::external::ingest::specification::metamodel::IngestDefinition',
      content: {
        _type: 'ingestDefinition',
        name: 'TradesIngest',
        package: 'test',
        ...content,
      },
    } as Entity,
  ]);
  const { graphManager, graph } = graphManagerState;
  const specification = guaranteeNonNullable(
    graphManager.getOrBuildIngestDefinitionSpecification(
      guaranteeType(graph.getElement(INGEST_PATH), IngestDefinition),
      graph,
    ),
  );
  return Object.fromEntries(
    specification.datasets.map((each) => {
      const columns = getIngestDataSetColumns(each, specification);
      return [
        each.name,
        {
          writeMode: columns.writeMode
            ? getIngestWriteModeLabel(columns.writeMode)
            : undefined,
          rows: columns.rows.map(
            (row) =>
              `${row.name}: ${row.type} ${row.multiplicity}${
                row.isPrimaryKey ? ' (key)' : ''
              }${row.addedBy ? ` (added by ${getIngestWriteModeLabel(row.addedBy)})` : ''}`,
          ),
          declaredCount: columns.declaredCount,
          notes: columns.notes,
        },
      ];
    }),
  );
};

const ADDED_BATCH_MILESTONED = [
  'LAKE_DIGEST: String [1] - Required (added by batch milestoned)',
  'LAKE_IN_ID: Integer [1] - Required (added by batch milestoned)',
  'LAKE_OUT_ID: Integer [1] - Required (added by batch milestoned)',
];

test(
  unitTest(
    "A data set's columns: those it declares, then those its write mode adds, in the order the engine returns them",
  ),
  async () => {
    expect(
      await describeDataSets({
        writeMode: { _type: 'batch_milestoned' },
        datasets: [
          dataSet('TRADES', [
            column('TRADE_ID', 'BigInt'),
            column('DESK', 'Varchar', [20]),
            column('PRICE', 'Decimal', [], { lowerBound: 0, upperBound: 1 }),
            column('TRADED_ON', 'StrictDate'),
          ]),
          dataSet(
            'DESKS',
            [column('DESK', 'String')],
            'batch_milestoned_business_temporal',
          ),
          dataSet('FLAGS', [column('FLAG', 'Boolean')], 'append_only'),
          dataSet('EMPTY', []),
          dataSet('TAGS', [column('TAG', 'String', [], { lowerBound: 0 })]),
          dataSet('CLASH', [column('LAKE_IN_ID', 'Integer')]),
        ],
      }),
    ).toEqual({
      TRADES: {
        writeMode: 'batch milestoned',
        rows: [
          'TRADE_ID: BigInt [1] - Required (key)',
          'DESK: Varchar(20) [1] - Required',
          'PRICE: Decimal [0..1] - Optional',
          'TRADED_ON: StrictDate [1] - Required',
          ...ADDED_BATCH_MILESTONED,
        ],
        declaredCount: 4,
        notes: [],
      },
      // its own write mode, over the definition's
      DESKS: {
        writeMode: 'batch milestoned business temporal',
        rows: [
          'DESK: String [1] - Required (key)',
          ...[
            'LAKE_DIGEST: String',
            'LAKE_IN_ID: Integer',
            'LAKE_OUT_ID: Integer',
            'LAKE_FROM: Timestamp',
            'LAKE_THRU: Timestamp',
          ].map(
            (each) =>
              `${each} [1] - Required (added by batch milestoned business temporal)`,
          ),
        ],
        declaredCount: 1,
        notes: [],
      },
      FLAGS: {
        writeMode: 'append only',
        rows: ['FLAG: Boolean [1] - Required (key)'],
        declaredCount: 1,
        notes: [],
      },
      // none of its own, so none from its write mode either
      EMPTY: {
        writeMode: 'batch milestoned',
        rows: [],
        declaredCount: 0,
        notes: ['No columns declared.'],
      },
      TAGS: {
        writeMode: 'batch milestoned',
        rows: ['TAG: String [*] - List (key)', ...ADDED_BATCH_MILESTONED],
        declaredCount: 1,
        notes: [],
      },
      // the column it declares is listed, and not again as one its write mode adds
      CLASH: {
        writeMode: 'batch milestoned',
        rows: [
          'LAKE_IN_ID: Integer [1] - Required (key)',
          ADDED_BATCH_MILESTONED[0],
          ADDED_BATCH_MILESTONED[2],
        ],
        declaredCount: 1,
        notes: [
          'It declares LAKE_IN_ID, which its write mode, batch milestoned, adds too: it is listed once.',
        ],
      },
    });
  },
);

test(
  unitTest(
    "What a data set's table can't show: a type the project doesn't have, a write mode or a source Studio doesn't know",
  ),
  async () => {
    expect(
      await describeDataSets({
        writeMode: { _type: 'nightly_snapshot' },
        datasets: [
          dataSet('TRADES', [column('TRADE_ID', 'Integer')]),
          dataSet('COLORS', [column('COLOR', 'test::Color')], 'append_only'),
          {
            name: 'FEED',
            primaryKey: [],
            source: { _type: 'kafkaSource', topic: 'feed' },
          },
        ],
      }),
    ).toEqual({
      TRADES: {
        writeMode: 'nightly snapshot',
        rows: ['TRADE_ID: Integer [1] - Required (key)'],
        declaredCount: 1,
        notes: [
          "Its write mode, nightly snapshot, may add columns, which aren't shown.",
        ],
      },
      // shown by the type its definition names
      COLORS: {
        writeMode: 'append only',
        rows: ['COLOR: Color [1] - Required (key)'],
        declaredCount: 1,
        notes: ["The type of COLOR, test::Color, isn't in the project."],
      },
      FEED: {
        writeMode: 'nightly snapshot',
        rows: [],
        declaredCount: 0,
        notes: ["Its source isn't one Studio knows: its columns aren't shown."],
      },
    });
  },
);
