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
import { useEditorStore } from '../../../../stores/EditorStore';
import { MdMoreVert } from 'react-icons/md';
import {
  FaTimes,
  FaArrowAltCircleRight,
  FaLongArrowAltUp,
} from 'react-icons/fa';
import {
  clsx,
  CustomSelectorInput,
  createFilter,
} from '@finos/legend-application-components';
import type { PackageableElementSelectOption } from '../../../../models/metamodels/pure/model/packageableElements/PackageableElement';
import type { Profile } from '../../../../models/metamodels/pure/model/packageableElements/domain/Profile';
import type { TaggedValue } from '../../../../models/metamodels/pure/model/packageableElements/domain/TaggedValue';
import type { Tag } from '../../../../models/metamodels/pure/model/packageableElements/domain/Tag';

interface TagOption {
  label: string;
  value: Tag;
}

export const TaggedValueEditor = observer(
  (props: {
    taggedValue: TaggedValue;
    deleteValue: () => void;
    isReadOnly: boolean;
  }) => {
    const { taggedValue, deleteValue, isReadOnly } = props;
    const editorStore = useEditorStore();
    // Name
    const changeValue: React.ChangeEventHandler<
      HTMLTextAreaElement | HTMLInputElement
    > = (event) => taggedValue.setValue(event.target.value);
    // Profile
    const profileOptions = editorStore.profileOptions.filter(
      (p) => p.value.tags.length,
    );
    const profileFilterOption = createFilter({
      ignoreCase: true,
      ignoreAccents: false,
      stringify: (option: PackageableElementSelectOption<Profile>): string =>
        option.value.path,
    });
    const [selectedProfile, setSelectedProfile] = useState<
      PackageableElementSelectOption<Profile>
    >({
      value: taggedValue.tag.value.owner,
      label: taggedValue.tag.value.owner.name,
    });
    const changeProfile = (
      val: PackageableElementSelectOption<Profile>,
    ): void => {
      if (val.value.tags.length) {
        setSelectedProfile(val);
        taggedValue.setTag(val.value.tags[0]);
      }
    };
    const visitProfile = (): void =>
      editorStore.openElement(selectedProfile.value);
    // Tag
    const tagOptions = selectedProfile.value.tags.map((tag) => ({
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
    const changeTag = (val: TagOption): void => taggedValue.setTag(val.value);
    // Value
    const [isExpanded, setIsExpanded] = useState(false);
    const toggleExpandedMode = (): void => setIsExpanded(!isExpanded);

    return (
      <div className="tagged-value-editor">
        <div className="tagged-value-editor__profile">
          <CustomSelectorInput
            className="tagged-value-editor__profile__selector"
            disabled={isReadOnly}
            options={profileOptions}
            onChange={changeProfile}
            value={selectedProfile}
            placeholder={'Choose a profile'}
            filterOption={profileFilterOption}
          />
          <button
            className="tagged-value-editor__profile__visit-btn"
            disabled={taggedValue.tag.value.owner.isStub}
            onClick={visitProfile}
            tabIndex={-1}
            title={'Visit profile'}
          >
            <FaArrowAltCircleRight />
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
        <div
          className={clsx('tagged-value-editor__value', {
            'tagged-value-editor__value__expanded': isExpanded,
          })}
        >
          {isExpanded && (
            <textarea
              className="tagged-value-editor__value__input"
              spellCheck={false}
              disabled={isReadOnly}
              value={taggedValue.value}
              onChange={changeValue}
              placeholder={`Value`}
            />
          )}
          {!isExpanded && (
            <input
              className="tagged-value-editor__value__input"
              spellCheck={false}
              disabled={isReadOnly}
              value={taggedValue.value}
              onChange={changeValue}
              placeholder={`Value`}
            />
          )}
          <button
            className="tagged-value-editor__value__expand-btn"
            onClick={toggleExpandedMode}
            tabIndex={-1}
            title={'Expand/Collapse'}
          >
            {isExpanded ? <FaLongArrowAltUp /> : <MdMoreVert />}
          </button>
        </div>
      </div>
    );
  },
);
