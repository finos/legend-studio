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
  LogEvent,
  returnUndefOnError,
  UnsupportedOperationError,
  type PlainObject,
} from '@finos/legend-shared';
import { action } from 'mobx';
import type { IngestDefinition } from '../../../../../../../../graph/metamodel/pure/packageableElements/ingest/IngestDefinition.js';
import { hashObjectWithoutSourceInformation } from '../../../../../../../../graph/Core_HashUtils.js';
import { GRAPH_MANAGER_EVENT } from '../../../../../../../../__lib__/GraphManagerEvent.js';
import type { RawLambda } from '../../../../../../../../graph/metamodel/pure/rawValueSpecification/RawLambda.js';
import type { PackageableElement } from '../../../../../../../../graph/metamodel/pure/packageableElements/PackageableElement.js';
import type { PackageableElementReference } from '../../../../../../../../graph/metamodel/pure/packageableElements/PackageableElementReference.js';
import type { StereotypeReference } from '../../../../../../../../graph/metamodel/pure/packageableElements/domain/StereotypeReference.js';
import type { TaggedValue } from '../../../../../../../../graph/metamodel/pure/packageableElements/domain/TaggedValue.js';
import type { V1_GraphBuilderContext } from '../V1_GraphBuilderContext.js';
import { V1_buildTaggedValue } from './V1_DomainBuilderHelper.js';
import type { V1_StereotypePtr } from '../../../../model/packageableElements/domain/V1_StereotypePtr.js';
import type { V1_TaggedValue } from '../../../../model/packageableElements/domain/V1_TaggedValue.js';
import {
  IngestAppendOnlyWriteMode,
  IngestAvroMessageFormat,
  IngestBatchMilestonedBusinessTemporalWriteMode,
  IngestBatchMilestonedWriteMode,
  IngestCsvColumnOverride,
  IngestCsvMessageFormat,
  IngestDataPrivacyClassification,
  IngestDataset,
  IngestDefinitionSpecification,
  IngestDeleteIndicator,
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
  IngestProdDataProductOverride,
  IngestSerializedSource,
  IngestSnapshotReadMode,
  IngestSubstringLookupIndex,
  IngestUnresolvedTaggedValue,
  IngestTakeMaxVersionFieldRecord,
  IngestTemporalPassThrough,
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
  type IngestColumnLookupIndex,
  type IngestLookupIndex,
  type IngestMessageFormat,
  type IngestOwner,
  type IngestPreprocessor,
  type IngestReadMode,
  type IngestSource,
  type IngestWriteMode,
} from '../../../../../../../../graph/metamodel/pure/packageableElements/ingest/IngestDefinitionSpecification.js';
import {
  V1_IngestAvroMessageFormat,
  V1_IngestCsvMessageFormat,
  V1_IngestDeltaReadMode,
  V1_IngestEqualityLookupIndex,
  V1_IngestFilterOutExactDuplicateRecords,
  V1_IngestFullTextLookupIndex,
  V1_IngestFunctionSource,
  V1_IngestIncludeInZOutZTimestamp,
  V1_IngestJsonMessageFormat,
  V1_IngestKerberosOwner,
  V1_IngestOverwriteOnSnapshot,
  V1_IngestParquetMessageFormat,
  V1_IngestSerializedSource,
  V1_IngestSnapshotReadMode,
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
  type V1_IngestColumnLookupIndex,
  type V1_IngestDeleteIndicator,
  type V1_IngestLookupIndex,
  type V1_IngestMessageFormat,
  type V1_IngestOwner,
  type V1_IngestPreprocessor,
  type V1_IngestReadMode,
  type V1_IngestSource,
  type V1_IngestSpecificationDataset,
} from '../../../../model/packageableElements/ingest/V1_IngestDefinitionSpecification.js';
import type { V1_RawLambda } from '../../../../model/rawValueSpecification/V1_RawLambda.js';
import { V1_deserializeIngestDefinitionSpecification } from '../../../pureProtocol/serializationHelpers/V1_IngestDefinitionSpecificationSerializationHelper.js';
import { V1_buildComputeOwner } from './V1_ComputeBuilder.js';
import {
  V1_AppendOnly,
  V1_BatchMilestoned,
  V1_BatchMilestonedBusinessTemporal,
  type V1_WriteMode,
} from '../../../../model/packageableElements/ingest/V1_IngestDefinition.js';
import { V1_AppDirOwner } from '../../../../model/packageableElements/dataProduct/V1_DataProduct.js';
import { V1_buildResolvedRelationTypeFromV1RelationType } from '../../../../helpers/V1_AccessorHelper.js';
import { V1_buildRawLambdaWithResolvedPaths } from './V1_ValueSpecificationPathResolver.js';

