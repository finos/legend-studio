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

import { Dialog } from '@finos/legend-art';
import {
  type PureModel,
  type ValueSpecification,
  PRIMITIVE_TYPE,
} from '@finos/legend-graph';
import { prettyCONSTName } from '@finos/legend-shared';
import { observer } from 'mobx-react-lite';
import type { LambdaParametersState } from '../stores/LambdaParameterState.js';
import { useApplicationStore } from './ApplicationStoreProvider.js';
import { BasicValueSpecificationEditor } from './BasicValueSpecificationEditor.js';

// TODO we may want to further componentize this by removing the dialog wrapper
export const LambdaParameterValuesEditor = observer(
  (props: {
    graph: PureModel;
    lambdaParametersState: LambdaParametersState;
  }) => {
    const { lambdaParametersState, graph } = props;
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
        <div className="modal modal--dark editor-modal lambda__parameters__editor__modal">
          <div className="modal__header">
            <div className="modal__title">Set Parameter Values</div>
          </div>
          <div className="modal__body lambda__parameters__editor__modal__body">
            {lambdaParametersState.parameterStates.map((paramState) => {
              const stringType = graph.getPrimitiveType(PRIMITIVE_TYPE.STRING);
              const variableType = paramState.variableType ?? stringType;
              return (
                <div
                  key={paramState.uuid}
                  className="panel__content__form__section"
                >
                  <div className="lambda__parameters__editor__value__label">
                    <div>{paramState.parameter.name}</div>
                    <div className="lambda__parameters__editor__value__name">
                      {variableType.name}
                    </div>
                  </div>
                  {paramState.value && (
                    <BasicValueSpecificationEditor
                      valueSpecification={paramState.value}
                      updateValue={(val: ValueSpecification): void => {
                        paramState.setValue(val);
                      }}
                      graph={graph}
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
          </div>
          <div className="modal__footer">
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
          </div>
        </div>
      </Dialog>
    );
  },
);
