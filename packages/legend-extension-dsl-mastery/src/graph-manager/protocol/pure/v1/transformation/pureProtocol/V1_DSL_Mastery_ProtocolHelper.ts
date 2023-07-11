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

import { V1_MasterRecordDefinition } from '../../model/packageableElements/mastery/V1_DSL_Mastery_MasterRecordDefinition.js';
import {
  V1_IdentityResolution,
  V1_ResolutionQuery,
} from '../../model/packageableElements/mastery/V1_DSL_Mastery_IdentityResolution.js';
import {
  V1_RecordSource,
  V1_RecordSourcePartition,
} from '../../model/packageableElements/mastery/V1_DSL_Mastery_RecordSource.js';
import {
  type PlainObject,
  UnsupportedOperationError,
  usingConstantValueSchema,
  usingModelSchema,
} from '@finos/legend-shared';
import { V1_PropertyPath } from '../../model/packageableElements/mastery/V1_DSL_Mastery_PropertyPath.js';
import {
  type V1_RuleScope,
  V1_DataProviderIdScope,
  V1_DataProviderTypeScope,
  V1_RecordSourceScope,
  V1_RuleScopeType,
} from '../../model/packageableElements/mastery/V1_DSL_Mastery_RuleScope.js';
import {
  V1_ConditionalRule,
  V1_CreateRule,
  V1_DeleteRule,
  V1_SourcePrecedenceRule,
  type V1_PrecedenceRule,
} from '../../model/packageableElements/mastery/V1_DSL_Mastery_PrecedenceRule.js';
import type { DSL_Mastery_PureProtocolProcessorPlugin_Extension } from '../../../DSL_Mastery_PureProtocolProcessorPlugin_Extension.js';
import {
  type PureProtocolProcessorPlugin,
  V1_rawLambdaModelSchema,
} from '@finos/legend-graph';
import {
  createModelSchema,
  custom,
  deserialize,
  list,
  type ModelSchema,
  primitive,
  serialize,
} from 'serializr';

/**********
 * sources
 **********/

const V1_recordSourcePartitionSchema = createModelSchema(
  V1_RecordSourcePartition,
  {
    id: primitive(),
    tags: list(primitive()),
  },
);

const V1_recordSourceSchema = createModelSchema(V1_RecordSource, {
  createBlockedException: primitive(),
  createPermitted: primitive(),
  description: primitive(),
  id: primitive(),
  parseService: primitive(),
  partitions: list(
    custom(
      (val) => serialize(V1_recordSourcePartitionSchema, val),
      (val) => deserialize(V1_recordSourcePartitionSchema, val),
    ),
  ),
  sequentialData: primitive(),
  stagedLoad: primitive(),
  status: primitive(),
  tags: list(primitive()),
  transformService: primitive(),
});

/**********
 * identity resolution
 **********/

const V1_resolutionQuerySchema = createModelSchema(V1_ResolutionQuery, {
  keyType: primitive(),
  precedence: primitive(),
  queries: list(usingModelSchema(V1_rawLambdaModelSchema)),
});

const V1_identityResolutionSchema = createModelSchema(V1_IdentityResolution, {
  modelClass: primitive(),
  resolutionQueries: list(
    custom(
      (val) => serialize(V1_resolutionQuerySchema, val),
      (val) => deserialize(V1_resolutionQuerySchema, val),
    ),
  ),
});

/**********
 * precedence rules
 **********/

const V1_propertyPathSchema = createModelSchema(V1_PropertyPath, {
  filter: usingModelSchema(V1_rawLambdaModelSchema),
  property: primitive(),
});

const V1_dataProviderIdScopeSchema = createModelSchema(V1_DataProviderIdScope, {
  _type: primitive(),
  dataProviderId: primitive(),
});

const V1_dataProviderTypeScopeSchema = createModelSchema(
  V1_DataProviderTypeScope,
  {
    _type: primitive(),
    dataProviderType: primitive(),
  },
);

const V1_recordSourceScopeSchema = createModelSchema(V1_RecordSourceScope, {
  _type: primitive(),
  recordSourceId: primitive(),
});

export const V1_serializeRuleScope = (
  protocol: V1_RuleScope,
): PlainObject<V1_RuleScope> => {
  switch (protocol._type) {
    case V1_RuleScopeType.DATA_PROVIDER_ID_SCOPE:
      return serialize(V1_dataProviderIdScopeSchema, protocol);
    case V1_RuleScopeType.DATA_PROVIDER_TYPE_SCOPE:
      return serialize(V1_dataProviderTypeScopeSchema, protocol);
    case V1_RuleScopeType.RECORD_SOURCE_SCOPE:
      return serialize(V1_recordSourceScopeSchema, protocol);
    default:
      throw new UnsupportedOperationError(
        `Can't serialize rule scope '${protocol._type}'`,
      );
  }
};

export const V1_deserializeRuleScope = (
  json: PlainObject<V1_RuleScope>,
): V1_RuleScope => {
  switch (json._type) {
    case V1_RuleScopeType.DATA_PROVIDER_ID_SCOPE:
      return deserialize(V1_dataProviderIdScopeSchema, json);
    case V1_RuleScopeType.DATA_PROVIDER_TYPE_SCOPE:
      return deserialize(V1_dataProviderTypeScopeSchema, json);
    case V1_RuleScopeType.RECORD_SOURCE_SCOPE:
      return deserialize(V1_recordSourceScopeSchema, json);
    default:
      throw new UnsupportedOperationError(
        `Can't deserialize rule scope '${json._type}'`,
      );
  }
};

