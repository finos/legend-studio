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
import {
  type QueryBuilderParameterDragSource,
  QUERY_BUILDER_PARAMETER_DND_TYPE,
} from '../../stores/QueryParametersState.js';
import { useCallback } from 'react';
import {
  type ValueSpecification,
  GenericType,
  GenericTypeExplicitReference,
  MILESTONING_STEREOTYPE,
  observe_PrimitiveInstanceValue,
  PrimitiveInstanceValue,
  PRIMITIVE_TYPE,
  TYPICAL_MULTIPLICITY_TYPE,
} from '@finos/legend-graph';
import { guaranteeNonNullable } from '@finos/legend-shared';
import { useDrop } from 'react-dnd';
import { VariableExpressionViewer } from '../QueryBuilderParameterPanel.js';
import { Dialog, PanelEntryDropZonePlaceholder } from '@finos/legend-art';
import { generateDefaultValueForPrimitiveType } from '../../stores/QueryBuilderValueSpecificationHelper.js';
import { BasicValueSpecificationEditor } from '@finos/legend-application';

const MilestoningParameterEditor = observer(
  (props: {
    queryBuilderState: QueryBuilderState;
    stereotype: MILESTONING_STEREOTYPE;
  }) => {
    const { queryBuilderState, stereotype } = props;
    const handleDrop = useCallback(
      (item: QueryBuilderParameterDragSource): void => {
        if (stereotype === MILESTONING_STEREOTYPE.BUSINESS_TEMPORAL) {
          queryBuilderState.querySetupState.setBusinessDate(
            item.variable.parameter,
          );
        } else {
          queryBuilderState.querySetupState.setProcessingDate(
            item.variable.parameter,
          );
        }
      },
      [queryBuilderState, stereotype],
    );
    const [{ isMilestoningParameterValueDragOver }, dropConnector] = useDrop<
      QueryBuilderParameterDragSource,
      void,
      { isMilestoningParameterValueDragOver: boolean }
    >(
      () => ({
        accept: [QUERY_BUILDER_PARAMETER_DND_TYPE],
        drop: (item, monitor): void => {
          if (!monitor.didDrop()) {
            handleDrop(item);
          }
        },
        collect: (
          monitor,
        ): { isMilestoningParameterValueDragOver: boolean } => ({
          isMilestoningParameterValueDragOver: monitor.isOver({
            shallow: true,
          }),
        }),
      }),
      [handleDrop],
    );
    let milestoningParameter;
    if (stereotype === MILESTONING_STEREOTYPE.BUSINESS_TEMPORAL) {
      milestoningParameter = guaranteeNonNullable(
        queryBuilderState.querySetupState.businessDate,
      );
    } else {
      milestoningParameter = guaranteeNonNullable(
        queryBuilderState.querySetupState.processingDate,
      );
    }
    const resetMilestoningParameter = (): void => {
      const parameter = observe_PrimitiveInstanceValue(
        new PrimitiveInstanceValue(
          GenericTypeExplicitReference.create(
            new GenericType(
              queryBuilderState.graphManagerState.graph.getPrimitiveType(
                PRIMITIVE_TYPE.STRICTDATE,
              ),
            ),
          ),
          queryBuilderState.graphManagerState.graph.getTypicalMultiplicity(
            TYPICAL_MULTIPLICITY_TYPE.ONE,
          ),
        ),
        queryBuilderState.observableContext,
      );
      parameter.values = [
        generateDefaultValueForPrimitiveType(PRIMITIVE_TYPE.STRICTDATE),
      ];
      if (stereotype === MILESTONING_STEREOTYPE.BUSINESS_TEMPORAL) {
        queryBuilderState.querySetupState.setBusinessDate(parameter);
      } else {
        queryBuilderState.querySetupState.setProcessingDate(parameter);
      }
    };

    return (
      <div ref={dropConnector} className="query-builder__parameter-editor">
        <PanelEntryDropZonePlaceholder
          showPlaceholder={isMilestoningParameterValueDragOver}
          label="Change Milestoning Parameter Value"
          className="query-builder__dnd__placeholder"
        >
          <BasicValueSpecificationEditor
            valueSpecification={milestoningParameter}
            graph={queryBuilderState.graphManagerState.graph}
            setValueSpecification={(val: ValueSpecification): void =>
              stereotype === MILESTONING_STEREOTYPE.BUSINESS_TEMPORAL
                ? queryBuilderState.querySetupState.setBusinessDate(val)
                : queryBuilderState.querySetupState.setProcessingDate(val)
            }
            typeCheckOption={{
              expectedType:
                queryBuilderState.graphManagerState.graph.getPrimitiveType(
                  PRIMITIVE_TYPE.DATE,
                ),
            }}
            resetValue={resetMilestoningParameter}
          />
        </PanelEntryDropZonePlaceholder>
      </div>
    );
  },
);

