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
  PanelFormBooleanField,
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
    parameter: ValueSpecification;
    setParameter: (val: ValueSpecification) => void;
  }) => {
    const { queryBuilderState, parameter, setParameter } = props;
    const handleDrop = useCallback(
      (item: QueryBuilderVariableDragSource): void => {
        setParameter(item.variable);
      },
      [setParameter],
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
    const resetMilestoningParameter = (): void => {
      const param = observe_PrimitiveInstanceValue(
        new PrimitiveInstanceValue(
          GenericTypeExplicitReference.create(
            new GenericType(PrimitiveType.STRICTDATE),
          ),
        ),
        queryBuilderState.observerContext,
      );
      instanceValue_setValues(
        param,
        [generateDefaultValueForPrimitiveType(PRIMITIVE_TYPE.STRICTDATE)],
        queryBuilderState.observerContext,
      );
      setParameter(param);
    };

    return (
      <div ref={dropConnector} className="query-builder__variable-editor">
        <PanelEntryDropZonePlaceholder
          isDragOver={isDragOver}
          label="Change Milestoning Parameter Value"
        >
          <BasicValueSpecificationEditor
            valueSpecification={parameter}
            graph={queryBuilderState.graphManagerState.graph}
            obseverContext={queryBuilderState.observerContext}
            setValueSpecification={(val: ValueSpecification): void =>
              setParameter(val)
            }
            typeCheckOption={{
              expectedType: PrimitiveType.DATE,
            }}
            resetValue={resetMilestoningParameter}
            isConstant={queryBuilderState.constantState.isValueSpecConstant(
              parameter,
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
            parameter={guaranteeNonNullable(
              queryBuilderState.milestoningState.processingDate,
            )}
            setParameter={(val: ValueSpecification): void =>
              queryBuilderState.milestoningState.setProcessingDate(val)
            }
          />
        </PanelFormSection>
        <PanelFormSection>
          <div className="panel__content__form__section__header__label">
            Business Date
          </div>
          <MilestoningParameterEditor
            queryBuilderState={queryBuilderState}
            parameter={guaranteeNonNullable(
              queryBuilderState.milestoningState.businessDate,
            )}
            setParameter={(val: ValueSpecification): void =>
              queryBuilderState.milestoningState.setBusinessDate(val)
            }
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
          parameter={guaranteeNonNullable(
            queryBuilderState.milestoningState.businessDate,
          )}
          setParameter={(val: ValueSpecification): void =>
            queryBuilderState.milestoningState.setBusinessDate(val)
          }
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
          parameter={guaranteeNonNullable(
            queryBuilderState.milestoningState.processingDate,
          )}
          setParameter={(val: ValueSpecification): void =>
            queryBuilderState.milestoningState.setProcessingDate(val)
          }
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

const AllVersionsInRangelMilestoningParametersEditor = observer(
  (props: { queryBuilderState: QueryBuilderState }) => {
    const { queryBuilderState } = props;

    return (
      <div className="query-builder__milestoning-panel__all-versions-in-range-editor">
        <PanelFormSection>
          <div className="panel__content__form__section__header__label">
            Start Date
          </div>
          <MilestoningParameterEditor
            queryBuilderState={queryBuilderState}
            parameter={guaranteeNonNullable(
              queryBuilderState.milestoningState.startDate,
            )}
            setParameter={(val: ValueSpecification): void =>
              queryBuilderState.milestoningState.setStartDate(val)
            }
          />
        </PanelFormSection>
        <PanelFormSection>
          <div className="panel__content__form__section__header__label">
            End Date
          </div>
          <MilestoningParameterEditor
            queryBuilderState={queryBuilderState}
            parameter={guaranteeNonNullable(
              queryBuilderState.milestoningState.endDate,
            )}
            setParameter={(val: ValueSpecification): void =>
              queryBuilderState.milestoningState.setEndDate(val)
            }
          />
        </PanelFormSection>
      </div>
    );
  },
);

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
            {milestoningState.isCurrentClassMilestoned && (
              <PanelFormBooleanField
                isReadOnly={false}
                value={milestoningState.isAllVersionsEnabled}
                name="all Versions"
                prompt="Query All Milestoned Versions of the Root Class"
                update={(value: boolean | undefined): void =>
                  milestoningState.setAllVersions(value)
                }
              />
            )}
            {milestoningState.isAllVersionsEnabled &&
              milestoningState.isCurrentClassSupportsVersionsInRange && (
                <>
                  <PanelFormBooleanField
                    isReadOnly={false}
                    value={milestoningState.isAllVersionsInRangeEnabled}
                    name=" All Versions In Range"
                    prompt="Optionally apply a date range to get All Versions for"
                    update={(value: boolean | undefined): void =>
                      milestoningState.setAllVersionsInRange(value)
                    }
                  />

                  {milestoningState.isAllVersionsInRangeEnabled && (
                    <AllVersionsInRangelMilestoningParametersEditor
                      queryBuilderState={queryBuilderState}
                    />
                  )}
                </>
              )}
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
