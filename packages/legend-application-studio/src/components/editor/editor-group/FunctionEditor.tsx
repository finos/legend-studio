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

import { useState, useEffect, useCallback, useRef } from 'react';
import { observer } from 'mobx-react-lite';
import {
  FunctionEditorState,
  FUNCTION_EDITOR_TAB,
} from '../../../stores/editor/editor-state/element-editor-state/FunctionEditorState.js';
import {
  CORE_DND_TYPE,
  type UMLEditorElementDropTarget,
  type ElementDragSource,
} from '../../../stores/editor/utils/DnDUtils.js';
import {
  assertErrorThrown,
  prettyCONSTName,
  returnUndefOnError,
  UnsupportedOperationError,
} from '@finos/legend-shared';
import { useDrag, useDrop } from 'react-dnd';
import {
  clsx,
  CustomSelectorInput,
  createFilter,
  LockIcon,
  PlusIcon,
  TimesIcon,
  ArrowCircleRightIcon,
  PanelEntryDragHandle,
  DragPreviewLayer,
  useDragPreviewLayer,
  Panel,
  PanelContent,
  PanelDnDEntry,
  Dialog,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalTitle,
  CaretDownIcon,
  DropdownMenu,
  LaunchIcon,
  BlankPanelContent,
  MenuContent,
  MenuContentItem,
  Modal,
  PauseCircleIcon,
  PlayIcon,
  PanelLoadingIndicator,
} from '@finos/legend-art';
import { LEGEND_STUDIO_TEST_ID } from '../../../__lib__/LegendStudioTesting.js';
import {
  StereotypeDragPreviewLayer,
  StereotypeSelector,
} from './uml-editor/StereotypeSelector.js';
import {
  TaggedValueDragPreviewLayer,
  TaggedValueEditor,
} from './uml-editor/TaggedValueEditor.js';
import { flowResult } from 'mobx';
import { useEditorStore } from '../EditorStoreProvider.js';
import {
  type ConcreteFunctionDefinition,
  type StereotypeReference,
  type TaggedValue,
  type RawVariableExpression,
  Profile,
  MULTIPLICITY_INFINITE,
  Unit,
  Type,
  Enumeration,
  Class,
  PrimitiveType,
  StereotypeExplicitReference,
  stub_Tag,
  stub_Profile,
  stub_TaggedValue,
  stub_Stereotype,
  stub_RawVariableExpression,
  getFunctionNameWithPath,
  getFunctionSignature,
  generateFunctionPrettyName,
  extractAnnotatedElementDocumentation,
  getClassProperty,
  RawExecutionResult,
  extractExecutionResultValues,
} from '@finos/legend-graph';
import {
  type ApplicationStore,
  type LegendApplicationPlugin,
  type LegendApplicationConfig,
  type LegendApplicationPluginManager,
  useApplicationNavigationContext,
  useApplicationStore,
  DEFAULT_TAB_SIZE,
} from '@finos/legend-application';
import {
  type PackageableElementOption,
  buildElementOption,
} from '@finos/legend-lego/graph-editor';
import { getElementIcon } from '../../ElementIconUtils.js';
import {
  function_setReturnType,
  function_setReturnMultiplicity,
  function_addParameter,
  function_deleteParameter,
  annotatedElement_addTaggedValue,
  annotatedElement_addStereotype,
  annotatedElement_deleteStereotype,
  annotatedElement_deleteTaggedValue,
  function_swapParameters,
} from '../../../stores/graph-modifier/DomainGraphModifierHelper.js';
import {
  rawVariableExpression_setMultiplicity,
  rawVariableExpression_setName,
  rawVariableExpression_setType,
} from '../../../stores/graph-modifier/RawValueSpecificationGraphModifierHelper.js';
import { LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY } from '../../../__lib__/LegendStudioApplicationNavigationContext.js';
import {
  ExecutionPlanViewer,
  LambdaEditor,
  LambdaParameterValuesEditor,
} from '@finos/legend-query-builder';
import type { EditorStore } from '../../../stores/editor/EditorStore.js';
import { graph_renameElement } from '../../../stores/graph-modifier/GraphModifierHelper.js';
import { ProtocolValueBuilder } from './ProtocolValueBuilder.js';
import type { ProtocolValueBuilderState } from '../../../stores/editor/editor-state/element-editor-state/ProtocolValueBuilderState.js';
import {
  CODE_EDITOR_LANGUAGE,
  CodeEditor,
} from '@finos/legend-lego/code-editor';
import { PanelGroupItemExperimentalBadge } from '../panel-group/PanelGroup.js';

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