const BiTemporalMilestoneEditor = observer(
  (props: { queryBuilderState: QueryBuilderState }) => {
    const { queryBuilderState } = props;
    return (
      <>
        <div className="panel__content__form__section">
          <div className="panel__content__form__section__header__label">
            Processing Date
          </div>
          <MilestoningParameterEditor
            queryBuilderState={queryBuilderState}
            stereotype={MILESTONING_STEREOTYPE.PROCESSING_TEMPORAL}
          />
        </div>
        <div className="panel__content__form__section">
          <div className="panel__content__form__section__header__label">
            Business Date
          </div>
          <MilestoningParameterEditor
            queryBuilderState={queryBuilderState}
            stereotype={MILESTONING_STEREOTYPE.BUSINESS_TEMPORAL}
          />
        </div>
      </>
    );
  },
);

const BusinessTemporalMilestoneEditor = observer(
  (props: { queryBuilderState: QueryBuilderState }) => {
    const { queryBuilderState } = props;
    return (
      <div className="panel__content__form__section">
        <div className="panel__content__form__section__header__label">
          Business Date
        </div>
        <MilestoningParameterEditor
          key="BusinessDate"
          queryBuilderState={queryBuilderState}
          stereotype={MILESTONING_STEREOTYPE.BUSINESS_TEMPORAL}
        />
      </div>
    );
  },
);

const ProcessingTemporalMilestoneEditor = observer(
  (props: { queryBuilderState: QueryBuilderState }) => {
    const { queryBuilderState } = props;
    return (
      <div className="panel__content__form__section">
        <div className="panel__content__form__section__header__label">
          Processing Date
        </div>
        <MilestoningParameterEditor
          key="BusinessDate"
          queryBuilderState={queryBuilderState}
          stereotype={MILESTONING_STEREOTYPE.PROCESSING_TEMPORAL}
        />
      </div>
    );
  },
);

const TemporalMilestoneEditor: React.FC<{
  queryBuilderState: QueryBuilderState;
}> = (props) => {
  const { queryBuilderState } = props;

  if (
    queryBuilderState.querySetupState.processingDate &&
    queryBuilderState.querySetupState.businessDate
  ) {
    return <BiTemporalMilestoneEditor queryBuilderState={queryBuilderState} />;
  } else if (queryBuilderState.querySetupState.businessDate) {
    return (
      <BusinessTemporalMilestoneEditor queryBuilderState={queryBuilderState} />
    );
  } else if (queryBuilderState.querySetupState.processingDate) {
    return (
      <ProcessingTemporalMilestoneEditor
        queryBuilderState={queryBuilderState}
      />
    );
  } else {
    return null;
  }
};

export const MilestoningParametersEditor = observer(
  (props: { queryBuilderState: QueryBuilderState; close: () => void }) => {
    const { queryBuilderState, close } = props;

    return (
      <Dialog
        open={true}
        onClose={close}
        classes={{
          root: 'editor-modal__root-container',
          container: 'editor-modal__container',
          paper: 'editor-modal__content',
        }}
      >
        <div className="modal modal--dark editor-modal query-builder__parameters__modal">
          <div className="modal__header">
            <div className="modal__title">Milestoning Parameters</div>
          </div>
          <div className="modal__body query-builder__parameters__modal__body">
            <TemporalMilestoneEditor queryBuilderState={queryBuilderState} />
            <div className="panel__content__form__section__header__label">
              List of compatible milestoning parameters
            </div>
            <div className="panel__content__form__section__list__items">
              {queryBuilderState.queryParametersState.parameterStates
                .filter(
                  (parameter) =>
                    parameter.parameter.genericType?.value.rawType.name ===
                      PRIMITIVE_TYPE.STRICTDATE ||
                    parameter.parameter.genericType?.value.rawType.name ===
                      PRIMITIVE_TYPE.LATESTDATE ||
                    parameter.parameter.genericType?.value.rawType.name ===
                      PRIMITIVE_TYPE.DATE ||
                    parameter.parameter.genericType?.value.rawType.name ===
                      PRIMITIVE_TYPE.DATETIME,
                )
                .map((parameter) => (
                  <VariableExpressionViewer
                    key={parameter.uuid}
                    queryBuilderState={queryBuilderState}
                    variableExpressionState={parameter}
                  />
                ))}
            </div>
          </div>
          <div className="modal__footer">
            <button className="btn modal__footer__close-btn" onClick={close}>
              Close
            </button>
          </div>
        </div>
      </Dialog>
    );
  },
);
