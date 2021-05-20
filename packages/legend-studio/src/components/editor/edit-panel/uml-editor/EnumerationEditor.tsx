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
import { useDrop } from 'react-dnd';
import type {
  ElementDragSource,
  UMLEditorElementDropTarget,
} from '../../../../stores/shared/DnDUtil';
import { CORE_DND_TYPE } from '../../../../stores/shared/DnDUtil';
import SplitPane from 'react-split-pane';
import { prettyCONSTName } from '@finos/legend-studio-shared';
import { clsx } from '@finos/legend-studio-components';
import { CORE_TEST_ID } from '../../../../const';
import { StereotypeSelector } from './StereotypeSelector';
import { TaggedValueEditor } from './TaggedValueEditor';
import {
  FaPlus,
  FaTimes,
  FaLongArrowAltRight,
  FaLock,
  FaFire,
  FaArrowCircleRight,
} from 'react-icons/fa';
import type { Enumeration } from '../../../../models/metamodels/pure/model/packageableElements/domain/Enumeration';
import { Enum } from '../../../../models/metamodels/pure/model/packageableElements/domain/Enum';
import { Profile } from '../../../../models/metamodels/pure/model/packageableElements/domain/Profile';
import { Tag } from '../../../../models/metamodels/pure/model/packageableElements/domain/Tag';
import { TaggedValue } from '../../../../models/metamodels/pure/model/packageableElements/domain/TaggedValue';
import { Stereotype } from '../../../../models/metamodels/pure/model/packageableElements/domain/Stereotype';
import type { StereotypeReference } from '../../../../models/metamodels/pure/model/packageableElements/domain/StereotypeReference';
import { StereotypeExplicitReference } from '../../../../models/metamodels/pure/model/packageableElements/domain/StereotypeReference';

