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
import { AUX_PANEL_MODE } from '../../stores/PureIDEConfig.js';
import { TextSearchPanel } from './TextSearchPanel.js';
import { TestRunnerPanel } from './TestRunnerPanel.js';
import { isNonNullable } from '@finos/legend-shared';
import {
  ChevronDownIcon,
  ChevronUpIcon,
  clsx,
  FlaskIcon,
  ReferencesIcon,
  SearchIcon,
  TerminalIcon,
  WandIcon,
  XIcon,
} from '@finos/legend-art';
import { usePureIDEStore } from '../PureIDEStoreProvider.js';
import { CodeFixSuggestionsPanel } from './CodeFixSuggestionsPanel.js';
import { ReferenceUsagePanel } from './ReferenceUsagePanel.js';

export const AuxiliaryPanel = observer(() => {
  const ideStore = usePureIDEStore();
  const changeMode =
    (mode: AUX_PANEL_MODE): (() => void) =>
    (): void =>
      ideStore.setActiveAuxPanelMode(mode);
  const closePanel = (): void => ideStore.auxPanelDisplayState.toggle();
  const toggleExpandAuxPanel = (): void =>
    ideStore.auxPanelDisplayState.toggleMaximize();

  const auxTabMap = {
    [AUX_PANEL_MODE.TERMINAL]: {
      mode: AUX_PANEL_MODE.TERMINAL,
      name: 'TERMINAL',
      icon: (
        <TerminalIcon className="auxiliary-panel__header__tab__icon--terminal" />
      ),
      isVisible: true,
    },
    [AUX_PANEL_MODE.SEARCH]: {
      mode: AUX_PANEL_MODE.SEARCH,
      name: 'SEARCH',
      icon: (
        <SearchIcon className="auxiliary-panel__header__tab__icon--search" />
      ),
      isVisible: true,
    },
    [AUX_PANEL_MODE.TEST_RUNNER]: {
      mode: AUX_PANEL_MODE.TEST_RUNNER,
      name: 'TEST',
      icon: <FlaskIcon className="auxiliary-panel__header__tab__icon--test" />,
      isVisible: true,
    },
    [AUX_PANEL_MODE.REFERENCES]: {
      mode: AUX_PANEL_MODE.REFERENCES,
      name: 'REFERENCES',
      icon: (
        <ReferencesIcon className="auxiliary-panel__header__tab__icon--references" />
      ),
      isVisible: true,
    },
    [AUX_PANEL_MODE.CODE_FIX_SUGGESTION]: {
      mode: AUX_PANEL_MODE.CODE_FIX_SUGGESTION,
      name: 'SUGGESTIONS',
      icon: (
        <WandIcon className="auxiliary-panel__header__tab__icon--suggestion" />
      ),
      isVisible: Boolean(ideStore.codeFixSuggestion),
    },
  };

  const tabsToShow = Object.values(AUX_PANEL_MODE).filter(
    (tab) => isNonNullable(auxTabMap[tab]) && auxTabMap[tab].isVisible,
  );
  const isTabVisible = (tabType: AUX_PANEL_MODE): boolean =>
    ideStore.activeAuxPanelMode === tabType && tabsToShow.includes(tabType);

  useEffect(() => {
    if (!tabsToShow.includes(ideStore.activeAuxPanelMode)) {
      ideStore.setActiveAuxPanelMode(AUX_PANEL_MODE.TERMINAL);
    }
  }, [ideStore, tabsToShow, ideStore.activeAuxPanelMode]);

  return (
    <div className="panel auxiliary-panel">
      <div className="panel__header">
        <div className="auxiliary-panel__header__tabs">
          {tabsToShow
            .map((tab) => auxTabMap[tab])
            .filter(isNonNullable)
            .map((tab) => (
              <button
                key={tab.mode}
                tabIndex={-1}
                className={clsx('auxiliary-panel__header__tab', {
                  'auxiliary-panel__header__tab--active':
                    ideStore.activeAuxPanelMode === tab.mode,
                })}
                onClick={changeMode(tab.mode)}
              >
                <div className="auxiliary-panel__header__tab__icon">
                  {tab.icon}
                </div>
                <div className="auxiliary-panel__header__tab__title">
                  {tab.name}
                </div>
              </button>
            ))}
        </div>
        <div className="auxiliary-panel__header__actions">
          <button
            className="auxiliary-panel__header__action"
            onClick={toggleExpandAuxPanel}
            tabIndex={-1}
            title="Toggle Expand/Collapse"
          >
            {ideStore.auxPanelDisplayState.isMaximized ? (
              <ChevronDownIcon />
            ) : (
              <ChevronUpIcon />
            )}
          </button>
          <button
            className="auxiliary-panel__header__action"
            onClick={closePanel}
            tabIndex={-1}
            title="Close"
          >
            <XIcon />
          </button>
        </div>
      </div>
      <div className="panel__content">
        {isTabVisible(AUX_PANEL_MODE.TERMINAL) && (
          <div className="auxiliary-panel__content__tab">
            <Console />
          </div>
        )}
        {isTabVisible(AUX_PANEL_MODE.SEARCH) && (
          <div className="auxiliary-panel__content__tab">
            <TextSearchPanel />
          </div>
        )}
        {isTabVisible(AUX_PANEL_MODE.TEST_RUNNER) && (
          <div className="auxiliary-panel__content__tab">
            <TestRunnerPanel />
          </div>
        )}
        {isTabVisible(AUX_PANEL_MODE.CODE_FIX_SUGGESTION) && (
          <div className="auxiliary-panel__content__tab">
            <CodeFixSuggestionsPanel />
          </div>
        )}
        {isTabVisible(AUX_PANEL_MODE.REFERENCES) && (
          <div className="auxiliary-panel__content__tab">
            <ReferenceUsagePanel />
          </div>
        )}
      </div>
    </div>
  );
});
