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
  V1_RecordService,
  V1_RecordSource,
  V1_RecordSourcePartition,
} from '../../model/packageableElements/mastery/V1_DSL_Mastery_RecordSource.js';
import {
  optionalCustom,
  optionalCustomList,
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
  type ModelSchema,
  createModelSchema,
  custom,
  deserialize,
  list,
  primitive,
  serialize,
  optional,
} from 'serializr';
import {
  type V1_AcquisitionProtocol,
  V1_FileAcquisitionProtocol,
  V1_KafkaAcquisitionProtocol,
  V1_LegendServiceAcquisitionProtocol,
  V1_RestAcquisitionProtocol,
} from '../../model/packageableElements/mastery/V1_DSL_Mastery_AcquisitionProtocol.js';
import {
  V1_FTPConnection,
  V1_HTTPConnection,
  V1_KafkaConnection,
  V1_ProxyConfiguration,
} from '../../model/packageableElements/mastery/V1_DSL_Mastery_Connection.js';
import { V1_DataProvider } from '../../model/packageableElements/mastery/V1_DSL_Mastery_DataProvider.js';
import {
  type V1_Trigger,
  V1_CronTrigger,
  V1_ManualTrigger,
} from '../../model/packageableElements/mastery/V1_DSL_Mastery_Trigger.js';
import type { V1_Authorization } from '../../model/packageableElements/mastery/V1_DSL_Mastery_Authorization.js';
import {
  type V1_AuthenticationStrategy,
  type V1_CredentialSecret,
  V1_NTLMAuthenticationStrategy,
  V1_TokenAuthenticationStrategy,
} from '../../model/packageableElements/mastery/V1_DSL_Mastery_AuthenticationStrategy.js';

/********************
 * connection
 ********************/

export enum V1_TriggerType {
  CRON = 'cronTrigger',
  MANUAL = 'manualTrigger',
}

export const V1_cronTriggerSchema = createModelSchema(V1_CronTrigger, {
  _type: usingConstantValueSchema(V1_TriggerType.CRON),
  days: optional(list(primitive())),
  dayOfMonth: optional(primitive()),
  frequency: optional(primitive()),
  hour: primitive(),
  minute: primitive(),
  month: optional(primitive()),
  timeZone: primitive(),
  year: optional(primitive()),
});

export const V1_manualTriggerSchema = createModelSchema(V1_ManualTrigger, {
  _type: usingConstantValueSchema(V1_TriggerType.MANUAL),
});

export const V1_serializeTrigger = (
  protocol: V1_Trigger,
): PlainObject<V1_Trigger> => {
  if (protocol instanceof V1_CronTrigger) {
    return serialize(V1_cronTriggerSchema, protocol);
  } else if (protocol instanceof V1_ManualTrigger) {
    return serialize(V1_manualTriggerSchema, protocol);
  }
  throw new UnsupportedOperationError(
    `Can't serialize trigger '${typeof protocol}'`,
  );
};

export const V1_deserializeTrigger = (
  json: PlainObject<V1_Trigger>,
): V1_Trigger => {
  switch (json._type) {
    case V1_TriggerType.CRON:
      return deserialize(V1_cronTriggerSchema, json);
    case V1_TriggerType.MANUAL:
      return deserialize(V1_manualTriggerSchema, json);
    default:
      throw new UnsupportedOperationError(
        `Can't deserialize trigger '${json._type}'`,
      );
  }
};

/**********
 * credential secret
 **********/

export const V1_serializeCredentialSecret = (
  protocol: V1_CredentialSecret,
  plugins: PureProtocolProcessorPlugin[],
): PlainObject<V1_CredentialSecret> => {
  const extraCredentialSecretSerializers = plugins.flatMap(
    (plugin) =>
      (
        plugin as DSL_Mastery_PureProtocolProcessorPlugin_Extension
      ).V1_getExtraCredentialSecretProtocolSerializers?.() ?? [],
  );
  for (const serializer of extraCredentialSecretSerializers) {
    const credentialSecretJson = serializer(protocol, plugins);
    if (credentialSecretJson) {
      return credentialSecretJson;
    }
  }
  throw new UnsupportedOperationError(
    `Can't serialize credential secret Json: no compatible serializer available from plugins`,
    protocol,
  );
};

