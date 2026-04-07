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
import type { V1_IngestDataset } from '../model/packageableElements/ingest/V1_IngestDefinition.js';
import type { V1_GraphBuilderContext } from '../transformation/pureGraph/to/V1_GraphBuilderContext.js';
import { V1_GenericType as V1_GenericTypeProtocol } from '../model/packageableElements/type/V1_GenericType.js';
import { V1_PackageableType } from '../model/packageableElements/type/V1_PackageableType.js';
import { returnUndefOnError } from '@finos/legend-shared';
import { V1_deserializeIngestDefinitionContent } from '../transformation/pureProtocol/serializationHelpers/V1_IngestSerializationHelper.js';

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
): RelationType => {
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
    const relationType = buildRelationTypeFromIngestDataset(dataset, context);
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
