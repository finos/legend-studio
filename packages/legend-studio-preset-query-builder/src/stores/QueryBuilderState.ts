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
import type { GeneratorFn } from '@finos/legend-studio-shared';
import {
  assertErrorThrown,
  changeEntry,
  guaranteeNonNullable,
  guaranteeType,
} from '@finos/legend-studio-shared';
import type { QueryBuilderFilterOperator } from './QueryBuilderFilterState';
import { QueryBuilderFilterState } from './QueryBuilderFilterState';
import { QueryBuilderFetchStructureState } from './QueryBuilderFetchStructureState';
import { QueryResultSetModifierState } from './QueryResultSetModifierState';
import {
  QueryTextEditorMode,
  QueryTextEditorState,
} from './QueryTextEditorState';
import { QueryBuilderSetupState } from './QueryBuilderSetupState';
import { QueryBuilderExplorerState } from './QueryBuilderExplorerState';
import { QueryBuilderResultState } from './QueryBuilderResultState';
import { QueryBuilderLambdaProcessor } from './QueryBuilderLambdaProcessor';
import { QueryBuilderUnsupportedState } from './QueryBuilderUnsupportedState';
import type { EditorStore, LambdaFunction } from '@finos/legend-studio';
import {
  EditorExtensionState,
  CompilationError,
  CORE_LOG_EVENT,
  getElementCoordinates,
  LambdaFunctionInstanceValue,
  RawLambda,
  TYPICAL_MULTIPLICITY_TYPE,
} from '@finos/legend-studio';
import {
  QueryBuilderFilterOperator_Equal,
  QueryBuilderFilterOperator_NotEqual,
} from './filterOperators/QueryBuilderFilterOperator_Equal';
import { QueryBuilderFilterOperator_GreaterThan } from './filterOperators/QueryBuilderFilterOperator_GreaterThan';
import {
  QueryBuilderFilterOperator_NotStartWith,
  QueryBuilderFilterOperator_StartWith,
} from './filterOperators/QueryBuilderFilterOperator_StartWith';
import { QueryBuilderFilterOperator_GreaterThanEqual } from './filterOperators/QueryBuilderFilterOperator_GreaterThanEqual';
import { QueryBuilderFilterOperator_LessThanEqual } from './filterOperators/QueryBuilderFilterOperator_LessThanEqual';
import { QueryBuilderFilterOperator_LessThan } from './filterOperators/QueryBuilderFilterOperator_LessThan';
import {
  QueryBuilderFilterOperator_EndWith,
  QueryBuilderFilterOperator_NotEndWith,
} from './filterOperators/QueryBuilderFilterOperator_EndWith';
import {
  QueryBuilderFilterOperator_Contain,
  QueryBuilderFilterOperator_NotContain,
} from './filterOperators/QueryBuilderFilterOperator_Contain';
import {
  QueryBuilderFilterOperator_IsEmpty,
  QueryBuilderFilterOperator_IsNotEmpty,
} from './filterOperators/QueryBuilderFilterOperator_IsEmpty';
import {
  QueryBuilderFilterOperator_In,
  QueryBuilderFilterOperator_NotIn,
} from './filterOperators/QueryBuilderFilterOperator_In';
import { buildLambdaFunction } from './QueryBuilderLambdaBuilder';

export class QueryBuilderState extends EditorExtensionState {
  editorStore: EditorStore;
  querySetupState: QueryBuilderSetupState;
  explorerState: QueryBuilderExplorerState;
  fetchStructureState: QueryBuilderFetchStructureState;
  filterState: QueryBuilderFilterState;
  resultSetModifierState: QueryResultSetModifierState;
  resultState: QueryBuilderResultState;
  queryTextEditorState: QueryTextEditorState;
  queryUnsupportedState: QueryBuilderUnsupportedState;
  openQueryBuilder = false;
  filterOperators: QueryBuilderFilterOperator[] = [
    new QueryBuilderFilterOperator_Equal(),
    new QueryBuilderFilterOperator_NotEqual(),
    new QueryBuilderFilterOperator_LessThan(),
    new QueryBuilderFilterOperator_LessThanEqual(),
    new QueryBuilderFilterOperator_GreaterThan(),
    new QueryBuilderFilterOperator_GreaterThanEqual(),
    new QueryBuilderFilterOperator_StartWith(),
    new QueryBuilderFilterOperator_NotStartWith(),
    new QueryBuilderFilterOperator_Contain(),
    new QueryBuilderFilterOperator_NotContain(),
    new QueryBuilderFilterOperator_EndWith(),
    new QueryBuilderFilterOperator_NotEndWith(),
    new QueryBuilderFilterOperator_In(),
    new QueryBuilderFilterOperator_NotIn(),
    new QueryBuilderFilterOperator_IsEmpty(),
    new QueryBuilderFilterOperator_IsNotEmpty(),
  ];

