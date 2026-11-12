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
import type { RawLambda } from '../../rawValueSpecification/RawLambda.js';
import type {
  RelationType,
  UnresolvedRelationColumn,
} from '../relation/RelationType.js';
import type { PackageableElement } from '../PackageableElement.js';
import type { PackageableElementReference } from '../PackageableElementReference.js';
import type { Class } from '../domain/Class.js';
import type { ConcreteFunctionDefinition } from '../function/ConcreteFunctionDefinition.js';
import type { StereotypeReference } from '../domain/StereotypeReference.js';
import type { TaggedValue } from '../domain/TaggedValue.js';
import type { Compute } from '../../compute/Compute.js';
import type {
  AppDirOwner,
  DataProduct,
} from '../../dataProduct/DataProduct.js';

// An ingest definition fully modelled, read from its content for viewing
// only: the content stays what is saved and edited

export enum IngestDataJurisdiction {
  US = 'US',
  CHINA = 'CHINA',
}

export enum IngestCoalesceTimelineMode {
  COALESCE_TIMELINE = 'CoalesceTimeline',
  NON_COALESCE_TIMELINE = 'NonCoalesceTimeline',
}

export enum IngestFullTextAnalyzer {
  DEFAULT_ANALYZER = 'DEFAULT_ANALYZER',
  UNICODE_ANALYZER = 'UNICODE_ANALYZER',
  NO_OP_ANALYZER = 'NO_OP_ANALYZER',
  ENTITY_ANALYZER = 'ENTITY_ANALYZER',
}

/**
 * A tagged value whose profile the graph doesn't have (e.g. one defined only
 * in the engine), kept by its paths
 */
export class IngestUnresolvedTaggedValue {
  profile!: string;
  tag!: string;
  value!: string;
}

// --------------------------------------------- Message Format ---------------------------------------------

export abstract class IngestMessageFormat {}

export class IngestCsvColumnOverride {
  column!: string;
  dateFormat?: string | undefined;
  timeFormat?: string | undefined;
  timestampFormat?: string | undefined;
  timeZone?: string | undefined;
}

export class IngestCsvMessageFormat extends IngestMessageFormat {
  fieldDelimiter = ',';
  headerRowsToSkipCount = 0;
  quoteCharacter?: string | undefined;
  escapeCharacter?: string | undefined;
  recordDelimiter = '\n';
  parseHeader = false;
  dateFormat?: string | undefined;
  timeFormat?: string | undefined;
  timestampFormat?: string | undefined;
  timeZone?: string | undefined;
  escapeUnquotedField?: string | undefined;
  preserveEmptyString?: boolean | undefined;
  replaceInvalidCharacters?: boolean | undefined;
  emptyStringAsNullForNonStringType?: boolean | undefined;
  columnOverrides: IngestCsvColumnOverride[] = [];
}

export class IngestAvroMessageFormat extends IngestMessageFormat {}

export class IngestJsonMessageFormat extends IngestMessageFormat {}

export class IngestParquetMessageFormat extends IngestMessageFormat {
  useVectorizedScanner?: boolean | undefined;
  replaceInvalidCharacters?: boolean | undefined;
}

export class INTERNAL__UnknownIngestMessageFormat extends IngestMessageFormat {
  content!: PlainObject;
}

// --------------------------------------------- Read Mode ---------------------------------------------

export class IngestDeleteIndicator {
  deleteField!: string;
  deleteValues: string[] = [];
}

export abstract class IngestReadMode {
  format?: IngestMessageFormat | undefined;
}

export class IngestDeltaReadMode extends IngestReadMode {
  deleteIndicator?: IngestDeleteIndicator | undefined;
}

export class IngestSnapshotReadMode extends IngestReadMode {}

export class IngestTemporalSnapshotReadMode extends IngestReadMode {}

export class IngestUndefinedReadMode extends IngestReadMode {}

export class INTERNAL__UnknownIngestReadMode extends IngestReadMode {
  content!: PlainObject;
}

// --------------------------------------------- Write Mode ---------------------------------------------

export abstract class IngestWriteMode {}

export class IngestAppendOnlyWriteMode extends IngestWriteMode {}

export class IngestBatchMilestonedWriteMode extends IngestWriteMode {}

export class IngestTemporalPassThrough {
  lakeFrom!: string;
  lakeThru!: string;
  disableBusinessTimelineValidation!: boolean;
  // as its protocol JSON, e.g. a `CDateTime`
  infinityDate?: PlainObject | undefined;
  lakeThruInfinityCutoff?: string | undefined;
}

export class IngestBatchMilestonedBusinessTemporalWriteMode extends IngestWriteMode {
  businessTemporalField?: string | undefined;
  temporalPassThrough?: IngestTemporalPassThrough | undefined;
  coalesceTimelineMode?: IngestCoalesceTimelineMode | string | undefined;
}

export class INTERNAL__UnknownIngestWriteMode extends IngestWriteMode {
  content!: PlainObject;
}

// --------------------------------------------- Owner ---------------------------------------------

export class IngestKerberosOwner {
  id!: string;
}

