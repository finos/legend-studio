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

import { computed, observable, action, makeObservable, flow } from 'mobx';
import type { EditorStore } from '../../../EditorStore.js';
import {
  guaranteeType,
  uuid,
  UnsupportedOperationError,
  assertErrorThrown,
  LogEvent,
  type GeneratorFn,
} from '@finos/legend-shared';
import { ElementEditorState } from './../ElementEditorState.js';
import type { STO_Relational_LegendStudioApplicationPlugin_Extension } from '../../../../extensions/STO_Relational_LegendStudioApplicationPlugin_Extension.js';
import {
  type PackageableElement,
  type Connection,
  type ValidationIssue,
  type DatasourceSpecification,
  PackageableConnection,
  JsonModelConnection,
  FlatDataConnection,
  RelationalDatabaseConnection,
  DefaultH2AuthenticationStrategy,
  DelegatedKerberosAuthenticationStrategy,
  OAuthAuthenticationStrategy,
  UsernamePasswordAuthenticationStrategy,
  ApiTokenAuthenticationStrategy,
  SnowflakePublicAuthenticationStrategy,
  GCPApplicationDefaultCredentialsAuthenticationStrategy,
  GCPWorkloadIdentityFederationAuthenticationStrategy,
  MiddleTierUsernamePasswordAuthenticationStrategy,
  TrinoDelegatedKerberosAuthenticationStrategy,
  EmbeddedH2DatasourceSpecification,
  LocalH2DatasourceSpecification,
  DatabricksDatasourceSpecification,
  SnowflakeDatasourceSpecification,
  BigQueryDatasourceSpecification,
  StaticDatasourceSpecification,
  RedshiftDatasourceSpecification,
  SpannerDatasourceSpecification,
  TrinoDatasourceSpecification,
  TrinoSslSpecification,
  createValidationError,
  isStubbed_PackageableElement,
  type PostProcessor,
  MapperPostProcessor,
  type AuthenticationStrategy,
  type RelationalConnectionConfiguration,
} from '@finos/legend-graph';
import type { DSL_Mapping_LegendStudioApplicationPlugin_Extension } from '../../../../extensions/DSL_Mapping_LegendStudioApplicationPlugin_Extension.js';
import {
  relationDbConnection_setNewAuthenticationStrategy,
  relationDbConnection_setDatasourceSpecification,
  relationDbConnection_setLocalMode,
} from '../../../../graph-modifier/STO_Relational_GraphModifierHelper.js';
import {
  MapperPostProcessorEditorState,
  type PostProcessorEditorState,
} from './PostProcessorEditorState.js';
import { LEGEND_STUDIO_APP_EVENT } from '../../../../../__lib__/LegendStudioEvent.js';

export abstract class ConnectionValueState {
  editorStore: EditorStore;
  connection: Connection;

  constructor(editorStore: EditorStore, connection: Connection) {
    this.editorStore = editorStore;
    this.connection = connection;
  }

  abstract label(): string;
}

export enum RELATIONAL_DATABASE_TAB_TYPE {
  GENERAL = 'General',
  STORE = 'Store',
  POST_PROCESSORS = 'Post Processors',
}

export enum CORE_DATASOURCE_SPEC_TYPE {
  STATIC = 'Static',
  H2_LOCAL = 'H2 Local',
  H2_EMBEDDED = 'H2 Embedded',
  DATABRICKS = 'Databricks',
  SNOWFLAKE = 'Snowflake',
  REDSHIFT = 'Redshift',
  BIGQUERY = 'Big Query',
  SPANNER = 'Spanner',
  TRINO = 'Trino',
}

export enum POST_PROCESSOR_TYPE {
  MAPPER = 'Mapper',
}

