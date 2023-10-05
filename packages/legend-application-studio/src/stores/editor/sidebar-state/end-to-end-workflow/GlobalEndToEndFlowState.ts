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

import { action, flow, flowResult, makeObservable, observable } from 'mobx';
import type { EditorStore } from '../../EditorStore.js';
import { QueryConnectionEndToEndWorkflowEditorState } from '../../editor-state/end-to-end-workflow-state/EndToEndWorkflowEditorState.js';
import { RelationalDatabaseConnectionValueState } from '../../editor-state/element-editor-state/connection/ConnectionEditorState.js';
import {
  RelationalDatabaseConnection,
  LocalH2DatasourceSpecification,
  PackageableElementExplicitReference,
  stub_Database,
  DatabaseType,
  DefaultH2AuthenticationStrategy,
  type TextCompilationResult,
  Database,
  type PureModel,
  PackageableConnection,
  EngineRuntime,
  IdentifiedConnection,
  generateIdentifiedConnectionId,
  PackageableRuntime,
  extractElementNameFromPath,
  getOrCreatePackage,
  extractPackagePathFromPath,
} from '@finos/legend-graph';
import { DEFAULT_H2_SQL } from '../../NewElementState.js';
import {
  guaranteeNonNullable,
  type GeneratorFn,
  LogEvent,
  assertErrorThrown,
  ActionState,
  getNonNullableEntry,
} from '@finos/legend-shared';
import { DatabaseBuilderWizardState } from '../../editor-state/element-editor-state/connection/DatabaseBuilderWizardState.js';
import { LEGEND_STUDIO_APP_EVENT } from '../../../../__lib__/LegendStudioEvent.js';
import { DatabaseModelBuilderState } from '../../editor-state/element-editor-state/connection/DatabaseModelBuilderState.js';
import { EntityChangeType, type EntityChange } from '@finos/legend-server-sdlc';
import type { Entity } from '@finos/legend-storage';
import { queryClass } from '../../../../components/editor/editor-group/uml-editor/ClassQueryBuilder.js';
import {
  packageableConnection_setConnectionValue,
  runtime_addIdentifiedConnection,
  runtime_addMapping,
  runtime_setMappings,
} from '../../../graph-modifier/DSL_Mapping_GraphModifierHelper.js';
import { DEFAULT_DATABASE_PATH } from '../../editor-state/element-editor-state/connection/DatabaseBuilderState.js';

export enum SupportedEndToEndWorkflow {
  CREATE_QUERY_FROM_CONNECTION = 'Create Query From Connection',
}

const DEFAULT_CONNECTION_PATH = 'store::MyConnection';
const DEFAULT_RUNTIME_PATH = 'store::MyRuntime';

export class QueryConnectionEndToEndWorkflowState {
  activeStep: number;
  globalEndToEndWorkflowState: GlobalEndToEndWorkflowState;
  queryConnectionEndToEndWorkflowEditorState: QueryConnectionEndToEndWorkflowEditorState;
  connectionValueState: RelationalDatabaseConnectionValueState; // build connection
  packageableConnection: PackageableConnection | undefined;
  packageableRuntime: PackageableRuntime | undefined;
  databaseBuilderState: DatabaseBuilderWizardState | undefined; // build database
  databaseModelBuilderState: DatabaseModelBuilderState | undefined; // build models from database
  databaseGrammarCode = '';
  runtimeGrammarCode = '';
  connectionGrammarCode = '';
  finalGrammarCode = '';
  targetConnectionPath = DEFAULT_CONNECTION_PATH;
  targetDatabasePath = DEFAULT_DATABASE_PATH;
  targetRuntimePath = DEFAULT_RUNTIME_PATH;
  database: Database;
  graph: PureModel;
  isGeneratingDatabaseGrammarCode = ActionState.create();
  isValid: boolean;
  modelEntities: Entity[] = [];

