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
import { BaseStepperState } from '@finos/legend-art';
import {
  QUERY_CONNECTION_WORKFLOW_STEPS,
  QueryConnectionConfirmationAndGrammarEditor,
  QueryConnectionDatabaseBuilderEditor,
  QueryConnectionDatabaseGrammarEditor,
  QueryConnectionModelsEditor,
  QueryConnectionRelationalConnectionEditor,
} from '../../../../components/editor/editor-group/end-to-end-flow-editor/QueryConnectionWorkflowEditor.js';

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

// step5 - confirm/update final grammar and query
export class QueryConnectionConfirmationAndGrammarEditorStepperState extends BaseStepperState {
  queryConnectionEndToEndWorkflowState: QueryConnectionEndToEndWorkflowState;
  isCompilingCode = ActionState.create();
  editorStore: EditorStore;

  constructor(
    queryConnectionEndToEndWorkflowState: QueryConnectionEndToEndWorkflowState,
    stepLabel: string,
  ) {
    super(stepLabel);
    makeObservable(this, {
      queryConnectionEndToEndWorkflowState: false,
      stepLabel: observable,
      isCompilingCode: observable,
      handleNext: flow,
      query: flow,
      compile: flow,
    });
    this.queryConnectionEndToEndWorkflowState =
      queryConnectionEndToEndWorkflowState;
    this.editorStore =
      this.queryConnectionEndToEndWorkflowState.globalEndToEndWorkflowState.editorStore;
  }