export enum CORE_AUTHENTICATION_STRATEGY_TYPE {
  DELEGATED_KERBEROS = 'Delegated Kerberos',
  H2_DEFAULT = 'H2 Default',
  SNOWFLAKE_PUBLIC = 'Snowflake Public',
  GCP_APPLICATION_DEFAULT_CREDENTIALS = 'GCP Application Default Credentials',
  API_TOKEN = 'API Token',
  OAUTH = 'OAuth',
  USERNAME_PASSWORD = 'Username Password',
  GCP_WORKLOAD_IDENTITY_FEDERATION = 'GCP Workload Identity Federation',
  MIDDLE_TIER_USERNAME_PASSWORD = 'Middle-tier Username Password',
  TRINO_DELEGATED_KERBEROS = 'Trino Delegated Kerberos',
}

class DatabaseTypeConfiguration {
  compatibleDataSources: string[] = [];
  compatibleAuthStragies: string[] = [];

  constructor(
    compatibleDataSources: string[],
    compatibleAuthStragies: string[],
  ) {
    this.compatibleDataSources = compatibleDataSources;
    this.compatibleAuthStragies = compatibleAuthStragies;
  }
}

const TEMPRORARY_DATASOURCE_SPECIFICATION_PROTOCOL_TO_PRETTIER = new Map<
  string,
  string
>([
  ['static', CORE_DATASOURCE_SPEC_TYPE.STATIC],
  ['h2Local', CORE_DATASOURCE_SPEC_TYPE.H2_LOCAL],
  ['Trino', CORE_DATASOURCE_SPEC_TYPE.TRINO],
  ['databricks', CORE_DATASOURCE_SPEC_TYPE.DATABRICKS],
  ['bigQuery', CORE_DATASOURCE_SPEC_TYPE.BIGQUERY],
  ['spanner', CORE_DATASOURCE_SPEC_TYPE.SPANNER],
  ['redshift', CORE_DATASOURCE_SPEC_TYPE.REDSHIFT],
  ['snowflake', CORE_DATASOURCE_SPEC_TYPE.SNOWFLAKE],
]);

const TEMPRORARY_AUTHENICATION_STRATEGY_PROTOCOL_TO_PRETTIER = new Map<
  string,
  string
>([
  ['userNamePassword', CORE_AUTHENTICATION_STRATEGY_TYPE.USERNAME_PASSWORD],
  [
    'TrinoDelegatedKerberosAuth',
    CORE_AUTHENTICATION_STRATEGY_TYPE.TRINO_DELEGATED_KERBEROS,
  ],
  [
    'gcpApplicationDefaultCredentials',
    CORE_AUTHENTICATION_STRATEGY_TYPE.GCP_APPLICATION_DEFAULT_CREDENTIALS,
  ],
  [
    'middleTierUserNamePassword',
    CORE_AUTHENTICATION_STRATEGY_TYPE.MIDDLE_TIER_USERNAME_PASSWORD,
  ],
  ['snowflakePublic', CORE_AUTHENTICATION_STRATEGY_TYPE.SNOWFLAKE_PUBLIC],
  [
    'gcpWorkloadIdentityFederation',
    CORE_AUTHENTICATION_STRATEGY_TYPE.GCP_WORKLOAD_IDENTITY_FEDERATION,
  ],
  ['apiToken', CORE_AUTHENTICATION_STRATEGY_TYPE.API_TOKEN],
  ['h2Default', CORE_AUTHENTICATION_STRATEGY_TYPE.H2_DEFAULT],
]);

export class RelationalDatabaseConnectionValueState extends ConnectionValueState {
  override connection: RelationalDatabaseConnection;
  localMode = false;
  selectedTab = RELATIONAL_DATABASE_TAB_TYPE.GENERAL;
  postProcessorState: PostProcessorEditorState | undefined;
  dbTypeToDataSourceAndAuthMap: Map<string, DatabaseTypeConfiguration> =
    new Map<string, DatabaseTypeConfiguration>();

  constructor(
    editorStore: EditorStore,
    connection: RelationalDatabaseConnection,
  ) {
    super(editorStore, connection);
    makeObservable(this, {
      localMode: observable,
      selectedTab: observable,
      postProcessorState: observable,
      dbTypeToDataSourceAndAuthMap: observable,
      selectedValidDatasources: computed,
      selectedValidAuthenticationStrategies: computed,
      stringRepresentationOfDbTypeToDatSourceAndAuthMap: computed,
      setLocalMode: action,
      setSelectedTab: action,
      selectPostProcessor: action,
      fetchAvailableDbAuthenticationFlows: flow,
    });

    this.connection = connection;
  }

