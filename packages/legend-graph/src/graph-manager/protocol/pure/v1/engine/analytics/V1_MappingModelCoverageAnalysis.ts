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
  type PlainObject,
  SerializationFactory,
  usingModelSchema,
} from '@finos/legend-shared';
import {
  createModelSchema,
  custom,
  deserialize,
  list,
  optional,
  primitive,
  serialize,
} from 'serializr';
import type { Mapping } from '../../../../../../graph/metamodel/pure/packageableElements/mapping/Mapping.js';
import {
  EntityMappedProperty,
  EnumMappedProperty,
  MappedEntity,
  MappedProperty,
  MappingModelCoverageAnalysisResult,
} from '../../../../../../graph-manager/action/analytics/MappingModelCoverageAnalysis.js';
import type { V1_PureModelContext } from '../../model/context/V1_PureModelContext.js';
import { V1_pureModelContextPropSchema } from '../../transformation/pureProtocol/V1_PureProtocolSerialization.js';

enum V1_MappedPropertyType {
  ENUM = 'enum',
  ENTITY = 'entity',
}

class V1_MappedProperty {
  name!: string;

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_MappedProperty, {
      name: primitive(),
    }),
  );
}

class V1_EntityMappedProperty extends V1_MappedProperty {
  entityPath!: string;
  subType: string | undefined;

  static override readonly serialization = new SerializationFactory(
    createModelSchema(V1_EntityMappedProperty, {
      name: primitive(),
      entityPath: primitive(),
      subType: optional(primitive()),
    }),
  );
}

class V1_EnumMappedProperty extends V1_MappedProperty {
  enumPath!: string;

  static override readonly serialization = new SerializationFactory(
    createModelSchema(V1_EnumMappedProperty, {
      name: primitive(),
      enumPath: primitive(),
    }),
  );
}

const V1_serializeMappedProperty = (
  prop: V1_MappedProperty,
): V1_MappedProperty =>
  V1_MappedProperty instanceof V1_EnumMappedProperty
    ? serialize(V1_EnumMappedProperty.serialization.schema, prop)
    : V1_MappedProperty instanceof V1_EntityMappedProperty
      ? serialize(V1_EntityMappedProperty.serialization.schema, prop)
      : serialize(V1_MappedProperty.serialization.schema, prop);

const V1_deserializeMappedProperty = (
  json: PlainObject<V1_MappedProperty>,
): V1_MappedProperty => {
  switch (json._type) {
    case V1_MappedPropertyType.ENTITY:
      return deserialize(V1_EntityMappedProperty.serialization.schema, json);
    case V1_MappedPropertyType.ENUM:
      return deserialize(V1_EnumMappedProperty.serialization.schema, json);
    default: {
      return deserialize(V1_MappedProperty.serialization.schema, json);
    }
  }
};

class V1_MappedEntity {
  path!: string;
  properties: V1_MappedProperty[] = [];

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_MappedEntity, {
      path: primitive(),
      properties: list(
        custom(
          (prop) => V1_serializeMappedProperty(prop),
          (prop) => V1_deserializeMappedProperty(prop),
        ),
      ),
    }),
  );
}

export class V1_MappingModelCoverageAnalysisInput {
  clientVersion!: string;
  mapping!: string;
  model!: V1_PureModelContext;

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_MappingModelCoverageAnalysisInput, {
      clientVersion: primitive(),
      mapping: primitive(),
      model: V1_pureModelContextPropSchema,
    }),
  );
}

export class V1_MappingModelCoverageAnalysisResult {
  mappedEntities: V1_MappedEntity[] = [];

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_MappingModelCoverageAnalysisResult, {
      mappedEntities: list(
        usingModelSchema(V1_MappedEntity.serialization.schema),
      ),
    }),
  );
}

const buildMappedProperty = (protocol: V1_MappedProperty): MappedProperty =>
  protocol instanceof V1_EntityMappedProperty
    ? new EntityMappedProperty(
        protocol.name,
        protocol.entityPath,
        protocol.subType,
      )
    : protocol instanceof V1_EnumMappedProperty
      ? new EnumMappedProperty(protocol.name, protocol.enumPath)
      : new MappedProperty(protocol.name);

const buildMappedEntity = (protocol: V1_MappedEntity): MappedEntity =>
  new MappedEntity(
    protocol.path,
    protocol.properties.map((p) => buildMappedProperty(p)),
  );

export const V1_buildModelCoverageAnalysisResult = (
  protocol: V1_MappingModelCoverageAnalysisResult,
  mapping: Mapping,
): MappingModelCoverageAnalysisResult =>
  new MappingModelCoverageAnalysisResult(
    protocol.mappedEntities.map((p) => buildMappedEntity(p)),
    mapping,
  );
