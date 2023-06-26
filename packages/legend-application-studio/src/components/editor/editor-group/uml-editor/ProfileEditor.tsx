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
} from '../../../../stores/editor/editor-state/element-editor-state/UMLEditorState.js';
import { observer } from 'mobx-react-lite';
import {
  clsx,
  InputWithInlineValidation,
  PlusIcon,
  TimesIcon,
  LockIcon,
  PanelEntryDragHandle,
  DragPreviewLayer,
  useDragPreviewLayer,
  Panel,
  PanelContent,
  PanelDnDEntry,
  PanelContentLists,
} from '@finos/legend-art';
import { LEGEND_STUDIO_TEST_ID } from '../../../../__lib__/LegendStudioTesting.js';
import { useEditorStore } from '../../EditorStoreProvider.js';
import {
  type Profile,
  type Stereotype,
  stub_Tag,
  stub_Stereotype,
  type Tag,
} from '@finos/legend-graph';
import {
  profile_addTag,
  profile_addStereotype,
  profile_deleteTag,
  profile_deleteStereotype,
  tagStereotype_setValue,
  profile_swapTags,
  profile_swapStereotypes,
} from '../../../../stores/graph-modifier/DomainGraphModifierHelper.js';
import { useApplicationNavigationContext } from '@finos/legend-application';
import { LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY } from '../../../../__lib__/LegendStudioApplicationNavigationContext.js';
import { useRef, useCallback } from 'react';
import { useDrop, useDrag } from 'react-dnd';

type TagDragSource = {
  tag: Tag;
};

const TAG_DND_TYPE = 'TAG';

const TagBasicEditor = observer(
  (props: {
    tag: Tag;
    deleteValue: () => void;
    _profile: Profile;
    isReadOnly: boolean;
  }) => {
    const ref = useRef<HTMLDivElement>(null);
    const handleRef = useRef<HTMLDivElement>(null);

    const { tag, _profile, deleteValue, isReadOnly } = props;
    const changeValue: React.ChangeEventHandler<HTMLInputElement> = (event) => {
      tagStereotype_setValue(tag, event.target.value);
    };
    const isTagDuplicated = (val: Tag): boolean =>
      tag._OWNER.p_tags.filter((t) => t.value === val.value).length >= 2;

    // Drag and Drop
    const handleHover = useCallback(
      (item: TagDragSource): void => {
        const draggingTag = item.tag;
        const hoveredTag = tag;
        profile_swapTags(_profile, draggingTag, hoveredTag);
      },
      [_profile, tag],
    );

    const [{ isBeingDraggedTag }, dropConnector] = useDrop<
      TagDragSource,
      void,
      { isBeingDraggedTag: Tag | undefined }
    >(
      () => ({
        accept: [TAG_DND_TYPE],
        hover: (item) => handleHover(item),
        collect: (monitor) => ({
          isBeingDraggedTag: monitor.getItem<TagDragSource | null>()?.tag,
        }),
      }),
      [handleHover],
    );
    const isBeingDragged = tag === isBeingDraggedTag;

    const [, dragConnector, dragPreviewConnector] = useDrag<TagDragSource>(
      () => ({
        type: TAG_DND_TYPE,
        item: () => ({
          tag: tag,
        }),
      }),
      [tag],
    );
    dragConnector(handleRef);
    dropConnector(ref);
    useDragPreviewLayer(dragPreviewConnector);

    return (
      <PanelDnDEntry
        ref={ref}
        className="tag-basic-editor__container"
        placeholder={<div className="dnd__placeholder--light"></div>}
        showPlaceholder={isBeingDragged}
      >
        <PanelEntryDragHandle
          dragSourceConnector={handleRef}
          isDragging={isBeingDragged}
        />
        <div className="tag-basic-editor">
          <InputWithInlineValidation
            className="tag-basic-editor__value input-group__input"
            spellCheck={false}
            disabled={isReadOnly}
            value={tag.value}
            onChange={changeValue}
            placeholder="Tag value"
            error={isTagDuplicated(tag) ? 'Duplicated tag' : undefined}
          />
          {!isReadOnly && (
            <button
              className="uml-element-editor__remove-btn"
              disabled={isReadOnly}
              onClick={deleteValue}
              tabIndex={-1}
              title="Remove"
            >
              <TimesIcon />
            </button>
          )}
        </div>
      </PanelDnDEntry>
    );
  },
);

type StereotypeDragSource = {
  stereotype: Stereotype;
};

const STEREOTYPE_DND_TYPE = 'STEREOTYPE';

