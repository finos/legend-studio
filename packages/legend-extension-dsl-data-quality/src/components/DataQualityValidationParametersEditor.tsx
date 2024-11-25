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
import {
  type Type,
  type RawVariableExpression,
  Class,
  Enumeration,
  MULTIPLICITY_INFINITE,
  PrimitiveType,
  Unit,
} from '@finos/legend-graph';
import type { DataQualityRelationValidationConfiguration } from '../graph/metamodel/pure/packageableElements/data-quality/DataQualityValidationConfiguration.js';
import { useCallback, useRef, useState } from 'react';
import {
  useEditorStore,
  rawVariableExpression_setName,
  rawVariableExpression_setType,
  rawVariableExpression_setMultiplicity,
  getElementIcon,
  LEGEND_STUDIO_TEST_ID,
} from '@finos/legend-application-studio';
import { useApplicationStore } from '@finos/legend-application';
import {
  type PackageableElementOption,
  buildElementOption,
} from '@finos/legend-lego/graph-editor';
import { UnsupportedOperationError } from '@finos/legend-shared';
import {
  ArrowCircleRightIcon,
  clsx,
  createFilter,
  CustomSelectorInput,
  LockIcon,
  PanelDnDEntry,
  PanelEntryDragHandle,
  TimesIcon,
  useDragPreviewLayer,
} from '@finos/legend-art';
import { useDrag, useDrop } from 'react-dnd';
import { dataQualityRelationValidation_swapParameters } from '../graph-manager/DSL_DataQuality_GraphModifierHelper.js';

enum FUNCTION_PARAMETER_TYPE {
  CLASS = 'CLASS',
  ENUMERATION = 'ENUMERATION',
  PRIMITIVE = 'PRIMITIVE',
}
const getFunctionParameterType = (type: Type): FUNCTION_PARAMETER_TYPE => {
  if (type instanceof PrimitiveType) {
    return FUNCTION_PARAMETER_TYPE.PRIMITIVE;
  } else if (type instanceof Enumeration) {
    return FUNCTION_PARAMETER_TYPE.ENUMERATION;
  } else if (type instanceof Class) {
    return FUNCTION_PARAMETER_TYPE.CLASS;
  }
  throw new UnsupportedOperationError(
    `Can't classify function parameter`,
    type,
  );
};

export type FunctionParameterDragSource = {
  parameter: RawVariableExpression;
};

export const FUNCTION_PARAMETER_DND_TYPE = 'FUNCTION_PARAMETER';

