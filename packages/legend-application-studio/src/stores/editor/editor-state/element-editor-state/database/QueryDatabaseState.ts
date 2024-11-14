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
  DEFAULT_GENERATION_PACKAGE,
  EngineRuntime,
  Database,
  RelationalDatabaseConnection,
  PackageableElementExplicitReference,
  StoreConnections,
  IdentifiedConnection,
  GraphManagerState,
  getMappingCompatibleClasses,
} from '@finos/legend-graph';
import type { EditorStore } from '../../../EditorStore.js';
import {
  ActionState,
  assertErrorThrown,
  guaranteeNonNullable,
  type GeneratorFn,
  assertTrue,
} from '@finos/legend-shared';
import { action, flow, flowResult, makeObservable, observable } from 'mobx';
import type { Entity } from '@finos/legend-storage';
import {
  QueryBuilderAdvancedWorkflowState,
  QueryBuilderConfig,
  QueryBuilderState,
} from '@finos/legend-query-builder';
import {
  DEFAULT_TAB_SIZE,
  type GenericLegendApplicationStore,
} from '@finos/legend-application';
import { payloadDebugger } from '../../../panel-group/DevToolPanelState.js';
import { renderDatabaseQueryBuilderSetupPanelContent } from '../../../../../components/editor/editor-group/database/IsolatedQueryDatabase.js';

const replaceConnectionInEngineRuntime = (
  engineRuntime: EngineRuntime,
  connection: RelationalDatabaseConnection,
  databse: Database,
): void => {
  const _storeConnection = new StoreConnections(
    PackageableElementExplicitReference.create(databse),
  );
  const newconnection = new RelationalDatabaseConnection(
    PackageableElementExplicitReference.create(databse),
    connection.type,
    connection.datasourceSpecification,
    connection.authenticationStrategy,
  );
  newconnection.localMode = connection.localMode;
  newconnection.timeZone = connection.timeZone;
  _storeConnection.storeConnections = [
    new IdentifiedConnection('connection1', newconnection),
  ];
  engineRuntime.connections = [_storeConnection];
};
export class IsolatedDatabaseBuilderState extends QueryBuilderState {
  readonly database: Database;
  globalGraphManagerState: GraphManagerState;
  engineRuntime: EngineRuntime;
  connectionKey: string;
  compatibleConnections: Map<string, RelationalDatabaseConnection>;

  override TEMPORARY__setupPanelContentRenderer = (): React.ReactNode =>
    renderDatabaseQueryBuilderSetupPanelContent(this);

  constructor(
    applicationStore: GenericLegendApplicationStore,
    isolatedGraphManagerState: GraphManagerState,
    globalGraphManagerState: GraphManagerState,
    database: Database,
    connectionKey: string,
    runtime: EngineRuntime,
    compatibleConnections: Map<string, RelationalDatabaseConnection>,
    acceptedElementPaths?: string[],
    config?: QueryBuilderConfig | undefined,
  ) {
    super(
      applicationStore,
      isolatedGraphManagerState,
      QueryBuilderAdvancedWorkflowState.INSTANCE,
      config,
    );
    makeObservable(this, {
      connectionKey: observable,
      engineRuntime: observable,
      changeConnection: action,
    });
    this.database = database;
    this.globalGraphManagerState = globalGraphManagerState;
    this.engineRuntime = runtime;
    this.compatibleConnections = compatibleConnections;
    this.connectionKey = connectionKey;
    const classes = isolatedGraphManagerState.usableClasses;
    const electedMapping = guaranteeNonNullable(
      isolatedGraphManagerState.graph.mappings.filter((m) =>
        acceptedElementPaths ? acceptedElementPaths.includes(m.path) : true,
      )[0],
      'Compatible mapping expected',
    );

    this.class = guaranteeNonNullable(
      getMappingCompatibleClasses(electedMapping, classes)[0],
      'Compatible class expected for mapping',
    );

    this.executionContextState.mapping = electedMapping;
    this.executionContextState.runtimeValue = runtime;
  }