export const V1_deserializeCredentialSecret = (
  json: PlainObject<V1_CredentialSecret>,
  plugins: PureProtocolProcessorPlugin[],
): V1_CredentialSecret => {
  const extraCredentialSecretDeserializers = plugins.flatMap(
    (plugin) =>
      (
        plugin as DSL_Mastery_PureProtocolProcessorPlugin_Extension
      ).V1_getExtraCredentialSecretProtocolDeserializers?.() ?? [],
  );
  for (const deserializer of extraCredentialSecretDeserializers) {
    const credentialSecretProtocol = deserializer(json, plugins);
    if (credentialSecretProtocol) {
      return credentialSecretProtocol;
    }
  }
  throw new UnsupportedOperationError(
    `Can't deserialize credential secret of type '${json._type}': no compatible deserializer available from plugins`,
  );
};

/********************
 * authentication strategy
 ********************/

export enum V1_AuthenticationStrategyType {
  NTLM = 'ntlmAuthenticationStrategy',
  TOKEN = 'tokenAuthenticationStrategy',
}

export const V1_NTLMAuthenticationStrategySchema = (
  plugins: PureProtocolProcessorPlugin[],
): ModelSchema<V1_NTLMAuthenticationStrategy> =>
  createModelSchema(V1_NTLMAuthenticationStrategy, {
    _type: usingConstantValueSchema(V1_AuthenticationStrategyType.NTLM),
    credential: optionalCustom(
      (val) => V1_serializeCredentialSecret(val, plugins),
      (val) => V1_deserializeCredentialSecret(val, plugins),
    ),
  });

export const V1_TokenAuthenticationStrategyProtocolSchema = (
  plugins: PureProtocolProcessorPlugin[],
): ModelSchema<V1_TokenAuthenticationStrategy> =>
  createModelSchema(V1_TokenAuthenticationStrategy, {
    _type: usingConstantValueSchema(V1_AuthenticationStrategyType.TOKEN),
    credential: optionalCustom(
      (val) => V1_serializeCredentialSecret(val, plugins),
      (val) => V1_deserializeCredentialSecret(val, plugins),
    ),
    tokenUrl: primitive(),
  });

export const V1_serializeAuthenticationStrategy = (
  protocol: V1_AuthenticationStrategy,
  plugins: PureProtocolProcessorPlugin[],
): PlainObject<V1_AuthenticationStrategy> => {
  if (protocol instanceof V1_NTLMAuthenticationStrategy) {
    return serialize(V1_NTLMAuthenticationStrategySchema(plugins), protocol);
  } else if (protocol instanceof V1_TokenAuthenticationStrategy) {
    return serialize(
      V1_TokenAuthenticationStrategyProtocolSchema(plugins),
      protocol,
    );
  }
  const extraAuthenticationStrategySerializers = plugins.flatMap(
    (plugin) =>
      (
        plugin as DSL_Mastery_PureProtocolProcessorPlugin_Extension
      ).V1_getExtraAuthenticationStrategyProtocolSerializers?.() ?? [],
  );
  for (const serializer of extraAuthenticationStrategySerializers) {
    const authenticationStrategyJson = serializer(protocol, plugins);
    if (authenticationStrategyJson) {
      return authenticationStrategyJson;
    }
  }
  throw new UnsupportedOperationError(
    `Can't serialize authentication strategy: no compatible serializer available from plugins`,
    protocol,
  );
};