const buildRawLambda = (
  lambda: V1_RawLambda,
  context: V1_GraphBuilderContext,
): RawLambda =>
  V1_buildRawLambdaWithResolvedPaths(lambda.parameters, lambda.body, context);

// resolved with the context's resolver for its kind, otherwise kept by its
// path: one missing (e.g. from a dependency not loaded) or of another kind
// mustn't fail the specification
const buildReference = <T extends PackageableElement>(
  path: string,
  resolve: (path: string) => PackageableElementReference<T>,
): PackageableElementReference<T> | string =>
  returnUndefOnError(() => resolve(path)) ?? path;

// a stereotype of a profile the graph doesn't have (e.g. one defined only in
// the engine) is kept by its paths
const buildStereotype = (
  v1Stereotype: V1_StereotypePtr,
  context: V1_GraphBuilderContext,
): StereotypeReference | string =>
  returnUndefOnError(() => context.resolveStereotype(v1Stereotype)) ??
  `${v1Stereotype.profile}.${v1Stereotype.value}`;

const buildTaggedValue = (
  v1TaggedValue: V1_TaggedValue,
  context: V1_GraphBuilderContext,
): TaggedValue | IngestUnresolvedTaggedValue => {
  const taggedValue = returnUndefOnError(() =>
    V1_buildTaggedValue(v1TaggedValue, context),
  );
  if (taggedValue) {
    return taggedValue;
  }
  const unresolved = new IngestUnresolvedTaggedValue();
  unresolved.profile = v1TaggedValue.tag.profile;
  unresolved.tag = v1TaggedValue.tag.value;
  unresolved.value = v1TaggedValue.value;
  return unresolved;
};

const buildMessageFormat = (
  format: V1_IngestMessageFormat,
): IngestMessageFormat => {
  if (format instanceof V1_IngestCsvMessageFormat) {
    const csv = new IngestCsvMessageFormat();
    csv.fieldDelimiter = format.fieldDelimiter ?? csv.fieldDelimiter;
    csv.headerRowsToSkipCount =
      format.headerRowsToSkipCount ?? csv.headerRowsToSkipCount;
    csv.quoteCharacter = format.quoteCharacter;
    csv.escapeCharacter = format.escapeCharacter;
    csv.recordDelimiter = format.recordDelimiter ?? csv.recordDelimiter;
    csv.parseHeader = format.parseHeader ?? csv.parseHeader;
    csv.dateFormat = format.dateFormat;
    csv.timeFormat = format.timeFormat;
    csv.timestampFormat = format.timestampFormat;
    csv.timeZone = format.timeZone;
    csv.escapeUnquotedField = format.escapeUnquotedField;
    csv.preserveEmptyString = format.preserveEmptyString;
    csv.replaceInvalidCharacters = format.replaceInvalidCharacters;
    csv.emptyStringAsNullForNonStringType =
      format.emptyStringAsNullForNonStringType;
    csv.columnOverrides = format.columnOverrides.map((v1Override) => {
      const override = new IngestCsvColumnOverride();
      override.column = v1Override.column;
      override.dateFormat = v1Override.dateFormat;
      override.timeFormat = v1Override.timeFormat;
      override.timestampFormat = v1Override.timestampFormat;
      override.timeZone = v1Override.timeZone;
      return override;
    });
    return csv;
  } else if (format instanceof V1_IngestAvroMessageFormat) {
    return new IngestAvroMessageFormat();
  } else if (format instanceof V1_IngestJsonMessageFormat) {
    return new IngestJsonMessageFormat();
  } else if (format instanceof V1_IngestParquetMessageFormat) {
    const parquet = new IngestParquetMessageFormat();
    parquet.useVectorizedScanner = format.useVectorizedScanner;
    parquet.replaceInvalidCharacters = format.replaceInvalidCharacters;
    return parquet;
  } else if (format instanceof V1_INTERNAL__UnknownIngestMessageFormat) {
    const unknown = new INTERNAL__UnknownIngestMessageFormat();
    unknown.content = format.content;
    return unknown;
  }
  throw new UnsupportedOperationError(`Can't build ingest message format`);
};

