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
  IngestDefinition,
  IngestDeltaReadMode,
  IngestSerializedSource,
  type IngestDefinitionSpecification,
} from '@finos/legend-graph';
import {
  guaranteeNonNullable,
  guaranteeType,
  type PlainObject,
} from '@finos/legend-shared';
import type { Entity } from '@finos/legend-storage';
import {
  getIngestDefinitionDoc,
  getIngestDeleteIndicatorLabel,
  getIngestLookupIndexLabel,
  getIngestMessageFormatLabel,
  getIngestMessageFormatOptions,
  getIngestOwnerLabel,
  getIngestPreprocessorLabel,
  getIngestPrivacyClassificationLabel,
  getIngestReadModeLabel,
  getIngestReferencePath,
  getIngestTaggedValueTag,
  getIngestWriteModeDescription,
  getIngestWriteModeLabel,
  isIngestDocTaggedValue,
} from '../IngestDefinitionSpecificationHelper.js';

// The definition's settings and its data sets' metadata, in words, as the
// Overview shows them, from a specification legend-graph builds from content

const INGEST_PATH = 'test::TradesIngest';

const buildSpecification = async (
  content: PlainObject,
): Promise<IngestDefinitionSpecification> => {
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
  return guaranteeNonNullable(
    graphManager.getOrBuildIngestDefinitionSpecification(
      guaranteeType(graph.getElement(INGEST_PATH), IngestDefinition),
      graph,
    ),
  );
};

/** A data set with one column, its other settings as given, a format its source's */
const dataSet = (
  name: string,
  { format, ...settings }: PlainObject = {},
): PlainObject => ({
  name,
  primaryKey: ['ID'],
  source: {
    _type: 'serializedSource',
    schema: {
      _type: 'relationType',
      columns: [
        {
          name: 'ID',
          genericType: {
            rawType: { _type: 'packageableType', fullPath: 'Integer' },
            typeArguments: [],
            multiplicityArguments: [],
            typeVariableValues: [],
          },
          multiplicity: { lowerBound: 1, upperBound: 1 },
        },
      ],
    },
    ...(format ? { format } : {}),
  },
  ...settings,
});

test(
  unitTest(
    "An ingest definition's settings, in words: its owner, how it reads and writes, its doc",
  ),
  async () => {
    const specification = await buildSpecification({
      owner: {
        _type: 'appDir',
        production: { appDirId: 41051, level: 'DEPLOYMENT' },
        prodParallel: { appDirId: 41052, level: 'DEPLOYMENT' },
      },
      readMode: {
        _type: 'Delta',
        format: {
          _type: 'CSV',
          fieldDelimiter: '|',
          headerRowsToSkipCount: 1,
          recordDelimiter: '\n',
          parseHeader: true,
          quoteCharacter: '"',
          dateFormat: 'yyyy-MM-dd',
          timeZone: 'America/New_York',
          emptyStringAsNullForNonStringType: true,
          columnOverrides: [{ column: 'TRADE_DATE', dateFormat: 'dd/MM/yyyy' }],
        },
        deleteIndicator: {
          deleteField: 'STATUS',
          deleteValues: ['DELETED', 'GONE'],
        },
      },
      writeMode: {
        _type: 'batch_milestoned_business_temporal',
        businessTemporalField: 'TRADE_DATE',
        coalesceTimelineMode: 'CoalesceTimeline',
      },
      taggedValues: [
        {
          tag: { profile: 'meta::pure::profiles::doc', value: 'doc' },
          value: 'End-of-day trades for the Markets desks',
        },
        {
          tag: { profile: 'test::Governance', value: 'team' },
          value: 'Markets',
        },
      ],
      datasets: [dataSet('TRADES')],
    });
    const { owner, readMode, writeMode } = specification;

    expect(getIngestOwnerLabel(guaranteeNonNullable(owner))).toBe(
      'production AppDir 41051 · prod parallel AppDir 41052',
    );
    expect(getIngestReadModeLabel(guaranteeNonNullable(readMode))).toBe(
      'Delta',
    );
    const format = guaranteeNonNullable(readMode?.format);
    expect(getIngestMessageFormatLabel(format)).toBe('CSV');
    // the options it sets, its line breaks written out, its overrides last
    expect(getIngestMessageFormatOptions(format)).toEqual([
      ['Field delimiter', '|'],
      ['Record delimiter', '\\n'],
      ['Header rows skipped', '1'],
      ['Parse header', 'Yes'],
      ['Quote', '"'],
      ['Date format', 'yyyy-MM-dd'],
      ['Time zone', 'America/New_York'],
      ['Empty strings as null in non-text columns', 'Yes'],
      ['Column TRADE_DATE', 'date dd/MM/yyyy'],
    ]);
    expect(
      getIngestDeleteIndicatorLabel(
        guaranteeNonNullable(
          guaranteeType(readMode, IngestDeltaReadMode).deleteIndicator,
        ),
      ),
    ).toBe('A row whose STATUS is DELETED or GONE');
    expect(getIngestWriteModeLabel(guaranteeNonNullable(writeMode))).toBe(
      'batch milestoned business temporal',
    );
    expect(getIngestWriteModeDescription(guaranteeNonNullable(writeMode))).toBe(
      'batch milestoned business temporal, on TRADE_DATE, its timeline coalesced',
    );
    // its doc, apart from its other tagged values
    expect(getIngestDefinitionDoc(specification)).toBe(
      'End-of-day trades for the Markets desks',
    );
    expect(
      specification.taggedValues.map((taggedValue) => [
        getIngestTaggedValueTag(taggedValue),
        isIngestDocTaggedValue(taggedValue),
      ]),
    ).toEqual([
      ['doc.doc', true],
      ['Governance.team', false],
    ]);
  },
);

