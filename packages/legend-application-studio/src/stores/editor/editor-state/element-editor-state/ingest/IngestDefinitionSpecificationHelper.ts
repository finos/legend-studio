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
  AppDirOwner,
  CORE_PURE_PATH,
  IngestAppendOnlyWriteMode,
  IngestAvroMessageFormat,
  IngestBatchMilestonedBusinessTemporalWriteMode,
  IngestBatchMilestonedWriteMode,
  IngestCoalesceTimelineMode,
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
  IngestSnapshotReadMode,
  IngestSubstringLookupIndex,
  IngestTakeMaxVersionFieldRecord,
  IngestTemporalSnapshotReadMode,
  IngestTrimLeadingWhitespace,
  IngestTrimTrailingWhitespace,
  IngestUndefinedReadMode,
  IngestUnresolvedTaggedValue,
  IngestWholeRelationLookupIndex,
  INTERNAL__UnknownIngestLookupIndex,
  INTERNAL__UnknownIngestMessageFormat,
  INTERNAL__UnknownIngestOwner,
  INTERNAL__UnknownIngestPreprocessor,
  INTERNAL__UnknownIngestReadMode,
  INTERNAL__UnknownIngestWriteMode,
  PURE_DOC_TAG,
  type IngestDataPrivacyClassification,
  type IngestDefinitionSpecification,
  type IngestDeleteIndicator,
  type IngestLookupIndex,
  type IngestMessageFormat,
  type IngestOwner,
  type IngestPreprocessor,
  type IngestReadMode,
  type IngestWriteMode,
  type PackageableElement,
  type PackageableElementReference,
  type RawLambda,
  type StereotypeReference,
} from '@finos/legend-graph';
import { isString, type PlainObject } from '@finos/legend-shared';

/** Every lambda of the specification, so they can be shown as Pure in one go */
export const getIngestSpecificationLambdas = (
  specification: IngestDefinitionSpecification,
): RawLambda[] => [
  ...(specification.batchAttributes ? [specification.batchAttributes] : []),
  ...(specification.barrier ? [specification.barrier] : []),
  ...specification.datasets.flatMap((dataset) => [
    ...dataset.ingestPartitionColumns,
    ...dataset.storageLayoutClusterColumns,
    ...dataset.storageLayoutPartitionColumns,
    ...dataset.lookupIndexes
      .filter(
        (index): index is IngestWholeRelationLookupIndex =>
          index instanceof IngestWholeRelationLookupIndex,
      )
      .map((index) => index.lambda),
    ...(dataset.source instanceof IngestFunctionSource
      ? [dataset.source.function]
      : []),
  ]),
];

// The specification, in words, as the Definition tab shows it: each part the
// specification doesn't know, e.g. one a newer engine adds, by its name

/** Whether a part of a phrase is there to join: not missing, not empty */
const isNonEmptyString = (value: string | undefined): value is string =>
  Boolean(value);

/** What an unknown part of the specification names itself, in its content */
const getUnknownPartLabel = (content: PlainObject): string =>
  isString(content._type) ? content._type : 'unknown';

/** The element a reference of the specification names, by its path, whether or not the graph has it */
export const getIngestReferencePath = (
  reference: PackageableElementReference<PackageableElement> | string,
): string => (isString(reference) ? reference : reference.value.path);

/** A write mode, in words: `batch milestoned`; one this doesn't know, by its name */
export const getIngestWriteModeLabel = (writeMode: IngestWriteMode): string => {
  if (writeMode instanceof IngestAppendOnlyWriteMode) {
    return 'append only';
  } else if (writeMode instanceof IngestBatchMilestonedWriteMode) {
    return 'batch milestoned';
  } else if (
    writeMode instanceof IngestBatchMilestonedBusinessTemporalWriteMode
  ) {
    return 'batch milestoned business temporal';
  }
  const type =
    writeMode instanceof INTERNAL__UnknownIngestWriteMode
      ? writeMode.content._type
      : undefined;
  return isString(type) ? type.replaceAll('_', ' ') : 'unknown';
};

/**
 * A write mode, in words, with what a business temporal one says of its
 * timeline: `batch milestoned business temporal, on TRADE_DATE`
 */
export const getIngestWriteModeDescription = (
  writeMode: IngestWriteMode,
): string => {
  const label = getIngestWriteModeLabel(writeMode);
  if (!(writeMode instanceof IngestBatchMilestonedBusinessTemporalWriteMode)) {
    return label;
  }
  const { temporalPassThrough, coalesceTimelineMode } = writeMode;
  return [
    label,
    writeMode.businessTemporalField && `on ${writeMode.businessTemporalField}`,
    temporalPassThrough &&
      `its dates from ${temporalPassThrough.lakeFrom} and ${temporalPassThrough.lakeThru}`,
    coalesceTimelineMode === IngestCoalesceTimelineMode.COALESCE_TIMELINE
      ? 'its timeline coalesced'
      : coalesceTimelineMode ===
          IngestCoalesceTimelineMode.NON_COALESCE_TIMELINE
        ? 'its timeline not coalesced'
        : coalesceTimelineMode,
  ]
    .filter(isNonEmptyString)
    .join(', ');
};