type FunctionParameterDragSource = {
  parameter: RawVariableExpression;
};

const FUNCTION_PARAMETER_DND_TYPE = 'FUNCTION_PARAMETER';

/**
 * NOTE: every time we update the function signature (parameters, return value), we need to adjust the function path,
 * therefore, we need to update the graph's function index.
 */
const updateFunctionName = (
  editorStore: EditorStore,
  applicationStore: ApplicationStore<
    LegendApplicationConfig,
    LegendApplicationPluginManager<LegendApplicationPlugin>
  >,
  func: ConcreteFunctionDefinition,
): void => {
  try {
    graph_renameElement(
      editorStore.graphManagerState.graph,
      func,
      `${getFunctionNameWithPath(func)}${getFunctionSignature(func)}`,
      editorStore.changeDetectionState.observerContext,
    );
  } catch (error) {
    assertErrorThrown(error);
    applicationStore.notificationService.notifyError(error);
  }
};

const ParameterBasicEditor = observer(
  (props: {
    parameter: RawVariableExpression;
    _func: ConcreteFunctionDefinition;
    deleteParameter: () => void;
    isReadOnly: boolean;
  }) => {
    const ref = useRef<HTMLDivElement>(null);
    const handleRef = useRef<HTMLDivElement>(null);

    const { parameter, _func, deleteParameter, isReadOnly } = props;
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
      stringify: (option: PackageableElementOption<Type>): string =>
        option.value.path,
    });
    const selectedType = { value: paramType, label: paramType.name };
    const changeType = (val: PackageableElementOption<Type>): void => {
      if (val.value !== parameter.type.value) {
        rawVariableExpression_setType(parameter, val.value);
        updateFunctionName(editorStore, applicationStore, _func);
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
        updateFunctionName(editorStore, applicationStore, _func);
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
        function_swapParameters(_func, draggingParameter, hoveredParameter);
      },
      [_func, parameter],
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
              darkMode={true}
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

const ReturnTypeEditor = observer(
  (props: {
    functionElement: ConcreteFunctionDefinition;
    isReadOnly: boolean;
  }) => {
    const { functionElement, isReadOnly } = props;
    const { returnType, returnMultiplicity } = functionElement;
    const editorStore = useEditorStore();
    const applicationStore = useApplicationStore();
    // Type
    const [isEditingType, setIsEditingType] = useState(false);
    const typeOptions =
      editorStore.graphManagerState.usableClassPropertyTypes.map(
        buildElementOption,
      );
    const typeName = getFunctionParameterType(returnType.value);
    const filterOption = createFilter({
      ignoreCase: true,
      ignoreAccents: false,
      stringify: (option: PackageableElementOption<Type>): string =>
        option.value.path,
    });
    const selectedType = { value: returnType, label: returnType.value.name };
    const changeType = (val: PackageableElementOption<Type>): void => {
      function_setReturnType(functionElement, val.value);
      setIsEditingType(false);
      updateFunctionName(editorStore, applicationStore, functionElement);
    };

    const openElement = (): void => {
      if (!(returnType.value instanceof PrimitiveType)) {
        editorStore.graphEditorMode.openElement(
          returnType.value instanceof Unit
            ? returnType.value.measure
            : returnType.value,
        );
      }
    };
    // Multiplicity
    const [lowerBound, setLowerBound] = useState<string | number>(
      returnMultiplicity.lowerBound,
    );
    const [upperBound, setUpperBound] = useState<string | number>(
      returnMultiplicity.upperBound ?? MULTIPLICITY_INFINITE,
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
        function_setReturnMultiplicity(
          functionElement,
          editorStore.graphManagerState.graph.getMultiplicity(lBound, uBound),
        );
        updateFunctionName(editorStore, applicationStore, functionElement);
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

    return (
      <div className="function-editor__return__type-editor">
        {!isReadOnly && isEditingType && (
          <CustomSelectorInput
            className="property-basic-editor__type"
            options={typeOptions}
            onChange={changeType}
            value={selectedType}
            placeholder="Choose a type..."
            filterOption={filterOption}
            darkMode={true}
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
                {getElementIcon(returnType.value, editorStore)}
              </div>
            )}
            <div className="property-basic-editor__type__label">
              {returnType.value.name}
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
                {getElementIcon(returnType.value, editorStore)}
              </div>
            )}
            <div className="property-basic-editor__type__label">
              {returnType.value.name}
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
        <button
          className="uml-element-editor__remove-btn btn--dark btn--caution"
          disabled={true}
          tabIndex={-1}
        >
          <TimesIcon />
        </button>
      </div>
    );
  },
);