  constructor(globalEndToEndWorkflowState: GlobalEndToEndWorkflowState) {
    makeObservable(this, {
      globalEndToEndWorkflowState: false,
      activeStep: observable,
      database: observable,
      targetConnectionPath: observable,
      packageableRuntime: observable,
      targetDatabasePath: observable,
      databaseGrammarCode: observable,
      runtimeGrammarCode: observable,
      connectionGrammarCode: observable,
      finalGrammarCode: observable,
      isValid: observable,
      modelEntities: observable,
      queryConnectionEndToEndWorkflowEditorState: observable,
      connectionValueState: observable,
      databaseBuilderState: observable,
      packageableConnection: observable,
      databaseModelBuilderState: observable,
      isGeneratingDatabaseGrammarCode: observable,
      setTargetConnectionPath: action,
      setDatabaseGrammarCode: action,
      setRuntimeGrammarCode: action,
      setModelEntities: action,
      setTargetRuntimePath: action,
      setFinalGrammarCode: action,
      buildDatabaseBuilderWizardState: action,
      buildModelsFromDatabase: action,
      reset: action,
      generateDatabaseGrammarCode: flow,
      updateGraphWithModels: flow,
      updateDatabase: flow,
      updateRuntime: flow,
      query: flow,
      compileDatabaseGrammarCode: flow,
      compile: flow,
    });
    this.activeStep = 0;
    this.isValid = true;
    this.globalEndToEndWorkflowState = globalEndToEndWorkflowState;
    this.queryConnectionEndToEndWorkflowEditorState =
      new QueryConnectionEndToEndWorkflowEditorState(
        this.globalEndToEndWorkflowState.editorStore,
      );
    this.connectionValueState = new RelationalDatabaseConnectionValueState(
      this.globalEndToEndWorkflowState.editorStore,
      this.createConnection(),
    );
    this.database = new Database(this.targetDatabasePath);
    this.databaseModelBuilderState = new DatabaseModelBuilderState(
      this.globalEndToEndWorkflowState.editorStore,
      guaranteeNonNullable(this.database),
      false,
    );
    this.graph =
      this.globalEndToEndWorkflowState.editorStore.graphManagerState.createNewGraph();
  }

  setTargetConnectionPath(val: string): void {
    this.targetConnectionPath = val;
  }

  setModelEntities(val: Entity[]): void {
    this.modelEntities = val;
  }

  setTargetRuntimePath(val: string): void {
    this.targetRuntimePath = val;
  }

  setRuntimeGrammarCode(val: string): void {
    this.runtimeGrammarCode = val;
  }

  setFinalGrammarCode(val: string): void {
    this.finalGrammarCode = val;
  }

  buildDatabaseBuilderWizardState(): void {
    this.databaseBuilderState = new DatabaseBuilderWizardState(
      this.globalEndToEndWorkflowState.editorStore,
      this.connectionValueState.connection,
      false,
    );
    this.targetDatabasePath =
      this.databaseBuilderState.schemaExplorerState.targetDatabasePath;
    this.database = this.databaseBuilderState.schemaExplorerState.database;
  }

  *updateDatabase(): GeneratorFn<void> {
    if (
      !guaranteeNonNullable(this.databaseBuilderState).schemaExplorerState
        .treeData
    ) {
      return;
    }
    yield flowResult(
      guaranteeNonNullable(
        this.databaseBuilderState,
      ).schemaExplorerState.updateDatabase(),
    );
  }

  buildModelsFromDatabase(): void {
    this.databaseModelBuilderState = new DatabaseModelBuilderState(
      this.globalEndToEndWorkflowState.editorStore,
      guaranteeNonNullable(this.database),
      false,
    );
    this.databaseModelBuilderState.graph = this.graph;
  }

  setActiveStep(step: number): void {
    this.activeStep = step;
  }

  setDatabaseGrammarCode(code: string): void {
    this.databaseGrammarCode = code;
  }

