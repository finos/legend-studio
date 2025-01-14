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

import { action, flow, flowResult, observable, makeObservable } from 'mobx';
import {
  guaranteeNonNullable,
  type GeneratorFn,
  LogEvent,
  assertErrorThrown,
  ActionState,
  at,
} from '@finos/legend-shared';
import {
  END_TO_END_WORKFLOWS,
  EndToEndWorkflowEditorState,
} from './EndToEndWorkflowEditorState.js';
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
import type { EditorStore } from '../../EditorStore.js';
import { BaseStepperState } from '@finos/legend-art';
import { LEGEND_STUDIO_APP_EVENT } from '../../../../__lib__/LegendStudioEvent.js';
import { EntityChangeType, type EntityChange } from '@finos/legend-server-sdlc';
import type { Entity } from '@finos/legend-storage';
import {
  ClassQueryBuilderState,
  QueryBuilderAdvancedWorkflowState,
  QueryBuilderConfig,
} from '@finos/legend-query-builder';
import {
  packageableConnection_setConnectionValue,
  runtime_addIdentifiedConnection,
  runtime_addMapping,
  runtime_setMappings,
} from '../../../graph-modifier/DSL_Mapping_GraphModifierHelper.js';
import { DatabaseModelBuilderState } from '../element-editor-state/connection/DatabaseModelBuilderState.js';
import { DatabaseBuilderWizardState } from '../element-editor-state/connection/DatabaseBuilderWizardState.js';
import { RelationalDatabaseConnectionValueState } from '../element-editor-state/connection/ConnectionEditorState.js';
import { DEFAULT_H2_SQL } from '../../NewElementState.js';

export enum QUERY_CONNECTION_WORKFLOW_STEPS {
  CREATE_CONNECTION = 'Create Connection',
  CREATE_DATABASE = 'Create Database',
  EDIT_DATABASE = 'Edit Database',
  CREATE_CLASS_MAPPING_RUNTIME = 'Create Class/Mapping/Runtime',
  CONFIRMATION = 'Confirmation',
}

const DEFAULT_CONNECTION_PATH = 'store::MyConnection';
const DEFAULT_RUNTIME_PATH = 'store::MyRuntime';
const JOIN_CODE_SYNTAX =
  '// Please refer to pure code syntax below for how to create join' +
  '\n' +
  '// Join join_name(Table1.column1 = Table2.column2);' +
  '\n';

export abstract class ConnectionToQueryStepperState extends BaseStepperState {
  abstract override label: QUERY_CONNECTION_WORKFLOW_STEPS;
}
// step5 - confirm/update final grammar and query
export class QueryConnectionConfirmationAndGrammarEditorStepperState extends ConnectionToQueryStepperState {
  workflowEditorState: QueryConnectionEndToEndWorkflowEditorState;
  isCompilingCode = ActionState.create();
  editorStore: EditorStore;

  constructor(
    queryConnectionEndToEndWorkflowState: QueryConnectionEndToEndWorkflowEditorState,
  ) {
    super();
    makeObservable(this, {
      workflowEditorState: false,
      isCompilingCode: observable,
      handleNext: flow,
      query: flow,
      compile: flow,
    });
    this.workflowEditorState = queryConnectionEndToEndWorkflowState;
    this.editorStore = this.workflowEditorState.editorStore;
  }

  get label(): QUERY_CONNECTION_WORKFLOW_STEPS {
    return QUERY_CONNECTION_WORKFLOW_STEPS.CONFIRMATION;
  }

  *compile(): GeneratorFn<void> {
    try {
      this.isCompilingCode.inProgress();
      const compilationResult = (yield flowResult(
        yield this.editorStore.graphManagerState.graphManager.compileText(
          this.workflowEditorState.finalGrammarCode,
          this.workflowEditorState.workflowGraph,
        ),
      )) as TextCompilationResult;
      this.editorStore.applicationStore.notificationService.notifySuccess(
        'Compiled successfully',
      );
      const entities = compilationResult.entities;
      const newGraph = this.editorStore.graphManagerState.createNewGraph();
      yield flowResult(
        this.editorStore.graphManagerState.graphManager.buildGraph(
          newGraph,
          entities,
          ActionState.create(),
        ),
      );
      this.workflowEditorState.workflowGraph = newGraph;
      this.workflowEditorState.setCompileError(undefined);
    } catch (error) {
      if (error instanceof ParserError || error instanceof CompilationError) {
        this.workflowEditorState.setCompileError(error);
      }
      assertErrorThrown(error);
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.DATABASE_MODEL_BUILDER_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notificationService.notifyError(error);
      this.isCompilingCode.fail();
    } finally {
      this.isCompilingCode.complete();
    }
  }

