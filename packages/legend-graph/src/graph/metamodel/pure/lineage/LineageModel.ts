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

import { createModelSchema, primitive, list, object, custom } from 'serializr';

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
  accessorColumns: LineageColumn[] = []; // Updated reference
}

export class ColumnWithContext {
  column!: LineageColumn; // Updated reference
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
}

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
  ), // Custom serialization logic if needed
  children: list(object(PropertyPathTree)),
  qualifierSubTree: object(PropertyPathTree),
});

createModelSchema(ReportColumn, {
  name: primitive(),
  propertyTree: object(PropertyPathTree),
  columns: list(object(ColumnWithContext)),
  accessorColumns: list(object(LineageColumn)), // Updated reference
});

createModelSchema(ColumnWithContext, {
  column: object(LineageColumn), // Updated reference
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

// Fix: Use custom for type property in LineageColumn to allow non-primitive objects
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
});