const buildDeleteIndicator = (
  v1Indicator: V1_IngestDeleteIndicator,
): IngestDeleteIndicator => {
  const indicator = new IngestDeleteIndicator();
  indicator.deleteField = v1Indicator.deleteField;
  indicator.deleteValues = [...v1Indicator.deleteValues];
  return indicator;
};

const buildReadMode = (v1ReadMode: V1_IngestReadMode): IngestReadMode => {
  let readMode: IngestReadMode;
  if (v1ReadMode instanceof V1_IngestDeltaReadMode) {
    const delta = new IngestDeltaReadMode();
    delta.deleteIndicator = v1ReadMode.deleteIndicator
      ? buildDeleteIndicator(v1ReadMode.deleteIndicator)
      : undefined;
    readMode = delta;
  } else if (v1ReadMode instanceof V1_IngestSnapshotReadMode) {
    readMode = new IngestSnapshotReadMode();
  } else if (v1ReadMode instanceof V1_IngestTemporalSnapshotReadMode) {
    readMode = new IngestTemporalSnapshotReadMode();
  } else if (v1ReadMode instanceof V1_IngestUndefinedReadMode) {
    readMode = new IngestUndefinedReadMode();
  } else if (v1ReadMode instanceof V1_INTERNAL__UnknownIngestReadMode) {
    const unknown = new INTERNAL__UnknownIngestReadMode();
    unknown.content = v1ReadMode.content;
    readMode = unknown;
  } else {
    throw new UnsupportedOperationError(`Can't build ingest read mode`);
  }
  readMode.format = v1ReadMode.format
    ? buildMessageFormat(v1ReadMode.format)
    : undefined;
  return readMode;
};

const buildWriteMode = (v1WriteMode: V1_WriteMode): IngestWriteMode => {
  if (v1WriteMode instanceof V1_AppendOnly) {
    return new IngestAppendOnlyWriteMode();
  } else if (v1WriteMode instanceof V1_BatchMilestoned) {
    return new IngestBatchMilestonedWriteMode();
  } else if (v1WriteMode instanceof V1_BatchMilestonedBusinessTemporal) {
    const writeMode = new IngestBatchMilestonedBusinessTemporalWriteMode();
    writeMode.businessTemporalField = v1WriteMode.businessTemporalField;
    writeMode.coalesceTimelineMode = v1WriteMode.coalesceTimelineMode;
    const v1PassThrough = v1WriteMode.temporalPassThrough;
    if (v1PassThrough) {
      const passThrough = new IngestTemporalPassThrough();
      passThrough.lakeFrom = v1PassThrough.lakeFrom;
      passThrough.lakeThru = v1PassThrough.lakeThru;
      passThrough.disableBusinessTimelineValidation =
        v1PassThrough.disableBusinessTimelineValidation;
      passThrough.infinityDate = v1PassThrough.infinityDate;
      passThrough.lakeThruInfinityCutoff = v1PassThrough.lakeThruInfinityCutoff;
      writeMode.temporalPassThrough = passThrough;
    }
    return writeMode;
  } else if (v1WriteMode instanceof V1_INTERNAL__UnknownIngestWriteMode) {
    const unknown = new INTERNAL__UnknownIngestWriteMode();
    unknown.content = v1WriteMode.content;
    return unknown;
  }
  throw new UnsupportedOperationError(`Can't build ingest write mode`);
};