export const V1_createRuleSchema = createModelSchema(V1_CreateRule, {
  _type: primitive(),
  masterRecordFilter: usingModelSchema(V1_rawLambdaModelSchema),
  paths: list(
    custom(
      (val) => serialize(V1_propertyPathSchema, val),
      (val) => deserialize(V1_propertyPathSchema, val),
    ),
  ),
  scopes: list(
    custom(
      (val) => V1_serializeRuleScope(val),
      (val) => V1_deserializeRuleScope(val),
    ),
  ),
});

export const V1_deleteRuleSchema = createModelSchema(V1_DeleteRule, {
  _type: primitive(),
  masterRecordFilter: usingModelSchema(V1_rawLambdaModelSchema),
  paths: list(
    custom(
      (val) => serialize(V1_propertyPathSchema, val),
      (val) => deserialize(V1_propertyPathSchema, val),
    ),
  ),
  precedence: primitive(),
  predicate: usingModelSchema(V1_rawLambdaModelSchema),
  scopes: list(
    custom(
      (val) => V1_serializeRuleScope(val),
      (val) => V1_deserializeRuleScope(val),
    ),
  ),
});

export const V1_sourcePrecedenceRuleSchema = createModelSchema(
  V1_SourcePrecedenceRule,
  {
    _type: primitive(),
    action: primitive(),
    masterRecordFilter: usingModelSchema(V1_rawLambdaModelSchema),
    paths: list(
      custom(
        (val) => serialize(V1_propertyPathSchema, val),
        (val) => deserialize(V1_propertyPathSchema, val),
      ),
    ),
    precedence: primitive(),
    scopes: list(
      custom(
        (val) => V1_serializeRuleScope(val),
        (val) => V1_deserializeRuleScope(val),
      ),
    ),
  },
);

export const V1_conditionalRuleSchema = createModelSchema(V1_ConditionalRule, {
  _type: primitive(),
  masterRecordFilter: usingModelSchema(V1_rawLambdaModelSchema),
  paths: list(
    custom(
      (val) => serialize(V1_propertyPathSchema, val),
      (val) => deserialize(V1_propertyPathSchema, val),
    ),
  ),
  predicate: usingModelSchema(V1_rawLambdaModelSchema),
  scopes: list(
    custom(
      (val) => V1_serializeRuleScope(val),
      (val) => V1_deserializeRuleScope(val),
    ),
  ),
});

export const V1_serializePrecedenceRule = (
  protocol: V1_PrecedenceRule,
  plugins: PureProtocolProcessorPlugin[],
): PlainObject<V1_PrecedenceRule> => {
  const extraPrecedenceRuleProtocolSerializers = plugins.flatMap(
    (plugin) =>
      (
        plugin as DSL_Mastery_PureProtocolProcessorPlugin_Extension
      ).V1_getExtraPrecedenceRuleProtocolSerializers?.() ?? [],
  );
  for (const serializer of extraPrecedenceRuleProtocolSerializers) {
    const precedenceRuleProtocolJson = serializer(protocol);
    if (precedenceRuleProtocolJson) {
      return precedenceRuleProtocolJson;
    }
  }
  throw new UnsupportedOperationError(
    `Can't serialize precedence rule: no compatible serializer available from plugins`,
    protocol,
  );
};

export const V1_deserializePrecedenceRule = (
  json: PlainObject<V1_PrecedenceRule>,
  plugins: PureProtocolProcessorPlugin[],
): V1_PrecedenceRule => {
  const extraPrecedenceRuleProtocolDeserializers = plugins.flatMap(
    (plugin) =>
      (
        plugin as DSL_Mastery_PureProtocolProcessorPlugin_Extension
      ).V1_getExtraPrecedenceRuleProtocolDeserializers?.() ?? [],
  );
  for (const deserializer of extraPrecedenceRuleProtocolDeserializers) {
    const precedenceRuleProtocol = deserializer(json);
    if (precedenceRuleProtocol) {
      return precedenceRuleProtocol;
    }
  }
  throw new UnsupportedOperationError(
    `Can't deserialize precedence rule of type '${json._type}': no compatible deserializer available from plugins`,
  );
};

/**********
 * master record definition
 **********/

export const V1_MASTER_RECORD_DEFINITION_ELEMENT_PROTOCOL_TYPE = 'mastery';

export const V1_masterRecordDefinitionModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
): ModelSchema<V1_MasterRecordDefinition> =>
  createModelSchema(V1_MasterRecordDefinition, {
    _type: usingConstantValueSchema(
      V1_MASTER_RECORD_DEFINITION_ELEMENT_PROTOCOL_TYPE,
    ),
    identityResolution: custom(
      (val) => serialize(V1_identityResolutionSchema, val),
      (val) => deserialize(V1_identityResolutionSchema, val),
    ),
    modelClass: primitive(),
    name: primitive(),
    package: primitive(),
    precedenceRules: list(
      custom(
        (val) => V1_serializePrecedenceRule(val, plugins),
        (val) => V1_deserializePrecedenceRule(val, plugins),
      ),
    ),
    sources: list(
      custom(
        (val) => serialize(V1_recordSourceSchema, val),
        (val) => deserialize(V1_recordSourceSchema, val),
      ),
    ),
  });
