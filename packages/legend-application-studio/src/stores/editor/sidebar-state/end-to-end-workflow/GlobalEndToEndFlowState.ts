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
  action,
  computed,
  flow,
  flowResult,
  makeObservable,
  observable,
} from 'mobx';
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
  type PureModel,
  PackageableConnection,
  EngineRuntime,
  IdentifiedConnection,
  generateIdentifiedConnectionId,
  PackageableRuntime,
  extractElementNameFromPath,
  getOrCreatePackage,
  extractPackagePathFromPath,
  getMappingCompatibleClasses,
  RuntimePointer,
  ParserError,
  CompilationError,
  observe_RelationalDatabaseConnection,
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
import {
  packageableConnection_setConnectionValue,
  runtime_addIdentifiedConnection,
  runtime_addMapping,
  runtime_setMappings,
} from '../../../graph-modifier/DSL_Mapping_GraphModifierHelper.js';
import {
  ClassQueryBuilderState,
  QueryBuilderConfig,
} from '@finos/legend-query-builder';

export enum SupportedEndToEndWorkflow {
  CREATE_QUERY_FROM_CONNECTION = 'Create Query From Connection',
}

const DEFAULT_CONNECTION_PATH = 'store::MyConnection';
const DEFAULT_RUNTIME_PATH = 'store::MyRuntime';
const JOIN_CODE_SYNTAX =
  '// Please refer to pure code syntax below for how to create join' +
  '\n' +
  '// Join join_name(Table1.column1 = Table2.column2);' +
  '\n';

export class QueryConnectionEndToEndWorkflowState {
  activeStep: number;
  globalEndToEndWorkflowState: GlobalEndToEndWorkflowState;
  queryConnectionEndToEndWorkflowEditorState: QueryConnectionEndToEndWorkflowEditorState;
  targetConnectionPath = DEFAULT_CONNECTION_PATH;
  targetRuntimePath = DEFAULT_RUNTIME_PATH;
  packageableConnection: PackageableConnection | undefined;
  packageableRuntime: PackageableRuntime | undefined;
  connectionValueState: RelationalDatabaseConnectionValueState; // build connection
  databaseBuilderWizardState: DatabaseBuilderWizardState | undefined; // build database
  databaseModelBuilderState: DatabaseModelBuilderState | undefined; // build models from database
  databaseGrammarCode = '';
  runtimeGrammarCode = '';
  connectionGrammarCode = '';
  finalGrammarCode = '';
  graph: PureModel;
  isGeneratingDatabaseGrammarCode = ActionState.create();
  isValid: boolean;
  compileError: ParserError | CompilationError | undefined;

