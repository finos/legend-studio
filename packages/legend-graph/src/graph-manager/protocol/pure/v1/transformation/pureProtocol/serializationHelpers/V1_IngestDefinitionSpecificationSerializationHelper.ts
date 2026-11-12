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
  assertTrue,
  guaranteeIsString,
  isNonNullable,
  isPlainObject,
  isString,
  optionalCustom,
  usingModelSchema,
  type PlainObject,
} from '@finos/legend-shared';
import {
  createModelSchema,
  custom,
  deserialize,
  list,
  optional,
  primitive,
  SKIP,
} from 'serializr';
import {
  V1_IngestAvroMessageFormat,
  V1_IngestCsvColumnOverride,
  V1_IngestCsvMessageFormat,
  V1_IngestDataPrivacyClassification,
  V1_IngestDataResidencyJurisdiction,
  V1_IngestDefinitionSpecification,
  V1_IngestDeleteIndicator,
  V1_IngestDeltaReadMode,
  V1_IngestEqualityLookupIndex,
  V1_IngestFilterOutExactDuplicateRecords,
  V1_IngestFullTextLookupIndex,
  V1_IngestFunctionSource,
  V1_IngestIncludeInZOutZTimestamp,
  V1_IngestJsonMessageFormat,
  V1_IngestKerberosOwner,
  V1_IngestLookupIndexType,
  V1_IngestMessageFormatType,
  V1_IngestOverwriteOnSnapshot,
  V1_IngestOwnerType,
  V1_IngestParquetMessageFormat,
  V1_IngestPreprocessorType,
  V1_IngestReadModeType,
  V1_IngestSerializedSource,
  V1_IngestSnapshotReadMode,
  V1_IngestSourceType,
  V1_IngestSpecificationDataset,
  V1_IngestSubstringLookupIndex,
  V1_IngestTakeMaxVersionFieldRecord,
  V1_IngestTemporalSnapshotReadMode,
  V1_IngestTrimLeadingWhitespace,
  V1_IngestTrimTrailingWhitespace,
  V1_IngestUndefinedReadMode,
  V1_IngestWholeRelationLookupIndex,
  V1_INTERNAL__UnknownIngestLookupIndex,
  V1_INTERNAL__UnknownIngestMessageFormat,
  V1_INTERNAL__UnknownIngestOwner,
  V1_INTERNAL__UnknownIngestPreprocessor,
  V1_INTERNAL__UnknownIngestReadMode,
  V1_INTERNAL__UnknownIngestSource,
  V1_INTERNAL__UnknownIngestWriteMode,
  type V1_IngestLookupIndex,
  type V1_IngestMessageFormat,
  type V1_IngestOwner,
  type V1_IngestPreprocessor,
  type V1_IngestReadMode,
  type V1_IngestSource,
} from '../../../model/packageableElements/ingest/V1_IngestDefinitionSpecification.js';
import { V1_rawLambdaModelSchema } from './V1_RawValueSpecificationSerializationHelper.js';
import {
  V1_relationTypeModelSchema,
  V1_Type_Type,
} from './V1_TypeSerializationHelper.js';
import {
  V1_serializePackageableElementPointer,
  V1_stereotypePtrModelSchema,
  V1_taggedValueModelSchema,
} from './V1_CoreSerializationHelper.js';
import {
  V1_AppDirOwnerModelSchema,
  V1_prodDataProductOverrideModelSchema,
} from './V1_DataProductSerializationHelper.js';
import { V1_deserializeWriteMode } from './V1_IngestSerializationHelper.js';
import {
  type V1_WriteMode,
  V1_WriteModeType,
} from '../../../model/packageableElements/ingest/V1_IngestDefinition.js';
import { V1_DataProductOwnerType } from '../../../model/packageableElements/dataProduct/V1_DataProduct.js';

// --------------------------------------------- Legacy protocols ---------------------------------------------

// unlike `pruneNullValues`, which only prunes the top level
const withoutNulls = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(withoutNulls);
  } else if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, entry]) => entry !== null)
        .map(([key, entry]) => [key, withoutNulls(entry)]),
    );
  }
  return value;
};

// the only write modes the protocol ever stored as strings: any other string
// is rejected
const LEGACY_WRITE_MODES = [
  V1_WriteModeType.BATCH_MILESTONED,
  V1_WriteModeType.APPEND_ONLY,
] as string[];

const normalizeWriteMode = (writeMode: unknown): unknown => {
  if (isString(writeMode)) {
    assertTrue(
      LEGACY_WRITE_MODES.includes(writeMode),
      `Unknown write mode: ${writeMode}`,
    );
    return { _type: writeMode };
  }
  return writeMode;
};

