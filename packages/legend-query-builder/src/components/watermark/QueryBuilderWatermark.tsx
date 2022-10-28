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
  Dialog,
  PanelDropZone,
  PanelFormBooleanField,
  PanelForm,
  PanelDivider,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  PanelFormListItems,
  PanelFormSection,
} from '@finos/legend-art';
import {
  PRIMITIVE_TYPE,
  TYPICAL_MULTIPLICITY_TYPE,
  type ValueSpecification,
} from '@finos/legend-graph';
import { guaranteeNonNullable } from '@finos/legend-shared';
import { observer } from 'mobx-react-lite';
import { useCallback } from 'react';
import { useDrop } from 'react-dnd';

import {
  type QueryBuilderParameterDragSource,
  QUERY_BUILDER_PARAMETER_DND_TYPE,
} from '../../stores/QueryBuilderParametersState.js';
import type { QueryBuilderState } from '../../stores/QueryBuilderState.js';
import type { QueryBuilderWatermarkState } from '../../stores/watermark/QueryBuilderWatermarkState.js';
import { VariableExpressionViewer } from '../QueryBuilderParametersPanel.js';
import { BasicValueSpecificationEditor } from '../shared/BasicValueSpecificationEditor.js';

const WatermarkValueEditor = observer(
  (props: {
    watermarkValue: ValueSpecification;
    watermarkState: QueryBuilderWatermarkState;
  }) => {
    const { watermarkValue, watermarkState } = props;

    const graph = watermarkState.queryBuilderState.graphManagerState.graph;

    const handleDrop = useCallback(
      (item: QueryBuilderParameterDragSource): void => {
        watermarkState.setValue(item.variable.parameter);
      },
      [watermarkState],
    );

    const [{ isParameterValueDragOver }, dropTargetConnector] = useDrop<
      QueryBuilderParameterDragSource,
      void,
      { isParameterValueDragOver: boolean }
    >(
      () => ({
        accept: [QUERY_BUILDER_PARAMETER_DND_TYPE],
        drop: (item, monitor): void => {
          const itemType = item.variable.parameter.genericType?.value.rawType;
          if (
            !monitor.didDrop() &&
            // Only allows parameters with muliplicity 1 and type string
            item.variable.parameter.multiplicity ===
              graph.getTypicalMultiplicity(TYPICAL_MULTIPLICITY_TYPE.ONE) &&
            item.variable.parameter.genericType?.value.rawType.name ===
              'String' &&
            itemType
          ) {
            handleDrop(item);
          } // prevent drop event propagation to accomondate for nested DnD
        },
        collect: (monitor) => ({
          isParameterValueDragOver: monitor.isOver({
            shallow: true,
          }),
        }),
      }),
      [handleDrop],
    );

    return (
      <PanelFormSection>
        <div className="query-builder__parameter-editor">
          <PanelDropZone
            isDragOver={isParameterValueDragOver}
            dropTargetConnector={dropTargetConnector}
          >
            <BasicValueSpecificationEditor
              valueSpecification={guaranteeNonNullable(watermarkValue)}
              setValueSpecification={(val: ValueSpecification): void => {
                watermarkState.setValue(val);
              }}
              graph={graph}
              obseverContext={
                watermarkState.queryBuilderState.observableContext
              }
              typeCheckOption={{
                expectedType: graph.getPrimitiveType(PRIMITIVE_TYPE.STRING),
              }}
              resetValue={(): void => {
                watermarkState.resetValue();
              }}
            />
          </PanelDropZone>
        </div>
      </PanelFormSection>
    );
  },
);

export const QueryBuilderWatermarkEditor = observer(
  (props: { queryBuilderState: QueryBuilderState }) => {
    const { queryBuilderState } = props;

    const watermarkState = queryBuilderState.watermarkState;

    const handleClose = (): void => {
      queryBuilderState.setIsEditingWatermark(false);
    };

    return (
      <Dialog
        open={Boolean(queryBuilderState.isEditingWatermark)}
        onClose={handleClose}
        classes={{
          root: 'editor-modal__root-container',
          container: 'editor-modal__container',
          paper: 'editor-modal__content',
        }}
      >
        <Modal darkMode={true} className="editor-modal">
          <ModalHeader title="Watermark" />
          <ModalBody>
            <PanelForm>
              <PanelFormBooleanField
                isReadOnly={false}
                value={watermarkState.value !== undefined}
                prompt="Add a watermark"
                update={(): void => watermarkState.toogleWatermark()}
              />
              {watermarkState.value && (
                <>
                  <WatermarkValueEditor
                    watermarkState={watermarkState}
                    watermarkValue={watermarkState.value}
                  />
                  <PanelDivider />
                  <PanelFormListItems title="List of available parameters">
                    {queryBuilderState.parametersState.parameterStates
                      .length === 0 && <> No available parameters in query </>}
                    {queryBuilderState.parametersState.parameterStates
                      .filter((pState) => {
                        const isMuliplicityOne =
                          pState.parameter.multiplicity ===
                          queryBuilderState.graphManagerState.graph.getTypicalMultiplicity(
                            TYPICAL_MULTIPLICITY_TYPE.ONE,
                          );

                        const isString =
                          pState.parameter.genericType?.value.rawType.name ===
                          'String';

                        if (isString && isMuliplicityOne) {
                          return true;
                        } else {
                          return false;
                        }
                      })
                      .map((parameter) => (
                        <VariableExpressionViewer
                          key={parameter.uuid}
                          queryBuilderState={queryBuilderState}
                          variableExpressionState={parameter}
                          isReadOnly={true}
                          hideActions={true}
                        />
                      ))}
                  </PanelFormListItems>
                </>
              )}
            </PanelForm>
          </ModalBody>
          <ModalFooter>
            <button
              className="btn modal__footer__close-btn"
              onClick={handleClose}
            >
              Done
            </button>
          </ModalFooter>
        </Modal>
      </Dialog>
    );
  },
);
