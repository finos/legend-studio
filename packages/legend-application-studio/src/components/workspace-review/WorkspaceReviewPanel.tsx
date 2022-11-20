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
import { clsx, DropdownMenu, ContextMenu, TimesIcon } from '@finos/legend-art';
import { filterByType } from '@finos/legend-shared';
import {
  EntityDiffViewState,
  DIFF_VIEW_MODE,
} from '../../stores/editor-state/entity-diff-editor-state/EntityDiffViewState.js';
import { EntityDiffView } from '../editor/edit-panel/diff-editor/EntityDiffView.js';
import type { EditorState } from '../../stores/editor-state/EditorState.js';
import { useEditorStore } from '../editor/EditorStoreProvider.js';
import { forwardRef } from 'react';

const WorkspaceReviewPanelSplashScreen: React.FC = () => (
  <div className="workspace-review-panel__splash-screen"></div>
);

const WorkspaceReviewPanelHeaderTabContextMenu = observer(
  forwardRef<
    HTMLDivElement,
    {
      editorState: EditorState;
    }
  >(function ReviewPanelHeaderTabContextMenu(props, ref) {
    const { editorState } = props;
    const editorStore = useEditorStore();
    const close = (): void =>
      editorStore.editorTabManagerState.closeState(editorState);
    const closeOthers = (): void =>
      editorStore.editorTabManagerState.closeAllStates();
    const closeAll = (): void =>
      editorStore.editorTabManagerState.closeAllStates();

    return (
      <div
        ref={ref}
        className="workspace-review-panel__header__tab__context-menu"
      >
        <button
          className="workspace-review-panel__header__tab__context-menu__item"
          onClick={close}
        >
          Close
        </button>
        <button
          className="workspace-review-panel__header__tab__context-menu__item"
          disabled={
            editorStore.editorTabManagerState.openedTabStates.length < 2
          }
          onClick={closeOthers}
        >
          Close Others
        </button>
        <button
          className="workspace-review-panel__header__tab__context-menu__item"
          onClick={closeAll}
        >
          Close All
        </button>
      </div>
    );
  }),
);

export const WorkspaceReviewPanel = observer(() => {
  const editorStore = useEditorStore();
  const currentTabState =
    editorStore.editorTabManagerState.currentTabState instanceof
    EntityDiffViewState
      ? editorStore.editorTabManagerState.currentTabState
      : undefined;
  const openedTabStates =
    editorStore.editorTabManagerState.openedTabStates.filter(
      filterByType(EntityDiffViewState),
    );
  const closeTab =
    (diffState: EditorState): React.MouseEventHandler =>
    (event): void =>
      editorStore.editorTabManagerState.closeState(diffState);
  const closeTabOnMiddleClick =
    (editorState: EditorState): React.MouseEventHandler =>
    (event): void => {
      if (event.nativeEvent.button === 1) {
        editorStore.editorTabManagerState.closeState(editorState);
      }
    };
  const switchTab =
    (editorState: EditorState): (() => void) =>
    (): void =>
      editorStore.editorTabManagerState.openState(editorState);
  const switchViewMode =
    (mode: DIFF_VIEW_MODE): (() => void) =>
    (): void =>
      currentTabState?.setDiffMode(mode);

  if (!currentTabState) {
    return <WorkspaceReviewPanelSplashScreen />;
  }
  return (
    <div className="panel workspace-review-panel">
      <ContextMenu
        className="panel__header workspace-review-panel__header"
        disabled={true}
      >
        <div className="workspace-review-panel__header__tabs">
          {openedTabStates.map((editorState) => (
            <div
              className={clsx('workspace-review-panel__header__tab', {
                'workspace-review-panel__header__tab--active':
                  editorState === currentTabState,
              })}
              key={editorState.uuid}
              onMouseUp={closeTabOnMiddleClick(editorState)}
            >
              <ContextMenu
                className="workspace-review-panel__header__tab__content"
                content={
                  <WorkspaceReviewPanelHeaderTabContextMenu
                    editorState={editorState}
                  />
                }
              >
                <button
                  className="workspace-review-panel__header__tab__element__name"
                  tabIndex={-1}
                  onClick={switchTab(editorState)}
                >
                  {editorState.headerName}
                </button>
                <button
                  className="workspace-review-panel__header__tab__close-btn"
                  onClick={closeTab(editorState)}
                  tabIndex={-1}
                >
                  <TimesIcon />
                </button>
              </ContextMenu>
            </div>
          ))}
        </div>
        <div className="workspace-review-panel__header__actions">
          <DropdownMenu
            className="workspace-review-panel__element-view__type"
            title="View as..."
            content={
              <div className="workspace-review-panel__element-view__options">
                <div
                  className="workspace-review-panel__element-view__option"
                  onClick={switchViewMode(DIFF_VIEW_MODE.GRAMMAR)}
                >
                  {DIFF_VIEW_MODE.GRAMMAR}
                </div>
                <div
                  className="workspace-review-panel__element-view__option"
                  onClick={switchViewMode(DIFF_VIEW_MODE.JSON)}
                >
                  {DIFF_VIEW_MODE.JSON}
                </div>
              </div>
            }
            menuProps={{
              anchorOrigin: { vertical: 'bottom', horizontal: 'right' },
              transformOrigin: { vertical: 'top', horizontal: 'right' },
            }}
          >
            <div className="workspace-review-panel__element-view__type__label">
              {currentTabState.diffMode}
            </div>
          </DropdownMenu>
        </div>
      </ContextMenu>
      <div className="panel__content workspace-review-panel__content">
        <EntityDiffView entityDiffViewState={currentTabState} />
      </div>
    </div>
  );
});
