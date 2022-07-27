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

import { useState } from 'react';
import { observer } from 'mobx-react-lite';
import {
  clsx,
  CustomSelectorInput,
  createFilter,
  MoreVerticalIcon,
  TimesIcon,
  ArrowCircleRightIcon,
  LongArrowAltUpIcon,
} from '@finos/legend-art';
import { useEditorStore } from '../../EditorStoreProvider.js';
import {
  type TaggedValue,
  type Tag,
  type Profile,
  isStubbed_PackageableElement,
} from '@finos/legend-graph';
import {
  taggedValue_setValue,
  taggedValue_setTag,
} from '../../../../stores/graphModifier/DomainGraphModifierHelper.js';
import type { PackageableElementOption } from '@finos/legend-application';

interface TagOption {
  label: string;
  value: Tag;
}

export const TaggedValueEditor = observer(
  (props: {
    taggedValue: TaggedValue;
    deleteValue: () => void;
    isReadOnly: boolean;
    darkTheme?: boolean;
  }) => {
    const { taggedValue, deleteValue, isReadOnly, darkTheme } = props;
    const editorStore = useEditorStore();
    // Name
    const changeValue: React.ChangeEventHandler<
      HTMLTextAreaElement | HTMLInputElement
    > = (event) => taggedValue_setValue(taggedValue, event.target.value);
    // Profile
    const profileOptions = editorStore.profileOptions.filter(
      (p) => p.value.p_tags.length,
    );
    const profileFilterOption = createFilter({
      ignoreCase: true,
      ignoreAccents: false,
      stringify: (option: PackageableElementOption<Profile>): string =>
        option.value.path,
    });
    const [selectedProfile, setSelectedProfile] = useState<
      PackageableElementOption<Profile>
    >({
      value: taggedValue.tag.value._OWNER,
      label: taggedValue.tag.value._OWNER.name,
    });
    const changeProfile = (val: PackageableElementOption<Profile>): void => {
      if (val.value.p_tags.length) {
        setSelectedProfile(val);
        taggedValue_setTag(taggedValue, val.value.p_tags[0] as Tag);
      }
    };
    const visitProfile = (): void =>
      editorStore.openElement(selectedProfile.value);
    // Tag
    const tagOptions = selectedProfile.value.p_tags.map((tag) => ({
      label: tag.value,
      value: tag,
    }));
    const inferableTag = taggedValue.tag;
    const tagFilterOption = createFilter({
      ignoreCase: true,
      ignoreAccents: false,
      stringify: (option: TagOption): string => option.label,
    });
    const selectedTag = {
      value: inferableTag.value,
      label: inferableTag.value.value,
    };
    const changeTag = (val: TagOption): void =>
      taggedValue_setTag(taggedValue, val.value);
    // Value
    const [isExpanded, setIsExpanded] = useState(false);
    const toggleExpandedMode = (): void => setIsExpanded(!isExpanded);

    return (
      <div className="tagged-value-editor">
        <div
          className={`tagged-value-editor__profile ${
            darkTheme ? 'tagged-value-editor-dark-theme' : ''
          }`}
        >
          <CustomSelectorInput
            className="tagged-value-editor__profile__selector"
            disabled={isReadOnly}
            options={profileOptions}
            onChange={changeProfile}
            value={selectedProfile}
            placeholder={'Choose a profile'}
            filterOption={profileFilterOption}
            darkMode={darkTheme ?? false}
          />
          <button
            className={`tagged-value-editor__profile__visit-btn ${
              darkTheme ? 'tagged-value-editor-dark-theme' : ''
            }`}
            disabled={isStubbed_PackageableElement(
              taggedValue.tag.value._OWNER,
            )}
            onClick={visitProfile}
            tabIndex={-1}
            title={'Visit profile'}
          >
            <ArrowCircleRightIcon />
          </button>
        </div>
        <CustomSelectorInput
          className="tagged-value-editor__tag"
          disabled={isReadOnly}
          options={tagOptions}
          onChange={changeTag}
          value={selectedTag}
          placeholder={'Choose a tag'}
          filterOption={tagFilterOption}
          darkMode={Boolean(darkTheme)}
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
        <div
          className={clsx('tagged-value-editor__value', {
            'tagged-value-editor__value__expanded': isExpanded,
          })}
        >
          {isExpanded && (
            <textarea
              className={`tagged-value-editor__value__input ${
                darkTheme ? 'tagged-value-editor-dark-theme' : ''
              }`}
              spellCheck={false}
              disabled={isReadOnly}
              value={taggedValue.value}
              onChange={changeValue}
              placeholder={`Value`}
            />
          )}
          {!isExpanded && (
            <input
              className={`tagged-value-editor__value__input ${
                darkTheme ? 'tagged-value-editor-dark-theme' : ''
              }`}
              spellCheck={false}
              disabled={isReadOnly}
              value={taggedValue.value}
              onChange={changeValue}
              placeholder={`Value`}
            />
          )}
          <button
            className={`tagged-value-editor__value__expand-btn ${
              darkTheme ? 'tagged-value-editor-dark-theme' : ''
            }`}
            onClick={toggleExpandedMode}
            tabIndex={-1}
            title={'Expand/Collapse'}
          >
            {isExpanded ? <LongArrowAltUpIcon /> : <MoreVerticalIcon />}
          </button>
        </div>
      </div>
    );
  },
);