const buildOwner = (v1Owner: V1_IngestOwner): IngestOwner => {
  if (v1Owner instanceof V1_AppDirOwner) {
    return V1_buildComputeOwner(v1Owner);
  } else if (v1Owner instanceof V1_IngestKerberosOwner) {
    const owner = new IngestKerberosOwner();
    owner.id = v1Owner.id;
    return owner;
  } else if (v1Owner instanceof V1_INTERNAL__UnknownIngestOwner) {
    const unknown = new INTERNAL__UnknownIngestOwner();
    unknown.content = v1Owner.content;
    return unknown;
  }
  throw new UnsupportedOperationError(`Can't build ingest owner`);
};

const buildSource = (
  v1Source: V1_IngestSource,
  context: V1_GraphBuilderContext,
): IngestSource => {
  if (v1Source instanceof V1_IngestSerializedSource) {
    const source = new IngestSerializedSource();
    if (v1Source.schema) {
      const { relationType, unresolvedColumns } =
        V1_buildResolvedRelationTypeFromV1RelationType(
          v1Source.schema,
          context.graph,
        );
      source.schema = relationType;
      source.unresolvedColumns = unresolvedColumns;
    }
    source.format = v1Source.format
      ? buildMessageFormat(v1Source.format)
      : undefined;
    return source;
  } else if (v1Source instanceof V1_IngestFunctionSource) {
    const source = new IngestFunctionSource();
    source.function = buildRawLambda(v1Source.function, context);
    return source;
  } else if (v1Source instanceof V1_INTERNAL__UnknownIngestSource) {
    const unknown = new INTERNAL__UnknownIngestSource();
    unknown.content = v1Source.content;
    return unknown;
  }
  throw new UnsupportedOperationError(`Can't build ingest data set source`);
};

const withColumn = <T extends IngestColumnLookupIndex>(
  index: T,
  v1Index: V1_IngestColumnLookupIndex,
): T => {
  index.column = v1Index.column;
  index.path = v1Index.path;
  return index;
};

const buildLookupIndex = (
  v1Index: V1_IngestLookupIndex,
  context: V1_GraphBuilderContext,
): IngestLookupIndex => {
  if (v1Index instanceof V1_IngestWholeRelationLookupIndex) {
    const index = new IngestWholeRelationLookupIndex();
    index.lambda = buildRawLambda(v1Index.lambda, context);
    return index;
  } else if (v1Index instanceof V1_IngestEqualityLookupIndex) {
    return withColumn(new IngestEqualityLookupIndex(), v1Index);
  } else if (v1Index instanceof V1_IngestSubstringLookupIndex) {
    return withColumn(new IngestSubstringLookupIndex(), v1Index);
  } else if (v1Index instanceof V1_IngestFullTextLookupIndex) {
    const index = withColumn(new IngestFullTextLookupIndex(), v1Index);
    index.analyzer = v1Index.analyzer;
    return index;
  } else if (v1Index instanceof V1_INTERNAL__UnknownIngestLookupIndex) {
    const unknown = new INTERNAL__UnknownIngestLookupIndex();
    unknown.content = v1Index.content;
    return unknown;
  }
  throw new UnsupportedOperationError(`Can't build ingest lookup index`);
};

