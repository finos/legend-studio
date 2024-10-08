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
import { isNonNullable, prettyCONSTName } from '@finos/legend-shared';
import {
  CORE_DND_TYPE,
  type ElementDragSource,
  type UMLEditorElementDropTarget,
} from '../../../../stores/editor/utils/DnDUtils.js';
import {
  clsx,
  CustomSelectorInput,
  createFilter,
  ResizablePanelGroup,
  ResizablePanel,
  ResizablePanelSplitter,
  ResizablePanelSplitterLine,
  BlankPanelContent,
  getCollapsiblePanelGroupProps,
  InputWithInlineValidation,
  LockIcon,
  PlusIcon,
  TimesIcon,
  LongArrowRightIcon,
  ArrowCircleRightIcon,
  FireIcon,
  StickArrowCircleRightIcon,
  PanelEntryDragHandle,
  DragPreviewLayer,
  useDragPreviewLayer,
  PanelDropZone,
  Panel,
  PanelDnDEntry,
  PanelContentLists,
  InfoCircleIcon,
} from '@finos/legend-art';
import { LEGEND_STUDIO_TEST_ID } from '../../../../__lib__/LegendStudioTesting.js';
import { PropertyEditor } from './PropertyEditor.js';
import {
  StereotypeSelector,
  StereotypeDragPreviewLayer,
} from './StereotypeSelector.js';
import {
  TaggedValueEditor,
  TaggedValueDragPreviewLayer,
} from './TaggedValueEditor.js';
import { UML_EDITOR_TAB } from '../../../../stores/editor/editor-state/element-editor-state/UMLEditorState.js';
import { ClassEditorState } from '../../../../stores/editor/editor-state/element-editor-state/ClassEditorState.js';
import { flowResult } from 'mobx';
import { type DropTargetMonitor, useDrop, useDrag } from 'react-dnd';
import { useEditorStore } from '../../EditorStoreProvider.js';
import {
  type StereotypeReference,
  type GenericTypeReference,
  type TaggedValue,
  type Constraint,
  type Property,
  type DerivedProperty,
  MULTIPLICITY_INFINITE,
  Class,
  GenericType,
  Profile,
  Type,
  PrimitiveType,
  Unit,
  StereotypeExplicitReference,
  GenericTypeExplicitReference,
  Association,
  stub_TaggedValue,
  stub_Tag,
  stub_Profile,
  stub_Stereotype,
  stub_Constraint,
  stub_Property,
  stub_DerivedProperty,
  getAllClassProperties,
  getAllSuperclasses,
  getAllClassConstraints,
  getAllClassDerivedProperties,
  isElementReadOnly,
  getMultiplicityPrettyDescription,
} from '@finos/legend-graph';
import {
  ApplicationNavigationContextData,
  useApplicationNavigationContext,
  useApplicationStore,
} from '@finos/legend-application';
import {
  buildElementOption,
  getPackageableElementOptionFormatter,
  type PackageableElementOption,
} from '@finos/legend-lego/graph-editor';
import { getElementIcon } from '../../../ElementIconUtils.js';
import type { ClassPreviewRenderer } from '../../../../stores/LegendStudioApplicationPlugin.js';
import {
  class_addProperty,
  class_deleteDerivedProperty,
  class_addDerivedProperty,
  class_addContraint,
  class_addSuperType,
  annotatedElement_addTaggedValue,
  annotatedElement_addStereotype,
  annotatedElement_deleteStereotype,
  annotatedElement_deleteTaggedValue,
  class_deleteConstraint,
  class_deleteSuperType,
  class_deleteProperty,
  class_deleteSubclass,
  class_addSubclass,
  constraint_setName,
  property_setName,
  property_setGenericType,
  property_setMultiplicity,
  class_swapProperties,
  class_swapDerivedProperties,
  class_swapConstraints,
  class_swapSuperTypes,
  setGenericTypeReferenceValue,
} from '../../../../stores/graph-modifier/DomainGraphModifierHelper.js';
import {
  CLASS_PROPERTY_TYPE,
  getClassPropertyType,
} from '../../../../stores/editor/utils/ModelClassifierUtils.js';
import { LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY } from '../../../../__lib__/LegendStudioApplicationNavigationContext.js';
import { InlineLambdaEditor } from '@finos/legend-query-builder';

type ClassPropertyDragSource = {
  property: Property;
};

const CLASS_PROPERTY_DND_TYPE = 'CLASS_PROPERTY';

