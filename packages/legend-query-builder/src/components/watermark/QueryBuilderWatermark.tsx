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
  PanelFormSection,
  ModalFooterButton,
} from '@finos/legend-art';
import {
  areMultiplicitiesEqual,
  Multiplicity,
  PrimitiveType,
  type VariableExpression,
  type ValueSpecification,
} from '@finos/legend-graph';
import { observer } from 'mobx-react-lite';
import { useCallback, useState } from 'react';
import { useDrop } from 'react-dnd';
import type { QueryBuilderState } from '../../stores/QueryBuilderState.js';
import type { QueryBuilderWatermarkState } from '../../stores/watermark/QueryBuilderWatermarkState.js';
import {
  BasicValueSpecificationEditor,
  QUERY_BUILDER_VARIABLE_DND_TYPE,
  type QueryBuilderVariableDragSource,
} from '../shared/BasicValueSpecificationEditor.js';
import { VariableSelector } from '../shared/QueryBuilderVariableSelector.js';
import { clone, deepClone } from '@finos/legend-shared';

const isParamaterCompatibleWithWaterMark = (
  parameter: VariableExpression,
): boolean =>
  PrimitiveType.STRING === parameter.genericType?.value.rawType &&
  areMultiplicitiesEqual(parameter.multiplicity, Multiplicity.ONE);

const WatermarkValueEditor = observer(
  (props: {
    selectedValue: ValueSpecification;
    setSelectedValue: (val: ValueSpecification) => void;
    handleResetValue: () => void;
    watermarkState: QueryBuilderWatermarkState;
  }) => {
    const {
      selectedValue,
      setSelectedValue,
      handleResetValue,
      watermarkState,
    } = props;

    const graph = watermarkState.queryBuilderState.graphManagerState.graph;

    const handleDrop = useCallback(
      (item: QueryBuilderVariableDragSource): void => {
        setSelectedValue(item.variable);
      },
      [setSelectedValue],
    );

    const [{ isParameterValueDragOver }, dropTargetConnector] = useDrop<
      QueryBuilderVariableDragSource,
      void,
      { isParameterValueDragOver: boolean }
    >(
      () => ({
        accept: [QUERY_BUILDER_VARIABLE_DND_TYPE],
        drop: (item, monitor): void => {
          if (
            !monitor.didDrop() &&
            // Only allows parameters with muliplicity 1 and type string
            isParamaterCompatibleWithWaterMark(item.variable)
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
        <div className="query-builder__variable-editor">
          <PanelDropZone
            isDragOver={isParameterValueDragOver}
            dropTargetConnector={dropTargetConnector}
          >
            <BasicValueSpecificationEditor
              valueSpecification={selectedValue}
              setValueSpecification={(val: ValueSpecification): void => {
                setSelectedValue(clone(val));
              }}
              graph={graph}
              obseverContext={watermarkState.queryBuilderState.observerContext}
              typeCheckOption={{
                expectedType: PrimitiveType.STRING,
              }}
              resetValue={handleResetValue}
              isConstant={watermarkState.queryBuilderState.constantState.isValueSpecConstant(
                selectedValue,
              )}
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
    const applicationStore = queryBuilderState.applicationStore;
    const watermarkState = queryBuilderState.watermarkState;

    const [selectedValue, setSelectedValue] = useState(
      deepClone(watermarkState.value),
    );

    const handleCancel = (): void => {
      watermarkState.setIsEditingWatermark(false);
    };

    const handleApply = (): void => {
      watermarkState.setValue(selectedValue);
      handleCancel();
    };

    const handleResetValue = (): void => {
      setSelectedValue(watermarkState.getDefaultValue());
    };

    const toggleWatermark = (): void => {
      if (selectedValue) {
        setSelectedValue(undefined);
      } else {
        handleResetValue();
      }
    };

    return (
      <Dialog
        open={Boolean(watermarkState.isEditingWatermark)}
        onClose={handleCancel}
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
          className="editor-modal query-builder__watermark__modal"
        >
          <ModalHeader title="Watermark" />
          <ModalBody>
            <PanelForm>
              <PanelFormBooleanField
                isReadOnly={false}
                value={selectedValue !== undefined}
                prompt="Enable watermark"
                update={toggleWatermark}
              />
              {selectedValue && (
                <>
                  <WatermarkValueEditor
                    selectedValue={selectedValue}
                    setSelectedValue={setSelectedValue}
                    handleResetValue={handleResetValue}
                    watermarkState={watermarkState}
                  />
                  <PanelDivider />
                  <VariableSelector
                    filterBy={isParamaterCompatibleWithWaterMark}
                    queryBuilderState={queryBuilderState}
                  />
                </>
              )}
            </PanelForm>
          </ModalBody>
          <ModalFooter>
            <ModalFooterButton text="Apply" onClick={handleApply} />
            <ModalFooterButton
              text="Cancel"
              onClick={handleCancel}
              type="secondary"
            />
          </ModalFooter>
        </Modal>
      </Dialog>
    );
  },
);
