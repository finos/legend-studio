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
} from '../../../../stores/editor-state/element-editor-state/UMLEditorState.js';
import { observer } from 'mobx-react-lite';
import {
  clsx,
  InputWithInlineValidation,
  PlusIcon,
  TimesIcon,
  LockIcon,
  VerticalDragHandleIcon,
} from '@finos/legend-art';
import { LEGEND_STUDIO_TEST_ID } from '../../../LegendStudioTestID.js';
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
} from '../../../../stores/graphModifier/DomainGraphModifierHelper.js';
import { useApplicationNavigationContext } from '@finos/legend-application';
import { LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY } from '../../../../stores/LegendStudioApplicationNavigationContext.js';
import { useRef, useCallback, useEffect } from 'react';
import { type DropTargetMonitor, useDrop, useDrag } from 'react-dnd';
import { getEmptyImage } from 'react-dnd-html5-backend';

type TagDragSource = {
  tag: Tag;
};

enum TAG_DND_TYPE {
  TAG = 'TAG',
}

const TagBasicEditor = observer(
  (props: {
    tag: Tag;
    deleteValue: () => void;
    _profile: Profile;
    isReadOnly: boolean;
  }) => {
    const ref = useRef<HTMLDivElement>(null);
    const { tag, _profile, deleteValue, isReadOnly } = props;
    const changeValue: React.ChangeEventHandler<HTMLInputElement> = (event) => {
      tagStereotype_setValue(tag, event.target.value);
    };
    const isTagDuplicated = (val: Tag): boolean =>
      tag._OWNER.p_tags.filter((t) => t.value === val.value).length >= 2;

    // Drag and Drop
    const handleHover = useCallback(
      (item: TagDragSource, monitor: DropTargetMonitor): void => {
        const draggingTag = item.tag;
        const hoveredTag = tag;
        profile_swapTags(_profile, draggingTag, hoveredTag);
      },
      [_profile, tag],
    );

    const [{ isBeingDraggedTag }, dropConnector] = useDrop(
      () => ({
        accept: [TAG_DND_TYPE.TAG],
        hover: (item: TagDragSource, monitor: DropTargetMonitor): void =>
          handleHover(item, monitor),
        collect: (monitor): { isBeingDraggedTag: Tag | undefined } => ({
          isBeingDraggedTag: monitor.getItem<TagDragSource | null>()?.tag,
        }),
      }),
      [handleHover],
    );
    const isBeingDragged = tag === isBeingDraggedTag;

    const [, dragConnector, dragPreviewConnector] = useDrag(
      () => ({
        type: TAG_DND_TYPE.TAG,
        item: (): TagDragSource => ({
          tag: tag,
        }),
      }),
      [tag],
    );
    dragConnector(dropConnector(ref));

    // hide default HTML5 preview image
    useEffect(() => {
      dragPreviewConnector(getEmptyImage(), { captureDraggingState: true });
    }, [dragPreviewConnector]);

    return (
      <div ref={ref}>
        {isBeingDragged && (
          <div className="uml-element-editor__dnd__container">
            <div className="uml-element-editor__dnd ">
              <div className="uml-element-editor__dnd__name">{tag.value}</div>
            </div>
          </div>
        )}

        {!isBeingDragged && (
          <div className="tag-basic-editor">
            <div className="uml-element-editor__drag-handler">
              <VerticalDragHandleIcon />
            </div>
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
        )}
      </div>
    );
  },
);

type StereotypeDragSource = {
  stereotype: Stereotype;
};

enum STEREOTYPE_DND_TYPE {
  STEREOTYPE = 'STEREOTYPE',
}

const StereotypeBasicEditor = observer(
  (props: {
    stereotype: Stereotype;
    deleteStereotype: () => void;
    _profile: Profile;
    isReadOnly: boolean;
  }) => {
    const ref = useRef<HTMLDivElement>(null);
    const { stereotype, _profile, deleteStereotype, isReadOnly } = props;
    const changeValue: React.ChangeEventHandler<HTMLInputElement> = (event) => {
      tagStereotype_setValue(stereotype, event.target.value);
    };
    const isStereotypeDuplicated = (val: Stereotype): boolean =>
      stereotype._OWNER.p_stereotypes.filter((s) => s.value === val.value)
        .length >= 2;

    // Drag and Drop
    const handleHover = useCallback(
      (item: StereotypeDragSource, monitor: DropTargetMonitor): void => {
        const draggingTag = item.stereotype;
        const hoveredTag = stereotype;
        profile_swapStereotypes(_profile, draggingTag, hoveredTag);
      },
      [_profile, stereotype],
    );

    const [{ isBeingDraggedTag }, dropConnector] = useDrop(
      () => ({
        accept: [STEREOTYPE_DND_TYPE.STEREOTYPE],
        hover: (item: StereotypeDragSource, monitor: DropTargetMonitor): void =>
          handleHover(item, monitor),
        collect: (monitor): { isBeingDraggedTag: Tag | undefined } => ({
          isBeingDraggedTag: monitor.getItem<StereotypeDragSource | null>()
            ?.stereotype,
        }),
      }),
      [handleHover],
    );
    const isBeingDragged = stereotype === isBeingDraggedTag;

    const [, dragConnector, dragPreviewConnector] = useDrag(
      () => ({
        type: STEREOTYPE_DND_TYPE.STEREOTYPE,
        item: (): StereotypeDragSource => ({
          stereotype: stereotype,
        }),
      }),
      [stereotype],
    );
    dragConnector(dropConnector(ref));

    // hide default HTML5 preview image
    useEffect(() => {
      dragPreviewConnector(getEmptyImage(), { captureDraggingState: true });
    }, [dragPreviewConnector]);

    return (
      <div ref={ref}>
        {isBeingDragged && (
          <div className="uml-element-editor__dnd__container">
            <div className="uml-element-editor__dnd ">
              <div className="uml-element-editor__dnd__name">
                {stereotype.value}
              </div>
            </div>
          </div>
        )}

        {!isBeingDragged && (
          <div className="stereotype-basic-editor">
            <div className="uml-element-editor__drag-handler">
              <VerticalDragHandleIcon />
            </div>
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
              {profile.p_tags.map((tag) => (
                <TagBasicEditor
                  key={tag._UUID}
                  tag={tag}
                  _profile={profile}
                  deleteValue={deleteTag(tag)}
                  isReadOnly={isReadOnly}
                />
              ))}
            </div>
          )}
          {selectedTab === UML_EDITOR_TAB.STEREOTYPES && (
            <div className="panel__content__lists">
              {profile.p_stereotypes.map((stereotype) => (
                <StereotypeBasicEditor
                  key={stereotype._UUID}
                  _profile={profile}
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
