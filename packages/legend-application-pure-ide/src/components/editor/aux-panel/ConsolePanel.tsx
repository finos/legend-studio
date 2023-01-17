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

import { useApplicationStore } from '@finos/legend-application';
import { useResizeDetector } from '@finos/legend-art';
import { observer } from 'mobx-react-lite';
import { useEffect } from 'react';
import { AUX_PANEL_MODE } from '../../../stores/EditorConfig.js';
import { useEditorStore } from '../EditorStoreProvider.js';

export const Console = observer(() => {
  const editorStore = useEditorStore();
  const applicationStore = useApplicationStore();
  const { ref, width, height } = useResizeDetector<HTMLDivElement>();

  useEffect(() => {
    if (ref.current) {
      applicationStore.terminalService.console.mount(ref.current);
    }
  }, [applicationStore, ref]);

  // auto-focus on the terminal when the console tab is open
  useEffect(() => {
    if (
      editorStore.auxPanelDisplayState.isOpen &&
      editorStore.activeAuxPanelMode === AUX_PANEL_MODE.CONSOLE
    ) {
      applicationStore.terminalService.console.focus();
    }
  }, [
    applicationStore,
    editorStore.auxPanelDisplayState.isOpen,
    editorStore.activeAuxPanelMode,
  ]);

  useEffect(() => {
    applicationStore.terminalService.console.autoResize();
  }, [applicationStore, width, height]);

  return (
    <div className="console-panel">
      <div className="console-panel__header"></div>
      <div ref={ref} className="console-panel__content" />
    </div>
  );
});
