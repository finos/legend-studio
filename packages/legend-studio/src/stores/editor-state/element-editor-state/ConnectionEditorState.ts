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
import type { EditorStore } from '../../EditorStore';
import {
  addUniqueEntry,
  deleteEntry,
  assertNonEmptyString,
  guaranteeType,
  uuid,
  UnsupportedOperationError,
  getClass,
} from '@finos/legend-studio-shared';
import { ElementEditorState } from './ElementEditorState';
import type { CompilationError } from '../../../models/metamodels/pure/action/EngineError';
import type { PackageableElement } from '../../../models/metamodels/pure/model/packageableElements/PackageableElement';
import { PackageableConnection } from '../../../models/metamodels/pure/model/packageableElements/connection/PackageableConnection';
import type { Connection } from '../../../models/metamodels/pure/model/packageableElements/connection/Connection';
import { JsonModelConnection } from '../../../models/metamodels/pure/model/packageableElements/store/modelToModel/connection/JsonModelConnection';
import { FlatDataConnection } from '../../../models/metamodels/pure/model/packageableElements/store/flatData/connection/FlatDataConnection';
import { RelationalDatabaseConnection } from '../../../models/metamodels/pure/model/packageableElements/store/relational/connection/RelationalDatabaseConnection';
import {
  DefaultH2AuthenticationStrategy,
  DelegatedKerberosAuthenticationStrategy,
  OAuthAuthenticationStrategy,
  SnowflakePublicAuthenticationStrategy,
  TestDatabaseAuthenticationStrategy,
} from '../../../models/metamodels/pure/model/packageableElements/store/relational/connection/AuthenticationStrategy';
import {
  EmbeddedH2DatasourceSpecification,
  LocalH2DatasourceSpecification,
  SnowflakeDatasourceSpecification,
  StaticDatasourceSpecification,
} from '../../../models/metamodels/pure/model/packageableElements/store/relational/connection/DatasourceSpecification';
import {
  GenerateStoreInput,
  StorePattern,
} from '../../../models/metamodels/pure/action/generation/GenerateStoreInput';
import { CORE_LOG_EVENT } from '../../../utils/Logger';
import type { Store } from '../../../models/metamodels/pure/model/packageableElements/store/Store';
import { resolvePackageNameAndElementName } from '../../../models/MetaModelUtility';
import type { ValidationIssue } from '../../../models/metamodels/pure/action/validator/ValidationResult';
import { createValidationError } from '../../../models/metamodels/pure/action/validator/ValidationResult';
import type { StoreRelational_EditorPlugin_Extension } from '../../StoreRelational_EditorPlugin_Extension';

export abstract class ConnectionValueState {
  editorStore: EditorStore;
  connection: Connection;

  constructor(editorStore: EditorStore, connection: Connection) {
    this.editorStore = editorStore;
    this.connection = connection;
  }

  abstract label(): string;
}

export enum RELATIONAL_DATABASE_TABE {
  GENERAL = 'GENERAL',
  STORE = 'STORE',
}

export enum CORE_DATASOURCE_SPEC_TYPE {
  STATIC = 'STATIC',
  H2_LOCAL = 'H2_LOCAL',
  H2_EMBEDDED = 'H2_EMBEDDED',
  SNOWFLAKE = 'SNOWFLAKE',
}

export enum CORE_AUTHENTICATION_STRATEGY_TYPE {
  DELEGATED_KERBEROS = 'DELEGATED_KERBEROS',
  H2_DEFAULT = 'H2_DEFAULT',
  SNOWFLAKE_PUBLIC = 'SNOWFLAKE_PUBLIC',
  TEST = 'TEST',
  OAUTH = 'OAUTH',
}

export class GenerateStoreState {
  editorStore: EditorStore;
  connection: RelationalDatabaseConnection;
  modal = false;
  storeGrammar = '';
  isGeneratingStore = false;
  isSavingStore = false;
  targetStorePath = '';
  patterns: StorePattern[];

  constructor(
    editorStore: EditorStore,
    connection: RelationalDatabaseConnection,
  ) {
    makeObservable(this, {
      modal: observable,
      targetStorePath: observable,
      setTargetStorePath: action,
      setModal: action,
      setStoreGrammar: action,
      addPattern: action,
      deletePattern: action,
      isGeneratingStore: observable,
      storeGrammar: observable,
      isSavingStore: observable,
      patterns: observable,
    });

    this.connection = connection;
    this.editorStore = editorStore;
    const initStorePattern = new StorePattern();
    initStorePattern.schemaPattern = 'SchemaName';
    initStorePattern.tablePattern = 'TableName';
    this.patterns = [initStorePattern];
  }

