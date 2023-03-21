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
import type { EditorStore } from '../../../editor/EditorStore.js';
import {
  guaranteeType,
  uuid,
  UnsupportedOperationError,
} from '@finos/legend-shared';
import { ElementEditorState } from './../ElementEditorState.js';
import type { STO_Relational_LegendStudioApplicationPlugin_Extension } from '../../../extensions/STO_Relational_LegendStudioApplicationPlugin_Extension.js';
import { DatabaseBuilderState } from './DatabaseBuilderState.js';
import {
  type PackageableElement,
  type Connection,
  type ValidationIssue,
  type AuthenticationStrategy,
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
  EmbeddedH2DatasourceSpecification,
  LocalH2DatasourceSpecification,
  DatabricksDatasourceSpecification,
  SnowflakeDatasourceSpecification,
  BigQueryDatasourceSpecification,
  StaticDatasourceSpecification,
  RedshiftDatasourceSpecification,
  SpannerDatasourceSpecification,
  createValidationError,
  isStubbed_PackageableElement,
  type PostProcessor,
  MapperPostProcessor,
} from '@finos/legend-graph';
import type { DSL_Mapping_LegendStudioApplicationPlugin_Extension } from '../../../extensions/DSL_Mapping_LegendStudioApplicationPlugin_Extension.js';
import {
  relationDbConnection_setNewAuthenticationStrategy,
  relationDbConnection_setDatasourceSpecification,
} from '../../../shared/modifier/STO_Relational_GraphModifierHelper.js';
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
  GENERAL = 'GENERAL',
  STORE = 'STORE',
  POST_PROCESSORS = 'POST-PROCESSORS',
}

export enum CORE_DATASOURCE_SPEC_TYPE {
  STATIC = 'STATIC',
  H2_LOCAL = 'H2_LOCAL',
  H2_EMBEDDED = 'H2_EMBEDDED',
  DATABRICKS = 'DATABRICKS',
  SNOWFLAKE = 'SNOWFLAKE',
  REDSHIFT = 'REDSHIFT',
  BIGQUERY = 'BIGQUERY',
  SPANNER = 'SPANNER',
}

export enum POST_PROCESSOR_TYPE {
  MAPPER = 'MAPPER',
}

export enum CORE_AUTHENTICATION_STRATEGY_TYPE {
  DELEGATED_KERBEROS = 'DELEGATED_KERBEROS',
  H2_DEFAULT = 'H2_DEFAULT',
  SNOWFLAKE_PUBLIC = 'SNOWFLAKE_PUBLIC',
  GCP_APPLICATION_DEFAULT_CREDENTIALS = 'GCP_APPLICATION_DEFAULT_CREDENTIALS',
  API_TOKEN = 'API_TOKEN',
  OAUTH = 'OAUTH',
  USERNAME_PASSWORD = 'USERNAME_PASSWORD',
  GCP_WORKLOAD_IDENTITY_FEDERATION = 'GCP_WORKLOAD_IDENTITY_FEDERATION',
  MIDDLE_TIER_USERNAME_PASSWORD = 'MIDDLE_TIER_USERNAME_PASSWORD',
}

export class RelationalDatabaseConnectionValueState extends ConnectionValueState {
  override connection: RelationalDatabaseConnection;
  selectedTab = RELATIONAL_DATABASE_TAB_TYPE.GENERAL;
  databaseBuilderState: DatabaseBuilderState;
  postProcessorState: PostProcessorEditorState | undefined;

  constructor(
    editorStore: EditorStore,
    connection: RelationalDatabaseConnection,
  ) {
    super(editorStore, connection);
    makeObservable(this, {
      databaseBuilderState: observable,
      selectedTab: observable,
      postProcessorState: observable,
      setSelectedTab: action,
      selectPostProcessor: action,
    });

    this.connection = connection;

    this.databaseBuilderState = new DatabaseBuilderState(
      editorStore,
      connection,
    );
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

  label(): string {
    return `${this.connection.type} connection`;
  }

  get selectedDatasourceSpec(): string {
    const spec = this.connection.datasourceSpecification;
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
    throw new UnsupportedOperationError(
      `Can't classify datasource specification: no compatible classifer available from plugins`,
      spec,
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
  }
  get selectedAuth(): string {
    const auth = this.connection.authenticationStrategy;
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
    throw new UnsupportedOperationError(
      `Can't classify authentication strategy: no compatible classifier available from plugins`,
      auth,
    );
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
