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
  BlankPanelContent,
  Button,
  LockIcon,
  Panel,
  PanelContent,
  PanelHeader,
  PanelLoadingIndicator,
} from '@finos/legend-art';
import { useEditorStore } from '../../EditorStoreProvider.js';
import { flowResult } from 'mobx';
import { useApplicationStore } from '@finos/legend-application';
import {
  DATABASE_EDITOR_TAB,
  DatabaseEditorState,
} from '../../../../stores/editor/editor-state/element-editor-state/database/DatabaseEditorState.js';
import { DatabaseGeneralPanel } from './DatabaseGeneralPanel.js';
import { DatabaseSchemasPanel } from './DatabaseSchemasPanel.js';
import { DatabaseJoinsPanel } from './DatabaseJoinsPanel.js';
import { DatabaseFiltersPanel } from './DatabaseFiltersPanel.js';

export const DatabaseEditor = observer(() => {
  const editorStore = useEditorStore();
  const applicationStore = useApplicationStore();
  const databaseEditorState =
    editorStore.tabManagerState.getCurrentEditorState(DatabaseEditorState);
  const database = databaseEditorState.database;
  const isReadOnly = databaseEditorState.isReadOnly;

  const handleTextModeClick = applicationStore.guardUnhandledError(() =>
    flowResult(editorStore.toggleTextMode()),
  );

  const handleQueryClick = (): void => {
    flowResult(databaseEditorState.queryDatabaseState.init()).catch(
      applicationStore.alertUnhandledError,
    );
  };

  const handleTabChange = (tabIndex: number): void => {
    const tabs = Object.values(DATABASE_EDITOR_TAB);
    if (tabIndex >= 0 && tabIndex < tabs.length) {
      databaseEditorState.setSelectedTab(tabs[tabIndex]);
    }
  };

  const renderTabContent = (): React.ReactNode => {
    switch (databaseEditorState.selectedTab) {
      case DATABASE_EDITOR_TAB.GENERAL:
        return (
          <DatabaseGeneralPanel databaseEditorState={databaseEditorState} />
        );
      case DATABASE_EDITOR_TAB.SCHEMAS:
        return (
          <DatabaseSchemasPanel databaseEditorState={databaseEditorState} />
        );
      case DATABASE_EDITOR_TAB.JOINS:
        return <DatabaseJoinsPanel databaseEditorState={databaseEditorState} />;
      case DATABASE_EDITOR_TAB.FILTERS:
        return (
          <DatabaseFiltersPanel databaseEditorState={databaseEditorState} />
        );
      case DATABASE_EDITOR_TAB.QUERY:
        return (
          <BlankPanelContent>
            <div className="database-editor__query-panel">
              <Button
                className="database-editor__query-button"
                text="Query Database"
                onClick={handleQueryClick}
              />
            </div>
          </BlankPanelContent>
        );
      default:
        return <BlankPanelContent>Select a tab</BlankPanelContent>;
    }
  };

  return (
    <div className="database-editor">
      <Panel>
        <PanelHeader>
          <div className="panel__header__title">
            {isReadOnly && (
              <div className="database-editor__header__lock">
                <LockIcon />
              </div>
            )}
            <div className="panel__header__title__label">database</div>
            <div className="panel__header__title__content">{database.name}</div>
          </div>
          <div className="panel__header__actions">
            {!isReadOnly && (
              <Button
                className="panel__header__action"
                text="Edit in Text Mode"
                onClick={handleTextModeClick}
              />
            )}
          </div>
        </PanelHeader>
        <div className="panel__content database-editor__content">
          <div className="database-editor__tabs">
            {Object.values(DATABASE_EDITOR_TAB).map((tab, index) => (
              <div
                key={tab}
                className={`database-editor__tab ${
                  tab === databaseEditorState.selectedTab
                    ? 'database-editor__tab--active'
                    : ''
                }`}
                onClick={() => handleTabChange(index)}
              >
                {tab}
              </div>
            ))}
          </div>
          <PanelContent className="database-editor__tab-content">
            <PanelLoadingIndicator isLoading={false} />
            {renderTabContent()}
          </PanelContent>
        </div>
      </Panel>
    </div>
  );
});