export const DataQualityValidationParametersEditor = observer(
  (props: {
    parameter: RawVariableExpression;
    _validationConfig: DataQualityRelationValidationConfiguration;
    deleteParameter: () => void;
    isReadOnly: boolean;
  }) => {
    const ref = useRef<HTMLDivElement>(null);
    const handleRef = useRef<HTMLDivElement>(null);

    const { parameter, _validationConfig, deleteParameter, isReadOnly } = props;
    const editorStore = useEditorStore();
    const applicationStore = useApplicationStore();
    // Name
    const changeValue: React.ChangeEventHandler<HTMLInputElement> = (event) =>
      rawVariableExpression_setName(parameter, event.target.value);
    // Type
    const [isEditingType, setIsEditingType] = useState(false);
    const typeOptions =
      editorStore.graphManagerState.usableClassPropertyTypes.map(
        buildElementOption,
      );
    const paramType = parameter.type.value;
    const typeName = getFunctionParameterType(paramType);
    const filterOption = createFilter({
      ignoreCase: true,
      ignoreAccents: false,
      stringify: (option: { data: PackageableElementOption<Type> }): string =>
        option.data.value.path,
    });
    const selectedType = { value: paramType, label: paramType.name };
    const changeType = (val: PackageableElementOption<Type>): void => {
      if (val.value !== parameter.type.value) {
        rawVariableExpression_setType(parameter, val.value);
        // updateFunctionName(editorStore, applicationStore, _func);
      }
      setIsEditingType(false);
    };
    const openElement = (): void => {
      if (!(paramType instanceof PrimitiveType)) {
        editorStore.graphEditorMode.openElement(
          paramType instanceof Unit ? paramType.measure : paramType,
        );
      }
    };
    // Multiplicity
    const [lowerBound, setLowerBound] = useState<string | number>(
      parameter.multiplicity.lowerBound,
    );
    const [upperBound, setUpperBound] = useState<string | number>(
      parameter.multiplicity.upperBound ?? MULTIPLICITY_INFINITE,
    );
    const updateMultiplicity = (
      lower: number | string,
      upper: number | string,
    ): void => {
      const lBound = typeof lower === 'number' ? lower : parseInt(lower, 10);
      const uBound =
        upper === MULTIPLICITY_INFINITE
          ? undefined
          : typeof upper === 'number'
            ? upper
            : parseInt(upper, 10);
      if (!isNaN(lBound) && (uBound === undefined || !isNaN(uBound))) {
        rawVariableExpression_setMultiplicity(
          parameter,
          editorStore.graphManagerState.graph.getMultiplicity(lBound, uBound),
        );
      }
    };
    const changeLowerBound: React.ChangeEventHandler<HTMLInputElement> = (
      event,
    ) => {
      setLowerBound(event.target.value);
      updateMultiplicity(event.target.value, upperBound);
    };
    const changeUpperBound: React.ChangeEventHandler<HTMLInputElement> = (
      event,
    ) => {
      setUpperBound(event.target.value);
      updateMultiplicity(lowerBound, event.target.value);
    };

    // Drag and Drop
    const handleHover = useCallback(
      (item: FunctionParameterDragSource): void => {
        const draggingParameter = item.parameter;
        const hoveredParameter = parameter;
        dataQualityRelationValidation_swapParameters(
          _validationConfig.query.parameters,
          draggingParameter,
          hoveredParameter,
        );
      },
      [_validationConfig.query.parameters, parameter],
    );

    const [{ isBeingDraggedParameter }, dropConnector] = useDrop<
      FunctionParameterDragSource,
      void,
      { isBeingDraggedParameter: RawVariableExpression | undefined }
    >(
      () => ({
        accept: [FUNCTION_PARAMETER_DND_TYPE],
        hover: (item) => handleHover(item),
        collect: (
          monitor,
        ): {
          isBeingDraggedParameter: RawVariableExpression | undefined;
        } => ({
          isBeingDraggedParameter:
            monitor.getItem<FunctionParameterDragSource | null>()?.parameter,
        }),
      }),
      [handleHover],
    );
    const isBeingDragged = parameter === isBeingDraggedParameter;

    const [, dragConnector, dragPreviewConnector] =
      useDrag<FunctionParameterDragSource>(
        () => ({
          type: FUNCTION_PARAMETER_DND_TYPE,
          item: () => ({
            parameter: parameter,
          }),
        }),
        [parameter],
      );
    dragConnector(handleRef);
    dropConnector(ref);
    useDragPreviewLayer(dragPreviewConnector);

    return (
      <PanelDnDEntry
        ref={ref}
        placeholder={<div className="dnd__placeholder--light"></div>}
        className="property-basic-editor__container"
        showPlaceholder={isBeingDragged}
      >
        <PanelEntryDragHandle
          dragSourceConnector={handleRef}
          isDragging={isBeingDragged}
        />
        <div className="property-basic-editor">
          {isReadOnly && (
            <div className="property-basic-editor__lock">
              <LockIcon />
            </div>
          )}
          <input
            className="property-basic-editor__name input--dark"
            disabled={isReadOnly}
            value={parameter.name}
            spellCheck={false}
            onChange={changeValue}
            placeholder="Parameter name"
          />
          {!isReadOnly && isEditingType && (
            <CustomSelectorInput
              className="property-basic-editor__type"
              options={typeOptions}
              onChange={changeType}
              value={selectedType}
              placeholder="Choose a type..."
              filterOption={filterOption}
              darkMode={
                !applicationStore.layoutService
                  .TEMPORARY__isLightColorThemeEnabled
              }
            />
          )}
          {!isReadOnly && !isEditingType && (
            <div
              className={clsx(
                'property-basic-editor__type',
                'property-basic-editor__type--show-click-hint',
                `background--${typeName.toLowerCase()}`,
                {
                  'property-basic-editor__type--has-visit-btn':
                    typeName !== FUNCTION_PARAMETER_TYPE.PRIMITIVE,
                },
              )}
            >
              {typeName !== FUNCTION_PARAMETER_TYPE.PRIMITIVE && (
                <div className="property-basic-editor__type__abbr">
                  {getElementIcon(paramType, editorStore)}
                </div>
              )}
              <div className="property-basic-editor__type__label">
                {paramType.name}
              </div>
              <div
                className="property-basic-editor__type__label property-basic-editor__type__label--hover"
                onClick={(): void => setIsEditingType(true)}
              >
                Click to edit
              </div>
              {typeName !== FUNCTION_PARAMETER_TYPE.PRIMITIVE && (
                <button
                  data-testid={LEGEND_STUDIO_TEST_ID.TYPE_VISIT}
                  className="property-basic-editor__type__visit-btn"
                  onClick={openElement}
                  tabIndex={-1}
                  title="Visit element"
                >
                  <ArrowCircleRightIcon />
                </button>
              )}
            </div>
          )}
          {isReadOnly && (
            <div
              className={clsx(
                'property-basic-editor__type',
                `background--${typeName.toLowerCase()}`,
                {
                  'property-basic-editor__type--has-visit-btn':
                    typeName !== FUNCTION_PARAMETER_TYPE.PRIMITIVE,
                },
              )}
            >
              {typeName !== FUNCTION_PARAMETER_TYPE.PRIMITIVE && (
                <div className="property-basic-editor__type__abbr">
                  {getElementIcon(paramType, editorStore)}
                </div>
              )}
              <div className="property-basic-editor__type__label">
                {paramType.name}
              </div>
              {typeName !== FUNCTION_PARAMETER_TYPE.PRIMITIVE && (
                <button
                  data-testid={LEGEND_STUDIO_TEST_ID.TYPE_VISIT}
                  className="property-basic-editor__type__visit-btn"
                  onClick={openElement}
                  tabIndex={-1}
                  title="Visit element"
                >
                  <ArrowCircleRightIcon />
                </button>
              )}
            </div>
          )}
          <div className="property-basic-editor__multiplicity">
            <input
              className="property-basic-editor__multiplicity-bound"
              disabled={isReadOnly}
              spellCheck={false}
              value={lowerBound}
              onChange={changeLowerBound}
            />
            <div className="property-basic-editor__multiplicity__range">..</div>
            <input
              className="property-basic-editor__multiplicity-bound"
              disabled={isReadOnly}
              spellCheck={false}
              value={upperBound}
              onChange={changeUpperBound}
            />
          </div>
          {!isReadOnly && (
            <button
              className="uml-element-editor__remove-btn btn--dark btn--caution"
              disabled={isReadOnly}
              onClick={deleteParameter}
              tabIndex={-1}
              title="Remove"
            >
              <TimesIcon />
            </button>
          )}
        </div>
      </PanelDnDEntry>
    );
  },
);
