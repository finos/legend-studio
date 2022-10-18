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
} from '@finos/legend-art';
import { Console } from './Console.js';
import { AUX_PANEL_MODE } from '../../../stores/EditorConfig.js';
import { isNonNullable } from '@finos/legend-shared';
import { DevTool } from './DevTool.js';
import { useEditorStore } from '../EditorStoreProvider.js';
import { Problems } from './Problems.js';

export const AuxiliaryPanel = observer(() => {
  const editorStore = useEditorStore();
  const changeMode =
    (mode: AUX_PANEL_MODE): (() => void) =>
    (): void =>
      editorStore.setActiveAuxPanelMode(mode);
  const closePanel = (): void => editorStore.auxPanelDisplayState.toggle();
  const toggleExpandAuxPanel = (): void =>
    editorStore.auxPanelDisplayState.toggleMaximize();

  const auxTabMap: {
    [key in AUX_PANEL_MODE]: {
      mode: AUX_PANEL_MODE;
      name: string;
      icon?: React.ReactNode;
      isVisible: boolean;
      badge?: string;
    };
  } = {
    [AUX_PANEL_MODE.CONSOLE]: {
      mode: AUX_PANEL_MODE.CONSOLE,
      name: 'CONSOLE',
      icon: undefined,
      isVisible: true,
    },
    [AUX_PANEL_MODE.DEV_TOOL]: {
      mode: AUX_PANEL_MODE.DEV_TOOL,
      name: 'DEVELOPER TOOLS',
      icon: undefined,
      isVisible: true,
    },
    [AUX_PANEL_MODE.PROBLEMS]: {
      mode: AUX_PANEL_MODE.PROBLEMS,
      name: 'PROBLEMS',
      icon: undefined,
      isVisible: true,
      ...(editorStore.grammarTextEditorState.warnings?.length
        ? {
            badge:
              editorStore.grammarTextEditorState.warnings.length.toString(),
          }
        : { badge: '0' }),
    },
  };

  const tabsToShow = Object.values(AUX_PANEL_MODE).filter(
    (tab) => isNonNullable(auxTabMap[tab]) && auxTabMap[tab].isVisible,
  );
  const isTabVisible = (tabType: AUX_PANEL_MODE): boolean =>
    editorStore.activeAuxPanelMode === tabType && tabsToShow.includes(tabType);

  useEffect(() => {
    if (!tabsToShow.includes(editorStore.activeAuxPanelMode)) {
      editorStore.setActiveAuxPanelMode(AUX_PANEL_MODE.CONSOLE);
    }
  }, [editorStore, tabsToShow, editorStore.activeAuxPanelMode]);

  return (
    <div className="panel auxiliary-panel">
      <PanelHeader>
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
                    editorStore.activeAuxPanelMode === tab.mode,
                })}
                onClick={changeMode(tab.mode)}
              >
                {tab.icon && (
                  <div className="auxiliary-panel__header__tab__icon">
                    {tab.icon}
                  </div>
                )}
                <div className="auxiliary-panel__header__tab__title">
                  {tab.name}
                  {tab.badge && (
                    <Badge
                      title={tab.badge}
                      className="auxiliary-panel__header__tab__title__warning__count"
                    />
                  )}
                </div>
              </button>
            ))}
        </div>
        <PanelHeaderActions>
          <PanelHeaderActionItem
            className="auxiliary-panel__header__action"
            onClick={toggleExpandAuxPanel}
            tabIndex={-1}
            title="Toggle expand/collapse"
          >
            {editorStore.auxPanelDisplayState.isMaximized ? (
              <ChevronDownIcon />
            ) : (
              <ChevronUpIcon />
            )}
          </PanelHeaderActionItem>
          <PanelHeaderActionItem
            className="auxiliary-panel__header__action"
            onClick={closePanel}
            tabIndex={-1}
            title="Close"
          >
            <XIcon />
          </PanelHeaderActionItem>
        </PanelHeaderActions>
      </PanelHeader>
      <PanelContent>
        {isTabVisible(AUX_PANEL_MODE.PROBLEMS) && (
          <div className="auxiliary-panel__content__tab">
            <Problems />
          </div>
        )}
        {isTabVisible(AUX_PANEL_MODE.CONSOLE) && (
          <div className="auxiliary-panel__content__tab">
            <Console />
          </div>
        )}
        {isTabVisible(AUX_PANEL_MODE.DEV_TOOL) && (
          <div className="auxiliary-panel__content__tab">
            <DevTool />
          </div>
        )}
      </PanelContent>
    </div>
  );
});
