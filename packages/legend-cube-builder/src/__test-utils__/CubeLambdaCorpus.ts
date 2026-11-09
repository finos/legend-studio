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

import {
  buildSchemasAndValidity,
  CubeLambdaReadError,
  CubeLambdaReadErrorKind,
  decodeCubeSpec,
  ExpressionFilter,
  getExpressionFilterSignature,
  IngestDatasetSource,
  lambda,
  QueryEmitter,
  RelationalTableSource,
  type CubeDocument,
  type CubeSourceStep,
  type IR,
  type JsonObject,
  type Query,
} from '@finos/legend-cube';
import { readdirSync, readFileSync } from 'fs';
import { join, resolve } from 'path';

// The lambdas Cube writes for the core's saved spec samples (PLAN §10.3),
// for Import Pure's round trips (PLAN §11.18): for each node that can be
// written, as a matview saves it and as Show Pure shows a run of it; and for
// a cube of ingest data sets, as a data product's access point reads them

const FIXTURES = resolve(
  __dirname,
  '../../../legend-cube/src/spec/__tests__/fixtures',
);

export interface TEST__CubeLambdaSample {
  /** `<file>/<node id>` */
  readonly key: string;
  readonly document: CubeDocument;
  readonly nodeId: string;
  /** The node's relation, as a matview saves it: `{| <relation>}`, written with its rows' order */
  readonly relation: IR;
  /** A run of the node with no row limit, as Show Pure shows it: lets, the capture's sort, `from()` */
  readonly run: IR;
}

/** Every node of a saved cube that can be written, keyed by `<name>/<node id>` */
const samplesOf = (name: string, spec: unknown): TEST__CubeLambdaSample[] => {
  const { document } = decodeCubeSpec(spec);
  const runtime = document.context?.runtime;
  if (runtime === undefined) {
    return [];
  }
  const emitter = new QueryEmitter(document.query);
  return document.query.nodes
    .filter((node) => emitter.canEmit(node.id))
    .map((node) => ({
      key: `${name}/${node.id}`,
      document,
      nodeId: node.id,
      relation: lambda(
        [],
        [emitter.emitRelation(node.id, { withRowOrder: true })],
      ),
      run: new QueryEmitter(
        document.query.selected === node.id
          ? document.query
          : document.query.select(node.id),
      ).emitExecutionLambda({ runtime }),
    }));
};

/** Every node of every sample that can be written, by key */
export const TEST__cubeLambdaSamples = (): TEST__CubeLambdaSample[] =>
  readdirSync(FIXTURES)
    .filter((file) => file.endsWith('.cube.json'))
    .sort()
    .flatMap((file) =>
      samplesOf(
        file,
        JSON.parse(readFileSync(join(FIXTURES, file), 'utf-8')) as unknown,
      ),
    );

const INGEST_DEFINITION = 'markets::ingest::TradePositionsIngest';
const INGEST_URN = `urn:lakehouse:prod:ingest:definition:alloy-git:org.example.markets~trade-positions~${INGEST_DEFINITION}`;
const VARCHAR = 'meta::pure::precisePrimitives::Varchar';

const snapshotColumn = (
  name: string,
  path: string,
  nullable = false,
  params?: number[],
): JsonObject => ({
  name,
  type: params ? { path, params } : { path },
  nullable,
});

/**
 * A cube of ingest data sets, as a data product's access point reads them
 * (`#I{…}#`), its data sets saved with their columns: signed-off positions
 * joined with their legal entities, summed by legal entity, the largest
 * first; and client positions, some of their columns. The data is made up.
 */