  setModal(val: boolean): void {
    this.modal = val;
  }

  setStoreGrammar(val: string): void {
    this.storeGrammar = val;
  }

  setTargetStorePath(val: string): void {
    this.targetStorePath = val;
  }

  addPattern(pattern: StorePattern): void {
    addUniqueEntry(this.patterns, pattern);
  }
  deletePattern(pattern: StorePattern): void {
    deleteEntry(this.patterns, pattern);
  }

  generateStore = flow(function* (this: GenerateStoreState) {
    try {
      const [packageName, storeName] = resolvePackageNameAndElementName(
        this.targetStorePath,
        this.targetStorePath,
      );

      this.isGeneratingStore = true;
      assertNonEmptyString(
        packageName,
        'Target package required to generate store',
      );
      assertNonEmptyString(storeName, 'Target name required to generate store');
      // default generate store input
      const generateStoreInput = new GenerateStoreInput(this.connection);
      generateStoreInput.targetPackage = packageName;
      generateStoreInput.targetName = storeName;
      generateStoreInput.enrichTables = true;
      generateStoreInput.enrichPrimaryKeys = true;
      generateStoreInput.enrichColumns = true;
      generateStoreInput.patterns = this.patterns;
      const storeGrammar =
        (yield this.editorStore.graphState.graphManager.generateStore(
          generateStoreInput,
        )) as unknown as string;
      this.setStoreGrammar(storeGrammar);
    } catch (error: unknown) {
      this.editorStore.applicationStore.logger.error(
        CORE_LOG_EVENT.SERVICE_REGISTRATION_PROBLEM,
        error,
      );
      this.editorStore.applicationStore.notifyError(error, undefined, 3000);
    } finally {
      this.isGeneratingStore = false;
    }
  });

  saveStore = flow(function* (this: GenerateStoreState) {
    try {
      this.isSavingStore = true;
      assertNonEmptyString(this.storeGrammar, 'Store Grammar cannot be empty');
      const store = (yield this.editorStore.graphState.graphManager.saveStore(
        this.storeGrammar,
        this.editorStore.graphState.graph,
      )) as unknown as Store;
      this.editorStore.applicationStore.notifySuccess(
        `Store ${store.path} saved`,
      );
      // reset
      this.setModal(false);
      this.editorStore.openElement(store);
    } catch (error: unknown) {
      this.editorStore.applicationStore.logger.error(
        CORE_LOG_EVENT.SERVICE_REGISTRATION_PROBLEM,
        error,
      );
      this.editorStore.applicationStore.notifyError(error, undefined, 3000);
    } finally {
      this.isSavingStore = false;
    }
  });
}

export class RelationalDatabaseConnectionValueState extends ConnectionValueState {
  connection: RelationalDatabaseConnection;
  selectedTab = RELATIONAL_DATABASE_TABE.GENERAL;
  generateStoreState: GenerateStoreState;

  constructor(
    editorStore: EditorStore,
    connection: RelationalDatabaseConnection,
  ) {
    super(editorStore, connection);
    makeObservable(this, {
      setSelectedTab: action,
      generateStoreState: observable,
      selectedTab: observable,
    });
    this.connection = connection;
    this.generateStoreState = new GenerateStoreState(editorStore, connection);
  }

  get storeValidationResult(): ValidationIssue | undefined {
    return this.connection.store.value.isStub
      ? createValidationError(['Connection database cannot be empty'])
      : undefined;
  }

