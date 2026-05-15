/**
 * Copyright (c) 2020-present, Goldman Sachs
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
  type Accessor,
  IngestionAccessor,
  RelationalStoreAccessor,
  type AccessorOwner,
  DataProductAccessor,
} from '../../../../../graph/metamodel/pure/packageableElements/relation/Accessor.js';
import {
  RelationType,
  RelationColumn,
} from '../../../../../graph/metamodel/pure/packageableElements/relation/RelationType.js';
import { GenericType } from '../../../../../graph/metamodel/pure/packageableElements/domain/GenericType.js';
import { GenericTypeExplicitReference } from '../../../../../graph/metamodel/pure/packageableElements/domain/GenericTypeReference.js';
import { IngestDefinition } from '../../../../../graph/metamodel/pure/packageableElements/ingest/IngestDefinition.js';
import { Database } from '../../../../../graph/metamodel/pure/packageableElements/store/relational/model/Database.js';
import { Column } from '../../../../../graph/metamodel/pure/packageableElements/store/relational/model/Column.js';
import type { Table } from '../../../../../graph/metamodel/pure/packageableElements/store/relational/model/Table.js';
import { mapRelationalDataTypeToPrimitiveType } from '../../../../../graph/helpers/STO_Relational_Helper.js';
import {
  type V1_IngestDataset,
  type V1_WriteMode,
  V1_WriteModeType,
} from '../model/packageableElements/ingest/V1_IngestDefinition.js';
import type { V1_GraphBuilderContext } from '../transformation/pureGraph/to/V1_GraphBuilderContext.js';
import { V1_GenericType as V1_GenericTypeProtocol } from '../model/packageableElements/type/V1_GenericType.js';
import { V1_PackageableType } from '../model/packageableElements/type/V1_PackageableType.js';
import { returnUndefOnError, type PlainObject } from '@finos/legend-shared';
import { MILESTONE_INGEST_COLUMNS } from '../../../../../graph/MetaModelConst.js';
import type { RelationTypeMetadata } from '../../../../action/relation/RelationTypeMetadata.js';
import { V1_deserializeIngestDefinitionContent } from '../transformation/pureProtocol/serializationHelpers/V1_IngestSerializationHelper.js';
import {
  RelationElement,
  RelationElementsData,
} from '../../../../../graph/metamodel/pure/data/EmbeddedData.js';
import type { RawLambda } from '../../../../../graph/metamodel/pure/rawValueSpecification/RawLambda.js';
import type { AbstractPureGraphManager } from '../../../../AbstractPureGraphManager.js';
import type { PureModel } from '../../../../../graph/PureModel.js';
import type { ConcreteFunctionDefinition } from '../../../../../graph/metamodel/pure/packageableElements/function/ConcreteFunctionDefinition.js';
import { V1_deserializeValueSpecification } from '../transformation/pureProtocol/serializationHelpers/V1_ValueSpecificationSerializer.js';
import type { PureProtocolProcessorPlugin } from '../../PureProtocolProcessorPlugin.js';
import { V1_Lambda } from '../model/valueSpecification/raw/V1_Lambda.js';
import { V1_AppliedFunction } from '../model/valueSpecification/application/V1_AppliedFunction.js';
import { V1_ClassInstance } from '../model/valueSpecification/raw/V1_ClassInstance.js';
import { V1_Collection } from '../model/valueSpecification/raw/V1_Collection.js';
import {
  type V1_Accessor,
  V1_DataProductAccessor,
  V1_IngestDefinitionAccessor,
  V1_RelationStoreAccessor,
} from '../model/valueSpecification/raw/classInstance/relation/V1_RelationStoreAccessor.js';
import type { V1_ValueSpecification } from '../model/valueSpecification/V1_ValueSpecification.js';
import {
  type DataProduct,
  LakehouseAccessPoint,
} from '../../../../../graph/metamodel/pure/dataProduct/DataProduct.js';
import type { V1_AccessPointImplementation } from '../lakehouse/deploy/V1_DataProductArtifact.js';
import { V1_RelationType } from '../model/packageableElements/type/V1_RelationType.js';
import { V1_getGenericTypeFullPath } from './V1_DomainHelper.js';

const buildV1GenericType = (fullPath: string): V1_GenericTypeProtocol => {
  // Strip package prefix — primitive types are indexed by simple name
  const typeName = fullPath.includes('::')
    ? fullPath.substring(fullPath.lastIndexOf('::') + 2)
    : fullPath;
  const rawType = new V1_PackageableType();
  rawType.fullPath = typeName;
  const genericType = new V1_GenericTypeProtocol();
  genericType.rawType = rawType;
  return genericType;
};

const buildRelationTypeFromIngestDataset = (
  dataset: V1_IngestDataset,
  context: V1_GraphBuilderContext,
  effectiveWriteMode?: V1_WriteMode | undefined,
): RelationType => {
  const writeMode = dataset.writeMode ?? effectiveWriteMode;
  const relationType = new RelationType('__ingest_dataset__');
  relationType.columns = dataset.source.schema.columns.map((col) => {
    const rawTypePath =
      col.genericType.rawType instanceof V1_PackageableType
        ? col.genericType.rawType.fullPath
        : 'String';
    const v1GenericType = buildV1GenericType(rawTypePath);
    const resolvedGenericType =
      returnUndefOnError(() =>
        context.resolveGenericTypeFromProtocolWithRelationType(v1GenericType),
      ) ??
      context.resolveGenericTypeFromProtocolWithRelationType(
        buildV1GenericType('String'),
      );
    return new RelationColumn(col.name, resolvedGenericType);
  });
  // For batch-milestoned write modes, LAKE_IN_ID is a system column added by the
  // lake infrastructure and required by the physical table (NOT NULL).
  if (
    writeMode?._type === V1_WriteModeType.BATCH_MILESTONED ||
    writeMode?._type === V1_WriteModeType.BATCH_MILESTONED_BUSINESS_TEMPORAL
  ) {
    relationType.columns.push(
      new RelationColumn(
        MILESTONE_INGEST_COLUMNS.INGEST_LAKE_IN_ID,
        context.resolveGenericTypeFromProtocolWithRelationType(
          buildV1GenericType('Int'),
        ),
      ),
    );
    relationType.columns.push(
      new RelationColumn(
        MILESTONE_INGEST_COLUMNS.INGEST_LAKE_OUT_ID,
        context.resolveGenericTypeFromProtocolWithRelationType(
          buildV1GenericType('Int'),
        ),
      ),
    );
  }
  return relationType;
};

const buildRelationTypeFromTable = (table: Table): RelationType => {
  const relationType = new RelationType('__database_table__');
  relationType.columns = table.columns
    .filter((col): col is Column => col instanceof Column)
    .map(
      (col) =>
        new RelationColumn(
          col.name,
          GenericTypeExplicitReference.create(
            new GenericType(mapRelationalDataTypeToPrimitiveType(col.type)),
          ),
        ),
    );
  return relationType;
};
// TODO: move to pure graph
/**
 * Builds a metamodel `RelationType` from the cached `lambdaGenericType` on a
 * `V1_AccessPointImplementation`. Returns `undefined` if the implementation
 * does not carry a relation-typed generic type.
 *
 * Column types are resolved against the supplied `PureModel`.
 */
