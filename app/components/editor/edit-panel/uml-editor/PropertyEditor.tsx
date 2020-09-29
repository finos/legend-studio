/**
 * Copyright 2020 Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useDrop } from 'react-dnd';
import { DND_TYPE, ElementDragSource, UMLEditorElementDropTarget } from 'Utilities/DnDUtil';
import { FaLock, FaPlus, FaTimes } from 'react-icons/fa';
import clsx from 'clsx';
import { StereotypeSelector } from './StereotypeSelector';
import { TaggedValueEditor } from './TaggedValueEditor';
import { TEST_ID } from 'Const';
import { prettyCONSTName } from 'Utilities/FormatterUtil';
import { UML_EDITOR_TAB } from 'Stores/editor-state/element-editor-state/UMLEditorState';
import { Property } from 'MM/model/packageableElements/domain/Property';
import { DerivedProperty } from 'MM/model/packageableElements/domain/DerivedProperty';
import { Profile } from 'MM/model/packageableElements/domain/Profile';
import { Tag } from 'MM/model/packageableElements/domain/Tag';
import { TaggedValue } from 'MM/model/packageableElements/domain/TaggedValue';
import { Stereotype } from 'MM/model/packageableElements/domain/Stereotype';
import { StereotypeReference, StereotypeExplicitReference } from 'MM/model/packageableElements/domain/StereotypeReference';

export const PropertyEditor = observer((props: {
  property: Property | DerivedProperty;
  deselectProperty: () => void;
  isReadOnly: boolean;
}) => {
  const { property, deselectProperty, isReadOnly } = props;
  // Tab
  const [selectedTab, setSelectedTab] = useState<UML_EDITOR_TAB>(UML_EDITOR_TAB.TAGGED_VALUES);
  const tabs = [
    UML_EDITOR_TAB.TAGGED_VALUES,
    UML_EDITOR_TAB.STEREOTYPES,
  ];
  const changeTab = (tab: UML_EDITOR_TAB): () => void => (): void => setSelectedTab(tab);
  // Tagged value and Stereotype
  let addButtonTitle = '';
  switch (selectedTab) {
    case UML_EDITOR_TAB.TAGGED_VALUES: addButtonTitle = 'Add tagged value'; break;
    case UML_EDITOR_TAB.STEREOTYPES: addButtonTitle = 'Add stereotype'; break;
    default: break;
  }
  const addValue = (): void => {
    if (!isReadOnly) {
      if (selectedTab === UML_EDITOR_TAB.TAGGED_VALUES) {
        property.addTaggedValue(TaggedValue.createStub(Tag.createStub(Profile.createStub())));
      } else if (selectedTab === UML_EDITOR_TAB.STEREOTYPES) {
        property.addStereotype(StereotypeExplicitReference.create(Stereotype.createStub(Profile.createStub())));
      }
    }
  };
  const deleteStereotype = (val: StereotypeReference): () => void => (): void => property.deleteStereotype(val);
  const deleteTaggedValue = (val: TaggedValue): () => void => (): void => property.deleteTaggedValue(val);
  // Drag and Drop
  const handleDropTaggedValue = (item: UMLEditorElementDropTarget): void => {
    if (!isReadOnly && item.data.packageableElement instanceof Profile) {
      property.addTaggedValue(TaggedValue.createStub(Tag.createStub(item.data.packageableElement)));
    }
  };
  const [{ isTaggedValueDragOver }, dropTaggedValueRef] = useDrop({
    accept: [DND_TYPE.PROJECT_EXPLORER_PROFILE],
    drop: (item: ElementDragSource): void => handleDropTaggedValue(item),
    collect: monitor => ({ isTaggedValueDragOver: monitor.isOver({ shallow: true }) }),
  });
  const handleDropStereotype = (item: UMLEditorElementDropTarget): void => {
    if (!isReadOnly && item.data.packageableElement instanceof Profile) {
      property.addStereotype(StereotypeExplicitReference.create(Stereotype.createStub(item.data.packageableElement)));
    }
  };
  const [{ isStereotypeDragOver }, dropStereotypeRef] = useDrop({
    accept: [DND_TYPE.PROJECT_EXPLORER_PROFILE],
    drop: (item: ElementDragSource): void => handleDropStereotype(item),
    collect: monitor => ({ isStereotypeDragOver: monitor.isOver({ shallow: true }) }),
  });
  return (
    <div className="uml-element-editor property-editor">
      <div data-testid={TEST_ID.PANEL} className="panel">
        <div className="panel__header">
          <div className="panel__header__title">
            {isReadOnly && <div className="uml-element-editor__header__lock"><FaLock /></div>}
            <div className="panel__header__title__label">property</div>
            <div className="panel__header__title__content">{property.name}</div>
          </div>
          <div className="panel__header__actions">
            <button
              className="panel__header__action"
              onClick={deselectProperty}
              tabIndex={-1}
              title={'Close'}
            ><FaTimes /></button>
          </div>
        </div>
        <div className="panel__header uml-element-editor__tabs__header">
          <div className="uml-element-editor__tabs">
            {tabs.map(tab => <div key={tab} onClick={changeTab(tab)}
              className={clsx('uml-element-editor__tab', { 'uml-element-editor__tab--active': tab === selectedTab })}>{prettyCONSTName(tab)}</div>)}
          </div>
          <div className="panel__header__actions">
            <button
              className="panel__header__action"
              disabled={isReadOnly}
              onClick={addValue}
              tabIndex={-1}
              title={addButtonTitle}
            ><FaPlus /></button>
          </div>
        </div>
        <div className="panel__content">
          {selectedTab === UML_EDITOR_TAB.TAGGED_VALUES &&
            <div ref={dropTaggedValueRef} className={clsx('panel__content__lists', { 'panel__content__lists--dnd-over': isTaggedValueDragOver && !isReadOnly })}>
              {property.taggedValues.map(taggedValue =>
                <TaggedValueEditor key={taggedValue.uuid} taggedValue={taggedValue} deleteValue={deleteTaggedValue(taggedValue)} isReadOnly={isReadOnly} />
              )}
            </div>
          }
          {selectedTab === UML_EDITOR_TAB.STEREOTYPES &&
            <div ref={dropStereotypeRef} className={clsx('panel__content__lists', { 'panel__content__lists--dnd-over': isStereotypeDragOver && !isReadOnly })}>
              {property.stereotypes.map(stereotype =>
                <StereotypeSelector key={stereotype.value.uuid} stereotype={stereotype} deleteStereotype={deleteStereotype(stereotype)} isReadOnly={isReadOnly} />
              )}
            </div>
          }
        </div>
      </div>
    </div>
  );
});
