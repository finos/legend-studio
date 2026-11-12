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
import { guaranteeType, type PlainObject } from '@finos/legend-shared';
import {
  IngestAppendOnlyWriteMode,
  IngestAvroMessageFormat,
  IngestBatchMilestonedBusinessTemporalWriteMode,
  IngestBatchMilestonedWriteMode,
  IngestCsvMessageFormat,
  IngestDeltaReadMode,
  IngestEqualityLookupIndex,
  IngestFilterOutExactDuplicateRecords,
  IngestFullTextLookupIndex,
  IngestFunctionSource,
  IngestIncludeInZOutZTimestamp,
  IngestJsonMessageFormat,
  IngestKerberosOwner,
  IngestOverwriteOnSnapshot,
  IngestParquetMessageFormat,
  IngestSerializedSource,
  IngestSnapshotReadMode,
  IngestSubstringLookupIndex,
  IngestTakeMaxVersionFieldRecord,
  IngestTemporalSnapshotReadMode,
  IngestTrimLeadingWhitespace,
  IngestTrimTrailingWhitespace,
  IngestUndefinedReadMode,
  IngestWholeRelationLookupIndex,
  INTERNAL__UnknownIngestLookupIndex,
  INTERNAL__UnknownIngestMessageFormat,
  INTERNAL__UnknownIngestOwner,
  INTERNAL__UnknownIngestPreprocessor,
  INTERNAL__UnknownIngestReadMode,
  INTERNAL__UnknownIngestSource,
  INTERNAL__UnknownIngestWriteMode,
  IngestUnresolvedTaggedValue,
  type IngestDataset,
  type IngestDefinitionSpecification,
} from '../../../../../../../../graph/metamodel/pure/packageableElements/ingest/IngestDefinitionSpecification.js';
import { StereotypeReference } from '../../../../../../../../graph/metamodel/pure/packageableElements/domain/StereotypeReference.js';
import { TaggedValue } from '../../../../../../../../graph/metamodel/pure/packageableElements/domain/TaggedValue.js';
import { PackageableElementReference } from '../../../../../../../../graph/metamodel/pure/packageableElements/PackageableElementReference.js';
import type { PackageableElement } from '../../../../../../../../graph/metamodel/pure/packageableElements/PackageableElement.js';
import { AppDirOwner } from '../../../../../../../../graph/metamodel/pure/dataProduct/DataProduct.js';
import { V1_buildIngestDefinitionSpecification } from '../helpers/V1_IngestDefinitionSpecificationBuilder.js';
import { V1_normalizeLegacyIngestDefinitionJson } from '../../../pureProtocol/serializationHelpers/V1_IngestDefinitionSpecificationSerializationHelper.js';
import {
  V1_TEST__buildIngestSpecificationContext,
  V1_TEST__describeIngestColumns,
} from './V1_IngestDefinitionSpecificationTestUtils.js';
import {
  TEST__buildGraphWithEntities,
  TEST__getTestGraphManagerState,
} from '../../../../../../../__test-utils__/GraphManagerTestUtils.js';
import type { GraphManagerState } from '../../../../../../../GraphManagerState.js';

const lambda = (column: string): PlainObject => ({
  _type: 'lambda',
  parameters: [{ _type: 'var', name: 'x' }],
  body: [
    {
      _type: 'property',
      property: column,
      parameters: [{ _type: 'var', name: 'x' }],
    },
  ],
});

const column = (
  name: string,
  fullPath = 'Int',
  multiplicity: PlainObject = { lowerBound: 1, upperBound: 1 },
  typeVariableValues: PlainObject[] = [],
): PlainObject => ({
  name,
  genericType: {
    rawType: { _type: 'packageableType', fullPath },
    typeVariableValues,
  },
  multiplicity,
});

const DATASET: PlainObject = {
  name: 'DS',
  primaryKey: ['id'],
  source: {
    _type: 'serializedSource',
    schema: { _type: 'relationType', columns: [column('id')] },
  },
  privacyClassification: { sensitivity: 'DP10' },
};

const INGEST: PlainObject = {
  _type: 'ingestDefinition',
  package: 'test',
  name: 'Ingest',
  readMode: { _type: 'Snapshot', format: { _type: 'Avro' } },
  writeMode: { _type: 'batch_milestoned' },
  owner: { _type: 'appDir', production: { appDirId: 1, level: 'DEPLOYMENT' } },
  datasets: [DATASET],
};

const withDataset = (dataset: PlainObject): PlainObject => ({
  ...INGEST,
  datasets: [{ ...DATASET, ...dataset }],
});

let graphManagerState: GraphManagerState;

const build = (content: PlainObject): IngestDefinitionSpecification =>
  V1_buildIngestDefinitionSpecification(
    content,
    V1_TEST__buildIngestSpecificationContext(graphManagerState.graph),
  );

