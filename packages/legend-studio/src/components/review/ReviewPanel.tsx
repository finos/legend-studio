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

import { FaTimes } from 'react-icons/fa';
import { observer } from 'mobx-react-lite';
import {
  clsx,
  DropdownMenu,
  ContextMenu,
} from '@finos/legend-studio-components';
import {
  EntityDiffViewState,
  DIFF_VIEW_MODE,
} from '../../stores/editor-state/entity-diff-editor-state/EntityDiffViewState';
import { EntityDiffView } from '../editor/edit-panel/diff-editor/EntityDiffView';
import { useEditorStore } from '../../stores/EditorStore';
import type { EditorState } from '../../stores/editor-state/EditorState';

export const ReviewPanelSplashScreen: React.FC = () => (
  <div className="review-panel__splash-screen"></div>
);

export const ReviewPanelHeaderTabContextMenu = observer(
  (
    props: {
      editorState: EditorState;
    },
    ref: React.Ref<HTMLDivElement>,
  ) => {
    const { editorState } = props;
    const editorStore = useEditorStore();
    const close = (): void => editorStore.closeState(editorState);
    const closeOthers = (): void =>
      editorStore.closeAllOtherStates(editorState);
    const closeAll = (): void => editorStore.closeAllStates();

    return (
      <div ref={ref} className="review-panel__header__tab__context-menu">
        <button
          className="review-panel__header__tab__context-menu__item"
          onClick={close}
        >
          Close
        </button>
        <button
          className="review-panel__header__tab__context-menu__item"
          disabled={editorStore.openedEditorStates.length < 2}
          onClick={closeOthers}
        >
          Close Others
        </button>
        <button
          className="review-panel__header__tab__context-menu__item"
          onClick={closeAll}
        >
          Close All
        </button>
      </div>
    );
  },
  { forwardRef: true },
);

export const ReviewPanel = observer(() => {
  const editorStore = useEditorStore();
  const currentEditorState =
    editorStore.currentEditorState instanceof EntityDiffViewState
      ? editorStore.currentEditorState
      : undefined;
  const openedEditorStates = editorStore.openedEditorStates.filter(
    (editorState): editorState is EntityDiffViewState =>
      editorState instanceof EntityDiffViewState,
  );
  const closeTab =
    (diffState: EditorState): React.MouseEventHandler =>
    (event): void =>
      editorStore.closeState(diffState);
  const closeTabOnMiddleClick =
    (editorState: EditorState): React.MouseEventHandler =>
    (event): void => {
      if (event.nativeEvent.button === 1) {
        editorStore.closeState(editorState);
      }
    };
  const switchTab =
    (editorState: EditorState): (() => void) =>
    (): void =>
      editorStore.openState(editorState);
  const switchViewMode =
    (mode: DIFF_VIEW_MODE): (() => void) =>
    (): void =>
      currentEditorState?.setDiffMode(mode);

  if (!currentEditorState) {
    return <ReviewPanelSplashScreen />;
  }
  return (
    <div className="panel review-panel">
      <ContextMenu
        className="panel__header review-panel__header"
        disabled={true}
      >
        <div className="review-panel__header__tabs">
          {openedEditorStates.map((editorState) => (
            <div
              className={clsx('review-panel__header__tab', {
                'review-panel__header__tab--active':
                  editorState === currentEditorState,
              })}
              key={editorState.uuid}
              onMouseUp={closeTabOnMiddleClick(editorState)}
            >
              <ContextMenu
                className="review-panel__header__tab__content"
                content={
                  <ReviewPanelHeaderTabContextMenu editorState={editorState} />
                }
              >
                <button
                  className="review-panel__header__tab__element__name"
                  tabIndex={-1}
                  onClick={switchTab(editorState)}
                >
                  {editorState.headerName}
                </button>
                <button
                  className="review-panel__header__tab__close-btn"
                  onClick={closeTab(editorState)}
                  tabIndex={-1}
                >
                  <FaTimes />
                </button>
              </ContextMenu>
            </div>
          ))}
        </div>
        <div className="review-panel__header__actions">
          <DropdownMenu
            className="review-panel__element-view"
            content={
              <div className="review-panel__element-view__options">
                <div
                  className="review-panel__element-view__option"
                  onClick={switchViewMode(DIFF_VIEW_MODE.GRAMMAR)}
                >
                  {DIFF_VIEW_MODE.GRAMMAR}
                </div>
                <div
                  className="review-panel__element-view__option"
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
            <button
              className="review-panel__element-view__type"
              title="View as..."
            >
              <div className="review-panel__element-view__type__label">
                {currentEditorState.diffMode}
              </div>
            </button>
          </DropdownMenu>
        </div>
      </ContextMenu>
      <div className="panel__content review-panel__content">
        <EntityDiffView />
      </div>
    </div>
  );
});