test(
  unitTest(
    "A data set's metadata, in words: its classification, deletes, lookup indexes, preprocessing and format",
  ),
  async () => {
    const specification = await buildSpecification({
      owner: { _type: 'kerberos', id: 'svc_trades' },
      readMode: { _type: 'Snapshot', format: { _type: 'Avro' } },
      compute: 'test::MarketsSnowflake',
      datasets: [
        dataSet('TRADES', {
          privacyClassification: { sensitivity: 'DP20' },
          dataResidencyJurisdictions: [{ region: 'US' }],
          deleteIndicatorField: {
            deleteField: 'STATUS',
            deleteValues: ['DELETED'],
          },
          lookupIndexes: [
            { _type: 'equality', column: 'ID' },
            { _type: 'substring', column: 'BOOK', path: 'books' },
            { _type: 'fullText', column: 'NAME', analyzer: 'DEFAULT_ANALYZER' },
            { _type: 'vectorIndex', column: 'EMBEDDING' },
          ],
          preprocessors: [
            {
              _type: 'TakeMaxVersionFieldRecord',
              versionField: 'VERSION',
              requireIncreasingVersion: true,
            },
            { _type: 'FilterOutExactDuplicateRecords' },
            { _type: 'TrimTrailingWhitespace' },
            { _type: 'NormaliseUnicode' },
          ],
          format: {
            _type: 'Parquet',
            useVectorizedScanner: true,
            replaceInvalidCharacters: false,
          },
        }),
      ],
    });
    const trades = guaranteeNonNullable(specification.datasets[0]);

    expect(getIngestOwnerLabel(guaranteeNonNullable(specification.owner))).toBe(
      'Kerberos svc_trades',
    );
    expect(
      getIngestReadModeLabel(guaranteeNonNullable(specification.readMode)),
    ).toBe('Snapshot');
    // a compute the project doesn't have, by its path
    expect(
      getIngestReferencePath(guaranteeNonNullable(specification.compute)),
    ).toBe('test::MarketsSnowflake');
    expect(
      getIngestPrivacyClassificationLabel(
        guaranteeNonNullable(trades.privacyClassification),
      ),
    ).toBe('DP20');
    expect(trades.dataResidencyJurisdictions).toEqual(['US']);
    expect(
      getIngestDeleteIndicatorLabel(
        guaranteeNonNullable(trades.deleteIndicatorField),
      ),
    ).toBe('A row whose STATUS is DELETED');
    // one a newer engine adds, by its name
    expect(trades.lookupIndexes.map(getIngestLookupIndexLabel)).toEqual([
      'Equality on ID',
      'Substring on BOOK (books)',
      'Full text on NAME, DEFAULT_ANALYZER',
      'vectorIndex',
    ]);
    expect(trades.preprocessors.map(getIngestPreprocessorLabel)).toEqual([
      'Take the record with the highest VERSION, which must increase',
      'Filter out exact duplicate records',
      'Trim trailing whitespace',
      'NormaliseUnicode',
    ]);
    const format = guaranteeNonNullable(
      guaranteeType(trades.source, IngestSerializedSource).format,
    );
    expect(getIngestMessageFormatLabel(format)).toBe('Parquet');
    expect(getIngestMessageFormatOptions(format)).toEqual([
      ['Vectorized scanner', 'Yes'],
      ['Replace invalid characters', 'No'],
    ]);
  },
);
