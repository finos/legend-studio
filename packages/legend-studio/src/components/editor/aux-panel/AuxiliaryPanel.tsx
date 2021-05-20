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
import { clsx } from '@finos/legend-studio-components';
import { MappingExecution } from './MappingExecution';
import { MappingTestEditorPanel } from './MappingTestEditorPanel';
import { Console } from './Console';
import { AUX_PANEL_MODE } from '../../../stores/EditorConfig';
import { useEditorStore } from '../../../stores/EditorStore';
import { GoChevronUp, GoChevronDown, GoX } from 'react-icons/go';
import { MappingIcon } from '../../shared/Icon';
import { MappingEditorState } from '../../../stores/editor-state/element-editor-state/mapping/MappingEditorState';
import { MappingTestState } from '../../../stores/editor-state/element-editor-state/mapping/MappingTestState';
import { isNonNullable } from '@finos/legend-studio-shared';
import { DevTool } from './DevTool';

export const AuxiliaryPanel = observer(() => {
  const editorStore = useEditorStore();
  const changeMode =
    (mode: AUX_PANEL_MODE): (() => void) =>
    (): void =>
      editorStore.setActiveAuxPanelMode(mode);
  const closePanel = (): void => editorStore.toggleAuxPanel();
  const toggleExpandAuxPanel = (): void => editorStore.toggleExpandAuxPanel();

  const auxTabMap = {
    [AUX_PANEL_MODE.CONSOLE]: {
      mode: AUX_PANEL_MODE.CONSOLE,
      name: 'CONSOLE',
      icon: undefined,
      isVisible: true,
    },
    [AUX_PANEL_MODE.MAPPING_EXECUTE]: {
      mode: AUX_PANEL_MODE.MAPPING_EXECUTE,
      name: 'EXECUTE',
      icon: <MappingIcon />,
      isVisible:
        editorStore.currentEditorState &&
        editorStore.isInFormMode &&
        editorStore.currentEditorState instanceof MappingEditorState,
    },
    [AUX_PANEL_MODE.MAPPING_TEST]: {
      mode: AUX_PANEL_MODE.MAPPING_TEST,
      name: 'TEST',
      icon: <MappingIcon />,
      isVisible:
        editorStore.currentEditorState &&
        editorStore.isInFormMode &&
        editorStore.currentEditorState instanceof MappingEditorState &&
        editorStore.currentEditorState.currentTabState instanceof
          MappingTestState,
    },
    [AUX_PANEL_MODE.DEV_TOOL]: {
      mode: AUX_PANEL_MODE.DEV_TOOL,
      name: 'DEVELOPER TOOLS',
      icon: undefined,
      isVisible: editorStore.isDevToolEnabled,
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
                </div>
              </button>
            ))}
        </div>
        <div className="auxiliary-panel__header__actions">
          <button
            className="auxiliary-panel__header__action"
            onClick={toggleExpandAuxPanel}
            tabIndex={-1}
            title={'Toggle expand/collapse'}
          >
            {editorStore.isAuxPanelMaximized ? (
              <GoChevronDown />
            ) : (
              <GoChevronUp />
            )}
          </button>
          <button
            className="auxiliary-panel__header__action"
            onClick={closePanel}
            tabIndex={-1}
            title={'Close'}
          >
            <GoX />
          </button>
        </div>
      </div>
      <div className="panel__content">
        {isTabVisible(AUX_PANEL_MODE.CONSOLE) && (
          <div className="auxiliary-panel__content__tab">
            <Console />
          </div>
        )}
        {isTabVisible(AUX_PANEL_MODE.MAPPING_EXECUTE) && (
          <div className="auxiliary-panel__content__tab">
            <MappingExecution />
          </div>
        )}
        {isTabVisible(AUX_PANEL_MODE.MAPPING_TEST) && (
          <div className="auxiliary-panel__content__tab">
            <MappingTestEditorPanel />
          </div>
        )}
        {isTabVisible(AUX_PANEL_MODE.DEV_TOOL) && (
          <div className="auxiliary-panel__content__tab">
            <DevTool />
          </div>
        )}
      </div>
    </div>
  );
});