  *query(): GeneratorFn<void> {
    const entities =
      (yield this.editorStore.graphManagerState.graphManager.pureCodeToEntities(
        this.workflowEditorState.finalGrammarCode,
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
      this.editorStore.graphState.loadEntityChangesToGraph(
        newEntities,
        undefined,
      ),
    );
    this.editorStore.tabManagerState.openTab(
      this.editorStore.globalEndToEndWorkflowState
        .queryToConnectionWorkflowEditorState,
    );
    this.editorStore.tabManagerState.closeTab(
      this.editorStore.globalEndToEndWorkflowState
        .queryToConnectionWorkflowEditorState,
    );
    const theClass = getMappingCompatibleClasses(
      at(this.workflowEditorState.workflowGraph.mappings, 0),
      this.workflowEditorState.workflowGraph.classes,
    )[0];
    if (theClass) {
      const config = new QueryBuilderConfig();
      const queryBuilderState = new ClassQueryBuilderState(
        this.editorStore.applicationStore,
        this.editorStore.graphManagerState,
        QueryBuilderAdvancedWorkflowState.INSTANCE,
        config,
      );
      queryBuilderState.class = theClass;
      queryBuilderState.executionContextState.mapping = at(
        this.workflowEditorState.workflowGraph.mappings,
        0,
      );
      queryBuilderState.executionContextState.runtimeValue = new RuntimePointer(
        PackageableElementExplicitReference.create(
          at(this.workflowEditorState.workflowGraph.runtimes, 0),
        ),
      );
      yield flowResult(
        this.editorStore.embeddedQueryBuilderState.setEmbeddedQueryBuilderConfiguration(
          {
            setupQueryBuilderState: async () => queryBuilderState,
            actionConfigs: [],
          },
        ),
      );
    }
  }

  override *handleNext(): GeneratorFn<void> {
    yield flowResult(this.query()).then(() => {
      this.workflowEditorState.reset();
    });
  }
}

// step 4 - build class/mapping/runtime from database
export class DatabaseModelBuilderStepperState extends ConnectionToQueryStepperState {
  workflowEditorState: QueryConnectionEndToEndWorkflowEditorState;
  databaseModelBuilderState: DatabaseModelBuilderState;
  editorStore: EditorStore;

  constructor(
    queryConnectionEndToEndWorkflowState: QueryConnectionEndToEndWorkflowEditorState,
    databaseModelBuilderState: DatabaseModelBuilderState,
  ) {
    super();
    makeObservable(this, {
      workflowEditorState: false,
      updateGraphWithModels: flow,
      handleNext: flow,
    });
    this.workflowEditorState = queryConnectionEndToEndWorkflowState;
    this.databaseModelBuilderState = databaseModelBuilderState;
    this.editorStore = this.workflowEditorState.editorStore;
  }

  get label(): QUERY_CONNECTION_WORKFLOW_STEPS {
    return QUERY_CONNECTION_WORKFLOW_STEPS.CREATE_CLASS_MAPPING_RUNTIME;
  }