export const V1_deserializeAuthenticationStrategy = (
  json: PlainObject<V1_AuthenticationStrategy>,
  plugins: PureProtocolProcessorPlugin[],
): V1_AuthenticationStrategy => {
  switch (json._type) {
    case V1_AuthenticationStrategyType.NTLM:
      return deserialize(V1_NTLMAuthenticationStrategySchema(plugins), json);
    case V1_AuthenticationStrategyType.TOKEN:
      return deserialize(
        V1_TokenAuthenticationStrategyProtocolSchema(plugins),
        json,
      );
    default: {
      const extraAuthenticationStrategyDeserializers = plugins.flatMap(
        (plugin) =>
          (
            plugin as DSL_Mastery_PureProtocolProcessorPlugin_Extension
          ).V1_getExtraAuthenticationStrategyProtocolDeserializers?.() ?? [],
      );
      for (const deserializer of extraAuthenticationStrategyDeserializers) {
        const authenticationStrategy = deserializer(json, plugins);
        if (authenticationStrategy) {
          return authenticationStrategy;
        }
      }
      throw new UnsupportedOperationError(
        `Can't deserialize authentication strategy of type '${json._type}': no compatible deserializer available from plugins`,
      );
    }
  }
};

/********************
 * connection
 ********************/

export const V1_ProxyConfigurationSchema = (
  plugins: PureProtocolProcessorPlugin[],
): ModelSchema<V1_ProxyConfiguration> =>
  createModelSchema(V1_ProxyConfiguration, {
    authentication: optionalCustom(
      (val) => V1_serializeAuthenticationStrategy(val, plugins),
      (val) => V1_deserializeAuthenticationStrategy(val, plugins),
    ),
    host: primitive(),
    port: primitive(),
  });

export enum V1_ConnectionType {
  KAFKA = 'kafkaConnection',
  FTP = 'ftpConnection',
  HTTP = 'httpConnection',
}

export const V1_KafkaConnectionSchema = (
  plugins: PureProtocolProcessorPlugin[],
): ModelSchema<V1_KafkaConnection> =>
  createModelSchema(V1_KafkaConnection, {
    _type: usingConstantValueSchema(V1_ConnectionType.KAFKA),
    authentication: optionalCustom(
      (val) => V1_serializeAuthenticationStrategy(val, plugins),
      (val) => V1_deserializeAuthenticationStrategy(val, plugins),
    ),
    name: primitive(),
    package: primitive(),
    topicName: primitive(),
    topicUrls: list(primitive()),
  });

export const V1_FTPConnectionSchema = (
  plugins: PureProtocolProcessorPlugin[],
): ModelSchema<V1_FTPConnection> =>
  createModelSchema(V1_FTPConnection, {
    _type: usingConstantValueSchema(V1_ConnectionType.FTP),
    authentication: optionalCustom(
      (val) => V1_serializeAuthenticationStrategy(val, plugins),
      (val) => V1_deserializeAuthenticationStrategy(val, plugins),
    ),
    host: primitive(),
    name: primitive(),
    package: primitive(),
    port: primitive(),
    secure: primitive(),
  });

export const V1_HTTPConnectionSchema = (
  plugins: PureProtocolProcessorPlugin[],
): ModelSchema<V1_HTTPConnection> =>
  createModelSchema(V1_HTTPConnection, {
    _type: usingConstantValueSchema(V1_ConnectionType.HTTP),
    authentication: optionalCustom(
      (val) => V1_serializeAuthenticationStrategy(val, plugins),
      (val) => V1_deserializeAuthenticationStrategy(val, plugins),
    ),
    name: primitive(),
    package: primitive(),
    proxy: optionalCustom(
      (val) => serialize(V1_ProxyConfigurationSchema(plugins), val),
      (val) => deserialize(V1_ProxyConfigurationSchema(plugins), val),
    ),
    url: primitive(),
  });

/********************
 * acquisition protocol
 ********************/
export enum V1_AcquisitionProtocolType {
  FILE = 'fileAcquisitionProtocol',
  KAFKA = 'kafkaAcquisitionProtocol',
  LEGEND_SERVICE = 'legendServiceAcquisitionProtocol',
  REST = 'restAcquisitionProtocol',
}

export const V1_LegendServiceAcquisitionProtocolSchema = createModelSchema(
  V1_LegendServiceAcquisitionProtocol,
  {
    _type: usingConstantValueSchema(V1_AcquisitionProtocolType.LEGEND_SERVICE),
    service: primitive(),
  },
);

export const V1_RestAcquisitionProtocolSchema = createModelSchema(
  V1_RestAcquisitionProtocol,
  {
    _type: usingConstantValueSchema(V1_AcquisitionProtocolType.REST),
  },
);

