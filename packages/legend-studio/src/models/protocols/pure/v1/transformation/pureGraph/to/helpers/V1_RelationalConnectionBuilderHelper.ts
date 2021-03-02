/**
 * Copyright 2020 Goldman Sachs
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
  assertNonEmptyString,
  UnsupportedOperationError,
  assertNonNullable,
  getClass,
  guaranteeNonEmptyString,
} from '@finos/legend-studio-shared';
import type { DatasourceSpecification } from '../../../../../../../metamodels/pure/model/packageableElements/store/relational/connection/DatasourceSpecification';
import {
  StaticDatasourceSpecification,
  EmbeddedH2DatasourceSpecification,
  SnowflakeDatasourceSpecification,
} from '../../../../../../../metamodels/pure/model/packageableElements/store/relational/connection/DatasourceSpecification';
import type { AuthenticationStrategy } from '../../../../../../../metamodels/pure/model/packageableElements/store/relational/connection/AuthenticationStrategy';
import {
  OAuthAuthenticationStrategy,
  DefaultH2AuthenticationStrategy,
  DelegatedKerberosAuthenticationStrategy,
  TestDatabaseAuthenticationStrategy,
} from '../../../../../../../metamodels/pure/model/packageableElements/store/relational/connection/AuthenticationStrategy';
import type { V1_GraphBuilderContext } from '../../../../transformation/pureGraph/to/V1_GraphBuilderContext';
import type { V1_DatasourceSpecification } from '../../../../model/packageableElements/store/relational/connection/V1_DatasourceSpecification';
import {
  V1_StaticDatasourceSpecification,
  V1_EmbeddedH2DatasourceSpecification,
  V1_SnowflakeDatasourceSpecification,
} from '../../../../model/packageableElements/store/relational/connection/V1_DatasourceSpecification';
import type { V1_AuthenticationStrategy } from '../../../../model/packageableElements/store/relational/connection/V1_AuthenticationStrategy';
import {
  V1_OAuthAuthenticationStrategy,
  V1_DefaultH2AuthenticationStrategy,
  V1_DelegatedKerberosAuthenticationStrategy,
  V1_TestDatabaseAuthenticationStrategy,
} from '../../../../model/packageableElements/store/relational/connection/V1_AuthenticationStrategy';
import type { StoreRelational_PureProtocolProcessorPlugin_Extension } from '../../../../../StoreRelational_PureProtocolProcessorPlugin_Extension';

export const V1_processDatasourceSpecification = (
  datasourceSpecificationProtocol: V1_DatasourceSpecification,
  context: V1_GraphBuilderContext,
): DatasourceSpecification => {
  if (
    datasourceSpecificationProtocol instanceof V1_StaticDatasourceSpecification
  ) {
    assertNonEmptyString(
      datasourceSpecificationProtocol.host,
      'Static datasource specification host is missing',
    );
    assertNonEmptyString(
      datasourceSpecificationProtocol.databaseName,
      'Static datasource specification database is missing',
    );
    assertNonNullable(
      datasourceSpecificationProtocol.port,
      'Static datasource specification port is missing',
    );
    const staticSpec = new StaticDatasourceSpecification(
      datasourceSpecificationProtocol.host,
      datasourceSpecificationProtocol.port,
      datasourceSpecificationProtocol.databaseName,
    );
    return staticSpec;
  } else if (
    datasourceSpecificationProtocol instanceof
    V1_EmbeddedH2DatasourceSpecification
  ) {
    assertNonEmptyString(
      datasourceSpecificationProtocol.databaseName,
      'Embedded H2 datasource specification databaseName is missing',
    );
    assertNonEmptyString(
      datasourceSpecificationProtocol.directory,
      'Embedded H2 datasource specification directory is missing',
    );
    assertNonNullable(
      datasourceSpecificationProtocol.autoServerMode,
      'Embedded H2 datasource specification autoServerMode is missing',
    );
    const embeddedSpec = new EmbeddedH2DatasourceSpecification(
      datasourceSpecificationProtocol.databaseName,
      datasourceSpecificationProtocol.directory,
      datasourceSpecificationProtocol.autoServerMode,
    );
    return embeddedSpec;
  } else if (
    datasourceSpecificationProtocol instanceof
    V1_SnowflakeDatasourceSpecification
  ) {
    assertNonEmptyString(
      datasourceSpecificationProtocol.accountName,
      'Snowflake datasource specification property is missing',
    );
    assertNonEmptyString(
      datasourceSpecificationProtocol.region,
      'Snowflake datasource specification region is missing',
    );
    assertNonEmptyString(
      datasourceSpecificationProtocol.warehouseName,
      'Snowflake datasource specification warehouseName is missing',
    );
    assertNonNullable(
      datasourceSpecificationProtocol.databaseName,
      'Snowflake datasource specification databaseName is missing',
    );
    const snowflakeSpec = new SnowflakeDatasourceSpecification(
      datasourceSpecificationProtocol.accountName,
      datasourceSpecificationProtocol.region,
      datasourceSpecificationProtocol.warehouseName,
      datasourceSpecificationProtocol.databaseName,
    );
    return snowflakeSpec;
  }
  const extraConnectionDatasourceSpecificationBuilders = context.extensions.plugins.flatMap(
    (plugin) =>
      (plugin as StoreRelational_PureProtocolProcessorPlugin_Extension).V1_getExtraConnectionDatasourceSpecificationBuilders?.() ??
      [],
  );
  for (const builder of extraConnectionDatasourceSpecificationBuilders) {
    const datasourceSpec = builder(datasourceSpecificationProtocol, context);
    if (datasourceSpec) {
      return datasourceSpec;
    }
  }
  throw new UnsupportedOperationError(
    `Can't build datasource specification of type '${
      getClass(datasourceSpecificationProtocol).name
    }'. No compatible builder available from plugins.`,
  );
};

export const V1_processAuthenticationStrategy = (
  protocol: V1_AuthenticationStrategy,
  context: V1_GraphBuilderContext,
): AuthenticationStrategy => {
  if (protocol instanceof V1_DefaultH2AuthenticationStrategy) {
    return new DefaultH2AuthenticationStrategy();
  } else if (protocol instanceof V1_DelegatedKerberosAuthenticationStrategy) {
    const metamodel = new DelegatedKerberosAuthenticationStrategy();
    metamodel.serverPrincipal = protocol.serverPrincipal;
    return metamodel;
  } else if (protocol instanceof V1_TestDatabaseAuthenticationStrategy) {
    return new TestDatabaseAuthenticationStrategy();
  } else if (protocol instanceof V1_OAuthAuthenticationStrategy) {
    return new OAuthAuthenticationStrategy(
      guaranteeNonEmptyString(
        protocol.oauthKey,
        `OAuth authentication specification 'oauthKey' field is missing or empty`,
      ),
      guaranteeNonEmptyString(
        protocol.scopeName,
        `OAuth authentication specification 'scopeName' field is missing or empty`,
      ),
    );
  }
  throw new UnsupportedOperationError(
    `Can't build authentication strategy of type '${getClass(protocol).name}'`,
  );
};
