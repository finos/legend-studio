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
  MenuContentDivider,
  DoubleArrowLeft,
  DoubleArrowRight,
} from '@finos/legend-art';
import { useEditorStore } from './EditorStoreProvider.js';
import type { EditorStore } from '../../stores/editor/EditorStore.js';

export enum SHOWCASE_PANEL_LOCAL_STORAGE {
  PANEL_STATE_KEY = 'ShowShowcasePanel',
}

export const toggleShowcasePanel = (editorStore: EditorStore) => {
  editorStore.showcasePanelDisplayState.toggle();
  editorStore.applicationStore.userDataService.persistValue(
    SHOWCASE_PANEL_LOCAL_STORAGE.PANEL_STATE_KEY,
    editorStore.showcasePanelDisplayState.isOpen,
  );
};

export const ShowcaseSideBar = observer(() => {
  const editorStore = useEditorStore();

  return (
    <div className="activity-bar">
      <div className="activity-bar__items">
        <button
          className="activity-bar__item"
          onClick={() => {
            toggleShowcasePanel(editorStore);
          }}
          tabIndex={-1}
          title={
            editorStore.showcasePanelDisplayState.isOpen
              ? 'Close Showcases'
              : 'Open Showcases'
          }
        >
          {editorStore.showcasePanelDisplayState.isOpen ? (
            <DoubleArrowRight />
          ) : (
            <DoubleArrowLeft />
          )}
        </button>
        <MenuContentDivider />
      </div>
    </div>
  );
});
