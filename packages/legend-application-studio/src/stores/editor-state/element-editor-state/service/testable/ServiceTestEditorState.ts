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
  type ServiceTest,
  type Service,
  type ValueSpecification,
  type RawLambda,
  observe_ValueSpecification,
  ParameterValue,
  buildLambdaVariableExpressions,
  VariableExpression,
} from '@finos/legend-graph';
import { action, flow, makeObservable, observable } from 'mobx';
import { TestableTestEditorState } from '../../testable/TestableEditorState.js';
import type { ServiceTestSuiteState } from './ServiceTestableState.js';
import {
  service_addParameterValue,
  service_deleteParameterValue,
  service_setParameterName,
  service_setParameterValues,
  service_setParameterValueSpec,
  service_setSerializationFormat,
} from '../../../../shared/modifier/DSL_Service_GraphModifierHelper.js';
import {
  assertErrorThrown,
  deleteEntry,
  filterByType,
  guaranteeNonNullable,
  isNonNullable,
  returnUndefOnError,
  uuid,
} from '@finos/legend-shared';
import type { EditorStore } from '../../../../EditorStore.js';
import { generateVariableExpressionMockValue } from '@finos/legend-query-builder';

export enum SERIALIZATION_FORMAT {
  PURE = 'PURE',
  // Temporary remove this option as it is currently not being read correctly.
  // See https://github.com/finos/legend-engine/pull/799
  // DEFAULT = 'DEFAULT',
  PURE_TDSOBJECT = 'PURE_TDSOBJECT',
}

export enum SERIALIZATION_FORMAT_LABEL {
  PURE = 'PURE',
  TDS = 'TDS',
}

const getSerializationFormatLabel = (val: string): string => {
  switch (val) {
    case SERIALIZATION_FORMAT.PURE:
      return SERIALIZATION_FORMAT.PURE;
    case SERIALIZATION_FORMAT.PURE_TDSOBJECT:
      return SERIALIZATION_FORMAT_LABEL.TDS;
    default:
      return val;
  }
};

export type SerializationFormatOption = {
  value: string;
  label: string;
};

export class ServiceTestParameterState {
  readonly uuid = uuid();
  readonly editorStore: EditorStore;
  readonly setupState: ServiceTestSetupState;
  parameterValue: ParameterValue;
  constructor(
    parameterValue: ParameterValue,
    editorStore: EditorStore,
    setupState: ServiceTestSetupState,
  ) {
    this.editorStore = editorStore;
    this.setupState = setupState;
    this.parameterValue = parameterValue;
  }
}

export class ServiceValueSpecificationTestParameterState extends ServiceTestParameterState {
  valueSpec: ValueSpecification;
  varExpression: VariableExpression;
  constructor(
    parameterValue: ParameterValue,
    editorStore: EditorStore,
    setupState: ServiceTestSetupState,
    valueSpec: ValueSpecification,
    varExpression: VariableExpression,
  ) {
    super(parameterValue, editorStore, setupState);
    makeObservable(this, {
      setName: observable,
      valueSpec: observable,
      parameterValue: observable,
      resetValueSpec: action,
      updateValueSpecification: action,
      updateParameterValue: action,
    });
    this.valueSpec = valueSpec;
    this.varExpression = varExpression;
  }

  updateValueSpecification(val: ValueSpecification): void {
    this.valueSpec = observe_ValueSpecification(
      val,
      this.editorStore.changeDetectionState.observerContext,
    );
    this.updateParameterValue();
  }

  updateParameterValue(): void {
    const updatedValueSpec =
      this.editorStore.graphManagerState.graphManager.serializeValueSpecification(
        this.valueSpec,
      );
    service_setParameterValueSpec(this.parameterValue, updatedValueSpec);
  }

  setName(val: string): void {
    service_setParameterName(this.parameterValue, val);
  }

