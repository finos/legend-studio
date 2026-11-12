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

import type { PlainObject } from '@finos/legend-shared';
import type { V1_RawLambda } from '../../rawValueSpecification/V1_RawLambda.js';
import type { V1_RelationType } from '../type/V1_RelationType.js';
import type { V1_PackageableElementPointer } from '../V1_PackageableElement.js';
import type { V1_StereotypePtr } from '../domain/V1_StereotypePtr.js';
import type { V1_TaggedValue } from '../domain/V1_TaggedValue.js';
import type {
  V1_AppDirOwner,
  V1_ProdDataProductOverride,
} from '../dataProduct/V1_DataProduct.js';
import { V1_WriteMode } from './V1_IngestDefinition.js';

// The full ingest definition protocol (`meta::external::ingest::specification::protocol`).
// Read only: it is deserialized from an ingest definition's content, never
// serialized back

export enum V1_IngestReadModeType {
  DELTA = 'Delta',
  SNAPSHOT = 'Snapshot',
  TEMPORAL_SNAPSHOT = 'TemporalSnapshot',
  UNDEFINED = 'Undefined',
}

export enum V1_IngestMessageFormatType {
  CSV = 'CSV',
  AVRO = 'Avro',
  JSON = 'JSON',
  PARQUET = 'Parquet',
}

export enum V1_IngestSourceType {
  SERIALIZED_SOURCE = 'serializedSource',
  FUNCTION_SOURCE = 'FunctionSource',
}

export enum V1_IngestLookupIndexType {
  WHOLE_RELATION = 'wholeRelation',
  EQUALITY = 'equality',
  SUBSTRING = 'substring',
  FULL_TEXT = 'fullText',
}

export enum V1_IngestPreprocessorType {
  TAKE_MAX_VERSION_FIELD_RECORD = 'TakeMaxVersionFieldRecord',
  OVERWRITE_ON_SNAPSHOT = 'OverwriteOnSnapshot',
  FILTER_OUT_EXACT_DUPLICATE_RECORDS = 'FilterOutExactDuplicateRecords',
  INCLUDE_INZ_OUTZ_TIMESTAMP = 'IncludeInZOutZTimestamp',
  TRIM_TRAILING_WHITESPACE = 'TrimTrailingWhitespace',
  TRIM_LEADING_WHITESPACE = 'TrimLeadingWhitespace',
}

export enum V1_IngestOwnerType {
  KERBEROS = 'kerberos',
}

// --------------------------------------------- Message Format ---------------------------------------------

export abstract class V1_IngestMessageFormat {}

export class V1_IngestCsvColumnOverride {
  column!: string;
  dateFormat?: string | undefined;
  timeFormat?: string | undefined;
  timestampFormat?: string | undefined;
  timeZone?: string | undefined;
}

export class V1_IngestCsvMessageFormat extends V1_IngestMessageFormat {
  fieldDelimiter?: string | undefined;
  headerRowsToSkipCount?: number | undefined;
  quoteCharacter?: string | undefined;
  escapeCharacter?: string | undefined;
  recordDelimiter?: string | undefined;
  parseHeader?: boolean | undefined;
  dateFormat?: string | undefined;
  timeFormat?: string | undefined;
  timestampFormat?: string | undefined;
  timeZone?: string | undefined;
  escapeUnquotedField?: string | undefined;
  preserveEmptyString?: boolean | undefined;
  replaceInvalidCharacters?: boolean | undefined;
  emptyStringAsNullForNonStringType?: boolean | undefined;
  columnOverrides: V1_IngestCsvColumnOverride[] = [];
}

export class V1_IngestAvroMessageFormat extends V1_IngestMessageFormat {}

export class V1_IngestJsonMessageFormat extends V1_IngestMessageFormat {}

export class V1_IngestParquetMessageFormat extends V1_IngestMessageFormat {
  useVectorizedScanner?: boolean | undefined;
  replaceInvalidCharacters?: boolean | undefined;
}

export class V1_INTERNAL__UnknownIngestMessageFormat extends V1_IngestMessageFormat {
  content!: PlainObject;
}

// --------------------------------------------- Read Mode ---------------------------------------------

export class V1_IngestDeleteIndicator {
  deleteField!: string;
  deleteValues: string[] = [];
}

export abstract class V1_IngestReadMode {
  format?: V1_IngestMessageFormat | undefined;
}

export class V1_IngestDeltaReadMode extends V1_IngestReadMode {
  deleteIndicator?: V1_IngestDeleteIndicator | undefined;
}

export class V1_IngestSnapshotReadMode extends V1_IngestReadMode {}

export class V1_IngestTemporalSnapshotReadMode extends V1_IngestReadMode {}

export class V1_IngestUndefinedReadMode extends V1_IngestReadMode {}

export class V1_INTERNAL__UnknownIngestReadMode extends V1_IngestReadMode {
  content!: PlainObject;
}

// --------------------------------------------- Write Mode ---------------------------------------------

