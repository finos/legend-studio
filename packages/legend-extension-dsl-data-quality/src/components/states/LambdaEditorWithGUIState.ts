/**
 * Copyright (c) 2026-present, Goldman Sachs
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

import { observable, action, computed, makeObservable, flow } from 'mobx';
import { LambdaEditorState } from '@finos/legend-query-builder';
import { SUPPORTED_TYPES } from '../constants/DataQualityConstants.js';
import {
  getPrimitiveTypeEnumFromPrecisePrimitiveTypeEnum,
  isStubbed_RawLambda,
  type PRECISE_PRIMITIVE_TYPE,
  RawLambda,
  type RelationTypeColumnMetadata,
} from '@finos/legend-graph';

import type { DataQualityRelationValidation } from '../../graph-manager/index.js';
import type { EditorStore } from '@finos/legend-application-studio';
import {
  dataQualityRelationValidation_setAssertion,
  dataQualityRelationValidation_setDescription,
  dataQualityRelationValidation_setName,
} from '../../graph-manager/DSL_DataQuality_GraphModifierHelper.js';
import {
  assertErrorThrown,
  debounce,
  guaranteeNonNullable,
} from '@finos/legend-shared';
import type { LambdaBody } from '../utils/DataQualityLambdaParameterParser.js';
import { DataQualityValidationLambdaFormState } from './DataQualityValidationLambdaFormState.js';

export enum LambdaEditorType {
  TEXT = 'TEXT',
  GUI = 'GUI',
}
export type ColumnOption = {
  value: string;
  label: string;
  type: string;
};

export abstract class LambdaEditorWithGUIState extends LambdaEditorState {
  abstract relationValidation: DataQualityRelationValidation;
  abstract editorStore: EditorStore;
  isGUISupportedLambda = false;
  editorType: LambdaEditorType = LambdaEditorType.TEXT;
  isStub = false;
  dataQualityValidationLambdaFormState:
    | DataQualityValidationLambdaFormState
    | undefined;
  disableEditorToggle = false;
  columnOptions: ColumnOption[] = [];
  isCurrentNameSameAsComputed = false;
  readonly debouncedHandleValidationFormChange: ReturnType<typeof debounce>;

  constructor(lambdaString: string, lambdaPrefix: string) {
    super(lambdaString, lambdaPrefix);
    makeObservable(this, {
      changeEditorType: action,
      canEditInGUI: computed,
      isTextEditor: computed,
      isGUIEditor: computed,
      toggleEditorMode: action,
      dataQualityValidationLambdaFormState: observable,
      disableEditorToggle: observable,
      setColumnOptions: action,
      columnOptions: observable,
      initializeGUIEditor: action,
      editorType: observable,
      isGUISupportedLambda: observable,
      handleValidationFormChange: flow,
      tryParsingPureLambdaToGUIFormat: action,
      isCurrentNameSameAsComputed: observable,
      checkIfNameIsComputed: action,
      convertStubLambdaToValidationLambdaFormRule: action,
      setDataQualityValidationLambdaFormState: action,
    });

    this.debouncedHandleValidationFormChange = debounce(() => {
      this.handleValidationFormChange();
    }, 2000);
  }

  *handleValidationFormChange() {
    try {
      const lambda =
        this.dataQualityValidationLambdaFormState?.toPureLambdaObject();
      dataQualityRelationValidation_setAssertion(
        this.relationValidation,
        new RawLambda(lambda?.parameters, lambda?.body),
      );
      yield this.convertLambdaObjectToGrammarString();
      yield this.convertLambdaGrammarStringToObject();
      dataQualityRelationValidation_setDescription(
        this.relationValidation,
        guaranteeNonNullable(
          this.dataQualityValidationLambdaFormState?.getDescription(),
        ),
      );

      if (this.isCurrentNameSameAsComputed) {
        dataQualityRelationValidation_setName(
          this.relationValidation,
          guaranteeNonNullable(
            this.dataQualityValidationLambdaFormState?.getSuggestedName(),
          ),
        );
      } else {
        this.checkIfNameIsComputed();
      }
    } catch (error) {
      assertErrorThrown(error);
    }
  }

  get canEditInGUI() {
    return this.isGUISupportedLambda && !!this.columnOptions.length;
  }

  setDataQualityValidationLambdaFormState() {
    this.dataQualityValidationLambdaFormState =
      new DataQualityValidationLambdaFormState(
        this.editorStore.graphManagerState,
        this.editorStore.changeDetectionState.observerContext,
      );
  }

  initializeGUIEditor(columns: RelationTypeColumnMetadata[]) {
    this.setColumnOptions(columns);
    this.setDataQualityValidationLambdaFormState();
    const isSuccessful = this.tryParsingPureLambdaToGUIFormat();

    if (isSuccessful) {
      this.changeEditorType(LambdaEditorType.GUI);
      this.checkIfNameIsComputed();
    } else {
      this.changeEditorType(LambdaEditorType.TEXT);
    }
  }

  checkIfNameIsComputed() {
    if (this.dataQualityValidationLambdaFormState) {
      this.isCurrentNameSameAsComputed =
        this.relationValidation.name ===
        this.dataQualityValidationLambdaFormState.getSuggestedName();
    }
  }

  tryParsingPureLambdaToGUIFormat(): boolean {
    try {
      if (this.columnOptions.length) {
        if (isStubbed_RawLambda(this.relationValidation.assertion)) {
          this.convertStubLambdaToValidationLambdaFormRule();
        } else {
          this.convertLambdaToValidationLambdaFormRule();
        }
        this.isGUISupportedLambda = true;
        return true;
      } else {
        throw Error(
          'Could not initiate graphical validation editor, no columns found. Please make sure query is running properly',
        );
      }
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.notificationService.notifyError(
        error.message,
      );
      this.isGUISupportedLambda = false;
      return false;
    }
  }

  changeEditorType(newType: LambdaEditorType): void {
    if (newType === LambdaEditorType.GUI && !this.canEditInGUI) {
      this.editorType = LambdaEditorType.TEXT;
      return;
    }
    this.editorType = newType;
  }

  get isTextEditor(): boolean {
    return this.editorType === LambdaEditorType.TEXT;
  }

  get isGUIEditor(): boolean {
    return this.editorType === LambdaEditorType.GUI;
  }

  getLambdaBody(): LambdaBody {
    const lambda = this.relationValidation.assertion;
    return (
      Array.isArray(lambda.body) ? lambda.body[0] : lambda.body
    ) as LambdaBody;
  }

  toggleEditorMode(): void {
    if (this.isTextEditor) {
      if (this.canEditInGUI) {
        this.changeEditorType(LambdaEditorType.GUI);
        this.convertLambdaToValidationLambdaFormRule();
        this.checkIfNameIsComputed();
        this.disableEditorToggle = false;
      }
    } else {
      this.changeEditorType(LambdaEditorType.TEXT);
    }
  }

  convertLambdaToValidationLambdaFormRule() {
    const lambdaBody = this.getLambdaBody();
    if (!this.dataQualityValidationLambdaFormState) {
      return;
    }
    const processLambdaBody = (body: LambdaBody) => {
      const { _type: type, parameters } = body;
      if (!this.dataQualityValidationLambdaFormState) {
        return;
      }
      if (type === SUPPORTED_TYPES.FUNCTION) {
        this.dataQualityValidationLambdaFormState.addRuleFunction(body);
        parameters
          .filter(
            (param: LambdaBody) => param._type === SUPPORTED_TYPES.FUNCTION,
          )
          .forEach((param: LambdaBody) => {
            processLambdaBody(param);
          });
      }
    };

    processLambdaBody(lambdaBody);

    this.dataQualityValidationLambdaFormState.setRootParameters(
      this.relationValidation.assertion.parameters as LambdaBody[],
    );
  }

  convertStubLambdaToValidationLambdaFormRule() {
    this.dataQualityValidationLambdaFormState =
      new DataQualityValidationLambdaFormState(
        this.editorStore.graphManagerState,
        this.editorStore.changeDetectionState.observerContext,
      );
  }

  setColumnOptions(columns: RelationTypeColumnMetadata[]) {
    this.columnOptions = columns.map(({ name, type }) => {
      return {
        value: name,
        label: name,
        type: getPrimitiveTypeEnumFromPrecisePrimitiveTypeEnum(
          type as PRECISE_PRIMITIVE_TYPE,
        ),
      };
    });
  }
}
