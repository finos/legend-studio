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
  createModelSchema,
  primitive,
  list,
  object,
  custom,
  optional,
} from 'serializr';

export type RawLineageModel = object;

export class Graph {
  nodes: LineageNode[] = [];
  edges: LineageEdge[] = [];
}

export class LineageNode {
  data!: NodeData;
}

export class NodeData {
  id!: string;
  text!: string;
  type!: string;
  displayType?: string;
}

export class LineageEdge {
  data!: EdgeData;
}

export class EdgeData {
  id!: string;
  text!: string;
  type!: string;
  source!: LineageNode;
  target!: LineageNode;
}

export class PropertyPathTree {
  display!: string;
  value!: string;
  children: PropertyPathTree[] = [];
  qualifierSubTree?: PropertyPathTree;
}

export class ReportColumn {
  name!: string;
  propertyTree!: PropertyPathTree;
  columns: ColumnWithContext[] = [];
  accessorColumns: LineageColumn[] = [];
}

export class ColumnWithContext {
  column!: LineageColumn;
  context!: string;
}

export class LineageSchema {
  name!: string;
  database!: LineageDatabase;
}
export class LineageDatabase {
  package!: string;
  name!: string;
}

export class Owner {
  schema!: LineageSchema;
  name!: string;
  columns?: LineageColumn[];
  primaryKey?: LineageColumn[];
}

export class LineageColumn {
  // Renamed class
  owner!: Owner;
  nullable!: boolean;
  name!: string;
  type!: string;
}

export class ReportLineage {
  columns: ReportColumn[] = [];
}

export class LineageModel {
  databaseLineage!: Graph;
  classLineage!: Graph;
  functionTrees: PropertyPathTree[] = [];
  reportLineage!: ReportLineage;
  propertyLineage?: PropertyLineageReport;
}

// --- Property Lineage Model Classes ---

export class PropertyLineageReport {
  propertyOwner: PropertyLineageNode[] = [];
  ownerLink: OwnerLink[] = [];
}

export class PropertyLineageNode {
  id!: string;
  name!: string;
}

export class StorePropertyLineageNode extends PropertyLineageNode {}

export class PropertyOwnerNode extends PropertyLineageNode {
  properties: LineageProperty[] = [];
}

export class RootQuery extends PropertyOwnerNode {}

export class LineageQuery extends PropertyOwnerNode {}

export class RelationalPropertyOwner extends PropertyOwnerNode {
  namedRelation!: string; // NamedRelation[1] as string
  relationType!: string;
  relationName!: string;
  schemaName!: string;
  relationOwnerPath!: string;
}

export class MappedSetOwner extends PropertyOwnerNode {
  setImplementationID!: string;
}

export class MappedClassOwner extends PropertyOwnerNode {
  mapping?: string;
  setImplementationID?: string;
  _class!: string;
}

export class OwnerLink {
  source!: string; // reference by id
  target!: string; // reference by id
}

export class LineageProperty {
  name!: string;
  dataType?: string;
  sourceInfo?: SourceInformation;
  scope?: string;
  propertyType!: string;
  ownerID!: string;
  sourceProperties: LineageProperty[] = [];
  annotations: Annotation[] = [];
}

export class LineageModelProperty extends LineageProperty {
  propertyTree!: PropertyPathTree;
}

export class SourceInformation {
  sourceId!: string;
  startLine!: number;
  startColumn!: number;
  endLine!: number;
  endColumn!: number;
}
export class Annotation {}

// Helper for __TYPE-based subtyping
function subtypeFactory<T>(
  typeMap: Record<string, new () => T>,
  fallbackType?: new () => T,
) {
  return custom(
    (value) => value, // serialization: just return as is
    (value): unknown => {
      if (
        value &&
        typeof value === 'object' &&
        typeof value.__TYPE === 'string'
      ) {
        const ctor = typeMap[value.__TYPE];
        if (ctor) {
          const instance = Object.create(ctor.prototype as object) as object;
          Object.assign(instance, value);
          return instance;
        }
        const fallback = Object.create(
          PropertyOwnerNode.prototype,
        ) as PropertyOwnerNode;
        Object.assign(fallback, value);
        return fallback;
      }
      if (fallbackType) {
        const instance = Object.create(
          fallbackType.prototype as object,
        ) as object;
        Object.assign(instance, value);
        return instance;
      }
      return value;
    },
  );
}

// Subtype maps for deserialization
const propertyLineageNodeTypeMap = {
  'meta::analytics::lineage::property::PropertyLineageNode':
    PropertyLineageNode,
  'meta::analytics::lineage::property::StorePropertyLineageNode':
    StorePropertyLineageNode,
  'meta::analytics::lineage::property::PropertyOwnerNode': PropertyOwnerNode,
  'meta::analytics::lineage::property::RootQuery': RootQuery,
  'meta::analytics::lineage::property::Query': LineageQuery,
  'meta::analytics::lineage::property::RelationalPropertyOwner':
    RelationalPropertyOwner,
  'meta::analytics::lineage::property::MappedSetOwner': MappedSetOwner,
  'meta::analytics::lineage::property::MappedClassOwner': MappedClassOwner,
  // Add other subtypes as needed
  // Add other subtypes as needed
};