const FunctionDefinitionEditor = observer(
  (props: {
    functionEditorState: FunctionEditorState;
    isReadOnly: boolean;
  }) => {
    const { functionEditorState, isReadOnly } = props;
    const editorStore = useEditorStore();
    const applicationStore = useApplicationStore();
    const lambdaEditorState = functionEditorState.functionDefinitionEditorState;
    const functionElement = functionEditorState.functionElement;
    const execResult = functionEditorState.executionResult;

    // Parameters
    const addParameter = (): void => {
      function_addParameter(
        functionElement,
        stub_RawVariableExpression(PrimitiveType.STRING),
      );
      updateFunctionName(editorStore, applicationStore, functionElement);
    };
    const deleteParameter =
      (val: RawVariableExpression): (() => void) =>
      (): void => {
        function_deleteParameter(functionElement, val);
        updateFunctionName(editorStore, applicationStore, functionElement);
      };
    const handleDropParameter = useCallback(
      (item: UMLEditorElementDropTarget): void => {
        if (!isReadOnly && item.data.packageableElement instanceof Type) {
          function_addParameter(
            functionElement,
            stub_RawVariableExpression(item.data.packageableElement),
          );
          updateFunctionName(editorStore, applicationStore, functionElement);
        }
      },
      [applicationStore, editorStore, functionElement, isReadOnly],
    );
    const [{ isParameterDragOver }, dropParameterRef] = useDrop<
      ElementDragSource,
      void,
      { isParameterDragOver: boolean }
    >(
      () => ({
        accept: [
          CORE_DND_TYPE.PROJECT_EXPLORER_CLASS,
          CORE_DND_TYPE.PROJECT_EXPLORER_ENUMERATION,
        ],
        drop: (item) => handleDropParameter(item),
        collect: (monitor) => ({
          isParameterDragOver: monitor.isOver({ shallow: true }),
        }),
      }),
      [handleDropParameter],
    );

    const renderFuncResult = (): React.ReactNode => {
      if (execResult instanceof RawExecutionResult) {
        const val =
          execResult.value === null ? 'null' : execResult.value.toString();
        return (
          <CodeEditor
            language={CODE_EDITOR_LANGUAGE.TEXT}
            inputValue={val}
            isReadOnly={true}
          />
        );
      } else if (execResult !== undefined) {
        const json =
          returnUndefOnError(() =>
            JSON.stringify(
              extractExecutionResultValues(execResult),
              null,
              DEFAULT_TAB_SIZE,
            ),
          ) ?? JSON.stringify(execResult);
        return (
          <CodeEditor
            language={CODE_EDITOR_LANGUAGE.JSON}
            inputValue={json}
            isReadOnly={true}
          />
        );
      }
      return <BlankPanelContent>Function Did Not Run</BlankPanelContent>;
    };

    return (
      <>
        <PanelLoadingIndicator
          isLoading={
            functionEditorState.isGeneratingPlan ||
            functionEditorState.isRunningFunc
          }
        />
        <div className="function-editor__definition">
          <div className="function-editor__definition__item">
            <div className="function-editor__definition__item__header">
              <div className="function-editor__definition__item__header__title">
                PARAMETERS
              </div>
              <button
                className="function-editor__definition__item__header__add-btn btn--dark"
                disabled={isReadOnly}
                onClick={addParameter}
                tabIndex={-1}
                title="Add Parameter"
              >
                <PlusIcon />
              </button>
            </div>
            <DragPreviewLayer
              labelGetter={(item: FunctionParameterDragSource): string =>
                item.parameter.name === '' ? '(unknown)' : item.parameter.name
              }
              types={[FUNCTION_PARAMETER_DND_TYPE]}
            />
            <div
              ref={dropParameterRef}
              className={clsx('function-editor__definition__item__content', {
                'panel__content__lists--dnd-over':
                  isParameterDragOver && !isReadOnly,
              })}
            >
              {functionElement.parameters.map((param) => (
                <ParameterBasicEditor
                  key={param._UUID}
                  parameter={param}
                  _func={functionElement}
                  deleteParameter={deleteParameter(param)}
                  isReadOnly={isReadOnly}
                />
              ))}
              {functionElement.parameters.length === 0 && (
                <div className="function-editor__definition__item__content--empty">
                  No parameters
                </div>
              )}
            </div>
          </div>
          <div className="function-editor__definition__item">
            <div className="function-editor__definition__item__header">
              <div className="function-editor__definition__item__header__title">
                LAMBDA
              </div>
              <div className="">
                <ReturnTypeEditor
                  functionElement={functionElement}
                  isReadOnly={isReadOnly}
                />
              </div>
            </div>
            <div
              className={clsx('function-editor__definition__item__content', {
                backdrop__element: Boolean(
                  functionEditorState.functionDefinitionEditorState.parserError,
                ),
              })}
            >
              <LambdaEditor
                className="function-editor__definition__lambda-editor lambda-editor--dark"
                disabled={
                  lambdaEditorState.isConvertingFunctionBodyToString ||
                  isReadOnly
                }
                lambdaEditorState={lambdaEditorState}
                forceBackdrop={false}
                autoFocus={true}
              />
            </div>
          </div>
          <div className="function-editor__definition__item">
            <div className="function-editor__definition__item__header">
              <div className="function-editor__definition__item__header__title">
                RESULT
                <PanelGroupItemExperimentalBadge />
              </div>
            </div>
            <div className="function-editor__definition__item__content">
              <div className="function-editor__definition__result-viewer">
                {renderFuncResult()}
              </div>
            </div>
          </div>
        </div>
      </>
    );
  },
);