export const TEST__INGEST_CUBE_SPEC: JsonObject = {
  formatVersion: 1,
  name: 'Positions by legal entity',
  context: {
    model: {
      _type: 'cubeIngest',
      environmentType: 'PRODUCTION',
      producerDeploymentId: '30455',
    },
    runtime: 'cube::ingest::Runtime',
  },
  query: {
    selected: 'limit101',
    nodes: [
      {
        kind: 'ingestDataset',
        id: 'ingestDataset101',
        ingestDefinitionUrn: INGEST_URN,
        ingestDefinition: INGEST_DEFINITION,
        dataSet: 'EOD_POSITIONS',
        schemaSnapshot: [
          snapshotColumn('BUSINESS_DATE', 'StrictDate'),
          snapshotColumn('POSITION_ID', VARCHAR, false, [32]),
          snapshotColumn('LEGAL_ENTITY_ID', VARCHAR, false, [16]),
          snapshotColumn('STATUS', VARCHAR, false, [16]),
          snapshotColumn('QUANTITY', 'meta::pure::precisePrimitives::Int'),
          snapshotColumn('MARKET_VALUE_USD', 'Float', true),
        ],
      },
      {
        kind: 'filter',
        id: 'filter101',
        inputs: ['ingestDataset101'],
        filter: {
          column: 'STATUS',
          operator: 'Equal',
          value: { kind: 'string', value: 'SIGNED_OFF' },
        },
      },
      {
        kind: 'ingestDataset',
        id: 'ingestDataset102',
        ingestDefinitionUrn: INGEST_URN,
        ingestDefinition: INGEST_DEFINITION,
        dataSet: 'LEGAL_ENTITIES',
        schemaSnapshot: [
          snapshotColumn('LEI', VARCHAR, false, [16]),
          snapshotColumn('LEGAL_ENTITY_NAME', VARCHAR, false, [128]),
        ],
      },
      {
        kind: 'join',
        id: 'join101',
        inputs: ['filter101', 'ingestDataset102'],
        joinType: 'INNER',
        leftColumns: ['LEGAL_ENTITY_ID'],
        rightColumns: ['LEI'],
      },
      {
        kind: 'group',
        id: 'group101',
        inputs: ['join101'],
        columns: ['BUSINESS_DATE', 'LEGAL_ENTITY_NAME'],
        aggregations: [
          { column: 'QUANTITY', function: 'Sum', name: 'TOTAL_QUANTITY' },
          {
            column: 'MARKET_VALUE_USD',
            function: 'Sum',
            name: 'TOTAL_MARKET_VALUE_USD',
          },
        ],
      },
      {
        kind: 'sort',
        id: 'sort101',
        inputs: ['group101'],
        sorts: [{ column: 'TOTAL_QUANTITY', direction: 'DESC' }],
      },
      { kind: 'limit', id: 'limit101', inputs: ['sort101'], size: 10 },
      {
        kind: 'ingestDataset',
        id: 'ingestDataset103',
        ingestDefinitionUrn: INGEST_URN,
        ingestDefinition: INGEST_DEFINITION,
        dataSet: 'CLIENT_POSITIONS',
        schemaSnapshot: [
          snapshotColumn('BUSINESS_DATE', 'StrictDate'),
          snapshotColumn('CLIENT_ACCOUNT_ID', VARCHAR, false, [32]),
          snapshotColumn('INSTRUMENT_ID', VARCHAR, false, [32]),
          snapshotColumn('QUANTITY', 'meta::pure::precisePrimitives::Int'),
        ],
      },
      {
        kind: 'restrict',
        id: 'restrict101',
        inputs: ['ingestDataset103'],
        columns: ['BUSINESS_DATE', 'CLIENT_ACCOUNT_ID', 'QUANTITY'],
      },
    ],
  },
};

/**
 * Every node of the ingest sample that can be written (`TEST__INGEST_CUBE_SPEC`),
 * by key: lambdas of `#I{…}#`, which Cube reads without an engine, kept apart
 * from the engine's round trips
 */
export const TEST__cubeIngestLambdaSamples = (): TEST__CubeLambdaSample[] =>
  samplesOf('ingest', TEST__INGEST_CUBE_SPEC);

/** Each table or ingest data set of the lambda bound to the sample's own source of it, with its saved columns */
export const TEST__bindSampleSources =
  (document: CubeDocument) =>
  (source: IR): CubeSourceStep => {
    if (source.k === 'ingestAccessor') {
      const dataSet = document.query.nodes.find(
        (node): node is IngestDatasetSource =>
          node instanceof IngestDatasetSource &&
          node.ingestDefinition === source.path[0] &&
          node.dataSet === source.path[1],
      );
      if (!dataSet) {
        throw new CubeLambdaReadError(
          CubeLambdaReadErrorKind.SOURCE,
          `No ingest data set for ${JSON.stringify(source)}`,
        );
      }
      return {
        type: IngestDatasetSource.TYPE,
        create: (id) =>
          new IngestDatasetSource(id, dataSet, dataSet.resolution),
      };
    }
    const table = document.query.nodes.find(
      (node): node is RelationalTableSource =>
        node instanceof RelationalTableSource &&
        source.k === 'storeAccessor' &&
        source.path.join('.') ===
          [node.database, node.schema, node.table].join('.'),
    );
    if (!table) {
      throw new CubeLambdaReadError(
        CubeLambdaReadErrorKind.SOURCE,
        `No table for ${JSON.stringify(source)}`,
      );
    }
    return {
      type: RelationalTableSource.TYPE,
      create: (id) =>
        new RelationalTableSource(
          id,
          {
            database: table.database,
            schema: table.schema,
            table: table.table,
          },
          table.resolution,
        ),
    };
  };

/**
 * The query with each Filter by Expression checked, as the editor has the
 * engine check them on import: the samples' conditions are all Booleans
 */
export const TEST__checkedAsTheEngineWould = (query: Query): Query =>
  query.nodes.reduce((checked, node) => {
    if (!(node instanceof ExpressionFilter) || !node.lambda) {
      return checked;
    }
    const [inputId] = checked.getInputIds(node.id);
    const input =
      inputId === undefined
        ? undefined
        : buildSchemasAndValidity(checked).schemas.get(inputId);
    return input
      ? checked.replace(
          node.withCheck({
            kind: 'checked',
            signature: getExpressionFilterSignature(input, node.lambda),
          }),
        )
      : checked;
  }, query);