/** Who owns the definition: its production and prod parallel AppDir IDs, or its Kerberos ID */
export const getIngestOwnerLabel = (owner: IngestOwner): string => {
  if (owner instanceof AppDirOwner) {
    return (
      [
        owner.production && `production AppDir ${owner.production.appDirId}`,
        owner.prodParallel &&
          `prod parallel AppDir ${owner.prodParallel.appDirId}`,
      ]
        .filter(isNonEmptyString)
        .join(' · ') || 'AppDir'
    );
  } else if (owner instanceof IngestKerberosOwner) {
    return `Kerberos ${owner.id}`;
  } else if (owner instanceof INTERNAL__UnknownIngestOwner) {
    return getUnknownPartLabel(owner.content);
  }
  return 'unknown';
};

/** How the definition reads what it's sent: `Delta`, `Snapshot` */
export const getIngestReadModeLabel = (readMode: IngestReadMode): string => {
  if (readMode instanceof IngestDeltaReadMode) {
    return 'Delta';
  } else if (readMode instanceof IngestSnapshotReadMode) {
    return 'Snapshot';
  } else if (readMode instanceof IngestTemporalSnapshotReadMode) {
    return 'Temporal snapshot';
  } else if (readMode instanceof IngestUndefinedReadMode) {
    return 'Undefined';
  } else if (readMode instanceof INTERNAL__UnknownIngestReadMode) {
    return getUnknownPartLabel(readMode.content);
  }
  return 'unknown';
};

/** The format of the files it's sent: `CSV`, `Parquet` */
export const getIngestMessageFormatLabel = (
  format: IngestMessageFormat,
): string => {
  if (format instanceof IngestCsvMessageFormat) {
    return 'CSV';
  } else if (format instanceof IngestAvroMessageFormat) {
    return 'Avro';
  } else if (format instanceof IngestJsonMessageFormat) {
    return 'JSON';
  } else if (format instanceof IngestParquetMessageFormat) {
    return 'Parquet';
  } else if (format instanceof INTERNAL__UnknownIngestMessageFormat) {
    return getUnknownPartLabel(format.content);
  }
  return 'unknown';
};

/** A delimiter or quote, its line breaks and tabs written out: `\n` */
const showCharacters = (value: string): string =>
  value.replaceAll('\n', '\\n').replaceAll('\r', '\\r').replaceAll('\t', '\\t');

const showFlag = (value: boolean): string => (value ? 'Yes' : 'No');

/**
 * The options a format sets, as label and value, in the order its Pure
 * writes them; a CSV's per-column overrides last, one per column
 */
export const getIngestMessageFormatOptions = (
  format: IngestMessageFormat,
): [string, string][] => {
  const options: [string, string | boolean | undefined][] = [];
  if (format instanceof IngestCsvMessageFormat) {
    options.push(
      ['Field delimiter', showCharacters(format.fieldDelimiter)],
      ['Record delimiter', showCharacters(format.recordDelimiter)],
      ['Header rows skipped', String(format.headerRowsToSkipCount)],
      ['Parse header', format.parseHeader],
      [
        'Quote',
        format.quoteCharacter === undefined
          ? undefined
          : showCharacters(format.quoteCharacter),
      ],
      [
        'Escape',
        format.escapeCharacter === undefined
          ? undefined
          : showCharacters(format.escapeCharacter),
      ],
      ['Escape unquoted fields', format.escapeUnquotedField],
      ['Date format', format.dateFormat],
      ['Time format', format.timeFormat],
      ['Timestamp format', format.timestampFormat],
      ['Time zone', format.timeZone],
      ['Preserve empty strings', format.preserveEmptyString],
      ['Replace invalid characters', format.replaceInvalidCharacters],
      [
        'Empty strings as null in non-text columns',
        format.emptyStringAsNullForNonStringType,
      ],
      ...format.columnOverrides.map((override): [string, string] => [
        `Column ${override.column}`,
        [
          override.dateFormat && `date ${override.dateFormat}`,
          override.timeFormat && `time ${override.timeFormat}`,
          override.timestampFormat && `timestamp ${override.timestampFormat}`,
          override.timeZone && `time zone ${override.timeZone}`,
        ]
          .filter(isNonEmptyString)
          .join(', '),
      ]),
    );
  } else if (format instanceof IngestParquetMessageFormat) {
    options.push(
      ['Vectorized scanner', format.useVectorizedScanner],
      ['Replace invalid characters', format.replaceInvalidCharacters],
    );
  }
  return options.flatMap(([label, value]): [string, string][] =>
    value === undefined
      ? []
      : [[label, typeof value === 'boolean' ? showFlag(value) : value]],
  );
};

