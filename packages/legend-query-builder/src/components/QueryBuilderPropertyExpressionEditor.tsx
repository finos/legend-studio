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

import { useCallback } from 'react';
import {
  clsx,
  Dialog,
  PanelDropZone,
  InfoCircleIcon,
  PanelEntryDropZonePlaceholder,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalFooterButton,
} from '@finos/legend-art';
import { observer } from 'mobx-react-lite';
import {
  generateValueSpecificationForParameter,
  getPropertyPath,
  type QueryBuilderDerivedPropertyExpressionState,
  type QueryBuilderPropertyExpressionState,
} from '../stores/QueryBuilderPropertyEditorState.js';
import { useDrop } from 'react-dnd';
import {
  QUERY_BUILDER_EXPLORER_TREE_DND_TYPE,
  type QueryBuilderExplorerTreeDragSource,
  type QueryBuilderExplorerTreePropertyNodeData,
} from '../stores/explorer/QueryBuilderExplorerState.js';
import { QueryBuilderPropertyInfoTooltip } from './shared/QueryBuilderPropertyInfoTooltip.js';
import {
  type ValueSpecification,
  type VariableExpression,
  Class,
  Enumeration,
  PrimitiveType,
  isSuperType,
  AbstractPropertyExpression,
  INTERNAL__PropagatedValue,
  getMilestoneTemporalStereotype,
} from '@finos/legend-graph';
import { guaranteeNonNullable, guaranteeType } from '@finos/legend-shared';
import {
  type QueryBuilderVariableDragSource,
  BasicValueSpecificationEditor,
  QUERY_BUILDER_VARIABLE_DND_TYPE,
} from './shared/BasicValueSpecificationEditor.js';
import { functionExpression_setParameterValue } from '../stores/shared/ValueSpecificationModifierHelper.js';
import {
  ActionAlertActionType,
  ActionAlertType,
} from '@finos/legend-application';
import { VariableSelector } from './shared/QueryBuilderVariableSelector.js';
import {
  generateMilestonedPropertyParameterValue,
  isDefaultDatePropagationSupported,
  matchMilestoningParameterValue,
} from '../stores/milestoning/QueryBuilderMilestoningHelper.js';

