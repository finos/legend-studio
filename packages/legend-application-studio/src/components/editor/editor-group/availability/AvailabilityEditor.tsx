/**
 * Copyright (c) 2026-present, Goldman Sachs
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

import {
  clsx,
  EyeIcon,
  FlaskIcon,
  PanelContent,
  PanelHeader,
} from '@finos/legend-art';
import { CODE_EDITOR_LANGUAGE } from '@finos/legend-code-editor';
import { CodeEditor } from '@finos/legend-lego/code-editor';
import { useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { useEditorStore } from '../../EditorStoreProvider.js';
import {
  AVAILABILITY_TAB,
  AvailabilityEditorState,
} from '../../../../stores/editor/editor-state/element-editor-state/availability/AvailabilityEditorState.js';
import { AvailabilityTestableEditor } from './testable/AvailabilityTestableEditor.js';
import { useApplicationNavigationContext } from '@finos/legend-application';
import { LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY } from '../../../../__lib__/LegendStudioApplicationNavigationContext.js';

export const AvailabilityEditor = observer(() => {
  const editorStore = useEditorStore();
  const availabilityEditorState =
    editorStore.tabManagerState.getCurrentEditorState(AvailabilityEditorState);
  const availability = availabilityEditorState.availability;
  const activeTab = availabilityEditorState.activeTab;

  const sidebarTabs = [
    {
      label: AVAILABILITY_TAB.DEFINITION,
      icon: <EyeIcon />,
    },
    {
      label: AVAILABILITY_TAB.TESTING,
      icon: <FlaskIcon />,
    },
  ];

  useEffect(() => {
    availabilityEditorState.generateElementGrammar();
  }, [availabilityEditorState]);

  useApplicationNavigationContext(
    LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY.AVAILABILITY_EDITOR,
  );

  return (
    <div className="availability-editor">
      <div className="panel">
        <PanelHeader
          title="Availability"
          titleContent={availability.name}
          darkMode={true}
          isReadOnly={true}
        />
        <div className="panel availability-editor__content-panel">
          <div className="availability-editor__activity-bar">
            <div className="availability-editor__activity-bar__items">
              {sidebarTabs.map((tab) => (
                <button
                  key={tab.label}
                  className={clsx('availability-editor__activity-bar__item', {
                    'availability-editor__activity-bar__item--active':
                      activeTab === tab.label,
                  })}
                  onClick={() =>
                    availabilityEditorState.setActiveTab(tab.label)
                  }
                  tabIndex={-1}
                  title={tab.label}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
          <div className="panel availability-editor__main-panel">
            {activeTab === AVAILABILITY_TAB.DEFINITION && (
              <PanelContent>
                <CodeEditor
                  language={CODE_EDITOR_LANGUAGE.PURE}
                  inputValue={availabilityEditorState.textContent}
                  isReadOnly={true}
                />
              </PanelContent>
            )}
            {activeTab === AVAILABILITY_TAB.TESTING && (
              <AvailabilityTestableEditor
                testableState={availabilityEditorState.testableState}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
});
