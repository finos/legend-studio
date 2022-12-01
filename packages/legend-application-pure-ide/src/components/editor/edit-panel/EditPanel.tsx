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

import { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import {
  type EditorState,
  FileEditorState,
} from '../../../stores/EditorState.js';
import { FileEditor } from './FileEditor.js';
import {
  clsx,
  ContextMenu,
  DropdownMenu,
  PlusIcon,
  TimesIcon,
  useResizeDetector,
} from '@finos/legend-art';
import { DiagramEditorState } from '../../../stores/DiagramEditorState.js';
import { DiagramEditor } from './DiagramEditor.js';
import { useEditorStore } from '../EditorStoreProvider.js';

export const EditPanelSplashScreen: React.FC = () => {
  const commandListWidth = 300;
  const commandListHeight = 150;
  const [showCommandList, setShowCommandList] = useState(false);
  const { ref, width, height } = useResizeDetector<HTMLDivElement>();

  useEffect(() => {
    setShowCommandList(
      (width ?? 0) > commandListWidth && (height ?? 0) > commandListHeight,
    );
  }, [width, height]);

  return (
    <div ref={ref} className="edit-panel__splash-screen">
      <div
        className={clsx('edit-panel__splash-screen__content', {
          'edit-panel__splash-screen__content--hidden': !showCommandList,
        })}
      >
        <div className="edit-panel__splash-screen__content__item">
          <div className="edit-panel__splash-screen__content__item__label">
            Execute the &apos;go&apos; function
          </div>
          <div className="edit-panel__splash-screen__content__item__hot-keys">
            <div className="hotkey__key">F9</div>
          </div>
        </div>
        <div className="edit-panel__splash-screen__content__item">
          <div className="edit-panel__splash-screen__content__item__label">
            Run the full test suite
          </div>
          <div className="edit-panel__splash-screen__content__item__hot-keys">
            <div className="hotkey__key">F10</div>
          </div>
        </div>
        <div className="edit-panel__splash-screen__content__item">
          <div className="edit-panel__splash-screen__content__item__label">
            Search for a file
          </div>
          <div className="edit-panel__splash-screen__content__item__hot-keys">
            <div className="hotkey__key">Ctrl</div>
            <div className="hotkey__plus">
              <PlusIcon />
            </div>
            <div className="hotkey__key">P</div>
          </div>
        </div>
      </div>
    </div>
  );
};

// const EditPanelHeaderTabContextMenu = observer(
//   (
//     props: {
//       editorState: EditorState;
//     },
//     ref: React.Ref<HTMLDivElement>,
//   ) => {
//     const { editorState } = props;
//     const editorStore = useEditorStore();
//     const close = (): void => editorStore.closeState(editorState);
//     const closeOthers = (): void =>
//       editorStore.closeAllOtherStates(editorState);
//     const closeAll = (): void => editorStore.closeAllStates();

//     return (
//       <div ref={ref} className="edit-panel__header__tab__context-menu">
//         <button
//           className="edit-panel__header__tab__context-menu__item"
//           onClick={close}
//         >
//           Close
//         </button>
//         <button
//           className="edit-panel__header__tab__context-menu__item"
//           disabled={editorStore.openedEditorStates.length < 2}
//           onClick={closeOthers}
//         >
//           Close Others
//         </button>
//         <button
//           className="edit-panel__header__tab__context-menu__item"
//           onClick={closeAll}
//         >
//           Close All
//         </button>
//       </div>
//     );
//   },
//   { forwardRef: true },
// );

export const EditPanel = observer(() => {
  const editorStore = useEditorStore();
  const currentEditorState = editorStore.currentEditorState;
  const openedEditorStates = editorStore.openedEditorStates;
  const renderActiveEditorState = (): React.ReactNode => {
    if (currentEditorState instanceof FileEditorState) {
      return <FileEditor editorState={currentEditorState} />;
    } else if (currentEditorState instanceof DiagramEditorState) {
      return <DiagramEditor editorState={currentEditorState} />;
    }
    return null;
  };
  // actions
  const closeTab =
    (editorState: EditorState): React.MouseEventHandler =>
    (event): void => {
      event.stopPropagation();
      editorStore.closeState(editorState);
    };
  const closeTabOnMiddleClick =
    (editorState: EditorState): React.MouseEventHandler =>
    (event): void => {
      if (event.nativeEvent.which === 2) {
        event.stopPropagation();
        editorStore.closeState(editorState);
      }
    };
  const openTab =
    (editorState: EditorState): (() => void) =>
    (): void =>
      editorStore.openState(editorState);
  const showOpenTabMenu = (): void => editorStore.setShowOpenedTabsMenu(true);
  const hideOpenTabMenu = (): void => editorStore.setShowOpenedTabsMenu(false);

  if (!currentEditorState) {
    return <EditPanelSplashScreen />;
  }
  return (
    <div className="panel edit-panel">
      <div className="panel__header edit-panel__header">
        <div className="edit-panel__header__tabs">
          {openedEditorStates.map((editorState) => (
            <div
              key={editorState.uuid}
              className={clsx('edit-panel__header__tab', {
                'edit-panel__header__tab--active':
                  editorState === currentEditorState,
              })}
              onClick={openTab(editorState)}
              onMouseUp={closeTabOnMiddleClick(editorState)}
            >
              <ContextMenu
                content={
                  <div></div>
                  // <EditPanelHeaderTabContextMenu editorState={editorState} />
                }
                className="edit-panel__header__tab__content"
              >
                <button
                  className="edit-panel__header__tab__label"
                  tabIndex={-1}
                  title={editorState.headerName}
                >
                  {editorState.headerName}
                </button>
                <button
                  className="edit-panel__header__tab__close-btn"
                  onClick={closeTab(editorState)}
                  tabIndex={-1}
                  title="Close"
                >
                  <TimesIcon />
                </button>
              </ContextMenu>
            </div>
          ))}
        </div>
        <div className="panel__header__actions">
          <DropdownMenu
            className="panel__header__action edit-panel__header__action edit-panel__header__action--go-to-tab"
            title="Go to Tab... (Ctrl + Alt + Tab)"
            disabled={!openedEditorStates.length}
            open={editorStore.showOpenedTabsMenu}
            onOpen={showOpenTabMenu}
            onClose={hideOpenTabMenu}
            content={
              <div className="menu">
                {openedEditorStates.map((editorState) => (
                  <div
                    key={editorState.uuid}
                    className={clsx('menu__item', {
                      'menu__item--selected':
                        editorState === currentEditorState,
                    })}
                    onClick={openTab(editorState)}
                  >
                    {editorState.headerName}
                  </div>
                ))}
              </div>
            }
            menuProps={{
              anchorOrigin: { vertical: 'bottom', horizontal: 'right' },
              transformOrigin: { vertical: 'top', horizontal: 'right' },
            }}
          >
            {/* <CgTab /> */}
          </DropdownMenu>
        </div>
      </div>
      <div
        // NOTE: This is one small but extremely important line. Using `key` we effectivly force-remounting the element editor
        // component every time current element editor state is changed. This is great to control errors that has to do with stale states
        // when we `reprocess` world or when we switch tabs between 2 elements of the same type (i.e. 2 classes, 2 mappings, etc.)
        // See https://github.com/bvaughn/react-error-boundary/issues/23#issuecomment-425470511
        key={currentEditorState.uuid}
        className="panel__content edit-panel__content"
      >
        {renderActiveEditorState()}
      </div>
    </div>
  );
});