const buildPreprocessor = (
  v1Preprocessor: V1_IngestPreprocessor,
): IngestPreprocessor => {
  if (v1Preprocessor instanceof V1_IngestTakeMaxVersionFieldRecord) {
    const preprocessor = new IngestTakeMaxVersionFieldRecord();
    preprocessor.versionField = v1Preprocessor.versionField;
    preprocessor.requireIncreasingVersion =
      v1Preprocessor.requireIncreasingVersion;
    return preprocessor;
  } else if (v1Preprocessor instanceof V1_IngestOverwriteOnSnapshot) {
    return new IngestOverwriteOnSnapshot();
  } else if (
    v1Preprocessor instanceof V1_IngestFilterOutExactDuplicateRecords
  ) {
    return new IngestFilterOutExactDuplicateRecords();
  } else if (v1Preprocessor instanceof V1_IngestIncludeInZOutZTimestamp) {
    return new IngestIncludeInZOutZTimestamp();
  } else if (v1Preprocessor instanceof V1_IngestTrimTrailingWhitespace) {
    return new IngestTrimTrailingWhitespace();
  } else if (v1Preprocessor instanceof V1_IngestTrimLeadingWhitespace) {
    return new IngestTrimLeadingWhitespace();
  } else if (v1Preprocessor instanceof V1_INTERNAL__UnknownIngestPreprocessor) {
    const unknown = new INTERNAL__UnknownIngestPreprocessor();
    unknown.content = v1Preprocessor.content;
    return unknown;
  }
  throw new UnsupportedOperationError(`Can't build ingest preprocessor`);
};

const buildDataset = (
  v1Dataset: V1_IngestSpecificationDataset,
  context: V1_GraphBuilderContext,
): IngestDataset => {
  const dataset = new IngestDataset();
  dataset.name = v1Dataset.name;
  dataset.primaryKey = [...v1Dataset.primaryKey];
  dataset.ingestPartitionColumns = v1Dataset.ingestPartitionColumns.map(
    (lambda) => buildRawLambda(lambda, context),
  );
  dataset.storageLayoutClusterColumns =
    v1Dataset.storageLayoutClusterColumns.map((lambda) =>
      buildRawLambda(lambda, context),
    );
  dataset.storageLayoutPartitionColumns =
    v1Dataset.storageLayoutPartitionColumns.map((lambda) =>
      buildRawLambda(lambda, context),
    );
  dataset.lookupIndexes = v1Dataset.lookupIndexes.map((index) =>
    buildLookupIndex(index, context),
  );
  dataset.businessTemporalField = v1Dataset.businessTemporalField;
  dataset.writeMode = v1Dataset.writeMode
    ? buildWriteMode(v1Dataset.writeMode)
    : undefined;
  dataset.source = buildSource(v1Dataset.source, context);
  if (v1Dataset.privacyClassification) {
    const privacyClassification = new IngestDataPrivacyClassification();
    privacyClassification.sensitivity =
      v1Dataset.privacyClassification.sensitivity;
    privacyClassification.type = v1Dataset.privacyClassification.type;
    dataset.privacyClassification = privacyClassification;
  }
  dataset.dataResidencyJurisdictions = v1Dataset.dataResidencyJurisdictions.map(
    (jurisdiction) => jurisdiction.region,
  );
  dataset.preprocessors = v1Dataset.preprocessors.map(buildPreprocessor);
  dataset.deleteIndicatorField = v1Dataset.deleteIndicatorField
    ? buildDeleteIndicator(v1Dataset.deleteIndicatorField)
    : undefined;
  return dataset;
};

/**
 * Builds an ingest definition's specification from its content (its protocol
 * JSON). References the graph doesn't have keep their path; content that
 * can't be read throws.
 */
