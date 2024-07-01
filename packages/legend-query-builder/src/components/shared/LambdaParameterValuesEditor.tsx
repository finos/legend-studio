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

import { useApplicationStore } from '@finos/legend-application';
import {
  Dialog,
  Modal,
  ModalBody,
  ModalFooterButton,
  ModalFooter,
  ModalHeader,
  ModalFooterStatus,
} from '@finos/legend-art';
import {
  type PureModel,
  type ValueSpecification,
  type ObserverContext,
  PrimitiveType,
} from '@finos/legend-graph';
import { prettyCONSTName } from '@finos/legend-shared';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import type { LambdaParametersState } from '../../stores/shared/LambdaParameterState.js';
import { BasicValueSpecificationEditor } from './BasicValueSpecificationEditor.js';

// TODO we may want to further componentize this by removing the dialog wrapper
export const LambdaParameterValuesEditor = observer(
  (props: {
    graph: PureModel;
    observerContext: ObserverContext;
    lambdaParametersState: LambdaParametersState;
  }) => {
    const { lambdaParametersState, graph, observerContext } = props;
    const [isSubmitAction, setIsSubmitAction] = useState(false);
    const [isClosingAction, setIsClosingAction] = useState(false);
    const valuesEdtiorState = lambdaParametersState.parameterValuesEditorState;
    const close = (): void => {
      setIsClosingAction(true);
      valuesEdtiorState.close();
    };
    const applicationStore = useApplicationStore();
    const submitAction = valuesEdtiorState.submitAction;
    const submit = applicationStore.guardUnhandledError(async () => {
      if (submitAction) {
        setIsSubmitAction(true);
        close();
        await submitAction.handler();
      }
    });
    return (
      <Dialog
        open={Boolean(valuesEdtiorState.showModal)}
        onClose={close}
        classes={{
          root: 'editor-modal__root-container',
          container: 'editor-modal__container',
          paper: 'editor-modal__content',
        }}
      >
        <Modal
          darkMode={
            !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled
          }
          className="editor-modal lambda-parameter-values__modal"
        >
          <ModalHeader title="Set Parameter Values" />
          <ModalBody className="lambda-parameter-values__modal__body">
            {lambdaParametersState.parameterStates.map((paramState) => {
              const variableType =
                paramState.variableType ?? PrimitiveType.STRING;
              return (
                <div
                  key={paramState.uuid}
                  className="panel__content__form__section"
                >
                  <div className="lambda-parameter-values__value__label">
                    <div className="lambda-parameter-values__value__label__name">
                      {paramState.parameter.name}
                    </div>
                    <div className="lambda-parameter-values__value__label__type">
                      {variableType.name}
                    </div>
                  </div>
                  {paramState.value && (
                    <BasicValueSpecificationEditor
                      valueSpecification={paramState.value}
                      setValueSpecification={(
                        val: ValueSpecification,
                      ): void => {
                        paramState.setValue(val);
                      }}
                      graph={graph}
                      observerContext={observerContext}
                      typeCheckOption={{
                        expectedType: variableType,
                        match: variableType === PrimitiveType.DATETIME,
                      }}
                      className="query-builder__parameters__value__editor"
                      resetValue={(): void => paramState.mockParameterValue()}
                    />
                  )}
                </div>
              );
            })}
          </ModalBody>
          <ModalFooter>
            {isClosingAction && (
              <ModalFooterStatus> Closing...</ModalFooterStatus>
            )}
            {submitAction && (
              <ModalFooterButton
                inProgressText={
                  isSubmitAction ? `${submitAction.label}...` : undefined
                }
                onClick={submit}
                text={prettyCONSTName(submitAction.label)}
              />
            )}
            <ModalFooterButton
              inProgressText={isClosingAction ? 'Closing...' : undefined}
              onClick={close}
              text="Close"
              type="secondary"
            />
          </ModalFooter>
        </Modal>
      </Dialog>
    );
  },
);
