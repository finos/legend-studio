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
  SerializationFactory,
  UnsupportedOperationError,
  usingConstantValueSchema,
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
  serialize,
} from 'serializr';
import type { V1_GenericType } from '../../model/packageableElements/type/V1_GenericType.js';
import {
  V1_deserializeGenericType,
  V1_genericTypeModelSchema,
} from '../../transformation/pureProtocol/serializationHelpers/V1_TypeSerializationHelper.js';
import type { V1_RelationElement } from '../../model/data/V1_EmbeddedData.js';
import { V1_relationElementModelSchema } from '../../transformation/pureProtocol/serializationHelpers/V1_DataElementSerializationHelper.js';

export enum V1_DataProductTypeEnum {
  INTERNAL = 'internalDataProductType',
  EXTERNAL = 'externalDataProductType',
}

export enum V1_ResourceBuilderType {
  DATABASE_DDL = 'databaseDDL',
  FUNCTION_ACCESS_POINT = 'functionAccessPoint',
}

export enum V1_DatabaseDDLImplementationType {
  VIEW = 'VIEW',
  TABLE = 'TABLE',
  PROCEDURE = 'PROCEDURE',
}

export abstract class V1_DataProductType {}

export class V1_ExternalDataProductType extends V1_DataProductType {
  link: string | undefined;

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_ExternalDataProductType, {
      _type: usingConstantValueSchema(V1_DataProductTypeEnum.EXTERNAL),
      link: optional(primitive()),
    }),
  );
}

export class V1_InternalDataProductType extends V1_DataProductType {
  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_InternalDataProductType, {
      _type: usingConstantValueSchema(V1_DataProductTypeEnum.INTERNAL),
    }),
  );
}

export const V1_serializeDataProductType = (
  DataProductType: V1_DataProductType,
): PlainObject<V1_DataProductType> => {
  if (DataProductType instanceof V1_ExternalDataProductType) {
    return V1_ExternalDataProductType.serialization.toJson(DataProductType);
  } else if (DataProductType instanceof V1_InternalDataProductType) {
    return V1_InternalDataProductType.serialization.toJson(DataProductType);
  }
  throw new UnsupportedOperationError();
};

export const V1_deserializeDataProductType = (
  json: PlainObject<V1_DataProductType>,
): V1_DataProductType => {
  switch (json._type) {
    case V1_DataProductTypeEnum.EXTERNAL:
      return V1_ExternalDataProductType.serialization.fromJson(json);
    case V1_DataProductTypeEnum.INTERNAL:
      return V1_InternalDataProductType.serialization.fromJson(json);
    default:
      throw new Error(`Unknown V1_DataProductType type: ${json._type}`);
  }
};

export class V1_DataProductInfo {
  path!: string;
  deploymentId: string | undefined;
  description: string | undefined;
  title: string | undefined;
  dataProductType: V1_DataProductType | undefined;

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_DataProductInfo, {
      path: primitive(),
      deploymentId: primitive(),
      description: optional(primitive()),
      title: optional(primitive()),
      dataProductType: custom(
        (val) => (val ? V1_serializeDataProductType(val) : undefined),
        (val) => (val ? V1_deserializeDataProductType(val) : undefined),
      ),
    }),
  );
}

export abstract class V1_ResourceBuilder {}

export class V1_DatabaseDDL extends V1_ResourceBuilder {
  reproducible!: boolean;
  targetEnvironment!: string;
  script!: string;
  classification: string | undefined;
  resourceType!: V1_DatabaseDDLImplementationType;

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_DatabaseDDL, {
      _type: usingConstantValueSchema(V1_ResourceBuilderType.DATABASE_DDL),
      reproducible: primitive(),
      targetEnvironment: primitive(),
      script: primitive(),
      classification: optional(primitive()),
      resourceType: primitive(),
    }),
  );
}

export class V1_FunctionAccessPoint extends V1_ResourceBuilder {
  functionGrammar!: string;

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_FunctionAccessPoint, {
      _type: usingConstantValueSchema(
        V1_ResourceBuilderType.FUNCTION_ACCESS_POINT,
      ),
      functionGrammar: primitive(),
    }),
  );
}

export const V1_serializeResourceBuilder = (
  resourceBuilder: V1_ResourceBuilder,
): PlainObject<V1_ResourceBuilder> => {
  if (resourceBuilder instanceof V1_DatabaseDDL) {
    return V1_DatabaseDDL.serialization.toJson(resourceBuilder);
  } else if (resourceBuilder instanceof V1_FunctionAccessPoint) {
    return V1_FunctionAccessPoint.serialization.toJson(resourceBuilder);
  }
  throw new UnsupportedOperationError();
};

export const V1_deserializeResourceBuilder = (
  json: PlainObject<V1_ResourceBuilder>,
): V1_ResourceBuilder => {
  switch (json._type) {
    case V1_ResourceBuilderType.DATABASE_DDL:
      return V1_DatabaseDDL.serialization.fromJson(json);
    case V1_ResourceBuilderType.FUNCTION_ACCESS_POINT:
      return V1_FunctionAccessPoint.serialization.fromJson(json);
    default:
      throw new Error(`Unknown V1_ResourceBuilder type: ${json._type}`);
  }
};

export class V1_AccessPointImplementation {
  id!: string;
  description: string | undefined;
  resourceBuilder!: V1_ResourceBuilder;
  relationElement: V1_RelationElement | undefined;
  lambdaGenericType: V1_GenericType | undefined;

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_AccessPointImplementation, {
      id: primitive(),
      description: optional(primitive()),
      resourceBuilder: custom(
        V1_serializeResourceBuilder,
        V1_deserializeResourceBuilder,
      ),
      relationElement: optional(
        custom(
          (val) => serialize(V1_relationElementModelSchema, val),
          (val) => deserialize(V1_relationElementModelSchema, val),
        ),
      ),
      lambdaGenericType: custom(
        (val) => serialize(V1_genericTypeModelSchema, val),
        (val) => V1_deserializeGenericType(val),
      ),
    }),
  );
}

export class V1_AccessPointGroupInfo {
  id!: string;
  description: string | undefined;
  accessPointImplementations: V1_AccessPointImplementation[] = [];

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_AccessPointGroupInfo, {
      id: primitive(),
      description: optional(primitive()),
      accessPointImplementations: list(
        usingModelSchema(V1_AccessPointImplementation.serialization.schema),
      ),
    }),
  );
}

export class V1_DataProductArtifact {
  dataProduct!: V1_DataProductInfo;
  accessPointGroups: V1_AccessPointGroupInfo[] = [];

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_DataProductArtifact, {
      dataProduct: usingModelSchema(V1_DataProductInfo.serialization.schema),
      accessPointGroups: list(
        usingModelSchema(V1_AccessPointGroupInfo.serialization.schema),
      ),
    }),
  );
}