export const V1_buildIngestDefinitionSpecification = (
  content: PlainObject,
  context: V1_GraphBuilderContext,
): IngestDefinitionSpecification => {
  const v1Spec = V1_deserializeIngestDefinitionSpecification(content);
  const spec = new IngestDefinitionSpecification();
  spec.readMode = v1Spec.readMode ? buildReadMode(v1Spec.readMode) : undefined;
  spec.writeMode = v1Spec.writeMode
    ? buildWriteMode(v1Spec.writeMode)
    : undefined;
  spec.datasets = v1Spec.datasets.map((dataset) =>
    buildDataset(dataset, context),
  );
  spec.datasetGroup = v1Spec.datasetGroup;
  spec.owner = v1Spec.owner ? buildOwner(v1Spec.owner) : undefined;
  if (v1Spec.prodDataProductOverride) {
    const override = new IngestProdDataProductOverride();
    override.all = v1Spec.prodDataProductOverride.all;
    override.dataProducts = v1Spec.prodDataProductOverride.dataProducts.map(
      (pointer) => buildReference(pointer.path, context.resolveDataProduct),
    );
    spec.prodDataProductOverride = override;
  }
  spec.enableTypeSystemValidations = v1Spec.enableTypeSystemValidations;
  spec.autoTrigger = v1Spec.autoTrigger;
  spec.evaluationUser = v1Spec.evaluationUser;
  spec.compute = v1Spec.compute
    ? buildReference(v1Spec.compute, (path) =>
        context.createImplicitPackageableElementReference(
          path,
          context.graph.getCompute,
        ),
      )
    : undefined;
  spec.batchAttributes = v1Spec.batchAttributes
    ? buildRawLambda(v1Spec.batchAttributes, context)
    : undefined;
  spec.barrier = v1Spec.barrier
    ? buildRawLambda(v1Spec.barrier, context)
    : undefined;
  spec.batchAttributesType = v1Spec.batchAttributesType
    ? buildReference(v1Spec.batchAttributesType, context.resolveClass)
    : undefined;
  spec.batchAttributesGenerator = v1Spec.batchAttributesGenerator
    ? buildReference(
        v1Spec.batchAttributesGenerator.path,
        context.resolveFunction,
      )
    : undefined;
  spec.temporalDateGenerator = v1Spec.temporalDateGenerator
    ? buildReference(v1Spec.temporalDateGenerator.path, context.resolveFunction)
    : undefined;
  spec.barrierGenerator = v1Spec.barrierGenerator
    ? buildReference(v1Spec.barrierGenerator.path, (path) =>
        context.resolveElement(path, false),
      )
    : undefined;
  spec.stereotypes = v1Spec.stereotypes.map((v1Stereotype) =>
    buildStereotype(v1Stereotype, context),
  );
  spec.taggedValues = v1Spec.taggedValues.map((v1TaggedValue) =>
    buildTaggedValue(v1TaggedValue, context),
  );
  return spec;
};

const setIngestDefinitionSpecification = action(
  (
    ingest: IngestDefinition,
    specification: IngestDefinitionSpecification | undefined,
    sourceHash: string,
  ): void => {
    ingest.specification = specification;
    ingest.INTERNAL__specificationSourceHash = sourceHash;
  },
);

/**
 * The ingest definition's specification, built from its content when the
 * content changed since it was last built. When the content can't be read,
 * it is undefined and a warning is logged: the content is left as it is, so
 * nothing else about the definition is affected
 */
export const V1_getOrBuildIngestDefinitionSpecification = (
  ingest: IngestDefinition,
  context: V1_GraphBuilderContext,
): IngestDefinitionSpecification | undefined => {
  const sourceHash = hashObjectWithoutSourceInformation(ingest.content);
  if (ingest.INTERNAL__specificationSourceHash === sourceHash) {
    return ingest.specification;
  }
  let specification: IngestDefinitionSpecification | undefined;
  try {
    specification = V1_buildIngestDefinitionSpecification(
      ingest.content,
      context,
    );
  } catch (error) {
    context.logService.warn(
      LogEvent.create(GRAPH_MANAGER_EVENT.GRAPH_BUILDER_FAILURE),
      `Can't build the specification of ingest definition '${ingest.path}': its content doesn't have the expected shape`,
      error,
    );
  }
  setIngestDefinitionSpecification(ingest, specification, sourceHash);
  return specification;
};