// the known write modes are `V1_WriteMode`'s
export class V1_INTERNAL__UnknownIngestWriteMode extends V1_WriteMode {
  content!: PlainObject;
}

// --------------------------------------------- Owner ---------------------------------------------

export class V1_IngestKerberosOwner {
  id!: string;
}

export class V1_INTERNAL__UnknownIngestOwner {
  content!: PlainObject;
}

// an AppDir owner is a data product's
export type V1_IngestOwner =
  | V1_AppDirOwner
  | V1_IngestKerberosOwner
  | V1_INTERNAL__UnknownIngestOwner;

// --------------------------------------------- Source ---------------------------------------------

export abstract class V1_IngestSource {}

export class V1_IngestSerializedSource extends V1_IngestSource {
  schema?: V1_RelationType | undefined;
  format?: V1_IngestMessageFormat | undefined;
}

export class V1_IngestFunctionSource extends V1_IngestSource {
  function!: V1_RawLambda;
}

export class V1_INTERNAL__UnknownIngestSource extends V1_IngestSource {
  content!: PlainObject;
}

// --------------------------------------------- Lookup Index ---------------------------------------------

export abstract class V1_IngestLookupIndex {}

export class V1_IngestWholeRelationLookupIndex extends V1_IngestLookupIndex {
  lambda!: V1_RawLambda;
}

export abstract class V1_IngestColumnLookupIndex extends V1_IngestLookupIndex {
  column!: string;
  path?: string | undefined;
}

export class V1_IngestEqualityLookupIndex extends V1_IngestColumnLookupIndex {}

export class V1_IngestSubstringLookupIndex extends V1_IngestColumnLookupIndex {}

export class V1_IngestFullTextLookupIndex extends V1_IngestColumnLookupIndex {
  analyzer?: string | undefined;
}

export class V1_INTERNAL__UnknownIngestLookupIndex extends V1_IngestLookupIndex {
  content!: PlainObject;
}

// --------------------------------------------- Preprocessor ---------------------------------------------

export abstract class V1_IngestPreprocessor {}

export class V1_IngestTakeMaxVersionFieldRecord extends V1_IngestPreprocessor {
  versionField?: string | undefined;
  requireIncreasingVersion!: boolean;
}

export class V1_IngestOverwriteOnSnapshot extends V1_IngestPreprocessor {}

export class V1_IngestFilterOutExactDuplicateRecords extends V1_IngestPreprocessor {}

export class V1_IngestIncludeInZOutZTimestamp extends V1_IngestPreprocessor {}

export class V1_IngestTrimTrailingWhitespace extends V1_IngestPreprocessor {}

export class V1_IngestTrimLeadingWhitespace extends V1_IngestPreprocessor {}

export class V1_INTERNAL__UnknownIngestPreprocessor extends V1_IngestPreprocessor {
  content!: PlainObject;
}

// --------------------------------------------- Dataset ---------------------------------------------

export class V1_IngestDataPrivacyClassification {
  sensitivity!: string;
  type?: string | undefined;
}

export class V1_IngestDataResidencyJurisdiction {
  region!: string;
}

export class V1_IngestSpecificationDataset {
  name!: string;
  primaryKey: string[] = [];
  ingestPartitionColumns: V1_RawLambda[] = [];
  storageLayoutClusterColumns: V1_RawLambda[] = [];
  storageLayoutPartitionColumns: V1_RawLambda[] = [];
  lookupIndexes: V1_IngestLookupIndex[] = [];
  businessTemporalField?: string | undefined;
  writeMode?: V1_WriteMode | undefined;
  source!: V1_IngestSource;
  privacyClassification?: V1_IngestDataPrivacyClassification | undefined;
  dataResidencyJurisdictions: V1_IngestDataResidencyJurisdiction[] = [];
  preprocessors: V1_IngestPreprocessor[] = [];
  deleteIndicatorField?: V1_IngestDeleteIndicator | undefined;
}

// --------------------------------------------- Definition ---------------------------------------------

export class V1_IngestDefinitionSpecification {
  readMode?: V1_IngestReadMode | undefined;
  writeMode?: V1_WriteMode | undefined;
  datasets: V1_IngestSpecificationDataset[] = [];
  datasetGroup!: string;
  owner?: V1_IngestOwner | undefined;
  prodDataProductOverride?: V1_ProdDataProductOverride | undefined;
  batchAttributes?: V1_RawLambda | undefined;
  enableTypeSystemValidations?: boolean | undefined;
  barrier?: V1_RawLambda | undefined;
  autoTrigger?: boolean | undefined;
  evaluationUser?: string | undefined;
  compute?: string | undefined;
  batchAttributesType?: string | undefined;
  // only on `extendedIngestDefinition`
  batchAttributesGenerator?: V1_PackageableElementPointer | undefined;
  temporalDateGenerator?: V1_PackageableElementPointer | undefined;
  barrierGenerator?: V1_PackageableElementPointer | undefined;
  stereotypes: V1_StereotypePtr[] = [];
  taggedValues: V1_TaggedValue[] = [];
}
