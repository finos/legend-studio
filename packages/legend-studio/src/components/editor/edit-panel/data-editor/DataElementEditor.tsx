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

import { observer } from 'mobx-react-lite';
import { useEditorStore } from '../../EditorStoreProvider';
import {
  DATA_TAB_TYPE,
  PackageableDataEditorState,
} from '../../../../stores/editor-state/element-editor-state/data/DataEditorState';
import { clsx, LockIcon, PlusIcon } from '@finos/legend-art';
import { prettyCONSTName } from '@finos/legend-shared';
import {
  type TaggedValue,
  type StereotypeReference,
  StereotypeExplicitReference,
  Profile,
  stub_Stereotype,
  stub_Profile,
  stub_TaggedValue,
  stub_Tag,
} from '@finos/legend-graph';
import {
  annotatedElement_addStereotype,
  annotatedElement_addTaggedValue,
  annotatedElement_deleteStereotype,
  annotatedElement_deleteTaggedValue,
} from '../../../../stores/graphModifier/DomainGraphModifierHelper';
import { useDrop } from 'react-dnd';
import {
  CORE_DND_TYPE,
  type UMLEditorElementDropTarget,
  type ElementDragSource,
} from '../../../../stores/shared/DnDUtil';
import { TaggedValueEditor } from '../uml-editor/TaggedValueEditor';
import { useCallback } from 'react';
import { StereotypeSelector } from '../uml-editor/StereotypeSelector';
import { EmbeddedDataEditor } from './EmbeddedDataEditor';

export const DataElementEditor = observer(() => {
  const editorStore = useEditorStore();
  const editorState = editorStore.getCurrentEditorState(
    PackageableDataEditorState,
  );
  const dataElement = editorState.data;
  const isReadOnly = editorState.isReadOnly;
  const selectedTab = editorState.selectedTab;
  const changeTab =
    (tab: DATA_TAB_TYPE): (() => void) =>
    (): void =>
      editorState.setSelectedTab(tab);
  const addStereotype = (): void => {
    annotatedElement_addStereotype(
      dataElement,
      StereotypeExplicitReference.create(stub_Stereotype(stub_Profile())),
    );
  };
  const addTaggedValue = (): void => {
    annotatedElement_addTaggedValue(
      dataElement,
      stub_TaggedValue(stub_Tag(stub_Profile())),
    );
  };
  const deleteTaggedValue =
    (val: TaggedValue): (() => void) =>
    (): void =>
      annotatedElement_deleteTaggedValue(dataElement, val);
  const _deleteStereotype =
    (val: StereotypeReference): (() => void) =>
    (): void =>
      annotatedElement_deleteStereotype(dataElement, val);
  const handleDropTaggedValue = useCallback(
    (item: UMLEditorElementDropTarget): void => {
      if (!isReadOnly && item.data.packageableElement instanceof Profile) {
        annotatedElement_addTaggedValue(
          dataElement,
          stub_TaggedValue(stub_Tag(item.data.packageableElement)),
        );
      }
    },
    [dataElement, isReadOnly],
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
          dataElement,
          StereotypeExplicitReference.create(
            stub_Stereotype(item.data.packageableElement),
          ),
        );
      }
    },
    [dataElement, isReadOnly],
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
    <div className="data-editor">
      <div className="data-editor__header">
        <div className="data-editor__header__title">
          {isReadOnly && (
            <div className="data-editor__header__lock">
              <LockIcon />
            </div>
          )}
          <div className="data-editor__header__title__label">Data Element</div>
          <div className="data-editor__header__title__content">
            {dataElement.name}
          </div>
        </div>
      </div>
      <div className="uml-element-editor__tabs">
        {Object.values(DATA_TAB_TYPE).map((tab) => (
          <div
            key={tab}
            onClick={changeTab(tab)}
            className={clsx('relational-connection-editor__tab', {
              'relational-connection-editor__tab--active': tab === selectedTab,
            })}
          >
            {prettyCONSTName(tab)}
          </div>
        ))}
      </div>
      <div className="data-editor__content">
        {selectedTab === DATA_TAB_TYPE.GENERAL && (
          <EmbeddedDataEditor
            embeddedDataEditorState={editorState.embeddedDataState}
            isReadOnly={isReadOnly}
          />
        )}
        {selectedTab === DATA_TAB_TYPE.STEREOTYPES && (
          <>
            <div className="data-editor__header">
              <div className="data-editor__header__title">
                {isReadOnly && (
                  <div className="element-editor__header__lock">
                    <LockIcon />
                  </div>
                )}
                <div className="data-editor__header__title__label">
                  Stereotypes
                </div>
              </div>
              <div className="data-editor__header__actions">
                <button
                  className="data-editor__header__action"
                  onClick={addStereotype}
                  disabled={isReadOnly}
                  tabIndex={-1}
                  title={'Add Stereotype'}
                >
                  <PlusIcon />
                </button>
              </div>
            </div>
            <div className="data-editor__content">
              <div className="data-editor__content__lists">
                <div
                  ref={dropStereotypeRef}
                  className={clsx('panel__content__lists', {
                    'panel__content__lists--dnd-over':
                      isStereotypeDragOver && !isReadOnly,
                  })}
                >
                  {dataElement.stereotypes.map((stereotype) => (
                    <StereotypeSelector
                      key={stereotype.value._UUID}
                      stereotype={stereotype}
                      deleteStereotype={_deleteStereotype(stereotype)}
                      isReadOnly={isReadOnly}
                      darkTheme={true}
                    />
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
        {selectedTab === DATA_TAB_TYPE.TAGGED_VALUES && (
          <>
            <div className="data-editor__header">
              <div className="data-editor__header__title">
                {isReadOnly && (
                  <div className="data-editor__header__lock">
                    <LockIcon />
                  </div>
                )}
                <div className="data-editor__header__title__label">
                  Tagged Values
                </div>
              </div>
              <div className="data-editor__header__actions">
                <button
                  className="data-editor__header__action"
                  onClick={addTaggedValue}
                  disabled={isReadOnly}
                  tabIndex={-1}
                  title={'Add Tagged value'}
                >
                  <PlusIcon />
                </button>
              </div>
            </div>
            <div className="data-editor__content">
              <div className="data-editor__content__lists">
                <div
                  ref={dropTaggedValueRef}
                  className={clsx('panel__content__lists', {
                    'panel__content__lists--dnd-over':
                      isTaggedValueDragOver && !isReadOnly,
                  })}
                >
                  {dataElement.taggedValues.map((taggedValue) => (
                    <TaggedValueEditor
                      key={taggedValue._UUID}
                      taggedValue={taggedValue}
                      deleteValue={deleteTaggedValue(taggedValue)}
                      isReadOnly={isReadOnly}
                      darkTheme={true}
                    />
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
});