const DerivedPropertyParameterValueEditor = observer(
  (props: {
    derivedPropertyExpressionState: QueryBuilderDerivedPropertyExpressionState;
    variable: VariableExpression;
    idx: number;
  }) => {
    const { derivedPropertyExpressionState, variable, idx } = props;
    const graph =
      derivedPropertyExpressionState.queryBuilderState.graphManagerState.graph;
    const parameterType = guaranteeNonNullable(
      derivedPropertyExpressionState.parameters[idx]?.genericType,
    ).value.rawType;
    const handleDrop = useCallback(
      (item: QueryBuilderVariableDragSource): void => {
        functionExpression_setParameterValue(
          derivedPropertyExpressionState.propertyExpression,
          item.variable,
          idx + 1,
          derivedPropertyExpressionState.queryBuilderState.observerContext,
        );
      },
      [derivedPropertyExpressionState, idx],
    );
    const [{ isParameterValueDragOver }, dropTargetConnector] = useDrop<
      QueryBuilderVariableDragSource,
      void,
      { isParameterValueDragOver: boolean }
    >(
      () => ({
        accept: [QUERY_BUILDER_VARIABLE_DND_TYPE],
        drop: (item, monitor): void => {
          const itemType = item.variable.genericType?.value.rawType;
          if (
            !monitor.didDrop() &&
            // Doing a type check, which only allows dragging and dropping parameters of the same type or of child types
            itemType &&
            (isSuperType(parameterType, itemType) ||
              parameterType.name === itemType.name)
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
    const queryBuilderState = derivedPropertyExpressionState.queryBuilderState;
    // Resets the next property expression in the property chain for milestoned properties when the user changes
    // the milestoned dates of current property expression and it propagates those dates to next property expression.
    const resetNextExpression = (
      nextExpression: AbstractPropertyExpression,
    ): void => {
      const milestoningStereotype = getMilestoneTemporalStereotype(
        guaranteeType(
          nextExpression.func.value.genericType.value.rawType,
          Class,
        ),
        queryBuilderState.graphManagerState.graph,
      );
      nextExpression.parametersValues.slice(1).forEach((parameter, index) => {
        if (
          milestoningStereotype &&
          parameter instanceof INTERNAL__PropagatedValue &&
          !matchMilestoningParameterValue(
            milestoningStereotype,
            index,
            parameter.getValue(),
            queryBuilderState.milestoningState,
          )
        ) {
          const newParameterValue = new INTERNAL__PropagatedValue(() =>
            guaranteeNonNullable(
              queryBuilderState.milestoningState
                .getMilestoningImplementation(milestoningStereotype)
                .getMilestoningDate(index),
            ),
          );
          newParameterValue.isPropagatedValue = false;
          functionExpression_setParameterValue(
            guaranteeType(nextExpression, AbstractPropertyExpression),
            guaranteeNonNullable(newParameterValue),
            index + 1,
            queryBuilderState.observerContext,
          );
        }
      });
    };
    const checkDatePropagation = (
      nextExpression: ValueSpecification | undefined,
    ): void => {
      if (
        nextExpression instanceof AbstractPropertyExpression &&
        isDefaultDatePropagationSupported(nextExpression, queryBuilderState) &&
        nextExpression.func.value.genericType.value.rawType instanceof Class
      ) {
        queryBuilderState.applicationStore.alertService.setActionAlertInfo({
          message:
            'You have just changed a milestoning date in the property expression chain, this date will be propagated down the rest of the chain. Do you want to proceed? Otherwise, you can choose to propagate the default milestoning dates instead.',
          type: ActionAlertType.CAUTION,
          actions: [
            {
              label: 'Proceed',
              type: ActionAlertActionType.PROCEED_WITH_CAUTION,
              default: true,
            },
            {
              label: 'Propagate default milestoning date(s)',
              type: ActionAlertActionType.PROCEED,
              handler: queryBuilderState.applicationStore.guardUnhandledError(
                async () => resetNextExpression(nextExpression),
              ),
            },
          ],
        });
      }
    };
    const resetParameterValue = (): void => {
      functionExpression_setParameterValue(
        derivedPropertyExpressionState.propertyExpression,
        generateMilestonedPropertyParameterValue(
          derivedPropertyExpressionState,
          idx,
        ) ??
          generateValueSpecificationForParameter(
            variable,
            derivedPropertyExpressionState.queryBuilderState.graphManagerState
              .graph,
            derivedPropertyExpressionState.queryBuilderState.observerContext,
          ),
        idx + 1,
        derivedPropertyExpressionState.queryBuilderState.observerContext,
      );
      const derivedPropertyExpressionStates =
        derivedPropertyExpressionState.propertyExpressionState
          .derivedPropertyExpressionStates;
      const currentDerivedPropertyStateindex =
        derivedPropertyExpressionStates.indexOf(derivedPropertyExpressionState);
      checkDatePropagation(
        currentDerivedPropertyStateindex + 1 <
          derivedPropertyExpressionStates.length
          ? derivedPropertyExpressionStates[
              currentDerivedPropertyStateindex + 1
            ]?.propertyExpression
          : undefined,
      );
    };
    const valueSpec = guaranteeNonNullable(
      derivedPropertyExpressionState.parameterValues[idx],
    );

    return (
      <div key={variable.name} className="panel__content__form__section">
        <div className="panel__content__form__section__header__label">
          {variable.name}
        </div>
        <div className="panel__content__form__section__header__prompt">{`${
          variable.multiplicity.lowerBound === 0 ? 'optional' : ''
        }`}</div>
        <div className="query-builder__variable-editor">
          <PanelDropZone
            isDragOver={isParameterValueDragOver}
            dropTargetConnector={dropTargetConnector}
          >
            <BasicValueSpecificationEditor
              valueSpecification={valueSpec}
              setValueSpecification={(val: ValueSpecification): void => {
                functionExpression_setParameterValue(
                  derivedPropertyExpressionState.propertyExpression,
                  val,
                  idx + 1,
                  derivedPropertyExpressionState.queryBuilderState
                    .observerContext,
                );
              }}
              graph={graph}
              obseverContext={
                derivedPropertyExpressionState.queryBuilderState.observerContext
              }
              typeCheckOption={{
                expectedType: parameterType,
                match: parameterType === PrimitiveType.DATETIME,
              }}
              resetValue={resetParameterValue}
              isConstant={queryBuilderState.constantState.isValueSpecConstant(
                valueSpec,
              )}
            />
          </PanelDropZone>
        </div>
        <div className="panel__content__form__section__list"></div>
      </div>
    );
  },
);

const DerivedPropertyExpressionEditor = observer(
  (props: {
    derivedPropertyExpressionState: QueryBuilderDerivedPropertyExpressionState;
  }) => {
    const { derivedPropertyExpressionState } = props;
    const parameterValues = derivedPropertyExpressionState.parameterValues;
    const parameters = derivedPropertyExpressionState.parameters;

    return (
      <div className="query-builder-property-editor__section">
        <div className="panel__content__form__section__header__label">
          {derivedPropertyExpressionState.title}
        </div>
        {!parameterValues.length && (
          <div className="query-builder-property-editor__section__content--empty">
            No parameter
          </div>
        )}
        {parameters.map((variable, idx) => (
          <DerivedPropertyParameterValueEditor
            key={variable.name}
            derivedPropertyExpressionState={derivedPropertyExpressionState}
            variable={variable}
            idx={idx}
          />
        ))}
      </div>
    );
  },
);

export const QueryBuilderPropertyExpressionEditor = observer(
  (props: { propertyExpressionState: QueryBuilderPropertyExpressionState }) => {
    const { propertyExpressionState } = props;
    const handleClose = (): void =>
      propertyExpressionState.setIsEditingDerivedProperty(false);
    const isParameterCompatibleWithDerivedProperty = (
      variable: VariableExpression,
      derivedProperties: QueryBuilderDerivedPropertyExpressionState[],
    ): boolean =>
      Boolean(
        derivedProperties.find((dp) => {
          const variableType = variable.genericType?.value.rawType;
          if (!variableType) {
            return false;
          }
          return dp.parameters.some(
            (p) =>
              p.genericType &&
              (isSuperType(variableType, p.genericType.value.rawType) ||
                p.genericType.value.rawType.name === variableType.name),
          );
        }),
      );
    return (
      <Dialog
        open={Boolean(
          propertyExpressionState.isEditingDerivedPropertyExpression,
        )}
        onClose={handleClose}
        classes={{
          root: 'editor-modal__root-container',
          container: 'editor-modal__container',
          paper: 'editor-modal__content',
        }}
      >
        <Modal
          darkMode={true}
          className="editor-modal query-builder-property-editor"
        >
          <ModalHeader title="Derived Property" />
          <ModalBody className="query-builder-property-editor__content">
            {propertyExpressionState.derivedPropertyExpressionStates.map(
              (pe) => (
                <DerivedPropertyExpressionEditor
                  key={pe.path}
                  derivedPropertyExpressionState={pe}
                />
              ),
            )}
            <ModalBody className="query-builder__variables__modal__body">
              <VariableSelector
                queryBuilderState={propertyExpressionState.queryBuilderState}
                filterBy={(v: VariableExpression) =>
                  isParameterCompatibleWithDerivedProperty(
                    v,
                    propertyExpressionState.derivedPropertyExpressionStates,
                  )
                }
              />
            </ModalBody>
          </ModalBody>
          <ModalFooter>
            <ModalFooterButton text="Done" onClick={handleClose} />
          </ModalFooter>
        </Modal>
      </Dialog>
    );
  },
);

export const QueryBuilderPropertyExpressionBadge = observer(
  (props: {
    propertyExpressionState: QueryBuilderPropertyExpressionState;
    onPropertyExpressionChange: (
      node: QueryBuilderExplorerTreePropertyNodeData,
    ) => void;
  }) => {
    const { propertyExpressionState, onPropertyExpressionChange } = props;
    const type =
      propertyExpressionState.propertyExpression.func.value.genericType.value
        .rawType;
    const hasDerivedPropertyInExpression = Boolean(
      propertyExpressionState.derivedPropertyExpressionStates.length,
    );
    const isValid = propertyExpressionState.isValid;
    const setDerivedPropertyArguments = (): void => {
      if (hasDerivedPropertyInExpression) {
        propertyExpressionState.setIsEditingDerivedProperty(true);
      }
    };
    const handleDrop = useCallback(
      (item: QueryBuilderExplorerTreeDragSource): void =>
        onPropertyExpressionChange(item.node),
      [onPropertyExpressionChange],
    );
    const [{ isDragOver }, dropConnector] = useDrop<
      QueryBuilderExplorerTreeDragSource,
      void,
      { isDragOver: boolean }
    >(
      () => ({
        accept: [
          QUERY_BUILDER_EXPLORER_TREE_DND_TYPE.ENUM_PROPERTY,
          QUERY_BUILDER_EXPLORER_TREE_DND_TYPE.PRIMITIVE_PROPERTY,
        ],
        drop: (item, monitor): void => {
          if (!monitor.didDrop()) {
            handleDrop(item);
          } // prevent drop event propagation to accomondate for nested DnD
        },
        collect: (monitor) => ({
          isDragOver: monitor.isOver({ shallow: true }),
        }),
      }),
      [handleDrop],
    );

    return (
      <div
        className="query-builder-property-expression-badge"
        ref={dropConnector}
      >
        <PanelEntryDropZonePlaceholder
          isDragOver={isDragOver}
          label="Change Property"
        >
          <div
            className={clsx(
              'query-builder-property-expression-badge__content',
              {
                'query-builder-property-expression-badge__content--class':
                  type instanceof Class,
                'query-builder-property-expression-badge__content--enumeration':
                  type instanceof Enumeration,
                'query-builder-property-expression-badge__content--primitive':
                  type instanceof PrimitiveType,
              },
            )}
          >
            <div
              className="query-builder-property-expression-badge__property"
              title={`${propertyExpressionState.title} - ${propertyExpressionState.path}`}
            >
              {propertyExpressionState.title}
            </div>
            {hasDerivedPropertyInExpression && (
              <button
                className={clsx(
                  'query-builder-property-expression-badge__action',
                  {
                    'query-builder-property-expression-badge__action--error':
                      !isValid,
                  },
                )}
                tabIndex={-1}
                onClick={setDerivedPropertyArguments}
                title="Set Derived Property Argument(s)..."
              >
                {!isValid && <InfoCircleIcon />} (...)
              </button>
            )}
            <QueryBuilderPropertyExpressionEditor
              propertyExpressionState={propertyExpressionState}
            />
            <QueryBuilderPropertyInfoTooltip
              property={propertyExpressionState.propertyExpression.func.value}
              path={getPropertyPath(propertyExpressionState.propertyExpression)}
              isMapped={true}
              placement="bottom-end"
            >
              <div className="query-builder-property-expression-badge__property__info">
                <InfoCircleIcon />
              </div>
            </QueryBuilderPropertyInfoTooltip>
          </div>
        </PanelEntryDropZonePlaceholder>
      </div>
    );
  },
);