const buildDataset = (dataset: PlainObject): IngestDataset => {
  const built = build(withDataset(dataset)).datasets[0];
  expect(built).toBeDefined();
  return built as IngestDataset;
};

beforeAll(async () => {
  graphManagerState = TEST__getTestGraphManagerState();
  await TEST__buildGraphWithEntities(graphManagerState, [
    {
      path: 'test::Profile',
      classifierPath: 'meta::pure::metamodel::extension::Profile',
      content: {
        _type: 'profile',
        package: 'test',
        name: 'Profile',
        stereotypes: [{ value: 'flagged' }],
        tags: [{ value: 'note' }],
      },
    },
    {
      path: 'test::Attributes',
      classifierPath: 'meta::pure::metamodel::type::Class',
      content: {
        _type: 'class',
        package: 'test',
        name: 'Attributes',
        properties: [],
      },
    },
  ]);
});

describe(unitTest('Ingest definition specification: read modes'), () => {
  test.each([
    ['Delta', IngestDeltaReadMode],
    ['Snapshot', IngestSnapshotReadMode],
    ['TemporalSnapshot', IngestTemporalSnapshotReadMode],
    ['Undefined', IngestUndefinedReadMode],
    ['SomeFutureReadMode', INTERNAL__UnknownIngestReadMode],
  ])('%s', (type, expected) => {
    const specification = build({
      ...INGEST,
      readMode: { _type: type, format: { _type: 'JSON' } },
    });
    expect(specification.readMode).toBeInstanceOf(expected);
    // every read mode, known or not, keeps its format
    expect(specification.readMode?.format).toBeInstanceOf(
      IngestJsonMessageFormat,
    );
  });

  test('a delta read mode keeps its delete indicator', () => {
    const readMode = guaranteeType(
      build({
        ...INGEST,
        readMode: {
          _type: 'Delta',
          deleteIndicator: { deleteField: 'deleted', deleteValues: ['Y', '1'] },
        },
      }).readMode,
      IngestDeltaReadMode,
    );
    expect(readMode.deleteIndicator?.deleteField).toBe('deleted');
    expect(readMode.deleteIndicator?.deleteValues).toEqual(['Y', '1']);
    expect(readMode.format).toBeUndefined();
  });

  test('an unknown read mode keeps its content', () => {
    const readMode = guaranteeType(
      build({ ...INGEST, readMode: { _type: 'SomeFutureReadMode', a: 1 } })
        .readMode,
      INTERNAL__UnknownIngestReadMode,
    );
    expect(readMode.content).toEqual({ _type: 'SomeFutureReadMode', a: 1 });
  });

  test('a missing read mode is read as none', () => {
    const { readMode: _readMode, ...withoutReadMode } = INGEST;
    expect(build(withoutReadMode).readMode).toBeUndefined();
  });
});

describe(unitTest('Ingest definition specification: write modes'), () => {
  test.each([
    ['append_only', IngestAppendOnlyWriteMode],
    ['batch_milestoned', IngestBatchMilestonedWriteMode],
    [
      'batch_milestoned_business_temporal',
      IngestBatchMilestonedBusinessTemporalWriteMode,
    ],
    ['some_future_write_mode', INTERNAL__UnknownIngestWriteMode],
  ])('%s', (type, expected) => {
    expect(
      build({ ...INGEST, writeMode: { _type: type } }).writeMode,
    ).toBeInstanceOf(expected);
  });

  test.each([
    ['batch_milestoned', IngestBatchMilestonedWriteMode],
    ['append_only', IngestAppendOnlyWriteMode],
  ])('the legacy string %s', (type, expected) => {
    expect(build({ ...INGEST, writeMode: type }).writeMode).toBeInstanceOf(
      expected,
    );
  });

  test('business temporal with a business temporal field', () => {
    const writeMode = guaranteeType(
      build({
        ...INGEST,
        writeMode: {
          _type: 'batch_milestoned_business_temporal',
          businessTemporalField: 'asOf',
          coalesceTimelineMode: 'CoalesceTimeline',
        },
      }).writeMode,
      IngestBatchMilestonedBusinessTemporalWriteMode,
    );
    expect(writeMode.businessTemporalField).toBe('asOf');
    expect(writeMode.coalesceTimelineMode).toBe('CoalesceTimeline');
    expect(writeMode.temporalPassThrough).toBeUndefined();
  });

  test('business temporal with a temporal pass-through', () => {
    const writeMode = guaranteeType(
      build({
        ...INGEST,
        writeMode: {
          _type: 'batch_milestoned_business_temporal',
          temporalPassThrough: {
            lakeFrom: 'from',
            lakeThru: 'thru',
            disableBusinessTimelineValidation: false,
            infinityDate: { _type: 'dateTime', value: '9999-12-31T00:00:00' },
          },
        },
      }).writeMode,
      IngestBatchMilestonedBusinessTemporalWriteMode,
    );
    expect(writeMode.businessTemporalField).toBeUndefined();
    expect(writeMode.temporalPassThrough).toMatchObject({
      lakeFrom: 'from',
      lakeThru: 'thru',
      disableBusinessTimelineValidation: false,
      infinityDate: { _type: 'dateTime', value: '9999-12-31T00:00:00' },
    });
    expect(
      writeMode.temporalPassThrough?.lakeThruInfinityCutoff,
    ).toBeUndefined();
  });

  test('a data set write mode overrides the definition', () => {
    expect(
      buildDataset({ writeMode: { _type: 'append_only' } }).writeMode,
    ).toBeInstanceOf(IngestAppendOnlyWriteMode);
    expect(buildDataset({}).writeMode).toBeUndefined();
  });
});

