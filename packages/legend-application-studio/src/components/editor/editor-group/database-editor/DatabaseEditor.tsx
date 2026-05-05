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
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  InfoCircleIcon,
  LockIcon,
  MoonIcon,
  ResizablePanel,
  ResizablePanelGroup,
  ResizablePanelSplitter,
  ResizablePanelSplitterLine,
  SunIcon,
  clsx,
  getCollapsiblePanelGroupProps,
} from '@finos/legend-art';
import { prettyCONSTName } from '@finos/legend-shared';
import { CODE_EDITOR_LANGUAGE } from '@finos/legend-code-editor';
import { CodeEditor } from '@finos/legend-lego/code-editor';
import { INTERNAL__LakehouseGeneratedDatabase } from '@finos/legend-graph';
import { useEditorStore } from '../../EditorStoreProvider.js';
import {
  DATABASE_EDITOR_TAB,
  DatabaseEditorState,
} from '../../../../stores/editor/editor-state/element-editor-state/DatabaseEditorState.js';
import { DatabaseDiagramCanvas } from './DatabaseDiagramCanvas.js';
import { DatabaseSchemaTree } from './DatabaseSchemaTree.js';

const TABS: DATABASE_EDITOR_TAB[] = [
  DATABASE_EDITOR_TAB.VIEW,
  DATABASE_EDITOR_TAB.GRAMMAR,
];

/**
 * Top-level editor for `Database` elements in form mode. Has two tabs:
 *   - VIEW (default): Schema → Table → Column tree (left) + React-Flow ERD
 *     canvas (right). The interactive form mode.
 *   - GRAMMAR: read-only Pure DSL preview, regenerated on tab switch by
 *     `setSelectedTab` so it always reflects the current metamodel state.
 *     Mirrors what global Text Mode would render for this element — included
 *     here for users who want to peek at the grammar without leaving form
 *     mode.
 */