const PropertyBasicEditor = observer(
  (props: {
    _class: Class;
    editorState: ClassEditorState;
    property: Property;
    deleteProperty: () => void;
    isReadOnly: boolean;
  }) => {
    const ref = useRef<HTMLDivElement>(null);
    const handleRef = useRef<HTMLDivElement>(null);

    const { property, _class, editorState, deleteProperty, isReadOnly } = props;

    const editorStore = useEditorStore();
    const isInheritedProperty =
      property._OWNER instanceof Class && property._OWNER !== _class;
    const isPropertyFromAssociation = property._OWNER instanceof Association;
    const isIndirectProperty = isInheritedProperty || isPropertyFromAssociation;
    const isPropertyDuplicated = (val: Property): boolean =>
      _class.properties.filter((p) => p.name === val.name).length >= 2;
    const selectProperty = (): void =>
      editorState.setSelectedProperty(property);

    // Name
    const changeValue: React.ChangeEventHandler<HTMLInputElement> = (event) => {
      property_setName(property, event.target.value);
    };
    // Generic Type
    const [isEditingType, setIsEditingType] = useState(false);
    const propertyTypeOptions =
      editorStore.graphManagerState.usableClassPropertyTypes.map(
        buildElementOption,
      );
    const propertyType = property.genericType.value.rawType;
    const propertyTypeName = getClassPropertyType(propertyType);
    const filterOption = createFilter({
      ignoreCase: true,
      ignoreAccents: false,
      stringify: (option: { data: PackageableElementOption<Type> }): string =>
        option.data.value.path,
    });
    const selectedPropertyType = {
      value: propertyType,
      label: propertyType.name,
    };
    const changePropertyType = (val: PackageableElementOption<Type>): void => {
      property_setGenericType(property, new GenericType(val.value));
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
        property_setMultiplicity(
          property,
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
      (item: ClassPropertyDragSource): void => {
        const draggingProperty = item.property;
        const hoveredProperty = property;
        class_swapProperties(_class, draggingProperty, hoveredProperty);
      },
      [_class, property],
    );

    const [{ isBeingDraggedProperty }, dropConnector] = useDrop<
      ClassPropertyDragSource,
      void,
      { isBeingDraggedProperty: Property | undefined }
    >(
      () => ({
        accept: [CLASS_PROPERTY_DND_TYPE],
        hover: (item) => handleHover(item),
        collect: (
          monitor,
        ): {
          isBeingDraggedProperty: Property | undefined;
        } => ({
          isBeingDraggedProperty:
            monitor.getItem<ClassPropertyDragSource | null>()?.property,
        }),
      }),
      [handleHover],
    );
    const isBeingDragged = property === isBeingDraggedProperty;

    const [, dragConnector, dragPreviewConnector] =
      useDrag<ClassPropertyDragSource>(
        () => ({
          type: CLASS_PROPERTY_DND_TYPE,
          item: () => ({
            property: property,
          }),
        }),
        [property],
      );
    dragConnector(handleRef);
    dropConnector(ref);
    useDragPreviewLayer(dragPreviewConnector);

    // Other
    const openElement = (): void => {
      if (!(propertyType instanceof PrimitiveType)) {
        editorStore.graphEditorMode.openElement(
          propertyType instanceof Unit ? propertyType.measure : propertyType,
        );
      }
    };
    // NOTE: for now we do not allow directly modifying inherited and associated properties,
    // we would make the user go to the supertype or the association where the property comes from
    const visitOwner = (): void =>
      editorStore.graphEditorMode.openElement(property._OWNER);

    return (
      <PanelDnDEntry
        ref={ref}
        placeholder={<div className="dnd__placeholder--light"></div>}
        showPlaceholder={isBeingDragged}
        className="property-basic-editor__container"
      >
        {!isIndirectProperty && (
          <PanelEntryDragHandle
            isDragging={isBeingDragged}
            dragSourceConnector={handleRef}
          />
        )}
        <div className="property-basic-editor">
          {isIndirectProperty && (
            <div className="property-basic-editor__name property-basic-editor__name--with-lock">
              <div className="property-basic-editor__name--with-lock__icon">
                <LockIcon />
              </div>
              <span className="property-basic-editor__name--with-lock__name">
                {property.name}
              </span>
            </div>
          )}
          {!isIndirectProperty && (
            <div className="input-group__input property-basic-editor__input">
              <InputWithInlineValidation
                className="property-basic-editor__input--with-validation input-group__input"
                disabled={isReadOnly}
                value={property.name}
                spellCheck={false}
                onChange={changeValue}
                placeholder="Property name"
                error={
                  isPropertyDuplicated(property)
                    ? 'Duplicated property'
                    : undefined
                }
              />
            </div>
          )}
          {!isIndirectProperty && !isReadOnly && isEditingType && (
            <CustomSelectorInput
              className="property-basic-editor__type"
              options={propertyTypeOptions}
              onChange={changePropertyType}
              value={selectedPropertyType}
              placeholder="Choose a type..."
              filterOption={filterOption}
              formatOptionLabel={getPackageableElementOptionFormatter({})}
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
                  {getElementIcon(propertyType, editorStore)}
                </div>
              )}
              <div className="property-basic-editor__type__label">
                {propertyType.name}
              </div>
              <div
                data-testid={
                  LEGEND_STUDIO_TEST_ID.PROPERTY_BASIC_EDITOR__TYPE__LABEL_HOVER
                }
                className="property-basic-editor__type__label property-basic-editor__type__label--hover"
                onClick={(): void => setIsEditingType(true)}
              >
                Click to edit
              </div>
              {propertyTypeName !== CLASS_PROPERTY_TYPE.PRIMITIVE && (
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
                  {getElementIcon(propertyType, editorStore)}
                </div>
              )}
              <div className="property-basic-editor__type__label">
                {propertyType.name}
              </div>
              {propertyTypeName !== CLASS_PROPERTY_TYPE.PRIMITIVE && (
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
              disabled={isIndirectProperty || isReadOnly}
              spellCheck={false}
              value={lowerBound}
              onChange={changeLowerBound}
            />
            <div className="property-basic-editor__multiplicity__range">..</div>
            <input
              className="property-basic-editor__multiplicity-bound"
              disabled={isIndirectProperty || isReadOnly}
              spellCheck={false}
              value={upperBound}
              onChange={changeUpperBound}
            />
            <div
              className="property-basic-editor__multiplicity__explanation"
              title={getMultiplicityPrettyDescription(property.multiplicity)}
            >
              <InfoCircleIcon />
            </div>
          </div>
          {!isIndirectProperty && (
            <button
              className="uml-element-editor__basic__detail-btn"
              onClick={selectProperty}
              tabIndex={-1}
              title="See detail"
            >
              <LongArrowRightIcon />
            </button>
          )}
          {isIndirectProperty && (
            <button
              className="uml-element-editor__visit-parent-element-btn"
              onClick={visitOwner}
              tabIndex={-1}
              title={`Visit ${
                isInheritedProperty ? 'super type class' : 'association'
              } '${property._OWNER.path}'`}
            >
              <ArrowCircleRightIcon />
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

type ClassDerivedPropertyDragSource = {
  derivedProperty: DerivedProperty;
};

const CLASS_DERIVED_PROPERTY_DND_TYPE = 'CLASS_DERIVED_PROPERTY';

const DerivedPropertyBasicEditor = observer(
  (props: {
    _class: Class;
    editorState: ClassEditorState;
    derivedProperty: DerivedProperty;
    deleteDerivedProperty: () => void;
    isReadOnly: boolean;
  }) => {
    const ref = useRef<HTMLDivElement>(null);
    const handleRef = useRef<HTMLDivElement>(null);

    const {
      derivedProperty,
      _class,
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
    const isInheritedProperty = derivedProperty._OWNER !== _class;
    const selectDerivedProperty = (): void =>
      editorState.setSelectedProperty(derivedProperty);
    // Name
    const changeValue: React.ChangeEventHandler<HTMLInputElement> = (event) =>
      property_setName(derivedProperty, event.target.value);
    // Generic Type
    const [isEditingType, setIsEditingType] = useState(false);
    const propertyTypeOptions =
      editorStore.graphManagerState.usableClassPropertyTypes.map(
        buildElementOption,
      );
    const propertyType = derivedProperty.genericType.value.rawType;
    const propertyTypeName = getClassPropertyType(propertyType);
    const filterOption = createFilter({
      ignoreCase: true,
      ignoreAccents: false,
      stringify: (option: { data: PackageableElementOption<Type> }): string =>
        option.data.value.path,
    });
    const selectedPropertyType = {
      value: propertyType,
      label: propertyType.name,
    };
    const changePropertyType = (val: PackageableElementOption<Type>): void => {
      property_setGenericType(derivedProperty, new GenericType(val.value));
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
        property_setMultiplicity(
          derivedProperty,
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
      (
        item: ClassDerivedPropertyDragSource,
        monitor: DropTargetMonitor,
      ): void => {
        const draggingProperty = item.derivedProperty;
        const hoveredProperty = derivedProperty;

        const dragIndex = _class.derivedProperties.findIndex(
          (e) => e === item.derivedProperty,
        );
        const hoverIndex = _class.derivedProperties.findIndex(
          (e) => e === derivedProperty,
        );
        // move the item being hovered on when the dragged item position is beyond the its middle point
        const hoverBoundingReact = ref.current?.getBoundingClientRect();
        const distanceThreshold =
          ((hoverBoundingReact?.bottom ?? 0) - (hoverBoundingReact?.top ?? 0)) /
          2;
        const dragDistance =
          (monitor.getClientOffset()?.y ?? 0) - (hoverBoundingReact?.top ?? 0);
        if (dragIndex < hoverIndex && dragDistance < distanceThreshold) {
          return;
        }
        class_swapDerivedProperties(_class, draggingProperty, hoveredProperty);
      },
      [_class, derivedProperty],
    );

    const [{ isBeingDraggedDerivedProperty }, dropConnector] = useDrop<
      ClassDerivedPropertyDragSource,
      void,
      { isBeingDraggedDerivedProperty: DerivedProperty | undefined }
    >(
      () => ({
        accept: [CLASS_DERIVED_PROPERTY_DND_TYPE],
        hover: (item, monitor): void => handleHover(item, monitor),
        collect: (monitor) => ({
          isBeingDraggedDerivedProperty:
            monitor.getItem<ClassDerivedPropertyDragSource | null>()
              ?.derivedProperty,
        }),
      }),
      [handleHover],
    );
    const isBeingDragged = derivedProperty === isBeingDraggedDerivedProperty;

    const [, dragConnector, dragPreviewConnector] =
      useDrag<ClassDerivedPropertyDragSource>(
        () => ({
          type: CLASS_DERIVED_PROPERTY_DND_TYPE,
          item: () => ({
            derivedProperty: derivedProperty,
          }),
        }),
        [derivedProperty],
      );
    dragConnector(handleRef);
    dropConnector(ref);
    useDragPreviewLayer(dragPreviewConnector);

    // Action
    const onLambdaEditorFocus = (): void =>
      applicationStore.navigationContextService.push(
        ApplicationNavigationContextData.createTransient(
          LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY.CLASS_DERIVED_PROPERTY_LAMBDA_EDITOR,
        ),
      );
    const openElement = (): void => {
      if (!(propertyType instanceof PrimitiveType)) {
        editorStore.graphEditorMode.openElement(
          propertyType instanceof Unit ? propertyType.measure : propertyType,
        );
      }
    };
    const visitOwner = (): void =>
      editorStore.graphEditorMode.openElement(derivedProperty._OWNER);
    const remove = applicationStore.guardUnhandledError(async () => {
      await flowResult(
        dpState.convertLambdaObjectToGrammarString({ pretty: false }),
      );
      deleteDerivedProperty();
    });

    return (
      <PanelDnDEntry
        ref={ref}
        placeholder={<div className="uml-element-editor__dnd__placeholder" />}
        className="derived-property-editor__container"
        showPlaceholder={isBeingDragged}
      >
        <div
          className={clsx('derived-property-editor', {
            backdrop__element:
              dpState.parserError && !isInheritedProperty && !isReadOnly,
          })}
        >
          <div className="property-basic-editor">
            {!isInheritedProperty && (
              <PanelEntryDragHandle
                dragSourceConnector={handleRef}
                isDragging={isBeingDragged}
              />
            )}
            {isInheritedProperty && (
              <div className="property-basic-editor__name property-basic-editor__name--with-lock">
                <div className="property-basic-editor__name--with-lock__icon">
                  <LockIcon />
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
                placeholder="Property name"
                onChange={changeValue}
              />
            )}
            {!isInheritedProperty && !isReadOnly && isEditingType && (
              <CustomSelectorInput
                className="property-basic-editor__type property-basic-editor__qualififed-property__type"
                options={propertyTypeOptions}
                onChange={changePropertyType}
                value={selectedPropertyType}
                placeholder="Choose a type..."
                filterOption={filterOption}
                formatOptionLabel={getPackageableElementOptionFormatter({})}
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
                    {getElementIcon(propertyType, editorStore)}
                  </div>
                )}
                <div className="property-basic-editor__type__label">
                  {propertyType.name}
                </div>
                <div
                  data-testid={
                    LEGEND_STUDIO_TEST_ID.PROPERTY_BASIC_EDITOR__TYPE__LABEL_HOVER
                  }
                  className="property-basic-editor__type__label property-basic-editor__type__label--hover"
                  onClick={(): void => setIsEditingType(true)}
                >
                  Click to edit
                </div>
                {propertyTypeName !== CLASS_PROPERTY_TYPE.PRIMITIVE && (
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
                    {getElementIcon(propertyType, editorStore)}
                  </div>
                )}
                <div className="property-basic-editor__type__label">
                  {propertyType.name}
                </div>
                {propertyTypeName !== CLASS_PROPERTY_TYPE.PRIMITIVE && (
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
                spellCheck={false}
                disabled={isInheritedProperty || isReadOnly}
                value={lowerBound}
                onChange={changeLowerBound}
              />
              <div className="property-basic-editor__multiplicity__range">
                ..
              </div>
              <input
                className="property-basic-editor__multiplicity-bound"
                spellCheck={false}
                disabled={isInheritedProperty || isReadOnly}
                value={upperBound}
                onChange={changeUpperBound}
              />
            </div>
            {!isInheritedProperty && (
              <button
                className="uml-element-editor__basic__detail-btn"
                onClick={selectDerivedProperty}
                tabIndex={-1}
                title="See detail"
              >
                <LongArrowRightIcon />
              </button>
            )}
            {isInheritedProperty && (
              <button
                className="uml-element-editor__visit-parent-element-btn"
                onClick={visitOwner}
                tabIndex={-1}
                title={`Visit super type class ${derivedProperty._OWNER.path}`}
              >
                <ArrowCircleRightIcon />
              </button>
            )}
            {!isInheritedProperty && !isReadOnly && (
              <button
                className={clsx('uml-element-editor__remove-btn', {
                  'uml-element-editor__remove-btn--hidden': isInheritedProperty,
                })}
                onClick={remove}
                tabIndex={-1}
                title="Remove"
              >
                <TimesIcon />
              </button>
            )}
          </div>
          <InlineLambdaEditor
            disabled={
              editorState.classState.isConvertingDerivedPropertyLambdaObjects ||
              isInheritedProperty ||
              isReadOnly
            }
            lambdaEditorState={dpState}
            forceBackdrop={hasParserError}
            expectedType={propertyType}
            onEditorFocus={onLambdaEditorFocus}
          />
        </div>
      </PanelDnDEntry>
    );
  },
);

type ClassConstraintDragSource = {
  constraint: Constraint;
};

const CLASS_CONSTRAINT_DND_TYPE = 'CLASS_CONSTRAINT';

const ConstraintEditor = observer(
  (props: {
    editorState: ClassEditorState;
    _class: Class;
    constraint: Constraint;
    deleteConstraint: () => void;
    isReadOnly: boolean;
  }) => {
    const ref = useRef<HTMLDivElement>(null);
    const handleRef = useRef<HTMLDivElement>(null);

    const { constraint, _class, deleteConstraint, editorState, isReadOnly } =
      props;
    const editorStore = useEditorStore();
    const applicationStore = useApplicationStore();
    const hasParserError = editorState.classState.constraintStates.some(
      (state) => state.parserError,
    );
    const isInheritedConstraint = constraint._OWNER !== _class;
    const constraintState =
      editorState.classState.getConstraintState(constraint);
    // Name
    const changeName: React.ChangeEventHandler<HTMLInputElement> = (event) =>
      constraint_setName(constraint, event.target.value);

    // Drag and Drop
    const handleHover = useCallback(
      (item: ClassConstraintDragSource): void => {
        const draggingProperty = item.constraint;
        const hoveredProperty = constraint;
        class_swapConstraints(_class, draggingProperty, hoveredProperty);
      },
      [_class, constraint],
    );

    const [{ isBeingDraggedConstraint }, dropConnector] = useDrop<
      ClassConstraintDragSource,
      void,
      { isBeingDraggedConstraint: Constraint | undefined }
    >(
      () => ({
        accept: [CLASS_CONSTRAINT_DND_TYPE],
        hover: (item) => handleHover(item),
        collect: (
          monitor,
        ): { isBeingDraggedConstraint: Constraint | undefined } => ({
          isBeingDraggedConstraint:
            monitor.getItem<ClassConstraintDragSource | null>()?.constraint,
        }),
      }),
      [handleHover],
    );
    const isBeingDragged = constraint === isBeingDraggedConstraint;

    const [, dragConnector, dragPreviewConnector] =
      useDrag<ClassConstraintDragSource>(
        () => ({
          type: CLASS_CONSTRAINT_DND_TYPE,
          item: () => ({
            constraint: constraint,
          }),
        }),
        [constraint],
      );
    dragConnector(handleRef);
    dropConnector(ref);
    useDragPreviewLayer(dragPreviewConnector);

    // Actions
    const onLambdaEditorFocus = (): void =>
      applicationStore.navigationContextService.push(
        ApplicationNavigationContextData.createTransient(
          LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY.CLASS_CONTRAINT_LAMBDA_EDITOR,
        ),
      );
    const remove = applicationStore.guardUnhandledError(async () => {
      await flowResult(
        constraintState.convertLambdaObjectToGrammarString({ pretty: false }),
      );
      deleteConstraint();
    });
    const visitOwner = (): void =>
      editorStore.graphEditorMode.openElement(constraint._OWNER);

    return (
      <PanelDnDEntry
        ref={ref}
        placeholder={<div className="uml-element-editor__dnd__placeholder" />}
        className="constraint-editor__container"
        showPlaceholder={isBeingDragged}
      >
        <div
          className={clsx('constraint-editor', {
            backdrop__element: constraintState.parserError,
          })}
        >
          <div className="constraint-editor__content">
            {!isInheritedConstraint && (
              <PanelEntryDragHandle
                dragSourceConnector={handleRef}
                isDragging={isBeingDragged}
              />
            )}
            {isInheritedConstraint && (
              <div className="constraint-editor__content__name--with-lock">
                <div className="constraint-editor__content__name--with-lock__icon">
                  <LockIcon />
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
                placeholder="Constraint name"
              />
            )}
            {isInheritedConstraint && (
              <button
                className="uml-element-editor__visit-parent-element-btn"
                onClick={visitOwner}
                tabIndex={-1}
                title={`Visit super type class ${constraint._OWNER.path}`}
              >
                <ArrowCircleRightIcon />
              </button>
            )}
            {!isInheritedConstraint && !isReadOnly && (
              <button
                className="uml-element-editor__remove-btn"
                disabled={isInheritedConstraint}
                onClick={remove}
                tabIndex={-1}
                title="Remove"
              >
                <TimesIcon />
              </button>
            )}
          </div>
          <InlineLambdaEditor
            disabled={
              editorState.classState.isConvertingConstraintLambdaObjects ||
              isReadOnly ||
              isInheritedConstraint
            }
            lambdaEditorState={constraintState}
            forceBackdrop={hasParserError}
            expectedType={PrimitiveType.BOOLEAN}
            onEditorFocus={onLambdaEditorFocus}
          />
        </div>
      </PanelDnDEntry>
    );
  },
);

type ClassSuperTypeDragSource = {
  superType: GenericTypeReference;
};

const CLASS_SUPER_TYPE_DND_TYPE = 'CLASS_SUPER_TYPE';

const SuperTypeEditor = observer(
  (props: {
    _class: Class;
    superType: GenericTypeReference;
    deleteSuperType: () => void;
    isReadOnly: boolean;
  }) => {
    const ref = useRef<HTMLDivElement>(null);
    const handleRef = useRef<HTMLDivElement>(null);

    const { superType, _class, deleteSuperType, isReadOnly } = props;
    const editorStore = useEditorStore();
    // Type
    const superTypeOptions = editorStore.graphManagerState.usableClasses
      .filter(
        (c) =>
          c instanceof Class &&
          // Exclude current class
          c !== _class &&
          // Exclude super types of the class
          !getAllSuperclasses(_class).includes(c) &&
          // Ensure there is no loop (might be expensive)
          !getAllSuperclasses(c).includes(_class),
      )
      .map(buildElementOption);

    // Drag and Drop
    const handleHover = useCallback(
      (item: ClassSuperTypeDragSource): void => {
        const draggingProperty = item.superType;
        const hoveredProperty = superType;
        class_swapSuperTypes(_class, draggingProperty, hoveredProperty);
      },
      [_class, superType],
    );

    const [{ isBeingDraggedSupertype }, dropConnector] = useDrop<
      ClassSuperTypeDragSource,
      void,
      { isBeingDraggedSupertype: GenericTypeReference | undefined }
    >(
      () => ({
        accept: [CLASS_SUPER_TYPE_DND_TYPE],
        hover: (item) => handleHover(item),
        collect: (monitor) => ({
          isBeingDraggedSupertype:
            monitor.getItem<ClassSuperTypeDragSource | null>()?.superType,
        }),
      }),
      [handleHover],
    );
    const isBeingDragged = superType === isBeingDraggedSupertype;

    const [, dragConnector, dragPreviewConnector] =
      useDrag<ClassSuperTypeDragSource>(
        () => ({
          type: CLASS_SUPER_TYPE_DND_TYPE,
          item: () => ({
            superType: superType,
          }),
        }),
        [superType],
      );
    dragConnector(handleRef);
    dropConnector(ref);
    useDragPreviewLayer(dragPreviewConnector);

    const rawType = superType.value.rawType;
    const filterOption = createFilter({
      ignoreCase: true,
      ignoreAccents: false,
      stringify: (option: { data: PackageableElementOption<Class> }): string =>
        option.data.value.path,
    });
    const selectedType = {
      value: rawType,
      label: rawType.name,
    } as PackageableElementOption<Class>;
    const changeType = (val: PackageableElementOption<Class>): void =>
      setGenericTypeReferenceValue(superType, new GenericType(val.value));
    const visitDerivationSource = (): void =>
      editorStore.graphEditorMode.openElement(rawType);

    return (
      <PanelDnDEntry
        ref={ref}
        placeholder={<div className="uml-element-editor__dnd__placeholder" />}
        className="super-type-editor__container"
        showPlaceholder={isBeingDragged}
      >
        <PanelEntryDragHandle
          dragSourceConnector={handleRef}
          isDragging={isBeingDragged}
        />
        <div className="super-type-editor">
          <CustomSelectorInput
            className="super-type-editor__class"
            disabled={isReadOnly}
            options={superTypeOptions}
            onChange={changeType}
            value={selectedType}
            placeholder="Choose a class"
            filterOption={filterOption}
            formatOptionLabel={getPackageableElementOptionFormatter({})}
          />
          <button
            className="uml-element-editor__basic__detail-btn"
            onClick={visitDerivationSource}
            tabIndex={-1}
            title="Visit super type"
          >
            <LongArrowRightIcon />
          </button>
          {!isReadOnly && (
            <button
              className="uml-element-editor__remove-btn"
              disabled={isReadOnly}
              onClick={deleteSuperType}
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

const PropertiesEditor = observer(
  (props: { _class: Class; editorState: ClassEditorState }) => {
    const { _class, editorState } = props;
    const isReadOnly = editorState.isReadOnly;

    const deleteProperty =
      (property: Property): (() => void) =>
      (): void => {
        class_deleteProperty(_class, property);
        if (property === editorState.selectedProperty) {
          editorState.setSelectedProperty(undefined);
        }
      };

    const indirectProperties = getAllClassProperties(_class)
      .filter((property) => !_class.properties.includes(property))
      .sort((p1, p2) => p1.name.localeCompare(p2.name))
      .sort(
        (p1, p2) =>
          (p1._OWNER === _class ? 1 : 0) - (p2._OWNER === _class ? 1 : 0),
      );

    const handleDropProperty = useCallback(
      (item: UMLEditorElementDropTarget): void => {
        if (!isReadOnly && item.data.packageableElement instanceof Type) {
          class_addProperty(
            _class,
            stub_Property(item.data.packageableElement, _class),
          );
        }
      },
      [_class, isReadOnly],
    );
    const [{ isPropertyDragOver }, dropPropertyRef] = useDrop<
      ElementDragSource,
      void,
      { isPropertyDragOver: boolean }
    >(
      () => ({
        accept: [
          CORE_DND_TYPE.PROJECT_EXPLORER_CLASS,
          CORE_DND_TYPE.PROJECT_EXPLORER_ENUMERATION,
        ],
        drop: (item) => handleDropProperty(item),
        collect: (monitor) => ({
          isPropertyDragOver: monitor.isOver({ shallow: true }),
        }),
      }),
      [handleDropProperty],
    );

    useApplicationNavigationContext(
      LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY.CLASS_EDITOR_PROPERTIES,
    );

    return (
      <PanelDropZone
        isDragOver={isPropertyDragOver && !isReadOnly}
        dropTargetConnector={dropPropertyRef}
      >
        <PanelContentLists>
          <DragPreviewLayer
            labelGetter={(item: ClassPropertyDragSource): string =>
              item.property.name === '' ? '(unknown)' : item.property.name
            }
            types={[CLASS_PROPERTY_DND_TYPE]}
          />
          {_class.properties.concat(indirectProperties).map((property) => (
            <PropertyBasicEditor
              key={property._UUID}
              property={property}
              _class={_class}
              editorState={editorState}
              deleteProperty={deleteProperty(property)}
              isReadOnly={isReadOnly}
            />
          ))}
        </PanelContentLists>
      </PanelDropZone>
    );
  },
);

const DerviedPropertiesEditor = observer(
  (props: { _class: Class; editorState: ClassEditorState }) => {
    const { _class, editorState } = props;
    const isReadOnly = editorState.isReadOnly;
    const classState = editorState.classState;

    const indirectDerivedProperties = getAllClassDerivedProperties(_class)
      .filter((property) => !_class.derivedProperties.includes(property))
      .sort((p1, p2) => p1.name.localeCompare(p2.name))
      .sort(
        (p1, p2) =>
          (p1._OWNER === _class ? 1 : 0) - (p2._OWNER === _class ? 1 : 0),
      );
    const deleteDerivedProperty =
      (dp: DerivedProperty): (() => void) =>
      (): void => {
        class_deleteDerivedProperty(_class, dp);
        classState.deleteDerivedPropertyState(dp);
        if (dp === editorState.selectedProperty) {
          editorState.setSelectedProperty(undefined);
        }
      };

    const handleDropDerivedProperty = useCallback(
      (item: UMLEditorElementDropTarget): void => {
        if (!isReadOnly && item.data.packageableElement instanceof Type) {
          const dp = stub_DerivedProperty(item.data.packageableElement, _class);
          class_addDerivedProperty(_class, dp);
          classState.addDerivedPropertyState(dp);
        }
      },
      [_class, classState, isReadOnly],
    );
    const [{ isDerivedPropertyDragOver }, dropDerivedPropertyRef] = useDrop<
      ElementDragSource,
      void,
      { isDerivedPropertyDragOver: boolean }
    >(
      () => ({
        accept: [
          CORE_DND_TYPE.PROJECT_EXPLORER_CLASS,
          CORE_DND_TYPE.PROJECT_EXPLORER_ENUMERATION,
        ],
        drop: (item) => handleDropDerivedProperty(item),
        collect: (monitor) => ({
          isDerivedPropertyDragOver: monitor.isOver({ shallow: true }),
        }),
      }),
      [handleDropDerivedProperty],
    );

    useApplicationNavigationContext(
      LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY.CLASS_EDITOR_DERIVED_PROPERTIES,
    );

    return (
      <PanelDropZone
        isDragOver={isDerivedPropertyDragOver && !isReadOnly}
        dropTargetConnector={dropDerivedPropertyRef}
      >
        <PanelContentLists>
          <DragPreviewLayer
            labelGetter={(item: ClassDerivedPropertyDragSource): string =>
              item.derivedProperty.name === ''
                ? '(unknown)'
                : item.derivedProperty.name
            }
            types={[CLASS_DERIVED_PROPERTY_DND_TYPE]}
          />
          {_class.derivedProperties
            .concat(indirectDerivedProperties)
            .filter((dp): dp is DerivedProperty =>
              Boolean(classState.getNullableDerivedPropertyState(dp)),
            )
            .map((dp) => (
              <DerivedPropertyBasicEditor
                key={dp._UUID}
                derivedProperty={dp}
                _class={_class}
                editorState={editorState}
                deleteDerivedProperty={deleteDerivedProperty(dp)}
                isReadOnly={isReadOnly}
              />
            ))}
        </PanelContentLists>
      </PanelDropZone>
    );
  },
);

const ConstraintsEditor = observer(
  (props: { _class: Class; editorState: ClassEditorState }) => {
    const { _class, editorState } = props;
    const isReadOnly = editorState.isReadOnly;
    const classState = editorState.classState;

    const deleteConstraint =
      (constraint: Constraint): (() => void) =>
      (): void => {
        class_deleteConstraint(_class, constraint);
        classState.deleteConstraintState(constraint);
      };
    const inheritedConstraints = getAllClassConstraints(_class).filter(
      (constraint) => !_class.constraints.includes(constraint),
    );

    useApplicationNavigationContext(
      LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY.CLASS_EDITOR_CONSTRAINTS,
    );

    return (
      <PanelContentLists>
        <DragPreviewLayer
          labelGetter={(item: ClassConstraintDragSource): string =>
            item.constraint.name === '' ? '(unknown)' : item.constraint.name
          }
          types={[CLASS_CONSTRAINT_DND_TYPE]}
        />
        {_class.constraints
          .concat(inheritedConstraints)
          .filter((constraint): constraint is Constraint =>
            Boolean(classState.getNullableConstraintState(constraint)),
          )
          .map((constraint) => (
            <ConstraintEditor
              key={constraint._UUID}
              constraint={constraint}
              _class={_class}
              editorState={editorState}
              deleteConstraint={deleteConstraint(constraint)}
              isReadOnly={isReadOnly}
            />
          ))}
      </PanelContentLists>
    );
  },
);

const SupertypesEditor = observer(
  (props: { _class: Class; editorState: ClassEditorState }) => {
    const { _class, editorState } = props;
    const isReadOnly = editorState.isReadOnly;

    const deleteSuperType =
      (superType: GenericTypeReference): (() => void) =>
      (): void => {
        class_deleteSuperType(_class, superType);
        if (superType.value.rawType instanceof Class) {
          class_deleteSubclass(superType.value.rawType, _class);
        }
      };

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
          !getAllSuperclasses(_class).includes(element) &&
          // Must not have the current class as a super type
          !getAllSuperclasses(element).includes(_class)
        ) {
          class_addSuperType(
            _class,
            GenericTypeExplicitReference.create(new GenericType(element)),
          );
          class_addSubclass(element, _class);
        }
      },
      [_class, isReadOnly],
    );
    const [{ isSuperTypeDragOver }, dropSuperTypeRef] = useDrop<
      ElementDragSource,
      void,
      { isSuperTypeDragOver: boolean }
    >(
      () => ({
        accept: [
          CORE_DND_TYPE.PROJECT_EXPLORER_CLASS,
          CORE_DND_TYPE.PROJECT_EXPLORER_ENUMERATION,
        ],
        drop: (item) => handleDropSuperType(item),
        collect: (monitor) => ({
          isSuperTypeDragOver: monitor.isOver({ shallow: true }),
        }),
      }),
      [handleDropSuperType],
    );

    useApplicationNavigationContext(
      LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY.CLASS_EDITOR_SUPERTYPES,
    );

    return (
      <PanelDropZone
        isDragOver={isSuperTypeDragOver && !isReadOnly}
        dropTargetConnector={dropSuperTypeRef}
      >
        <PanelContentLists>
          <DragPreviewLayer
            labelGetter={(item: ClassSuperTypeDragSource): string =>
              item.superType.value.rawType.name
            }
            types={[CLASS_SUPER_TYPE_DND_TYPE]}
          />
          {_class.generalizations.map((superType) => (
            <SuperTypeEditor
              key={superType.value._UUID}
              superType={superType}
              _class={_class}
              deleteSuperType={deleteSuperType(superType)}
              isReadOnly={isReadOnly}
            />
          ))}
        </PanelContentLists>
      </PanelDropZone>
    );
  },
);

const TaggedValuesEditor = observer(
  (props: { _class: Class; editorState: ClassEditorState }) => {
    const { _class, editorState } = props;
    const isReadOnly = editorState.isReadOnly;

    const deleteTaggedValue =
      (val: TaggedValue): (() => void) =>
      (): void =>
        annotatedElement_deleteTaggedValue(_class, val);

    const handleDropTaggedValue = useCallback(
      (item: UMLEditorElementDropTarget): void => {
        if (!isReadOnly && item.data.packageableElement instanceof Profile) {
          annotatedElement_addTaggedValue(
            _class,
            stub_TaggedValue(stub_Tag(item.data.packageableElement)),
          );
        }
      },
      [_class, isReadOnly],
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

    return (
      <PanelDropZone
        isDragOver={isTaggedValueDragOver && !isReadOnly}
        dropTargetConnector={dropTaggedValueRef}
      >
        <PanelContentLists>
          <TaggedValueDragPreviewLayer />
          {_class.taggedValues.map((taggedValue) => (
            <TaggedValueEditor
              annotatedElement={_class}
              key={taggedValue._UUID}
              taggedValue={taggedValue}
              deleteValue={deleteTaggedValue(taggedValue)}
              isReadOnly={isReadOnly}
            />
          ))}
        </PanelContentLists>
      </PanelDropZone>
    );
  },
);

const StereotypesEditor = observer(
  (props: { _class: Class; editorState: ClassEditorState }) => {
    const { _class, editorState } = props;
    const isReadOnly = editorState.isReadOnly;

    const deleteStereotype =
      (val: StereotypeReference): (() => void) =>
      (): void =>
        annotatedElement_deleteStereotype(_class, val);

    const handleDropStereotype = useCallback(
      (item: UMLEditorElementDropTarget): void => {
        if (!isReadOnly && item.data.packageableElement instanceof Profile) {
          annotatedElement_addStereotype(
            _class,
            StereotypeExplicitReference.create(
              stub_Stereotype(item.data.packageableElement),
            ),
          );
        }
      },
      [_class, isReadOnly],
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

    return (
      <PanelDropZone
        isDragOver={isStereotypeDragOver && !isReadOnly}
        dropTargetConnector={dropStereotypeRef}
      >
        <PanelContentLists>
          <StereotypeDragPreviewLayer />
          {_class.stereotypes.map((stereotype) => (
            <StereotypeSelector
              key={stereotype._UUID}
              annotatedElement={_class}
              stereotype={stereotype}
              deleteStereotype={deleteStereotype(stereotype)}
              isReadOnly={isReadOnly}
            />
          ))}
        </PanelContentLists>
      </PanelDropZone>
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
    const classHash = isElementReadOnly(_class)
      ? undefined
      : applicationStore.notificationService.notifyAndReturnAlternativeOnError(
          () => _class.hashCode,
          undefined,
        ); // attempting to read the hashCode of immutable element will throw an error
    const classState = editorState.classState;
    const isReadOnly = editorState.isReadOnly;

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
        editorState.setSelectedProperty(undefined);
      };

    const deselectProperty = (): void =>
      editorState.setSelectedProperty(undefined);

    const possibleSupertypes =
      editorStore.graphManagerState.graph.ownClasses.filter(
        (superType) =>
          // Exclude current class
          superType !== _class &&
          // Exclude super types of the class
          !getAllSuperclasses(_class).includes(superType) &&
          // Ensure there is no loop (might be expensive)
          !getAllSuperclasses(superType).includes(_class),
      );
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
          class_addProperty(
            _class,
            stub_Property(PrimitiveType.STRING, _class),
          );
        } else if (selectedTab === UML_EDITOR_TAB.DERIVED_PROPERTIES) {
          const dp = stub_DerivedProperty(PrimitiveType.STRING, _class);
          class_addDerivedProperty(_class, dp);
          classState.addDerivedPropertyState(dp);
        } else if (selectedTab === UML_EDITOR_TAB.CONSTRAINTS) {
          const constraint = stub_Constraint(_class);
          class_addContraint(_class, constraint);
          classState.addConstraintState(constraint);
        } else if (
          selectedTab === UML_EDITOR_TAB.SUPER_TYPES &&
          possibleSupertypes.length
        ) {
          const possibleSupertype = possibleSupertypes[0] as Class;
          class_addSuperType(
            _class,
            GenericTypeExplicitReference.create(
              new GenericType(possibleSupertype),
            ),
          );
          class_addSubclass(possibleSupertype, _class);
        } else if (selectedTab === UML_EDITOR_TAB.TAGGED_VALUES) {
          annotatedElement_addTaggedValue(
            _class,
            stub_TaggedValue(stub_Tag(stub_Profile())),
          );
        } else if (selectedTab === UML_EDITOR_TAB.STEREOTYPES) {
          annotatedElement_addStereotype(
            _class,
            StereotypeExplicitReference.create(stub_Stereotype(stub_Profile())),
          );
        }
      }
    };

    // Generation
    const generationParentElementPath =
      editorStore.graphState.graphGenerationState.findGenerationParentPath(
        _class.path,
      );
    const generationParentElement = generationParentElementPath
      ? editorStore.graphManagerState.graph.getNullableElement(
          generationParentElementPath,
        )
      : undefined;
    const visitGenerationParentElement = (): void => {
      if (generationParentElement) {
        editorStore.graphEditorMode.openElement(generationParentElement);
      }
    };

    // On change handler (this is used for other editors which embeds editor)
    useEffect(() => {
      onHashChange?.();
    }, [_class, classHash, onHashChange]);

    // Decorate (add/remove states for derived properties/constraints) and convert lambda objects
    useEffect(() => {
      classState.decorate();
      flowResult(classState.convertConstraintLambdaObjects()).catch(
        applicationStore.alertUnhandledError,
      );
      flowResult(classState.convertDerivedPropertyLambdaObjects()).catch(
        applicationStore.alertUnhandledError,
      );
    }, [applicationStore, classState]);

    // layout
    const propertyEditorCollapsiblePanelGroupProps =
      getCollapsiblePanelGroupProps(!editorState.selectedProperty, {
        size: 250,
      });

    return (
      <div
        data-testid={LEGEND_STUDIO_TEST_ID.CLASS_FORM_EDITOR}
        className="uml-element-editor class-form-editor"
      >
        <ResizablePanelGroup orientation="horizontal">
          <ResizablePanel
            {...propertyEditorCollapsiblePanelGroupProps.remainingPanel}
            minSize={56}
          >
            <Panel>
              <div className="panel__header">
                <div className="panel__header__title">
                  {isReadOnly && (
                    <div className="uml-element-editor__header__lock">
                      <LockIcon />
                    </div>
                  )}
                  <div className="panel__header__title__label">class</div>
                  <div className="panel__header__title__content">
                    {_class.name}
                  </div>
                </div>
                <div className="panel__header__actions">
                  {generationParentElement && (
                    <button
                      className="uml-element-editor__header__generation-origin"
                      onClick={visitGenerationParentElement}
                      tabIndex={-1}
                      title={`Visit generation parent '${generationParentElement.path}'`}
                    >
                      <div className="uml-element-editor__header__generation-origin__label">
                        <FireIcon />
                      </div>
                      <div className="uml-element-editor__header__generation-origin__parent-name">
                        {generationParentElement.name}
                      </div>
                      <div className="uml-element-editor__header__generation-origin__visit-btn">
                        <StickArrowCircleRightIcon />
                      </div>
                    </button>
                  )}
                </div>
              </div>
              <div
                data-testid={
                  LEGEND_STUDIO_TEST_ID.UML_ELEMENT_EDITOR__TABS_HEADER
                }
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
                    <PlusIcon />
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
                  <PropertiesEditor _class={_class} editorState={editorState} />
                )}
                {selectedTab === UML_EDITOR_TAB.DERIVED_PROPERTIES && (
                  <DerviedPropertiesEditor
                    _class={_class}
                    editorState={editorState}
                  />
                )}
                {selectedTab === UML_EDITOR_TAB.CONSTRAINTS && (
                  <ConstraintsEditor
                    _class={_class}
                    editorState={editorState}
                  />
                )}
                {selectedTab === UML_EDITOR_TAB.SUPER_TYPES && (
                  <SupertypesEditor _class={_class} editorState={editorState} />
                )}
                {selectedTab === UML_EDITOR_TAB.TAGGED_VALUES && (
                  <TaggedValuesEditor
                    _class={_class}
                    editorState={editorState}
                  />
                )}
                {selectedTab === UML_EDITOR_TAB.STEREOTYPES && (
                  <StereotypesEditor
                    _class={_class}
                    editorState={editorState}
                  />
                )}
              </div>
            </Panel>
          </ResizablePanel>
          <ResizablePanelSplitter>
            <ResizablePanelSplitterLine color="var(--color-light-grey-200)" />
          </ResizablePanelSplitter>
          <ResizablePanel
            {...propertyEditorCollapsiblePanelGroupProps.collapsiblePanel}
            direction={-1}
          >
            {editorState.selectedProperty ? (
              <PropertyEditor
                property={editorState.selectedProperty}
                deselectProperty={deselectProperty}
                isReadOnly={isReadOnly}
              />
            ) : (
              <div className="uml-element-editor__sub-editor">
                <BlankPanelContent>No property selected</BlankPanelContent>
              </div>
            )}
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    );
  },
);

export const ClassEditor = observer((props: { _class: Class }) => {
  const { _class } = props;
  const editorStore = useEditorStore();
  const editorState =
    editorStore.tabManagerState.getCurrentEditorState(ClassEditorState);

  const classPreviewRenderers = editorStore.pluginManager
    .getApplicationPlugins()
    .flatMap((plugin) => plugin.getExtraClassPreviewRenderers?.() ?? [])
    .filter(isNonNullable);

  useApplicationNavigationContext(
    LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY.CLASS_EDITOR,
  );

  return (
    <ResizablePanelGroup orientation="vertical" className="class-editor">
      <ResizablePanel size={500} minSize={450}>
        {classPreviewRenderers.length !== 0 &&
          (classPreviewRenderers[0] as ClassPreviewRenderer)(_class)}
        {classPreviewRenderers.length === 0 && (
          <BlankPanelContent>No preview</BlankPanelContent>
        )}
      </ResizablePanel>
      <ResizablePanelSplitter />
      <ResizablePanel minSize={450}>
        <ClassFormEditor _class={_class} editorState={editorState} />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
});