/** When a row counts as deleted: `A row whose STATUS is DELETED` */
export const getIngestDeleteIndicatorLabel = (
  indicator: IngestDeleteIndicator,
): string =>
  `A row whose ${indicator.deleteField} is ${indicator.deleteValues.join(' or ')}`;

/** How sensitive a data set's data is: `DP20`, with its type when it has one */
export const getIngestPrivacyClassificationLabel = (
  classification: IngestDataPrivacyClassification,
): string =>
  classification.type
    ? `${classification.sensitivity} ${classification.type}`
    : classification.sensitivity;

/** A lookup index: `Equality on BOOK_ID` */
export const getIngestLookupIndexLabel = (index: IngestLookupIndex): string => {
  const on = (column: string, path: string | undefined): string =>
    path ? `${column} (${path})` : column;
  if (index instanceof IngestEqualityLookupIndex) {
    return `Equality on ${on(index.column, index.path)}`;
  } else if (index instanceof IngestSubstringLookupIndex) {
    return `Substring on ${on(index.column, index.path)}`;
  } else if (index instanceof IngestFullTextLookupIndex) {
    return `Full text on ${on(index.column, index.path)}${
      index.analyzer ? `, ${index.analyzer}` : ''
    }`;
  } else if (index instanceof IngestWholeRelationLookupIndex) {
    return 'On the whole relation';
  } else if (index instanceof INTERNAL__UnknownIngestLookupIndex) {
    return getUnknownPartLabel(index.content);
  }
  return 'unknown';
};

/** A step of a data set's preprocessing: `Filter out exact duplicate records` */
export const getIngestPreprocessorLabel = (
  preprocessor: IngestPreprocessor,
): string => {
  if (preprocessor instanceof IngestTakeMaxVersionFieldRecord) {
    return `Take the record with the highest ${preprocessor.versionField ?? 'version'}${
      preprocessor.requireIncreasingVersion ? ', which must increase' : ''
    }`;
  } else if (preprocessor instanceof IngestOverwriteOnSnapshot) {
    return 'Overwrite on snapshot';
  } else if (preprocessor instanceof IngestFilterOutExactDuplicateRecords) {
    return 'Filter out exact duplicate records';
  } else if (preprocessor instanceof IngestIncludeInZOutZTimestamp) {
    return 'Include in_z and out_z timestamps';
  } else if (preprocessor instanceof IngestTrimTrailingWhitespace) {
    return 'Trim trailing whitespace';
  } else if (preprocessor instanceof IngestTrimLeadingWhitespace) {
    return 'Trim leading whitespace';
  } else if (preprocessor instanceof INTERNAL__UnknownIngestPreprocessor) {
    return getUnknownPartLabel(preprocessor.content);
  }
  return 'unknown';
};

/** The last part of a path: `doc` of `meta::pure::profiles::doc` */
const getPathName = (path: string): string => path.split('::').pop() ?? path;

type IngestTaggedValue = IngestDefinitionSpecification['taggedValues'][number];

/** A tagged value's profile and tag: `doc.doc` */
export const getIngestTaggedValueTag = (
  taggedValue: IngestTaggedValue,
): string =>
  taggedValue instanceof IngestUnresolvedTaggedValue
    ? `${getPathName(taggedValue.profile)}.${taggedValue.tag}`
    : `${getPathName(taggedValue.tag.ownerReference.value.path)}.${taggedValue.tag.value.value}`;

/** A stereotype's profile and name: `temporal.businesstemporal` */
export const getIngestStereotypeLabel = (
  stereotype: StereotypeReference | string,
): string =>
  isString(stereotype)
    ? stereotype
    : `${getPathName(stereotype.ownerReference.value.path)}.${stereotype.value.value}`;

/** Whether a tagged value is a doc of `meta::pure::profiles::doc` */
export const isIngestDocTaggedValue = (
  taggedValue: IngestTaggedValue,
): boolean =>
  taggedValue instanceof IngestUnresolvedTaggedValue
    ? taggedValue.profile === CORE_PURE_PATH.PROFILE_DOC &&
      taggedValue.tag === PURE_DOC_TAG
    : taggedValue.tag.ownerReference.value.path ===
        CORE_PURE_PATH.PROFILE_DOC &&
      taggedValue.tag.value.value === PURE_DOC_TAG;

/** The definition's doc, its first one, if it has one */
export const getIngestDefinitionDoc = (
  specification: IngestDefinitionSpecification,
): string | undefined =>
  specification.taggedValues.find(isIngestDocTaggedValue)?.value;