  *fetchAvailableDbAuthenticationFlows(): GeneratorFn<void> {
    try {
      const dbTypeDataSourceAndAuths =
        (yield this.editorStore.graphManagerState.graphManager.getDbTypeToDataSourceAndAuthMapping()) as RelationalConnectionConfiguration[];
      const dbTypeToDataSourceAndAuthMap: Map<
        string,
        DatabaseTypeConfiguration
      > = new Map<string, DatabaseTypeConfiguration>();
      const allAvailableDataSourceSpecs = Object.values(
        CORE_DATASOURCE_SPEC_TYPE,
      ) as string[];
      const allAvailableAuths = Object.values(
        CORE_AUTHENTICATION_STRATEGY_TYPE,
      ) as string[];
      dbTypeDataSourceAndAuths.forEach((dbTypeDataSourceAndAuth) => {
        const dbType = dbTypeDataSourceAndAuth.dbType;
        const dataSource =
          TEMPRORARY_DATASOURCE_SPECIFICATION_PROTOCOL_TO_PRETTIER.get(
            dbTypeDataSourceAndAuth.dataSource,
          ) ?? '';
        const authStrategy =
          TEMPRORARY_AUTHENICATION_STRATEGY_PROTOCOL_TO_PRETTIER.get(
            dbTypeDataSourceAndAuth.authStrategy,
          ) ?? '';
        if (
          allAvailableDataSourceSpecs.includes(dataSource) &&
          allAvailableAuths.includes(authStrategy)
        ) {
          if (!dbTypeToDataSourceAndAuthMap.has(dbType)) {
            dbTypeToDataSourceAndAuthMap.set(
              dbType,
              new DatabaseTypeConfiguration([dataSource], [authStrategy]),
            );
          } else {
            const getDatasourcesAndAuths =
              dbTypeToDataSourceAndAuthMap.get(dbType) ??
              new DatabaseTypeConfiguration([], []);
            const dataSources = getDatasourcesAndAuths.compatibleDataSources;
            const authStrategies =
              getDatasourcesAndAuths.compatibleAuthStragies;
            if (!dataSources.includes(dataSource)) {
              dataSources.push(dataSource);
            }
            if (!authStrategies.includes(authStrategy)) {
              authStrategies.push(authStrategy);
            }
            dbTypeToDataSourceAndAuthMap.set(
              dbType,
              new DatabaseTypeConfiguration(dataSources, authStrategies),
            );
          }
        }
      });
      this.dbTypeToDataSourceAndAuthMap = dbTypeToDataSourceAndAuthMap;
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.GENERIC_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notificationService.notifyError(error);
    }
  }

  selectPostProcessor = (postProcessor: PostProcessor | undefined): void => {
    if (postProcessor) {
      if (postProcessor instanceof MapperPostProcessor) {
        this.postProcessorState = new MapperPostProcessorEditorState(
          postProcessor,
          this,
        );
      } else {
        const extraPostProcessorStateCreators = this.editorStore.pluginManager
          .getApplicationPlugins()
          .flatMap(
            (plugin) =>
              (
                plugin as STO_Relational_LegendStudioApplicationPlugin_Extension
              ).getExtraPostProcessorStateCreators?.() ?? [],
          );
        for (const creator of extraPostProcessorStateCreators) {
          const postProcessorState = creator(postProcessor, this);
          if (postProcessorState) {
            this.postProcessorState = postProcessorState;
          }
        }
      }
    }
    if (this.postProcessorState) {
      this.postProcessorState.setPostProcessorState(postProcessor);
    }
  };

  get storeValidationResult(): ValidationIssue | undefined {
    return isStubbed_PackageableElement(this.connection.store.value)
      ? createValidationError(['Connection database cannot be empty'])
      : undefined;
  }

  setSelectedTab(val: RELATIONAL_DATABASE_TAB_TYPE): void {
    this.selectedTab = val;
  }

  setLocalMode(val: boolean): void {
    this.localMode = val;
  }