const FunctionActivatorContentBuilder = observer(
  (props: {
    functionEditorState: FunctionEditorState;
    valueBuilderState: ProtocolValueBuilderState;
  }) => {
    const { functionEditorState, valueBuilderState } = props;
    const builderState = functionEditorState.activatorBuilderState;

    // name
    const nameInputRef = useRef<HTMLInputElement>(null);
    const nameValidationErrorMessage =
      builderState.activatorName.length === 0
        ? 'Element name cannot be empty'
        : builderState.isDuplicated
        ? `Element of the same path already existed`
        : undefined;
    useEffect(() => {
      nameInputRef.current?.focus();
      nameInputRef.current?.select();
    }, [valueBuilderState]);

    // function
    const functionFieldProperty = returnUndefOnError(() =>
      getClassProperty(valueBuilderState.type, 'function'),
    );
    const functionFieldDocumentation = functionFieldProperty
      ? extractAnnotatedElementDocumentation(functionFieldProperty)
      : undefined;

    return (
      <>
        <div className="panel__content__form">
          <div className="panel__content__form__section">
            <div className="panel__content__form__section__header__label">
              Name
            </div>
            <div className="input-group">
              <input
                className="panel__content__form__section__input"
                spellCheck={false}
                ref={nameInputRef}
                value={builderState.activatorName}
                onChange={(event) =>
                  builderState.setActivatorName(event.target.value)
                }
              />
              {nameValidationErrorMessage && (
                <div className="input-group__error-message">
                  {nameValidationErrorMessage}
                </div>
              )}
            </div>
          </div>
          <div className="panel__content__form__section">
            <div className="panel__content__form__section__header__label">
              Function
            </div>
            {functionFieldDocumentation && (
              <div className="panel__content__form__section__header__prompt">
                {functionFieldDocumentation}
              </div>
            )}
            <input
              className="panel__content__form__section__input"
              spellCheck={false}
              disabled={true}
              value={generateFunctionPrettyName(
                functionEditorState.functionElement,
                {
                  fullPath: true,
                  spacing: false,
                },
              )}
            />
          </div>
          <div className="panel__content__form__section">
            <div className="panel__content__form__section__divider"></div>
          </div>
        </div>
        <ProtocolValueBuilder builderState={valueBuilderState} />
      </>
    );
  },
);

