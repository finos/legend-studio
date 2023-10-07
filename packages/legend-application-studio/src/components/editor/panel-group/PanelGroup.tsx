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

import { useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import {
  clsx,
  ChevronUpIcon,
  ChevronDownIcon,
  XIcon,
  PanelContent,
  Badge,
  PanelHeader,
  PanelHeaderActions,
  PanelHeaderActionItem,
  SparkleIcon,
} from '@finos/legend-art';
import { ConsolePanel } from './ConsolePanel.js';
import { PANEL_MODE } from '../../../stores/editor/EditorConfig.js';
import { isNonNullable } from '@finos/legend-shared';
import { DevToolPanel } from './DevToolPanel.js';
import { useEditorStore } from '../EditorStoreProvider.js';
import { ProblemsPanel } from './ProblemsPanel.js';
import { SQLPlaygroundPanel } from './SQLPlaygroundPanel.js';
import { GraphEditFormModeState } from '../../../stores/editor/GraphEditFormModeState.js';

export const PanelGroupItemExperimentalBadge: React.FC = () => (
  <div
    className="panel-group__header__tab__experimental-badge"
    title="This is an experimental feature"
  >
    <SparkleIcon />
  </div>
);

export const PanelGroup = observer(() => {
  const editorStore = useEditorStore();
  const changeMode =
    (mode: PANEL_MODE): (() => void) =>
    (): void =>
      editorStore.setActivePanelMode(mode);
  const closePanel = (): void => editorStore.panelGroupDisplayState.toggle();
  const toggleExpandPanelGroup = (): void =>
    editorStore.panelGroupDisplayState.toggleMaximize();

  const tabs: {
    [key in PANEL_MODE]: {
      mode: PANEL_MODE;
      name: string;
      icon?: React.ReactNode;
      isVisible: boolean;
      counter?: number;
      experimental?: boolean;
    };
  } = {
    [PANEL_MODE.CONSOLE]: {
      mode: PANEL_MODE.CONSOLE,
      name: 'CONSOLE',
      icon: undefined,
      isVisible: true,
      experimental: true,
    },
    [PANEL_MODE.DEV_TOOL]: {
      mode: PANEL_MODE.DEV_TOOL,
      name: 'DEVELOPER TOOLS',
      icon: undefined,
      isVisible: true,
    },
    [PANEL_MODE.PROBLEMS]: {
      mode: PANEL_MODE.PROBLEMS,
      name: 'PROBLEMS',
      icon: undefined,
      isVisible: true,
      counter: editorStore.graphState.problems.length,
    },
    [PANEL_MODE.SQL_PLAYGROUND]: {
      mode: PANEL_MODE.SQL_PLAYGROUND,
      name: 'SQL PLAYGROUND',
      icon: undefined,
      isVisible: editorStore.graphEditorMode instanceof GraphEditFormModeState,
      experimental: true,
    },
  };

  const tabsToShow = Object.values(PANEL_MODE).filter(
    (tab) => isNonNullable(tabs[tab]) && tabs[tab].isVisible,
  );
  const isTabVisible = (tabType: PANEL_MODE): boolean =>
    editorStore.activePanelMode === tabType && tabsToShow.includes(tabType);

  useEffect(() => {
    if (!tabsToShow.includes(editorStore.activePanelMode)) {
      editorStore.setActivePanelMode(PANEL_MODE.CONSOLE);
    }
  }, [editorStore, tabsToShow, editorStore.activePanelMode]);

  return (
    <div className="panel panel-group">
      <PanelHeader>
        <div className="panel-group__header__tabs">
          {tabsToShow
            .map((tab) => tabs[tab])
            .filter(isNonNullable)
            .map((tab) => (
              <button
                key={tab.mode}
                tabIndex={-1}
                className={clsx('panel-group__header__tab', {
                  'panel-group__header__tab--active':
                    editorStore.activePanelMode === tab.mode,
                })}
                onClick={changeMode(tab.mode)}
              >
                {tab.icon && (
                  <div className="panel-group__header__tab__icon">
                    {tab.icon}
                  </div>
                )}
                <div className="panel-group__header__tab__title">
                  {tab.name}
                  {tab.counter !== undefined && (
                    <Badge
                      title={tab.counter.toString()}
                      className="panel-group__header__tab__title__problem__count"
                    />
                  )}
                </div>
                {tab.experimental && <PanelGroupItemExperimentalBadge />}
              </button>
            ))}
        </div>
        <PanelHeaderActions>
          <PanelHeaderActionItem
            className="panel-group__header__action"
            onClick={toggleExpandPanelGroup}
            title="Toggle expand/collapse"
          >
            {editorStore.panelGroupDisplayState.isMaximized ? (
              <ChevronDownIcon />
            ) : (
              <ChevronUpIcon />
            )}
          </PanelHeaderActionItem>
          <PanelHeaderActionItem
            className="panel-group__header__action"
            onClick={closePanel}
            title="Close"
          >
            <XIcon />
          </PanelHeaderActionItem>
        </PanelHeaderActions>
      </PanelHeader>
      <PanelContent>
        {isTabVisible(PANEL_MODE.PROBLEMS) && (
          <div className="panel-group__content__tab">
            <ProblemsPanel />
          </div>
        )}
        {isTabVisible(PANEL_MODE.CONSOLE) && (
          <div className="panel-group__content__tab">
            <ConsolePanel />
          </div>
        )}
        {isTabVisible(PANEL_MODE.DEV_TOOL) && (
          <div className="panel-group__content__tab">
            <DevToolPanel />
          </div>
        )}
        {isTabVisible(PANEL_MODE.SQL_PLAYGROUND) && (
          <div className="panel-group__content__tab">
            <SQLPlaygroundPanel />
          </div>
        )}
      </PanelContent>
    </div>
  );
});