export const V1_KafkaAcquisitionProtocolSchema = createModelSchema(
  V1_KafkaAcquisitionProtocol,
  {
    _type: usingConstantValueSchema(V1_AcquisitionProtocolType.KAFKA),
    connection: primitive(),
    kafkaDataType: primitive(),
    recordTag: primitive(),
  },
);

export const V1_FileAcquisitionProtocolSchema = createModelSchema(
  V1_FileAcquisitionProtocol,
  {
    _type: usingConstantValueSchema(V1_AcquisitionProtocolType.FILE),
    connection: primitive(),
    filePath: primitive(),
    fileSplittingKeys: list(primitive()),
    fileType: primitive(),
    headerLines: primitive(),
    recordsKey: primitive(),
  },
);

export const V1_serializeAcquisitionProtocol = (
  protocol: V1_AcquisitionProtocol,
  plugins: PureProtocolProcessorPlugin[],
): PlainObject<V1_AcquisitionProtocol> => {
  if (protocol instanceof V1_LegendServiceAcquisitionProtocol) {
    return serialize(V1_LegendServiceAcquisitionProtocolSchema, protocol);
  } else if (protocol instanceof V1_RestAcquisitionProtocol) {
    return serialize(V1_RestAcquisitionProtocolSchema, protocol);
  } else if (protocol instanceof V1_KafkaAcquisitionProtocol) {
    return serialize(V1_KafkaAcquisitionProtocolSchema, protocol);
  } else if (protocol instanceof V1_FileAcquisitionProtocol) {
    return serialize(V1_FileAcquisitionProtocolSchema, protocol);
  }
  const extraAcquisitionProtocolSerializers = plugins.flatMap(
    (plugin) =>
      (
        plugin as DSL_Mastery_PureProtocolProcessorPlugin_Extension
      ).V1_getExtraAcquisitionProtocolSerializers?.() ?? [],
  );
  for (const serializer of extraAcquisitionProtocolSerializers) {
    const acquisitionProtocolJson = serializer(protocol, plugins);
    if (acquisitionProtocolJson) {
      return acquisitionProtocolJson;
    }
  }
  throw new UnsupportedOperationError(
    `Can't serialize acquisition protocol: no compatible serializer available from plugins`,
    protocol,
  );
};

export const V1_deserializeAcquisitionProtocol = (
  json: PlainObject<V1_AcquisitionProtocol>,
  plugins: PureProtocolProcessorPlugin[],
): V1_AcquisitionProtocol => {
  switch (json._type) {
    case V1_AcquisitionProtocolType.LEGEND_SERVICE:
      return deserialize(V1_LegendServiceAcquisitionProtocolSchema, json);
    case V1_AcquisitionProtocolType.REST:
      return deserialize(V1_RestAcquisitionProtocolSchema, json);
    case V1_AcquisitionProtocolType.KAFKA:
      return deserialize(V1_KafkaAcquisitionProtocolSchema, json);
    case V1_AcquisitionProtocolType.FILE:
      return deserialize(V1_FileAcquisitionProtocolSchema, json);
    default: {
      const extraAcquisitionProtocolDeserializers = plugins.flatMap(
        (plugin) =>
          (
            plugin as DSL_Mastery_PureProtocolProcessorPlugin_Extension
          ).V1_getExtraAcquisitionProtocolDeserializers?.() ?? [],
      );
      for (const deserializer of extraAcquisitionProtocolDeserializers) {
        const acquisitionProtocol = deserializer(json, plugins);
        if (acquisitionProtocol) {
          return acquisitionProtocol;
        }
      }
      throw new UnsupportedOperationError(
        `Can't deserialize acquisition protocol of type '${json._type}': no compatible deserializer available from plugins`,
      );
    }
  }
};

/**********
 * authorization
 **********/