  label(): string {
    return `${this.connection.type} connection`;
  }

  selectedDatasourceSpecificationType(
    spec: DatasourceSpecification,
  ): string | undefined {
    if (spec instanceof StaticDatasourceSpecification) {
      return CORE_DATASOURCE_SPEC_TYPE.STATIC;
    } else if (spec instanceof EmbeddedH2DatasourceSpecification) {
      return CORE_DATASOURCE_SPEC_TYPE.H2_EMBEDDED;
    } else if (spec instanceof DatabricksDatasourceSpecification) {
      return CORE_DATASOURCE_SPEC_TYPE.DATABRICKS;
    } else if (spec instanceof SnowflakeDatasourceSpecification) {
      return CORE_DATASOURCE_SPEC_TYPE.SNOWFLAKE;
    } else if (spec instanceof BigQueryDatasourceSpecification) {
      return CORE_DATASOURCE_SPEC_TYPE.BIGQUERY;
    } else if (spec instanceof LocalH2DatasourceSpecification) {
      return CORE_DATASOURCE_SPEC_TYPE.H2_LOCAL;
    } else if (spec instanceof RedshiftDatasourceSpecification) {
      return CORE_DATASOURCE_SPEC_TYPE.REDSHIFT;
    } else if (spec instanceof SpannerDatasourceSpecification) {
      return CORE_DATASOURCE_SPEC_TYPE.SPANNER;
    } else if (spec instanceof TrinoDatasourceSpecification) {
      return CORE_DATASOURCE_SPEC_TYPE.TRINO;
    }
    const extraDatasourceSpecificationClassifiers =
      this.editorStore.pluginManager
        .getApplicationPlugins()
        .flatMap(
          (plugin) =>
            (
              plugin as STO_Relational_LegendStudioApplicationPlugin_Extension
            ).getExtraDatasourceSpecificationClassifiers?.() ?? [],
        );
    for (const classifier of extraDatasourceSpecificationClassifiers) {
      const type = classifier(spec);
      if (type) {
        return type;
      }
    }
    return undefined;
  }

  get selectedValidDatasources(): string[] {
    return this.dbTypeToDataSourceAndAuthMap.has(this.connection.type)
      ? (this.dbTypeToDataSourceAndAuthMap.get(this.connection.type)
          ?.compatibleDataSources as string[])
      : (Object.values(CORE_DATASOURCE_SPEC_TYPE) as string[]);
  }

  get selectedValidAuthenticationStrategies(): string[] {
    return this.dbTypeToDataSourceAndAuthMap.has(this.connection.type)
      ? (this.dbTypeToDataSourceAndAuthMap.get(this.connection.type)
          ?.compatibleAuthStragies as string[])
      : (Object.values(CORE_AUTHENTICATION_STRATEGY_TYPE) as string[]);
  }

  get validationMessage(): string {
    let warning = '';
    if (this.dbTypeToDataSourceAndAuthMap.size > 0) {
      const dbType = this.connection.type;
      const dataSource =
        this.selectedDatasourceSpecificationType(
          this.connection.datasourceSpecification,
        ) ?? '';
      const auth =
        this.selectedAuthenticationStrategyType(
          this.connection.authenticationStrategy,
        ) ?? '';
      const dbTypeToDataSourceAndAuthMap = this.dbTypeToDataSourceAndAuthMap;
      if (
        dbTypeToDataSourceAndAuthMap.has(dbType) &&
        (!dbTypeToDataSourceAndAuthMap
          .get(dbType)
          ?.compatibleDataSources.includes(dataSource) ||
          !dbTypeToDataSourceAndAuthMap
            .get(dbType)
            ?.compatibleAuthStragies.includes(auth))
      ) {
        warning = `Database Type: ${dbType}, Datasource: ${dataSource}, and Authentication: ${auth} do not form a valid Database Authentication Flow. List of valid flows:`;
        warning += this.stringRepresentationOfDbTypeToDatSourceAndAuthMap;
      }
    }
    return warning;
  }

