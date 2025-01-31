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
  type ModelSchema,
  alias,
  createModelSchema,
  deserialize,
  custom,
  serialize,
  primitive,
  list,
  optional,
} from 'serializr';
import {
  type PlainObject,
  usingConstantValueSchema,
  usingModelSchema,
  IllegalStateError,
  UnsupportedOperationError,
  customEquivalentList,
} from '@finos/legend-shared';
import { V1_ModelChainConnection } from '../../../model/packageableElements/store/modelToModel/connection/V1_ModelChainConnection.js';
import { V1_PackageableConnection } from '../../../model/packageableElements/connection/V1_PackageableConnection.js';
import type { V1_Connection } from '../../../model/packageableElements/connection/V1_Connection.js';
import { V1_JsonModelConnection } from '../../../model/packageableElements/store/modelToModel/connection/V1_JsonModelConnection.js';
import { V1_XmlModelConnection } from '../../../model/packageableElements/store/modelToModel/connection/V1_XmlModelConnection.js';
import { V1_FlatDataConnection } from '../../../model/packageableElements/store/flatData/connection/V1_FlatDataConnection.js';
import {
  type V1_DatabaseConnection,
  V1_RelationalDatabaseConnection,
} from '../../../model/packageableElements/store/relational/connection/V1_RelationalDatabaseConnection.js';
import {
  type V1_DatasourceSpecification,
  V1_LocalH2DataSourceSpecification,
  V1_DatabricksDatasourceSpecification,
  V1_SnowflakeDatasourceSpecification,
  V1_BigQueryDatasourceSpecification,
  V1_StaticDatasourceSpecification,
  V1_EmbeddedH2DatasourceSpecification,
  V1_RedshiftDatasourceSpecification,
  V1_SpannerDatasourceSpecification,
  V1_TrinoDatasourceSpecification,
  V1_TrinoSslSpecification,
  V1_DuckDBDatasourceSpecification,
} from '../../../model/packageableElements/store/relational/connection/V1_DatasourceSpecification.js';
import {
  type V1_AuthenticationStrategy,
  V1_ApiTokenAuthenticationStrategy,
  V1_SnowflakePublicAuthenticationStrategy,
  V1_GCPApplicationDefaultCredentialsAuthenticationStrategy,
  V1_OAuthAuthenticationStrategy,
  V1_DefaultH2AuthenticationStrategy,
  V1_DelegatedKerberosAuthenticationStrategy,
  V1_UsernamePasswordAuthenticationStrategy,
  V1_GCPWorkloadIdentityFederationAuthenticationStrategy,
  V1_MiddleTierUsernamePasswordAuthenticationStrategy,
  V1_TrinoDelegatedKerberosAuthenticationStrategy,
  V1_TestAuthenticationStrategy,
} from '../../../model/packageableElements/store/relational/connection/V1_AuthenticationStrategy.js';
import type { PureProtocolProcessorPlugin } from '../../../../PureProtocolProcessorPlugin.js';
import type { STO_Relational_PureProtocolProcessorPlugin_Extension } from '../../../../extensions/STO_Relational_PureProtocolProcessorPlugin_Extension.js';
import type { DSL_Mapping_PureProtocolProcessorPlugin_Extension } from '../../../../extensions/DSL_Mapping_PureProtocolProcessorPlugin_Extension.js';
import { V1_ConnectionPointer } from '../../../model/packageableElements/connection/V1_ConnectionPointer.js';
import { V1_INTERNAL__UnknownConnection } from '../../../model/packageableElements/connection/V1_INTERNAL__UnknownConnection.js';
import { V1_INTERNAL__UnknownAuthenticationStrategy } from '../../../model/packageableElements/store/relational/connection/V1_INTERNAL__UnknownAuthenticationStrategy.js';
import { V1_INTERNAL__UnknownDatasourceSpecification } from '../../../model/packageableElements/store/relational/connection/V1_INTERNAL__UnknownDatasourceSpecification.js';

export const V1_PACKAGEABLE_CONNECTION_ELEMENT_PROTOCOL_TYPE = 'connection';