export const V1_buildRelationTypeFromAccessPointImplementation = (
  apImpl: V1_AccessPointImplementation,
  graph: PureModel,
  relationTypeName?: string | undefined,
): RelationType | undefined => {
  const v1RelationType = apImpl.lambdaGenericType?.typeArguments
    .map((typeArg) => typeArg.rawType)
    .find(
      (rawType): rawType is V1_RelationType =>
        rawType instanceof V1_RelationType,
    );
  if (!v1RelationType) {
    return undefined;
  }
  const relationType = new RelationType(relationTypeName ?? apImpl.id);
  relationType.columns = v1RelationType.columns.map(
    (col) =>
      new RelationColumn(
        col.name,
        GenericTypeExplicitReference.create(
          new GenericType(
            graph.getType(V1_getGenericTypeFullPath(col.genericType)),
          ),
        ),
      ),
  );
  return relationType;
};

/**
 * Creates an appropriate Accessor from a packageable element.
 *
 * For IngestDefinition: requires `datasetName` to identify the dataset.
 * For Database: requires `schemaName` and `tableName` to identify the table.
 */
export const V1_createAccessorFromPackageableElement = (
  element: AccessorOwner,
  context: V1_GraphBuilderContext,
  options?: {
    schemaName?: string | undefined;
    tableName?: string | undefined;
  },
): Accessor | undefined => {
  if (element instanceof IngestDefinition) {
    const content = returnUndefOnError(() =>
      V1_deserializeIngestDefinitionContent(element.content),
    );
    // if unable to serialize we dont fall hard, we return undefined. we may want to revisit and fall hard on this.
    if (!content) {
      return undefined;
    }
    const datasetName = options?.tableName;
    const dataset = datasetName
      ? content.datasets?.find((ds) => ds.name === datasetName)
      : content.datasets?.[0];
    if (!dataset) {
      return undefined;
    }
    const relationType = buildRelationTypeFromIngestDataset(
      dataset,
      context,
      content.writeMode,
    );
    return new IngestionAccessor(
      element.path,
      undefined,
      dataset.name,
      relationType,
      element,
    );
  }
  if (element instanceof Database) {
    const schemaName = options?.schemaName;
    const tableName = options?.tableName;
    let table: Table | undefined;
    if (schemaName && tableName) {
      const schema = element.schemas.find((s) => s.name === schemaName);
      if (!schema) {
        return undefined;
      }
      table = schema.tables.find((t) => t.name === tableName);
    }
    const tables = element.schemas.map((e) => e.tables).flat();
    table = tableName ? tables.find((t) => t.name === tableName) : tables[0];
    if (!table) {
      return undefined;
    }
    const relationType = buildRelationTypeFromTable(table);
    return new RelationalStoreAccessor(
      element.path,
      table.schema.name,
      table.name,
      relationType,
      element,
    );
  }
  return undefined;
};

