/**
 * Copyright (c) 2025-present, Goldman Sachs
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

import { useEffect, useState, useMemo } from 'react';
import { observer } from 'mobx-react-lite';
import { FileEditorState } from '../../stores/FileEditorState.js';
import { GenericFileEditor } from './GenericFileEditor.js';
import { PureFileEditor } from './PureFileEditor.js';
import {
  clsx,
  FileAltIcon,
  LockIcon,
  PlusIcon,
  ArrowsSplitIcon,
  TimesIcon,
  CompressIcon,
  useResizeDetector,
  ContextMenu,
  MenuContent,
  MenuContentItem,
  MenuContentDivider,
} from '@finos/legend-art';
import { DiagramEditorState } from '../../stores/DiagramEditorState.js';
import { DiagramEditor } from './DiagramEditor.js';
import { usePureIDEStore } from '../PureIDEStoreProvider.js';
import { PURE_DiagramIcon } from '../shared/ConceptIconUtils.js';
import { TabManager, type TabState } from '@finos/legend-lego/application';
import { useDrop, type DropTargetMonitor } from 'react-dnd';
import { CODE_EDITOR_LANGUAGE } from '@finos/legend-code-editor';
import {
  EditorSplitLeaf,
  EditorSplitOrientation,
} from '../../stores/EditorSplitGroupState.js';
import type { PureIDETabState } from '../../stores/PureIDETabManagerState.js';

const EditorGroupSplashScreen: React.FC = () => {
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
    <div ref={ref} className="editor-group__splash-screen">
      <div
        className={clsx('editor-group__splash-screen__content', {
          'editor-group__splash-screen__content--hidden': !showCommandList,
        })}
      >
        <div className="editor-group__splash-screen__content__item">
          <div className="editor-group__splash-screen__content__item__label">
            {`Run the go() function`}
          </div>
          <div className="editor-group__splash-screen__content__item__hot-keys">
            <div className="hotkey__key">F9</div>
          </div>
        </div>
        <div className="editor-group__splash-screen__content__item">
          <div className="editor-group__splash-screen__content__item__label">
            Run the full test suite
          </div>
          <div className="editor-group__splash-screen__content__item__hot-keys">
            <div className="hotkey__key">F10</div>
          </div>
        </div>
        <div className="editor-group__splash-screen__content__item">
          <div className="editor-group__splash-screen__content__item__label">
            Search for a file
          </div>
          <div className="editor-group__splash-screen__content__item__hot-keys">
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

interface EditorGroupLeafProps {
  leaf: EditorSplitLeaf;
  isActive: boolean;
  onActivate: () => void;
}

export const EditorGroupLeaf = observer((props: EditorGroupLeafProps) => {
  const { leaf, isActive, onActivate } = props;
  const ideStore = usePureIDEStore();
  const currentTab = leaf.tabManagerState.currentTab;

  // Hooks must be called unconditionally in the same order
  // Prepare DnD drop connector for the empty-leaf case even if not used
  const dndType = leaf.tabManagerState.dndType;
  const [, dropConnector] = useDrop<{ tab: TabState }, void, unknown>(
    () => ({
      accept: [dndType],
      drop: (item: { tab: TabState }) => {
        const tab = item.tab as PureIDETabState;
        ideStore.editorSplitState.moveTabAtIndex(tab, leaf, 0);
      },
    }),
    [dndType, ideStore, leaf],
  );

  const renderActiveEditorState = (): React.ReactNode => {
    if (currentTab instanceof FileEditorState) {
      if (currentTab.textEditorState.language === CODE_EDITOR_LANGUAGE.PURE) {
        return <PureFileEditor editorState={currentTab} leafId={leaf.id} />;
      }
      return <GenericFileEditor editorState={currentTab} leafId={leaf.id} />;
    } else if (currentTab instanceof DiagramEditorState) {
      return <DiagramEditor diagramEditorState={currentTab} />;
    }
    return null;
  };

  const renderTab = (editorState: TabState): React.ReactNode | undefined => {
    if (editorState instanceof FileEditorState) {
      const showMoreInfo =
        leaf.tabManagerState.tabs.filter(
          (tab) =>
            tab instanceof FileEditorState &&
            tab.fileName === editorState.fileName,
        ).length > 1;
      return (
        <div className="editor-group__header__tab">
          <div className="editor-group__header__tab__icon">
            <FileAltIcon className="editor-group__header__tab__icon--file" />
          </div>
          <div className="editor-group__header__tab__label">
            {editorState.fileName}
          </div>
          {showMoreInfo && (
            <div className="editor-group__header__tab__path">
              {editorState.filePath}
            </div>
          )}
          {editorState.file.RO && (
            <div className="editor-group__header__tab__icon">
              <LockIcon className="editor-group__header__tab__icon--readonly" />
            </div>
          )}
        </div>
      );
    } else if (editorState instanceof DiagramEditorState) {
      const showMoreInfo =
        leaf.tabManagerState.tabs.filter(
          (tab) =>
            tab instanceof DiagramEditorState &&
            tab.diagramName === editorState.diagramName,
        ).length > 1;
      return (
        <div className="editor-group__header__tab">
          <div className="editor-group__header__tab__icon">
            <PURE_DiagramIcon />
          </div>
          <div className="editor-group__header__tab__label">
            {editorState.diagramName}
          </div>
          {showMoreInfo && (
            <div className="editor-group__header__tab__path">
              {editorState.diagramPath}
            </div>
          )}
        </div>
      );
    }
    return editorState.label;
  };

  const handleSplitRight = (): void => {
    ideStore.editorSplitState.splitLeaf(leaf, EditorSplitOrientation.VERTICAL);
  };

  const handleSplitDown = (): void => {
    ideStore.editorSplitState.splitLeaf(
      leaf,
      EditorSplitOrientation.HORIZONTAL,
    );
  };

  const handleRemoveSplit = (): void => {
    ideStore.editorSplitState.removeSplit(leaf);
  };

  const handleUnsplitAll = (): void => {
    ideStore.editorSplitState.unsplitAll();
  };

  const handleCloseAllInLeaf = (): void => {
    ideStore.editorSplitState.closeAllTabsInLeaf(leaf);
  };

  const handleClick = (): void => {
    onActivate();
  };

  if (!currentTab) {
    // Enable dropping tabs onto an empty leaf
    return (
      <div
        ref={(el) => {
          dropConnector(el as any);
        }}
        className={clsx('panel editor-group', {
          'editor-group--active': isActive,
        })}
        onClick={handleClick}
      >
        <EditorGroupSplashScreen />
      </div>
    );
  }

  return (
    <div
      className={clsx('panel editor-group', {
        'editor-group--active': isActive,
      })}
      onClick={handleClick}
    >
      <div className="panel__header editor-group__header">
        <div className="editor-group__header__tabs">
          <TabManager
            tabManagerState={leaf.tabManagerState}
            tabRenderer={renderTab}
            onExternalTabDrop={(tab, index) =>
              ideStore.editorSplitState.moveTabAtIndex(
                tab as PureIDETabState,
                leaf,
                index ?? leaf.tabManagerState.tabs.length,
              )
            }
            canAcceptExternalTab={() => true}
            renderExtraTabMenuItems={(tabState) => {
              const otherLeaves = ideStore.editorSplitState.leaves.filter(
                (l) => l !== leaf,
              );
              return (
                <>
                  <MenuContentItem onClick={handleSplitRight}>
                    <div className="editor-group__context-menu__item">
                      <div className="editor-group__context-menu__item__icon">
                        <ArrowsSplitIcon />
                      </div>
                      <div className="editor-group__context-menu__item__label">
                        Split Right
                      </div>
                    </div>
                  </MenuContentItem>
                  <MenuContentItem onClick={handleSplitDown}>
                    <div className="editor-group__context-menu__item">
                      <div className="editor-group__context-menu__item__icon">
                        <ArrowsSplitIcon className="editor-group__context-menu__item__icon--rotated" />
                      </div>
                      <div className="editor-group__context-menu__item__label">
                        Split Down
                      </div>
                    </div>
                  </MenuContentItem>
                  {ideStore.editorSplitState.canRemoveSplit(leaf) && (
                    <MenuContentItem onClick={handleRemoveSplit}>
                      <div className="editor-group__context-menu__item">
                        <div className="editor-group__context-menu__item__icon">
                          <TimesIcon />
                        </div>
                        <div className="editor-group__context-menu__item__label">
                          Remove Split
                        </div>
                      </div>
                    </MenuContentItem>
                  )}
                  {ideStore.editorSplitState.hasSplits() && (
                    <MenuContentItem onClick={handleUnsplitAll}>
                      <div className="editor-group__context-menu__item">
                        <div className="editor-group__context-menu__item__icon">
                          <CompressIcon />
                        </div>
                        <div className="editor-group__context-menu__item__label">
                          Unsplit All
                        </div>
                      </div>
                    </MenuContentItem>
                  )}
                  {otherLeaves.length > 0 && <MenuContentDivider />}
                  {otherLeaves.map((target, idx) => (
                    <MenuContentItem
                      key={target.id}
                      onClick={() =>
                        ideStore.editorSplitState.moveTabAtIndex(
                          tabState as PureIDETabState,
                          target,
                          target.tabManagerState.tabs.length,
                        )
                      }
                    >
                      <div className="editor-group__context-menu__item">
                        <div className="editor-group__context-menu__item__label">
                          {`Move to Split ${idx + 1}`}
                        </div>
                      </div>
                    </MenuContentItem>
                  ))}
                </>
              );
            }}
          />
        </div>
        <div className="panel__header__actions">
          <ContextMenu
            className="editor-group__header__action"
            content={
              <MenuContent>
                <MenuContentItem onClick={handleSplitRight}>
                  <div className="editor-group__context-menu__item">
                    <div className="editor-group__context-menu__item__icon">
                      <ArrowsSplitIcon />
                    </div>
                    <div className="editor-group__context-menu__item__label">
                      Split Right
                    </div>
                  </div>
                </MenuContentItem>
                <MenuContentItem onClick={handleSplitDown}>
                  <div className="editor-group__context-menu__item">
                    <div className="editor-group__context-menu__item__icon">
                      <ArrowsSplitIcon className="editor-group__context-menu__item__icon--rotated" />
                    </div>
                    <div className="editor-group__context-menu__item__label">
                      Split Down
                    </div>
                  </div>
                </MenuContentItem>
                <MenuContentDivider />
                {ideStore.editorSplitState.canRemoveSplit(leaf) && (
                  <MenuContentItem onClick={handleRemoveSplit}>
                    <div className="editor-group__context-menu__item">
                      <div className="editor-group__context-menu__item__icon">
                        <TimesIcon />
                      </div>
                      <div className="editor-group__context-menu__item__label">
                        Remove Split
                      </div>
                    </div>
                  </MenuContentItem>
                )}
                {ideStore.editorSplitState.hasSplits() && (
                  <MenuContentItem onClick={handleUnsplitAll}>
                    <div className="editor-group__context-menu__item">
                      <div className="editor-group__context-menu__item__icon">
                        <CompressIcon />
                      </div>
                      <div className="editor-group__context-menu__item__label">
                        Unsplit All
                      </div>
                    </div>
                  </MenuContentItem>
                )}
                <MenuContentDivider />
                <MenuContentItem onClick={handleCloseAllInLeaf}>
                  <div className="editor-group__context-menu__item">
                    <div className="editor-group__context-menu__item__label">
                      Close All
                    </div>
                  </div>
                </MenuContentItem>
              </MenuContent>
            }
          >
            <button
              className="editor-group__header__action__btn"
              title="Split editor"
            >
              <ArrowsSplitIcon />
            </button>
          </ContextMenu>
        </div>
      </div>
      <div
        key={currentTab.uuid}
        className="panel__content editor-group__content"
      >
        {renderActiveEditorState()}
      </div>
    </div>
  );
});

EditorGroupLeaf.displayName = 'EditorGroupLeaf';