  *generateDatabaseGrammarCode(): GeneratorFn<void> {
    try {
      this.isGeneratingDatabaseGrammarCode.inProgress();
      if (
        this.databaseBuilderState?.databaseGrammarCode &&
        this.databaseBuilderState.databaseGrammarCode !== ''
      ) {
        this.setDatabaseGrammarCode(
          this.databaseBuilderState.databaseGrammarCode,
        );
      } else {
        this.setDatabaseGrammarCode(
          (yield this.globalEndToEndWorkflowState.editorStore.graphManagerState.graphManager.entitiesToPureCode(
            [
              this.globalEndToEndWorkflowState.editorStore.graphManagerState.graphManager.elementToEntity(
                guaranteeNonNullable(this.database),
              ),
            ],
            { pretty: true },
          )) as string,
        );
      }
      this.isGeneratingDatabaseGrammarCode.pass();
    } catch (error) {
      assertErrorThrown(error);
      this.globalEndToEndWorkflowState.editorStore.applicationStore.logService.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.DATABASE_MODEL_BUILDER_FAILURE),
        error,
      );
      this.globalEndToEndWorkflowState.editorStore.applicationStore.notificationService.notifyError(
        error,
      );
      this.isGeneratingDatabaseGrammarCode.fail();
    }
  }

  *compileDatabaseGrammarCode(): GeneratorFn<void> {
    try {
      const compilationResult = (yield flowResult(
        yield this.globalEndToEndWorkflowState.editorStore.graphManagerState.graphManager.compileText(
          this.databaseGrammarCode,
          this.graph,
          {
            onError: () =>
              this.globalEndToEndWorkflowState.editorStore.applicationStore.alertService.setBlockingAlert(
                undefined,
              ),
          },
        ),
      )) as TextCompilationResult;
      this.globalEndToEndWorkflowState.editorStore.applicationStore.notificationService.notifySuccess(
        'Compiled successfully',
      );

      const entities = compilationResult.entities;
      const newGraph =
        this.globalEndToEndWorkflowState.editorStore.graphManagerState.createNewGraph();
      yield flowResult(
        this.globalEndToEndWorkflowState.editorStore.graphManagerState.graphManager.buildGraph(
          newGraph,
          entities,
          ActionState.create(),
        ),
      );
      if (newGraph.databases.length > 1) {
        this.isValid = false;
        this.globalEndToEndWorkflowState.editorStore.applicationStore.notificationService.notifyError(
          'Only allow one database',
        );
      } else {
        this.isValid = true;
      }
      this.database = getNonNullableEntry(newGraph.databases, 0);
      this.databaseModelBuilderState!.setDatabase(this.database);
      this.databaseModelBuilderState!.graph = newGraph;
      this.graph = newGraph;
      const packageableConnection = new PackageableConnection(
        extractElementNameFromPath(this.targetConnectionPath),
      );
      this.connectionValueState.connection.store =
        PackageableElementExplicitReference.create(
          guaranteeNonNullable(this.database),
        );
      packageableConnection.package = getOrCreatePackage(
        this.graph.root,
        this.targetConnectionPath,
        true,
        new Map(),
      );
      packageableConnection_setConnectionValue(
        packageableConnection,
        this.connectionValueState.connection,
        this.globalEndToEndWorkflowState.editorStore.changeDetectionState
          .observerContext,
      );
      // default to model store
      this.packageableConnection = packageableConnection;
      this.graph.addElement(
        packageableConnection,
        extractPackagePathFromPath(this.targetConnectionPath),
      );
    } catch (error) {
      assertErrorThrown(error);
      this.globalEndToEndWorkflowState.editorStore.applicationStore.logService.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.DATABASE_MODEL_BUILDER_FAILURE),
        error,
      );
      this.globalEndToEndWorkflowState.editorStore.applicationStore.notificationService.notifyError(
        error,
      );
    }
  }

  *compile(): GeneratorFn<void> {
    try {
      const compilationResult = (yield flowResult(
        yield this.globalEndToEndWorkflowState.editorStore.graphManagerState.graphManager.compileText(
          this.finalGrammarCode,
          this.graph,
          {
            onError: () =>
              this.globalEndToEndWorkflowState.editorStore.applicationStore.alertService.setBlockingAlert(
                undefined,
              ),
          },
        ),
      )) as TextCompilationResult;
      this.globalEndToEndWorkflowState.editorStore.applicationStore.notificationService.notifySuccess(
        'Compiled successfully',
      );
      const entities = compilationResult.entities;
      const newGraph =
        this.globalEndToEndWorkflowState.editorStore.graphManagerState.createNewGraph();
      yield flowResult(
        this.globalEndToEndWorkflowState.editorStore.graphManagerState.graphManager.buildGraph(
          newGraph,
          entities,
          ActionState.create(),
        ),
      );
      this.graph = newGraph;
    } catch (error) {
      assertErrorThrown(error);
      this.globalEndToEndWorkflowState.editorStore.applicationStore.logService.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.DATABASE_MODEL_BUILDER_FAILURE),
        error,
      );
      this.globalEndToEndWorkflowState.editorStore.applicationStore.notificationService.notifyError(
        error,
      );
    }
  }

  *updateRuntime(newPath: string): GeneratorFn<void> {
    if (this.packageableRuntime) {
      this.packageableRuntime.package = getOrCreatePackage(
        this.graph.root,
        extractPackagePathFromPath(newPath) ?? newPath,
        true,
        new Map(),
      );
      if (newPath.includes('::')) {
        this.packageableRuntime.name = extractElementNameFromPath(newPath);
      } else {
        this.packageableRuntime.name = newPath;
      }
      this.packageableRuntime.name = extractElementNameFromPath(newPath);
      this.setRuntimeGrammarCode(
        (yield this.globalEndToEndWorkflowState.editorStore.graphManagerState.graphManager.entitiesToPureCode(
          [
            this.globalEndToEndWorkflowState.editorStore.graphManagerState.graphManager.elementToEntity(
              this.packageableRuntime,
            ),
          ],
          { pretty: true },
        )) as string,
      );
    }
  }

  *updateGraphWithModels(entities: Entity[]): GeneratorFn<void> {
    try {
      const newGraph =
        this.globalEndToEndWorkflowState.editorStore.graphManagerState.createNewGraph();
      newGraph.addElement(
        guaranteeNonNullable(this.packageableConnection),
        this.packageableConnection?.package?.path,
      );
      newGraph.addElement(this.database, this.database?.package?.path);
      yield flowResult(
        this.globalEndToEndWorkflowState.editorStore.graphManagerState.graphManager.buildGraph(
          newGraph,
          entities,
          ActionState.create(),
        ),
      );
      // create a runtime
      if (this.packageableRuntime) {
        runtime_setMappings(this.packageableRuntime.runtimeValue, [
          PackageableElementExplicitReference.create(
            getNonNullableEntry(newGraph.mappings, 0),
          ),
        ]);
      } else {
        const runtime = new PackageableRuntime(
          extractElementNameFromPath(this.targetRuntimePath),
        );
        runtime.runtimeValue = new EngineRuntime();
        runtime_addMapping(
          runtime.runtimeValue,
          PackageableElementExplicitReference.create(
            getNonNullableEntry(newGraph.mappings, 0),
          ),
        );
        runtime_addIdentifiedConnection(
          runtime.runtimeValue,
          new IdentifiedConnection(
            generateIdentifiedConnectionId(runtime.runtimeValue),
            guaranteeNonNullable(this.packageableConnection).connectionValue,
          ),
          this.globalEndToEndWorkflowState.editorStore.changeDetectionState
            .observerContext,
        );
        this.packageableRuntime = runtime;
      }
      newGraph.addElement(
        this.packageableRuntime,
        extractPackagePathFromPath(this.targetRuntimePath),
      );
      this.graph = newGraph;

      this.setRuntimeGrammarCode(
        (yield this.globalEndToEndWorkflowState.editorStore.graphManagerState.graphManager.entitiesToPureCode(
          [
            this.globalEndToEndWorkflowState.editorStore.graphManagerState.graphManager.elementToEntity(
              this.packageableRuntime,
            ),
          ],
          { pretty: true },
        )) as string,
      );
      const connectionGrammarCode =
        (yield this.globalEndToEndWorkflowState.editorStore.graphManagerState.graphManager.entitiesToPureCode(
          [
            this.globalEndToEndWorkflowState.editorStore.graphManagerState.graphManager.elementToEntity(
              guaranteeNonNullable(this.packageableConnection),
            ),
          ],
          { pretty: true },
        )) as string;
      this.connectionGrammarCode = connectionGrammarCode;
    } catch (error) {
      assertErrorThrown(error);
      this.globalEndToEndWorkflowState.editorStore.applicationStore.logService.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.DATABASE_MODEL_BUILDER_FAILURE),
        error,
      );
      this.globalEndToEndWorkflowState.editorStore.applicationStore.notificationService.notifyError(
        error,
      );
    }
  }

  //wrong not just h2
  createConnection(): RelationalDatabaseConnection {
    const spec = new LocalH2DatasourceSpecification();
    spec.testDataSetupSqls = [DEFAULT_H2_SQL];
    const connection = new RelationalDatabaseConnection(
      PackageableElementExplicitReference.create(stub_Database()),
      DatabaseType.H2,
      spec,
      new DefaultH2AuthenticationStrategy(),
    );

    return connection;
  }

  // need to open queyr builder by a sample query
  *query(): GeneratorFn<void> {
    const entities =
      (yield this.globalEndToEndWorkflowState.editorStore.graphManagerState.graphManager.pureCodeToEntities(
        this.finalGrammarCode,
      )) as Entity[];
    const newEntities: EntityChange[] = [];
    for (const entity of entities) {
      newEntities.push({
        type: EntityChangeType.CREATE,
        entityPath: entity.path,
        content: entity.content,
      });
    }
    yield flowResult(
      this.globalEndToEndWorkflowState.editorStore.graphState.loadEntityChangesToGraph(
        newEntities,
        undefined,
      ),
    );
    this.globalEndToEndWorkflowState.editorStore.tabManagerState.openTab(
      this.queryConnectionEndToEndWorkflowEditorState,
    );
    this.globalEndToEndWorkflowState.editorStore.tabManagerState.closeTab(
      this.queryConnectionEndToEndWorkflowEditorState,
    );
    const theClass = getNonNullableEntry(this.graph.classes, 0);
    queryClass(
      theClass,
      this.queryConnectionEndToEndWorkflowEditorState.editorStore,
    );
  }

  reset(): void {
    this.activeStep = 0;
    this.databaseBuilderState = undefined;
    this.databaseModelBuilderState = new DatabaseModelBuilderState(
      this.globalEndToEndWorkflowState.editorStore,
      guaranteeNonNullable(this.database),
      false,
    );
    this.graph =
      this.globalEndToEndWorkflowState.editorStore.graphManagerState.createNewGraph();
    this.connectionValueState = new RelationalDatabaseConnectionValueState(
      this.globalEndToEndWorkflowState.editorStore,
      this.createConnection(),
    );
  }
}

export class GlobalEndToEndWorkflowState {
  editorStore: EditorStore;
  queryConnectionEndToEndWorkflowState: QueryConnectionEndToEndWorkflowState;
  queryConnectionEndToEndWorkflowEditorState: QueryConnectionEndToEndWorkflowEditorState;

  constructor(editorStore: EditorStore) {
    makeObservable(this, {
      editorStore: false,
      queryConnectionEndToEndWorkflowState: observable,
      queryConnectionEndToEndWorkflowEditorState: observable,
    });
    this.editorStore = editorStore;
    this.queryConnectionEndToEndWorkflowState =
      new QueryConnectionEndToEndWorkflowState(this);
    this.queryConnectionEndToEndWorkflowEditorState =
      new QueryConnectionEndToEndWorkflowEditorState(this.editorStore);
  }

  visitWorkflow(workflow: SupportedEndToEndWorkflow): void {
    if (workflow === SupportedEndToEndWorkflow.CREATE_QUERY_FROM_CONNECTION) {
      this.editorStore.tabManagerState.openTab(
        this.queryConnectionEndToEndWorkflowEditorState,
      );
    }
  }
}