const buildRelationTypeFromMetadata = (
  metadata: RelationTypeMetadata,
  context: V1_GraphBuilderContext,
): RelationType => {
  const relationType = new RelationType('__data_product__');
  relationType.columns = metadata.columns.map((col) => {
    const v1GenericType = buildV1GenericType(col.type);
    const resolvedGenericType =
      returnUndefOnError(() =>
        context.resolveGenericTypeFromProtocolWithRelationType(v1GenericType),
      ) ??
      context.resolveGenericTypeFromProtocolWithRelationType(
        buildV1GenericType('String'),
      );
    return new RelationColumn(col.name, resolvedGenericType);
  });
  return relationType;
};

export const V1_buildDataProductAccessor = async (
  element: DataProduct,
  context: V1_GraphBuilderContext,
  graphManager: AbstractPureGraphManager,
  options?: {
    tableName?: string | undefined;
  },
): Promise<DataProductAccessor | undefined> => {
  const accessPointId = options?.tableName;
  const accessPoint = element.accessPointGroups
    .flatMap((g) => g.accessPoints)
    .filter(
      (ap): ap is LakehouseAccessPoint => ap instanceof LakehouseAccessPoint,
    )
    .find((ap) => ap.id === accessPointId);
  if (!accessPoint) {
    return undefined;
  }
  const relationTypeMetadata = await graphManager.getLambdaRelationType(
    accessPoint.func,
    context.graph,
  );
  const relationType = buildRelationTypeFromMetadata(
    relationTypeMetadata,
    context,
  );
  return new DataProductAccessor(
    element.path,
    undefined,
    accessPoint.id,
    relationType,
    element,
  );
};