export enum V1_ConnectionType {
  CONNECTION_POINTER = 'connectionPointer',
  // MODEL_CONNECTION = 'ModelConnection',
  MODEL_CHAIN_CONNECTION = 'ModelChainConnection',
  JSON_MODEL_CONNECTION = 'JsonModelConnection',
  XML_MODEL_CONNECTION = 'XmlModelConnection',
  FLAT_DATA_CONNECTION = 'FlatDataConnection',
  RELATIONAL_DATABASE_CONNECTION = 'RelationalDatabaseConnection',
}

export const V1_connectionPointerModelSchema = createModelSchema(
  V1_ConnectionPointer,
  {
    _type: usingConstantValueSchema(V1_ConnectionType.CONNECTION_POINTER),
    connection: primitive(),
  },
);

export const V1_modelChainConnectionModelSchema = createModelSchema(
  V1_ModelChainConnection,
  {
    _type: usingConstantValueSchema(V1_ConnectionType.MODEL_CHAIN_CONNECTION),
    /**
     * Omit this information during protocol transformation as it can be
     * interpreted while building the graph; and will help grammar-roundtrip
     * tests (involving engine) to pass. Ideally, this requires grammar parser
     * and composer in engine to be more consistent.
     *
     * @discrepancy grammar-roundtrip
     */
    store: alias('element', optional(primitive())),
    mappings: list(primitive()),
  },
);

export const V1_jsonModelConnectionModelSchema = createModelSchema(
  V1_JsonModelConnection,
  {
    _type: usingConstantValueSchema(V1_ConnectionType.JSON_MODEL_CONNECTION),
    class: primitive(),
    /**
     * Omit this information during protocol transformation as it can be
     * interpreted while building the graph; and will help grammar-roundtrip
     * tests (involving engine) to pass. Ideally, this requires grammar parser
     * and composer in engine to be more consistent.
     *
     * @discrepancy grammar-roundtrip
     */
    store: alias('element', optional(primitive())),
    url: primitive(),
  },
);

export const V1_xmlModelConnectionModelSchema = createModelSchema(
  V1_XmlModelConnection,
  {
    _type: usingConstantValueSchema(V1_ConnectionType.XML_MODEL_CONNECTION),
    class: primitive(),
    /**
     * Omit this information during protocol transformation as it can be
     * interpreted while building the graph; and will help grammar-roundtrip
     * tests (involving engine) to pass. Ideally, this requires grammar parser
     * and composer in engine to be more consistent.
     *
     * @discrepancy grammar-roundtrip
     */
    store: alias('element', optional(primitive())),
    url: primitive(),
  },
);

export const V1_flatDataConnectionModelSchema = createModelSchema(
  V1_FlatDataConnection,
  {
    _type: usingConstantValueSchema(V1_ConnectionType.FLAT_DATA_CONNECTION),
    store: alias('element', primitive()),
    url: primitive(),
  },
);

// ---------------------------------------- Datasource specification ----------------------------------------

enum V1_DatasourceSpecificationType {
  STATIC = 'static',
  H2_EMBEDDED = 'h2Embedded',
  H2_LOCAL = 'h2Local',
  DATABRICKS = 'databricks',
  SNOWFLAKE = 'snowflake',
  REDSHIFT = 'redshift',
  BIGQUERY = 'bigQuery',
  SPANNER = 'spanner',
  TRINO = 'Trino',
  DUCKDB = 'duckDB',
}

const staticDatasourceSpecificationModelSchema = createModelSchema(
  V1_StaticDatasourceSpecification,
  {
    _type: usingConstantValueSchema(V1_DatasourceSpecificationType.STATIC),
    databaseName: primitive(),
    host: primitive(),
    port: primitive(),
  },
);

const embeddedH2DatasourceSpecificationModelSchema = createModelSchema(
  V1_EmbeddedH2DatasourceSpecification,
  {
    _type: usingConstantValueSchema(V1_DatasourceSpecificationType.H2_EMBEDDED),
    autoServerMode: primitive(),
    databaseName: primitive(),
    directory: primitive(),
  },
);

