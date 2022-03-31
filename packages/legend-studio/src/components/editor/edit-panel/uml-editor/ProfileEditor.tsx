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

import { prettyCONSTName } from '@finos/legend-shared';
import {
  UMLEditorState,
  UML_EDITOR_TAB,
} from '../../../../stores/editor-state/element-editor-state/UMLEditorState';
import { observer } from 'mobx-react-lite';
import {
  clsx,
  InputWithInlineValidation,
  PlusIcon,
  TimesIcon,
  LockIcon,
} from '@finos/legend-art';
import { LEGEND_STUDIO_TEST_ID } from '../../../LegendStudioTestID';
import { useEditorStore } from '../../EditorStoreProvider';
import { type Profile, Tag, Stereotype } from '@finos/legend-graph';
import {
  profile_addTag,
  profile_addStereotype,
  profile_deleteTag,
  profile_deleteStereotype,
  tagStereotype_setValue,
} from '../../../../stores/DomainModifierHelper';

const TagBasicEditor = observer(
  (props: { tag: Tag; deleteValue: () => void; isReadOnly: boolean }) => {
    const { tag, deleteValue, isReadOnly } = props;
    const changeValue: React.ChangeEventHandler<HTMLInputElement> = (event) => {
      tagStereotype_setValue(tag, event.target.value);
    };
    const isTagDuplicated = (val: Tag): boolean =>
      tag.owner.tags.filter((t) => t.value === val.value).length >= 2;

    return (
      <div className="tag-basic-editor">
        <InputWithInlineValidation
          className="tag-basic-editor__value input-group__input"
          spellCheck={false}
          disabled={isReadOnly}
          value={tag.value}
          onChange={changeValue}
          placeholder={`Tag value`}
          validationErrorMessage={
            isTagDuplicated(tag) ? 'Duplicated tag' : undefined
          }
        />
        {!isReadOnly && (
          <button
            className="uml-element-editor__remove-btn"
            disabled={isReadOnly}
            onClick={deleteValue}
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

const StereotypeBasicEditor = observer(
  (props: {
    stereotype: Stereotype;
    deleteStereotype: () => void;
    isReadOnly: boolean;
  }) => {
    const { stereotype, deleteStereotype, isReadOnly } = props;
    const changeValue: React.ChangeEventHandler<HTMLInputElement> = (event) => {
      tagStereotype_setValue(stereotype, event.target.value);
    };
    const isStereotypeDuplicated = (val: Stereotype): boolean =>
      stereotype.owner.stereotypes.filter((s) => s.value === val.value)
        .length >= 2;

    return (
      <div className="stereotype-basic-editor">
        <InputWithInlineValidation
          className="stereotype-basic-editor__value input-group__input"
          spellCheck={false}
          disabled={isReadOnly}
          value={stereotype.value}
          onChange={changeValue}
          placeholder={`Stereotype value`}
          validationErrorMessage={
            isStereotypeDuplicated(stereotype)
              ? 'Duplicated stereotype'
              : undefined
          }
        />
        {!isReadOnly && (
          <button
            className="uml-element-editor__remove-btn"
            disabled={isReadOnly}
            onClick={deleteStereotype}
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
        profile_addTag(profile, Tag.createStub(profile));
      } else if (selectedTab === UML_EDITOR_TAB.STEREOTYPES) {
        profile_addStereotype(profile, Stereotype.createStub(profile));
      }
    }
  };
  const deleteStereotype =
    (val: Stereotype): (() => void) =>
    (): void =>
      profile_deleteStereotype(profile, val);
  const deleteTag =
    (val: Tag): (() => void) =>
    (): void =>
      profile_deleteTag(profile, val);
  return (
    <div className="uml-element-editor profile-editor">
      <div className="panel">
        <div className="panel__header">
          <div className="panel__header__title">
            {isReadOnly && (
              <div className="uml-element-editor__header__lock">
                <LockIcon />
              </div>
            )}
            <div className="panel__header__title__label">profile</div>
            <div className="panel__header__title__content">{profile.name}</div>
          </div>
        </div>
        <div
          data-testid={LEGEND_STUDIO_TEST_ID.UML_ELEMENT_EDITOR__TABS_HEADER}
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
              <PlusIcon />
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