  constructor(editorStore: EditorStore) {
    super();

    makeObservable(this, {
      querySetupState: observable,
      explorerState: observable,
      fetchStructureState: observable,
      filterState: observable,
      resultSetModifierState: observable,
      resultState: observable,
      queryTextEditorState: observable,
      queryUnsupportedState: observable,
      openQueryBuilder: observable,
      setOpenQueryBuilder: flow,
      reset: action,
      resetData: action,
      buildStateFromRawLambda: action,
      saveQuery: action,
    });

    this.editorStore = editorStore;
    this.querySetupState = new QueryBuilderSetupState(editorStore, this);
    this.explorerState = new QueryBuilderExplorerState(editorStore, this);
    this.fetchStructureState = new QueryBuilderFetchStructureState(
      editorStore,
      this,
    );
    this.filterState = new QueryBuilderFilterState(
      editorStore,
      this,
      this.filterOperators,
    );
    this.resultSetModifierState = new QueryResultSetModifierState(
      editorStore,
      this,
    );
    this.resultState = new QueryBuilderResultState(editorStore, this);
    this.queryTextEditorState = new QueryTextEditorState(editorStore, this);
    this.queryUnsupportedState = new QueryBuilderUnsupportedState(
      editorStore,
      this,
    );
  }

  getQuery(): RawLambda {
    return this.isQuerySupported()
      ? this.buildRawLambdaFromLambdaFunction(buildLambdaFunction(this))
      : guaranteeNonNullable(this.queryUnsupportedState.rawLambda);
  }

  /**
   * When opening query builder, we ensure the graph compiles successfully
   */
  *setOpenQueryBuilder(
    val: boolean,
    options?: { disableCompile: boolean },
  ): GeneratorFn<void> {
    if (!this.editorStore.isInFormMode) {
      return;
    }
    if (val === this.openQueryBuilder) {
      return;
    }
    if (val) {
      if (!options?.disableCompile) {
        this.editorStore.setBlockingAlert({
          message: 'Compiling graph before building query...',
          showLoading: true,
        });
        yield flowResult(
          this.editorStore.graphState.globalCompileInFormMode({
            disableNotificationOnSuccess: true,
          }),
        );
        this.editorStore.setBlockingAlert(undefined);
      }
      if (!this.editorStore.graphState.hasCompilationError) {
        this.openQueryBuilder = val;
      }
      this.editorStore.setBlockGlobalHotkeys(true);
    } else {
      this.openQueryBuilder = val;
      this.editorStore.setBlockGlobalHotkeys(false);
    }
  }

  reset(): void {
    changeEntry(
      this.editorStore.editorExtensionStates,
      this.editorStore.getEditorExtensionState(QueryBuilderState),
      new QueryBuilderState(this.editorStore),
    );
  }

  resetData(): void {
    this.explorerState = new QueryBuilderExplorerState(this.editorStore, this);
    const fetchStructureState = new QueryBuilderFetchStructureState(
      this.editorStore,
      this,
    );
    fetchStructureState.setFetchStructureMode(
      this.fetchStructureState.fetchStructureMode,
    );
    this.fetchStructureState = fetchStructureState;
    this.filterState = new QueryBuilderFilterState(
      this.editorStore,
      this,
      this.filterOperators,
    );
    this.resultSetModifierState = new QueryResultSetModifierState(
      this.editorStore,
      this,
    );
    const resultState = new QueryBuilderResultState(this.editorStore, this);
    resultState.setPreviewLimit(this.resultState.previewLimit);
    this.resultState = resultState;
    this.queryTextEditorState = new QueryTextEditorState(
      this.editorStore,
      this,
    );
    this.queryUnsupportedState = new QueryBuilderUnsupportedState(
      this.editorStore,
      this,
    );
    this.explorerState.refreshTreeData();
    this.fetchStructureState.graphFetchTreeState.init();
  }