const localH2DatasourceSpecificationModelSchema = createModelSchema(
  V1_LocalH2DataSourceSpecification,
  {
    _type: usingConstantValueSchema(V1_DatasourceSpecificationType.H2_LOCAL),
    testDataSetupCsv: optional(primitive()),
    testDataSetupSqls: customEquivalentList(),
  },
);

const databricksDatasourceSpecificationModelSchema = createModelSchema(
  V1_DatabricksDatasourceSpecification,
  {
    _type: usingConstantValueSchema(V1_DatasourceSpecificationType.DATABRICKS),
    hostname: primitive(),
    port: primitive(),
    protocol: primitive(),
    httpPath: primitive(),
  },
);

const snowflakeDatasourceSpecificationModelSchema = createModelSchema(
  V1_SnowflakeDatasourceSpecification,
  {
    _type: usingConstantValueSchema(V1_DatasourceSpecificationType.SNOWFLAKE),
    accountName: primitive(),
    accountType: optional(primitive()),
    cloudType: optional(primitive()),
    databaseName: primitive(),
    nonProxyHosts: optional(primitive()),
    organization: optional(primitive()),
    proxyHost: optional(primitive()),
    proxyPort: optional(primitive()),
    quotedIdentifiersIgnoreCase: optional(primitive()),
    enableQueryTags: optional(primitive()),
    region: primitive(),
    tempTableDb: optional(primitive()),
    tempTableSchema: optional(primitive()),
    role: optional(primitive()),
    warehouseName: primitive(),
  },
);

const redshiftDatasourceSpecificationModelSchema = createModelSchema(
  V1_RedshiftDatasourceSpecification,
  {
    _type: usingConstantValueSchema(V1_DatasourceSpecificationType.REDSHIFT),
    clusterID: primitive(),
    databaseName: primitive(),
    endpointURL: optional(primitive()),
    host: primitive(),
    port: primitive(),
    region: primitive(),
  },
);

const bigqueryDatasourceSpecificationModelSchema = createModelSchema(
  V1_BigQueryDatasourceSpecification,
  {
    _type: usingConstantValueSchema(V1_DatasourceSpecificationType.BIGQUERY),
    defaultDataset: primitive(),
    projectId: primitive(),
    proxyHost: optional(primitive()),
    proxyPort: optional(primitive()),
  },
);

const spannerDatasourceSpecificationModelSchema = createModelSchema(
  V1_SpannerDatasourceSpecification,
  {
    _type: usingConstantValueSchema(V1_DatasourceSpecificationType.SPANNER),
    databaseId: primitive(),
    instanceId: primitive(),
    projectId: primitive(),
    proxyHost: optional(primitive()),
    proxyPort: optional(primitive()),
  },
);

const trinoSslSpecificationModelSchema = createModelSchema(
  V1_TrinoSslSpecification,
  {
    ssl: primitive(),
    trustStorePathVaultReference: optional(primitive()),
    trustStorePasswordVaultReference: optional(primitive()),
  },
);

const trinoDatasourceSpecificationModelSchema = createModelSchema(
  V1_TrinoDatasourceSpecification,
  {
    _type: usingConstantValueSchema(V1_DatasourceSpecificationType.TRINO),
    host: primitive(),
    port: primitive(),
    catalog: optional(primitive()),
    schema: optional(primitive()),
    clientTags: optional(primitive()),
    sslSpecification: usingModelSchema(trinoSslSpecificationModelSchema),
  },
);

const duckDbDatasourceSpecificationModelSchema = createModelSchema(
  V1_DuckDBDatasourceSpecification,
  {
    _type: usingConstantValueSchema(V1_DatasourceSpecificationType.DUCKDB),
    path: primitive(),
  },
);