  constructor(globalEndToEndWorkflowState: GlobalEndToEndWorkflowState) {
    makeObservable(this, {
      globalEndToEndWorkflowState: false,
      activeStep: observable,
      targetConnectionPath: observable,
      compileError: observable,
      packageableRuntime: observable,
      databaseGrammarCode: observable,
      runtimeGrammarCode: observable,
      connectionGrammarCode: observable,
      finalGrammarCode: observable,
      targetRuntimePath: observable,
      isValid: observable,
      queryConnectionEndToEndWorkflowEditorState: observable,
      connectionValueState: observable,
      databaseBuilderWizardState: observable,
      packageableConnection: observable,
      databaseModelBuilderState: observable,
      isGeneratingDatabaseGrammarCode: observable,
      createConnection: computed,
      setActiveStep: action,
      setDatabaseGrammarCode: action,
      setTargetConnectionPath: action,
      setRuntimeGrammarCode: action,
      setTargetRuntimePath: action,
      setFinalGrammarCode: action,
      buildDatabaseModelBuilderState: action,
      setCompileError: action,
      reset: action,
      generateDatabaseGrammarCode: flow,
      updateGraphWithModels: flow,
      buildDatabase: flow,
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
      observe_RelationalDatabaseConnection(
        this.createConnection,
        this.globalEndToEndWorkflowState.editorStore.changeDetectionState
          .observerContext,
      ),
    );
    this.graph =
      this.globalEndToEndWorkflowState.editorStore.graphManagerState.createNewGraph();
  }

  setActiveStep(step: number): void {
    this.activeStep = step;
  }

  setTargetConnectionPath(val: string): void {
    this.targetConnectionPath = val;
  }

  setTargetRuntimePath(val: string): void {
    this.targetRuntimePath = val;
  }

  setRuntimeGrammarCode(val: string): void {
    this.runtimeGrammarCode = val;
  }

  setDatabaseGrammarCode(code: string): void {
    this.databaseGrammarCode = code;
  }

  setFinalGrammarCode(val: string): void {
    this.finalGrammarCode = val;
  }

  buildDatabaseBuilderWizardState(): void {
    this.databaseBuilderWizardState = new DatabaseBuilderWizardState(
      this.globalEndToEndWorkflowState.editorStore,
      this.connectionValueState.connection,
      false,
    );
  }

  setCompileError(err: ParserError | CompilationError | undefined): void {
    this.compileError = err;
  }

  buildDatabaseModelBuilderState(): void {
    this.databaseModelBuilderState = new DatabaseModelBuilderState(
      this.globalEndToEndWorkflowState.editorStore,
      guaranteeNonNullable(
        this.databaseBuilderWizardState,
        'databaseBuilderState must exist before building model from database',
      ).schemaExplorerState.database,
      false,
      this.graph,
    );
  }

  *buildDatabase(): GeneratorFn<void> {
    try {
      const databaseBuilderWizardState = guaranteeNonNullable(
        this.databaseBuilderWizardState,
        `databaseBuilderState must exist before building database from connection`,
      );
      if (!databaseBuilderWizardState.schemaExplorerState.treeData) {
        return;
      }
      yield flowResult(
        databaseBuilderWizardState.schemaExplorerState.updateDatabase(),
      );
    } catch (error) {
      assertErrorThrown(error);
      this.globalEndToEndWorkflowState.editorStore.applicationStore.logService.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.DATABASE_BUILDER_FAILURE),
        error,
      );
      this.globalEndToEndWorkflowState.editorStore.applicationStore.notificationService.notifyError(
        error,
      );
      this.isGeneratingDatabaseGrammarCode.fail();
    }
  }

  *generateDatabaseGrammarCode(): GeneratorFn<void> {
    try {
      this.isGeneratingDatabaseGrammarCode.inProgress();
      // can't use this.databaseBuilderState.databaseGrammarCode as databaseGrammarCode might not be up to date
      this.setDatabaseGrammarCode(
        JOIN_CODE_SYNTAX +
          ((yield this.globalEndToEndWorkflowState.editorStore.graphManagerState.graphManager.entitiesToPureCode(
            [
              this.globalEndToEndWorkflowState.editorStore.graphManagerState.graphManager.elementToEntity(
                guaranteeNonNullable(this.databaseBuilderWizardState)
                  .schemaExplorerState.database,
              ),
            ],
            { pretty: true },
          )) as string),
      );
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
          'Please make sure there is only one databse',
        );
      } else {
        this.isValid = true;
      }
      const databaseBuilderWizardState = guaranteeNonNullable(
        this.databaseBuilderWizardState,
        'databaseBuilderWizardState must exist',
      );
      // databaseBuilderWizardState.schemaExplorerState.database needs to be updated
      databaseBuilderWizardState.schemaExplorerState.database =
        getNonNullableEntry(newGraph.databases, 0);
      this.graph = newGraph;
      // start building packageableConnection based on database and adding it to current graph
      const packageableConnection = new PackageableConnection(
        extractElementNameFromPath(this.targetConnectionPath),
      );
      this.connectionValueState.connection.store =
        PackageableElementExplicitReference.create(
          databaseBuilderWizardState.schemaExplorerState.database,
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
      this.packageableConnection = packageableConnection;
      this.graph.addElement(
        packageableConnection,
        extractPackagePathFromPath(this.targetConnectionPath),
      );
      this.setCompileError(undefined);
    } catch (error) {
      if (error instanceof ParserError || error instanceof CompilationError) {
        this.setCompileError(error);
      }
      this.isValid = false;
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
      this.setCompileError(undefined);
    } catch (error) {
      if (error instanceof ParserError || error instanceof CompilationError) {
        this.setCompileError(error);
      }
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
      newGraph.addElement(
        guaranteeNonNullable(this.databaseBuilderWizardState)
          .schemaExplorerState.database,
        guaranteeNonNullable(this.databaseBuilderWizardState)
          .schemaExplorerState.database.package?.path,
      );
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

  get createConnection(): RelationalDatabaseConnection {
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
    const theClass = guaranteeNonNullable(
      getMappingCompatibleClasses(
        getNonNullableEntry(this.graph.mappings, 0),
        this.graph.classes,
      )[0],
    );
    const config = new QueryBuilderConfig();
    const queryBuilderState = new ClassQueryBuilderState(
      this.globalEndToEndWorkflowState.editorStore.applicationStore,
      this.globalEndToEndWorkflowState.editorStore.graphManagerState,
      config,
    );
    queryBuilderState.class = theClass;
    queryBuilderState.executionContextState.mapping = getNonNullableEntry(
      this.graph.mappings,
      0,
    );
    queryBuilderState.executionContextState.runtimeValue = new RuntimePointer(
      PackageableElementExplicitReference.create(
        getNonNullableEntry(this.graph.runtimes, 0),
      ),
    );
    yield flowResult(
      this.globalEndToEndWorkflowState.editorStore.embeddedQueryBuilderState.setEmbeddedQueryBuilderConfiguration(
        {
          setupQueryBuilderState: () => queryBuilderState,
          actionConfigs: [],
        },
      ),
    );
  }

  reset(): void {
    this.activeStep = 0;
    this.databaseBuilderWizardState = undefined;
    this.graph =
      this.globalEndToEndWorkflowState.editorStore.graphManagerState.createNewGraph();
    this.connectionValueState = new RelationalDatabaseConnectionValueState(
      this.globalEndToEndWorkflowState.editorStore,
      observe_RelationalDatabaseConnection(
        this.createConnection,
        this.globalEndToEndWorkflowState.editorStore.changeDetectionState
          .observerContext,
      ),
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

  visitWorkflow(workflow: string): void {
    if (workflow === SupportedEndToEndWorkflow.CREATE_QUERY_FROM_CONNECTION) {
      this.editorStore.tabManagerState.openTab(
        this.queryConnectionEndToEndWorkflowEditorState,
      );
    }
  }
}
