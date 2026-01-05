/**
 * Copyright (c) 2025-present, Goldman Sachs
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

import { observable, action, computed, makeObservable, reaction } from 'mobx';
import { LambdaEditorState } from '@finos/legend-query-builder';
import {
  DQ_VALIDATION_HELPER_FUNCTIONS_LABEL,
  SUPPORTED_TYPES,
  DATA_QUALITY_TERMINAL_ASSERTION_HELPER_FUNCTIONS,
  type DATA_QUALITY_FILTER_VALIDATION_HELPER_FUNCTIONS,
  DATA_QUALITY_VALIDATION_HELPER_FUNCTIONS,
} from '../constants/DataQualityConstants.js';
import {
  isStubbed_RawLambda,
  matchFunctionName,
  PRECISE_PRIMITIVE_TYPE,
  PRIMITIVE_TYPE,
  RawLambda,
  type RelationTypeMetadata,
} from '@finos/legend-graph';

import type { DataQualityRelationValidation } from '../../graph-manager/index.js';
import { DataQualityValidationHelperRuleState } from './DataQualityValidationHelperRuleState.js';
import type { EditorStore } from '@finos/legend-application-studio';
import {
  dataQualityRelationValidation_setAssertion,
  dataQualityRelationValidation_setDescription,
} from '../../graph-manager/DSL_DataQuality_GraphModifierHelper.js';
import {
  DataQualityValidationHelperUtils,
  type LambdaBody,
} from '../utils/DataQualityValidationHelperUtils.js';
import { DataQualityValidationHelperFunction } from '../utils/DataQualityValidationHelperFunction.js';

export type LambdaEditorType = 'TEXT' | 'GUI';
export type ColumnOption = {
  value: string;
  label: string;
  type: string;
};

export abstract class LambdaEditorWithGUIState extends LambdaEditorState {
  abstract relationValidation: DataQualityRelationValidation;
  abstract editorStore: EditorStore;
  abstract relationTypeMetadata: RelationTypeMetadata;
  isGUISupportedLambda = false;
  editorType: LambdaEditorType = 'TEXT';
  isStub = false;
  relationValidationGUIState = new DataQualityValidationHelperRuleState();
  disableEditorToggle = false;
  columnOptions: ColumnOption[] = [];
  rulesChangeReaction: (() => void) | undefined = undefined;

  constructor(lambdaString: string, lambdaPrefix: string) {
    super(lambdaString, lambdaPrefix);
    makeObservable(this, {
      changeEditorType: action,
      canEditInGUI: computed,
      isTextEditor: computed,
      isGUIEditor: computed,
      convertLambdaToFlat: action,
      toggleEditorMode: action,
      relationValidationGUIState: observable,
      disableEditorToggle: observable,
      getRelationalColumns: action,
      columnOptions: observable,
      initializeGUIEditor: action,
      editorType: observable,
      isGUISupportedLambda: observable,
    });
  }

  get canEditInGUI() {
    return this.isGUISupportedLambda && !!this.columnOptions.length;
  }

  initializeGUIEditor() {
    this.checkIfValidationIsEditableInGUI();
    this.getRelationalColumns();

    if (this.canEditInGUI) {
      if (this.isStub) {
        this.convertStubLambdaToFlat();
      } else {
        this.convertLambdaToFlat();
      }
      this.changeEditorType('GUI');

      reaction(
        () => this.relationValidationGUIState.rule,
        () => {
          this.convertFlatLambdaToString();
          if (this.relationValidationGUIState.description) {
            dataQualityRelationValidation_setDescription(
              this.relationValidation,
              this.relationValidationGUIState.description,
            );
          }
        },
        {
          name: this.relationValidation._UUID,
        },
      );
    }
  }

  convertFlatLambdaToString() {
    if (!this.relationValidationGUIState.validateRule()) {
      return;
    }
    const assertion = this.convertFlatToLambda({
      assert: this.relationValidationGUIState.assertion,
      filters: this.relationValidationGUIState.filterHelpers,
    });

    dataQualityRelationValidation_setAssertion(
      this.relationValidation,
      new RawLambda(assertion.parameters, assertion.body),
    );
    this.convertLambdaObjectToGrammarString();
  }

  convertStubFlatLambdaToString() {
    const assertion = this.convertFlatToLambda({
      assert: this.relationValidationGUIState.assertion,
      filters: [],
    });

    dataQualityRelationValidation_setAssertion(
      this.relationValidation,
      new RawLambda(assertion.parameters, assertion.body),
    );
    this.convertLambdaObjectToGrammarString();
  }

  changeEditorType(newType: LambdaEditorType): void {
    if (newType === 'GUI' && !this.canEditInGUI) {
      this.editorType = 'TEXT';
      return;
    }
    this.editorType = newType;
  }

  get isTextEditor(): boolean {
    return this.editorType === 'TEXT';
  }

  get isGUIEditor(): boolean {
    return this.editorType === 'GUI';
  }

  getFunctionOptions(type: string): {
    label: string;
    value: DATA_QUALITY_FILTER_VALIDATION_HELPER_FUNCTIONS;
  }[] {
    const others =
      DataQualityValidationHelperUtils.getValidationFunctionsByColumnType('');
    return others
      .concat(
        type
          ? DataQualityValidationHelperUtils.getValidationFunctionsByColumnType(
              type,
            )
          : [],
      )
      .map((func) => ({
        label: DQ_VALIDATION_HELPER_FUNCTIONS_LABEL[func],
        value: func,
      }));
  }

  checkIfValidationIsEditableInGUI(): void {
    const lambda = this.relationValidation.assertion;
    if (isStubbed_RawLambda(lambda)) {
      this.isGUISupportedLambda = true;
      this.isStub = true;
      return;
    }

    const validateLambdaForGUI = ({
      function: functionName,
      parameters,
    }: LambdaBody): boolean => {
      if (
        !matchFunctionName(
          functionName as string,
          DATA_QUALITY_VALIDATION_HELPER_FUNCTIONS,
        ) ||
        !parameters.every((param) =>
          this.matchParameterType(param._type, param.type),
        )
      ) {
        return false;
      }

      if (!parameters.length) {
        return true;
      }

      return parameters
        .filter((param) => param._type === 'func')
        .every((param) => validateLambdaForGUI(param));
    };

    this.isGUISupportedLambda = validateLambdaForGUI(this.getLambdaBody());
  }

  matchParameterType(type?: string, subType?: string): boolean {
    if (type === SUPPORTED_TYPES.CLASS_INSTANCE) {
      return this.matchParameterType(subType as SUPPORTED_TYPES);
    }
    return Object.values(SUPPORTED_TYPES).includes(type as SUPPORTED_TYPES);
  }

  getLambdaBody(): LambdaBody {
    const lambda = this.relationValidation.assertion;

    return (
      Array.isArray(lambda.body) ? lambda.body[0] : lambda.body
    ) as LambdaBody;
  }

  updateAssertion = () => {
    this.convertLambdaToFlat();
    this.convertLambdaObjectToGrammarString();
  };

  toggleEditorMode(): void {
    if (this.isTextEditor) {
      this.changeEditorType('GUI');
      if (this.canEditInGUI) {
        this.convertLambdaToFlat();
        this.disableEditorToggle = false;
      }
    } else {
      this.changeEditorType('TEXT');
    }
  }

  convertLambdaToFlat() {
    const lambdaBody = this.getLambdaBody();
    const relationValidationGUIState =
      new DataQualityValidationHelperRuleState();

    this.relationValidationGUIState = relationValidationGUIState;

    const processLambdaBody = (body: LambdaBody) => {
      const { _type: type, function: functionName, parameters } = body;

      if (type === 'func') {
        const ruleFunction = new DataQualityValidationHelperFunction(
          functionName as string,
        );
        ruleFunction.createParameterFromLambda(body, this.columnOptions);
        this.relationValidationGUIState.addRuleFunction(ruleFunction);

        parameters
          .filter((param: LambdaBody) => param._type === 'func')
          .forEach((param: LambdaBody) => {
            processLambdaBody(param);
          });
      }
    };

    if (lambdaBody) {
      processLambdaBody(lambdaBody);
    }
  }

  convertStubLambdaToFlat() {
    const relationValidationGUIState =
      new DataQualityValidationHelperRuleState();

    this.relationValidationGUIState = relationValidationGUIState;

    const assertFunction = new DataQualityValidationHelperFunction(
      DATA_QUALITY_TERMINAL_ASSERTION_HELPER_FUNCTIONS.ASSERT_RELATION_EMPTY,
      true,
    );

    this.relationValidationGUIState.addRuleFunction(assertFunction);
    this.relationValidationGUIState.handleAssertChange(
      [],
      SUPPORTED_TYPES.COL_SPEC_ARRAY,
    );
    this.convertStubFlatLambdaToString();
  }

  getRelationalColumns() {
    this.columnOptions = this.relationTypeMetadata.columns.map(
      ({ name, type }) => {
        return {
          value: name,
          label: name,
          type: this.getTypeFromPath(type),
        };
      },
    );
  }

  getTypeFromPath(type: string) {
    switch (type) {
      case PRECISE_PRIMITIVE_TYPE.VARCHAR:
        return PRIMITIVE_TYPE.STRING;
      case PRECISE_PRIMITIVE_TYPE.INT:
      case PRECISE_PRIMITIVE_TYPE.TINY_INT:
      case PRECISE_PRIMITIVE_TYPE.U_TINY_INT:
      case PRECISE_PRIMITIVE_TYPE.SMALL_INT:
      case PRECISE_PRIMITIVE_TYPE.U_SMALL_INT:
      case PRECISE_PRIMITIVE_TYPE.U_INT:
      case PRECISE_PRIMITIVE_TYPE.U_BIG_INT:
      case PRECISE_PRIMITIVE_TYPE.BIG_INT:
      case PRECISE_PRIMITIVE_TYPE.FLOAT:
      case PRECISE_PRIMITIVE_TYPE.DECIMAL:
      case PRECISE_PRIMITIVE_TYPE.DOUBLE:
      case PRECISE_PRIMITIVE_TYPE.NUMERIC:
        return PRIMITIVE_TYPE.NUMBER;
      case PRECISE_PRIMITIVE_TYPE.STRICTDATE:
      case PRECISE_PRIMITIVE_TYPE.DATETIME:
      case PRECISE_PRIMITIVE_TYPE.TIMESTAMP:
        return PRIMITIVE_TYPE.DATE;
      default:
        return 'Unknown';
    }
  }

  convertFlatToLambda(rules: {
    assert: DataQualityValidationHelperFunction | undefined;
    filters: DataQualityValidationHelperFunction[];
  }): {
    body: LambdaBody[];
    parameters: LambdaBody[];
  } {
    const { assert, filters } = rules;

    if (!assert) {
      throw new Error('Assert function is required for lambda conversion');
    }

    const functionBody: LambdaBody = this.convertFunctionToLambdaBody(assert);

    let previousFilterLambda = functionBody;
    for (const filter of filters) {
      const filterLambda = this.convertFunctionToLambdaBody(filter);
      if (previousFilterLambda.function !== filterLambda.function) {
        previousFilterLambda.parameters.unshift(filterLambda);
        previousFilterLambda = filterLambda;
      }
    }

    return {
      body: [functionBody],
      parameters: [
        {
          _type: 'var',
          name: 'rel',
        } as LambdaBody,
      ],
    };
  }

  private convertFunctionToLambdaBody(
    func: DataQualityValidationHelperFunction,
  ): LambdaBody {
    const parameters: LambdaBody[] = [];
    const { columns, otherParams, relationalRef } = func.parameters;

    if (relationalRef) {
      parameters.push({
        _type: relationalRef.type,
        name: relationalRef.value,
      } as LambdaBody);
    }

    if (columns) {
      const { value, type } = columns;

      if (type === SUPPORTED_TYPES.COL_SPEC_ARRAY && Array.isArray(value)) {
        const columnArray = value;
        parameters.push({
          _type: SUPPORTED_TYPES.CLASS_INSTANCE,
          type: SUPPORTED_TYPES.COL_SPEC_ARRAY,
          value: {
            colSpecs: columnArray.map((col: string) => ({
              name: col,
            })),
          },
        } as LambdaBody);
      } else {
        const columnName = value;
        parameters.push({
          _type: SUPPORTED_TYPES.CLASS_INSTANCE,
          type: SUPPORTED_TYPES.COL_SPEC,
          value: {
            name: columnName as string,
          },
        } as LambdaBody);
      }
    }

    otherParams.forEach((param) => {
      if (param.value !== undefined) {
        parameters.push({
          _type: param.type,
          value: param.value,
        } as LambdaBody);
      }
    });

    return {
      _type: 'func',
      function: func.name,
      parameters,
    };
  }
}
