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

import { test, describe, expect, jest } from '@jest/globals';
import { unitTest } from '@finos/legend-shared/test';
import {
  guaranteeNonNullable,
  guaranteeType,
  type PlainObject,
} from '@finos/legend-shared';
import { IngestDefinition } from '../../../../../../../../graph/metamodel/pure/packageableElements/ingest/IngestDefinition.js';
import {
  IngestAppendOnlyWriteMode,
  IngestBatchMilestonedBusinessTemporalWriteMode,
  IngestBatchMilestonedWriteMode,
  IngestCsvMessageFormat,
  IngestDeltaReadMode,
  IngestEqualityLookupIndex,
  IngestFullTextLookupIndex,
  IngestFunctionSource,
  IngestJsonMessageFormat,
  IngestKerberosOwner,
  IngestParquetMessageFormat,
  IngestSerializedSource,
  IngestTakeMaxVersionFieldRecord,
  IngestTrimTrailingWhitespace,
  IngestWholeRelationLookupIndex,
  INTERNAL__UnknownIngestLookupIndex,
  INTERNAL__UnknownIngestPreprocessor,
  INTERNAL__UnknownIngestSource,
  type IngestDefinitionSpecification,
} from '../../../../../../../../graph/metamodel/pure/packageableElements/ingest/IngestDefinitionSpecification.js';
import { Class } from '../../../../../../../../graph/metamodel/pure/packageableElements/domain/Class.js';
import { TaggedValue } from '../../../../../../../../graph/metamodel/pure/packageableElements/domain/TaggedValue.js';
import { PackageableElementReference } from '../../../../../../../../graph/metamodel/pure/packageableElements/PackageableElementReference.js';
import { AppDirOwner } from '../../../../../../../../graph/metamodel/pure/dataProduct/DataProduct.js';
import { V1_normalizeLegacyIngestDefinitionJson } from '../../../pureProtocol/serializationHelpers/V1_IngestDefinitionSpecificationSerializationHelper.js';
import {
  TEST__buildGraphWithEntities,
  TEST__getTestGraphManagerState,
} from '../../../../../../../__test-utils__/GraphManagerTestUtils.js';
import type { GraphManagerState } from '../../../../../../../GraphManagerState.js';
import { V1_TEST__describeIngestColumns } from './V1_IngestDefinitionSpecificationTestUtils.js';
import TEST_DATA__IngestDefinitionCompatibility from './V1_TEST_DATA__IngestDefinitionCompatibility.json' with { type: 'json' };

// ingest definitions as older versions of the protocol stored them
const legacyInput = (name: string): PlainObject =>
  guaranteeNonNullable(
    (
      TEST_DATA__IngestDefinitionCompatibility as {
        name: string;
        input: PlainObject;
      }[]
    ).find((testCase) => testCase.name === name),
  ).input;
const LEGACY_WITH_DATA_SET_SCHEMA = legacyInput(
  'legacy_string_write_mode_with_data_set_schema',
);
const LEGACY_WITH_SOURCE = legacyInput('legacy_string_write_mode_with_source');
const LEGACY_WITH_OWNER = legacyInput('legacy_string_write_mode_with_owner');
const LEGACY_BARE_LAMBDA_LOOKUP_INDEX = legacyInput(
  'legacy_bare_lambda_lookup_index',
);
const LEGACY_BARE_LAMBDA_LOOKUP_INDEX_WITH_DATA_SET_SCHEMA = legacyInput(
  'legacy_bare_lambda_lookup_index_with_data_set_schema',
);

const INGEST_CLASSIFIER_PATH =
  'meta::external::ingest::specification::metamodel::IngestDefinition';