const StereotypeBasicEditor = observer(
  (props: {
    stereotype: Stereotype;
    deleteStereotype: () => void;
    _profile: Profile;
    isReadOnly: boolean;
  }) => {
    const ref = useRef<HTMLDivElement>(null);
    const handleRef = useRef<HTMLDivElement>(null);

    const { stereotype, _profile, deleteStereotype, isReadOnly } = props;
    const changeValue: React.ChangeEventHandler<HTMLInputElement> = (event) => {
      tagStereotype_setValue(stereotype, event.target.value);
    };
    const isStereotypeDuplicated = (val: Stereotype): boolean =>
      stereotype._OWNER.p_stereotypes.filter((s) => s.value === val.value)
        .length >= 2;

    // Drag and Drop
    const handleHover = useCallback(
      (item: StereotypeDragSource): void => {
        const draggingTag = item.stereotype;
        const hoveredTag = stereotype;
        profile_swapStereotypes(_profile, draggingTag, hoveredTag);
      },
      [_profile, stereotype],
    );

    const [{ isBeingDraggedTag }, dropConnector] = useDrop<
      StereotypeDragSource,
      void,
      { isBeingDraggedTag: Tag | undefined }
    >(
      () => ({
        accept: [STEREOTYPE_DND_TYPE],
        hover: (item) => handleHover(item),
        collect: (monitor) => ({
          isBeingDraggedTag: monitor.getItem<StereotypeDragSource | null>()
            ?.stereotype,
        }),
      }),
      [handleHover],
    );
    const isBeingDragged = stereotype === isBeingDraggedTag;

    const [, dragConnector, dragPreviewConnector] =
      useDrag<StereotypeDragSource>(
        () => ({
          type: STEREOTYPE_DND_TYPE,
          item: () => ({
            stereotype: stereotype,
          }),
        }),
        [stereotype],
      );
    dragConnector(handleRef);
    dropConnector(ref);
    useDragPreviewLayer(dragPreviewConnector);

    return (
      <PanelDnDEntry
        ref={ref}
        placeholder={<div className="dnd__placeholder--light"></div>}
        className="stereotype-basic-editor__container"
        showPlaceholder={isBeingDragged}
      >
        <PanelEntryDragHandle
          dragSourceConnector={handleRef}
          isDragging={isBeingDragged}
        />
        <div className="stereotype-basic-editor">
          <InputWithInlineValidation
            className="stereotype-basic-editor__value input-group__input"
            spellCheck={false}
            disabled={isReadOnly}
            value={stereotype.value}
            onChange={changeValue}
            placeholder="Stereotype value"
            error={
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
              title="Remove"
            >
              <TimesIcon />
            </button>
          )}
        </div>
      </PanelDnDEntry>
    );
  },
);

export const ProfileEditor = observer((props: { profile: Profile }) => {
  const { profile } = props;
  const editorStore = useEditorStore();
  const editorState =
    editorStore.tabManagerState.getCurrentEditorState(UMLEditorState);
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
        profile_addTag(profile, stub_Tag(profile));
      } else if (selectedTab === UML_EDITOR_TAB.STEREOTYPES) {
        profile_addStereotype(profile, stub_Stereotype(profile));
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

  useApplicationNavigationContext(
    LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY.PROFILE_EDITOR,
  );

  return (
    <div className="uml-element-editor profile-editor">
      <Panel>
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
        <PanelContent>
          {selectedTab === UML_EDITOR_TAB.TAGS && (
            <PanelContentLists>
              <DragPreviewLayer
                labelGetter={(item: TagDragSource): string =>
                  item.tag.value === '' ? '(unknown)' : item.tag.value
                }
                types={[TAG_DND_TYPE]}
              />
              {profile.p_tags.map((tag) => (
                <TagBasicEditor
                  key={tag._UUID}
                  tag={tag}
                  _profile={profile}
                  deleteValue={deleteTag(tag)}
                  isReadOnly={isReadOnly}
                />
              ))}
            </PanelContentLists>
          )}
          {selectedTab === UML_EDITOR_TAB.STEREOTYPES && (
            <PanelContentLists>
              <DragPreviewLayer
                labelGetter={(item: StereotypeDragSource): string =>
                  item.stereotype.value === ''
                    ? '(unknown)'
                    : item.stereotype.value
                }
                types={[STEREOTYPE_DND_TYPE]}
              />
              {profile.p_stereotypes.map((stereotype) => (
                <StereotypeBasicEditor
                  key={stereotype._UUID}
                  _profile={profile}
                  stereotype={stereotype}
                  deleteStereotype={deleteStereotype(stereotype)}
                  isReadOnly={isReadOnly}
                />
              ))}
            </PanelContentLists>
          )}
        </PanelContent>
      </Panel>
    </div>
  );
});