export class INTERNAL__UnknownIngestOwner {
  content!: PlainObject;
}

// an AppDir owner is a data product's
export type IngestOwner =
  | AppDirOwner
  | IngestKerberosOwner
  | INTERNAL__UnknownIngestOwner;

// --------------------------------------------- Source ---------------------------------------------

export abstract class IngestSource {}

export class IngestSerializedSource extends IngestSource {
  /** Undefined when the content has none */
  schema?: RelationType | undefined;
  /**
   * The columns whose type the graph doesn't have, typed `Any` in `schema`,
   * with the type the content names
   */
  unresolvedColumns: UnresolvedRelationColumn[] = [];
  format?: IngestMessageFormat | undefined;
}

/** A materialized view: the data set's rows come from the function */
export class IngestFunctionSource extends IngestSource {
  function!: RawLambda;
}

export class INTERNAL__UnknownIngestSource extends IngestSource {
  content!: PlainObject;
}

// --------------------------------------------- Lookup Index ---------------------------------------------

export abstract class IngestLookupIndex {}

export class IngestWholeRelationLookupIndex extends IngestLookupIndex {
  lambda!: RawLambda;
}

export abstract class IngestColumnLookupIndex extends IngestLookupIndex {
  column!: string;
  path?: string | undefined;
}

export class IngestEqualityLookupIndex extends IngestColumnLookupIndex {}

export class IngestSubstringLookupIndex extends IngestColumnLookupIndex {}

export class IngestFullTextLookupIndex extends IngestColumnLookupIndex {
  analyzer?: IngestFullTextAnalyzer | string | undefined;
}

export class INTERNAL__UnknownIngestLookupIndex extends IngestLookupIndex {
  content!: PlainObject;
}

// --------------------------------------------- Preprocessor ---------------------------------------------

export abstract class IngestPreprocessor {}

export class IngestTakeMaxVersionFieldRecord extends IngestPreprocessor {
  // the protocol's reader reads a missing version field as none
  versionField?: string | undefined;
  requireIncreasingVersion = false;
}

export class IngestOverwriteOnSnapshot extends IngestPreprocessor {}

export class IngestFilterOutExactDuplicateRecords extends IngestPreprocessor {}

export class IngestIncludeInZOutZTimestamp extends IngestPreprocessor {}

export class IngestTrimTrailingWhitespace extends IngestPreprocessor {}

export class IngestTrimLeadingWhitespace extends IngestPreprocessor {}

export class INTERNAL__UnknownIngestPreprocessor extends IngestPreprocessor {
  content!: PlainObject;
}

// --------------------------------------------- Dataset ---------------------------------------------

export class IngestDataPrivacyClassification {
  /** e.g. `DP10`, as the content holds it */
  sensitivity!: string;
  type?: string | undefined;
}

export class IngestDataset {
  name!: string;
  primaryKey: string[] = [];
  ingestPartitionColumns: RawLambda[] = [];
  storageLayoutClusterColumns: RawLambda[] = [];
  storageLayoutPartitionColumns: RawLambda[] = [];
  lookupIndexes: IngestLookupIndex[] = [];
  businessTemporalField?: string | undefined;
  /** Overrides the definition's write mode for this data set */
  writeMode?: IngestWriteMode | undefined;
  source!: IngestSource;
  privacyClassification?: IngestDataPrivacyClassification | undefined;
  dataResidencyJurisdictions: (IngestDataJurisdiction | string)[] = [];
  preprocessors: IngestPreprocessor[] = [];
  deleteIndicatorField?: IngestDeleteIndicator | undefined;
}

// --------------------------------------------- Definition ---------------------------------------------

export class IngestProdDataProductOverride {
  all = false;
  dataProducts: (PackageableElementReference<DataProduct> | string)[] = [];
}

export class IngestDefinitionSpecification {
  readMode?: IngestReadMode | undefined;
  writeMode?: IngestWriteMode | undefined;
  datasets: IngestDataset[] = [];
  datasetGroup = 'DEFAULT';
  owner?: IngestOwner | undefined;
  prodDataProductOverride?: IngestProdDataProductOverride | undefined;
  enableTypeSystemValidations?: boolean | undefined;
  autoTrigger?: boolean | undefined;
  evaluationUser?: string | undefined;
  /** Path of the Snowflake or Databricks compute */
  compute?: PackageableElementReference<Compute> | string | undefined;
  batchAttributes?: RawLambda | undefined;
  barrier?: RawLambda | undefined;
  batchAttributesType?: PackageableElementReference<Class> | string | undefined;
  batchAttributesGenerator?:
    | PackageableElementReference<ConcreteFunctionDefinition>
    | string
    | undefined;
  temporalDateGenerator?:
    | PackageableElementReference<ConcreteFunctionDefinition>
    | string
    | undefined;
  barrierGenerator?:
    | PackageableElementReference<PackageableElement>
    | string
    | undefined;
  /** A stereotype whose profile the graph doesn't have is kept as `profile.value` */
  stereotypes: (StereotypeReference | string)[] = [];
  taggedValues: (TaggedValue | IngestUnresolvedTaggedValue)[] = [];
}
