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

import { useState, useRef, useEffect, useCallback } from 'react';
import { useResizeDetector } from 'react-resize-detector';
import { InheritanceDiagramRenderer } from '../../../shared/diagram-viewer/InheritanceDiagramRenderer';
import { observer } from 'mobx-react-lite';
import SplitPane from 'react-split-pane';
import { useEditorStore } from '../../../../stores/EditorStore';
import { prettyCONSTName } from '@finos/legend-studio-shared';
import { LambdaEditor } from '../../../shared/LambdaEditor';
import { useDrop } from 'react-dnd';
import type {
  ElementDragSource,
  UMLEditorElementDropTarget,
} from '../../../../stores/shared/DnDUtil';
import { CORE_DND_TYPE } from '../../../../stores/shared/DnDUtil';
import {
  FaLock,
  FaPlus,
  FaTimes,
  FaLongArrowAltRight,
  FaArrowAltCircleRight,
  FaFire,
  FaArrowCircleRight,
} from 'react-icons/fa';
import {
  clsx,
  CustomSelectorInput,
  createFilter,
} from '@finos/legend-studio-components';
import { CORE_TEST_ID } from '../../../../const';
import {
  PRIMITIVE_TYPE,
  MULTIPLICITY_INFINITE,
} from '../../../../models/MetaModelConst';
import { getElementIcon } from '../../../shared/Icon';
import { PropertyEditor } from './PropertyEditor';
import { StereotypeSelector } from './StereotypeSelector';
import { TaggedValueEditor } from './TaggedValueEditor';
import { UML_EDITOR_TAB } from '../../../../stores/editor-state/element-editor-state/UMLEditorState';
import { ClassEditorState } from '../../../../stores/editor-state/element-editor-state/ClassEditorState';
import { useApplicationStore } from '../../../../stores/ApplicationStore';
import {
  Class,
  CLASS_PROPERTY_TYPE,
  getClassPropertyType,
} from '../../../../models/metamodels/pure/model/packageableElements/domain/Class';
import { Property } from '../../../../models/metamodels/pure/model/packageableElements/domain/Property';
import { DerivedProperty } from '../../../../models/metamodels/pure/model/packageableElements/domain/DerivedProperty';
import { GenericType } from '../../../../models/metamodels/pure/model/packageableElements/domain/GenericType';
import { Profile } from '../../../../models/metamodels/pure/model/packageableElements/domain/Profile';
import { Tag } from '../../../../models/metamodels/pure/model/packageableElements/domain/Tag';
import { TaggedValue } from '../../../../models/metamodels/pure/model/packageableElements/domain/TaggedValue';
import { Stereotype } from '../../../../models/metamodels/pure/model/packageableElements/domain/Stereotype';
import type { PackageableElementSelectOption } from '../../../../models/metamodels/pure/model/packageableElements/PackageableElement';
import { Multiplicity } from '../../../../models/metamodels/pure/model/packageableElements/domain/Multiplicity';
import { Constraint } from '../../../../models/metamodels/pure/model/packageableElements/domain/Constraint';
import { Type } from '../../../../models/metamodels/pure/model/packageableElements/domain/Type';
import { PrimitiveType } from '../../../../models/metamodels/pure/model/packageableElements/domain/PrimitiveType';
import { Unit } from '../../../../models/metamodels/pure/model/packageableElements/domain/Measure';
import type { StereotypeReference } from '../../../../models/metamodels/pure/model/packageableElements/domain/StereotypeReference';
import { StereotypeExplicitReference } from '../../../../models/metamodels/pure/model/packageableElements/domain/StereotypeReference';
import type { GenericTypeReference } from '../../../../models/metamodels/pure/model/packageableElements/domain/GenericTypeReference';
import { GenericTypeExplicitReference } from '../../../../models/metamodels/pure/model/packageableElements/domain/GenericTypeReference';
import { Association } from '../../../../models/metamodels/pure/model/packageableElements/domain/Association';

