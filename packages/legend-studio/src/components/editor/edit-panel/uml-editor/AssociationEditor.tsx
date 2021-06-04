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

import { useState, useCallback } from 'react';
import { observer } from 'mobx-react-lite';
import { useEditorStore } from '../../../../stores/EditorStore';
import {
  UMLEditorState,
  UML_EDITOR_TAB,
} from '../../../../stores/editor-state/element-editor-state/UMLEditorState';
import {
  FaLock,
  FaPlus,
  FaArrowAltCircleRight,
  FaLongArrowAltRight,
} from 'react-icons/fa';
import type {
  UMLEditorElementDropTarget,
  ElementDragSource,
} from '../../../../stores/shared/DnDUtil';
import { CORE_DND_TYPE } from '../../../../stores/shared/DnDUtil';
import { useDrop } from 'react-dnd';
import SplitPane from 'react-split-pane';
import {
  clsx,
  CustomSelectorInput,
  createFilter,
} from '@finos/legend-studio-components';
import { getElementIcon } from '../../../shared/Icon';
import { prettyCONSTName, guaranteeType } from '@finos/legend-studio-shared';
import { CORE_TEST_ID } from '../../../../const';
import { MULTIPLICITY_INFINITE } from '../../../../models/MetaModelConst';
import { StereotypeSelector } from './StereotypeSelector';
import { TaggedValueEditor } from './TaggedValueEditor';
import { PropertyEditor } from './PropertyEditor';
import type { Association } from '../../../../models/metamodels/pure/model/packageableElements/domain/Association';
import type { Property } from '../../../../models/metamodels/pure/model/packageableElements/domain/Property';
import { TaggedValue } from '../../../../models/metamodels/pure/model/packageableElements/domain/TaggedValue';
import { Stereotype } from '../../../../models/metamodels/pure/model/packageableElements/domain/Stereotype';
import { Profile } from '../../../../models/metamodels/pure/model/packageableElements/domain/Profile';
import { Tag } from '../../../../models/metamodels/pure/model/packageableElements/domain/Tag';
import type { PackageableElementSelectOption } from '../../../../models/metamodels/pure/model/packageableElements/PackageableElement';
import { Multiplicity } from '../../../../models/metamodels/pure/model/packageableElements/domain/Multiplicity';
import {
  Class,
  CLASS_PROPERTY_TYPE,
  getClassPropertyType,
} from '../../../../models/metamodels/pure/model/packageableElements/domain/Class';
import { PrimitiveType } from '../../../../models/metamodels/pure/model/packageableElements/domain/PrimitiveType';
import { Unit } from '../../../../models/metamodels/pure/model/packageableElements/domain/Measure';
import type { StereotypeReference } from '../../../../models/metamodels/pure/model/packageableElements/domain/StereotypeReference';
import { StereotypeExplicitReference } from '../../../../models/metamodels/pure/model/packageableElements/domain/StereotypeReference';

