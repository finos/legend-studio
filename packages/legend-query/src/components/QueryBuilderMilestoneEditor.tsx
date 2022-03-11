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
import type { QueryBuilderState } from '../stores/QueryBuilderState';
import {
  type QueryBuilderParameterDragSource,
  QUERY_BUILDER_PARAMETER_TREE_DND_TYPE,
} from '../stores/QueryParametersState';
import { useCallback } from 'react';
import {
  GenericType,
  GenericTypeExplicitReference,
  MILESTONING_STEROTYPES,
  PrimitiveInstanceValue,
  PRIMITIVE_TYPE,
  TYPICAL_MULTIPLICITY_TYPE,
} from '@finos/legend-graph';
import { QueryBuilderValueSpecificationEditor } from './QueryBuilderValueSpecificationEditor';
import { guaranteeNonNullable } from '@finos/legend-shared';
import { type DropTargetMonitor, useDrop } from 'react-dnd';
import { VariableExpressionViewer } from './QueryBuilderParameterPanel';
import { Dialog, RefreshIcon } from '@finos/legend-art';

const MilestoningParameterEditor = observer(
  (props: { queryBuilderState: QueryBuilderState; parameterIndex: number }) => {
    const { queryBuilderState, parameterIndex } = props;
    const handleDrop = useCallback(
      (item: QueryBuilderParameterDragSource): void => {
        queryBuilderState.querySetupState.classMilestoningTemporalValues[
          parameterIndex
        ] = item.variable.parameter;
      },
      [queryBuilderState, parameterIndex],
    );
    const [{ isMilestoningParameterValueDragOver }, dropConnector] = useDrop(
      () => ({
        accept: [QUERY_BUILDER_PARAMETER_TREE_DND_TYPE.VARIABLE],
        drop: (
          item: QueryBuilderParameterDragSource,
          monitor: DropTargetMonitor,
        ): void => {
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
    const milestoningParameter = guaranteeNonNullable(
      queryBuilderState.querySetupState.classMilestoningTemporalValues[
        parameterIndex
      ],
    );
    const resetMilestoningParameter = (): void => {
      queryBuilderState.querySetupState.classMilestoningTemporalValues[
        parameterIndex
      ] = new PrimitiveInstanceValue(
        GenericTypeExplicitReference.create(
          new GenericType(
            queryBuilderState.graphManagerState.graph.getPrimitiveType(
              PRIMITIVE_TYPE.DATE,
            ),
          ),
        ),
        queryBuilderState.graphManagerState.graph.getTypicalMultiplicity(
          TYPICAL_MULTIPLICITY_TYPE.ONE,
        ),
      );
    };
    return (
      <div
        ref={dropConnector}
        className="query-builder__parameter-editor dnd__overlay__container"
      >
        {isMilestoningParameterValueDragOver && (
          <div className="query-builder__parameter-editor__node__dnd__overlay">
            Change Milestoning Parameter Value
          </div>
        )}
        <QueryBuilderValueSpecificationEditor
          valueSpecification={milestoningParameter}
          graph={queryBuilderState.graphManagerState.graph}
          expectedType={
            guaranteeNonNullable(milestoningParameter.genericType)
              .ownerReference.value
          }
        />
        <button
          className="query-builder__parameter-editor__node__action"
          tabIndex={-1}
          title="Reset Milestoning Parameter Value"
          onClick={resetMilestoningParameter}
        >
          <RefreshIcon style={{ fontSize: '1.6rem' }} />
        </button>
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
            parameterIndex={0}
          />
        </div>
        <div className="panel__content__form__section">
          <div className="panel__content__form__section__header__label">
            Business Date
          </div>
          <MilestoningParameterEditor
            queryBuilderState={queryBuilderState}
            parameterIndex={1}
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
          parameterIndex={0}
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
          parameterIndex={0}
        />
      </div>
    );
  },
);

const TemporalMilestoneEditor: React.FC<{
  queryBuilderState: QueryBuilderState;
  stereotype: string;
}> = (props) => {
  const { queryBuilderState, stereotype } = props;

  if (
    queryBuilderState.querySetupState.classMilestoningTemporalValues.length ===
    2
  ) {
    return <BiTemporalMilestoneEditor queryBuilderState={queryBuilderState} />;
  } else {
    switch (stereotype) {
      case MILESTONING_STEROTYPES.BUSINESS_TEMPORAL:
        return (
          <BusinessTemporalMilestoneEditor
            queryBuilderState={queryBuilderState}
          />
        );

      case MILESTONING_STEROTYPES.PROCESSING_TEMPORAL:
        return (
          <ProcessingTemporalMilestoneEditor
            queryBuilderState={queryBuilderState}
          />
        );

      case MILESTONING_STEROTYPES.BITEMPORAL:
        return (
          <BiTemporalMilestoneEditor queryBuilderState={queryBuilderState} />
        );

      default:
        return null;
    }
  }
};

export const MilestoningParametersEditor = observer(
  (props: {
    queryBuilderState: QueryBuilderState;
    close: () => void;
    stereotype: string;
  }) => {
    const { queryBuilderState, close, stereotype } = props;

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
            <TemporalMilestoneEditor
              queryBuilderState={queryBuilderState}
              stereotype={stereotype}
            />
            <div className="panel__content__form__section__header__label">
              List of compatible milestoning parameters
            </div>
            <div className="panel__content__form__section__list__items">
              {queryBuilderState.queryParametersState.parameters
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