  resetValueSpec(): void {
    const mockValue = generateVariableExpressionMockValue(
      this.varExpression,
      this.editorStore.graphManagerState.graph,
    );
    if (mockValue) {
      this.updateValueSpecification(mockValue);
    }
  }
}

export class ServiceTestSetupState {
  readonly editorStore: EditorStore;
  readonly testState: ServiceTestState;
  parameterValueStates: ServiceTestParameterState[] = [];
  newParameterValueName = '';
  showNewParameterModal = false;

  constructor(testState: ServiceTestState) {
    this.testState = testState;
    this.editorStore = testState.editorStore;
    makeObservable(this, {
      changeSerializationFormat: action,
      parameterValueStates: observable,
      buildParameterStates: action,
      newParameterValueName: observable,
      showNewParameterModal: observable,
      setNewParameterValueName: action,
      setShowNewParameterModal: action,
      openNewParamModal: action,
      addParameterValue: action,
      syncWithQuery: action,
      removeParamValueState: action,
    });
    this.parameterValueStates = this.buildParameterStates();
  }

  get serviceQuery(): RawLambda | undefined {
    return this.testState.suiteState.testableState.serviceEditorState
      .executionState.serviceExecutionParameters?.query;
  }

  get queryVariableExpressions(): VariableExpression[] {
    return this.serviceQuery
      ? buildLambdaVariableExpressions(
          this.serviceQuery,
          this.editorStore.graphManagerState,
        ).filter(filterByType(VariableExpression))
      : [];
  }
  get options(): SerializationFormatOption[] {
    return Object.values(SERIALIZATION_FORMAT).map((e) => ({
      value: e,
      label: getSerializationFormatLabel(e),
    }));
  }

  get newParamOptions(): { value: string; label: string }[] {
    const queryVarExpressions = this.queryVariableExpressions;
    const currentParams = this.testState.test.parameters;
    return queryVarExpressions
      .filter((v) => !currentParams.find((i) => i.name === v.name))
      .map((e) => ({ value: e.name, label: e.name }));
  }

  syncWithQuery(): void {
    // remove non existing params
    this.parameterValueStates.forEach((paramState) => {
      const expression = this.queryVariableExpressions.find(
        (v) => v.name === paramState.parameterValue.name,
      );
      if (!expression) {
        deleteEntry(this.parameterValueStates, paramState);
        service_deleteParameterValue(
          this.testState.test,
          paramState.parameterValue,
        );
      }
    });
    // add new required params
    this.queryVariableExpressions.forEach((v) => {
      const multiplicity = v.multiplicity;
      const isRequired = multiplicity.lowerBound > 0;
      const paramState = this.parameterValueStates.find(
        (p) => p.parameterValue.name === v.name,
      );
      if (!paramState && isRequired) {
        this.addExpressionParameterValue(v);
      }
    });
  }

  setNewParameterValueName(val: string): void {
    this.newParameterValueName = val;
  }

  setShowNewParameterModal(val: boolean): void {
    this.showNewParameterModal = val;
  }

  openNewParamModal(): void {
    this.setShowNewParameterModal(true);
    const option = this.newParamOptions[0];
    if (option) {
      this.newParameterValueName = option.value;
    }
  }

  addParameterValue(): void {
    try {
      const expressions = this.queryVariableExpressions;
      const expression = guaranteeNonNullable(
        expressions.find((v) => v.name === this.newParameterValueName),
      );
      this.addExpressionParameterValue(expression);
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.notifyError(error);
    } finally {
      this.setShowNewParameterModal(false);
    }
  }

  addExpressionParameterValue(expression: VariableExpression): void {
    try {
      const mockValue = guaranteeNonNullable(
        generateVariableExpressionMockValue(
          expression,
          this.editorStore.graphManagerState.graph,
        ),
      );
      const paramValue = new ParameterValue();
      paramValue.name = expression.name;
      paramValue.value =
        this.editorStore.graphManagerState.graphManager.serializeValueSpecification(
          mockValue,
        );
      service_addParameterValue(this.testState.test, paramValue);
      const paramValueState = new ServiceValueSpecificationTestParameterState(
        paramValue,
        this.editorStore,
        this,
        observe_ValueSpecification(
          mockValue,
          this.editorStore.changeDetectionState.observerContext,
        ),
        expression,
      );
      this.parameterValueStates.push(paramValueState);
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.notifyError(error);
    }
  }

