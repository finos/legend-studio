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
  optionalCustom,
  usingConstantValueSchema,
  usingModelSchema,
  type PlainObject,
} from '@finos/legend-shared';
import {
  createModelSchema,
  deserialize,
  list,
  optional,
  primitive,
  raw,
  serialize,
} from 'serializr';
import type { V1_StereotypePtr } from '../../model/packageableElements/domain/V1_StereotypePtr.js';
import type { V1_TaggedValue } from '../../model/packageableElements/domain/V1_TaggedValue.js';
import {
  V1_stereotypePtrModelSchema,
  V1_taggedValueModelSchema,
} from '../../transformation/pureProtocol/serializationHelpers/V1_DomainSerializationHelper.js';

export class V1_QueryParameterValue {
  name!: string;
  content!: string;

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_QueryParameterValue, {
      name: primitive(),
      content: primitive(),
    }),
    {
      deserializeNullAsUndefined: true,
    },
  );
}

export interface V1_QueryGridConfig {
  columns: object[];
  isPivotModeEnabled: boolean | undefined;
  isLocalModeEnabled: boolean | undefined;
  previewLimit?: number | undefined;
  weightedColumnPairs?: Map<string, string> | undefined;
}
export class V1_QueryExecutionContext {}

export enum V1_QueryExecutionContextType {
  QUERY_EXPLICIT_EXECUTION_CONTEXT = 'explicitExecutionContext',
  QUERY_DATASAPCE_EXECUTION_CONTEXT = 'dataSpaceExecutionContext',
}

export class V1_QueryExplicitExecutionContext extends V1_QueryExecutionContext {
  mapping!: string;
  runtime!: string;

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_QueryExplicitExecutionContext, {
      _type: usingConstantValueSchema(
        V1_QueryExecutionContextType.QUERY_EXPLICIT_EXECUTION_CONTEXT,
      ),
      mapping: primitive(),
      runtime: primitive(),
    }),
    {
      deserializeNullAsUndefined: true,
    },
  );
}

export class V1_QueryDataSpaceExecutionContext extends V1_QueryExecutionContext {
  dataSpacePath!: string;
  executionKey: string | undefined;

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_QueryDataSpaceExecutionContext, {
      _type: usingConstantValueSchema(
        V1_QueryExecutionContextType.QUERY_DATASAPCE_EXECUTION_CONTEXT,
      ),
      dataSpacePath: primitive(),
      executionKey: optional(primitive()),
    }),
    {
      deserializeNullAsUndefined: true,
    },
  );
}

export const V1_deserializeQueryExecutionContext = (
  json: PlainObject<V1_QueryExecutionContext>,
): V1_QueryExecutionContext => {
  switch (json._type) {
    case V1_QueryExecutionContextType.QUERY_EXPLICIT_EXECUTION_CONTEXT:
      return deserialize(
        V1_QueryExplicitExecutionContext.serialization.schema,
        json,
      );
    case V1_QueryExecutionContextType.QUERY_DATASAPCE_EXECUTION_CONTEXT:
      return deserialize(
        V1_QueryDataSpaceExecutionContext.serialization.schema,
        json,
      );
    default: {
      throw new UnsupportedOperationError(
        `Can't deserialize authentication strategy of type '${json._type}': no compatible deserializer available from plugins`,
      );
    }
  }
};

export const V1_serializeQueryExecutionContext = (
  protocol: V1_QueryExecutionContext,
): PlainObject<V1_QueryExecutionContext> => {
  if (protocol instanceof V1_QueryExplicitExecutionContext) {
    return serialize(
      V1_QueryExplicitExecutionContext.serialization.schema,
      protocol,
    );
  } else if (protocol instanceof V1_QueryDataSpaceExecutionContext) {
    return serialize(
      V1_QueryDataSpaceExecutionContext.serialization.schema,
      protocol,
    );
  }
  throw new UnsupportedOperationError(
    `Can't serialize authentication strategy: no compatible serializer available from plugins`,
    protocol,
  );
};

export class V1_Query {
  name!: string;
  id!: string;
  groupId!: string;
  artifactId!: string;
  versionId!: string;
  originalVersionId?: string | undefined;
  content!: string;
  owner?: string | undefined;
  taggedValues?: V1_TaggedValue[] | undefined;
  stereotypes?: V1_StereotypePtr[] | undefined;
  defaultParameterValues?: V1_QueryParameterValue[] | undefined;
  lastUpdatedAt?: number | undefined;
  createdAt?: number | undefined;
  lastOpenAt?: number | undefined;
  gridConfig?: V1_QueryGridConfig | undefined;

  executionContext: V1_QueryExecutionContext | undefined;
  /**
   * mapping, runtime have been deprecated in favor of `V1_QueryExecutionContext`
   * @deprecated
   */
  mapping: string | undefined;
  /**
   * @deprecated
   */
  runtime: string | undefined;

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_Query, {
      artifactId: primitive(),
      content: primitive(),
      id: primitive(),
      defaultParameterValues: optional(
        list(usingModelSchema(V1_QueryParameterValue.serialization.schema)),
      ),
      groupId: primitive(),
      lastUpdatedAt: optional(primitive()),
      createdAt: optional(primitive()),
      lastOpenAt: optional(primitive()),
      mapping: optional(primitive()),
      name: primitive(),
      owner: optional(primitive()),
      runtime: optional(primitive()),
      stereotypes: optional(
        list(usingModelSchema(V1_stereotypePtrModelSchema)),
      ),
      executionContext: optionalCustom(
        (val) => V1_serializeQueryExecutionContext(val),
        (val) => V1_deserializeQueryExecutionContext(val),
      ),
      taggedValues: optional(list(usingModelSchema(V1_taggedValueModelSchema))),
      versionId: primitive(),
      originalVersionId: optional(primitive()),
      gridConfig: optional(raw()),
    }),
    {
      deserializeNullAsUndefined: true,
    },
  );
}

export class V1_LightQuery {
  name!: string;
  id!: string;
  groupId!: string;
  owner?: string | undefined;
  artifactId!: string;
  versionId!: string;
  originalVersionId?: string | undefined;
  lastUpdatedAt?: number | undefined;
  createdAt?: number | undefined;
  lastOpenAt?: number | undefined;

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_Query, {
      artifactId: primitive(),
      id: primitive(),
      groupId: primitive(),
      lastUpdatedAt: optional(primitive()),
      createdAt: optional(primitive()),
      lastOpenAt: optional(primitive()),
      name: primitive(),
      owner: optional(primitive()),
      versionId: primitive(),
      originalVersionId: optional(primitive()),
    }),
    {
      deserializeNullAsUndefined: true,
    },
  );
}
