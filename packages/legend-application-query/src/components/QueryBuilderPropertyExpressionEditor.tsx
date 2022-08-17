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
} from '@finos/legend-art';
import { observer } from 'mobx-react-lite';
import {
  generateMilestonedPropertyParameterValue,
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
} from '../stores/QueryBuilderExplorerState.js';
import { QueryBuilderPropertyInfoTooltip } from './QueryBuilderPropertyInfoTooltip.js';
import { VariableExpressionViewer } from './QueryBuilderParameterPanel.js';
import {
  type QueryBuilderParameterDragSource,
  QUERY_BUILDER_PARAMETER_DND_TYPE,
} from '../stores/QueryParametersState.js';
import {
  type ValueSpecification,
  type VariableExpression,
  Class,
  Enumeration,
  PrimitiveType,
  PRIMITIVE_TYPE,
  isSuperType,
} from '@finos/legend-graph';
import { guaranteeNonNullable } from '@finos/legend-shared';
import {
  propertyExpression_setParametersValue,
  BasicValueSpecificationEditor,
} from '@finos/legend-application';

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
      (item: QueryBuilderParameterDragSource): void => {
        propertyExpression_setParametersValue(
          derivedPropertyExpressionState.propertyExpression,
          idx + 1,
          item.variable.parameter,
          derivedPropertyExpressionState.queryBuilderState.observableContext,
        );
      },
      [derivedPropertyExpressionState, idx],
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
    const resetParameterValue = (): void => {
      propertyExpression_setParametersValue(
        derivedPropertyExpressionState.propertyExpression,
        idx + 1,
        generateMilestonedPropertyParameterValue(
          derivedPropertyExpressionState,
          idx,
        ) ??
          generateValueSpecificationForParameter(
            variable,
            derivedPropertyExpressionState.queryBuilderState.graphManagerState
              .graph,
          ),
        derivedPropertyExpressionState.queryBuilderState.observableContext,
      );
    };

    return (
      <div key={variable.name} className="panel__content__form__section">
        <div className="panel__content__form__section__header__label">
          {variable.name}
        </div>
        <div className="panel__content__form__section__header__prompt">{`${
          variable.multiplicity.lowerBound === 0 ? 'optional' : ''
        }`}</div>
        <div className="query-builder__parameter-editor">
          <PanelDropZone
            isDragOver={isParameterValueDragOver}
            dropTargetConnector={dropTargetConnector}
          >
            <BasicValueSpecificationEditor
              valueSpecification={guaranteeNonNullable(
                derivedPropertyExpressionState.parameterValues[idx],
              )}
              setValueSpecification={(val: ValueSpecification): void => {
                propertyExpression_setParametersValue(
                  derivedPropertyExpressionState.propertyExpression,
                  idx + 1,
                  val,
                  derivedPropertyExpressionState.queryBuilderState
                    .observableContext,
                );
              }}
              graph={graph}
              typeCheckOption={{
                expectedType: parameterType,
                match:
                  parameterType ===
                  graph.getPrimitiveType(PRIMITIVE_TYPE.DATETIME),
              }}
              resetValue={resetParameterValue}
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
        <div className="modal modal--dark editor-modal query-builder-property-editor">
          <div className="modal__header">
            <div className="modal__title">Derived Property</div>
          </div>
          <div className="modal__body query-builder-property-editor__content">
            {propertyExpressionState.derivedPropertyExpressionStates.map(
              (pe) => (
                <DerivedPropertyExpressionEditor
                  key={pe.path}
                  derivedPropertyExpressionState={pe}
                />
              ),
            )}
            <div className="modal__body query-builder__parameters__modal__body">
              <div className="panel__content__form__section__header__label">
                List of available parameters
              </div>
              <div className="panel__content__form__section__list__items">
                {propertyExpressionState.queryBuilderState.queryParametersState.parameterStates.map(
                  (parameter) => (
                    <VariableExpressionViewer
                      key={parameter.uuid}
                      queryBuilderState={
                        propertyExpressionState.queryBuilderState
                      }
                      variableExpressionState={parameter}
                    />
                  ),
                )}
              </div>
            </div>
          </div>
          <div className="modal__footer">
            <button
              className="btn modal__footer__close-btn"
              onClick={handleClose}
            >
              Done
            </button>
          </div>
        </div>
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
      propertyExpressionState.propertyExpression.func.genericType.value.rawType;
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
          showPlaceholder={isDragOver}
          label="Change Property"
          className="query-builder__dnd__placeholder"
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
              property={propertyExpressionState.propertyExpression.func}
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