  *compile(): GeneratorFn<void> {
    try {
      this.isCompilingCode.inProgress();
      const compilationResult = (yield flowResult(
        yield this.editorStore.graphManagerState.graphManager.compileText(
          this.queryConnectionEndToEndWorkflowState.finalGrammarCode,
          this.queryConnectionEndToEndWorkflowState.graph,
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
      this.queryConnectionEndToEndWorkflowState.graph = newGraph;
      this.queryConnectionEndToEndWorkflowState.setCompileError(undefined);
    } catch (error) {
      if (error instanceof ParserError || error instanceof CompilationError) {
        this.queryConnectionEndToEndWorkflowState.setCompileError(error);
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
        this.queryConnectionEndToEndWorkflowState.finalGrammarCode,
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
      this.queryConnectionEndToEndWorkflowState
        .queryConnectionEndToEndWorkflowEditorState,
    );
    this.editorStore.tabManagerState.closeTab(
      this.queryConnectionEndToEndWorkflowState
        .queryConnectionEndToEndWorkflowEditorState,
    );
    const theClass = getMappingCompatibleClasses(
      getNonNullableEntry(
        this.queryConnectionEndToEndWorkflowState.graph.mappings,
        0,
      ),
      this.queryConnectionEndToEndWorkflowState.graph.classes,
    )[0];
    if (theClass) {
      const config = new QueryBuilderConfig();
      const queryBuilderState = new ClassQueryBuilderState(
        this.editorStore.applicationStore,
        this.editorStore.graphManagerState,
        config,
      );
      queryBuilderState.class = theClass;
      queryBuilderState.executionContextState.mapping = getNonNullableEntry(
        this.queryConnectionEndToEndWorkflowState.graph.mappings,
        0,
      );
      queryBuilderState.executionContextState.runtimeValue = new RuntimePointer(
        PackageableElementExplicitReference.create(
          getNonNullableEntry(
            this.queryConnectionEndToEndWorkflowState.graph.runtimes,
            0,
          ),
        ),
      );
      yield flowResult(
        this.editorStore.embeddedQueryBuilderState.setEmbeddedQueryBuilderConfiguration(
          {
            setupQueryBuilderState: () => queryBuilderState,
            actionConfigs: [],
          },
        ),
      );
    }
  }

  override *handleNext(): GeneratorFn<void> {
    yield flowResult(this.query()).then(() => {
      this.queryConnectionEndToEndWorkflowState.reset();
    });
  }

  override renderStepContent(): React.ReactNode {
    return (
      <QueryConnectionConfirmationAndGrammarEditor
        queryConnectionEndToEndWorkflowState={
          this.queryConnectionEndToEndWorkflowState
        }
        queryConnectionConfirmationAndGrammarEditorStepperState={this}
      />
    );
  }
}

// step 4 - build class/mapping/runtime from database
export class DatabaseModelBuilderStepperState extends BaseStepperState {
  queryConnectionEndToEndWorkflowState: QueryConnectionEndToEndWorkflowState;
  databaseModelBuilderState: DatabaseModelBuilderState;
  editorStore: EditorStore;

  constructor(
    queryConnectionEndToEndWorkflowState: QueryConnectionEndToEndWorkflowState,
    stepLabel: string,
    databaseModelBuilderState: DatabaseModelBuilderState,
  ) {
    super(stepLabel);
    makeObservable(this, {
      queryConnectionEndToEndWorkflowState: false,
      stepLabel: observable,
      updateGraphWithModels: flow,
      handleNext: flow,
    });
    this.queryConnectionEndToEndWorkflowState =
      queryConnectionEndToEndWorkflowState;
    this.databaseModelBuilderState = databaseModelBuilderState;
    this.editorStore =
      this.queryConnectionEndToEndWorkflowState.globalEndToEndWorkflowState.editorStore;
  }

  *updateGraphWithModels(entities: Entity[]): GeneratorFn<void> {
    try {
      const newGraph = this.editorStore.graphManagerState.createNewGraph();
      newGraph.addElement(
        guaranteeNonNullable(
          this.queryConnectionEndToEndWorkflowState.packageableConnection,
        ),
        this.queryConnectionEndToEndWorkflowState.packageableConnection?.package
          ?.path,
      );
      const databaseBuilderStepperState =
        this.queryConnectionEndToEndWorkflowState.activeStepToBaseStepperState.get(
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
      if (this.queryConnectionEndToEndWorkflowState.packageableRuntime) {
        runtime_setMappings(
          this.queryConnectionEndToEndWorkflowState.packageableRuntime
            .runtimeValue,
          [
            PackageableElementExplicitReference.create(
              getNonNullableEntry(newGraph.mappings, 0),
            ),
          ],
        );
      } else {
        const runtime = new PackageableRuntime(
          extractElementNameFromPath(
            this.queryConnectionEndToEndWorkflowState.targetRuntimePath,
          ),
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
            guaranteeNonNullable(
              this.queryConnectionEndToEndWorkflowState.packageableConnection,
            ).connectionValue,
          ),
          this.queryConnectionEndToEndWorkflowState.globalEndToEndWorkflowState
            .editorStore.changeDetectionState.observerContext,
        );
        this.queryConnectionEndToEndWorkflowState.packageableRuntime = runtime;
      }
      newGraph.addElement(
        this.queryConnectionEndToEndWorkflowState.packageableRuntime,
        extractPackagePathFromPath(
          this.queryConnectionEndToEndWorkflowState.targetRuntimePath,
        ),
      );
      this.queryConnectionEndToEndWorkflowState.graph = newGraph;
      this.queryConnectionEndToEndWorkflowState.setRuntimeGrammarCode(
        (yield this.editorStore.graphManagerState.graphManager.entitiesToPureCode(
          [
            this.editorStore.graphManagerState.graphManager.elementToEntity(
              this.queryConnectionEndToEndWorkflowState.packageableRuntime,
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
                this.queryConnectionEndToEndWorkflowState.packageableConnection,
              ),
            ),
          ],
          { pretty: true },
        )) as string;
      this.queryConnectionEndToEndWorkflowState.connectionGrammarCode =
        connectionGrammarCode;
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
    this.queryConnectionEndToEndWorkflowState.setFinalGrammarCode(
      this.databaseModelBuilderState.generatedGrammarCode
        .concat(this.queryConnectionEndToEndWorkflowState.runtimeGrammarCode)
        .concat(this.queryConnectionEndToEndWorkflowState.databaseGrammarCode)
        .concat(
          this.queryConnectionEndToEndWorkflowState.connectionGrammarCode,
        ),
    );
    this.queryConnectionEndToEndWorkflowState.activeStepToBaseStepperState.set(
      QUERY_CONNECTION_WORKFLOW_STEPS.CONFIRMATION,
      new QueryConnectionConfirmationAndGrammarEditorStepperState(
        this.queryConnectionEndToEndWorkflowState,
        QUERY_CONNECTION_WORKFLOW_STEPS.CONFIRMATION,
      ),
    );
  }

  override renderStepContent(): React.ReactNode {
    return (
      <QueryConnectionModelsEditor
        databaseModelBuilderStepperState={this}
        queryConnectionEndToEndWorkflowState={
          this.queryConnectionEndToEndWorkflowState
        }
      />
    );
  }
}

// step 3 - database grammar editor
export class DatabaseGrammarEditorStepperState extends BaseStepperState {
  queryConnectionEndToEndWorkflowState: QueryConnectionEndToEndWorkflowState;
  isCompilingGrammarCode = ActionState.create();
  editorStore: EditorStore;

  constructor(
    queryConnectionEndToEndWorkflowState: QueryConnectionEndToEndWorkflowState,
    stepLabel: string,
  ) {
    super(stepLabel);
    makeObservable(this, {
      queryConnectionEndToEndWorkflowState: false,
      stepLabel: observable,
      isCompilingGrammarCode: observable,
      buildDatabaseModelBuilderState: action,
      compileDatabaseGrammarCode: flow,
      handleNext: flow,
    });
    this.queryConnectionEndToEndWorkflowState =
      queryConnectionEndToEndWorkflowState;
    this.editorStore =
      this.queryConnectionEndToEndWorkflowState.globalEndToEndWorkflowState.editorStore;
  }

  *compileDatabaseGrammarCode(): GeneratorFn<void> {
    try {
      this.isCompilingGrammarCode.inProgress();
      const databaseBuilderStepperState =
        this.queryConnectionEndToEndWorkflowState.activeStepToBaseStepperState.get(
          QUERY_CONNECTION_WORKFLOW_STEPS.CREATE_DATABASE,
        ) as DatabaseBuilderStepperState;
      const connectionValueStepperState =
        this.queryConnectionEndToEndWorkflowState.activeStepToBaseStepperState.get(
          QUERY_CONNECTION_WORKFLOW_STEPS.CREATE_CONNECTION,
        ) as ConnectionValueStepperState;
      const compilationResult = (yield flowResult(
        yield this.editorStore.graphManagerState.graphManager.compileText(
          this.queryConnectionEndToEndWorkflowState.databaseGrammarCode,
          this.queryConnectionEndToEndWorkflowState.graph,
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
        this.queryConnectionEndToEndWorkflowState.isValid = false;
        this.editorStore.applicationStore.notificationService.notifyError(
          'Please make sure there is only one databse',
        );
      } else {
        this.queryConnectionEndToEndWorkflowState.isValid = true;
      }
      // databaseBuilderWizardState.schemaExplorerState.database needs to be updated
      databaseBuilderStepperState.databaseBuilderWizardState.schemaExplorerState.database =
        getNonNullableEntry(newGraph.databases, 0);
      this.queryConnectionEndToEndWorkflowState.graph = newGraph;
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
        this.queryConnectionEndToEndWorkflowState.graph.root,
        connectionValueStepperState.targetConnectionPath,
        true,
        new Map(),
      );
      packageableConnection_setConnectionValue(
        packageableConnection,
        connectionValueStepperState.connectionValueState.connection,
        this.queryConnectionEndToEndWorkflowState.globalEndToEndWorkflowState
          .editorStore.changeDetectionState.observerContext,
      );
      this.queryConnectionEndToEndWorkflowState.packageableConnection =
        packageableConnection;
      this.queryConnectionEndToEndWorkflowState.graph.addElement(
        packageableConnection,
        extractPackagePathFromPath(
          connectionValueStepperState.targetConnectionPath,
        ),
      );
      this.queryConnectionEndToEndWorkflowState.setCompileError(undefined);
      this.isCompilingGrammarCode.pass();
    } catch (error) {
      if (error instanceof ParserError || error instanceof CompilationError) {
        this.queryConnectionEndToEndWorkflowState.setCompileError(error);
      }
      this.queryConnectionEndToEndWorkflowState.isValid = false;
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
      this.queryConnectionEndToEndWorkflowState.activeStepToBaseStepperState.get(
        QUERY_CONNECTION_WORKFLOW_STEPS.CREATE_DATABASE,
      ) as DatabaseBuilderStepperState;
    const databaseModelBuilderState = new DatabaseModelBuilderState(
      this.editorStore,
      databaseBuilderStepperState.databaseBuilderWizardState.schemaExplorerState.database,
      false,
      this.queryConnectionEndToEndWorkflowState.graph,
    );
    this.queryConnectionEndToEndWorkflowState.activeStepToBaseStepperState.set(
      QUERY_CONNECTION_WORKFLOW_STEPS.CREATE_CLASS_MAPPING_RUNTIME,
      new DatabaseModelBuilderStepperState(
        this.queryConnectionEndToEndWorkflowState,
        QUERY_CONNECTION_WORKFLOW_STEPS.CREATE_CLASS_MAPPING_RUNTIME,
        databaseModelBuilderState,
      ),
    );
  }

  override *handleNext(): GeneratorFn<void> {
    yield flowResult(this.compileDatabaseGrammarCode()).then(() => {
      this.buildDatabaseModelBuilderState();
    });
  }

  override renderStepContent(): React.ReactNode {
    return (
      <QueryConnectionDatabaseGrammarEditor
        queryConnectionEndToEndWorkflowState={
          this.queryConnectionEndToEndWorkflowState
        }
        databaseGrammarEditorStepperState={this}
      />
    );
  }
}

// step 2 - build database
export class DatabaseBuilderStepperState extends BaseStepperState {
  queryConnectionEndToEndWorkflowState: QueryConnectionEndToEndWorkflowState;
  databaseBuilderWizardState: DatabaseBuilderWizardState;
  isGeneratingDatabaseGrammarCode = ActionState.create();
  editorStore: EditorStore;

  constructor(
    queryConnectionEndToEndWorkflowState: QueryConnectionEndToEndWorkflowState,
    stepLabel: string,
    databaseBuilderWizardState: DatabaseBuilderWizardState,
  ) {
    super(stepLabel);
    makeObservable(this, {
      queryConnectionEndToEndWorkflowState: false,
      stepLabel: observable,
      databaseBuilderWizardState: observable,
      isGeneratingDatabaseGrammarCode: observable,
      handleNext: flow,
      generateDatabaseGrammarCode: flow,
      buildDatabase: flow,
    });
    this.queryConnectionEndToEndWorkflowState =
      queryConnectionEndToEndWorkflowState;
    this.databaseBuilderWizardState = databaseBuilderWizardState;
    this.editorStore =
      this.queryConnectionEndToEndWorkflowState.globalEndToEndWorkflowState.editorStore;
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
      this.queryConnectionEndToEndWorkflowState.setDatabaseGrammarCode(
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
    this.queryConnectionEndToEndWorkflowState.activeStepToBaseStepperState.set(
      QUERY_CONNECTION_WORKFLOW_STEPS.EDIT_DATABASE,
      new DatabaseGrammarEditorStepperState(
        this.queryConnectionEndToEndWorkflowState,
        QUERY_CONNECTION_WORKFLOW_STEPS.EDIT_DATABASE,
      ),
    );
  }

  override renderStepContent(): React.ReactNode {
    return (
      <QueryConnectionDatabaseBuilderEditor
        databaseBuilderState={this.databaseBuilderWizardState}
      />
    );
  }
}

// step 1 - build connection
export class ConnectionValueStepperState extends BaseStepperState {
  queryConnectionEndToEndWorkflowState: QueryConnectionEndToEndWorkflowState;
  targetConnectionPath = DEFAULT_CONNECTION_PATH;
  connectionValueState: RelationalDatabaseConnectionValueState;

  constructor(
    queryConnectionEndToEndWorkflowState: QueryConnectionEndToEndWorkflowState,
    stepLabel: string,
  ) {
    super(stepLabel);
    makeObservable(this, {
      queryConnectionEndToEndWorkflowState: false,
      stepLabel: observable,
      targetConnectionPath: observable,
      connectionValueState: observable,
      setTargetConnectionPath: action,
      handleNext: flow,
    });
    this.queryConnectionEndToEndWorkflowState =
      queryConnectionEndToEndWorkflowState;
    this.connectionValueState = new RelationalDatabaseConnectionValueState(
      this.queryConnectionEndToEndWorkflowState.globalEndToEndWorkflowState.editorStore,
      observe_RelationalDatabaseConnection(
        this.createConnection,
        this.queryConnectionEndToEndWorkflowState.globalEndToEndWorkflowState
          .editorStore.changeDetectionState.observerContext,
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

  setTargetConnectionPath(val: string): void {
    this.targetConnectionPath = val;
  }

  override *handleNext(): GeneratorFn<void> {
    const databaseBuilderWizardState = new DatabaseBuilderWizardState(
      this.queryConnectionEndToEndWorkflowState.globalEndToEndWorkflowState.editorStore,
      this.connectionValueState.connection,
      false,
    );
    databaseBuilderWizardState.schemaExplorerState.setMakeTargetDatabasePathEditable(
      true,
    );
    this.queryConnectionEndToEndWorkflowState.activeStepToBaseStepperState.set(
      QUERY_CONNECTION_WORKFLOW_STEPS.CREATE_DATABASE,
      new DatabaseBuilderStepperState(
        this.queryConnectionEndToEndWorkflowState,
        QUERY_CONNECTION_WORKFLOW_STEPS.CREATE_DATABASE,
        databaseBuilderWizardState,
      ),
    );
  }

  override renderStepContent(): React.ReactNode {
    return (
      <QueryConnectionRelationalConnectionEditor
        queryConnectionEndToEndWorkflowState={
          this.queryConnectionEndToEndWorkflowState
        }
        connectionValueStepperState={this}
      />
    );
  }
}

export class QueryConnectionEndToEndWorkflowState {
  activeStep: number;
  activeStepToBaseStepperState = new Map<string, BaseStepperState>();
  activeStepToStepLabel = new Map<number, string>();
  globalEndToEndWorkflowState: GlobalEndToEndWorkflowState;
  queryConnectionEndToEndWorkflowEditorState: QueryConnectionEndToEndWorkflowEditorState;
  targetRuntimePath = DEFAULT_RUNTIME_PATH;
  packageableConnection: PackageableConnection | undefined;
  packageableRuntime: PackageableRuntime | undefined;
  databaseGrammarCode = '';
  runtimeGrammarCode = '';
  connectionGrammarCode = '';
  finalGrammarCode = '';
  graph: PureModel;
  isValid: boolean;
  compileError: ParserError | CompilationError | undefined;

  constructor(globalEndToEndWorkflowState: GlobalEndToEndWorkflowState) {
    makeObservable(this, {
      globalEndToEndWorkflowState: false,
      activeStep: observable,
      activeStepToBaseStepperState: observable,
      compileError: observable,
      packageableRuntime: observable,
      runtimeGrammarCode: observable,
      connectionGrammarCode: observable,
      finalGrammarCode: observable,
      targetRuntimePath: observable,
      isValid: observable,
      queryConnectionEndToEndWorkflowEditorState: observable,
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
    this.globalEndToEndWorkflowState = globalEndToEndWorkflowState;
    this.activeStepToBaseStepperState.set(
      QUERY_CONNECTION_WORKFLOW_STEPS.CREATE_CONNECTION,
      new ConnectionValueStepperState(
        this,
        QUERY_CONNECTION_WORKFLOW_STEPS.CREATE_CONNECTION,
      ),
    );
    this.queryConnectionEndToEndWorkflowEditorState =
      new QueryConnectionEndToEndWorkflowEditorState(
        this.globalEndToEndWorkflowState.editorStore,
      );
    this.graph =
      this.globalEndToEndWorkflowState.editorStore.graphManagerState.createNewGraph();
    this.initactiveStepToStepLabel();
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

  reset(): void {
    this.activeStep = -1;
    this.graph =
      this.globalEndToEndWorkflowState.editorStore.graphManagerState.createNewGraph();
    this.packageableConnection = undefined;
    this.packageableRuntime = undefined;
    this.activeStepToBaseStepperState.set(
      QUERY_CONNECTION_WORKFLOW_STEPS.CREATE_CONNECTION,
      new ConnectionValueStepperState(
        this,
        QUERY_CONNECTION_WORKFLOW_STEPS.CREATE_CONNECTION,
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