  changeDatasourceSpec(type: string): void {
    const observerContext =
      this.editorStore.changeDetectionState.observerContext;
    let dataSpec: DatasourceSpecification | undefined;
    switch (type) {
      case CORE_DATASOURCE_SPEC_TYPE.STATIC: {
        dataSpec = new StaticDatasourceSpecification('', 80, '');
        break;
      }
      case CORE_DATASOURCE_SPEC_TYPE.H2_LOCAL: {
        dataSpec = new LocalH2DatasourceSpecification();
        break;
      }
      case CORE_DATASOURCE_SPEC_TYPE.H2_EMBEDDED: {
        dataSpec = new EmbeddedH2DatasourceSpecification('', '', false);
        break;
      }
      case CORE_DATASOURCE_SPEC_TYPE.DATABRICKS: {
        dataSpec = new DatabricksDatasourceSpecification('', '', '', '');
        break;
      }
      case CORE_DATASOURCE_SPEC_TYPE.SNOWFLAKE: {
        dataSpec = new SnowflakeDatasourceSpecification('', '', '', '');
        break;
      }
      case CORE_DATASOURCE_SPEC_TYPE.REDSHIFT: {
        dataSpec = new RedshiftDatasourceSpecification(
          '',
          '',
          5439,
          '',
          '',
          '',
        );
        break;
      }
      case CORE_DATASOURCE_SPEC_TYPE.BIGQUERY: {
        dataSpec = new BigQueryDatasourceSpecification('', '');
        break;
      }
      case CORE_DATASOURCE_SPEC_TYPE.SPANNER: {
        dataSpec = new SpannerDatasourceSpecification('', '', '', '', '');
        break;
      }
      case CORE_DATASOURCE_SPEC_TYPE.TRINO: {
        dataSpec = new TrinoDatasourceSpecification(
          '',
          8090,
          new TrinoSslSpecification(true),
        );
        break;
      }
      default: {
        const extraDatasourceSpecificationCreators =
          this.editorStore.pluginManager
            .getApplicationPlugins()
            .flatMap(
              (plugin) =>
                (
                  plugin as STO_Relational_LegendStudioApplicationPlugin_Extension
                ).getExtraDatasourceSpecificationCreators?.() ?? [],
            );
        for (const creator of extraDatasourceSpecificationCreators) {
          const spec = creator(type);
          if (spec) {
            dataSpec = spec;
            break;
          }
        }
      }
    }
    if (!dataSpec) {
      throw new UnsupportedOperationError(
        `Can't create datasource specification of type '${type}': no compatible creator available from plugins`,
      );
    }
    relationDbConnection_setDatasourceSpecification(
      this.connection,
      dataSpec,
      observerContext,
    );
    relationDbConnection_setLocalMode(
      this.connection,
      this.connection.localMode,
    );
  }

  selectedAuthenticationStrategyType(
    auth: AuthenticationStrategy,
  ): string | undefined {
    if (auth instanceof DelegatedKerberosAuthenticationStrategy) {
      return CORE_AUTHENTICATION_STRATEGY_TYPE.DELEGATED_KERBEROS;
    } else if (auth instanceof DefaultH2AuthenticationStrategy) {
      return CORE_AUTHENTICATION_STRATEGY_TYPE.H2_DEFAULT;
    } else if (auth instanceof OAuthAuthenticationStrategy) {
      return CORE_AUTHENTICATION_STRATEGY_TYPE.OAUTH;
    } else if (auth instanceof ApiTokenAuthenticationStrategy) {
      return CORE_AUTHENTICATION_STRATEGY_TYPE.API_TOKEN;
    } else if (auth instanceof SnowflakePublicAuthenticationStrategy) {
      return CORE_AUTHENTICATION_STRATEGY_TYPE.SNOWFLAKE_PUBLIC;
    } else if (auth instanceof UsernamePasswordAuthenticationStrategy) {
      return CORE_AUTHENTICATION_STRATEGY_TYPE.USERNAME_PASSWORD;
    } else if (
      auth instanceof GCPApplicationDefaultCredentialsAuthenticationStrategy
    ) {
      return CORE_AUTHENTICATION_STRATEGY_TYPE.GCP_APPLICATION_DEFAULT_CREDENTIALS;
    } else if (
      auth instanceof GCPWorkloadIdentityFederationAuthenticationStrategy
    ) {
      return CORE_AUTHENTICATION_STRATEGY_TYPE.GCP_WORKLOAD_IDENTITY_FEDERATION;
    } else if (
      auth instanceof MiddleTierUsernamePasswordAuthenticationStrategy
    ) {
      return CORE_AUTHENTICATION_STRATEGY_TYPE.MIDDLE_TIER_USERNAME_PASSWORD;
    } else if (auth instanceof TrinoDelegatedKerberosAuthenticationStrategy) {
      return CORE_AUTHENTICATION_STRATEGY_TYPE.TRINO_DELEGATED_KERBEROS;
    }

    const extraAuthenticationStrategyClassifiers =
      this.editorStore.pluginManager
        .getApplicationPlugins()
        .flatMap(
          (plugin) =>
            (
              plugin as STO_Relational_LegendStudioApplicationPlugin_Extension
            ).getExtraAuthenticationStrategyClassifiers?.() ?? [],
        );
    for (const classifier of extraAuthenticationStrategyClassifiers) {
      const type = classifier(auth);
      if (type) {
        return type;
      }
    }

    return undefined;
  }