  *updateGraphWithModels(entities: Entity[]): GeneratorFn<void> {
    try {
      const newGraph = this.editorStore.graphManagerState.createNewGraph();
      newGraph.addElement(
        guaranteeNonNullable(this.workflowEditorState.packageableConnection),
        this.workflowEditorState.packageableConnection?.package?.path,
      );
      const databaseBuilderStepperState =
        this.workflowEditorState.activeStepToBaseStepperState.get(
          QUERY_CONNECTION_WORKFLOW_STEPS.CREATE_DATABASE,
        ) as DatabaseBuilderStepperState;

      newGraph.addElement(
        databaseBuilderStepperState.databaseBuilderWizardState
          .schemaExplorerState.database,
        databaseBuilderStepperState.databaseBuilderWizardState
          .schemaExplorerState.database.package?.path,
      );
      yield flowResult(
        this.editorStore.graphManagerState.graphManager.buildGraph(
          newGraph,
          entities,
          ActionState.create(),
        ),
      );
      // create a runtime
      if (this.workflowEditorState.packageableRuntime) {
        runtime_setMappings(
          this.workflowEditorState.packageableRuntime.runtimeValue,
          [
            PackageableElementExplicitReference.create(
              at(newGraph.mappings, 0),
            ),
          ],
        );
      } else {
        const runtime = new PackageableRuntime(
          extractElementNameFromPath(
            this.workflowEditorState.targetRuntimePath,
          ),
        );
        runtime.runtimeValue = new EngineRuntime();
        runtime_addMapping(
          runtime.runtimeValue,
          PackageableElementExplicitReference.create(at(newGraph.mappings, 0)),
        );
        runtime_addIdentifiedConnection(
          runtime.runtimeValue,
          new IdentifiedConnection(
            generateIdentifiedConnectionId(runtime.runtimeValue),
            guaranteeNonNullable(
              this.workflowEditorState.packageableConnection,
            ).connectionValue,
          ),
          this.workflowEditorState.editorStore.changeDetectionState
            .observerContext,
        );
        this.workflowEditorState.packageableRuntime = runtime;
      }
      newGraph.addElement(
        this.workflowEditorState.packageableRuntime,
        extractPackagePathFromPath(this.workflowEditorState.targetRuntimePath),
      );
      this.workflowEditorState.workflowGraph = newGraph;
      this.workflowEditorState.setRuntimeGrammarCode(
        (yield this.editorStore.graphManagerState.graphManager.entitiesToPureCode(
          [
            this.editorStore.graphManagerState.graphManager.elementToEntity(
              this.workflowEditorState.packageableRuntime,
            ),
          ],
          { pretty: true },
        )) as string,
      );
      const connectionGrammarCode =
        (yield this.editorStore.graphManagerState.graphManager.entitiesToPureCode(
          [
            this.editorStore.graphManagerState.graphManager.elementToEntity(
              guaranteeNonNullable(
                this.workflowEditorState.packageableConnection,
              ),
            ),
          ],
          { pretty: true },
        )) as string;
      this.workflowEditorState.connectionGrammarCode = connectionGrammarCode;
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.DATABASE_MODEL_BUILDER_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notificationService.notifyError(error);
    }
  }

  override *handleNext(): GeneratorFn<void> {
    this.workflowEditorState.setFinalGrammarCode(
      this.databaseModelBuilderState.generatedGrammarCode
        .concat(this.workflowEditorState.runtimeGrammarCode)
        .concat(this.workflowEditorState.databaseGrammarCode)
        .concat(this.workflowEditorState.connectionGrammarCode),
    );
    this.workflowEditorState.activeStepToBaseStepperState.set(
      QUERY_CONNECTION_WORKFLOW_STEPS.CONFIRMATION,
      new QueryConnectionConfirmationAndGrammarEditorStepperState(
        this.workflowEditorState,
      ),
    );
  }
}

// step 3 - database grammar editor
export class DatabaseGrammarEditorStepperState extends ConnectionToQueryStepperState {
  workflowEditorState: QueryConnectionEndToEndWorkflowEditorState;
  isCompilingGrammarCode = ActionState.create();
  editorStore: EditorStore;

  constructor(
    queryConnectionEndToEndWorkflowState: QueryConnectionEndToEndWorkflowEditorState,
  ) {
    super();
    makeObservable(this, {
      workflowEditorState: false,
      isCompilingGrammarCode: observable,
      buildDatabaseModelBuilderState: action,
      compileDatabaseGrammarCode: flow,
      handleNext: flow,
    });
    this.workflowEditorState = queryConnectionEndToEndWorkflowState;
    this.editorStore = this.workflowEditorState.editorStore;
  }

  get label(): QUERY_CONNECTION_WORKFLOW_STEPS {
    return QUERY_CONNECTION_WORKFLOW_STEPS.EDIT_DATABASE;
  }