describe(unitTest('Ingest definition specification: formats'), () => {
  test.each([
    ['CSV', IngestCsvMessageFormat],
    ['Avro', IngestAvroMessageFormat],
    ['JSON', IngestJsonMessageFormat],
    ['Parquet', IngestParquetMessageFormat],
    ['SomeFutureFormat', INTERNAL__UnknownIngestMessageFormat],
  ])('%s', (type, expected) => {
    expect(
      build({
        ...INGEST,
        readMode: { _type: 'Snapshot', format: { _type: type } },
      }).readMode?.format,
    ).toBeInstanceOf(expected);
  });

  test('CSV takes the protocol defaults for what the content leaves out', () => {
    const csv = guaranteeType(
      build({
        ...INGEST,
        readMode: { _type: 'Snapshot', format: { _type: 'CSV' } },
      }).readMode?.format,
      IngestCsvMessageFormat,
    );
    expect(csv.fieldDelimiter).toBe(',');
    expect(csv.headerRowsToSkipCount).toBe(0);
    expect(csv.recordDelimiter).toBe('\n');
    expect(csv.parseHeader).toBe(false);
    expect(csv.quoteCharacter).toBeUndefined();
    expect(csv.columnOverrides).toEqual([]);
  });

  test('CSV keeps every option it sets', () => {
    const csv = guaranteeType(
      build({
        ...INGEST,
        readMode: {
          _type: 'Snapshot',
          format: {
            _type: 'CSV',
            fieldDelimiter: '\t',
            headerRowsToSkipCount: 2,
            quoteCharacter: '"',
            escapeCharacter: '\\',
            recordDelimiter: '\r\n',
            parseHeader: true,
            dateFormat: 'yyyy-MM-dd',
            timeFormat: 'HH:mm',
            timestampFormat: 'yyyy-MM-dd HH:mm',
            timeZone: 'UTC',
            escapeUnquotedField: 'NONE',
            preserveEmptyString: true,
            replaceInvalidCharacters: false,
            emptyStringAsNullForNonStringType: true,
            columnOverrides: [
              { column: 'd', dateFormat: 'dd/MM/yyyy', timeZone: 'EST' },
            ],
          },
        },
      }).readMode?.format,
      IngestCsvMessageFormat,
    );
    expect(csv).toMatchObject({
      fieldDelimiter: '\t',
      headerRowsToSkipCount: 2,
      quoteCharacter: '"',
      escapeCharacter: '\\',
      recordDelimiter: '\r\n',
      parseHeader: true,
      dateFormat: 'yyyy-MM-dd',
      timeFormat: 'HH:mm',
      timestampFormat: 'yyyy-MM-dd HH:mm',
      timeZone: 'UTC',
      escapeUnquotedField: 'NONE',
      preserveEmptyString: true,
      replaceInvalidCharacters: false,
      emptyStringAsNullForNonStringType: true,
    });
    expect(csv.columnOverrides).toHaveLength(1);
    expect(csv.columnOverrides[0]).toMatchObject({
      column: 'd',
      dateFormat: 'dd/MM/yyyy',
      timeZone: 'EST',
    });
  });

  test('Parquet keeps its options', () => {
    const parquet = guaranteeType(
      build({
        ...INGEST,
        readMode: {
          _type: 'Snapshot',
          format: {
            _type: 'Parquet',
            useVectorizedScanner: false,
            replaceInvalidCharacters: true,
          },
        },
      }).readMode?.format,
      IngestParquetMessageFormat,
    );
    expect(parquet.useVectorizedScanner).toBe(false);
    expect(parquet.replaceInvalidCharacters).toBe(true);
  });

  test('a data set source can override the format', () => {
    const source = guaranteeType(
      buildDataset({
        source: {
          _type: 'serializedSource',
          schema: { _type: 'relationType', columns: [column('id')] },
          format: { _type: 'Parquet' },
        },
      }).source,
      IngestSerializedSource,
    );
    expect(source.format).toBeInstanceOf(IngestParquetMessageFormat);
  });
});