  changeAuthenticationStrategy(type: string): void {
    const observerContext =
      this.editorStore.changeDetectionState.observerContext;
    let authStrategy: AuthenticationStrategy | undefined;
    switch (type) {
      case CORE_AUTHENTICATION_STRATEGY_TYPE.DELEGATED_KERBEROS: {
        authStrategy = new DelegatedKerberosAuthenticationStrategy();
        break;
      }
      case CORE_AUTHENTICATION_STRATEGY_TYPE.API_TOKEN: {
        authStrategy = new ApiTokenAuthenticationStrategy('');
        break;
      }
      case CORE_AUTHENTICATION_STRATEGY_TYPE.SNOWFLAKE_PUBLIC: {
        authStrategy = new SnowflakePublicAuthenticationStrategy('', '', '');
        break;
      }
      case CORE_AUTHENTICATION_STRATEGY_TYPE.GCP_APPLICATION_DEFAULT_CREDENTIALS: {
        authStrategy =
          new GCPApplicationDefaultCredentialsAuthenticationStrategy();
        break;
      }
      case CORE_AUTHENTICATION_STRATEGY_TYPE.GCP_WORKLOAD_IDENTITY_FEDERATION: {
        authStrategy = new GCPWorkloadIdentityFederationAuthenticationStrategy(
          '',
          [],
        );
        break;
      }
      case CORE_AUTHENTICATION_STRATEGY_TYPE.H2_DEFAULT: {
        authStrategy = new DefaultH2AuthenticationStrategy();
        break;
      }
      case CORE_AUTHENTICATION_STRATEGY_TYPE.USERNAME_PASSWORD: {
        authStrategy = new UsernamePasswordAuthenticationStrategy('', '');
        break;
      }
      case CORE_AUTHENTICATION_STRATEGY_TYPE.OAUTH: {
        authStrategy = new OAuthAuthenticationStrategy('', '');
        break;
      }
      case CORE_AUTHENTICATION_STRATEGY_TYPE.MIDDLE_TIER_USERNAME_PASSWORD: {
        authStrategy = new MiddleTierUsernamePasswordAuthenticationStrategy('');
        break;
      }
      case CORE_AUTHENTICATION_STRATEGY_TYPE.TRINO_DELEGATED_KERBEROS: {
        authStrategy = new TrinoDelegatedKerberosAuthenticationStrategy(
          'HTTP',
          false,
        );
        break;
      }
      default: {
        const extraAuthenticationStrategyCreators =
          this.editorStore.pluginManager
            .getApplicationPlugins()
            .flatMap(
              (plugin) =>
                (
                  plugin as STO_Relational_LegendStudioApplicationPlugin_Extension
                ).getExtraAuthenticationStrategyCreators?.() ?? [],
            );
        for (const creator of extraAuthenticationStrategyCreators) {
          const auth = creator(type);
          if (auth) {
            authStrategy = auth;
            break;
          }
        }
      }
    }
    if (!authStrategy) {
      throw new UnsupportedOperationError(
        `Can't create authentication strategy of type '${type}': no compatible creator available from plugins`,
      );
    }
    relationDbConnection_setNewAuthenticationStrategy(
      this.connection,
      authStrategy,
      observerContext,
    );
  }