// the identity partition of a column: `x|$x.column`
const identityLambda = (column: string): PlainObject => ({
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

const normalizeLegacyDataset = (dataset: PlainObject): PlainObject => {
  const result: PlainObject = { ...dataset };
  // `schema` and `formatOverride` used to sit on the data set
  if (result.source === undefined) {
    result.source = {
      _type: V1_IngestSourceType.SERIALIZED_SOURCE,
      schema: result.schema,
      format: result.formatOverride,
    };
    delete result.schema;
    delete result.formatOverride;
  }
  // column lists used to hold column names
  for (const key of [
    'ingestPartitionColumns',
    'storageLayoutClusterColumns',
    'storageLayoutPartitionColumns',
  ]) {
    if (Array.isArray(result[key])) {
      result[key] = (result[key] as unknown[]).map((column) =>
        isString(column) ? identityLambda(column) : column,
      );
    }
  }
  // a whole-relation lookup index used to be a bare lambda
  if (Array.isArray(result.lookupIndexes)) {
    result.lookupIndexes = (result.lookupIndexes as unknown[]).map((index) =>
      isPlainObject(index) && index._type === 'lambda'
        ? { _type: V1_IngestLookupIndexType.WHOLE_RELATION, lambda: index }
        : index,
    );
  }
  return result;
};

/**
 * Upgrades the shapes older versions of the ingest protocol stored to the
 * current one, as the protocol's reader does. The input is not modified.
 */
export const V1_normalizeLegacyIngestDefinitionJson = (
  json: PlainObject,
): PlainObject => {
  // Jackson writes unset properties as `null`: read them as absent
  const result = withoutNulls(json) as PlainObject;
  // `writeMode` used to be a string
  result.writeMode = normalizeWriteMode(result.writeMode);
  // `owner` used to be `appDirDeployment`, a production DID
  if (result.owner === undefined && isPlainObject(result.appDirDeployment)) {
    result.owner = {
      _type: V1_DataProductOwnerType.APP_DIR,
      production: result.appDirDeployment,
    };
  }
  result.datasetGroup ??= 'DEFAULT';
  if (Array.isArray(result.datasets)) {
    result.datasets = result.datasets.map((dataset: unknown) =>
      isPlainObject(dataset) ? normalizeLegacyDataset(dataset) : dataset,
    );
  }
  return result;
};

// --------------------------------------------- Shared ---------------------------------------------

const guaranteeIsJson = (val: unknown, message: string): PlainObject => {
  assertTrue(isPlainObject(val), message);
  return val as PlainObject;
};

// read only: nothing is serialized back
const readOnly = <T>(deserializer: (json: PlainObject) => T) =>
  optionalCustom(
    () => SKIP,
    (json: unknown) =>
      deserializer(guaranteeIsJson(json, `Expected an object`)),
  );

const readOnlyPointer = optionalCustom(
  () => SKIP,
  V1_serializePackageableElementPointer,
);

// stricter than `customList`, which reads what isn't a list as an empty one:
// the protocol's reader rejects it
const readOnlyList = <T>(
  deserializer: (json: PlainObject) => T,
): ReturnType<typeof custom> =>
  custom(
    () => SKIP,
    (json: unknown) => {
      if (json === undefined || json === null) {
        return [];
      }
      assertTrue(Array.isArray(json), 'Expected a list');
      return (json as unknown[]).map((element) =>
        deserializer(guaranteeIsJson(element, `Expected an object`)),
      );
    },
  );

const readOnlyRawLambdaList = readOnlyList((json) =>
  deserialize(V1_rawLambdaModelSchema, json),
);

// --------------------------------------------- Message Format ---------------------------------------------

const V1_ingestCsvColumnOverrideModelSchema = createModelSchema(
  V1_IngestCsvColumnOverride,
  {
    column: primitive(),
    dateFormat: optional(primitive()),
    timeFormat: optional(primitive()),
    timestampFormat: optional(primitive()),
    timeZone: optional(primitive()),
  },
);

const V1_ingestCsvMessageFormatModelSchema = createModelSchema(
  V1_IngestCsvMessageFormat,
  {
    fieldDelimiter: optional(primitive()),
    headerRowsToSkipCount: optional(primitive()),
    quoteCharacter: optional(primitive()),
    escapeCharacter: optional(primitive()),
    recordDelimiter: optional(primitive()),
    parseHeader: optional(primitive()),
    dateFormat: optional(primitive()),
    timeFormat: optional(primitive()),
    timestampFormat: optional(primitive()),
    timeZone: optional(primitive()),
    escapeUnquotedField: optional(primitive()),
    preserveEmptyString: optional(primitive()),
    replaceInvalidCharacters: optional(primitive()),
    emptyStringAsNullForNonStringType: optional(primitive()),
    columnOverrides: readOnlyList((json) =>
      deserialize(V1_ingestCsvColumnOverrideModelSchema, json),
    ),
  },
);

const V1_ingestParquetMessageFormatModelSchema = createModelSchema(
  V1_IngestParquetMessageFormat,
  {
    useVectorizedScanner: optional(primitive()),
    replaceInvalidCharacters: optional(primitive()),
  },
);

const V1_deserializeIngestMessageFormat = (
  json: PlainObject,
): V1_IngestMessageFormat => {
  switch (json._type) {
    case V1_IngestMessageFormatType.CSV:
      return deserialize(V1_ingestCsvMessageFormatModelSchema, json);
    case V1_IngestMessageFormatType.AVRO:
      return new V1_IngestAvroMessageFormat();
    case V1_IngestMessageFormatType.JSON:
      return new V1_IngestJsonMessageFormat();
    case V1_IngestMessageFormatType.PARQUET:
      return deserialize(V1_ingestParquetMessageFormatModelSchema, json);
    default: {
      const unknown = new V1_INTERNAL__UnknownIngestMessageFormat();
      unknown.content = json;
      return unknown;
    }
  }
};

// --------------------------------------------- Read Mode ---------------------------------------------

const V1_ingestDeleteIndicatorModelSchema = createModelSchema(
  V1_IngestDeleteIndicator,
  {
    deleteField: primitive(),
    deleteValues: list(primitive()),
  },
);

const V1_ingestDeltaReadModeModelSchema = createModelSchema(
  V1_IngestDeltaReadMode,
  {
    format: readOnly(V1_deserializeIngestMessageFormat),
    deleteIndicator: optional(
      usingModelSchema(V1_ingestDeleteIndicatorModelSchema),
    ),
  },
);

const readModeWithFormat = <T extends V1_IngestReadMode>(
  readMode: T,
  json: PlainObject,
): T => {
  readMode.format = isPlainObject(json.format)
    ? V1_deserializeIngestMessageFormat(json.format)
    : undefined;
  return readMode;
};

export const V1_deserializeIngestReadMode = (
  json: PlainObject,
): V1_IngestReadMode => {
  switch (json._type) {
    case V1_IngestReadModeType.DELTA:
      return deserialize(V1_ingestDeltaReadModeModelSchema, json);
    case V1_IngestReadModeType.SNAPSHOT:
      return readModeWithFormat(new V1_IngestSnapshotReadMode(), json);
    case V1_IngestReadModeType.TEMPORAL_SNAPSHOT:
      return readModeWithFormat(new V1_IngestTemporalSnapshotReadMode(), json);
    case V1_IngestReadModeType.UNDEFINED:
      return readModeWithFormat(new V1_IngestUndefinedReadMode(), json);
    default: {
      const unknown = readModeWithFormat(
        new V1_INTERNAL__UnknownIngestReadMode(),
        json,
      );
      unknown.content = json;
      return unknown;
    }
  }
};

// --------------------------------------------- Write Mode ---------------------------------------------

const KNOWN_WRITE_MODES = Object.values(V1_WriteModeType) as string[];

export const V1_deserializeIngestWriteMode = (
  json: PlainObject,
): V1_WriteMode => {
  if (isString(json._type) && KNOWN_WRITE_MODES.includes(json._type)) {
    return V1_deserializeWriteMode(json);
  }
  const unknown = new V1_INTERNAL__UnknownIngestWriteMode();
  unknown.content = json;
  return unknown;
};

// --------------------------------------------- Owner ---------------------------------------------

const V1_ingestKerberosOwnerModelSchema = createModelSchema(
  V1_IngestKerberosOwner,
  {
    id: primitive(),
  },
);

const V1_deserializeIngestOwner = (json: PlainObject): V1_IngestOwner => {
  switch (json._type) {
    case V1_DataProductOwnerType.APP_DIR:
      return deserialize(V1_AppDirOwnerModelSchema, json);
    case V1_IngestOwnerType.KERBEROS:
      return deserialize(V1_ingestKerberosOwnerModelSchema, json);
    default: {
      const unknown = new V1_INTERNAL__UnknownIngestOwner();
      unknown.content = json;
      return unknown;
    }
  }
};

// --------------------------------------------- Source ---------------------------------------------

const V1_deserializeIngestSource = (json: PlainObject): V1_IngestSource => {
  switch (json._type) {
    case V1_IngestSourceType.SERIALIZED_SOURCE: {
      const source = new V1_IngestSerializedSource();
      // the protocol's reader reads a missing schema as none
      if (isNonNullable(json.schema)) {
        const schema = guaranteeIsJson(
          json.schema,
          `Serialized source schema must be an object`,
        );
        assertTrue(
          schema._type === V1_Type_Type.RELATION_TYPE,
          `Serialized source schema must be a relation type`,
        );
        assertTrue(
          !isNonNullable(schema.columns) || Array.isArray(schema.columns),
          `Serialized source schema columns must be a list`,
        );
        source.schema = deserialize(V1_relationTypeModelSchema, {
          ...schema,
          columns: schema.columns ?? [],
        });
      }
      source.format = isPlainObject(json.format)
        ? V1_deserializeIngestMessageFormat(json.format)
        : undefined;
      return source;
    }
    case V1_IngestSourceType.FUNCTION_SOURCE: {
      const source = new V1_IngestFunctionSource();
      source.function = deserialize(
        V1_rawLambdaModelSchema,
        guaranteeIsJson(json.function, `Function source must have a function`),
      );
      return source;
    }
    default: {
      const unknown = new V1_INTERNAL__UnknownIngestSource();
      unknown.content = json;
      return unknown;
    }
  }
};

// --------------------------------------------- Lookup Index ---------------------------------------------

const columnLookupIndexProps = {
  column: primitive(),
  path: optional(primitive()),
};

const V1_ingestEqualityLookupIndexModelSchema = createModelSchema(
  V1_IngestEqualityLookupIndex,
  columnLookupIndexProps,
);

const V1_ingestSubstringLookupIndexModelSchema = createModelSchema(
  V1_IngestSubstringLookupIndex,
  columnLookupIndexProps,
);

const V1_ingestFullTextLookupIndexModelSchema = createModelSchema(
  V1_IngestFullTextLookupIndex,
  {
    ...columnLookupIndexProps,
    analyzer: optional(primitive()),
  },
);

const V1_deserializeIngestLookupIndex = (
  json: PlainObject,
): V1_IngestLookupIndex => {
  switch (json._type) {
    case V1_IngestLookupIndexType.WHOLE_RELATION: {
      const index = new V1_IngestWholeRelationLookupIndex();
      index.lambda = deserialize(
        V1_rawLambdaModelSchema,
        guaranteeIsJson(
          json.lambda,
          `Whole relation lookup index must have a lambda`,
        ),
      );
      return index;
    }
    case V1_IngestLookupIndexType.EQUALITY:
      return deserialize(V1_ingestEqualityLookupIndexModelSchema, json);
    case V1_IngestLookupIndexType.SUBSTRING:
      return deserialize(V1_ingestSubstringLookupIndexModelSchema, json);
    case V1_IngestLookupIndexType.FULL_TEXT:
      return deserialize(V1_ingestFullTextLookupIndexModelSchema, json);
    default: {
      const unknown = new V1_INTERNAL__UnknownIngestLookupIndex();
      unknown.content = json;
      return unknown;
    }
  }
};

// --------------------------------------------- Preprocessor ---------------------------------------------

const V1_deserializeIngestPreprocessor = (
  json: PlainObject,
): V1_IngestPreprocessor => {
  switch (json._type) {
    case V1_IngestPreprocessorType.TAKE_MAX_VERSION_FIELD_RECORD: {
      const preprocessor = new V1_IngestTakeMaxVersionFieldRecord();
      preprocessor.versionField = isNonNullable(json.versionField)
        ? guaranteeIsString(
            json.versionField,
            `TakeMaxVersionFieldRecord version field must be a string`,
          )
        : undefined;
      preprocessor.requireIncreasingVersion =
        json.requireIncreasingVersion === true;
      return preprocessor;
    }
    case V1_IngestPreprocessorType.OVERWRITE_ON_SNAPSHOT:
      return new V1_IngestOverwriteOnSnapshot();
    case V1_IngestPreprocessorType.FILTER_OUT_EXACT_DUPLICATE_RECORDS:
      return new V1_IngestFilterOutExactDuplicateRecords();
    case V1_IngestPreprocessorType.INCLUDE_INZ_OUTZ_TIMESTAMP:
      return new V1_IngestIncludeInZOutZTimestamp();
    case V1_IngestPreprocessorType.TRIM_TRAILING_WHITESPACE:
      return new V1_IngestTrimTrailingWhitespace();
    case V1_IngestPreprocessorType.TRIM_LEADING_WHITESPACE:
      return new V1_IngestTrimLeadingWhitespace();
    default: {
      const unknown = new V1_INTERNAL__UnknownIngestPreprocessor();
      unknown.content = json;
      return unknown;
    }
  }
};

// --------------------------------------------- Dataset ---------------------------------------------

const V1_ingestDataPrivacyClassificationModelSchema = createModelSchema(
  V1_IngestDataPrivacyClassification,
  {
    sensitivity: primitive(),
    type: optional(primitive()),
  },
);

const V1_ingestDataResidencyJurisdictionModelSchema = createModelSchema(
  V1_IngestDataResidencyJurisdiction,
  {
    region: primitive(),
  },
);

const V1_ingestSpecificationDatasetModelSchema = createModelSchema(
  V1_IngestSpecificationDataset,
  {
    name: primitive(),
    primaryKey: list(primitive()),
    ingestPartitionColumns: readOnlyRawLambdaList,
    storageLayoutClusterColumns: readOnlyRawLambdaList,
    storageLayoutPartitionColumns: readOnlyRawLambdaList,
    lookupIndexes: readOnlyList(V1_deserializeIngestLookupIndex),
    businessTemporalField: optional(primitive()),
    writeMode: readOnly(V1_deserializeIngestWriteMode),
    source: readOnly(V1_deserializeIngestSource),
    privacyClassification: optional(
      usingModelSchema(V1_ingestDataPrivacyClassificationModelSchema),
    ),
    dataResidencyJurisdictions: readOnlyList((json) =>
      deserialize(V1_ingestDataResidencyJurisdictionModelSchema, json),
    ),
    preprocessors: readOnlyList(V1_deserializeIngestPreprocessor),
    deleteIndicatorField: optional(
      usingModelSchema(V1_ingestDeleteIndicatorModelSchema),
    ),
  },
);

const deserializeDataset = (
  json: PlainObject,
): V1_IngestSpecificationDataset => {
  assertTrue(
    isPlainObject(json) && isString(json.name),
    `Data set must have a name`,
  );
  assertTrue(
    isPlainObject(json.source),
    `Data set '${String(json.name)}' must have a source`,
  );
  return deserialize(V1_ingestSpecificationDatasetModelSchema, json);
};

// --------------------------------------------- Definition ---------------------------------------------

const V1_ingestDefinitionSpecificationModelSchema = createModelSchema(
  V1_IngestDefinitionSpecification,
  {
    readMode: readOnly(V1_deserializeIngestReadMode),
    writeMode: readOnly(V1_deserializeIngestWriteMode),
    datasets: readOnlyList(deserializeDataset),
    datasetGroup: primitive(),
    owner: readOnly(V1_deserializeIngestOwner),
    prodDataProductOverride: optional(
      usingModelSchema(V1_prodDataProductOverrideModelSchema),
    ),
    batchAttributes: optional(usingModelSchema(V1_rawLambdaModelSchema)),
    enableTypeSystemValidations: optional(primitive()),
    barrier: optional(usingModelSchema(V1_rawLambdaModelSchema)),
    autoTrigger: optional(primitive()),
    evaluationUser: optional(primitive()),
    compute: optional(primitive()),
    batchAttributesType: optional(primitive()),
    batchAttributesGenerator: readOnlyPointer,
    temporalDateGenerator: readOnlyPointer,
    barrierGenerator: readOnlyPointer,
    stereotypes: readOnlyList((json) =>
      deserialize(V1_stereotypePtrModelSchema, json),
    ),
    taggedValues: readOnlyList((json) =>
      deserialize(V1_taggedValueModelSchema, json),
    ),
  },
);

/**
 * Reads an ingest definition's content (its protocol JSON, current or from an
 * older protocol) into the full ingest definition protocol. An unknown `_type`
 * is kept as an unknown node; content that doesn't have the expected shape
 * throws.
 */
export const V1_deserializeIngestDefinitionSpecification = (
  json: PlainObject,
): V1_IngestDefinitionSpecification => {
  assertTrue(
    isPlainObject(json),
    `Ingest definition content must be an object`,
  );
  const normalized = V1_normalizeLegacyIngestDefinitionJson(json);
  // the protocol's reader reads a missing read or write mode as none
  assertTrue(
    !isNonNullable(normalized.readMode) || isPlainObject(normalized.readMode),
    `Ingest definition read mode must be an object`,
  );
  assertTrue(
    !isNonNullable(normalized.writeMode) || isPlainObject(normalized.writeMode),
    `Ingest definition write mode must be an object`,
  );
  assertTrue(
    !isNonNullable(normalized.datasets) || Array.isArray(normalized.datasets),
    `Ingest definition data sets must be a list`,
  );
  return deserialize(V1_ingestDefinitionSpecificationModelSchema, normalized);
};