  setSelectedTab(val: RELATIONAL_DATABASE_TABE): void {
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
    } else if (spec instanceof SnowflakeDatasourceSpecification) {
      return CORE_DATASOURCE_SPEC_TYPE.SNOWFLAKE;
    } else if (spec instanceof LocalH2DatasourceSpecification) {
      return CORE_DATASOURCE_SPEC_TYPE.H2_LOCAL;
    }
    const extraDatasourceSpecificationTypeGetters =
      this.editorStore.applicationStore.pluginManager
        .getEditorPlugins()
        .flatMap(
          (plugin) =>
            (
              plugin as StoreRelational_EditorPlugin_Extension
            ).getExtraDatasourceSpecificationTypeGetters?.() ?? [],
        );
    for (const typeGetter of extraDatasourceSpecificationTypeGetters) {
      const type = typeGetter(spec);
      if (type) {
        return type;
      }
    }
    throw new UnsupportedOperationError(
      `Can't get type label for datasource specification of type '${
        getClass(spec).name
      }'. No compatible getter available from plugins.`,
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
      case CORE_DATASOURCE_SPEC_TYPE.SNOWFLAKE: {
        this.connection.setDatasourceSpecification(
          new SnowflakeDatasourceSpecification('', '', '', ''),
        );
        return;
      }
      default: {
        const extraDatasourceSpecificationCreators =
          this.editorStore.applicationStore.pluginManager
            .getEditorPlugins()
            .flatMap(
              (plugin) =>
                (
                  plugin as StoreRelational_EditorPlugin_Extension
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
          `Can't create datasource specification of type '${type}'. No compatible creator available from plugins.`,
        );
      }
    }
  }
  get selectedAuth(): string {
    const auth = this.connection.authenticationStrategy;
    if (auth instanceof DelegatedKerberosAuthenticationStrategy) {
      return CORE_AUTHENTICATION_STRATEGY_TYPE.DELEGATED_KERBEROS;
    } else if (auth instanceof TestDatabaseAuthenticationStrategy) {
      return CORE_AUTHENTICATION_STRATEGY_TYPE.TEST;
    } else if (auth instanceof DefaultH2AuthenticationStrategy) {
      return CORE_AUTHENTICATION_STRATEGY_TYPE.H2_DEFAULT;
    } else if (auth instanceof OAuthAuthenticationStrategy) {
      return CORE_AUTHENTICATION_STRATEGY_TYPE.OAUTH;
    } else if (auth instanceof SnowflakePublicAuthenticationStrategy) {
      return CORE_AUTHENTICATION_STRATEGY_TYPE.SNOWFLAKE_PUBLIC;
    }
    const extraAuthenticationStrategyTypeGetters =
      this.editorStore.applicationStore.pluginManager
        .getEditorPlugins()
        .flatMap(
          (plugin) =>
            (
              plugin as StoreRelational_EditorPlugin_Extension
            ).getExtraAuthenticationStrategyTypeGetters?.() ?? [],
        );
    for (const typeGetter of extraAuthenticationStrategyTypeGetters) {
      const type = typeGetter(auth);
      if (type) {
        return type;
      }
    }
    throw new UnsupportedOperationError(
      `Can't get type label for authentication strategy of type '${
        getClass(auth).name
      }'. No compatible getter available from plugins.`,
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
      case CORE_AUTHENTICATION_STRATEGY_TYPE.SNOWFLAKE_PUBLIC: {
        this.connection.setAuthenticationStrategy(
          new SnowflakePublicAuthenticationStrategy('', '', ''),
        );
        return;
      }
      case CORE_AUTHENTICATION_STRATEGY_TYPE.H2_DEFAULT: {
        this.connection.setAuthenticationStrategy(
          new DefaultH2AuthenticationStrategy(),
        );
        return;
      }
      case CORE_AUTHENTICATION_STRATEGY_TYPE.TEST: {
        this.connection.setAuthenticationStrategy(
          new TestDatabaseAuthenticationStrategy(),
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
          this.editorStore.applicationStore.pluginManager
            .getEditorPlugins()
            .flatMap(
              (plugin) =>
                (
                  plugin as StoreRelational_EditorPlugin_Extension
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
          `Can't create authentication strategy of type '${type}'. No compatible creator available from plugins.`,
        );
      }
    }
  }
}

export class JsonModelConnectionValueState extends ConnectionValueState {
  connection: JsonModelConnection;
  disableChangingClass?: boolean;

  constructor(editorStore: EditorStore, connection: JsonModelConnection) {
    super(editorStore, connection);
    this.connection = connection;
  }

  label(): string {
    return 'Pure model connection';
  }
}

export class FlatDataConnectionValueState extends ConnectionValueState {
  connection: FlatDataConnection;
  disableChangingClass?: boolean;

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

  revealCompilationError(compilationError: CompilationError): boolean {
    return false;
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