  get stringRepresentationOfDbTypeToDatSourceAndAuthMap(): string {
    let stringRepresentation = '';
    for (const [
      type,
      dataSourceAndAuth,
    ] of this.dbTypeToDataSourceAndAuthMap.entries()) {
      for (const dataSource of dataSourceAndAuth.compatibleDataSources) {
        for (const auth of dataSourceAndAuth.compatibleAuthStragies) {
          stringRepresentation += `{Database Type: ${type}, Datasource: ${dataSource}, Authentication: ${auth}}, `;
        }
      }
    }
    return stringRepresentation.slice(0, -2);
  }
}

export class JsonModelConnectionValueState extends ConnectionValueState {
  override connection: JsonModelConnection;

  constructor(editorStore: EditorStore, connection: JsonModelConnection) {
    super(editorStore, connection);
    this.connection = connection;
  }

  label(): string {
    return 'Model Connection';
  }
}

export class FlatDataConnectionValueState extends ConnectionValueState {
  override connection: FlatDataConnection;

  constructor(editorStore: EditorStore, connection: FlatDataConnection) {
    super(editorStore, connection);
    this.connection = connection;
  }

  label(): string {
    return 'flat-data connection';
  }
}

export class UnsupportedConnectionValueState extends ConnectionValueState {
  label(): string {
    return 'unsupported connection';
  }
}

export class ConnectionEditorState {
  /**
   * NOTE: used to force component remount on state change
   */
  readonly uuid = uuid();
  editorStore: EditorStore;
  connection: Connection;
  connectionValueState: ConnectionValueState;

  constructor(editorStore: EditorStore, connection: Connection) {
    this.editorStore = editorStore;
    this.connection = connection;
    this.connectionValueState = this.buildConnectionValueEditorState();
  }

  buildConnectionValueEditorState(): ConnectionValueState {
    const connection = this.connection;
    if (connection instanceof JsonModelConnection) {
      return new JsonModelConnectionValueState(this.editorStore, connection);
    } else if (connection instanceof FlatDataConnection) {
      return new FlatDataConnectionValueState(this.editorStore, connection);
    } else if (connection instanceof RelationalDatabaseConnection) {
      return new RelationalDatabaseConnectionValueState(
        this.editorStore,
        connection,
      );
    } else {
      const extraConnectionValueEditorStateBuilders =
        this.editorStore.pluginManager
          .getApplicationPlugins()
          .flatMap(
            (plugin) =>
              (
                plugin as DSL_Mapping_LegendStudioApplicationPlugin_Extension
              ).getExtraConnectionValueEditorStateBuilders?.() ?? [],
          );
      for (const stateBuilder of extraConnectionValueEditorStateBuilders) {
        const state = stateBuilder(this.editorStore, connection);
        if (state) {
          return state;
        }
      }
      return new UnsupportedConnectionValueState(this.editorStore, connection);
    }
  }
}

export class PackageableConnectionEditorState extends ElementEditorState {
  connectionState: ConnectionEditorState;

  constructor(editorStore: EditorStore, element: PackageableElement) {
    super(editorStore, element);

    makeObservable(this, {
      connection: computed,
      reprocess: action,
    });

    this.connectionState = new ConnectionEditorState(
      editorStore,
      this.connection.connectionValue,
    );
  }

  get connection(): PackageableConnection {
    return guaranteeType(
      this.element,
      PackageableConnection,
      `Element inside connection editor state must be a packageable connection`,
    );
  }

  reprocess(
    newElement: PackageableElement,
    editorStore: EditorStore,
  ): ElementEditorState {
    const editorState = new PackageableConnectionEditorState(
      editorStore,
      newElement,
    );

    return editorState;
  }
}
