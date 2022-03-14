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
import type { EditorStore } from '../../../EditorStore';
import {
  guaranteeType,
  uuid,
  UnsupportedOperationError,
} from '@finos/legend-shared';
import { ElementEditorState } from './../ElementEditorState';
import type { StoreRelational_LegendStudioPlugin_Extension } from '../../../StoreRelational_LegendStudioPlugin_Extension';
import { DatabaseBuilderState } from './DatabaseBuilderState';
import {
  type PackageableElement,
  type Connection,
  type ValidationIssue,
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
  EmbeddedH2DatasourceSpecification,
  LocalH2DatasourceSpecification,
  DatabricksDatasourceSpecification,
  SnowflakeDatasourceSpecification,
  BigQueryDatasourceSpecification,
  StaticDatasourceSpecification,
  RedshiftDatasourceSpecification,
  createValidationError,
} from '@finos/legend-graph';
import type { DSLMapping_LegendStudioPlugin_Extension } from '../../../DSLMapping_LegendStudioPlugin_Extension';

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
}

export enum CORE_DATASOURCE_SPEC_TYPE {
  STATIC = 'STATIC',
  H2_LOCAL = 'H2_LOCAL',
  H2_EMBEDDED = 'H2_EMBEDDED',
  DATABRICKS = 'DATABRICKS',
  SNOWFLAKE = 'SNOWFLAKE',
  REDSHIFT = 'REDSHIFT',
  BIGQUERY = 'BIGQUERY',
}

export enum CORE_AUTHENTICATION_STRATEGY_TYPE {
  DELEGATED_KERBEROS = 'DELEGATED_KERBEROS',
  H2_DEFAULT = 'H2_DEFAULT',
  SNOWFLAKE_PUBLIC = 'SNOWFLAKE_PUBLIC',
  GCP_APPLICATION_DEFAULT_CREDENTIALS = 'GCP_APPLICATION_DEFAULT_CREDENTIALS',
  API_TOKEN = 'API_TOKEN',
  OAUTH = 'OAUTH',
  USERNAME_PASSWORD = 'USERNAME_PASSWORD',
}

export class RelationalDatabaseConnectionValueState extends ConnectionValueState {
  override connection: RelationalDatabaseConnection;
  selectedTab = RELATIONAL_DATABASE_TAB_TYPE.GENERAL;
  databaseBuilderState: DatabaseBuilderState;

  constructor(
    editorStore: EditorStore,
    connection: RelationalDatabaseConnection,
  ) {
    super(editorStore, connection);
    makeObservable(this, {
      setSelectedTab: action,
      databaseBuilderState: observable,
      selectedTab: observable,
    });
    this.connection = connection;
    this.databaseBuilderState = new DatabaseBuilderState(
      editorStore,
      connection,
    );
  }

  get storeValidationResult(): ValidationIssue | undefined {
    return this.connection.store.value.isStub
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
    }
    const extraDatasourceSpecificationTypeGetters =
      this.editorStore.pluginManager
        .getStudioPlugins()
        .flatMap(
          (plugin) =>
            (
              plugin as StoreRelational_LegendStudioPlugin_Extension
            ).getExtraDatasourceSpecificationTypeGetters?.() ?? [],
        );
    for (const typeGetter of extraDatasourceSpecificationTypeGetters) {
      const type = typeGetter(spec);
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
    switch (type) {
      case CORE_DATASOURCE_SPEC_TYPE.STATIC: {
        this.connection.setDatasourceSpecification(
          new StaticDatasourceSpecification('', 80, ''),
        );
        return;
      }
      case CORE_DATASOURCE_SPEC_TYPE.H2_LOCAL: {
        this.connection.setDatasourceSpecification(
          new LocalH2DatasourceSpecification(),
        );
        return;
      }
      case CORE_DATASOURCE_SPEC_TYPE.H2_EMBEDDED: {
        this.connection.setDatasourceSpecification(
          new EmbeddedH2DatasourceSpecification('', '', false),
        );
        return;
      }
      case CORE_DATASOURCE_SPEC_TYPE.DATABRICKS: {
        this.connection.setDatasourceSpecification(
          new DatabricksDatasourceSpecification('', '', '', ''),
        );
        return;
      }
      case CORE_DATASOURCE_SPEC_TYPE.SNOWFLAKE: {
        this.connection.setDatasourceSpecification(
          new SnowflakeDatasourceSpecification('', '', '', ''),
        );
        return;
      }
      case CORE_DATASOURCE_SPEC_TYPE.REDSHIFT: {
        this.connection.setDatasourceSpecification(
          new RedshiftDatasourceSpecification('', '', 5439, '', '', ''),
        );
        return;
      }
      case CORE_DATASOURCE_SPEC_TYPE.BIGQUERY: {
        this.connection.setDatasourceSpecification(
          new BigQueryDatasourceSpecification('', ''),
        );
        return;
      }
      default: {
        const extraDatasourceSpecificationCreators =
          this.editorStore.pluginManager
            .getStudioPlugins()
            .flatMap(
              (plugin) =>
                (
                  plugin as StoreRelational_LegendStudioPlugin_Extension
                ).getExtraDatasourceSpecificationCreators?.() ?? [],
            );
        for (const creator of extraDatasourceSpecificationCreators) {
          const spec = creator(type);
          if (spec) {
            this.connection.setDatasourceSpecification(spec);
            return;
          }
        }
        throw new UnsupportedOperationError(
          `Can't create datasource specification of type '${type}': no compatible creator available from plugins`,
        );
      }
    }
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
    }

