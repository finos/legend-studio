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

import { useState, useEffect, useCallback } from 'react';
import { observer } from 'mobx-react-lite';
import {
  FunctionEditorState,
  FUNCTION_SPEC_TAB,
} from '../../../stores/editor-state/element-editor-state/FunctionEditorState';
import {
  CORE_DND_TYPE,
  type UMLEditorElementDropTarget,
  type ElementDragSource,
} from '../../../stores/shared/DnDUtil';
import {
  prettyCONSTName,
  UnsupportedOperationError,
} from '@finos/legend-shared';
import { useDrop } from 'react-dnd';
import {
  clsx,
  CustomSelectorInput,
  createFilter,
  LockIcon,
  PlusIcon,
  TimesIcon,
  ArrowCircleRightIcon,
} from '@finos/legend-art';
import { LEGEND_STUDIO_TEST_ID } from '../../LegendStudioTestID';
import { StereotypeSelector } from './uml-editor/StereotypeSelector';
import { TaggedValueEditor } from './uml-editor/TaggedValueEditor';
import type { PackageableElementOption } from '../../../stores/shared/PackageableElementOptionUtil';
import { flowResult } from 'mobx';
import { useEditorStore } from '../EditorStoreProvider';
import {
  type ConcreteFunctionDefinition,
  type StereotypeReference,
  PRIMITIVE_TYPE,
  MULTIPLICITY_INFINITE,
  TaggedValue,
  Tag,
  Profile,
  Stereotype,
  Unit,
  RawVariableExpression,
  Type,
  Multiplicity,
  Enumeration,
  Class,
  PrimitiveType,
  StereotypeExplicitReference,
} from '@finos/legend-graph';
import { useApplicationStore } from '@finos/legend-application';
import { StudioLambdaEditor } from '../../shared/StudioLambdaEditor';
import { getElementIcon } from '../../shared/ElementIconUtils';

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

