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
  FUNCTION_SPEC_TAB,
} from '../../../stores/editor-state/element-editor-state/FunctionEditorState.js';
import {
  CORE_DND_TYPE,
  type UMLEditorElementDropTarget,
  type ElementDragSource,
} from '../../../stores/shared/DnDUtils.js';
import {
  assertErrorThrown,
  prettyCONSTName,
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
  PanelEntryDropZonePlaceholder,
  DragPreviewLayer,
  useDragPreviewLayer,
  Panel,
  PanelContent,
} from '@finos/legend-art';
import { LEGEND_STUDIO_TEST_ID } from '../../LegendStudioTestID.js';
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
} from '@finos/legend-graph';
import {
  type PackageableElementOption,
  type ApplicationStore,
  type LegendApplicationPlugin,
  type LegendApplicationConfig,
  type LegendApplicationPluginManager,
  useApplicationNavigationContext,
  useApplicationStore,
  buildElementOption,
} from '@finos/legend-application';
import { getElementIcon } from '../../shared/ElementIconUtils.js';
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
} from '../../../stores/shared/modifier/DomainGraphModifierHelper.js';
import {
  rawVariableExpression_setMultiplicity,
  rawVariableExpression_setName,
  rawVariableExpression_setType,
} from '../../../stores/shared/modifier/RawValueSpecificationGraphModifierHelper.js';
import { LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY } from '../../../stores/LegendStudioApplicationNavigationContext.js';
import { LambdaEditor } from '@finos/legend-query-builder';
import type { EditorStore } from '../../../stores/EditorStore.js';
import { graph_renameElement } from '../../../stores/shared/modifier/GraphModifierHelper.js';

enum FUNCTION_PARAMETER_TYPE {
  CLASS = 'CLASS',
  ENUMERATION = 'ENUMERATION',
  PRIMITIVE = 'PRIMITIVE',
}

export const getFunctionParameterType = (
  type: Type,
): FUNCTION_PARAMETER_TYPE => {
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
    applicationStore.notifyError(error);
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
        editorStore.openElement(
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
    dragConnector(dropConnector(ref));
    useDragPreviewLayer(dragPreviewConnector);

    return (
      <div ref={ref} className="property-basic-editor__container">
        <PanelEntryDropZonePlaceholder showPlaceholder={isBeingDragged}>
          <div className="property-basic-editor">
            {isReadOnly && (
              <div className="property-basic-editor__lock">
                <LockIcon />
              </div>
            )}
            <PanelEntryDragHandle />
            <input
              className="property-basic-editor__name"
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
                    {getElementIcon(editorStore, paramType)}
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
                    {getElementIcon(editorStore, paramType)}
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
              <div className="property-basic-editor__multiplicity__range">
                ..
              </div>
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
                className="uml-element-editor__remove-btn"
                disabled={isReadOnly}
                onClick={deleteParameter}
                tabIndex={-1}
                title="Remove"
              >
                <TimesIcon />
              </button>
            )}
          </div>
        </PanelEntryDropZonePlaceholder>
      </div>
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
        editorStore.openElement(
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
                {getElementIcon(editorStore, returnType.value)}
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
                {getElementIcon(editorStore, returnType.value)}
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
          className="uml-element-editor__remove-btn"
          disabled={true}
          tabIndex={-1}
        >
          <TimesIcon />
        </button>
      </div>
    );
  },
);

export const FunctionMainEditor = observer(
  (props: {
    functionElement: ConcreteFunctionDefinition;
    isReadOnly: boolean;
    functionEditorState: FunctionEditorState;
  }) => {
    const editorStore = useEditorStore();
    const applicationStore = useApplicationStore();
    const { functionElement, isReadOnly, functionEditorState } = props;
    const lambdaEditorState = functionEditorState.functionBodyEditorState;
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
    return (
      <div className="panel__content function-editor__element">
        <div className="function-editor__element__item">
          <div className="function-editor__element__item__header">
            <div className="function-editor__element__item__header__title">
              PARAMETERS
            </div>
            <button
              className="function-editor__element__item__header__add-btn"
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
            className={clsx('function-editor__element__item__content', {
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
          </div>
        </div>
        <div className="function-editor__element__item">
          <div className="function-editor__element__item__header">
            <div className="function-editor__element__item__header__title">
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
            className={clsx('function-editor__element__item__content', {
              backdrop__element: Boolean(
                functionEditorState.functionBodyEditorState.parserError,
              ),
            })}
          >
            <LambdaEditor
              className="function-editor__element__lambda-editor"
              disabled={
                lambdaEditorState.isConvertingFunctionBodyToString || isReadOnly
              }
              lambdaEditorState={lambdaEditorState}
              expectedType={functionElement.returnType.value}
              forceBackdrop={false}
              forceExpansion={true}
            />
          </div>
        </div>
      </div>
    );
  },
);

export const FunctionEditor = observer(() => {
  const editorStore = useEditorStore();
  const applicationStore = useApplicationStore();
  const functionEditorState =
    editorStore.getCurrentEditorState(FunctionEditorState);
  const isReadOnly = functionEditorState.isReadOnly;
  const functionElement = functionEditorState.functionElement;
  const selectedTab = functionEditorState.selectedTab;
  let addButtonTitle = '';
  switch (selectedTab) {
    case FUNCTION_SPEC_TAB.TAGGED_VALUES:
      addButtonTitle = 'Add stereotype';
      break;
    case FUNCTION_SPEC_TAB.STEREOTYPES:
      addButtonTitle = 'Add tagged value';
      break;
    default:
      break;
  }
  // Tagged Values and Stereotype
  const add = (): void => {
    if (!isReadOnly) {
      if (selectedTab === FUNCTION_SPEC_TAB.TAGGED_VALUES) {
        annotatedElement_addTaggedValue(
          functionElement,
          stub_TaggedValue(stub_Tag(stub_Profile())),
        );
      } else if (selectedTab === FUNCTION_SPEC_TAB.STEREOTYPES) {
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
    (tab: FUNCTION_SPEC_TAB): (() => void) =>
    (): void =>
      functionEditorState.setSelectedTab(tab);

  useEffect(() => {
    flowResult(
      functionEditorState.functionBodyEditorState.convertLambdaObjectToGrammarString(
        true,
        true,
      ),
    ).catch(applicationStore.alertUnhandledError);
  }, [applicationStore, functionEditorState]);

  useApplicationNavigationContext(
    LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY.FUNCTION_EDITOR,
  );

  return (
    <div className="function-editor">
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
            {Object.values(FUNCTION_SPEC_TAB).map((tab) => (
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
            <button
              className="panel__header__action"
              disabled={isReadOnly || selectedTab === FUNCTION_SPEC_TAB.GENERAL}
              onClick={add}
              tabIndex={-1}
              title={addButtonTitle}
            >
              <PlusIcon />
            </button>
          </div>
        </div>
        {selectedTab === FUNCTION_SPEC_TAB.GENERAL ? (
          <FunctionMainEditor
            functionEditorState={functionEditorState}
            functionElement={functionElement}
            isReadOnly={isReadOnly}
          />
        ) : (
          <PanelContent>
            {selectedTab === FUNCTION_SPEC_TAB.TAGGED_VALUES && (
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
                  />
                ))}
              </div>
            )}
            {selectedTab === FUNCTION_SPEC_TAB.STEREOTYPES && (
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
                  />
                ))}
              </div>
            )}
          </PanelContent>
        )}
      </Panel>
    </div>
  );
});