describe(unitTest('Ingest definition specification: owners'), () => {
  test('an AppDir owner with both deployments', () => {
    const owner = guaranteeType(
      build({
        ...INGEST,
        owner: {
          _type: 'appDir',
          production: { appDirId: 1, level: 'DEPLOYMENT' },
          prodParallel: { appDirId: 2, level: 'DEPLOYMENT' },
        },
      }).owner,
      AppDirOwner,
    );
    expect(owner.production?.appDirId).toBe(1);
    expect(owner.prodParallel?.appDirId).toBe(2);
    expect(owner.prodParallel?.level).toBe('DEPLOYMENT');
  });

  test('an AppDir owner with only a production parallel deployment', () => {
    const owner = guaranteeType(
      build({
        ...INGEST,
        owner: {
          _type: 'appDir',
          prodParallel: { appDirId: 2, level: 'DEPLOYMENT' },
        },
      }).owner,
      AppDirOwner,
    );
    expect(owner.production).toBeUndefined();
    expect(owner.prodParallel?.appDirId).toBe(2);
  });

  test('a Kerberos owner', () => {
    expect(
      guaranteeType(
        build({ ...INGEST, owner: { _type: 'kerberos', id: 'someone' } }).owner,
        IngestKerberosOwner,
      ).id,
    ).toBe('someone');
  });

  test('an unknown owner keeps its content', () => {
    expect(
      guaranteeType(
        build({ ...INGEST, owner: { _type: 'someFutureOwner', x: 1 } }).owner,
        INTERNAL__UnknownIngestOwner,
      ).content,
    ).toEqual({ _type: 'someFutureOwner', x: 1 });
  });

  test('a legacy AppDir deployment is the production owner', () => {
    const { owner: _owner, ...withoutOwner } = INGEST;
    const owner = guaranteeType(
      build({
        ...withoutOwner,
        appDirDeployment: { appDirId: 7, level: 'DEPLOYMENT' },
      }).owner,
      AppDirOwner,
    );
    expect(owner.production?.appDirId).toBe(7);
    expect(owner.prodParallel).toBeUndefined();
  });

  test('an owner wins over a legacy AppDir deployment', () => {
    const owner = guaranteeType(
      build({
        ...INGEST,
        owner: { _type: 'kerberos', id: 'someone' },
        appDirDeployment: { appDirId: 7, level: 'DEPLOYMENT' },
      }).owner,
      IngestKerberosOwner,
    );
    expect(owner.id).toBe('someone');
  });

  test('no owner at all is read as none', () => {
    const { owner: _owner, ...withoutOwner } = INGEST;
    expect(build(withoutOwner).owner).toBeUndefined();
  });
});

describe(unitTest('Ingest definition specification: data set sources'), () => {
  test('a serialized source reads its columns', () => {
    const source = guaranteeType(
      buildDataset({
        source: {
          _type: 'serializedSource',
          schema: {
            _type: 'relationType',
            columns: [
              column('id', 'Int'),
              column('name', 'Varchar', { lowerBound: 0, upperBound: 1 }, [
                { _type: 'integer', value: 200 },
              ]),
              column('amount', 'Decimal', { lowerBound: 0, upperBound: 1 }, [
                { _type: 'integer', value: 18 },
                { _type: 'integer', value: 2 },
              ]),
              column('tags', 'String', { lowerBound: 0 }),
              {
                ...column('described', 'String'),
                description: 'a description',
              },
            ],
          },
        },
      }).source,
      IngestSerializedSource,
    );
    const columns = V1_TEST__describeIngestColumns(source);
    expect(columns.map((c) => c.name)).toEqual([
      'id',
      'name',
      'amount',
      'tags',
      'described',
    ]);
    expect(columns[1]).toMatchObject({
      type: 'Varchar',
      typeArguments: ['200'],
      lowerBound: 0,
      upperBound: 1,
    });
    expect(columns[2]?.typeArguments).toEqual(['18', '2']);
    expect(columns[3]?.upperBound).toBeUndefined();
    expect(columns[4]?.description).toBe('a description');
    expect(source.unresolvedColumns).toEqual([]);
  });

  test('a column whose type the graph does not have is typed Any, its type kept aside', () => {
    const source = guaranteeType(
      buildDataset({
        source: {
          _type: 'serializedSource',
          schema: {
            _type: 'relationType',
            columns: [column('id'), column('status', 'test::MissingEnum')],
          },
        },
      }).source,
      IngestSerializedSource,
    );
    expect(V1_TEST__describeIngestColumns(source).map((c) => c.type)).toEqual([
      'Int',
      'meta::pure::metamodel::type::Any',
    ]);
    expect(source.unresolvedColumns).toEqual([
      { name: 'status', typePath: 'test::MissingEnum' },
    ]);
  });

  test('a function source is a materialized view', () => {
    const source = guaranteeType(
      buildDataset({
        source: { _type: 'FunctionSource', function: lambda('id') },
      }).source,
      IngestFunctionSource,
    );
    expect(source.function.body).toEqual(lambda('id').body);
    expect(source.function.parameters).toEqual(lambda('id').parameters);
  });

  test('an unknown source keeps its content', () => {
    expect(
      guaranteeType(
        buildDataset({ source: { _type: 'SomeFutureSource', a: 'b' } }).source,
        INTERNAL__UnknownIngestSource,
      ).content,
    ).toEqual({ _type: 'SomeFutureSource', a: 'b' });
  });

  test('a serialized source without a schema has none, as the protocol reader reads it', () => {
    const source = guaranteeType(
      buildDataset({ source: { _type: 'serializedSource' } }).source,
      IngestSerializedSource,
    );
    expect(source.schema).toBeUndefined();
  });

  test('a legacy data set schema and format override are its source', () => {
    const { source: _source, ...withoutSource } = DATASET;
    const built = build({
      ...INGEST,
      datasets: [
        {
          ...withoutSource,
          schema: { _type: 'relationType', columns: [column('id')] },
          formatOverride: { _type: 'CSV', fieldDelimiter: '|' },
        },
      ],
    }).datasets[0];
    const source = guaranteeType(built?.source, IngestSerializedSource);
    expect(V1_TEST__describeIngestColumns(source).map((c) => c.name)).toEqual([
      'id',
    ]);
    expect(
      guaranteeType(source.format, IngestCsvMessageFormat).fieldDelimiter,
    ).toBe('|');
  });

  test('a source wins over a legacy data set schema', () => {
    const source = guaranteeType(
      buildDataset({
        schema: { _type: 'relationType', columns: [column('legacy')] },
      }).source,
      IngestSerializedSource,
    );
    expect(V1_TEST__describeIngestColumns(source).map((c) => c.name)).toEqual([
      'id',
    ]);
  });
});