export const V1_serializeDatasourceSpecification = (
  protocol: V1_DatasourceSpecification,
  plugins: PureProtocolProcessorPlugin[],
): PlainObject<V1_DatasourceSpecification> => {
  if (protocol instanceof V1_INTERNAL__UnknownDatasourceSpecification) {
    return protocol.content;
  } else if (protocol instanceof V1_StaticDatasourceSpecification) {
    return serialize(staticDatasourceSpecificationModelSchema, protocol);
  } else if (protocol instanceof V1_EmbeddedH2DatasourceSpecification) {
    return serialize(embeddedH2DatasourceSpecificationModelSchema, protocol);
  } else if (protocol instanceof V1_DatabricksDatasourceSpecification) {
    return serialize(databricksDatasourceSpecificationModelSchema, protocol);
  } else if (protocol instanceof V1_SnowflakeDatasourceSpecification) {
    return serialize(snowflakeDatasourceSpecificationModelSchema, protocol);
  } else if (protocol instanceof V1_BigQueryDatasourceSpecification) {
    return serialize(bigqueryDatasourceSpecificationModelSchema, protocol);
  } else if (protocol instanceof V1_LocalH2DataSourceSpecification) {
    return serialize(localH2DatasourceSpecificationModelSchema, protocol);
  } else if (protocol instanceof V1_RedshiftDatasourceSpecification) {
    return serialize(redshiftDatasourceSpecificationModelSchema, protocol);
  } else if (protocol instanceof V1_SpannerDatasourceSpecification) {
    return serialize(spannerDatasourceSpecificationModelSchema, protocol);
  } else if (protocol instanceof V1_TrinoDatasourceSpecification) {
    return serialize(trinoDatasourceSpecificationModelSchema, protocol);
  } else if (protocol instanceof V1_DuckDBDatasourceSpecification) {
    return serialize(duckDbDatasourceSpecificationModelSchema, protocol);
  }
  const extraConnectionDatasourceSpecificationProtocolSerializers =
    plugins.flatMap(
      (plugin) =>
        (
          plugin as STO_Relational_PureProtocolProcessorPlugin_Extension
        ).V1_getExtraConnectionDatasourceSpecificationProtocolSerializers?.() ??
        [],
    );
  for (const serializer of extraConnectionDatasourceSpecificationProtocolSerializers) {
    const json = serializer(protocol);
    if (json) {
      return json;
    }
  }
  throw new UnsupportedOperationError(
    `Can't serialize datasource specification: no compatible serializer available from plugins`,
    protocol,
  );
};

export const V1_deserializeDatasourceSpecification = (
  json: PlainObject<V1_DatasourceSpecification>,
  plugins: PureProtocolProcessorPlugin[],
): V1_DatasourceSpecification => {
  switch (json._type) {
    case V1_DatasourceSpecificationType.STATIC:
      return deserialize(staticDatasourceSpecificationModelSchema, json);
    case V1_DatasourceSpecificationType.H2_EMBEDDED:
      return deserialize(embeddedH2DatasourceSpecificationModelSchema, json);
    case V1_DatasourceSpecificationType.DATABRICKS:
      return deserialize(databricksDatasourceSpecificationModelSchema, json);
    case V1_DatasourceSpecificationType.SNOWFLAKE:
      return deserialize(snowflakeDatasourceSpecificationModelSchema, json);
    case V1_DatasourceSpecificationType.BIGQUERY:
      return deserialize(bigqueryDatasourceSpecificationModelSchema, json);
    case V1_DatasourceSpecificationType.H2_LOCAL:
      return deserialize(localH2DatasourceSpecificationModelSchema, json);
    case V1_DatasourceSpecificationType.REDSHIFT:
      return deserialize(redshiftDatasourceSpecificationModelSchema, json);
    case V1_DatasourceSpecificationType.SPANNER:
      return deserialize(spannerDatasourceSpecificationModelSchema, json);
    case V1_DatasourceSpecificationType.TRINO:
      return deserialize(trinoDatasourceSpecificationModelSchema, json);
    case V1_DatasourceSpecificationType.DUCKDB:
      return deserialize(duckDbDatasourceSpecificationModelSchema, json);
    default: {
      const extraConnectionDatasourceSpecificationProtocolDeserializers =
        plugins.flatMap(
          (plugin) =>
            (
              plugin as STO_Relational_PureProtocolProcessorPlugin_Extension
            ).V1_getExtraConnectionDatasourceSpecificationProtocolDeserializers?.() ??
            [],
        );
      for (const deserializer of extraConnectionDatasourceSpecificationProtocolDeserializers) {
        const protocol = deserializer(json);
        if (protocol) {
          return protocol;
        }
      }

      // Fall back to create unknown stub if not supported
      const protocol = new V1_INTERNAL__UnknownDatasourceSpecification();
      protocol.content = json;
      return protocol;
    }
  }
};