const EnumBasicEditor = observer(
  (props: {
    _enum: Enum;
    selectValue: () => void;
    deleteValue: () => void;
    isReadOnly: boolean;
  }) => {
    const { _enum, selectValue, deleteValue, isReadOnly } = props;
    const changeValue: React.ChangeEventHandler<HTMLInputElement> = (event) =>
      _enum.setName(event.target.value);

    return (
      <div className="enum-basic-editor">
        <input
          className="enum-basic-editor__name"
          spellCheck={false}
          disabled={isReadOnly}
          value={_enum.name}
          onChange={changeValue}
          placeholder={`Enum name`}
          name={`Type enum name`}
        />
        <button
          className="uml-element-editor__basic__detail-btn"
          onClick={selectValue}
          tabIndex={-1}
          title={'See detail'}
        >
          <FaLongArrowAltRight />
        </button>
        {!isReadOnly && (
          <button
            className="uml-element-editor__remove-btn"
            disabled={isReadOnly}
            onClick={deleteValue}
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

const EnumEditor = observer(
  (props: { _enum: Enum; deselectValue: () => void; isReadOnly: boolean }) => {
    const { _enum, deselectValue, isReadOnly } = props;
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
          _enum.addTaggedValue(
            TaggedValue.createStub(Tag.createStub(Profile.createStub())),
          );
        } else if (selectedTab === UML_EDITOR_TAB.STEREOTYPES) {
          _enum.addStereotype(
            StereotypeExplicitReference.create(
              Stereotype.createStub(Profile.createStub()),
            ),
          );
        }
      }
    };
    const deleteStereotype =
      (val: StereotypeReference): (() => void) =>
      (): void =>
        _enum.deleteStereotype(val);
    const deleteTaggedValue =
      (val: TaggedValue): (() => void) =>
      (): void =>
        _enum.deleteTaggedValue(val);
    // Drag and Drop
    const handleDropTaggedValue = useCallback(
      (item: UMLEditorElementDropTarget): void => {
        if (!isReadOnly && item.data.packageableElement instanceof Profile) {
          _enum.addTaggedValue(
            TaggedValue.createStub(
              Tag.createStub(item.data.packageableElement),
            ),
          );
        }
      },
      [_enum, isReadOnly],
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
          _enum.addStereotype(
            StereotypeExplicitReference.create(
              Stereotype.createStub(item.data.packageableElement),
            ),
          );
        }
      },
      [_enum, isReadOnly],
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
      <div className="uml-element-editor enum-editor">
        <div data-testid={CORE_TEST_ID.PANEL} className="panel">
          <div className="panel__header">
            <div className="panel__header__title">
              {isReadOnly && (
                <div className="uml-element-editor__header__lock">
                  <FaLock />
                </div>
              )}
              <div className="panel__header__title__label">enum</div>
              <div className="panel__header__title__content">{_enum.name}</div>
            </div>
            <div className="panel__header__actions">
              <button
                className="panel__header__action"
                onClick={deselectValue}
                tabIndex={-1}
                title={'Close'}
              >
                <FaTimes />
              </button>
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
                disabled={isReadOnly}
                onClick={addValue}
                tabIndex={-1}
                title={addButtonTitle}
              >
                <FaPlus />
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
                {_enum.taggedValues.map((taggedValue) => (
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
                {_enum.stereotypes.map((stereotype) => (
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
      </div>
    );
  },
);

export const EnumerationEditor = observer(
  (props: { enumeration: Enumeration }) => {
    const { enumeration } = props;
    const editorStore = useEditorStore();
    const editorState = editorStore.getCurrentEditorState(UMLEditorState);
    const isReadOnly = editorState.isReadOnly;
    // Selected enum value
    const [selectedEnum, setSelectedEnum] = useState<Enum | undefined>();
    const deselectValue = (): void => setSelectedEnum(undefined);
    const selectValue =
      (val: Enum): (() => void) =>
      (): void =>
        setSelectedEnum(val);
    // Tab
    const selectedTab = editorState.selectedTab;
    const tabs = [
      UML_EDITOR_TAB.ENUM_VALUES,
      UML_EDITOR_TAB.TAGGED_VALUES,
      UML_EDITOR_TAB.STEREOTYPES,
    ];
    const changeTab =
      (tab: UML_EDITOR_TAB): (() => void) =>
      (): void => {
        editorState.setSelectedTab(tab);
        setSelectedEnum(undefined);
      };
    // Tagged value and Stereotype
    let addButtonTitle = '';
    switch (selectedTab) {
      case UML_EDITOR_TAB.ENUM_VALUES:
        addButtonTitle = 'Add enum value';
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
    const add = (): void => {
      if (!isReadOnly) {
        if (selectedTab === UML_EDITOR_TAB.ENUM_VALUES) {
          enumeration.addValue(Enum.createStub(enumeration));
        } else if (selectedTab === UML_EDITOR_TAB.TAGGED_VALUES) {
          enumeration.addTaggedValue(
            TaggedValue.createStub(Tag.createStub(Profile.createStub())),
          );
        } else if (selectedTab === UML_EDITOR_TAB.STEREOTYPES) {
          enumeration.addStereotype(
            StereotypeExplicitReference.create(
              Stereotype.createStub(Profile.createStub()),
            ),
          );
        }
      }
    };
    const deleteValue =
      (val: Enum): (() => void) =>
      (): void => {
        enumeration.deleteValue(val);
        if (val === selectedEnum) {
          setSelectedEnum(undefined);
        }
      };
    const deleteStereotype =
      (val: StereotypeReference): (() => void) =>
      (): void =>
        enumeration.deleteStereotype(val);
    const deleteTaggedValue =
      (val: TaggedValue): (() => void) =>
      (): void =>
        enumeration.deleteTaggedValue(val);
    // Drag and Drop
    const handleDropTaggedValue = useCallback(
      (item: UMLEditorElementDropTarget): void => {
        if (!isReadOnly && item.data.packageableElement instanceof Profile) {
          enumeration.addTaggedValue(
            TaggedValue.createStub(
              Tag.createStub(item.data.packageableElement),
            ),
          );
        }
      },
      [enumeration, isReadOnly],
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
          enumeration.addStereotype(
            StereotypeExplicitReference.create(
              Stereotype.createStub(item.data.packageableElement),
            ),
          );
        }
      },
      [enumeration, isReadOnly],
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
      if (enumeration.generationParentElement) {
        editorStore.openElement(enumeration.generationParentElement);
      }
    };

    return (
      <div
        data-testid={CORE_TEST_ID.ENUMERATION_EDITOR}
        className="uml-element-editor enumeration-editor"
      >
        <SplitPane
          split="horizontal"
          primary="second"
          size={selectedEnum ? 250 : 0}
          minSize={250}
          maxSize={0}
        >
          <div className="panel">
            <div className="panel__header">
              <div className="panel__header__title">
                <div className="panel__header__title__label">enumeration</div>
                <div className="panel__header__title__content">
                  {enumeration.name}
                </div>
              </div>
              <div className="panel__header__actions">
                {enumeration.generationParentElement && (
                  <button
                    className="uml-element-editor__header__generation-origin"
                    onClick={visitGenerationParentElement}
                    tabIndex={-1}
                    title={`Visit generation parent '${enumeration.generationParentElement.path}'`}
                  >
                    <div className="uml-element-editor__header__generation-origin__label">
                      <FaFire />
                    </div>
                    <div className="uml-element-editor__header__generation-origin__parent-name">
                      {enumeration.generationParentElement.name}
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
                  onClick={add}
                  tabIndex={-1}
                  title={addButtonTitle}
                >
                  <FaPlus />
                </button>
              </div>
            </div>
            <div className="panel__content">
              {selectedTab === UML_EDITOR_TAB.ENUM_VALUES && (
                <div className="panel__content__lists">
                  {enumeration.values.map((enumValue) => (
                    <EnumBasicEditor
                      key={enumValue.uuid}
                      _enum={enumValue}
                      deleteValue={deleteValue(enumValue)}
                      selectValue={selectValue(enumValue)}
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
                  {enumeration.taggedValues.map((taggedValue) => (
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
                  {enumeration.stereotypes.map((stereotype) => (
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
          {selectedEnum ? (
            <EnumEditor
              _enum={selectedEnum}
              deselectValue={deselectValue}
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