const PropertyBasicEditor = observer(
  (props: {
    _class: Class;
    property: Property;
    selectProperty: () => void;
    deleteProperty: () => void;
    isReadOnly: boolean;
  }) => {
    const { property, _class, selectProperty, deleteProperty, isReadOnly } =
      props;
    const editorStore = useEditorStore();
    const isInheritedProperty =
      property.owner instanceof Class && property.owner !== _class;
    const isPropertyFromAssociation = property.owner instanceof Association;
    const isIndirectProperty = isInheritedProperty || isPropertyFromAssociation;
    // Name
    const changeValue: React.ChangeEventHandler<HTMLInputElement> = (event) =>
      property.setName(event.target.value);
    // Generic Type
    const [isEditingType, setIsEditingType] = useState(false);
    const propertyTypeOptions = editorStore.classPropertyGenericTypeOptions;
    const propertyType = property.genericType.value.rawType;
    const propertyTypeName = getClassPropertyType(propertyType);
    const filterOption = createFilter({
      ignoreCase: true,
      ignoreAccents: false,
      stringify: (option: PackageableElementSelectOption<Type>): string =>
        option.value.path,
    });
    const selectedPropertyType = {
      value: propertyType,
      label: propertyType.name,
    };
    const changePropertyType = (
      val: PackageableElementSelectOption<Type>,
    ): void => {
      property.setGenericType(new GenericType(val.value));
      setIsEditingType(false);
    };
    // Multiplicity
    const [lowerBound, setLowerBound] = useState<string | number>(
      property.multiplicity.lowerBound,
    );
    const [upperBound, setUpperBound] = useState<string | number>(
      property.multiplicity.upperBound ?? MULTIPLICITY_INFINITE,
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
        property.setMultiplicity(new Multiplicity(lBound, uBound));
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
    // Other
    const openElement = (): void => {
      if (!(propertyType instanceof PrimitiveType)) {
        editorStore.openElement(
          propertyType instanceof Unit ? propertyType.measure : propertyType,
        );
      }
    };
    // NOTE: for now we do not allow directly modifying inherited and associated properties,
    // we would make the user go to the supertype or the association where the property comes from
    const visitOwner = (): void => editorStore.openElement(property.owner);

    return (
      <div className="property-basic-editor">
        {isIndirectProperty && (
          <div className="property-basic-editor__name--with-lock">
            <div className="property-basic-editor__name--with-lock__icon">
              <FaLock />
            </div>
            <span className="property-basic-editor__name--with-lock__name">
              {property.name}
            </span>
          </div>
        )}
        {!isIndirectProperty && (
          <input
            className="property-basic-editor__name"
            disabled={isReadOnly}
            value={property.name}
            spellCheck={false}
            onChange={changeValue}
            placeholder={`Property name`}
            name={`Property name`}
          />
        )}
        {!isIndirectProperty && !isReadOnly && isEditingType && (
          <CustomSelectorInput
            className="property-basic-editor__type"
            options={propertyTypeOptions}
            onChange={changePropertyType}
            value={selectedPropertyType}
            placeholder={'Choose a data type or enumeration'}
            filterOption={filterOption}
          />
        )}
        {!isIndirectProperty && !isReadOnly && !isEditingType && (
          <div
            className={clsx(
              'property-basic-editor__type',
              'property-basic-editor__type--show-click-hint',
              `background--${propertyTypeName.toLowerCase()}`,
              {
                'property-basic-editor__type--has-visit-btn':
                  propertyTypeName !== CLASS_PROPERTY_TYPE.PRIMITIVE,
              },
            )}
          >
            {propertyTypeName !== CLASS_PROPERTY_TYPE.PRIMITIVE && (
              <div className="property-basic-editor__type__abbr">
                {getElementIcon(editorStore, propertyType)}
              </div>
            )}
            <div className="property-basic-editor__type__label">
              {propertyType.name}
            </div>
            <div
              data-testid={
                CORE_TEST_ID.PROPERTY_BASIC_EDITOR__TYPE__LABEL_HOVER
              }
              className="property-basic-editor__type__label property-basic-editor__type__label--hover"
              onClick={(): void => setIsEditingType(true)}
            >
              Click to edit
            </div>
            {propertyTypeName !== CLASS_PROPERTY_TYPE.PRIMITIVE && (
              <button
                data-testid={CORE_TEST_ID.TYPE_VISIT}
                className="property-basic-editor__type__visit-btn"
                onClick={openElement}
                tabIndex={-1}
                title={'Visit element'}
              >
                <FaArrowAltCircleRight />
              </button>
            )}
          </div>
        )}
        {(isIndirectProperty || isReadOnly) && (
          <div
            className={clsx(
              'property-basic-editor__type',
              `background--${propertyTypeName.toLowerCase()}`,
              {
                'property-basic-editor__type--has-visit-btn':
                  propertyTypeName !== CLASS_PROPERTY_TYPE.PRIMITIVE,
              },
            )}
          >
            {propertyTypeName !== CLASS_PROPERTY_TYPE.PRIMITIVE && (
              <div className="property-basic-editor__type__abbr">
                {getElementIcon(editorStore, propertyType)}
              </div>
            )}
            <div className="property-basic-editor__type__label">
              {propertyType.name}
            </div>
            {propertyTypeName !== CLASS_PROPERTY_TYPE.PRIMITIVE && (
              <button
                data-testid={CORE_TEST_ID.TYPE_VISIT}
                className="property-basic-editor__type__visit-btn"
                onClick={openElement}
                tabIndex={-1}
                title={'Visit element'}
              >
                <FaArrowAltCircleRight />
              </button>
            )}
          </div>
        )}
        <div className="property-basic-editor__multiplicity">
          <input
            className="property-basic-editor__multiplicity-bound"
            disabled={isIndirectProperty || isReadOnly}
            spellCheck={false}
            value={lowerBound}
            onChange={changeLowerBound}
            name={`Type from bound`}
          />
          <div className="property-basic-editor__multiplicity__range">..</div>
          <input
            className="property-basic-editor__multiplicity-bound"
            disabled={isIndirectProperty || isReadOnly}
            spellCheck={false}
            value={upperBound}
            onChange={changeUpperBound}
            name={`Type to bound`}
          />
        </div>
        {!isIndirectProperty && (
          <button
            className="uml-element-editor__basic__detail-btn"
            onClick={selectProperty}
            tabIndex={-1}
            title={'See detail'}
          >
            <FaLongArrowAltRight />
          </button>
        )}
        {isIndirectProperty && (
          <button
            className="uml-element-editor__visit-parent-element-btn"
            onClick={visitOwner}
            tabIndex={-1}
            title={`Visit ${
              isInheritedProperty ? 'super type class' : 'association'
            } '${property.owner.path}'`}
          >
            <FaArrowAltCircleRight />
          </button>
        )}
        {isIndirectProperty && (
          <div className="property-basic-editor__locked-property-end-block"></div>
        )}
        {!isIndirectProperty && !isReadOnly && (
          <button
            className={clsx('uml-element-editor__remove-btn', {
              'uml-element-editor__remove-btn--hidden': isIndirectProperty,
            })}
            onClick={deleteProperty}
            tabIndex={-1}
            title={'Remove'}
          >
            <FaTimes />
          </button>
        )}
      </div>
    );
  },
);

const DerivedPropertyBasicEditor = observer(
  (props: {
    _class: Class;
    editorState: ClassEditorState;
    derivedProperty: DerivedProperty;
    selectDerivedProperty: () => void;
    deleteDerivedProperty: () => void;
    isReadOnly: boolean;
  }) => {
    const {
      derivedProperty,
      _class,
      selectDerivedProperty,
      deleteDerivedProperty,
      editorState,
      isReadOnly,
    } = props;
    const editorStore = useEditorStore();
    const applicationStore = useApplicationStore();
    const hasParserError = editorState.classState.derivedPropertyStates.some(
      (state) => state.parserError,
    );
    const dpState =
      editorState.classState.getDerivedPropertyState(derivedProperty);
    const isInheritedProperty = derivedProperty.owner !== _class;
    // Name
    const changeValue: React.ChangeEventHandler<HTMLInputElement> = (event) =>
      derivedProperty.setName(event.target.value);
    // Generic Type
    const [isEditingType, setIsEditingType] = useState(false);
    const propertyTypeOptions = editorStore.classPropertyGenericTypeOptions;
    const propertyType = derivedProperty.genericType.value.rawType;
    const propertyTypeName = getClassPropertyType(propertyType);
    const filterOption = createFilter({
      ignoreCase: true,
      ignoreAccents: false,
      stringify: (option: PackageableElementSelectOption<Type>): string =>
        option.value.path,
    });
    const selectedPropertyType = {
      value: propertyType,
      label: propertyType.name,
    };
    const changePropertyType = (
      val: PackageableElementSelectOption<Type>,
    ): void => {
      derivedProperty.setGenericType(new GenericType(val.value));
      setIsEditingType(false);
    };
    // Multiplicity
    const [lowerBound, setLowerBound] = useState<string | number>(
      derivedProperty.multiplicity.lowerBound,
    );
    const [upperBound, setUpperBound] = useState<string | number>(
      derivedProperty.multiplicity.upperBound ?? MULTIPLICITY_INFINITE,
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
        derivedProperty.setMultiplicity(new Multiplicity(lBound, uBound));
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
    // Action
    const openElement = (): void => {
      if (!(propertyType instanceof PrimitiveType)) {
        editorStore.openElement(
          propertyType instanceof Unit ? propertyType.measure : propertyType,
        );
      }
    };
    const visitOwner = (): void =>
      editorStore.openElement(derivedProperty.owner);
    const remove = applicationStore.guaranteeSafeAction(async () => {
      await dpState.convertLambdaObjectToGrammarString(false);
      deleteDerivedProperty();
    });

    return (
      <div
        className={clsx('derived-property-editor', {
          backdrop__element:
            dpState.parserError && !isInheritedProperty && !isReadOnly,
        })}
      >
        <div className="property-basic-editor">
          {isInheritedProperty && (
            <div className="property-basic-editor__name--with-lock">
              <div className="property-basic-editor__name--with-lock__icon">
                <FaLock />
              </div>
              <span className="property-basic-editor__name--with-lock__name">
                {derivedProperty.name}
              </span>
            </div>
          )}
          {!isInheritedProperty && (
            <input
              disabled={isReadOnly}
              spellCheck={false}
              className="property-basic-editor__name property-basic-editor__qualififed-property__name"
              value={derivedProperty.name}
              placeholder={`Property name`}
              onChange={changeValue}
              name={`Derived property name`}
            />
          )}
          {!isInheritedProperty && !isReadOnly && isEditingType && (
            <CustomSelectorInput
              className="property-basic-editor__type property-basic-editor__qualififed-property__type"
              options={propertyTypeOptions}
              onChange={changePropertyType}
              value={selectedPropertyType}
              placeholder={'Choose a data type or enumeration'}
              filterOption={filterOption}
            />
          )}
          {!isInheritedProperty && !isReadOnly && !isEditingType && (
            <div
              className={clsx(
                'property-basic-editor__type',
                'property-basic-editor__type--show-click-hint',
                `background--${propertyTypeName.toLowerCase()}`,
                {
                  'property-basic-editor__type--has-visit-btn':
                    propertyTypeName !== CLASS_PROPERTY_TYPE.PRIMITIVE,
                },
              )}
            >
              {propertyTypeName !== CLASS_PROPERTY_TYPE.PRIMITIVE && (
                <div className="property-basic-editor__type__abbr">
                  {getElementIcon(editorStore, propertyType)}
                </div>
              )}
              <div className="property-basic-editor__type__label">
                {propertyType.name}
              </div>
              <div
                data-testid={
                  CORE_TEST_ID.PROPERTY_BASIC_EDITOR__TYPE__LABEL_HOVER
                }
                className="property-basic-editor__type__label property-basic-editor__type__label--hover"
                onClick={(): void => setIsEditingType(true)}
              >
                Click to edit
              </div>
              {propertyTypeName !== CLASS_PROPERTY_TYPE.PRIMITIVE && (
                <button
                  data-testid={CORE_TEST_ID.TYPE_VISIT}
                  className="property-basic-editor__type__visit-btn"
                  onClick={openElement}
                  tabIndex={-1}
                  title={'Visit element'}
                >
                  <FaArrowAltCircleRight />
                </button>
              )}
            </div>
          )}
          {(isInheritedProperty || isReadOnly) && (
            <div
              className={clsx(
                'property-basic-editor__type',
                `background--${propertyTypeName.toLowerCase()}`,
                {
                  'property-basic-editor__type--has-visit-btn':
                    propertyTypeName !== CLASS_PROPERTY_TYPE.PRIMITIVE,
                },
              )}
            >
              {propertyTypeName !== CLASS_PROPERTY_TYPE.PRIMITIVE && (
                <div className="property-basic-editor__type__abbr">
                  {getElementIcon(editorStore, propertyType)}
                </div>
              )}
              <div className="property-basic-editor__type__label">
                {propertyType.name}
              </div>
              {propertyTypeName !== CLASS_PROPERTY_TYPE.PRIMITIVE && (
                <button
                  data-testid={CORE_TEST_ID.TYPE_VISIT}
                  className="property-basic-editor__type__visit-btn"
                  onClick={openElement}
                  tabIndex={-1}
                  title={'Visit element'}
                >
                  <FaArrowAltCircleRight />
                </button>
              )}
            </div>
          )}
          <div className="property-basic-editor__multiplicity">
            <input
              className="property-basic-editor__multiplicity-bound"
              spellCheck={false}
              disabled={isInheritedProperty || isReadOnly}
              value={lowerBound}
              onChange={changeLowerBound}
              name={`Type from bound`}
            />
            <div className="property-basic-editor__multiplicity__range">..</div>
            <input
              className="property-basic-editor__multiplicity-bound"
              spellCheck={false}
              disabled={isInheritedProperty || isReadOnly}
              value={upperBound}
              onChange={changeUpperBound}
              name={`Type to bound`}
            />
          </div>
          {!isInheritedProperty && (
            <button
              className="uml-element-editor__basic__detail-btn"
              onClick={selectDerivedProperty}
              tabIndex={-1}
              title={'See detail'}
            >
              <FaLongArrowAltRight />
            </button>
          )}
          {isInheritedProperty && (
            <button
              className="uml-element-editor__visit-parent-element-btn"
              onClick={visitOwner}
              tabIndex={-1}
              title={`Visit super type class ${derivedProperty.owner.path}`}
            >
              <FaArrowAltCircleRight />
            </button>
          )}
          {!isInheritedProperty && !isReadOnly && (
            <button
              className={clsx('uml-element-editor__remove-btn', {
                'uml-element-editor__remove-btn--hidden': isInheritedProperty,
              })}
              onClick={remove}
              tabIndex={-1}
              title={'Remove'}
            >
              <FaTimes />
            </button>
          )}
        </div>
        <LambdaEditor
          disabled={
            editorState.classState.isConvertingDerivedPropertyObjects ||
            isInheritedProperty ||
            isReadOnly
          }
          lambdaEditorState={dpState}
          forceBackdrop={hasParserError}
          expectedType={propertyType}
        />
      </div>
    );
  },
);

const ConstraintEditor = observer(
  (props: {
    editorState: ClassEditorState;
    _class: Class;
    constraint: Constraint;
    deleteConstraint: () => void;
    isReadOnly: boolean;
  }) => {
    const { constraint, _class, deleteConstraint, editorState, isReadOnly } =
      props;
    const editorStore = useEditorStore();
    const applicationStore = useApplicationStore();
    const hasParserError = editorState.classState.constraintStates.some(
      (state) => state.parserError,
    );
    const isInheritedConstraint = constraint.owner !== _class;
    const constraintState =
      editorState.classState.getConstraintState(constraint);
    // Name
    const changeName: React.ChangeEventHandler<HTMLInputElement> = (event) =>
      constraint.setName(event.target.value);
    // Actions
    const remove = applicationStore.guaranteeSafeAction(async () => {
      await constraintState.convertLambdaObjectToGrammarString(false);
      deleteConstraint();
    });
    const visitOwner = (): void => editorStore.openElement(constraint.owner);

    return (
      <div
        className={clsx('constraint-editor', {
          backdrop__element: constraintState.parserError,
        })}
      >
        <div className="constraint-editor__content">
          {isInheritedConstraint && (
            <div className="constraint-editor__content__name--with-lock">
              <div className="constraint-editor__content__name--with-lock__icon">
                <FaLock />
              </div>
              <span className="constraint-editor__content__name--with-lock__name">
                {constraint.name}
              </span>
            </div>
          )}
          {!isInheritedConstraint && (
            <input
              className="constraint-editor__content__name"
              spellCheck={false}
              disabled={isReadOnly || isInheritedConstraint}
              value={constraint.name}
              onChange={changeName}
              placeholder={`Constraint name`}
              name={`Constraint name`}
            />
          )}
          {isInheritedConstraint && (
            <button
              className="uml-element-editor__visit-parent-element-btn"
              onClick={visitOwner}
              tabIndex={-1}
              title={`Visit super type class ${constraint.owner.path}`}
            >
              <FaArrowAltCircleRight />
            </button>
          )}
          {!isInheritedConstraint && !isReadOnly && (
            <button
              className="uml-element-editor__remove-btn"
              disabled={isInheritedConstraint}
              onClick={remove}
              tabIndex={-1}
              title={'Remove'}
            >
              <FaTimes />
            </button>
          )}
        </div>
        <LambdaEditor
          disabled={
            editorState.classState.isConvertingConstraintObjects ||
            isReadOnly ||
            isInheritedConstraint
          }
          lambdaEditorState={constraintState}
          forceBackdrop={hasParserError}
          expectedType={editorStore.graphState.graph.getPrimitiveType(
            PRIMITIVE_TYPE.BOOLEAN,
          )}
        />
      </div>
    );
  },
);

const SuperTypeEditor = observer(
  (props: {
    _class: Class;
    superType: GenericTypeReference;
    deleteSuperType: () => void;
    isReadOnly: boolean;
  }) => {
    const { superType, _class, deleteSuperType, isReadOnly } = props;
    const editorStore = useEditorStore();
    // Type
    const superTypeOptions = editorStore.classOptions.filter(
      (classOption) =>
        classOption.value instanceof Class &&
        // Exclude current class
        classOption.value !== _class &&
        // Exclude super types of the class
        !_class.allSuperClasses.includes(classOption.value) &&
        // Ensure there is no loop (might be expensive)
        !classOption.value.allSuperClasses.includes(_class),
    );
    const rawType = superType.value.rawType;
    const filterOption = createFilter({
      ignoreCase: true,
      ignoreAccents: false,
      stringify: (option: PackageableElementSelectOption<Class>): string =>
        option.value.path,
    });
    const selectedType = { value: rawType, label: rawType.name };
    const changeType = (val: PackageableElementSelectOption<Class>): void =>
      superType.setValue(new GenericType(val.value));
    const visitDerivationSource = (): void => editorStore.openElement(rawType);

    return (
      <div className="super-type-editor">
        <CustomSelectorInput
          className="super-type-editor__class"
          disabled={isReadOnly}
          options={superTypeOptions}
          onChange={changeType}
          value={selectedType}
          placeholder={'Choose a class'}
          filterOption={filterOption}
        />
        <button
          className="uml-element-editor__basic__detail-btn"
          onClick={visitDerivationSource}
          tabIndex={-1}
          title={'Visit super type'}
        >
          <FaLongArrowAltRight />
        </button>
        {!isReadOnly && (
          <button
            className="uml-element-editor__remove-btn"
            disabled={isReadOnly}
            onClick={deleteSuperType}
            tabIndex={-1}
            title={'Remove'}
          >
            <FaTimes />
          </button>
        )}
      </div>
    );
  },
);

export const ClassFormEditor = observer(
  (props: {
    _class: Class;
    editorState: ClassEditorState;
    onHashChange?: () => void;
  }) => {
    const { _class, editorState, onHashChange } = props;
    const editorStore = useEditorStore();
    const applicationStore = useApplicationStore();
    const classHash = _class.isReadOnly
      ? undefined
      : applicationStore.notifyAndReturnAlternativeOnError(
          () => _class.hashCode,
          undefined,
        ); // attempting to read the hashCode of immutable element will throw an error
    const classState = editorState.classState;
    const isReadOnly = editorState.isReadOnly;
    const defaultType = editorStore.graphState.graph.getPrimitiveType(
      PRIMITIVE_TYPE.STRING,
    );
    // Selected property
    const [selectedProperty, setSelectedProperty] =
      useState<Property | DerivedProperty | undefined>();
    const selectProperty =
      (e: Property | DerivedProperty): (() => void) =>
      (): void =>
        setSelectedProperty(e);
    // Tab
    const selectedTab = editorState.selectedTab;
    const tabs = [
      UML_EDITOR_TAB.PROPERTIES,
      UML_EDITOR_TAB.DERIVED_PROPERTIES,
      UML_EDITOR_TAB.CONSTRAINTS,
      UML_EDITOR_TAB.SUPER_TYPES,
      UML_EDITOR_TAB.TAGGED_VALUES,
      UML_EDITOR_TAB.STEREOTYPES,
    ];
    const changeTab =
      (tab: UML_EDITOR_TAB): (() => void) =>
      (): void => {
        editorState.setSelectedTab(tab);
        setSelectedProperty(undefined);
      };
    // Tagged value and Stereotype
    const deleteStereotype =
      (val: StereotypeReference): (() => void) =>
      (): void =>
        _class.deleteStereotype(val);
    const deleteTaggedValue =
      (val: TaggedValue): (() => void) =>
      (): void =>
        _class.deleteTaggedValue(val);
    // Property
    const deleteProperty =
      (property: Property): (() => void) =>
      (): void => {
        _class.deleteProperty(property);
        if (property === selectedProperty) {
          setSelectedProperty(undefined);
        }
      };
    const indirectProperties = _class
      .getAllProperties()
      .filter((property) => !_class.properties.includes(property))
      .sort((p1, p2) => p1.name.localeCompare(p2.name))
      .sort(
        (p1, p2) =>
          (p1.owner === _class ? 1 : 0) - (p2.owner === _class ? 1 : 0),
      );
    const deselectProperty = (): void => setSelectedProperty(undefined);
    // Constraints
    const deleteConstraint =
      (constraint: Constraint): (() => void) =>
      (): void => {
        _class.deleteConstraint(constraint);
        classState.deleteConstraintState(constraint);
      };
    const inheritedConstraints = _class
      .getAllConstraints()
      .filter((constraint) => !_class.constraints.includes(constraint));
    // Super type
    const deleteSuperType =
      (superType: GenericTypeReference): (() => void) =>
      (): void => {
        _class.deleteSuperType(superType);
        if (superType.value.rawType instanceof Class) {
          superType.value.rawType.deleteSubClass(_class);
        }
      };
    const possibleSupertypes = editorStore.graphState.graph.classes.filter(
      (superType) =>
        // Exclude current class
        superType !== _class &&
        // Exclude super types of the class
        !_class.allSuperClasses.includes(superType) &&
        // Ensure there is no loop (might be expensive)
        !superType.allSuperClasses.includes(_class),
    );
    // Derived properties
    const indirectDerivedProperties = _class
      .getAllDerivedProperties()
      .filter((property) => !_class.derivedProperties.includes(property))
      .sort((p1, p2) => p1.name.localeCompare(p2.name))
      .sort(
        (p1, p2) =>
          (p1.owner === _class ? 1 : 0) - (p2.owner === _class ? 1 : 0),
      );
    const deleteDerivedProperty =
      (dp: DerivedProperty): (() => void) =>
      (): void => {
        _class.deleteDerivedProperty(dp);
        classState.deleteDerivedPropertyState(dp);
        if (dp === selectedProperty) {
          setSelectedProperty(undefined);
        }
      };
    // Add button
    let addButtonTitle = '';
    switch (selectedTab) {
      case UML_EDITOR_TAB.PROPERTIES:
        addButtonTitle = 'Add property';
        break;
      case UML_EDITOR_TAB.DERIVED_PROPERTIES:
        addButtonTitle = 'Add derived property';
        break;
      case UML_EDITOR_TAB.CONSTRAINTS:
        addButtonTitle = 'Add constraint';
        break;
      case UML_EDITOR_TAB.SUPER_TYPES:
        addButtonTitle = 'Add super type';
        break;
      case UML_EDITOR_TAB.TAGGED_VALUES:
        addButtonTitle = 'Add tagged value';
        break;
      case UML_EDITOR_TAB.STEREOTYPES:
        addButtonTitle = 'Add stereotype';
        break;
      default:
        break;
    }
    const isAddButtonDisabled =
      isReadOnly ||
      (selectedTab === UML_EDITOR_TAB.SUPER_TYPES &&
        !possibleSupertypes.length);
    const add = (): void => {
      if (!isReadOnly) {
        if (selectedTab === UML_EDITOR_TAB.PROPERTIES) {
          _class.addProperty(Property.createStub(defaultType, _class));
        } else if (selectedTab === UML_EDITOR_TAB.DERIVED_PROPERTIES) {
          const dp = DerivedProperty.createStub(defaultType, _class);
          _class.addDerivedProperty(dp);
          classState.addDerivedPropertyState(dp);
        } else if (selectedTab === UML_EDITOR_TAB.CONSTRAINTS) {
          const constraint = Constraint.createStub(_class);
          _class.addConstraint(constraint);
          classState.addConstraintState(constraint);
        } else if (
          selectedTab === UML_EDITOR_TAB.SUPER_TYPES &&
          possibleSupertypes.length
        ) {
          _class.addSuperType(
            GenericTypeExplicitReference.create(
              new GenericType(possibleSupertypes[0]),
            ),
          );
          possibleSupertypes[0].addSubClass(_class);
        } else if (selectedTab === UML_EDITOR_TAB.TAGGED_VALUES) {
          _class.addTaggedValue(
            TaggedValue.createStub(Tag.createStub(Profile.createStub())),
          );
        } else if (selectedTab === UML_EDITOR_TAB.STEREOTYPES) {
          _class.addStereotype(
            StereotypeExplicitReference.create(
              Stereotype.createStub(Profile.createStub()),
            ),
          );
        }
      }
    };
    // Drag and Drop
    const handleDropProperty = useCallback(
      (item: UMLEditorElementDropTarget): void => {
        if (!isReadOnly && item.data.packageableElement instanceof Type) {
          _class.addProperty(
            Property.createStub(item.data.packageableElement, _class),
          );
        }
      },
      [_class, isReadOnly],
    );
    const [{ isPropertyDragOver }, dropPropertyRef] = useDrop(
      () => ({
        accept: [
          CORE_DND_TYPE.PROJECT_EXPLORER_CLASS,
          CORE_DND_TYPE.PROJECT_EXPLORER_ENUMERATION,
        ],
        drop: (item: ElementDragSource): void => handleDropProperty(item),
        collect: (monitor): { isPropertyDragOver: boolean } => ({
          isPropertyDragOver: monitor.isOver({ shallow: true }),
        }),
      }),
      [handleDropProperty],
    );
    const handleDropDerivedProperty = useCallback(
      (item: UMLEditorElementDropTarget): void => {
        if (!isReadOnly && item.data.packageableElement instanceof Type) {
          const dp = DerivedProperty.createStub(
            item.data.packageableElement,
            _class,
          );
          _class.addDerivedProperty(dp);
          classState.addDerivedPropertyState(dp);
        }
      },
      [_class, classState, isReadOnly],
    );
    const [{ isDerivedPropertyDragOver }, dropDerivedPropertyRef] = useDrop(
      () => ({
        accept: [
          CORE_DND_TYPE.PROJECT_EXPLORER_CLASS,
          CORE_DND_TYPE.PROJECT_EXPLORER_ENUMERATION,
        ],
        drop: (item: ElementDragSource): void =>
          handleDropDerivedProperty(item),
        collect: (monitor): { isDerivedPropertyDragOver: boolean } => ({
          isDerivedPropertyDragOver: monitor.isOver({ shallow: true }),
        }),
      }),
      [handleDropDerivedProperty],
    );
    const handleDropSuperType = useCallback(
      (item: UMLEditorElementDropTarget): void => {
        const element = item.data.packageableElement;
        if (
          !isReadOnly &&
          // Have to be a class
          element instanceof Class &&
          // Must not be the same class
          element !== _class &&
          // Must not be a supertype of the current class
          !_class.allSuperClasses.includes(element) &&
          // Must not have the current class as a super type
          !element.allSuperClasses.includes(_class)
        ) {
          _class.addSuperType(
            GenericTypeExplicitReference.create(new GenericType(element)),
          );
          element.addSubClass(_class);
        }
      },
      [_class, isReadOnly],
    );
    const [{ isSuperTypeDragOver }, dropSuperTypeRef] = useDrop(
      () => ({
        accept: [
          CORE_DND_TYPE.PROJECT_EXPLORER_CLASS,
          CORE_DND_TYPE.PROJECT_EXPLORER_ENUMERATION,
        ],
        drop: (item: ElementDragSource): void => handleDropSuperType(item),
        collect: (monitor): { isSuperTypeDragOver: boolean } => ({
          isSuperTypeDragOver: monitor.isOver({ shallow: true }),
        }),
      }),
      [handleDropSuperType],
    );
    const handleDropTaggedValue = useCallback(
      (item: UMLEditorElementDropTarget): void => {
        if (!isReadOnly && item.data.packageableElement instanceof Profile) {
          _class.addTaggedValue(
            TaggedValue.createStub(
              Tag.createStub(item.data.packageableElement),
            ),
          );
        }
      },
      [_class, isReadOnly],
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
          _class.addStereotype(
            StereotypeExplicitReference.create(
              Stereotype.createStub(item.data.packageableElement),
            ),
          );
        }
      },
      [_class, isReadOnly],
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
    // Generation
    const visitGenerationParentElement = (): void => {
      if (_class.generationParentElement) {
        editorStore.openElement(_class.generationParentElement);
      }
    };
    // On change (this is used for diagram editor when users click on a class)
    useEffect(() => {
      onHashChange?.();
    }, [_class, classHash, onHashChange]);
    // Decorate (add/remove states for derived properties/constraints) and convert lambda objects
    useEffect(() => {
      classState.decorate();
      classState
        .convertConstraintObjects()
        .catch(applicationStore.alertIllegalUnhandledError);
      classState
        .convertDerivedPropertyObjects()
        .catch(applicationStore.alertIllegalUnhandledError);
    }, [applicationStore, classState]);

    return (
      <div
        data-testid={CORE_TEST_ID.CLASS_FORM_EDITOR}
        className="uml-element-editor class-form-editor"
      >
        <SplitPane
          split="horizontal"
          primary="second"
          size={selectedProperty ? 250 : 0}
          minSize={250}
          maxSize={-56}
        >
          <div className="panel">
            <div className="panel__header">
              <div className="panel__header__title">
                {isReadOnly && (
                  <div className="uml-element-editor__header__lock">
                    <FaLock />
                  </div>
                )}
                <div className="panel__header__title__label">class</div>
                <div className="panel__header__title__content">
                  {_class.name}
                </div>
              </div>
              <div className="panel__header__actions">
                {_class.generationParentElement && (
                  <button
                    className="uml-element-editor__header__generation-origin"
                    onClick={visitGenerationParentElement}
                    tabIndex={-1}
                    title={`Visit generation parent '${_class.generationParentElement.path}'`}
                  >
                    <div className="uml-element-editor__header__generation-origin__label">
                      <FaFire />
                    </div>
                    <div className="uml-element-editor__header__generation-origin__parent-name">
                      {_class.generationParentElement.name}
                    </div>
                    <div className="uml-element-editor__header__generation-origin__visit-btn">
                      <FaArrowCircleRight />
                    </div>
                  </button>
                )}
              </div>
            </div>
            <div
              data-testid={CORE_TEST_ID.UML_ELEMENT_EDITOR__TABS_HEADER}
              className="panel__header uml-element-editor__tabs__header"
            >
              <div className="uml-element-editor__tabs">
                {tabs.map((tab) => (
                  <div
                    key={tab}
                    onClick={changeTab(tab)}
                    className={clsx('uml-element-editor__tab', {
                      'uml-element-editor__tab--active': tab === selectedTab,
                    })}
                  >
                    {prettyCONSTName(tab)}
                  </div>
                ))}
              </div>
              <div className="panel__header__actions">
                <button
                  className="panel__header__action"
                  disabled={isAddButtonDisabled}
                  onClick={add}
                  tabIndex={-1}
                  title={addButtonTitle}
                >
                  <FaPlus />
                </button>
              </div>
            </div>
            <div
              className={clsx('panel__content', {
                'panel__content--with-backdrop-element':
                  selectedTab === UML_EDITOR_TAB.DERIVED_PROPERTIES ||
                  selectedTab === UML_EDITOR_TAB.CONSTRAINTS,
              })}
            >
              {selectedTab === UML_EDITOR_TAB.PROPERTIES && (
                <div
                  ref={dropPropertyRef}
                  className={clsx('panel__content__lists', {
                    'panel__content__lists--dnd-over':
                      isPropertyDragOver && !isReadOnly,
                  })}
                >
                  {_class.properties
                    .concat(indirectProperties)
                    .map((property) => (
                      <PropertyBasicEditor
                        key={property.uuid}
                        property={property}
                        _class={_class}
                        deleteProperty={deleteProperty(property)}
                        selectProperty={selectProperty(property)}
                        isReadOnly={isReadOnly}
                      />
                    ))}
                </div>
              )}
              {selectedTab === UML_EDITOR_TAB.DERIVED_PROPERTIES && (
                <div
                  ref={dropDerivedPropertyRef}
                  className={clsx('panel__content__lists', {
                    'panel__content__lists--dnd-over':
                      isDerivedPropertyDragOver && !isReadOnly,
                  })}
                >
                  {_class.derivedProperties
                    .concat(indirectDerivedProperties)
                    .filter((dp): dp is DerivedProperty =>
                      Boolean(classState.getNullableDerivedPropertyState(dp)),
                    )
                    .map((dp) => (
                      <DerivedPropertyBasicEditor
                        key={dp.uuid}
                        derivedProperty={dp}
                        _class={_class}
                        editorState={editorState}
                        deleteDerivedProperty={deleteDerivedProperty(dp)}
                        selectDerivedProperty={selectProperty(dp)}
                        isReadOnly={isReadOnly}
                      />
                    ))}
                </div>
              )}
              {selectedTab === UML_EDITOR_TAB.CONSTRAINTS && (
                <div className="panel__content__lists">
                  {_class.constraints
                    .concat(inheritedConstraints)
                    .filter((constraint): constraint is Constraint =>
                      Boolean(
                        classState.getNullableConstraintState(constraint),
                      ),
                    )
                    .map((constraint) => (
                      <ConstraintEditor
                        key={constraint.uuid}
                        constraint={constraint}
                        _class={_class}
                        editorState={editorState}
                        deleteConstraint={deleteConstraint(constraint)}
                        isReadOnly={isReadOnly}
                      />
                    ))}
                </div>
              )}
              {selectedTab === UML_EDITOR_TAB.SUPER_TYPES && (
                <div
                  ref={dropSuperTypeRef}
                  className={clsx('panel__content__lists', {
                    'panel__content__lists--dnd-over':
                      isSuperTypeDragOver && !isReadOnly,
                  })}
                >
                  {_class.generalizations.map((superType) => (
                    <SuperTypeEditor
                      key={superType.value.uuid}
                      superType={superType}
                      _class={_class}
                      deleteSuperType={deleteSuperType(superType)}
                      isReadOnly={isReadOnly}
                    />
                  ))}
                </div>
              )}
              {selectedTab === UML_EDITOR_TAB.TAGGED_VALUES && (
                <div
                  ref={dropTaggedValueRef}
                  className={clsx('panel__content__lists', {
                    'panel__content__lists--dnd-over':
                      isTaggedValueDragOver && !isReadOnly,
                  })}
                >
                  {_class.taggedValues.map((taggedValue) => (
                    <TaggedValueEditor
                      key={taggedValue.uuid}
                      taggedValue={taggedValue}
                      deleteValue={deleteTaggedValue(taggedValue)}
                      isReadOnly={isReadOnly}
                    />
                  ))}
                </div>
              )}
              {selectedTab === UML_EDITOR_TAB.STEREOTYPES && (
                <div
                  ref={dropStereotypeRef}
                  className={clsx('panel__content__lists', {
                    'panel__content__lists--dnd-over':
                      isStereotypeDragOver && !isReadOnly,
                  })}
                >
                  {_class.stereotypes.map((stereotype) => (
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
          </div>
          {selectedProperty ? (
            <PropertyEditor
              property={selectedProperty}
              deselectProperty={deselectProperty}
              isReadOnly={isReadOnly}
            />
          ) : (
            <div />
          )}
        </SplitPane>
      </div>
    );
  },
);

export const ClassEditor = observer((props: { _class: Class }) => {
  const { _class } = props;
  const editorStore = useEditorStore();
  const applicationStore = useApplicationStore();
  const classHash = _class.isReadOnly
    ? undefined
    : applicationStore.notifyAndReturnAlternativeOnError(
        () => _class.hashCode,
        undefined,
      ); // attempting to read the hashCode of immutable element will throw an error
  const [diagramRenderer, setDiagramRenderer] =
    useState<InheritanceDiagramRenderer>();
  const editorState = editorStore.getCurrentEditorState(ClassEditorState);
  const canvas = useRef<HTMLDivElement>(null);
  const resizeDiagram = useCallback((): void => {
    if (diagramRenderer) {
      diagramRenderer.refresh();
      diagramRenderer.autoRecenter();
    }
  }, [diagramRenderer]);
  const { ref, height, width } = useResizeDetector<HTMLDivElement>({
    refreshMode: 'debounce',
    refreshRate: 50,
  });

  useEffect(() => {
    resizeDiagram();
  }, [resizeDiagram, height, width]);

  useEffect(() => {
    if (canvas.current) {
      let currentRenderer = diagramRenderer;
      if (!currentRenderer) {
        const newRender = new InheritanceDiagramRenderer(
          canvas.current,
          _class,
        );
        setDiagramRenderer(newRender);
        currentRenderer = newRender;
      }
      currentRenderer.start();
      currentRenderer.autoRecenter();
    }
  }, [diagramRenderer, _class]);

  useEffect(() => {
    if (diagramRenderer) {
      diagramRenderer.loadClass(_class);
      diagramRenderer.start();
      diagramRenderer.autoRecenter();
    }
  }, [_class, classHash, diagramRenderer]);

  return (
    <SplitPane
      split="vertical"
      onDragFinished={resizeDiagram}
      defaultSize={500}
      minSize={450}
      maxSize={-450}
    >
      <div ref={ref} className="class-editor__diagram-viewer">
        <div
          ref={canvas}
          className="diagram-canvas"
          tabIndex={0}
          onContextMenu={(event): void => event.preventDefault()}
        />
      </div>
      <ClassFormEditor _class={_class} editorState={editorState} />
    </SplitPane>
  );
});