// ---------------------------------------- Authentication strategy ----------------------------------------

enum V1_AuthenticationStrategyType {
  DELEGATED_KERBEROS = 'delegatedKerberos',
  SNOWFLAKE_PUBLIC = 'snowflakePublic',
  GCP_APPLICATION_DEFAULT_CREDENTIALS = 'gcpApplicationDefaultCredentials',
  API_TOKEN = 'apiToken',
  H2_DEFAULT = 'h2Default',
  TEST = 'Test',
  OAUTH = 'oauth',
  USERNAME_PASSWORD = 'userNamePassword',
  GCP_WORKLOAD_IDENTITY_FEDERATION = 'gcpWorkloadIdentityFederation',
  MIDDLE_TIER_USERNAME_PASSWORD = 'middleTierUserNamePassword',
  TRINO_DELEGATED_KERBEROS = 'TrinoDelegatedKerberosAuth',
}

const V1_delegatedKerberosAuthenticationStrategyModelSchema = createModelSchema(
  V1_DelegatedKerberosAuthenticationStrategy,
  {
    _type: usingConstantValueSchema(
      V1_AuthenticationStrategyType.DELEGATED_KERBEROS,
    ),
    serverPrincipal: optional(primitive()),
  },
);

const V1_defaultH2AuthenticationStrategyModelSchema = createModelSchema(
  V1_DefaultH2AuthenticationStrategy,
  { _type: usingConstantValueSchema(V1_AuthenticationStrategyType.H2_DEFAULT) },
);

const V1_testAuthenticationStrategyModelSchema = createModelSchema(
  V1_TestAuthenticationStrategy,
  { _type: usingConstantValueSchema(V1_AuthenticationStrategyType.TEST) },
);

const V1_apiTokenAuthenticationStrategyModelSchema = createModelSchema(
  V1_ApiTokenAuthenticationStrategy,
  {
    _type: usingConstantValueSchema(V1_AuthenticationStrategyType.API_TOKEN),
    apiToken: primitive(),
  },
);

const V1_snowflakePublicAuthenticationStrategyModelSchema = createModelSchema(
  V1_SnowflakePublicAuthenticationStrategy,
  {
    _type: usingConstantValueSchema(
      V1_AuthenticationStrategyType.SNOWFLAKE_PUBLIC,
    ),
    privateKeyVaultReference: primitive(),
    passPhraseVaultReference: primitive(),
    publicUserName: primitive(),
  },
);

const V1_GCPApplicationDefaultCredentialsAuthenticationStrategyModelSchema =
  createModelSchema(V1_GCPApplicationDefaultCredentialsAuthenticationStrategy, {
    _type: usingConstantValueSchema(
      V1_AuthenticationStrategyType.GCP_APPLICATION_DEFAULT_CREDENTIALS,
    ),
  });

const V1_MiddleTierUsernamePasswordAuthenticationStrategyModelSchema =
  createModelSchema(V1_MiddleTierUsernamePasswordAuthenticationStrategy, {
    _type: usingConstantValueSchema(
      V1_AuthenticationStrategyType.MIDDLE_TIER_USERNAME_PASSWORD,
    ),
    vaultReference: primitive(),
  });

const V1_GCPWorkloadIdentityFederationAuthenticationStrategyModelSchema =
  createModelSchema(V1_GCPWorkloadIdentityFederationAuthenticationStrategy, {
    _type: usingConstantValueSchema(
      V1_AuthenticationStrategyType.GCP_WORKLOAD_IDENTITY_FEDERATION,
    ),
    additionalGcpScopes: list(primitive()),
    serviceAccountEmail: primitive(),
  });