    const extraAuthenticationStrategyTypeGetters =
      this.editorStore.pluginManager
        .getStudioPlugins()
        .flatMap(
          (plugin) =>
            (
              plugin as StoreRelational_LegendStudioPlugin_Extension
            ).getExtraAuthenticationStrategyTypeGetters?.() ?? [],
        );
    for (const typeGetter of extraAuthenticationStrategyTypeGetters) {
      const type = typeGetter(auth);
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
    switch (type) {
      case CORE_AUTHENTICATION_STRATEGY_TYPE.DELEGATED_KERBEROS: {
        this.connection.setAuthenticationStrategy(
          new DelegatedKerberosAuthenticationStrategy(),
        );
        return;
      }
      case CORE_AUTHENTICATION_STRATEGY_TYPE.API_TOKEN: {
        this.connection.setAuthenticationStrategy(
          new ApiTokenAuthenticationStrategy(''),
        );
        return;
      }
      case CORE_AUTHENTICATION_STRATEGY_TYPE.SNOWFLAKE_PUBLIC: {
        this.connection.setAuthenticationStrategy(
          new SnowflakePublicAuthenticationStrategy('', '', ''),
        );
        return;
      }
      case CORE_AUTHENTICATION_STRATEGY_TYPE.GCP_APPLICATION_DEFAULT_CREDENTIALS: {
        this.connection.setAuthenticationStrategy(
          new GCPApplicationDefaultCredentialsAuthenticationStrategy(),
        );
        return;
      }
      case CORE_AUTHENTICATION_STRATEGY_TYPE.H2_DEFAULT: {
        this.connection.setAuthenticationStrategy(
          new DefaultH2AuthenticationStrategy(),
        );
        return;
      }
      case CORE_AUTHENTICATION_STRATEGY_TYPE.USERNAME_PASSWORD: {
        this.connection.setAuthenticationStrategy(
          new UsernamePasswordAuthenticationStrategy('', ''),
        );
        return;
      }
      case CORE_AUTHENTICATION_STRATEGY_TYPE.OAUTH:
        this.connection.setAuthenticationStrategy(
          new OAuthAuthenticationStrategy('', ''),
        );
        return;
      default: {
        const extraAuthenticationStrategyCreators =
          this.editorStore.pluginManager
            .getStudioPlugins()
            .flatMap(
              (plugin) =>
                (
                  plugin as StoreRelational_LegendStudioPlugin_Extension
                ).getExtraAuthenticationStrategyCreators?.() ?? [],
            );
        for (const creator of extraAuthenticationStrategyCreators) {
          const auth = creator(type);
          if (auth) {
            this.connection.setAuthenticationStrategy(auth);
            return;
          }
        }
        throw new UnsupportedOperationError(
          `Can't create authentication strategy of type '${type}': no compatible creator available from plugins`,
        );
      }
    }
  }
}

export class JsonModelConnectionValueState extends ConnectionValueState {
  override connection: JsonModelConnection;

  constructor(editorStore: EditorStore, connection: JsonModelConnection) {
    super(editorStore, connection);
    this.connection = connection;
  }

  label(): string {
    return 'Pure model connection';
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
  uuid = uuid(); // NOTE: used to force component remount on state change
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
          .getStudioPlugins()
          .flatMap(
            (plugin) =>
              (
                plugin as DSLMapping_LegendStudioPlugin_Extension
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