const collectV1AccessorsFromValueSpecification = (
  valueSpec: V1_ValueSpecification,
  accessors: V1_Accessor[],
  visited: Set<V1_ValueSpecification>,
  plugins: PureProtocolProcessorPlugin[],
  graph: PureModel | undefined,
  visitedFunctions: Set<ConcreteFunctionDefinition>,
): void => {
  if (visited.has(valueSpec)) {
    return;
  }
  visited.add(valueSpec);

  if (valueSpec instanceof V1_ClassInstance) {
    const val = valueSpec.value;
    if (
      val instanceof V1_DataProductAccessor ||
      val instanceof V1_IngestDefinitionAccessor ||
      val instanceof V1_RelationStoreAccessor
    ) {
      if (!accessors.includes(val)) {
        accessors.push(val);
      }
    }
  } else if (valueSpec instanceof V1_AppliedFunction) {
    // Walk parameters in case they contain inline accessors
    for (const param of valueSpec.parameters) {
      collectV1AccessorsFromValueSpecification(
        param,
        accessors,
        visited,
        plugins,
        graph,
        visitedFunctions,
      );
    }
    // Also follow the function body if it's a user-defined function in the graph
    if (graph) {
      const funcPath = valueSpec.function;
      // ConcreteFunctionDefinition paths include the signature suffix; strip it
      // by matching functions whose path starts with the applied function name
      const funcDef = returnUndefOnError(() =>
        graph.functions.find(
          (f) => f.path === funcPath || f.path.startsWith(`${funcPath}_`),
        ),
      );
      if (funcDef && !visitedFunctions.has(funcDef)) {
        visitedFunctions.add(funcDef);
        // expressionSequence is stored as raw JSON on ConcreteFunctionDefinition
        for (const rawExpr of funcDef.expressionSequence) {
          try {
            const exprSpec = V1_deserializeValueSpecification(
              rawExpr as PlainObject<V1_ValueSpecification>,
              plugins,
            );
            collectV1AccessorsFromValueSpecification(
              exprSpec,
              accessors,
              visited,
              plugins,
              graph,
              visitedFunctions,
            );
          } catch {
            // ignore
          }
        }
      }
    }
  } else if (valueSpec instanceof V1_Lambda) {
    for (const expr of valueSpec.body) {
      collectV1AccessorsFromValueSpecification(
        expr,
        accessors,
        visited,
        plugins,
        graph,
        visitedFunctions,
      );
    }
  } else if (valueSpec instanceof V1_Collection) {
    for (const val of valueSpec.values) {
      collectV1AccessorsFromValueSpecification(
        val,
        accessors,
        visited,
        plugins,
        graph,
        visitedFunctions,
      );
    }
  }
};

export const V1_buildRelationElementsDataFromAccessors = (
  accessorsForParent: Accessor[],
): RelationElementsData => {
  const relationElementsData = new RelationElementsData();
  relationElementsData.relationElements = accessorsForParent.map((accessor) => {
    const relationElement = new RelationElement();
    if (accessor instanceof RelationalStoreAccessor) {
      const schema = accessor.schema;
      relationElement.paths =
        schema !== undefined ? [schema, accessor.accessor] : ['UNKNOWN'];
    } else {
      relationElement.paths = [accessor.accessor || 'UNKNOWN'];
    }
    relationElement.columns = accessor.relationType.columns.map(
      (column) => column.name,
    );
    relationElement.rows = [];
    return relationElement;
  });
  return relationElementsData;
};

export const V1_resolveAccessorsFromRawLambda = (
  rawLambda: RawLambda,
  graphManager: AbstractPureGraphManager,
  plugins: PureProtocolProcessorPlugin[],
  graph?: PureModel | undefined,
): V1_Accessor[] | undefined => {
  try {
    const json = graphManager.serializeRawValueSpecification(rawLambda);
    const v1ValueSpec = V1_deserializeValueSpecification(json, plugins);
    const accessors: V1_Accessor[] = [];
    const visited = new Set<V1_ValueSpecification>();
    const visitedFunctions = new Set<ConcreteFunctionDefinition>();
    if (v1ValueSpec instanceof V1_Lambda) {
      for (const expr of v1ValueSpec.body) {
        collectV1AccessorsFromValueSpecification(
          expr,
          accessors,
          visited,
          plugins,
          graph,
          visitedFunctions,
        );
      }
    } else {
      collectV1AccessorsFromValueSpecification(
        v1ValueSpec,
        accessors,
        visited,
        plugins,
        graph,
        visitedFunctions,
      );
    }
    return accessors;
  } catch {
    return undefined;
  }
};