  *compileDatabaseGrammarCode(): GeneratorFn<void> {
    try {
      this.isCompilingGrammarCode.inProgress();
      const databaseBuilderStepperState =
        this.workflowEditorState.activeStepToBaseStepperState.get(
          QUERY_CONNECTION_WORKFLOW_STEPS.CREATE_DATABASE,
        ) as DatabaseBuilderStepperState;
      const connectionValueStepperState =
        this.workflowEditorState.activeStepToBaseStepperState.get(
          QUERY_CONNECTION_WORKFLOW_STEPS.CREATE_CONNECTION,
        ) as ConnectionValueStepperState;
      const compilationResult = (yield flowResult(
        yield this.editorStore.graphManagerState.graphManager.compileText(
          this.workflowEditorState.databaseGrammarCode,
          this.workflowEditorState.workflowGraph,
        ),
      )) as TextCompilationResult;
      this.editorStore.applicationStore.notificationService.notifySuccess(
        'Compiled successfully',
      );
      const entities = compilationResult.entities;
      const newGraph = this.editorStore.graphManagerState.createNewGraph();
      yield flowResult(
        this.editorStore.graphManagerState.graphManager.buildGraph(
          newGraph,
          entities,
          ActionState.create(),
        ),
      );
      if (newGraph.databases.length > 1) {
        this.workflowEditorState.isValid = false;
        this.editorStore.applicationStore.notificationService.notifyError(
          'Please make sure there is only one databse',
        );
      } else {
        this.workflowEditorState.isValid = true;
      }
      // databaseBuilderWizardState.schemaExplorerState.database needs to be updated
      databaseBuilderStepperState.databaseBuilderWizardState.schemaExplorerState.database =
        at(newGraph.databases, 0);
      this.workflowEditorState.workflowGraph = newGraph;
      // start building packageableConnection based on database and adding it to current graph
      const packageableConnection = new PackageableConnection(
        extractElementNameFromPath(
          connectionValueStepperState.targetConnectionPath,
        ),
      );
      connectionValueStepperState.connectionValueState.connection.store =
        PackageableElementExplicitReference.create(
          databaseBuilderStepperState.databaseBuilderWizardState
            .schemaExplorerState.database,
        );
      packageableConnection.package = getOrCreatePackage(
        this.workflowEditorState.workflowGraph.root,
        connectionValueStepperState.targetConnectionPath,
        true,
        new Map(),
      );
      packageableConnection_setConnectionValue(
        packageableConnection,
        connectionValueStepperState.connectionValueState.connection,
        this.workflowEditorState.editorStore.changeDetectionState
          .observerContext,
      );
      this.workflowEditorState.packageableConnection = packageableConnection;
      this.workflowEditorState.workflowGraph.addElement(
        packageableConnection,
        extractPackagePathFromPath(
          connectionValueStepperState.targetConnectionPath,
        ),
      );
      this.workflowEditorState.setCompileError(undefined);
      this.isCompilingGrammarCode.pass();
    } catch (error) {
      if (error instanceof ParserError || error instanceof CompilationError) {
        this.workflowEditorState.setCompileError(error);
      }
      this.workflowEditorState.isValid = false;
      assertErrorThrown(error);
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.DATABASE_MODEL_BUILDER_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notificationService.notifyError(error);
      this.isCompilingGrammarCode.fail();
    } finally {
      this.isCompilingGrammarCode.complete();
    }
  }

  buildDatabaseModelBuilderState(): void {
    const databaseBuilderStepperState =
      this.workflowEditorState.activeStepToBaseStepperState.get(
        QUERY_CONNECTION_WORKFLOW_STEPS.CREATE_DATABASE,
      ) as DatabaseBuilderStepperState;
    const databaseModelBuilderState = new DatabaseModelBuilderState(
      this.editorStore,
      databaseBuilderStepperState.databaseBuilderWizardState.schemaExplorerState.database,
      false,
      this.workflowEditorState.workflowGraph,
    );
    this.workflowEditorState.activeStepToBaseStepperState.set(
      QUERY_CONNECTION_WORKFLOW_STEPS.CREATE_CLASS_MAPPING_RUNTIME,
      new DatabaseModelBuilderStepperState(
        this.workflowEditorState,
        databaseModelBuilderState,
      ),
    );
  }