export const DatabaseEditor = observer(() => {
  const editorStore = useEditorStore();
  const editorState =
    editorStore.tabManagerState.getCurrentEditorState(DatabaseEditorState);
  const { selectedTab, database } = editorState;

  // Resizable left panel: dragging the splitter all the way left snaps the
  // panel to flex=0 (collapsed). The toggle button in the panel header (and
  // the expand-rail rendered when collapsed) drives the same flag, so both
  // controls stay in sync via `editorState.isSidePanelCollapsed`.
  const sidePanelCollapseProps = getCollapsiblePanelGroupProps(
    editorState.isSidePanelCollapsed,
    {
      // Default width when first opened (in pixels). React-reflex owns the
      // exact width after the first user-drag.
      size: 320,
      onStopResize: (handleProps) => {
        // If the user drags the splitter to (or near) zero, persist it as
        // collapsed so the toggle button and rail stay in sync. Mirrors
        // what `getCollapsiblePanelGroupProps` does internally for the
        // styling class but lifts that signal back up to MobX.
        const flexGrow = Number(
          (handleProps.domElement as HTMLDivElement).style.flexGrow,
        );
        if (flexGrow <= 0.01) {
          editorState.setSidePanelCollapsed(true);
        } else if (editorState.isSidePanelCollapsed) {
          editorState.setSidePanelCollapsed(false);
        }
      },
    },
  );

  return (
    <div
      className={clsx('database-editor', {
        // Local light-theme opt-in. Scoped to this editor only — the rest
        // of Studio remains in its configured theme. SCSS overrides hang
        // off this modifier class.
        'database-editor--light': editorState.theme === 'light',
      })}
    >
      <div className="database-editor__tabs__header">
        <div className="database-editor__tabs">
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => editorState.setSelectedTab(tab)}
              className={clsx('database-editor__tab', {
                'database-editor__tab--active': tab === selectedTab,
              })}
            >
              {prettyCONSTName(tab)}
            </button>
          ))}
        </div>
        {/*
         * Read-only sticker is part of the tab strip — visible across both
         * VIEW and GRAMMAR tabs because the whole form mode is currently
         * read-only. Once edit support lands, the sticker can be hidden
         * conditionally on `editorState.isReadOnly` (or removed entirely).
         */}
        <div
          className="database-editor__read-only-badge"
          title="This editor is read-only"
        >
          <LockIcon />
          <span className="database-editor__read-only-badge__label">
            READ ONLY
          </span>
        </div>
        {/*
         * Light/dark theme toggle. Scoped to this editor only — see
         * `DatabaseEditorState.toggleTheme`. Icon switches to surface the
         * mode the user would jump TO if they clicked (current=dark shows
         * a sun, current=light shows a moon).
         */}
        <button
          type="button"
          className="database-editor__theme-toggle"
          onClick={() => editorState.toggleTheme()}
          title={
            editorState.theme === 'dark'
              ? 'Switch to light theme (this editor only)'
              : 'Switch to dark theme'
          }
        >
          {editorState.theme === 'dark' ? <SunIcon /> : <MoonIcon />}
        </button>
      </div>
      <div className="database-editor__content">
        {database instanceof INTERNAL__LakehouseGeneratedDatabase && (
          <div
            className="database-editor__generated-banner"
            title={`Generated from ${database.generatorElement.path}\nOwned by ${database.OWNER.path}`}
          >
            <InfoCircleIcon />
            <span className="database-editor__generated-banner__text">
              This database is generated by{' '}
              <span className="database-editor__generated-banner__path">
                {database.generatorElement.path}
              </span>
              {' — owned by '}
              <span className="database-editor__generated-banner__path">
                {database.OWNER.path}
              </span>
              .
            </span>
          </div>
        )}
        <div className="database-editor__content__body">
          {selectedTab === DATABASE_EDITOR_TAB.VIEW && (
            <div className="database-diagram">
              {/*
               * The schema tree (left) and ERD canvas (right) are split by
               * a draggable splitter. Drag-to-resize is the primary control;
               * the small toggle button in the panel header (and the
               * "expand" rail rendered when collapsed) lets users snap the
               * panel fully closed/open without dragging. The collapsed
               * state lives on the editor state so it survives tab
               * switches and recompiles.
               */}
              <ResizablePanelGroup orientation="vertical">
                <ResizablePanel
                  {...sidePanelCollapseProps.collapsiblePanel}
                  direction={1}
                  minSize={0}
                >
                  <div className="database-diagram__side-panel-wrapper">
                    <div className="database-diagram__side-panel-wrapper__header">
                      <span className="database-diagram__side-panel-wrapper__header__title">
                        Database
                      </span>
                      <button
                        type="button"
                        className="database-diagram__side-panel-wrapper__header__action"
                        onClick={() => editorState.toggleSidePanelCollapsed()}
                        title="Collapse panel"
                      >
                        <ChevronLeftIcon />
                      </button>
                    </div>
                    <div className="database-diagram__side-panel-wrapper__body">
                      <DatabaseSchemaTree editorState={editorState} />
                    </div>
                  </div>
                </ResizablePanel>
                <ResizablePanelSplitter>
                  <ResizablePanelSplitterLine color="var(--color-dark-grey-200)" />
                </ResizablePanelSplitter>
                <ResizablePanel
                  {...sidePanelCollapseProps.remainingPanel}
                  minSize={200}
                >
                  <div className="database-diagram__canvas-area">
                    {editorState.isSidePanelCollapsed && (
                      <button
                        type="button"
                        className="database-diagram__expand-rail"
                        onClick={() => editorState.toggleSidePanelCollapsed()}
                        title="Expand panel"
                      >
                        <ChevronRightIcon />
                      </button>
                    )}
                    <div className="database-diagram__canvas-container">
                      <DatabaseDiagramCanvas editorState={editorState} />
                    </div>
                  </div>
                </ResizablePanel>
              </ResizablePanelGroup>
            </div>
          )}
          {selectedTab === DATABASE_EDITOR_TAB.GRAMMAR && (
            <div className="database-editor__grammar">
              <CodeEditor
                inputValue={editorState.textContent}
                isReadOnly={true}
                language={CODE_EDITOR_LANGUAGE.PURE}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