  removeParamValueState(paramState: ServiceTestParameterState): void {
    deleteEntry(this.parameterValueStates, paramState);
    service_deleteParameterValue(
      this.testState.test,
      paramState.parameterValue,
    );
  }

  buildParameterStates(): ServiceTestParameterState[] {
    const varExpressions = this.queryVariableExpressions;
    const paramValues = this.testState.test.parameters;
    return paramValues.map((pValue) => {
      const spec = returnUndefOnError(() =>
        this.editorStore.graphManagerState.graphManager.buildValueSpecification(
          pValue.value as Record<PropertyKey, unknown>,
          this.editorStore.graphManagerState.graph,
        ),
      );
      const expression = varExpressions.find((e) => e.name === pValue.name);
      return spec && expression
        ? new ServiceValueSpecificationTestParameterState(
            pValue,
            this.editorStore,
            this,
            observe_ValueSpecification(
              spec,
              this.editorStore.changeDetectionState.observerContext,
            ),
            expression,
          )
        : new ServiceTestParameterState(pValue, this.editorStore, this);
    });
  }

  getSelectedFormatOption(): SerializationFormatOption | undefined {
    const test = this.testState.test;
    if (test.serializationFormat) {
      return {
        value: test.serializationFormat,
        label: getSerializationFormatLabel(test.serializationFormat),
      };
    }
    return undefined;
  }

  changeSerializationFormat(val: string | undefined): void {
    service_setSerializationFormat(this.testState.test, val);
  }

  generateTestParameterValues(): void {
    try {
      const varExpressions = this.queryVariableExpressions;
      const parameterValueStates = varExpressions
        .map((varExpression) => {
          const mockValue = generateVariableExpressionMockValue(
            varExpression,
            this.editorStore.graphManagerState.graph,
          );
          if (mockValue) {
            const paramValue = new ParameterValue();
            paramValue.name = varExpression.name;
            paramValue.value =
              this.editorStore.graphManagerState.graphManager.serializeValueSpecification(
                mockValue,
              );
            return new ServiceValueSpecificationTestParameterState(
              paramValue,
              this.editorStore,
              this,
              mockValue,
              varExpression,
            );
          }
          return undefined;
        })
        .filter(isNonNullable);
      service_setParameterValues(
        this.testState.test,
        parameterValueStates.map((s) => s.parameterValue),
      );
      this.parameterValueStates = parameterValueStates;
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.notifyError(
        `Unable to generate param values: ${error.message}`,
      );
    }
  }
}

export class ServiceTestState extends TestableTestEditorState {
  readonly suiteState: ServiceTestSuiteState;
  override test: ServiceTest;
  override testable: Service;
  setupState: ServiceTestSetupState;
  constructor(suiteState: ServiceTestSuiteState, test: ServiceTest) {
    super(
      suiteState.testableState.serviceEditorState.service,
      test,
      suiteState.testableState.serviceEditorState.isReadOnly,
      suiteState.editorStore,
    );
    makeObservable(this, {
      selectedAsertionState: observable,
      selectedTab: observable,
      assertionToRename: observable,
      assertionEditorStates: observable,
      testResultState: observable,
      runningTestAction: observable,
      setupState: observable,
      addAssertion: action,
      setAssertionToRename: action,
      handleTestResult: action,
      setSelectedTab: action,
      runTest: flow,
    });
    this.test = test;
    this.suiteState = suiteState;
    this.testable = suiteState.testableState.serviceEditorState.service;
    this.setupState = new ServiceTestSetupState(this);
  }
}
