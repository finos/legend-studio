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

import { observer } from 'mobx-react-lite';
import type { QueryBuilderState } from '../../stores/QueryBuilderState.js';
import { useCallback } from 'react';
import {
  type ValueSpecification,
  type VariableExpression,
  GenericType,
  GenericTypeExplicitReference,
  MILESTONING_STEREOTYPE,
  observe_PrimitiveInstanceValue,
  PrimitiveInstanceValue,
  PRIMITIVE_TYPE,
  PrimitiveType,
} from '@finos/legend-graph';
import { guaranteeNonNullable } from '@finos/legend-shared';
import { useDrop } from 'react-dnd';
import {
  Dialog,
  Modal,
  ModalBody,
  ModalFooter,
  ModalFooterButton,
  ModalHeader,
  PanelEntryDropZonePlaceholder,
  PanelFormSection,
} from '@finos/legend-art';
import { generateDefaultValueForPrimitiveType } from '../../stores/QueryBuilderValueSpecificationHelper.js';
import {
  BasicValueSpecificationEditor,
  type QueryBuilderVariableDragSource,
  QUERY_BUILDER_VARIABLE_DND_TYPE,
} from '../shared/BasicValueSpecificationEditor.js';
import { instanceValue_setValues } from '../../stores/shared/ValueSpecificationModifierHelper.js';
import { VariableSelector } from '../shared/QueryBuilderVariableSelector.js';

const MilestoningParameterEditor = observer(
  (props: {
    queryBuilderState: QueryBuilderState;
    stereotype: MILESTONING_STEREOTYPE;
  }) => {
    const { queryBuilderState, stereotype } = props;
    const handleDrop = useCallback(
      (item: QueryBuilderVariableDragSource): void => {
        if (stereotype === MILESTONING_STEREOTYPE.BUSINESS_TEMPORAL) {
          queryBuilderState.milestoningState.setBusinessDate(item.variable);
        } else {
          queryBuilderState.milestoningState.setProcessingDate(item.variable);
        }
      },
      [queryBuilderState, stereotype],
    );
    const [{ isDragOver }, dropConnector] = useDrop<
      QueryBuilderVariableDragSource,
      void,
      { isDragOver: boolean }
    >(
      () => ({
        accept: [QUERY_BUILDER_VARIABLE_DND_TYPE],
        drop: (item, monitor): void => {
          if (!monitor.didDrop()) {
            handleDrop(item);
          }
        },
        collect: (monitor): { isDragOver: boolean } => ({
          isDragOver: monitor.isOver({
            shallow: true,
          }),
        }),
      }),
      [handleDrop],
    );
    let milestoningParameter;
    if (stereotype === MILESTONING_STEREOTYPE.BUSINESS_TEMPORAL) {
      milestoningParameter = guaranteeNonNullable(
        queryBuilderState.milestoningState.businessDate,
      );
    } else {
      milestoningParameter = guaranteeNonNullable(
        queryBuilderState.milestoningState.processingDate,
      );
    }
    const resetMilestoningParameter = (): void => {
      const parameter = observe_PrimitiveInstanceValue(
        new PrimitiveInstanceValue(
          GenericTypeExplicitReference.create(
            new GenericType(PrimitiveType.STRICTDATE),
          ),
        ),
        queryBuilderState.observerContext,
      );
      instanceValue_setValues(
        parameter,
        [generateDefaultValueForPrimitiveType(PRIMITIVE_TYPE.STRICTDATE)],
        queryBuilderState.observerContext,
      );
      if (stereotype === MILESTONING_STEREOTYPE.BUSINESS_TEMPORAL) {
        queryBuilderState.milestoningState.setBusinessDate(parameter);
      } else {
        queryBuilderState.milestoningState.setProcessingDate(parameter);
      }
    };

    return (
      <div ref={dropConnector} className="query-builder__variable-editor">
        <PanelEntryDropZonePlaceholder
          isDragOver={isDragOver}
          label="Change Milestoning Parameter Value"
        >
          <BasicValueSpecificationEditor
            valueSpecification={milestoningParameter}
            graph={queryBuilderState.graphManagerState.graph}
            obseverContext={queryBuilderState.observerContext}
            setValueSpecification={(val: ValueSpecification): void =>
              stereotype === MILESTONING_STEREOTYPE.BUSINESS_TEMPORAL
                ? queryBuilderState.milestoningState.setBusinessDate(val)
                : queryBuilderState.milestoningState.setProcessingDate(val)
            }
            typeCheckOption={{
              expectedType: PrimitiveType.DATE,
            }}
            resetValue={resetMilestoningParameter}
            isConstant={queryBuilderState.constantState.isValueSpecConstant(
              milestoningParameter,
            )}
          />
        </PanelEntryDropZonePlaceholder>
      </div>
    );
  },
);

