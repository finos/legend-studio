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

import { computed, observable, action, makeObservable } from 'mobx';
import type { EditorStore } from '../../../EditorStore.js';
import {
  guaranteeType,
  uuid,
  UnsupportedOperationError,
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

// Please do not change these values unless they change in the backend
export enum CORE_DATASOURCE_SPEC_TYPE {
  STATIC = 'static',
  H2_LOCAL = 'h2Local',
  H2_EMBEDDED = 'h2Embedded',
  DATABRICKS = 'databricks',
  SNOWFLAKE = 'snowflake',
  REDSHIFT = 'redshift',
  BIGQUERY = 'bigQuery',
  SPANNER = 'spanner',
  TRINO = 'Trino',
}

export enum POST_PROCESSOR_TYPE {
  MAPPER = 'Mapper',
}

// Please do not change these values unless they change in the backend
export enum CORE_AUTHENTICATION_STRATEGY_TYPE {
  DELEGATED_KERBEROS = 'delegatedKerberos',
  H2_DEFAULT = 'h2Default',
  SNOWFLAKE_PUBLIC = 'snowflakePublic',
  GCP_APPLICATION_DEFAULT_CREDENTIALS = 'gcpApplicationDefaultCredentials',
  API_TOKEN = 'apiToken',
  OAUTH = 'oauth',
  USERNAME_PASSWORD = 'userNamePassword',
  GCP_WORKLOAD_IDENTITY_FEDERATION = 'gcpWorkloadIdentityFederation',
  MIDDLE_TIER_USERNAME_PASSWORD = 'middleTierUserNamePassword',
  TRINO_DELEGATED_KERBEROS = 'TrinoDelegatedKerberosAuth',
}

export class RelationalDatabaseConnectionValueState extends ConnectionValueState {
  override connection: RelationalDatabaseConnection;
  localMode = false;
  selectedTab = RELATIONAL_DATABASE_TAB_TYPE.GENERAL;
  postProcessorState: PostProcessorEditorState | undefined;
  constructor(
    editorStore: EditorStore,
    connection: RelationalDatabaseConnection,
  ) {
    super(editorStore, connection);
    makeObservable(this, {
      localMode: observable,
      selectedTab: observable,
      postProcessorState: observable,
      selectedValidDatasources: computed,
      connection: observable,
      setLocalMode: action,
      setSelectedTab: action,
      selectPostProcessor: action,
    });
    this.connection = connection;
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
    return !this.connection.store ||
      isStubbed_PackageableElement(this.connection.store.value)
      ? createValidationError(['Connection database is empty'])
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
    return (
      this.editorStore.graphState.findRelationalDatabaseTypeConfiguration(
        this.connection.type,
      )?.compatibleDataSources ??
      (Object.values(CORE_DATASOURCE_SPEC_TYPE) as string[]).concat(
        this.editorStore.pluginManager
          .getApplicationPlugins()
          .flatMap(
            (plugin) =>
              (
                plugin as STO_Relational_LegendStudioApplicationPlugin_Extension
              ).getExtraDatasourceSpecificationTypes?.() ?? [],
          ),
      )
    );
  }

  get selectedValidAuthenticationStrategies(): string[] {
    return (
      this.editorStore.graphState.findRelationalDatabaseTypeConfiguration(
        this.connection.type,
      )?.compatibleAuthStrategies ??
      (Object.values(CORE_AUTHENTICATION_STRATEGY_TYPE) as string[]).concat(
        this.editorStore.pluginManager
          .getApplicationPlugins()
          .flatMap(
            (plugin) =>
              (
                plugin as STO_Relational_LegendStudioApplicationPlugin_Extension
              ).getExtraAuthenticationStrategyTypes?.() ?? [],
          ),
      )
    );
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
