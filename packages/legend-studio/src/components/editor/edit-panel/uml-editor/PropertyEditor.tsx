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
import { useDrop } from 'react-dnd';
import {
  CORE_DND_TYPE,
  type ElementDragSource,
  type UMLEditorElementDropTarget,
} from '../../../../stores/shared/DnDUtil';
import { clsx, LockIcon, PlusIcon, TimesIcon } from '@finos/legend-art';
import { StereotypeSelector } from './StereotypeSelector';
import { TaggedValueEditor } from './TaggedValueEditor';
import { LEGEND_STUDIO_TEST_ID } from '../../../LegendStudioTestID';
import { prettyCONSTName } from '@finos/legend-shared';
import { UML_EDITOR_TAB } from '../../../../stores/editor-state/element-editor-state/UMLEditorState';
import {
  type Property,
  type DerivedProperty,
  type StereotypeReference,
  Profile,
  Tag,
  TaggedValue,
  Stereotype,
  StereotypeExplicitReference,
} from '@finos/legend-graph';
import {
  annotatedElement_deleteTaggedValue,
  annotatedElement_addTaggedValue,
  annotatedElement_addStereotype,
  annotatedElement_deleteStereotype,
} from '../../../../stores/graphModifier/DomainGraphModifierHelper';

export const PropertyEditor = observer(
  (props: {
    property: Property | DerivedProperty;
    deselectProperty: () => void;
    isReadOnly: boolean;
  }) => {
    const { property, deselectProperty, isReadOnly } = props;
    // Tab
    const [selectedTab, setSelectedTab] = useState<UML_EDITOR_TAB>(
      UML_EDITOR_TAB.TAGGED_VALUES,
    );
    const tabs = [UML_EDITOR_TAB.TAGGED_VALUES, UML_EDITOR_TAB.STEREOTYPES];
    const changeTab =
      (tab: UML_EDITOR_TAB): (() => void) =>
      (): void =>
        setSelectedTab(tab);
    // Tagged value and Stereotype
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
    const addValue = (): void => {
      if (!isReadOnly) {
        if (selectedTab === UML_EDITOR_TAB.TAGGED_VALUES) {
          annotatedElement_addTaggedValue(
            property,
            TaggedValue.createStub(Tag.createStub(Profile.createStub())),
          );
        } else if (selectedTab === UML_EDITOR_TAB.STEREOTYPES) {
          annotatedElement_addStereotype(
            property,
            StereotypeExplicitReference.create(
              Stereotype.createStub(Profile.createStub()),
            ),
          );
        }
      }
    };
    const _deleteStereotype =
      (val: StereotypeReference): (() => void) =>
      (): void =>
        annotatedElement_deleteStereotype(property, val);
    const _deleteTaggedValue =
      (val: TaggedValue): (() => void) =>
      (): void =>
        annotatedElement_deleteTaggedValue(property, val);
    // Drag and Drop
    const handleDropTaggedValue = useCallback(
      (item: UMLEditorElementDropTarget): void => {
        if (!isReadOnly && item.data.packageableElement instanceof Profile) {
          annotatedElement_addTaggedValue(
            property,
            TaggedValue.createStub(
              Tag.createStub(item.data.packageableElement),
            ),
          );
        }
      },
      [isReadOnly, property],
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
          annotatedElement_addStereotype(
            property,
            StereotypeExplicitReference.create(
              Stereotype.createStub(item.data.packageableElement),
            ),
          );
        }
      },
      [isReadOnly, property],
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
      <div className="uml-element-editor property-editor">
        <div data-testid={LEGEND_STUDIO_TEST_ID.PANEL} className="panel">
          <div className="panel__header">
            <div className="panel__header__title">
              {isReadOnly && (
                <div className="uml-element-editor__header__lock">
                  <LockIcon />
                </div>
              )}
              <div className="panel__header__title__label">property</div>
              <div className="panel__header__title__content">
                {property.name}
              </div>
            </div>
            <div className="panel__header__actions">
              <button
                className="panel__header__action"
                onClick={deselectProperty}
                tabIndex={-1}
                title={'Close'}
              >
                <TimesIcon />
              </button>
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
                disabled={isReadOnly}
                onClick={addValue}
                tabIndex={-1}
                title={addButtonTitle}
              >
                <PlusIcon />
              </button>
            </div>
          </div>
          <div className="panel__content">
            {selectedTab === UML_EDITOR_TAB.TAGGED_VALUES && (
              <div
                ref={dropTaggedValueRef}
                className={clsx('panel__content__lists', {
                  'panel__content__lists--dnd-over':
                    isTaggedValueDragOver && !isReadOnly,
                })}
              >
                {property.taggedValues.map((taggedValue) => (
                  <TaggedValueEditor
                    key={taggedValue._UUID}
                    taggedValue={taggedValue}
                    deleteValue={_deleteTaggedValue(taggedValue)}
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
                {property.stereotypes.map((stereotype) => (
                  <StereotypeSelector
                    key={stereotype.value._UUID}
                    stereotype={stereotype}
                    deleteStereotype={_deleteStereotype(stereotype)}
                    isReadOnly={isReadOnly}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  },
);