const BiTemporalMilestoningEditor = observer(
  (props: { queryBuilderState: QueryBuilderState }) => {
    const { queryBuilderState } = props;
    return (
      <>
        <PanelFormSection>
          <div className="panel__content__form__section__header__label">
            Processing Date
          </div>
          <MilestoningParameterEditor
            queryBuilderState={queryBuilderState}
            stereotype={MILESTONING_STEREOTYPE.PROCESSING_TEMPORAL}
          />
        </PanelFormSection>
        <PanelFormSection>
          <div className="panel__content__form__section__header__label">
            Business Date
          </div>
          <MilestoningParameterEditor
            queryBuilderState={queryBuilderState}
            stereotype={MILESTONING_STEREOTYPE.BUSINESS_TEMPORAL}
          />
        </PanelFormSection>
      </>
    );
  },
);

const BusinessTemporalMilestoningEditor = observer(
  (props: { queryBuilderState: QueryBuilderState }) => {
    const { queryBuilderState } = props;
    return (
      <PanelFormSection>
        <div className="panel__content__form__section__header__label">
          Business Date
        </div>
        <MilestoningParameterEditor
          key="BusinessDate"
          queryBuilderState={queryBuilderState}
          stereotype={MILESTONING_STEREOTYPE.BUSINESS_TEMPORAL}
        />
      </PanelFormSection>
    );
  },
);

const ProcessingTemporalMilestoningEditor = observer(
  (props: { queryBuilderState: QueryBuilderState }) => {
    const { queryBuilderState } = props;
    return (
      <PanelFormSection>
        <div className="panel__content__form__section__header__label">
          Processing Date
        </div>
        <MilestoningParameterEditor
          key="BusinessDate"
          queryBuilderState={queryBuilderState}
          stereotype={MILESTONING_STEREOTYPE.PROCESSING_TEMPORAL}
        />
      </PanelFormSection>
    );
  },
);

const TemporalMilestoningEditor: React.FC<{
  queryBuilderState: QueryBuilderState;
}> = (props) => {
  const { queryBuilderState } = props;

  if (
    queryBuilderState.milestoningState.processingDate &&
    queryBuilderState.milestoningState.businessDate
  ) {
    return (
      <BiTemporalMilestoningEditor queryBuilderState={queryBuilderState} />
    );
  } else if (queryBuilderState.milestoningState.businessDate) {
    return (
      <BusinessTemporalMilestoningEditor
        queryBuilderState={queryBuilderState}
      />
    );
  } else if (queryBuilderState.milestoningState.processingDate) {
    return (
      <ProcessingTemporalMilestoningEditor
        queryBuilderState={queryBuilderState}
      />
    );
  } else {
    return null;
  }
};

export const MilestoningParametersEditor = observer(
  (props: { queryBuilderState: QueryBuilderState }) => {
    const { queryBuilderState } = props;
    const milestoningState = queryBuilderState.milestoningState;
    const close = (): void => milestoningState.setShowMilestoningEditor(false);
    const isCompatibleMilestoningParameter = (
      variable: VariableExpression,
    ): boolean =>
      variable.genericType?.value.rawType.name === PRIMITIVE_TYPE.STRICTDATE ||
      variable.genericType?.value.rawType.name === PRIMITIVE_TYPE.LATESTDATE ||
      variable.genericType?.value.rawType.name === PRIMITIVE_TYPE.DATE ||
      variable.genericType?.value.rawType.name === PRIMITIVE_TYPE.DATETIME;

    return (
      <Dialog
        open={milestoningState.showMilestoningEditor}
        onClose={close}
        classes={{
          root: 'editor-modal__root-container',
          container: 'editor-modal__container',
          paper: 'editor-modal__content',
        }}
      >
        <Modal
          darkMode={true}
          className="editor-modal query-builder__variables__modal"
        >
          <ModalHeader title="Milestoning Parameters" />
          <ModalBody className="query-builder__variables__modal__body">
            <TemporalMilestoningEditor queryBuilderState={queryBuilderState} />
            <PanelFormSection>
              <div className="panel__content__form__section__header__label">
                List of compatible milestoning parameters
              </div>
            </PanelFormSection>
            <div className="panel__content__form__section__list__items">
              <VariableSelector
                queryBuilderState={queryBuilderState}
                filterBy={isCompatibleMilestoningParameter}
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <ModalFooterButton text="Close" onClick={close} />
          </ModalFooter>
        </Modal>
      </Dialog>
    );
  },
);