describe(unitTest('Ingest definition specification: data set layout'), () => {
  test('partition and cluster columns are lambdas', () => {
    const dataset = buildDataset({
      ingestPartitionColumns: [lambda('a'), lambda('b')],
      storageLayoutClusterColumns: [lambda('c')],
      storageLayoutPartitionColumns: [lambda('d')],
    });
    expect(dataset.ingestPartitionColumns.map((l) => l.body)).toEqual([
      lambda('a').body,
      lambda('b').body,
    ]);
    expect(dataset.storageLayoutClusterColumns[0]?.body).toEqual(
      lambda('c').body,
    );
    expect(dataset.storageLayoutPartitionColumns[0]?.body).toEqual(
      lambda('d').body,
    );
  });

  test.each([
    'ingestPartitionColumns',
    'storageLayoutClusterColumns',
    'storageLayoutPartitionColumns',
  ])('legacy column names in %s are identity lambdas', (key) => {
    const dataset = buildDataset({ [key]: ['a', lambda('b'), 'c'] });
    expect(
      (dataset[key as keyof IngestDataset] as { body?: object }[]).map(
        (l) => l.body,
      ),
    ).toEqual([lambda('a').body, lambda('b').body, lambda('c').body]);
  });

  test('missing lists are empty', () => {
    const dataset = buildDataset({});
    expect(dataset.ingestPartitionColumns).toEqual([]);
    expect(dataset.storageLayoutClusterColumns).toEqual([]);
    expect(dataset.storageLayoutPartitionColumns).toEqual([]);
    expect(dataset.lookupIndexes).toEqual([]);
    expect(dataset.preprocessors).toEqual([]);
    expect(dataset.dataResidencyJurisdictions).toEqual([]);
  });

  test('every kind of lookup index', () => {
    const dataset = buildDataset({
      lookupIndexes: [
        { _type: 'wholeRelation', lambda: lambda('id') },
        { _type: 'equality', column: 'id' },
        { _type: 'substring', column: 'v', path: 'a.b' },
        { _type: 'fullText', column: 'v' },
        { _type: 'fullText', column: 'v', analyzer: 'ENTITY_ANALYZER' },
        { _type: 'someFutureIndex', column: 'id' },
        // legacy: a whole relation index was a bare lambda
        lambda('legacy'),
      ],
    });
    const [whole, equality, substring, fullText, analyzed, unknown, legacy] =
      dataset.lookupIndexes;
    expect(
      guaranteeType(whole, IngestWholeRelationLookupIndex).lambda.body,
    ).toEqual(lambda('id').body);
    expect(guaranteeType(equality, IngestEqualityLookupIndex)).toMatchObject({
      column: 'id',
      path: undefined,
    });
    expect(guaranteeType(substring, IngestSubstringLookupIndex)).toMatchObject({
      column: 'v',
      path: 'a.b',
    });
    expect(
      guaranteeType(fullText, IngestFullTextLookupIndex).analyzer,
    ).toBeUndefined();
    expect(guaranteeType(analyzed, IngestFullTextLookupIndex).analyzer).toBe(
      'ENTITY_ANALYZER',
    );
    expect(unknown).toBeInstanceOf(INTERNAL__UnknownIngestLookupIndex);
    expect(
      guaranteeType(legacy, IngestWholeRelationLookupIndex).lambda.body,
    ).toEqual(lambda('legacy').body);
  });

  test('business temporal field and delete indicator', () => {
    const dataset = buildDataset({
      businessTemporalField: 'asOf',
      deleteIndicatorField: { deleteField: 'del', deleteValues: ['true'] },
    });
    expect(dataset.businessTemporalField).toBe('asOf');
    expect(dataset.deleteIndicatorField?.deleteField).toBe('del');
    expect(dataset.deleteIndicatorField?.deleteValues).toEqual(['true']);
  });
});