export const FunctionEditor = observer(() => {
  const editorStore = useEditorStore();
  const applicationStore = useApplicationStore();
  const functionEditorState =
    editorStore.tabManagerState.getCurrentEditorState(FunctionEditorState);
  const isReadOnly = functionEditorState.isReadOnly;
  const functionElement = functionEditorState.functionElement;
  const selectedTab = functionEditorState.selectedTab;
  let addButtonTitle = '';
  switch (selectedTab) {
    case FUNCTION_EDITOR_TAB.TAGGED_VALUES:
      addButtonTitle = 'Add stereotype';
      break;
    case FUNCTION_EDITOR_TAB.STEREOTYPES:
      addButtonTitle = 'Add tagged value';
      break;
    default:
      break;
  }
  // Tagged Values and Stereotype
  const add = (): void => {
    if (!isReadOnly) {
      if (selectedTab === FUNCTION_EDITOR_TAB.TAGGED_VALUES) {
        annotatedElement_addTaggedValue(
          functionElement,
          stub_TaggedValue(stub_Tag(stub_Profile())),
        );
      } else if (selectedTab === FUNCTION_EDITOR_TAB.STEREOTYPES) {
        annotatedElement_addStereotype(
          functionElement,
          StereotypeExplicitReference.create(stub_Stereotype(stub_Profile())),
        );
      }
    }
  };
  const handleDropTaggedValue = useCallback(
    (item: UMLEditorElementDropTarget): void => {
      if (!isReadOnly && item.data.packageableElement instanceof Profile) {
        annotatedElement_addTaggedValue(
          functionElement,
          stub_TaggedValue(stub_Tag(item.data.packageableElement)),
        );
      }
    },
    [functionElement, isReadOnly],
  );
  const [{ isTaggedValueDragOver }, dropTaggedValueRef] = useDrop<
    ElementDragSource,
    void,
    { isTaggedValueDragOver: boolean }
  >(
    () => ({
      accept: [CORE_DND_TYPE.PROJECT_EXPLORER_PROFILE],
      drop: (item) => handleDropTaggedValue(item),
      collect: (monitor) => ({
        isTaggedValueDragOver: monitor.isOver({ shallow: true }),
      }),
    }),
    [handleDropTaggedValue],
  );
  const handleDropStereotype = useCallback(
    (item: UMLEditorElementDropTarget): void => {
      if (!isReadOnly && item.data.packageableElement instanceof Profile) {
        annotatedElement_addStereotype(
          functionElement,
          StereotypeExplicitReference.create(
            stub_Stereotype(item.data.packageableElement),
          ),
        );
      }
    },
    [functionElement, isReadOnly],
  );
  const [{ isStereotypeDragOver }, dropStereotypeRef] = useDrop<
    ElementDragSource,
    void,
    { isStereotypeDragOver: boolean }
  >(
    () => ({
      accept: [CORE_DND_TYPE.PROJECT_EXPLORER_PROFILE],
      drop: (item) => handleDropStereotype(item),
      collect: (monitor) => ({
        isStereotypeDragOver: monitor.isOver({ shallow: true }),
      }),
    }),
    [handleDropStereotype],
  );
  const _deleteStereotype =
    (val: StereotypeReference): (() => void) =>
    (): void =>
      annotatedElement_deleteStereotype(functionElement, val);
  const _deleteTaggedValue =
    (val: TaggedValue): (() => void) =>
    (): void =>
      annotatedElement_deleteTaggedValue(functionElement, val);
  const changeTab =
    (tab: FUNCTION_EDITOR_TAB): (() => void) =>
    (): void =>
      functionEditorState.setSelectedTab(tab);

  const activate = (): void => {
    flowResult(functionEditorState.activatorBuilderState.activate()).catch(
      applicationStore.alertUnhandledError,
    );
  };

  const runFunc = applicationStore.guardUnhandledError(() =>
    flowResult(functionEditorState.handleRunFunc()),
  );

  const executionIsRunning =
    functionEditorState.isRunningFunc || functionEditorState.isGeneratingPlan;

  const cancelQuery = applicationStore.guardUnhandledError(() =>
    flowResult(functionEditorState.cancelFuncRun()),
  );

  const generatePlan = applicationStore.guardUnhandledError(() =>
    flowResult(functionEditorState.generatePlan(false)),
  );

  const debugPlanGeneration = applicationStore.guardUnhandledError(() =>
    flowResult(functionEditorState.generatePlan(true)),
  );

  useEffect(() => {
    flowResult(
      functionEditorState.functionDefinitionEditorState.convertLambdaObjectToGrammarString(
        true,
        true,
      ),
    ).catch(applicationStore.alertUnhandledError);
  }, [applicationStore, functionEditorState]);

  useApplicationNavigationContext(
    LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY.FUNCTION_EDITOR,
  );

  return (
    <div className="function-editor uml-editor uml-editor--dark">
      <Panel>
        <div className="panel__header">
          <div className="panel__header__title">
            {isReadOnly && (
              <div className="uml-element-editor__header__lock">
                <LockIcon />
              </div>
            )}
            <div className="panel__header__title__label">function</div>
            <div className="panel__header__title__content">
              {functionElement.functionName}
            </div>
          </div>
        </div>
        <div className="panel__header function-editor__tabs__header">
          <div className="function-editor__tabs">
            {Object.values(FUNCTION_EDITOR_TAB).map((tab) => (
              <div
                key={tab}
                onClick={changeTab(tab)}
                className={clsx('function-editor__tab', {
                  'function-editor__tab--active': tab === selectedTab,
                })}
              >
                {prettyCONSTName(tab)}
              </div>
            ))}
          </div>
          <div className="panel__header__actions">
            <div className="btn__dropdown-combo btn__dropdown-combo--primary">
              {functionEditorState.isRunningFunc ? (
                <button
                  className="btn__dropdown-combo__canceler"
                  onClick={cancelQuery}
                  tabIndex={-1}
                >
                  <div className="btn--dark btn--caution btn__dropdown-combo__canceler__label">
                    <PauseCircleIcon className="btn__dropdown-combo__canceler__label__icon" />
                    <div className="btn__dropdown-combo__canceler__label__title">
                      Stop
                    </div>
                  </div>
                </button>
              ) : (
                <>
                  <button
                    className="btn__dropdown-combo__label"
                    onClick={runFunc}
                    title="Run Function"
                    disabled={executionIsRunning}
                    tabIndex={-1}
                  >
                    <PlayIcon className="btn__dropdown-combo__label__icon" />
                    <div className="btn__dropdown-combo__label__title">Run</div>
                  </button>
                  <DropdownMenu
                    className="btn__dropdown-combo__dropdown-btn"
                    disabled={executionIsRunning}
                    content={
                      <MenuContent>
                        <MenuContentItem
                          className="btn__dropdown-combo__option"
                          onClick={generatePlan}
                        >
                          Generate Plan
                        </MenuContentItem>
                        <MenuContentItem
                          className="btn__dropdown-combo__option"
                          onClick={debugPlanGeneration}
                        >
                          Debug
                        </MenuContentItem>
                      </MenuContent>
                    }
                    menuProps={{
                      anchorOrigin: {
                        vertical: 'bottom',
                        horizontal: 'right',
                      },
                      transformOrigin: {
                        vertical: 'top',
                        horizontal: 'right',
                      },
                    }}
                  >
                    <CaretDownIcon />
                  </DropdownMenu>
                </>
              )}
            </div>
            {editorStore.applicationStore.config.options
              .TEMPORARY__enableFunctionActivatorSupport && (
              <>
                <DropdownMenu
                  className="btn__dropdown-combo"
                  disabled={
                    !editorStore.graphState.functionActivatorConfigurations
                      .length
                  }
                  content={
                    <MenuContent>
                      {editorStore.graphState.functionActivatorConfigurations.map(
                        (config) => (
                          <MenuContentItem
                            key={config.uuid}
                            className="function-editor__activator__selector__option"
                            onClick={() =>
                              functionEditorState.activatorBuilderState.setCurrentActivatorConfiguration(
                                config,
                              )
                            }
                            title={config.description}
                          >
                            <div className="function-editor__activator__selector__option__name">
                              {config.name}
                            </div>
                            <div className="function-editor__activator__selector__option__description">
                              {config.description}
                            </div>
                          </MenuContentItem>
                        ),
                      )}
                    </MenuContent>
                  }
                  menuProps={{
                    anchorOrigin: { vertical: 'bottom', horizontal: 'right' },
                    transformOrigin: { vertical: 'top', horizontal: 'right' },
                  }}
                >
                  <div className="btn__dropdown-combo__label">
                    <div className="btn__dropdown-combo__label__icon">
                      <LaunchIcon />
                    </div>
                    <div className="btn__dropdown-combo__label__title">
                      Activate
                    </div>
                  </div>
                  <div className="btn__dropdown-combo__dropdown-btn">
                    <CaretDownIcon />
                  </div>
                </DropdownMenu>
                {functionEditorState.activatorBuilderState
                  .currentActivatorConfiguration && (
                  <Dialog
                    open={Boolean(
                      functionEditorState.activatorBuilderState
                        .currentActivatorConfiguration,
                    )}
                    onClose={() =>
                      functionEditorState.activatorBuilderState.setCurrentActivatorConfiguration(
                        undefined,
                      )
                    }
                    classes={{
                      root: 'editor-modal__root-container',
                      container: 'editor-modal__container',
                      paper: 'editor-modal__content',
                    }}
                    // NOTE: this is a safer way compared to using <form> as it will not trigger click event
                    // on nested button
                    // See https://stackoverflow.com/questions/11353105/why-browser-trigger-a-click-event-instead-of-a-submit-in-a-form
                    // See https://stackoverflow.com/questions/3350247/how-to-prevent-form-from-being-submitted
                    // See https://gomakethings.com/how-to-prevent-buttons-from-causing-a-form-to-submit-with-html/
                    onKeyDown={(event) => {
                      if (event.code === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        activate();
                      }
                    }}
                  >
                    <Modal darkMode={true} className="editor-modal">
                      <ModalHeader>
                        <ModalTitle
                          title={`Function Activator: ${functionEditorState.activatorBuilderState.currentActivatorConfiguration.name}`}
                        />
                      </ModalHeader>
                      <ModalBody>
                        <div className="function-editor__activator-builder">
                          {functionEditorState.activatorBuilderState
                            .functionActivatorProtocolValueBuilderState && (
                            <FunctionActivatorContentBuilder
                              functionEditorState={functionEditorState}
                              valueBuilderState={
                                functionEditorState.activatorBuilderState
                                  .functionActivatorProtocolValueBuilderState
                              }
                            />
                          )}
                          {!functionEditorState.activatorBuilderState
                            .functionActivatorProtocolValueBuilderState && (
                            <BlankPanelContent>
                              No activator chosen
                            </BlankPanelContent>
                          )}
                        </div>
                      </ModalBody>
                      <ModalFooter>
                        <button
                          className="btn btn--dark function-editor__activator__btn"
                          type="submit"
                          disabled={
                            !functionEditorState.activatorBuilderState.isValid
                          }
                          onClick={activate}
                        >
                          Activate
                        </button>
                        <button
                          className="btn btn--dark"
                          onClick={() =>
                            functionEditorState.activatorBuilderState.setCurrentActivatorConfiguration(
                              undefined,
                            )
                          }
                        >
                          Close
                        </button>
                      </ModalFooter>
                    </Modal>
                  </Dialog>
                )}
              </>
            )}
            <button
              className="panel__header__action"
              disabled={
                isReadOnly || selectedTab === FUNCTION_EDITOR_TAB.DEFINITION
              }
              onClick={add}
              tabIndex={-1}
              title={addButtonTitle}
            >
              <PlusIcon />
            </button>
          </div>
        </div>
        <PanelContent>
          {selectedTab === FUNCTION_EDITOR_TAB.DEFINITION && (
            <FunctionDefinitionEditor
              functionEditorState={functionEditorState}
              isReadOnly={isReadOnly}
            />
          )}
          {selectedTab === FUNCTION_EDITOR_TAB.TAGGED_VALUES && (
            <div
              ref={dropTaggedValueRef}
              className={clsx('panel__content__lists', {
                'panel__content__lists--dnd-over':
                  isTaggedValueDragOver && !isReadOnly,
              })}
            >
              <TaggedValueDragPreviewLayer />
              {functionElement.taggedValues.map((taggedValue) => (
                <TaggedValueEditor
                  annotatedElement={functionElement}
                  key={taggedValue._UUID}
                  taggedValue={taggedValue}
                  deleteValue={_deleteTaggedValue(taggedValue)}
                  isReadOnly={isReadOnly}
                  darkTheme={true}
                />
              ))}
            </div>
          )}
          {selectedTab === FUNCTION_EDITOR_TAB.STEREOTYPES && (
            <div
              ref={dropStereotypeRef}
              className={clsx('panel__content__lists', {
                'panel__content__lists--dnd-over':
                  isStereotypeDragOver && !isReadOnly,
              })}
            >
              <StereotypeDragPreviewLayer />
              {functionElement.stereotypes.map((stereotype) => (
                <StereotypeSelector
                  key={stereotype.value._UUID}
                  annotatedElement={functionElement}
                  stereotype={stereotype}
                  deleteStereotype={_deleteStereotype(stereotype)}
                  isReadOnly={isReadOnly}
                  darkTheme={true}
                />
              ))}
            </div>
          )}
          <ExecutionPlanViewer
            executionPlanState={functionEditorState.executionPlanState}
          />
          {functionEditorState.parametersState.parameterValuesEditorState
            .showModal && (
            <LambdaParameterValuesEditor
              graph={functionEditorState.editorStore.graphManagerState.graph}
              observerContext={
                functionEditorState.editorStore.changeDetectionState
                  .observerContext
              }
              lambdaParametersState={functionEditorState.parametersState}
            />
          )}
        </PanelContent>
      </Panel>
    </div>
  );
});