const AssociationPropertyBasicEditor = observer(
  (props: {
    association: Association;
    property: Property;
    selectProperty: () => void;
    isReadOnly: boolean;
  }) => {
    const { association, property, selectProperty, isReadOnly } = props;
    const editorStore = useEditorStore();
    // Name
    const changeValue: React.ChangeEventHandler<HTMLInputElement> = (event) =>
      property.setName(event.target.value);
    // Generic Type
    const [isEditingType, setIsEditingType] = useState(false);
    // FIXME: make this so that association can only refer to classes from the same space
    const propertyTypeOptions = editorStore.classOptions.filter(
      (classOption) =>
        classOption.value !==
        association.getOtherProperty(property).genericType.value.rawType,
    );
    const propertyType = property.genericType.value.rawType;
    const propertyTypeName = getClassPropertyType(propertyType);
    const filterOption = createFilter({
      ignoreCase: true,
      ignoreAccents: false,
      stringify: (option: PackageableElementSelectOption<Class>): string =>
        option.value.path,
    });
    const selectedPropertyType = {
      value: propertyType,
      label: propertyType.name,
    };
    const changePropertyType = (
      val: PackageableElementSelectOption<Class>,
    ): void => {
      association.changePropertyType(
        property,
        guaranteeType(
          val.value,
          Class,
          `Association property type can only be 'class'`,
        ),
      );
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

    return (
      <div className="property-basic-editor">
        <input
          className="property-basic-editor__name"
          disabled={isReadOnly}
          value={property.name}
          spellCheck={false}
          onChange={changeValue}
          placeholder={`Property name`}
        />
        {!isReadOnly && isEditingType && (
          <CustomSelectorInput
            className="property-basic-editor__type"
            options={propertyTypeOptions}
            onChange={changePropertyType}
            value={selectedPropertyType}
            placeholder={'Choose a data type or enumeration'}
            filterOption={filterOption}
          />
        )}
        {!isReadOnly && !isEditingType && (
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
        {isReadOnly && (
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
          className="uml-element-editor__basic__detail-btn"
          onClick={selectProperty}
          tabIndex={-1}
          title={'See detail'}
        >
          <FaLongArrowAltRight />
        </button>
      </div>
    );
  },
);

export const AssociationEditor = observer(
  (props: { association: Association }) => {
    const { association } = props;
    const editorStore = useEditorStore();
    const editorState = editorStore.getCurrentEditorState(UMLEditorState);
    const isReadOnly = editorState.isReadOnly;
    // Selected property
    const [selectedProperty, setSelectedProperty] =
      useState<Property | undefined>();
    const selectProperty =
      (e: Property): (() => void) =>
      (): void =>
        setSelectedProperty(e);
    // Tab
    const selectedTab = editorState.selectedTab;
    const tabs = [
      UML_EDITOR_TAB.PROPERTIES,
      UML_EDITOR_TAB.TAGGED_VALUES,
      UML_EDITOR_TAB.STEREOTYPES,
    ];
    const changeTab =
      (tab: UML_EDITOR_TAB): (() => void) =>
      (): void => {
        editorState.setSelectedTab(tab);
        setSelectedProperty(undefined);
      };
    let addButtonTitle = '';
    switch (selectedTab) {
      case UML_EDITOR_TAB.TAGGED_VALUES:
        addButtonTitle = 'Add tagged value';
        break;
      case UML_EDITOR_TAB.STEREOTYPES:
        addButtonTitle = 'Add stereotype';
        break;
      default:
        break;
    }
    const add = (): void => {
      if (!isReadOnly) {
        if (selectedTab === UML_EDITOR_TAB.TAGGED_VALUES) {
          association.addTaggedValue(
            TaggedValue.createStub(Tag.createStub(Profile.createStub())),
          );
        } else if (selectedTab === UML_EDITOR_TAB.STEREOTYPES) {
          association.addStereotype(
            StereotypeExplicitReference.create(
              Stereotype.createStub(Profile.createStub()),
            ),
          );
        }
      }
    };
    // Tagged value and Stereotype
    const deleteStereotype =
      (val: StereotypeReference): (() => void) =>
      (): void =>
        association.deleteStereotype(val);
    const deleteTaggedValue =
      (val: TaggedValue): (() => void) =>
      (): void =>
        association.deleteTaggedValue(val);
    // Property
    const deselectProperty = (): void => setSelectedProperty(undefined);
    // Drag and Drop
    const handleDropTaggedValue = useCallback(
      (item: UMLEditorElementDropTarget): void => {
        if (!isReadOnly && item.data.packageableElement instanceof Profile) {
          association.addTaggedValue(
            TaggedValue.createStub(
              Tag.createStub(item.data.packageableElement),
            ),
          );
        }
      },
      [association, isReadOnly],
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
          association.addStereotype(
            StereotypeExplicitReference.create(
              Stereotype.createStub(item.data.packageableElement),
            ),
          );
        }
      },
      [association, isReadOnly],
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
    return (
      <div
        data-testid={CORE_TEST_ID.ASSOCIATION_EDITOR}
        className="uml-element-editor association-editor"
      >
        <SplitPane
          split="horizontal"
          primary="second"
          size={selectedProperty ? 250 : 0}
          minSize={250}
          maxSize={0}
        >
          <div className="panel">
            <div className="panel__header">
              <div className="panel__header__title">
                {isReadOnly && (
                  <div className="uml-element-editor__header__lock">
                    <FaLock />
                  </div>
                )}
                <div className="panel__header__title__label">association</div>
                <div className="panel__header__title__content">
                  {association.name}
                </div>
              </div>
            </div>
            <div className="panel__header uml-element-editor__tabs__header">
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
                  disabled={
                    isReadOnly || selectedTab === UML_EDITOR_TAB.PROPERTIES
                  }
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
                <div className="panel__content__lists">
                  <AssociationPropertyBasicEditor
                    association={association}
                    property={association.getFirstProperty()}
                    selectProperty={selectProperty(
                      association.getFirstProperty(),
                    )}
                    isReadOnly={isReadOnly}
                  />
                  <AssociationPropertyBasicEditor
                    association={association}
                    property={association.getSecondProperty()}
                    selectProperty={selectProperty(
                      association.getSecondProperty(),
                    )}
                    isReadOnly={isReadOnly}
                  />
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
                  {association.taggedValues.map((taggedValue) => (
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
                  {association.stereotypes.map((stereotype) => (
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