describe(unitTest('Ingest definition specification: preprocessors'), () => {
  test.each([
    [
      { _type: 'TakeMaxVersionFieldRecord', versionField: 'v' },
      IngestTakeMaxVersionFieldRecord,
    ],
    [{ _type: 'OverwriteOnSnapshot' }, IngestOverwriteOnSnapshot],
    [
      { _type: 'FilterOutExactDuplicateRecords' },
      IngestFilterOutExactDuplicateRecords,
    ],
    [{ _type: 'IncludeInZOutZTimestamp' }, IngestIncludeInZOutZTimestamp],
    [{ _type: 'TrimTrailingWhitespace' }, IngestTrimTrailingWhitespace],
    [{ _type: 'TrimLeadingWhitespace' }, IngestTrimLeadingWhitespace],
    [{ _type: 'SomeFuturePreprocessor' }, INTERNAL__UnknownIngestPreprocessor],
  ])('%o', (preprocessor, expected) => {
    expect(
      buildDataset({ preprocessors: [preprocessor] }).preprocessors[0],
    ).toBeInstanceOf(expected);
  });

  test('TakeMaxVersionFieldRecord requires no increasing version unless it says so', () => {
    const [plain, increasing] = buildDataset({
      preprocessors: [
        { _type: 'TakeMaxVersionFieldRecord', versionField: 'v' },
        {
          _type: 'TakeMaxVersionFieldRecord',
          versionField: 'w',
          requireIncreasingVersion: true,
        },
      ],
    }).preprocessors;
    expect(
      guaranteeType(plain, IngestTakeMaxVersionFieldRecord)
        .requireIncreasingVersion,
    ).toBe(false);
    const take = guaranteeType(increasing, IngestTakeMaxVersionFieldRecord);
    expect(take.versionField).toBe('w');
    expect(take.requireIncreasingVersion).toBe(true);
  });
});

describe(unitTest('Ingest definition specification: classification'), () => {
  test('privacy classification and residency, as the content holds them', () => {
    const dataset = buildDataset({
      privacyClassification: { sensitivity: 'DP30', type: 'SOME_TYPE' },
      dataResidencyJurisdictions: [{ region: 'US' }, { region: 'FUTURE' }],
    });
    expect(dataset.privacyClassification).toMatchObject({
      sensitivity: 'DP30',
      type: 'SOME_TYPE',
    });
    expect(dataset.dataResidencyJurisdictions).toEqual(['US', 'FUTURE']);
  });

  test('a missing privacy classification is read as none', () => {
    const { privacyClassification: _privacy, ...withoutPrivacy } = DATASET;
    expect(
      build({ ...INGEST, datasets: [withoutPrivacy] }).datasets[0]
        ?.privacyClassification,
    ).toBeUndefined();
  });
});