const lineagePropertyTypeMap = {
  'meta::analytics::lineage::property::LineageProperty': LineageProperty,
  'meta::analytics::lineage::property::LineageModelProperty':
    LineageModelProperty,
  // Add other subtypes as needed
};

// Serialization schemas
createModelSchema(NodeData, {
  id: primitive(),
  text: primitive(),
  type: primitive(),
  displayType: primitive(),
});

createModelSchema(LineageNode, {
  data: object(NodeData),
});

createModelSchema(EdgeData, {
  id: primitive(),
  text: primitive(),
  type: primitive(),
  source: object(LineageNode),
  target: object(LineageNode),
});

createModelSchema(LineageEdge, {
  data: object(EdgeData),
});

createModelSchema(Graph, {
  nodes: list(object(LineageNode)),
  edges: list(object(LineageEdge)),
});

createModelSchema(PropertyPathTree, {
  display: primitive(),
  value: custom(
    () => undefined,
    () => undefined,
  ),
  children: list(object(PropertyPathTree)),
  qualifierSubTree: object(PropertyPathTree),
});

createModelSchema(ReportColumn, {
  name: primitive(),
  propertyTree: object(PropertyPathTree),
  columns: list(object(ColumnWithContext)),
  accessorColumns: list(object(LineageColumn)),
});

createModelSchema(ColumnWithContext, {
  column: object(LineageColumn),
  context: primitive(),
});

createModelSchema(LineageDatabase, {
  package: primitive(),
  name: primitive(),
});

createModelSchema(LineageSchema, {
  database: object(LineageDatabase),
  name: primitive(),
});

createModelSchema(Owner, {
  schema: object(LineageSchema),
  name: primitive(),
  columns: list(object(LineageColumn)),
  primaryKey: list(object(LineageColumn)),
});

createModelSchema(LineageColumn, {
  owner: object(Owner),
  nullable: primitive(),
  name: primitive(),
});

createModelSchema(ReportLineage, {
  columns: list(object(ReportColumn)),
});

createModelSchema(LineageModel, {
  databaseLineage: object(Graph),
  classLineage: object(Graph),
  functionTrees: list(object(PropertyPathTree)),
  reportLineage: object(ReportLineage),
  propertyLineage: object(PropertyLineageReport),
});

createModelSchema(PropertyLineageReport, {
  propertyOwner: list(
    subtypeFactory(propertyLineageNodeTypeMap, PropertyLineageNode),
  ),
  ownerLink: list(object(OwnerLink)),
});

createModelSchema(PropertyLineageNode, {
  id: primitive(),
  name: primitive(),
});

createModelSchema(StorePropertyLineageNode, {
  id: primitive(),
  name: primitive(),
});

createModelSchema(PropertyOwnerNode, {
  id: primitive(),
  name: primitive(),
  properties: list(subtypeFactory(lineagePropertyTypeMap, LineageProperty)),
});

createModelSchema(RootQuery, {
  id: primitive(),
  name: primitive(),
  properties: list(subtypeFactory(lineagePropertyTypeMap, LineageProperty)),
});

createModelSchema(LineageQuery, {
  id: primitive(),
  name: primitive(),
  properties: list(subtypeFactory(lineagePropertyTypeMap, LineageProperty)),
});

createModelSchema(RelationalPropertyOwner, {
  id: primitive(),
  name: primitive(),
  properties: list(subtypeFactory(lineagePropertyTypeMap, LineageProperty)),
  namedRelation: primitive(),
  relationType: primitive(),
  relationName: primitive(),
  schemaName: primitive(),
  relationOwnerPath: primitive(),
});

createModelSchema(MappedSetOwner, {
  id: primitive(),
  name: primitive(),
  properties: list(subtypeFactory(lineagePropertyTypeMap, LineageProperty)),
  setImplementationID: primitive(),
});

createModelSchema(MappedClassOwner, {
  id: primitive(),
  name: primitive(),
  properties: list(subtypeFactory(lineagePropertyTypeMap, LineageProperty)),
  mapping: optional(primitive()),
  setImplementationID: optional(primitive()),
  _class: primitive(),
});

createModelSchema(OwnerLink, {
  source: primitive(),
  target: primitive(),
});

createModelSchema(LineageProperty, {
  name: primitive(),
  dataType: optional(primitive()),
  sourceInfo: optional(object(SourceInformation)),
  scope: optional(primitive()),
  propertyType: primitive(), // as string
  ownerID: primitive(),
  sourceProperties: list(
    subtypeFactory(lineagePropertyTypeMap, LineageProperty),
  ),
  annotations: list(object(Annotation)),
});

createModelSchema(LineageModelProperty, {
  name: primitive(),
  dataType: optional(primitive()),
  sourceInfo: optional(object(SourceInformation)),
  scope: optional(primitive()),
  propertyType: primitive(),
  ownerID: primitive(),
  sourceProperties: list(
    subtypeFactory(lineagePropertyTypeMap, LineageProperty),
  ),
  annotations: list(object(Annotation)),
  propertyTree: object(PropertyPathTree),
});

createModelSchema(SourceInformation, {
  // ...define as needed...
});

createModelSchema(Annotation, {
  // ...define as needed...
});
