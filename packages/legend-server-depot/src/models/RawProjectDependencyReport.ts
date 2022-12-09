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
  deserializeMap,
  SerializationFactory,
  serializeMap,
  usingModelSchema,
} from '@finos/legend-shared';
import {
  createModelSchema,
  custom,
  deserialize,
  list,
  primitive,
  serialize,
} from 'serializr';

export class RawProjectDependencyVersionNode {
  projectId!: string;
  groupId!: string;
  artifactId!: string;
  versionId!: string;
  id!: string;
  forwardEdges: string[] = [];
  backEdges: string[] = [];

  static readonly serialization = new SerializationFactory(
    createModelSchema(RawProjectDependencyVersionNode, {
      projectId: primitive(),
      groupId: primitive(),
      artifactId: primitive(),
      versionId: primitive(),
      id: primitive(),
      forwardEdges: list(primitive()),
      backEdges: list(primitive()),
    }),
  );
}

export class SerializedGraph {
  nodes: Map<string, RawProjectDependencyVersionNode> = new Map();
  rootNodes: string[] = [];

  static readonly serialization = new SerializationFactory(
    createModelSchema(SerializedGraph, {
      rootNodes: list(primitive()),
      nodes: custom(
        (val) =>
          serializeMap(val, (_val) =>
            serialize(
              RawProjectDependencyVersionNode.serialization.schema,
              _val,
            ),
          ),
        (val) =>
          deserializeMap(val, (_val) =>
            deserialize(
              RawProjectDependencyVersionNode.serialization.schema,
              _val,
            ),
          ),
      ),
    }),
  );
}

export class RawProjectDependencyConflict {
  groupId!: string;
  artifactId!: string;
  versions: string[] = [];

  static readonly serialization = new SerializationFactory(
    createModelSchema(RawProjectDependencyConflict, {
      groupId: primitive(),
      artifactId: primitive(),
      versions: list(primitive()),
    }),
  );
}

export class RawProjectDependencyReport {
  graph!: SerializedGraph;
  conflicts: RawProjectDependencyConflict[] = [];

  static readonly serialization = new SerializationFactory(
    createModelSchema(RawProjectDependencyReport, {
      graph: usingModelSchema(SerializedGraph.serialization.schema),
      conflicts: list(
        usingModelSchema(RawProjectDependencyConflict.serialization.schema),
      ),
    }),
  );
}