describe(
  unitTest('Ingest definition specification: definition options'),
  () => {
    test('defaults for what the content leaves out', () => {
      const specification = build(INGEST);
      expect(specification.datasetGroup).toBe('DEFAULT');
      expect(specification.enableTypeSystemValidations).toBeUndefined();
      expect(specification.autoTrigger).toBeUndefined();
      expect(specification.evaluationUser).toBeUndefined();
      expect(specification.compute).toBeUndefined();
      expect(specification.batchAttributes).toBeUndefined();
      expect(specification.barrier).toBeUndefined();
      expect(specification.batchAttributesType).toBeUndefined();
      expect(specification.prodDataProductOverride).toBeUndefined();
      expect(specification.stereotypes).toEqual([]);
      expect(specification.taggedValues).toEqual([]);
    });

    test('every option it sets', () => {
      const specification = build({
        ...INGEST,
        datasetGroup: 'GROUP',
        enableTypeSystemValidations: false,
        autoTrigger: true,
        evaluationUser: 'user',
        compute: 'test::Compute',
        batchAttributes: lambda('batch'),
        barrier: lambda('ready'),
        stereotypes: [
          { profile: 'test::Profile', value: 'flagged' },
          { profile: 'test::MissingProfile', value: 'one' },
        ],
        taggedValues: [
          { tag: { profile: 'test::Profile', value: 'note' }, value: 'text' },
          {
            tag: { profile: 'test::MissingProfile', value: 'tag' },
            value: 'other',
          },
        ],
      });
      expect(specification.datasetGroup).toBe('GROUP');
      expect(specification.enableTypeSystemValidations).toBe(false);
      expect(specification.autoTrigger).toBe(true);
      expect(specification.evaluationUser).toBe('user');
      expect(specification.compute).toBe('test::Compute');
      expect(specification.batchAttributes?.body).toEqual(lambda('batch').body);
      expect(specification.barrier?.body).toEqual(lambda('ready').body);
      // a stereotype of a profile the graph has is resolved, any other kept by its paths
      const [stereotype, missingStereotype] = specification.stereotypes;
      const stereotypeReference = guaranteeType(
        stereotype,
        StereotypeReference,
      );
      expect(stereotypeReference.value.value).toBe('flagged');
      expect(stereotypeReference.value._OWNER.path).toBe('test::Profile');
      expect(missingStereotype).toBe('test::MissingProfile.one');
      // the same for tagged values
      const [taggedValue, missingTaggedValue] = specification.taggedValues;
      const resolved = guaranteeType(taggedValue, TaggedValue);
      expect(resolved.tag.value.value).toBe('note');
      expect(resolved.value).toBe('text');
      expect(
        guaranteeType(missingTaggedValue, IngestUnresolvedTaggedValue),
      ).toMatchObject({
        profile: 'test::MissingProfile',
        tag: 'tag',
        value: 'other',
      });
    });

    test('references resolve to the element when the graph has it', () => {
      const specification = build({
        ...INGEST,
        _type: 'extendedIngestDefinition',
        batchAttributesType: 'test::Attributes',
        batchAttributesGenerator: {
          _type: 'packageableElementPointer',
          path: 'test::generator__Any_1_',
        },
        temporalDateGenerator: 'test::dates__Any_1_',
        barrierGenerator: {
          _type: 'packageableElementPointer',
          path: 'test::barrier__Any_1_',
        },
        prodDataProductOverride: {
          all: true,
          dataProducts: [
            { _type: 'packageableElementPointer', path: 'test::Attributes' },
            {
              _type: 'packageableElementPointer',
              path: 'test::MissingDataProduct',
            },
          ],
        },
      });
      const reference = <T extends PackageableElement>(
        value: PackageableElementReference<T> | string | undefined,
      ): PackageableElementReference<T> =>
        guaranteeType(
          value,
          PackageableElementReference,
        ) as PackageableElementReference<T>;
      expect(reference(specification.batchAttributesType).value.path).toBe(
        'test::Attributes',
      );
      // not in the graph: kept by its path
      expect(specification.batchAttributesGenerator).toBe(
        'test::generator__Any_1_',
      );
      // a pointer can be a plain path in older protocols
      expect(specification.temporalDateGenerator).toBe('test::dates__Any_1_');
      expect(specification.barrierGenerator).toBe('test::barrier__Any_1_');
      expect(specification.prodDataProductOverride?.all).toBe(true);
      // `test::Attributes` is a class, not a data product: kept by its path
      expect(specification.prodDataProductOverride?.dataProducts).toEqual([
        'test::Attributes',
        'test::MissingDataProduct',
      ]);
    });

    test('explicit nulls are read as absent', () => {
      const specification = build({
        ...INGEST,
        owner: {
          _type: 'appDir',
          production: { appDirId: 1, level: 'DEPLOYMENT' },
          prodParallel: null,
        },
        evaluationUser: null,
        batchAttributes: null,
        prodDataProductOverride: null,
        datasets: [
          { ...DATASET, writeMode: null, businessTemporalField: null },
        ],
      });
      expect(
        guaranteeType(specification.owner, AppDirOwner).prodParallel,
      ).toBeUndefined();
      expect(specification.evaluationUser).toBeUndefined();
      expect(specification.batchAttributes).toBeUndefined();
      expect(specification.prodDataProductOverride).toBeUndefined();
      expect(specification.datasets[0]?.writeMode).toBeUndefined();
      expect(specification.datasets[0]?.businessTemporalField).toBeUndefined();
    });

    test('TakeMaxVersionFieldRecord without a version field, as the protocol reader reads it', () => {
      const preprocessor = guaranteeType(
        buildDataset({
          preprocessors: [{ _type: 'TakeMaxVersionFieldRecord' }],
        }).preprocessors[0],
        IngestTakeMaxVersionFieldRecord,
      );
      expect(preprocessor.versionField).toBeUndefined();
      expect(preprocessor.requireIncreasingVersion).toBe(false);
    });

    test('an extended definition in an older protocol is read like any other', () => {
      // the protocol's reader skips the legacy upgrades for extended
      // definitions, which are newer than those shapes: read them anyway
      const specification = build({
        ...INGEST,
        _type: 'extendedIngestDefinition',
        writeMode: 'batch_milestoned',
        appDirDeployment: { appDirId: 3, level: 'DEPLOYMENT' },
        owner: undefined,
        batchAttributesGenerator: { path: 'test::generator__Any_1_' },
      });
      expect(specification.writeMode).toBeInstanceOf(
        IngestBatchMilestonedWriteMode,
      );
      expect(
        guaranteeType(specification.owner, AppDirOwner).production?.appDirId,
      ).toBe(3);
      expect(specification.batchAttributesGenerator).toBe(
        'test::generator__Any_1_',
      );
    });

    test('no data sets', () => {
      const { datasets: _datasets, ...withoutDatasets } = INGEST;
      expect(build(withoutDatasets).datasets).toEqual([]);
      expect(build({ ...INGEST, datasets: [] }).datasets).toEqual([]);
    });
  },
);