  setQuerySetupState(val: QueryBuilderSetupState): void {
    this.querySetupState = val;
  }

  init(rawLambda: RawLambda, options?: { notifyError: boolean }): void {
    try {
      this.buildStateFromRawLambda(rawLambda);
    } catch (error: unknown) {
      this.querySetupState.setClass(undefined, true);
      this.resetData();
      assertErrorThrown(error);
      if (options?.notifyError) {
        this.editorStore.applicationStore.notifyError(
          `Unable to initialize query builder: ${error.message}`,
        );
      }
      this.queryUnsupportedState.setLambdaError(error);
      this.queryUnsupportedState.setRawLambda(rawLambda);
    }
  }

  /**
   * Process the raw lambda, and build the query builder state.
   *
   * @throws error if there is an issue building the compiled lambda or rebuilding the state.
   * consumers of function should handle the errors.
   */
  buildStateFromRawLambda(rawLambda: RawLambda): void {
    this.resetData();
    if (!rawLambda.isStub) {
      const valueSpec =
        this.editorStore.graphState.graphManager.buildValueSpecification(
          this.editorStore.graphState.graphManager.serializeRawValueSpecification(
            rawLambda,
          ),
          this.editorStore.graphState.graph,
        );
      const compiledValueSpecification = guaranteeType(
        valueSpec,
        LambdaFunctionInstanceValue,
      );
      const compiledLambda = guaranteeNonNullable(
        compiledValueSpecification.values[0],
      );
      compiledLambda.expressionSequence.map((e) =>
        e.accept_ValueSpecificationVisitor(
          new QueryBuilderLambdaProcessor(this, undefined),
        ),
      );
    }
  }

  buildRawLambdaFromLambdaFunction(lambdaFunction: LambdaFunction): RawLambda {
    const lambdaFunctionInstanceValue = new LambdaFunctionInstanceValue(
      this.editorStore.graphState.graph.getTypicalMultiplicity(
        TYPICAL_MULTIPLICITY_TYPE.ONE,
      ),
      undefined,
    );
    lambdaFunctionInstanceValue.values = [lambdaFunction];
    return guaranteeType(
      this.editorStore.graphState.graphManager.buildRawValueSpecification(
        lambdaFunctionInstanceValue,
        this.editorStore.graphState.graph,
      ),
      RawLambda,
    );
  }

  async saveQuery(): Promise<void> {
    const onQuerySave = this.querySetupState.onSave;
    if (onQuerySave) {
      try {
        const rawLambda = this.getQuery();
        await onQuerySave(rawLambda);
      } catch (error: unknown) {
        assertErrorThrown(error);
        this.editorStore.applicationStore.notifyError(
          `Unable to save query: ${error.message}`,
        );
      }
    }
  }

  isEditingInTextMode(): boolean {
    return (
      this.openQueryBuilder &&
      this.queryTextEditorState.mode === QueryTextEditorMode.TEXT
    );
  }

  isQuerySupported(): boolean {
    return !this.queryUnsupportedState.rawLambda;
  }

  compileQuery = flow(function* (this: QueryBuilderState) {
    if (this.isEditingInTextMode()) {
      try {
        this.queryTextEditorState.setCompilationError(undefined);
        (yield this.editorStore.graphState.graphManager.getLambdaReturnType(
          this.queryTextEditorState.rawLambdaState.lambda,
          this.editorStore.graphState.graph,
        )) as string;
        this.editorStore.applicationStore.notifySuccess('Compiled sucessfully');
      } catch (error: unknown) {
        assertErrorThrown(error);
        if (error instanceof CompilationError) {
          this.editorStore.applicationStore.logger.error(
            CORE_LOG_EVENT.COMPILATION_PROBLEM,
            error,
          );
          const errorElementCoordinates = getElementCoordinates(
            error.sourceInformation,
          );
          if (errorElementCoordinates) {
            this.queryTextEditorState.setCompilationError(error);
          }
        }
      }
    }
  });
}