const identity = (column: string): PlainObject => ({
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
  fullPath: string,
  lowerBound: number,
  typeVariableValues: PlainObject[] = [],
): PlainObject => ({
  name,
  genericType: {
    rawType: { _type: 'packageableType', fullPath },
    typeVariableValues,
  },
  multiplicity: { lowerBound, upperBound: 1 },
});

const FULL_INGEST: PlainObject = {
  _type: 'extendedIngestDefinition',
  package: 'test',
  name: 'Full',
  readMode: {
    _type: 'Delta',
    format: {
      _type: 'CSV',
      fieldDelimiter: '|',
      parseHeader: true,
      columnOverrides: [{ column: 'd', dateFormat: 'yyyy-MM-dd' }],
    },
    deleteIndicator: { deleteField: 'del', deleteValues: ['Y', 'y'] },
  },
  writeMode: {
    _type: 'batch_milestoned_business_temporal',
    businessTemporalField: 'bd',
    coalesceTimelineMode: 'NonCoalesceTimeline',
    temporalPassThrough: {
      lakeFrom: 'from',
      lakeThru: 'thru',
      disableBusinessTimelineValidation: true,
      infinityDate: { _type: 'dateTime', value: '9999-12-31T00:00:00' },
      lakeThruInfinityCutoff: '9999-12-31',
    },
  },
  datasetGroup: 'GROUP1',
  owner: { _type: 'kerberos', id: 'someone' },
  prodDataProductOverride: {
    all: false,
    dataProducts: [
      { _type: 'packageableElementPointer', path: 'test::MissingDataProduct' },
    ],
  },
  batchAttributes: identity('batchId'),
  enableTypeSystemValidations: true,
  autoTrigger: true,
  evaluationUser: 'svc_user',
  compute: 'test::Compute',
  batchAttributesType: 'test::BatchAttributes',
  batchAttributesGenerator: {
    _type: 'packageableElementPointer',
    path: 'test::generator__String_1_',
  },
  stereotypes: [
    {
      profile: 'test::Profile',
      value: 'flagged',
    },
  ],
  taggedValues: [
    {
      tag: { profile: 'meta::pure::profiles::doc', value: 'doc' },
      value: 'hi',
    },
  ],
  datasets: [
    {
      name: 'DS1',
      primaryKey: ['id'],
      ingestPartitionColumns: [identity('id')],
      storageLayoutClusterColumns: ['v'],
      storageLayoutPartitionColumns: [],
      lookupIndexes: [
        { _type: 'equality', column: 'id' },
        {
          _type: 'fullText',
          column: 'v',
          path: 'a.b',
          analyzer: 'UNICODE_ANALYZER',
        },
        { _type: 'someFutureIndex', column: 'id' },
      ],
      writeMode: { _type: 'append_only' },
      source: {
        _type: 'serializedSource',
        schema: {
          _type: 'relationType',
          columns: [
            column('id', 'Int', 1),
            column('v', 'Varchar', 0, [{ _type: 'integer', value: 200 }]),
          ],
        },
        format: { _type: 'Parquet', useVectorizedScanner: true },
      },
      privacyClassification: { sensitivity: 'DP20', type: 'CPI' },
      dataResidencyJurisdictions: [{ region: 'US' }],
      preprocessors: [
        {
          _type: 'TakeMaxVersionFieldRecord',
          versionField: 'v',
          requireIncreasingVersion: true,
        },
        { _type: 'TrimTrailingWhitespace' },
        { _type: 'SomeFuturePreprocessor' },
      ],
      deleteIndicatorField: { deleteField: 'd', deleteValues: ['1'] },
    },
    {
      name: 'MV',
      primaryKey: [],
      source: { _type: 'FunctionSource', function: identity('id') },
      privacyClassification: { sensitivity: 'DP10' },
    },
    {
      name: 'FUTURE',
      source: { _type: 'SomeFutureSource', foo: 'bar' },
      privacyClassification: { sensitivity: 'DP00' },
    },
  ],
};

const BATCH_ATTRIBUTES_CLASS = {
  path: 'test::BatchAttributes',
  classifierPath: 'meta::pure::metamodel::type::Class',
  content: {
    _type: 'class',
    package: 'test',
    name: 'BatchAttributes',
    properties: [],
  },
};

const toEntity = (content: PlainObject) => ({
  path: `${content.package as string}::${content.name as string}`,
  classifierPath: INGEST_CLASSIFIER_PATH,
  content,
});

const buildIngest = async (
  content: PlainObject,
): Promise<{ state: GraphManagerState; ingest: IngestDefinition }> => {
  const state = TEST__getTestGraphManagerState();
  await TEST__buildGraphWithEntities(state, [
    BATCH_ATTRIBUTES_CLASS,
    toEntity(content),
  ]);
  const ingest = guaranteeType(
    state.graph.getElement(
      `${content.package as string}::${content.name as string}`,
    ),
    IngestDefinition,
  );
  return { state, ingest };
};

const buildSpecification = async (
  content: PlainObject,
): Promise<IngestDefinitionSpecification> => {
  const { state, ingest } = await buildIngest(content);
  const specification =
    state.graphManager.getOrBuildIngestDefinitionSpecification(
      ingest,
      state.graph,
    );
  expect(specification).toBeDefined();
  return specification as IngestDefinitionSpecification;
};

describe(
  unitTest('Ingest definition specification from older protocols'),
  () => {
    test.each([
      ['a data set schema and format override', LEGACY_WITH_DATA_SET_SCHEMA],
      ['a data set source', LEGACY_WITH_SOURCE],
      ['an owner', LEGACY_WITH_OWNER],
      ['a bare lambda lookup index', LEGACY_BARE_LAMBDA_LOOKUP_INDEX],
      [
        'a bare lambda lookup index and a data set schema',
        LEGACY_BARE_LAMBDA_LOOKUP_INDEX_WITH_DATA_SET_SCHEMA,
      ],
    ])('builds %s', async (_name, content) => {
      const specification = await buildSpecification(content);
      expect(specification.writeMode).toBeInstanceOf(
        IngestBatchMilestonedWriteMode,
      );
      const owner = guaranteeType(specification.owner, AppDirOwner);
      expect(owner.production?.appDirId).toBe(1);
      expect(owner.prodParallel).toBeUndefined();
      expect(specification.datasets.length).toBeGreaterThan(0);
      specification.datasets.forEach((dataset) =>
        expect(dataset.source).toBeInstanceOf(IngestSerializedSource),
      );
    });

    test('a data set schema and format override become its source', async () => {
      const specification = await buildSpecification(
        LEGACY_WITH_DATA_SET_SCHEMA,
      );
      const source = guaranteeType(
        specification.datasets[1]?.source,
        IngestSerializedSource,
      );
      const columns = V1_TEST__describeIngestColumns(source);
      expect(columns.map((c) => c.name)).toEqual([
        'id',
        'customer',
        'amount',
        'updatedAt',
      ]);
      expect(columns[1]?.typeArguments).toEqual(['100']);
      expect(source.format).toBeInstanceOf(IngestJsonMessageFormat);
    });

    test('legacy partition column names become identity lambdas', async () => {
      const specification = await buildSpecification(
        LEGACY_WITH_DATA_SET_SCHEMA,
      );
      expect(
        specification.datasets[1]?.ingestPartitionColumns.map(
          (lambda) => lambda.body,
        ),
      ).toEqual([identity('id').body, identity('customer').body]);
    });

    test('a legacy bare lambda lookup index becomes a whole relation index', async () => {
      const specification = await buildSpecification(
        LEGACY_BARE_LAMBDA_LOOKUP_INDEX,
      );
      expect(specification.datasets[0]?.lookupIndexes[0]).toBeInstanceOf(
        IngestWholeRelationLookupIndex,
      );
    });

    test('normalizing leaves the input as it is', () => {
      const input = JSON.parse(
        JSON.stringify(LEGACY_WITH_DATA_SET_SCHEMA),
      ) as PlainObject;
      const copy = JSON.parse(JSON.stringify(input)) as PlainObject;
      V1_normalizeLegacyIngestDefinitionJson(input);
      expect(input).toEqual(copy);
    });
  },
);

describe(unitTest('Ingest definition specification'), () => {
  test('builds every part of the definition', async () => {
    const specification = await buildSpecification(FULL_INGEST);

    const readMode = guaranteeType(specification.readMode, IngestDeltaReadMode);
    expect(readMode.deleteIndicator?.deleteValues).toEqual(['Y', 'y']);
    const csv = guaranteeType(readMode.format, IngestCsvMessageFormat);
    expect(csv.fieldDelimiter).toBe('|');
    expect(csv.parseHeader).toBe(true);
    // defaults the content leaves out
    expect(csv.recordDelimiter).toBe('\n');
    expect(csv.headerRowsToSkipCount).toBe(0);
    expect(csv.columnOverrides[0]?.dateFormat).toBe('yyyy-MM-dd');

    const writeMode = guaranteeType(
      specification.writeMode,
      IngestBatchMilestonedBusinessTemporalWriteMode,
    );
    expect(writeMode.businessTemporalField).toBe('bd');
    expect(writeMode.coalesceTimelineMode).toBe('NonCoalesceTimeline');
    expect(writeMode.temporalPassThrough?.lakeThru).toBe('thru');

    expect(specification.datasetGroup).toBe('GROUP1');
    expect(guaranteeType(specification.owner, IngestKerberosOwner).id).toBe(
      'someone',
    );
    expect(specification.enableTypeSystemValidations).toBe(true);
    expect(specification.autoTrigger).toBe(true);
    expect(specification.evaluationUser).toBe('svc_user');
    expect(specification.batchAttributes?.body).toEqual(
      identity('batchId').body,
    );
    // a profile the graph doesn't have: kept by its paths
    expect(specification.stereotypes).toEqual(['test::Profile.flagged']);
    // a system profile the graph has: resolved
    const taggedValue = guaranteeType(
      specification.taggedValues[0],
      TaggedValue,
    );
    expect(taggedValue.tag.value.value).toBe('doc');
    expect(taggedValue.value).toBe('hi');

    // references: resolved when the graph has the element, the path kept otherwise
    expect(
      guaranteeType(
        specification.batchAttributesType,
        PackageableElementReference,
      ).value,
    ).toBeInstanceOf(Class);
    expect(specification.compute).toBe('test::Compute');
    expect(specification.batchAttributesGenerator).toBe(
      'test::generator__String_1_',
    );
    expect(specification.prodDataProductOverride?.dataProducts).toEqual([
      'test::MissingDataProduct',
    ]);

    const [ds1, mv, future] = specification.datasets;
    expect(ds1?.primaryKey).toEqual(['id']);
    expect(ds1?.writeMode).toBeInstanceOf(IngestAppendOnlyWriteMode);
    expect(ds1?.storageLayoutClusterColumns[0]?.body).toEqual(
      identity('v').body,
    );
    expect(ds1?.lookupIndexes[0]).toBeInstanceOf(IngestEqualityLookupIndex);
    const fullText = guaranteeType(
      ds1?.lookupIndexes[1],
      IngestFullTextLookupIndex,
    );
    expect(fullText.path).toBe('a.b');
    expect(fullText.analyzer).toBe('UNICODE_ANALYZER');
    expect(ds1?.lookupIndexes[2]).toBeInstanceOf(
      INTERNAL__UnknownIngestLookupIndex,
    );
    const source = guaranteeType(ds1?.source, IngestSerializedSource);
    expect(V1_TEST__describeIngestColumns(source)[1]).toMatchObject({
      name: 'v',
      type: 'Varchar',
      typeArguments: ['200'],
      lowerBound: 0,
      upperBound: 1,
    });
    expect(source.format).toBeInstanceOf(IngestParquetMessageFormat);
    // as the content holds it
    expect(ds1?.privacyClassification?.sensitivity).toBe('DP20');
    expect(ds1?.privacyClassification?.type).toBe('CPI');
    expect(ds1?.dataResidencyJurisdictions).toEqual(['US']);
    expect(
      guaranteeType(ds1?.preprocessors[0], IngestTakeMaxVersionFieldRecord)
        .requireIncreasingVersion,
    ).toBe(true);
    expect(ds1?.preprocessors[1]).toBeInstanceOf(IngestTrimTrailingWhitespace);
    expect(ds1?.preprocessors[2]).toBeInstanceOf(
      INTERNAL__UnknownIngestPreprocessor,
    );
    expect(ds1?.deleteIndicatorField?.deleteField).toBe('d');

    expect(mv?.source).toBeInstanceOf(IngestFunctionSource);
    expect(future?.source).toBeInstanceOf(INTERNAL__UnknownIngestSource);
  });

  test('is undefined, with a warning, when the content has an unexpected shape', async () => {
    const { state, ingest } = await buildIngest({
      ...FULL_INGEST,
      datasets: [
        {
          name: 'BROKEN',
          source: {
            _type: 'serializedSource',
            schema: { _type: 'relationType', columns: 'not a list' },
          },
        },
      ],
    });
    const hashCode = ingest.hashCode;
    const content = ingest.content;
    const warnSpy = jest
      .spyOn(state.graphManager.logService, 'warn')
      .mockImplementation(() => undefined);
    try {
      expect(
        state.graphManager.getOrBuildIngestDefinitionSpecification(
          ingest,
          state.graph,
        ),
      ).toBeUndefined();
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(ingest.specification).toBeUndefined();
      expect(ingest.content).toBe(content);
      expect(ingest.hashCode).toBe(hashCode);
      // not retried until the content changes
      state.graphManager.getOrBuildIngestDefinitionSpecification(
        ingest,
        state.graph,
      );
      expect(warnSpy).toHaveBeenCalledTimes(1);
    } finally {
      warnSpy.mockRestore();
    }
  });

  test('reads a missing write mode as none, as the protocol reader does', async () => {
    const { writeMode: _writeMode, ...withoutWriteMode } = FULL_INGEST;
    const specification = await buildSpecification(withoutWriteMode);
    expect(specification.writeMode).toBeUndefined();
    expect(specification.datasets).toHaveLength(3);
  });

  test('is kept while the content is unchanged and rebuilt when it changes', async () => {
    const { state, ingest } = await buildIngest(FULL_INGEST);
    const first = state.graphManager.getOrBuildIngestDefinitionSpecification(
      ingest,
      state.graph,
    );
    expect(
      state.graphManager.getOrBuildIngestDefinitionSpecification(
        ingest,
        state.graph,
      ),
    ).toBe(first);
    ingest.content = {
      ...ingest.content,
      datasetGroup: 'GROUP2',
    };
    const second = state.graphManager.getOrBuildIngestDefinitionSpecification(
      ingest,
      state.graph,
    );
    expect(second).not.toBe(first);
    expect(second?.datasetGroup).toBe('GROUP2');
    expect(ingest.specification).toBe(second);
  });
});