describe(
  unitTest('Ingest definition specification: content it rejects'),
  () => {
    test.each<[string, PlainObject]>([
      [
        'an unknown legacy write mode string',
        { ...INGEST, writeMode: 'upsert' },
      ],
      ['a write mode that is not an object', { ...INGEST, writeMode: 42 }],
      ['a read mode that is not an object', { ...INGEST, readMode: 'Delta' }],
      ['data sets that are not a list', { ...INGEST, datasets: 'DS' }],
      ['a data set that is not an object', { ...INGEST, datasets: ['DS'] }],
      ['a data set without a name', withDataset({ name: undefined })],
      ['a data set whose name is not a string', withDataset({ name: 1 })],
      [
        'a data set write mode that is a string',
        withDataset({ writeMode: 'append_only' }),
      ],
      ['a primary key that is not a list', withDataset({ primaryKey: 'id' })],
      [
        'a schema that is not a relation type',
        withDataset({
          source: {
            _type: 'serializedSource',
            schema: { _type: 'relationType_random', columns: [] },
          },
        }),
      ],
      [
        'schema columns that are not a list',
        withDataset({
          source: {
            _type: 'serializedSource',
            schema: { _type: 'relationType', columns: 'id' },
          },
        }),
      ],
      [
        'a column of an unknown kind of type',
        withDataset({
          source: {
            _type: 'serializedSource',
            schema: {
              _type: 'relationType',
              columns: [
                {
                  name: 'id',
                  genericType: { rawType: { _type: 'someFutureType' } },
                  multiplicity: { lowerBound: 1, upperBound: 1 },
                },
              ],
            },
          },
        }),
      ],
      [
        'a function source without a function',
        withDataset({ source: { _type: 'FunctionSource' } }),
      ],
      [
        'a whole relation lookup index without a lambda',
        withDataset({ lookupIndexes: [{ _type: 'wholeRelation' }] }),
      ],
      [
        'a TakeMaxVersionFieldRecord version field that is not a string',
        withDataset({
          preprocessors: [
            { _type: 'TakeMaxVersionFieldRecord', versionField: 1 },
          ],
        }),
      ],
      [
        'a CSV option of the wrong kind',
        {
          ...INGEST,
          readMode: {
            _type: 'Snapshot',
            format: { _type: 'CSV', fieldDelimiter: { char: ',' } },
          },
        },
      ],
      [
        'a sensitivity of the wrong kind',
        withDataset({ privacyClassification: { sensitivity: ['DP00'] } }),
      ],
      [
        'a preprocessor that is not an object',
        withDataset({ preprocessors: ['TrimTrailingWhitespace'] }),
      ],
    ])('%s', (_name, content) => {
      expect(() => build(content)).toThrow();
    });
  },
);

describe(
  unitTest('Ingest definition specification: legacy normalization'),
  () => {
    test('leaves current content as it is, but for defaults', () => {
      const normalized = V1_normalizeLegacyIngestDefinitionJson(INGEST);
      expect(normalized).toEqual({ ...INGEST, datasetGroup: 'DEFAULT' });
    });

    test('removes explicit nulls, deeply', () => {
      expect(
        V1_normalizeLegacyIngestDefinitionJson({
          ...INGEST,
          evaluationUser: null,
          datasets: [{ ...DATASET, writeMode: null }],
        }),
      ).toEqual({ ...INGEST, datasetGroup: 'DEFAULT' });
    });

    test('does not modify its input', () => {
      const input = {
        ...INGEST,
        writeMode: 'batch_milestoned',
        appDirDeployment: { appDirId: 1, level: 'DEPLOYMENT' },
        datasets: [
          {
            name: 'DS',
            schema: { _type: 'relationType', columns: [] },
            ingestPartitionColumns: ['a'],
            lookupIndexes: [lambda('x')],
          },
        ],
      };
      const copy = JSON.parse(JSON.stringify(input)) as PlainObject;
      V1_normalizeLegacyIngestDefinitionJson(input);
      expect(input).toEqual(copy);
    });
  },
);
