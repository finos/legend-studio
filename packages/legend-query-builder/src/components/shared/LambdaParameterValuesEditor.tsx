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
  ModalFooter,
  ModalHeader,
} from '@finos/legend-art';
import {
  type PureModel,
  type ValueSpecification,
  PRIMITIVE_TYPE,
  type ObserverContext,
} from '@finos/legend-graph';
import { prettyCONSTName } from '@finos/legend-shared';
import { observer } from 'mobx-react-lite';
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
    const valuesEdtiorState = lambdaParametersState.parameterValuesEditorState;
    const close = (): void => valuesEdtiorState.close();
    const applicationStore = useApplicationStore();
    const submitAction = valuesEdtiorState.submitAction;
    const submit = applicationStore.guardUnhandledError(async () => {
      if (submitAction) {
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
          darkMode={true}
          className="editor-modal lambda-parameter-values__modal"
        >
          <ModalHeader title="Set Parameter Values" />
          <ModalBody className="lambda-parameter-values__modal__body">
            {lambdaParametersState.parameterStates.map((paramState) => {
              const stringType = graph.getPrimitiveType(PRIMITIVE_TYPE.STRING);
              const variableType = paramState.variableType ?? stringType;
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
                      obseverContext={observerContext}
                      typeCheckOption={{
                        expectedType: variableType,
                        match:
                          variableType ===
                          graph.getPrimitiveType(PRIMITIVE_TYPE.DATETIME),
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
            {submitAction && (
              <button
                className="btn modal__footer__close-btn"
                title={submitAction.label}
                onClick={submit}
              >
                {prettyCONSTName(submitAction.label)}
              </button>
            )}
            <button className="btn modal__footer__close-btn" onClick={close}>
              Close
            </button>
          </ModalFooter>
        </Modal>
      </Dialog>
    );
  },
);