  changeConnection(key: string): void {
    const connection = this.compatibleConnections.get(key);
    if (connection) {
      replaceConnectionInEngineRuntime(
        this.engineRuntime,
        connection,
        this.database,
      );
      this.connectionKey = key;
    }
  }
}

export class QueryDatabaseState {
  editorStore: EditorStore;
  database: Database;

  constructor(database: Database, editorStore: EditorStore) {
    this.database = database;
    this.editorStore = editorStore;

    makeObservable(this, {
      init: flow,
    });
  }
  *init(): GeneratorFn<void> {
    try {
      const compConnections = new Map<string, RelationalDatabaseConnection>();
      this.editorStore.graphManagerState.usableConnections.forEach((conn) => {
        const val = conn.connectionValue;
        if (val instanceof RelationalDatabaseConnection) {
          compConnections.set(conn.path, val);
        }
      });
      assertTrue(
        compConnections.size > 0,
        `No compatible connections found for database ${this.database.path}`,
      );
      const embeddedQueryBuilderState =
        this.editorStore.embeddedQueryBuilderState;
      const databaseGraphManagerState = new GraphManagerState(
        this.editorStore.applicationStore.pluginManager,
        this.editorStore.applicationStore.logService,
      );
      yield databaseGraphManagerState.graphManager.initialize(
        {
          env: this.editorStore.applicationStore.config.env,
          tabSize: DEFAULT_TAB_SIZE,
          clientConfig: {
            baseUrl: this.editorStore.applicationStore.config.engineServerUrl,
            queryBaseUrl:
              this.editorStore.applicationStore.config.engineQueryServerUrl,
            enableCompression: true,
            payloadDebugger,
          },
        },
        {
          tracerService: this.editorStore.applicationStore.tracerService,
        },
      );
      databaseGraphManagerState.graph =
        this.editorStore.graphManagerState.createNewGraph();
      const copiedDb = new Database(this.database.name);
      databaseGraphManagerState.graph.addElement(
        copiedDb,
        guaranteeNonNullable(this.database.package?.path),
      );
      copiedDb.schemas = this.database.schemas;
      copiedDb.joins = this.database.joins;
      copiedDb.filters = this.database.filters;
      const entities =
        (yield this.editorStore.graphManagerState.graphManager.generateModelsFromDatabaseSpecification(
          this.database.path,
          DEFAULT_GENERATION_PACKAGE,
          this.editorStore.graphManagerState.graph,
        )) as Entity[];
      yield this.editorStore.graphManagerState.graphManager.buildGraph(
        databaseGraphManagerState.graph,
        entities,
        ActionState.create(),
      );
      const engineRuntime = new EngineRuntime();
      engineRuntime.mappings = databaseGraphManagerState.graph.mappings.map(
        (e) => PackageableElementExplicitReference.create(e),
      );
      const connectionEntry = guaranteeNonNullable(
        Array.from(compConnections.entries())[0],
      );
      const connection = connectionEntry[1];
      replaceConnectionInEngineRuntime(engineRuntime, connection, copiedDb);
      const config = new QueryBuilderConfig();
      const queryBuilderState = new IsolatedDatabaseBuilderState(
        this.editorStore.applicationStore,
        databaseGraphManagerState,
        this.editorStore.graphManagerState,
        copiedDb,
        connectionEntry[0],
        engineRuntime,
        compConnections,
        entities.map((e) => e.path),
        config,
      );
      yield flowResult(
        embeddedQueryBuilderState.setEmbeddedQueryBuilderConfiguration({
          setupQueryBuilderState: async () => queryBuilderState,
          actionConfigs: [],
        }),
      );
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.notificationService.notifyError(
        `Unable to query database: ${error.message}`,
      );
    }
  }
}
