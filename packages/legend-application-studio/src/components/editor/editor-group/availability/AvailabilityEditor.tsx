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
  PanelContent,
  PanelHeader,
  PanelHeaderActionItem,
  PanelHeaderActions,
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

export const AvailabilityEditor = observer(() => {
  const editorStore = useEditorStore();
  const availabilityEditorState =
    editorStore.tabManagerState.getCurrentEditorState(AvailabilityEditorState);

  useEffect(() => {
    availabilityEditorState.generateElementGrammar();
  }, [availabilityEditorState]);

  return (
    <div className="data-product-editor">
      <PanelHeader
        title="Availability"
        titleContent={availabilityEditorState.availability.name}
        darkMode={true}
      >
        <PanelHeaderActions>
          {Object.values(AVAILABILITY_TAB).map((tab) => (
            <PanelHeaderActionItem
              key={tab}
              className={clsx({
                'panel__header__action--active':
                  availabilityEditorState.activeTab === tab,
              })}
              onClick={() => availabilityEditorState.setActiveTab(tab)}
              title={tab}
            >
              {tab}
            </PanelHeaderActionItem>
          ))}
        </PanelHeaderActions>
      </PanelHeader>
      <PanelContent className={clsx('availability-editor__content')}>
        {availabilityEditorState.activeTab === AVAILABILITY_TAB.DEFINITION ? (
          <CodeEditor
            language={CODE_EDITOR_LANGUAGE.PURE}
            inputValue={availabilityEditorState.textContent}
            isReadOnly={true}
          />
        ) : (
          <AvailabilityTestableEditor
            testableState={availabilityEditorState.testableState}
          />
        )}
      </PanelContent>
    </div>
  );
});