const ParameterBasicEditor = observer(
  (props: {
    parameter: RawVariableExpression;
    deleteParameter: () => void;
    isReadOnly: boolean;
  }) => {
    const { parameter, deleteParameter, isReadOnly } = props;
    const editorStore = useEditorStore();
    // Name
    const changeValue: React.ChangeEventHandler<HTMLInputElement> = (event) =>
      parameter.setName(event.target.value);
    // Type
    const [isEditingType, setIsEditingType] = useState(false);
    const typeOptions = editorStore.classPropertyGenericTypeOptions;
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
      parameter.setType(val.value);
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
        parameter.setMultiplicity(new Multiplicity(lBound, uBound));
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
      <div className="property-basic-editor">
        {isReadOnly && (
          <div className="property-basic-editor__lock">
            <LockIcon />
          </div>
        )}
        <input
          className="property-basic-editor__name"
          disabled={isReadOnly}
          value={parameter.name}
          spellCheck={false}
          onChange={changeValue}
          placeholder={`Property name`}
        />
        {!isReadOnly && isEditingType && (
          <CustomSelectorInput
            className="property-basic-editor__type"
            options={typeOptions}
            onChange={changeType}
            value={selectedType}
            placeholder={'Choose a data type or enumeration'}
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
                title={'Visit element'}
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
                title={'Visit element'}
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
            className="uml-element-editor__remove-btn"
            disabled={isReadOnly}
            onClick={deleteParameter}
            tabIndex={-1}
            title={'Remove'}
          >
            <TimesIcon />
          </button>
        )}
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
    // Type
    const [isEditingType, setIsEditingType] = useState(false);
    const typeOptions = editorStore.classPropertyGenericTypeOptions;
    const typeName = getFunctionParameterType(returnType.value);
    const filterOption = createFilter({
      ignoreCase: true,
      ignoreAccents: false,
      stringify: (option: PackageableElementOption<Type>): string =>
        option.value.path,
    });
    const selectedType = { value: returnType, label: returnType.value.name };
    const changeType = (val: PackageableElementOption<Type>): void => {
      functionElement.setReturnType(val.value);
      setIsEditingType(false);
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
        functionElement.setReturnMultiplicity(new Multiplicity(lBound, uBound));
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
            placeholder={'Choose a data type or enumeration'}
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
                title={'Visit element'}
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
                title={'Visit element'}
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
    const defaultType = editorStore.graphManagerState.graph.getPrimitiveType(
      PRIMITIVE_TYPE.STRING,
    );
    const { functionElement, isReadOnly, functionEditorState } = props;
    const lambdaEditorState = functionEditorState.functionBodyEditorState;
    // Parameters
    const addParameter = (): void => {
      functionElement.addParameter(
        RawVariableExpression.createStub(defaultType),
      );
    };
    const deleteParameter =
      (val: RawVariableExpression): (() => void) =>
      (): void => {
        functionElement.deleteParameter(val);
      };
    const handleDropParameter = useCallback(
      (item: UMLEditorElementDropTarget): void => {
        if (!isReadOnly && item.data.packageableElement instanceof Type) {
          functionElement.addParameter(
            RawVariableExpression.createStub(item.data.packageableElement),
          );
        }
      },
      [functionElement, isReadOnly],
    );
    const [{ isParameterDragOver }, dropParameterRef] = useDrop(
      () => ({
        accept: [
          CORE_DND_TYPE.PROJECT_EXPLORER_CLASS,
          CORE_DND_TYPE.PROJECT_EXPLORER_ENUMERATION,
        ],
        drop: (item: ElementDragSource): void => handleDropParameter(item),
        collect: (monitor): { isParameterDragOver: boolean } => ({
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
              title={'Add Parameter'}
            >
              <PlusIcon />
            </button>
          </div>
          <div
            ref={dropParameterRef}
            className={clsx('function-editor__element__item__content', {
              'panel__content__lists--dnd-over':
                isParameterDragOver && !isReadOnly,
            })}
          >
            {functionElement.parameters.map((param) => (
              <ParameterBasicEditor
                key={param.uuid}
                parameter={param}
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
            <ReturnTypeEditor
              functionElement={functionElement}
              isReadOnly={isReadOnly}
            />
          </div>
          <div
            className={clsx('function-editor__element__item__content', {
              backdrop__element: Boolean(
                functionEditorState.functionBodyEditorState.parserError,
              ),
            })}
          >
            <StudioLambdaEditor
              className={'function-editor__element__lambda-editor'}
              disabled={
                lambdaEditorState.isConvertingFunctionBodyToString || isReadOnly
              }
              lambdaEditorState={lambdaEditorState}
              expectedType={functionElement.returnType.value}
              forceBackdrop={false}
              forceExpansion={true}
              disablePopUp={true}
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
        functionElement.addTaggedValue(
          TaggedValue.createStub(Tag.createStub(Profile.createStub())),
        );
      } else if (selectedTab === FUNCTION_SPEC_TAB.STEREOTYPES) {
        functionElement.addStereotype(
          StereotypeExplicitReference.create(
            Stereotype.createStub(Profile.createStub()),
          ),
        );
      }
    }
  };
  const handleDropTaggedValue = useCallback(
    (item: UMLEditorElementDropTarget): void => {
      if (!isReadOnly && item.data.packageableElement instanceof Profile) {
        functionElement.addTaggedValue(
          TaggedValue.createStub(Tag.createStub(item.data.packageableElement)),
        );
      }
    },
    [functionElement, isReadOnly],
  );
  const [{ isTaggedValueDragOver }, dropTaggedValueRef] = useDrop(
    () => ({
      accept: [CORE_DND_TYPE.PROJECT_EXPLORER_PROFILE],
      drop: (item: ElementDragSource): void => handleDropTaggedValue(item),
      collect: (monitor): { isTaggedValueDragOver: boolean } => ({
        isTaggedValueDragOver: monitor.isOver({ shallow: true }),
      }),
    }),
    [handleDropTaggedValue],
  );
  const handleDropStereotype = useCallback(
    (item: UMLEditorElementDropTarget): void => {
      if (!isReadOnly && item.data.packageableElement instanceof Profile) {
        functionElement.addStereotype(
          StereotypeExplicitReference.create(
            Stereotype.createStub(item.data.packageableElement),
          ),
        );
      }
    },
    [functionElement, isReadOnly],
  );
  const [{ isStereotypeDragOver }, dropStereotypeRef] = useDrop(
    () => ({
      accept: [CORE_DND_TYPE.PROJECT_EXPLORER_PROFILE],
      drop: (item: ElementDragSource): void => handleDropStereotype(item),
      collect: (monitor): { isStereotypeDragOver: boolean } => ({
        isStereotypeDragOver: monitor.isOver({ shallow: true }),
      }),
    }),
    [handleDropStereotype],
  );
  const deleteStereotype =
    (val: StereotypeReference): (() => void) =>
    (): void =>
      functionElement.deleteStereotype(val);
  const deleteTaggedValue =
    (val: TaggedValue): (() => void) =>
    (): void =>
      functionElement.deleteTaggedValue(val);
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
    ).catch(applicationStore.alertIllegalUnhandledError);
  }, [applicationStore, functionEditorState]);

  return (
    <div className="function-editor">
      <div className="panel">
        <div className="panel__header">
          <div className="panel__header__title">
            {isReadOnly && (
              <div className="uml-element-editor__header__lock">
                <LockIcon />
              </div>
            )}
            <div className="panel__header__title__label">function</div>
            <div className="panel__header__title__content">
              {functionElement.name}
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
          <div className="panel__content">
            {selectedTab === FUNCTION_SPEC_TAB.TAGGED_VALUES && (
              <div
                ref={dropTaggedValueRef}
                className={clsx('panel__content__lists', {
                  'panel__content__lists--dnd-over':
                    isTaggedValueDragOver && !isReadOnly,
                })}
              >
                {functionElement.taggedValues.map((taggedValue) => (
                  <TaggedValueEditor
                    key={taggedValue.uuid}
                    taggedValue={taggedValue}
                    deleteValue={deleteTaggedValue(taggedValue)}
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
                {functionElement.stereotypes.map((stereotype) => (
                  <StereotypeSelector
                    key={stereotype.value.uuid}
                    stereotype={stereotype}
                    deleteStereotype={deleteStereotype(stereotype)}
                    isReadOnly={isReadOnly}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});