const V1_UsernamePasswordAuthenticationStrategyModelSchema = createModelSchema(
  V1_UsernamePasswordAuthenticationStrategy,
  {
    _type: usingConstantValueSchema(
      V1_AuthenticationStrategyType.USERNAME_PASSWORD,
    ),
    baseVaultReference: optional(primitive()),
    userNameVaultReference: primitive(),
    passwordVaultReference: primitive(),
  },
);

const V1_TrinoDelegatedKerberosAuthenticationStrategyModelSchema =
  createModelSchema(V1_TrinoDelegatedKerberosAuthenticationStrategy, {
    _type: usingConstantValueSchema(
      V1_AuthenticationStrategyType.TRINO_DELEGATED_KERBEROS,
    ),
    kerberosRemoteServiceName: primitive(),
    kerberosUseCanonicalHostname: optional(primitive()),
  });

const V1_oAuthAuthenticationStrategyModelSchema = createModelSchema(
  V1_OAuthAuthenticationStrategy,
  {
    _type: usingConstantValueSchema(V1_AuthenticationStrategyType.OAUTH),
    oauthKey: primitive(),
    scopeName: primitive(),
  },
);

export const V1_serializeAuthenticationStrategy = (
  protocol: V1_AuthenticationStrategy,
  plugins: PureProtocolProcessorPlugin[],
): PlainObject<V1_AuthenticationStrategy> => {
  if (protocol instanceof V1_INTERNAL__UnknownAuthenticationStrategy) {
    return protocol.content;
  } else if (protocol instanceof V1_DelegatedKerberosAuthenticationStrategy) {
    return serialize(
      V1_delegatedKerberosAuthenticationStrategyModelSchema,
      protocol,
    );
  } else if (protocol instanceof V1_DefaultH2AuthenticationStrategy) {
    return serialize(V1_defaultH2AuthenticationStrategyModelSchema, protocol);
  } else if (protocol instanceof V1_TestAuthenticationStrategy) {
    return serialize(V1_testAuthenticationStrategyModelSchema, protocol);
  } else if (protocol instanceof V1_ApiTokenAuthenticationStrategy) {
    return serialize(V1_apiTokenAuthenticationStrategyModelSchema, protocol);
  } else if (protocol instanceof V1_SnowflakePublicAuthenticationStrategy) {
    return serialize(
      V1_snowflakePublicAuthenticationStrategyModelSchema,
      protocol,
    );
  } else if (
    protocol instanceof
    V1_GCPApplicationDefaultCredentialsAuthenticationStrategy
  ) {
    return serialize(
      V1_GCPApplicationDefaultCredentialsAuthenticationStrategyModelSchema,
      protocol,
    );
  } else if (
    protocol instanceof V1_GCPWorkloadIdentityFederationAuthenticationStrategy
  ) {
    return serialize(
      V1_GCPWorkloadIdentityFederationAuthenticationStrategyModelSchema,
      protocol,
    );
  } else if (protocol instanceof V1_OAuthAuthenticationStrategy) {
    return serialize(V1_oAuthAuthenticationStrategyModelSchema, protocol);
  } else if (protocol instanceof V1_UsernamePasswordAuthenticationStrategy) {
    return serialize(
      V1_UsernamePasswordAuthenticationStrategyModelSchema,
      protocol,
    );
  } else if (
    protocol instanceof V1_MiddleTierUsernamePasswordAuthenticationStrategy
  ) {
    return serialize(
      V1_MiddleTierUsernamePasswordAuthenticationStrategyModelSchema,
      protocol,
    );
  } else if (
    protocol instanceof V1_TrinoDelegatedKerberosAuthenticationStrategy
  ) {
    return serialize(
      V1_TrinoDelegatedKerberosAuthenticationStrategyModelSchema,
      protocol,
    );
  }
  const extraConnectionAuthenticationStrategyProtocolSerializers =
    plugins.flatMap(
      (plugin) =>
        (
          plugin as STO_Relational_PureProtocolProcessorPlugin_Extension
        ).V1_getExtraConnectionAuthenticationStrategyProtocolSerializers?.() ??
        [],
    );
  for (const serializer of extraConnectionAuthenticationStrategyProtocolSerializers) {
    const json = serializer(protocol);
    if (json) {
      return json;
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
    case V1_AuthenticationStrategyType.DELEGATED_KERBEROS:
      return deserialize(
        V1_delegatedKerberosAuthenticationStrategyModelSchema,
        json,
      );
    case V1_AuthenticationStrategyType.H2_DEFAULT:
      return deserialize(V1_defaultH2AuthenticationStrategyModelSchema, json);
    case V1_AuthenticationStrategyType.TEST:
      return deserialize(V1_testAuthenticationStrategyModelSchema, json);
    case V1_AuthenticationStrategyType.API_TOKEN:
      return deserialize(V1_apiTokenAuthenticationStrategyModelSchema, json);
    case V1_AuthenticationStrategyType.SNOWFLAKE_PUBLIC:
      return deserialize(
        V1_snowflakePublicAuthenticationStrategyModelSchema,
        json,
      );
    case V1_AuthenticationStrategyType.GCP_APPLICATION_DEFAULT_CREDENTIALS:
      return deserialize(
        V1_GCPApplicationDefaultCredentialsAuthenticationStrategyModelSchema,
        json,
      );
    case V1_AuthenticationStrategyType.GCP_WORKLOAD_IDENTITY_FEDERATION:
      return deserialize(
        V1_GCPWorkloadIdentityFederationAuthenticationStrategyModelSchema,
        json,
      );
    case V1_AuthenticationStrategyType.OAUTH:
      return deserialize(V1_oAuthAuthenticationStrategyModelSchema, json);
    case V1_AuthenticationStrategyType.USERNAME_PASSWORD:
      return deserialize(
        V1_UsernamePasswordAuthenticationStrategyModelSchema,
        json,
      );
    case V1_AuthenticationStrategyType.MIDDLE_TIER_USERNAME_PASSWORD:
      return deserialize(
        V1_MiddleTierUsernamePasswordAuthenticationStrategyModelSchema,
        json,
      );
    case V1_AuthenticationStrategyType.TRINO_DELEGATED_KERBEROS:
      return deserialize(V1_TrinoDelegatedKerberosAuthenticationStrategy, json);
    default: {
      const extraConnectionAuthenticationStrategyProtocolDeserializers =
        plugins.flatMap(
          (plugin) =>
            (
              plugin as STO_Relational_PureProtocolProcessorPlugin_Extension
            ).V1_getExtraConnectionAuthenticationStrategyProtocolDeserializers?.() ??
            [],
        );
      for (const deserializer of extraConnectionAuthenticationStrategyProtocolDeserializers) {
        const protocol = deserializer(json);
        if (protocol) {
          return protocol;
        }
      }

      // Fall back to create unknown stub if not supported
      const protocol = new V1_INTERNAL__UnknownAuthenticationStrategy();
      protocol.content = json;
      return protocol;
    }
  }
};

const V1_INTERNAL__UnknownConnectionModelSchema = createModelSchema(
  V1_INTERNAL__UnknownConnection,
  {
    store: alias('element', optional(primitive())),
  },
);

export const V1_serializeConnectionValue = (
  protocol: V1_Connection,
  allowPointer: boolean,
  plugins: PureProtocolProcessorPlugin[],
): PlainObject<V1_Connection> => {
  if (protocol instanceof V1_INTERNAL__UnknownConnection) {
    return protocol.content;
  } else if (protocol instanceof V1_JsonModelConnection) {
    return serialize(V1_jsonModelConnectionModelSchema, protocol);
  } else if (protocol instanceof V1_ModelChainConnection) {
    return serialize(V1_modelChainConnectionModelSchema, protocol);
  } else if (protocol instanceof V1_XmlModelConnection) {
    return serialize(V1_xmlModelConnectionModelSchema, protocol);
  } else if (protocol instanceof V1_FlatDataConnection) {
    return serialize(V1_flatDataConnectionModelSchema, protocol);
  } else if (protocol instanceof V1_RelationalDatabaseConnection) {
    return serialize(V1_RelationalDatabaseConnection, protocol);
  } else if (protocol instanceof V1_ConnectionPointer) {
    if (allowPointer) {
      return serialize(V1_connectionPointerModelSchema, protocol);
    }
    throw new IllegalStateError(
      `Serializing connection pointer is not allowed here`,
    );
  }
  const extraConnectionProtocolSerializers = plugins.flatMap(
    (plugin) =>
      (
        plugin as DSL_Mapping_PureProtocolProcessorPlugin_Extension
      ).V1_getExtraConnectionProtocolSerializers?.() ?? [],
  );
  for (const serializer of extraConnectionProtocolSerializers) {
    const json = serializer(protocol);
    if (json) {
      return json;
    }
  }
  throw new UnsupportedOperationError(
    `Can't serialize connection: no compatible serializer available from plugins`,
    protocol,
  );
};

export const V1_deserializeConnectionValue = (
  json: PlainObject<V1_Connection>,
  allowPointer: boolean,
  plugins: PureProtocolProcessorPlugin[],
): V1_Connection => {
  switch (json._type) {
    case V1_ConnectionType.JSON_MODEL_CONNECTION:
      return deserialize(V1_jsonModelConnectionModelSchema, json);
    case V1_ConnectionType.MODEL_CHAIN_CONNECTION:
      return deserialize(V1_modelChainConnectionModelSchema, json);
    case V1_ConnectionType.XML_MODEL_CONNECTION:
      return deserialize(V1_xmlModelConnectionModelSchema, json);
    case V1_ConnectionType.FLAT_DATA_CONNECTION:
      return deserialize(V1_flatDataConnectionModelSchema, json);
    case V1_ConnectionType.RELATIONAL_DATABASE_CONNECTION:
      return deserialize(V1_RelationalDatabaseConnection, json);
    case V1_ConnectionType.CONNECTION_POINTER:
      if (allowPointer) {
        return deserialize(V1_connectionPointerModelSchema, json);
      }
      throw new IllegalStateError(
        `Deserializing connection pointer is not allowed here`,
      );
    default: {
      const extraConnectionProtocolDeserializers = plugins.flatMap(
        (plugin) =>
          (
            plugin as DSL_Mapping_PureProtocolProcessorPlugin_Extension
          ).V1_getExtraConnectionProtocolDeserializers?.() ?? [],
      );
      for (const deserializer of extraConnectionProtocolDeserializers) {
        const protocol = deserializer(json);
        if (protocol) {
          return protocol;
        }
      }

      // Fall back to create unknown stub if not supported
      const protocol = deserialize(
        V1_INTERNAL__UnknownConnectionModelSchema,
        json,
      );
      protocol.content = json;
      return protocol;
    }
  }
};

export const V1_serializeDatabaseConnectionValue = (
  protocol: V1_DatabaseConnection,
): PlainObject<V1_DatabaseConnection> => {
  if (protocol instanceof V1_RelationalDatabaseConnection) {
    return serialize(V1_RelationalDatabaseConnection, protocol);
  }
  throw new UnsupportedOperationError(
    `Can't serialize database connection`,
    protocol,
  );
};

export const V1_deserializeDatabaseConnectionValue = (
  json: PlainObject<V1_DatabaseConnection>,
): V1_DatabaseConnection => {
  switch (json._type) {
    case V1_ConnectionType.RELATIONAL_DATABASE_CONNECTION:
      return deserialize(V1_RelationalDatabaseConnection, json);
    default:
      throw new UnsupportedOperationError(
        `Can't deserialize database connection of type '${json._type}'`,
      );
  }
};

export const V1_packageableConnectionModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
): ModelSchema<V1_PackageableConnection> =>
  createModelSchema(V1_PackageableConnection, {
    _type: usingConstantValueSchema(
      V1_PACKAGEABLE_CONNECTION_ELEMENT_PROTOCOL_TYPE,
    ),
    connectionValue: custom(
      (val) => V1_serializeConnectionValue(val, false, plugins),
      (val) => V1_deserializeConnectionValue(val, false, plugins),
    ),
    name: primitive(),
    package: primitive(),
  });