  override *handleNext(): GeneratorFn<void> {
    yield flowResult(this.compileDatabaseGrammarCode()).then(() => {
      this.buildDatabaseModelBuilderState();
    });
  }
}

// step 2 - build database
export class DatabaseBuilderStepperState extends ConnectionToQueryStepperState {
  workflowEditorState: QueryConnectionEndToEndWorkflowEditorState;
  databaseBuilderWizardState: DatabaseBuilderWizardState;
  isGeneratingDatabaseGrammarCode = ActionState.create();
  editorStore: EditorStore;

  constructor(
    queryConnectionEndToEndWorkflowState: QueryConnectionEndToEndWorkflowEditorState,
    databaseBuilderWizardState: DatabaseBuilderWizardState,
  ) {
    super();
    makeObservable(this, {
      workflowEditorState: false,
      databaseBuilderWizardState: observable,
      isGeneratingDatabaseGrammarCode: observable,
      handleNext: flow,
      generateDatabaseGrammarCode: flow,
      buildDatabase: flow,
    });
    this.workflowEditorState = queryConnectionEndToEndWorkflowState;
    this.databaseBuilderWizardState = databaseBuilderWizardState;
    this.editorStore = this.workflowEditorState.editorStore;
  }

  get label(): QUERY_CONNECTION_WORKFLOW_STEPS {
    return QUERY_CONNECTION_WORKFLOW_STEPS.CREATE_DATABASE;
  }

  *buildDatabase(): GeneratorFn<void> {
    try {
      if (!this.databaseBuilderWizardState.schemaExplorerState.treeData) {
        return;
      }
      yield flowResult(
        this.databaseBuilderWizardState.schemaExplorerState.updateDatabase(),
      );
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.DATABASE_BUILDER_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notificationService.notifyError(error);
      this.isGeneratingDatabaseGrammarCode.fail();
    }
  }

  *generateDatabaseGrammarCode(): GeneratorFn<void> {
    try {
      this.isGeneratingDatabaseGrammarCode.inProgress();
      // can't use this.databaseBuilderState.databaseGrammarCode as databaseGrammarCode might not be up to date
      this.workflowEditorState.setDatabaseGrammarCode(
        JOIN_CODE_SYNTAX +
          ((yield this.editorStore.graphManagerState.graphManager.entitiesToPureCode(
            [
              this.editorStore.graphManagerState.graphManager.elementToEntity(
                this.databaseBuilderWizardState.schemaExplorerState.database,
              ),
            ],
            { pretty: true },
          )) as string),
      );
      this.isGeneratingDatabaseGrammarCode.pass();
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.DATABASE_MODEL_BUILDER_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notificationService.notifyError(error);
      this.isGeneratingDatabaseGrammarCode.fail();
    }
  }

  override *handleNext(): GeneratorFn<void> {
    yield flowResult(this.buildDatabase());
    yield flowResult(this.generateDatabaseGrammarCode());
    this.workflowEditorState.activeStepToBaseStepperState.set(
      QUERY_CONNECTION_WORKFLOW_STEPS.EDIT_DATABASE,
      new DatabaseGrammarEditorStepperState(this.workflowEditorState),
    );
  }
}

// step 1 - build connection
export class ConnectionValueStepperState extends ConnectionToQueryStepperState {
  workflowEditorState: QueryConnectionEndToEndWorkflowEditorState;
  targetConnectionPath = DEFAULT_CONNECTION_PATH;
  connectionValueState: RelationalDatabaseConnectionValueState;