export const V1_serializeAuthorization = (
  protocol: V1_Authorization,
  plugins: PureProtocolProcessorPlugin[],
): PlainObject<V1_Authorization> => {
  const extraAuthorizationSerializers = plugins.flatMap(
    (plugin) =>
      (
        plugin as DSL_Mastery_PureProtocolProcessorPlugin_Extension
      ).V1_getExtraAuthorizationProtocolSerializers?.() ?? [],
  );
  for (const serializer of extraAuthorizationSerializers) {
    const authorizationJson = serializer(protocol, plugins);
    if (authorizationJson) {
      return authorizationJson;
    }
  }
  throw new UnsupportedOperationError(
    `Can't serialize authorization: no compatible serializer available from plugins`,
    protocol,
  );
};

export const V1_deserializeAuthorization = (
  json: PlainObject<V1_Authorization>,
  plugins: PureProtocolProcessorPlugin[],
): V1_Authorization => {
  const extraAuthorizationDeserializers = plugins.flatMap(
    (plugin) =>
      (
        plugin as DSL_Mastery_PureProtocolProcessorPlugin_Extension
      ).V1_getExtraAuthorizationProtocolDeserializers?.() ?? [],
  );
  for (const deserializer of extraAuthorizationDeserializers) {
    const authorizationProtocol = deserializer(json, plugins);
    if (authorizationProtocol) {
      return authorizationProtocol;
    }
  }
  throw new UnsupportedOperationError(
    `Can't deserialize credential secret of type '${json._type}': no compatible deserializer available from plugins`,
  );
};

/********************
 * sources
 ********************/

const V1_recordServiceSchema = (
  plugins: PureProtocolProcessorPlugin[],
): ModelSchema<V1_RecordService> =>
  createModelSchema(V1_RecordService, {
    acquisitionProtocol: optionalCustom(
      (protocol) => V1_serializeAcquisitionProtocol(protocol, plugins),
      (protocol) => V1_deserializeAcquisitionProtocol(protocol, plugins),
    ),
    parseService: optional(primitive()),
    transformService: optional(primitive()),
  });

const V1_recordSourcePartitionSchema = createModelSchema(
  V1_RecordSourcePartition,
  {
    id: primitive(),
  },
);

const V1_recordSourceSchema = (
  plugins: PureProtocolProcessorPlugin[],
): ModelSchema<V1_RecordSource> =>
  createModelSchema(V1_RecordSource, {
    allowFieldDelete: optional(primitive()),
    authorization: optionalCustom(
      (val) => V1_serializeAuthorization(val, plugins),
      (val) => V1_deserializeAuthorization(val, plugins),
    ),
    createBlockedException: primitive(),
    createPermitted: primitive(),
    dataProvider: optional(primitive()),
    description: primitive(),
    id: primitive(),
    parseService: optional(primitive()),
    partitions: optionalCustomList(
      (val) => serialize(V1_recordSourcePartitionSchema, val),
      (val) => deserialize(V1_recordSourcePartitionSchema, val),
    ),
    recordService: optional(usingModelSchema(V1_recordServiceSchema(plugins))),
    sequentialData: primitive(),
    stagedLoad: primitive(),
    status: primitive(),
    transformService: optional(primitive()),
    trigger: optionalCustom(
      (val) => V1_serializeTrigger(val),
      (val) => V1_deserializeTrigger(val),
    ),
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
  modelClass: optional(primitive()),
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
 * data provider type
 **********/

export const V1_DATA_PROVIDER_ELEMENT_PROTOCOL_TYPE = 'dataProvider';

export const V1_dataProviderModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
): ModelSchema<V1_DataProvider> =>
  createModelSchema(V1_DataProvider, {
    _type: usingConstantValueSchema(V1_DATA_PROVIDER_ELEMENT_PROTOCOL_TYPE),
    dataProviderId: primitive(),
    dataProviderType: primitive(),
    name: primitive(),
    package: primitive(),
  });

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
    postCurationEnrichmentService: primitive(),
    precedenceRules: list(
      custom(
        (val) => V1_serializePrecedenceRule(val, plugins),
        (val) => V1_deserializePrecedenceRule(val, plugins),
      ),
    ),
    sources: list(
      custom(
        (val) => serialize(V1_recordSourceSchema(plugins), val),
        (val) => deserialize(V1_recordSourceSchema(plugins), val),
      ),
    ),
  });
