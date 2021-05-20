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

import { useEditorStore } from '../../../../stores/EditorStore';
import { prettyCONSTName } from '@finos/legend-studio-shared';
import {
  UMLEditorState,
  UML_EDITOR_TAB,
} from '../../../../stores/editor-state/element-editor-state/UMLEditorState';
import { observer } from 'mobx-react-lite';
import { FaPlus, FaTimes, FaLock } from 'react-icons/fa';
import { clsx } from '@finos/legend-studio-components';
import { CORE_TEST_ID } from '../../../../const';
import type { Profile } from '../../../../models/metamodels/pure/model/packageableElements/domain/Profile';
import { Tag } from '../../../../models/metamodels/pure/model/packageableElements/domain/Tag';
import { Stereotype } from '../../../../models/metamodels/pure/model/packageableElements/domain/Stereotype';

const TagBasicEditor = observer(
  (props: { tag: Tag; deleteValue: () => void; isReadOnly: boolean }) => {
    const { tag, deleteValue, isReadOnly } = props;
    const changeValue: React.ChangeEventHandler<HTMLInputElement> = (event) =>
      tag.setValue(event.target.value);

    return (
      <div className="tag-basic-editor">
        <input
          className="tag-basic-editor__value"
          spellCheck={false}
          disabled={isReadOnly}
          value={tag.value}
          onChange={changeValue}
          placeholder={`Tag value`}
          name={`Tag value`}
        />
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

const StereotypeBasicEditor = observer(
  (props: {
    stereotype: Stereotype;
    deleteStereotype: () => void;
    isReadOnly: boolean;
  }) => {
    const { stereotype, deleteStereotype, isReadOnly } = props;
    const changeValue: React.ChangeEventHandler<HTMLInputElement> = (event) =>
      stereotype.setValue(event.target.value);

    return (
      <div className="stereotype-basic-editor">
        <input
          className="stereotype-basic-editor__value"
          spellCheck={false}
          disabled={isReadOnly}
          value={stereotype.value}
          onChange={changeValue}
          placeholder={`Stereotype value`}
          name={`Stereotype value`}
        />
        {!isReadOnly && (
          <button
            className="uml-element-editor__remove-btn"
            disabled={isReadOnly}
            onClick={deleteStereotype}
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

export const ProfileEditor = observer((props: { profile: Profile }) => {
  const { profile } = props;
  const editorStore = useEditorStore();
  const editorState = editorStore.getCurrentEditorState(UMLEditorState);
  const isReadOnly = editorState.isReadOnly;
  // Tab
  const selectedTab = editorState.selectedTab;
  const tabs = [UML_EDITOR_TAB.TAGS, UML_EDITOR_TAB.STEREOTYPES];
  const changeTab =
    (tab: UML_EDITOR_TAB): (() => void) =>
    (): void =>
      editorState.setSelectedTab(tab);
  // Tagged value and Stereotype
  let addButtonTitle = '';
  switch (selectedTab) {
    case UML_EDITOR_TAB.TAGS:
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
      if (selectedTab === UML_EDITOR_TAB.TAGS) {
        profile.addTag(Tag.createStub(profile));
      } else if (selectedTab === UML_EDITOR_TAB.STEREOTYPES) {
        profile.addStereotype(Stereotype.createStub(profile));
      }
    }
  };
  const deleteStereotype =
    (val: Stereotype): (() => void) =>
    (): void =>
      profile.deleteStereotype(val);
  const deleteTag =
    (val: Tag): (() => void) =>
    (): void =>
      profile.deleteTag(val);
  return (
    <div className="uml-element-editor profile-editor">
      <div className="panel">
        <div className="panel__header">
          <div className="panel__header__title">
            {isReadOnly && (
              <div className="uml-element-editor__header__lock">
                <FaLock />
              </div>
            )}
            <div className="panel__header__title__label">profile</div>
            <div className="panel__header__title__content">{profile.name}</div>
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
              onClick={addValue}
              disabled={isReadOnly}
              tabIndex={-1}
              title={addButtonTitle}
            >
              <FaPlus />
            </button>
          </div>
        </div>
        <div className="panel__content">
          {selectedTab === UML_EDITOR_TAB.TAGS && (
            <div className="panel__content__lists">
              {profile.tags.map((tag) => (
                <TagBasicEditor
                  key={tag.uuid}
                  tag={tag}
                  deleteValue={deleteTag(tag)}
                  isReadOnly={isReadOnly}
                />
              ))}
            </div>
          )}
          {selectedTab === UML_EDITOR_TAB.STEREOTYPES && (
            <div className="panel__content__lists">
              {profile.stereotypes.map((stereotype) => (
                <StereotypeBasicEditor
                  key={stereotype.uuid}
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
});
