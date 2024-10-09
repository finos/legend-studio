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
} from '../../../../stores/editor/utils/DnDUtils.js';
import {
  clsx,
  CustomSelectorInput,
  LockIcon,
  PanelContent,
  PanelContentLists,
  PanelDropZone,
  PanelForm,
  PanelFormSection,
  PlusIcon,
  TimesIcon,
} from '@finos/legend-art';
import {
  StereotypeSelector,
  StereotypeDragPreviewLayer,
} from './StereotypeSelector.js';
import {
  TaggedValueDragPreviewLayer,
  TaggedValueEditor,
} from './TaggedValueEditor.js';
import { LEGEND_STUDIO_TEST_ID } from '../../../../__lib__/LegendStudioTesting.js';
import { isNonNullable, prettyCONSTName } from '@finos/legend-shared';
import { UML_EDITOR_TAB } from '../../../../stores/editor/editor-state/element-editor-state/UMLEditorState.js';
import {
  type AbstractProperty,
  type StereotypeReference,
  type TaggedValue,
  Profile,
  StereotypeExplicitReference,
  stub_TaggedValue,
  stub_Tag,
  stub_Profile,
  stub_Stereotype,
  Property,
  AggregationKind,
} from '@finos/legend-graph';
import {
  annotatedElement_deleteTaggedValue,
  annotatedElement_addTaggedValue,
  annotatedElement_addStereotype,
  annotatedElement_deleteStereotype,
  property_setAggregationKind,
} from '../../../../stores/graph-modifier/DomainGraphModifierHelper.js';

type AggregationKindOption = { label: string; value: AggregationKind };
const buildAggregationKindOption = (
  val: AggregationKind,
): AggregationKindOption => ({
  label: prettyCONSTName(val),
  value: val,
});

export const PropertyEditor = observer(
  (props: {
    property: AbstractProperty;
    deselectProperty: () => void;
    isReadOnly: boolean;
  }) => {
    const { property, deselectProperty, isReadOnly } = props;
    // Tab
    const [selectedTab, setSelectedTab] = useState<UML_EDITOR_TAB>(
      property instanceof Property
        ? UML_EDITOR_TAB.PROPERTY_AGGREGATION
        : UML_EDITOR_TAB.TAGGED_VALUES,
    );
    const tabs = [
      property instanceof Property
        ? UML_EDITOR_TAB.PROPERTY_AGGREGATION
        : undefined,
      UML_EDITOR_TAB.TAGGED_VALUES,
      UML_EDITOR_TAB.STEREOTYPES,
    ].filter(isNonNullable);
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
      case UML_EDITOR_TAB.PROPERTY_AGGREGATION:
        addButtonTitle = 'Configure property aggregation kind';
        break;
      default:
        break;
    }
    const addValue = (): void => {
      if (!isReadOnly) {
        if (selectedTab === UML_EDITOR_TAB.TAGGED_VALUES) {
          annotatedElement_addTaggedValue(
            property,
            stub_TaggedValue(stub_Tag(stub_Profile())),
          );
        } else if (selectedTab === UML_EDITOR_TAB.STEREOTYPES) {
          annotatedElement_addStereotype(
            property,
            StereotypeExplicitReference.create(stub_Stereotype(stub_Profile())),
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
            stub_TaggedValue(stub_Tag(item.data.packageableElement)),
          );
        }
      },
      [isReadOnly, property],
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
            property,
            StereotypeExplicitReference.create(
              stub_Stereotype(item.data.packageableElement),
            ),
          );
        }
      },
      [isReadOnly, property],
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
                title="Close"
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
                disabled={
                  isReadOnly ||
                  ![
                    UML_EDITOR_TAB.TAGGED_VALUES,
                    UML_EDITOR_TAB.STEREOTYPES,
                  ].includes(selectedTab)
                }
                onClick={addValue}
                tabIndex={-1}
                title={addButtonTitle}
              >
                <PlusIcon />
              </button>
            </div>
          </div>
          <PanelContent>
            {selectedTab === UML_EDITOR_TAB.PROPERTY_AGGREGATION &&
              property instanceof Property && (
                <PanelForm>
                  <PanelFormSection>
                    <div className="panel__content__form__section__header__label">
                      Aggregation Kind
                    </div>
                    <CustomSelectorInput
                      className="panel__content__form__section__dropdown"
                      options={Object.values(AggregationKind).map(
                        buildAggregationKindOption,
                      )}
                      onChange={(option: AggregationKindOption | null) =>
                        property_setAggregationKind(property, option?.value)
                      }
                      value={
                        property.aggregation
                          ? buildAggregationKindOption(property.aggregation)
                          : null
                      }
                      escapeClearsValue={true}
                      isClearable={true}
                      disabled={isReadOnly}
                    />
                  </PanelFormSection>
                </PanelForm>
              )}
            {selectedTab === UML_EDITOR_TAB.TAGGED_VALUES && (
              <PanelDropZone
                isDragOver={isTaggedValueDragOver && !isReadOnly}
                dropTargetConnector={dropTaggedValueRef}
              >
                <PanelContentLists>
                  <TaggedValueDragPreviewLayer />
                  {property.taggedValues.map((taggedValue) => (
                    <TaggedValueEditor
                      annotatedElement={property}
                      key={taggedValue._UUID}
                      taggedValue={taggedValue}
                      deleteValue={_deleteTaggedValue(taggedValue)}
                      isReadOnly={isReadOnly}
                    />
                  ))}
                </PanelContentLists>
              </PanelDropZone>
            )}
            {selectedTab === UML_EDITOR_TAB.STEREOTYPES && (
              <PanelDropZone
                isDragOver={isStereotypeDragOver && !isReadOnly}
                dropTargetConnector={dropStereotypeRef}
              >
                <PanelContentLists>
                  <StereotypeDragPreviewLayer />
                  {property.stereotypes.map((stereotype) => (
                    <StereotypeSelector
                      key={stereotype.value._UUID}
                      annotatedElement={property}
                      stereotype={stereotype}
                      deleteStereotype={_deleteStereotype(stereotype)}
                      isReadOnly={isReadOnly}
                    />
                  ))}
                </PanelContentLists>
              </PanelDropZone>
            )}
          </PanelContent>
        </div>
      </div>
    );
  },
);
