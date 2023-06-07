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
import { Console } from './TerminalPanel.js';
import { PANEL_MODE } from '../../stores/PureIDEConfig.js';
import { TextSearchPanel } from './TextSearchPanel.js';
import { TestRunnerPanel } from './TestRunnerPanel.js';
import { isNonNullable } from '@finos/legend-shared';
import {
  ChevronDownIcon,
  ChevronUpIcon,
  clsx,
  FlaskIcon,
  Panel,
  PanelContent,
  PanelHeader,
  ReferencesIcon,
  SearchIcon,
  TerminalIcon,
  WandIcon,
  XIcon,
} from '@finos/legend-art';
import { usePureIDEStore } from '../PureIDEStoreProvider.js';
import { CodeFixSuggestionsPanel } from './CodeFixSuggestionsPanel.js';
import { ReferenceUsagePanel } from './ReferenceUsagePanel.js';

export const PanelGroup = observer(() => {
  const ideStore = usePureIDEStore();
  const changeMode =
    (mode: PANEL_MODE): (() => void) =>
    (): void =>
      ideStore.setActivePanelMode(mode);
  const closePanel = (): void => ideStore.panelGroupDisplayState.toggle();
  const toggleExpandPanel = (): void =>
    ideStore.panelGroupDisplayState.toggleMaximize();

  const tabs = {
    [PANEL_MODE.TERMINAL]: {
      mode: PANEL_MODE.TERMINAL,
      name: 'TERMINAL',
      icon: (
        <TerminalIcon className="panel-group__header__tab__icon--terminal" />
      ),
      isVisible: true,
    },
    [PANEL_MODE.SEARCH]: {
      mode: PANEL_MODE.SEARCH,
      name: 'SEARCH',
      icon: <SearchIcon className="panel-group__header__tab__icon--search" />,
      isVisible: true,
    },
    [PANEL_MODE.TEST_RUNNER]: {
      mode: PANEL_MODE.TEST_RUNNER,
      name: 'TEST',
      icon: <FlaskIcon className="panel-group__header__tab__icon--test" />,
      isVisible: true,
    },
    [PANEL_MODE.REFERENCES]: {
      mode: PANEL_MODE.REFERENCES,
      name: 'REFERENCES',
      icon: (
        <ReferencesIcon className="panel-group__header__tab__icon--references" />
      ),
      isVisible: true,
    },
    [PANEL_MODE.CODE_FIX_SUGGESTION]: {
      mode: PANEL_MODE.CODE_FIX_SUGGESTION,
      name: 'SUGGESTIONS',
      icon: <WandIcon className="panel-group__header__tab__icon--suggestion" />,
      isVisible: Boolean(ideStore.codeFixSuggestion),
    },
  };

  const tabsToShow = Object.values(PANEL_MODE).filter(
    (tab) => isNonNullable(tabs[tab]) && tabs[tab].isVisible,
  );
  const isTabVisible = (tabType: PANEL_MODE): boolean =>
    ideStore.activePanelMode === tabType && tabsToShow.includes(tabType);

  useEffect(() => {
    if (!tabsToShow.includes(ideStore.activePanelMode)) {
      ideStore.setActivePanelMode(PANEL_MODE.TERMINAL);
    }
  }, [ideStore, tabsToShow, ideStore.activePanelMode]);

  return (
    <Panel className="panel-group">
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
                    ideStore.activePanelMode === tab.mode,
                })}
                onClick={changeMode(tab.mode)}
              >
                <div className="panel-group__header__tab__icon">{tab.icon}</div>
                <div className="panel-group__header__tab__title">
                  {tab.name}
                </div>
              </button>
            ))}
        </div>
        <div className="panel-group__header__actions">
          <button
            className="panel-group__header__action"
            onClick={toggleExpandPanel}
            tabIndex={-1}
            title="Toggle Expand/Collapse"
          >
            {ideStore.panelGroupDisplayState.isMaximized ? (
              <ChevronDownIcon />
            ) : (
              <ChevronUpIcon />
            )}
          </button>
          <button
            className="panel-group__header__action"
            onClick={closePanel}
            tabIndex={-1}
            title="Close"
          >
            <XIcon />
          </button>
        </div>
      </PanelHeader>
      <PanelContent>
        {isTabVisible(PANEL_MODE.TERMINAL) && (
          <div className="panel-group__content__tab">
            <Console />
          </div>
        )}
        {isTabVisible(PANEL_MODE.SEARCH) && (
          <div className="panel-group__content__tab">
            <TextSearchPanel />
          </div>
        )}
        {isTabVisible(PANEL_MODE.TEST_RUNNER) && (
          <div className="panel-group__content__tab">
            <TestRunnerPanel />
          </div>
        )}
        {isTabVisible(PANEL_MODE.CODE_FIX_SUGGESTION) && (
          <div className="panel-group__content__tab">
            <CodeFixSuggestionsPanel />
          </div>
        )}
        {isTabVisible(PANEL_MODE.REFERENCES) && (
          <div className="panel-group__content__tab">
            <ReferenceUsagePanel />
          </div>
        )}
      </PanelContent>
    </Panel>
  );
});