  constructor(workflowEditorState: QueryConnectionEndToEndWorkflowEditorState) {
    super();
    makeObservable(this, {
      workflowEditorState: false,
      targetConnectionPath: observable,
      connectionValueState: observable,
      setTargetConnectionPath: action,
      handleNext: flow,
    });
    this.workflowEditorState = workflowEditorState;
    this.connectionValueState = new RelationalDatabaseConnectionValueState(
      this.workflowEditorState.editorStore,
      observe_RelationalDatabaseConnection(
        this.createConnection,
        this.workflowEditorState.editorStore.changeDetectionState
          .observerContext,
      ),
    );
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

  get label(): QUERY_CONNECTION_WORKFLOW_STEPS {
    return QUERY_CONNECTION_WORKFLOW_STEPS.CREATE_CONNECTION;
  }

  setTargetConnectionPath(val: string): void {
    this.targetConnectionPath = val;
  }

  override *handleNext(): GeneratorFn<void> {
    const databaseBuilderWizardState = new DatabaseBuilderWizardState(
      this.workflowEditorState.editorStore,
      this.connectionValueState.connection,
      false,
    );
    databaseBuilderWizardState.schemaExplorerState.setMakeTargetDatabasePathEditable(
      true,
    );
    this.workflowEditorState.activeStepToBaseStepperState.set(
      QUERY_CONNECTION_WORKFLOW_STEPS.CREATE_DATABASE,
      new DatabaseBuilderStepperState(
        this.workflowEditorState,
        databaseBuilderWizardState,
      ),
    );
  }
}

export class QueryConnectionEndToEndWorkflowEditorState extends EndToEndWorkflowEditorState {
  activeStep: number;
  activeStepToBaseStepperState = new Map<string, BaseStepperState>();
  activeStepToStepLabel = new Map<number, string>();
  targetRuntimePath = DEFAULT_RUNTIME_PATH;
  packageableConnection: PackageableConnection | undefined;
  packageableRuntime: PackageableRuntime | undefined;
  databaseGrammarCode = '';
  runtimeGrammarCode = '';
  connectionGrammarCode = '';
  finalGrammarCode = '';
  workflowGraph: PureModel;
  isValid: boolean;
  compileError: ParserError | CompilationError | undefined;

  constructor(editorStore: EditorStore) {
    super(editorStore);
    makeObservable(this, {
      activeStep: observable,
      activeStepToBaseStepperState: observable,
      compileError: observable,
      packageableRuntime: observable,
      runtimeGrammarCode: observable,
      connectionGrammarCode: observable,
      finalGrammarCode: observable,
      targetRuntimePath: observable,
      isValid: observable,
      packageableConnection: observable,
      setActiveStep: action,
      setDatabaseGrammarCode: action,
      setRuntimeGrammarCode: action,
      setTargetRuntimePath: action,
      setFinalGrammarCode: action,
      setCompileError: action,
      reset: action,
      updateRuntime: flow,
    });
    this.activeStep = 0;
    this.isValid = true;
    this.activeStepToBaseStepperState.set(
      QUERY_CONNECTION_WORKFLOW_STEPS.CREATE_CONNECTION,
      new ConnectionValueStepperState(this),
    );
    this.workflowGraph = this.editorStore.graphManagerState.createNewGraph();
    this.initactiveStepToStepLabel();
  }

  override get label(): string {
    return END_TO_END_WORKFLOWS.CREATE_QUERY_FROM_CONNECTION;
  }

  initactiveStepToStepLabel(): void {
    Object.values(QUERY_CONNECTION_WORKFLOW_STEPS).forEach((val, index) =>
      this.activeStepToStepLabel.set(index, val),
    );
  }

  setActiveStep(step: number): void {
    this.activeStep = step;
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

  setCompileError(err: ParserError | CompilationError | undefined): void {
    this.compileError = err;
  }

  *updateRuntime(newPath: string): GeneratorFn<void> {
    if (this.packageableRuntime) {
      this.packageableRuntime.package = getOrCreatePackage(
        this.workflowGraph.root,
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
        (yield this.editorStore.graphManagerState.graphManager.entitiesToPureCode(
          [
            this.editorStore.graphManagerState.graphManager.elementToEntity(
              this.packageableRuntime,
            ),
          ],
          { pretty: true },
        )) as string,
      );
    }
  }

  reset(): void {
    this.activeStep = -1;
    this.workflowGraph = this.editorStore.graphManagerState.createNewGraph();
    this.packageableConnection = undefined;
    this.packageableRuntime = undefined;
    this.activeStepToBaseStepperState.set(
      QUERY_CONNECTION_WORKFLOW_STEPS.CREATE_CONNECTION,
      new ConnectionValueStepperState(this),
    );
  }
}
