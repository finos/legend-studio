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

import { useCallback, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import {
  clsx,
  CustomSelectorInput,
  createFilter,
  MoreVerticalIcon,
  TimesIcon,
  ArrowCircleRightIcon,
  LongArrowAltUpIcon,
  PanelEntryDragHandle,
  PanelDnDEntry,
  DragPreviewLayer,
  useDragPreviewLayer,
} from '@finos/legend-art';
import { useEditorStore } from '../../EditorStoreProvider.js';
import {
  type TaggedValue,
  type Tag,
  type Profile,
  isStubbed_PackageableElement,
  type AnnotatedElement,
} from '@finos/legend-graph';
import {
  taggedValue_setValue,
  taggedValue_setTag,
  annotatedElement_swapTaggedValues,
} from '../../../../stores/graph-modifier/DomainGraphModifierHelper.js';
import {
  buildElementOption,
  type PackageableElementOption,
} from '@finos/legend-lego/graph-editor';
import { useDrop, useDrag } from 'react-dnd';

interface TagOption {
  label: string;
  value: Tag;
}

export const TAGGED_VALUE_DND_TYPE = 'TAGGED_VALUE';
export type TaggedValueDragSource = {
  taggedValue: TaggedValue;
};

export const TaggedValueDragPreviewLayer: React.FC = () => (
  <DragPreviewLayer
    labelGetter={(item: TaggedValueDragSource): string =>
      isStubbed_PackageableElement(item.taggedValue.tag.ownerReference.value)
        ? '(unknown)'
        : `${item.taggedValue.tag.ownerReference.value.name}.${item.taggedValue.tag.value.value}`
    }
    types={[TAGGED_VALUE_DND_TYPE]}
  />
);

export const TaggedValueEditor = observer(
  (props: {
    annotatedElement: AnnotatedElement;
    taggedValue: TaggedValue;
    deleteValue: () => void;
    isReadOnly: boolean;
    darkTheme?: boolean;
  }) => {
    const ref = useRef<HTMLDivElement>(null);
    const handleRef = useRef<HTMLDivElement>(null);

    const {
      annotatedElement,
      taggedValue,
      deleteValue,
      isReadOnly,
      darkTheme,
    } = props;
    const editorStore = useEditorStore();
    // Name
    const changeValue: React.ChangeEventHandler<
      HTMLTextAreaElement | HTMLInputElement
    > = (event) => taggedValue_setValue(taggedValue, event.target.value);
    // Profile
    const profileOptions = editorStore.graphManagerState.usableProfiles
      .map(buildElementOption)
      .filter((p) => p.value.p_tags.length);
    const profileFilterOption = createFilter({
      ignoreCase: true,
      ignoreAccents: false,
      stringify: (option: {
        data: PackageableElementOption<Profile>;
      }): string => option.data.value.path,
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
      editorStore.graphEditorMode.openElement(selectedProfile.value);
    // Tag
    const tagOptions = selectedProfile.value.p_tags.map((tag) => ({
      label: tag.value,
      value: tag,
    }));
    const inferableTag = taggedValue.tag;
    const tagFilterOption = createFilter({
      ignoreCase: true,
      ignoreAccents: false,
      stringify: (option: { data: TagOption }): string => option.data.label,
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

    // Drag and Drop
    const handleHover = useCallback(
      (item: TaggedValueDragSource) => {
        const draggingProperty = item.taggedValue;
        const hoveredProperty = taggedValue;
        annotatedElement_swapTaggedValues(
          annotatedElement,
          draggingProperty,
          hoveredProperty,
        );
      },
      [annotatedElement, taggedValue],
    );

    const [{ isBeingDraggedTaggedValue }, dropConnector] = useDrop<
      TaggedValueDragSource,
      void,
      { isBeingDraggedTaggedValue: TaggedValue | undefined }
    >(
      () => ({
        accept: [TAGGED_VALUE_DND_TYPE],
        hover: (item) => handleHover(item),
        collect: (monitor) => ({
          isBeingDraggedTaggedValue:
            monitor.getItem<TaggedValueDragSource | null>()?.taggedValue,
        }),
      }),
      [handleHover],
    );
    const isBeingDragged = taggedValue === isBeingDraggedTaggedValue;

    const [, dragConnector, dragPreviewConnector] =
      useDrag<TaggedValueDragSource>(
        () => ({
          type: TAGGED_VALUE_DND_TYPE,
          item: () => ({
            taggedValue: taggedValue,
          }),
        }),
        [taggedValue],
      );
    dragConnector(handleRef);
    dropConnector(ref);
    useDragPreviewLayer(dragPreviewConnector);

    return (
      <PanelDnDEntry
        ref={ref}
        className="tagged-value-editor__container"
        showPlaceholder={isBeingDragged}
        placeholder={<div className="dnd__placeholder--light"></div>}
      >
        <PanelEntryDragHandle
          dragSourceConnector={handleRef}
          isDragging={isBeingDragged}
        />
        <div
          className={clsx('tagged-value-editor', {
            'tagged-value-editor--dark': darkTheme,
          })}
        >
          <div className="tagged-value-editor__profile">
            <CustomSelectorInput
              className="tagged-value-editor__profile__selector"
              disabled={isReadOnly}
              options={profileOptions}
              onChange={changeProfile}
              value={selectedProfile}
              placeholder="Choose a profile"
              filterOption={profileFilterOption}
              darkMode={Boolean(darkTheme)}
            />
            <button
              className="tagged-value-editor__profile__visit-btn"
              disabled={isStubbed_PackageableElement(
                taggedValue.tag.value._OWNER,
              )}
              onClick={visitProfile}
              tabIndex={-1}
              title="Visit profile"
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
            placeholder="Choose a tag"
            filterOption={tagFilterOption}
            darkMode={Boolean(darkTheme)}
          />
          {!isReadOnly && (
            <button
              className={clsx('uml-element-editor__remove-btn', {
                'btn--dark btn--caution': darkTheme,
              })}
              disabled={isReadOnly}
              onClick={deleteValue}
              tabIndex={-1}
              title="Remove"
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
                className={clsx('tagged-value-editor__value__input', {
                  'input--dark': darkTheme,
                })}
                spellCheck={false}
                disabled={isReadOnly}
                value={taggedValue.value}
                onChange={changeValue}
                placeholder="Value"
              />
            )}
            {!isExpanded && (
              <input
                className={clsx('tagged-value-editor__value__input', {
                  'input--dark': darkTheme,
                })}
                spellCheck={false}
                disabled={isReadOnly}
                value={taggedValue.value}
                onChange={changeValue}
                placeholder="Value"
              />
            )}
            <button
              className="tagged-value-editor__value__expand-btn"
              onClick={toggleExpandedMode}
              tabIndex={-1}
              title="Expand/Collapse"
            >
              {isExpanded ? <LongArrowAltUpIcon /> : <MoreVerticalIcon />}
            </button>
          </div>
        </div>
      </PanelDnDEntry>
    );
  },
);
