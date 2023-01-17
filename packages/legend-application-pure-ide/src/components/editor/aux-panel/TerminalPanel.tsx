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
import {
  ArrowDownIcon,
  ArrowUpIcon,
  clsx,
  HistoryIcon,
  QuestionCircleIcon,
  TrashIcon,
  useResizeDetector,
} from '@finos/legend-art';
import { observer } from 'mobx-react-lite';
import { useEffect } from 'react';
import { AUX_PANEL_MODE } from '../../../stores/EditorConfig.js';
import { useEditorStore } from '../EditorStoreProvider.js';

export const Console = observer(() => {
  const editorStore = useEditorStore();
  const applicationStore = useApplicationStore();
  const console = applicationStore.terminalService.terminal;
  const { ref, width, height } = useResizeDetector<HTMLDivElement>();

  useEffect(() => {
    if (ref.current) {
      console.mount(ref.current);
    }
  }, [console, ref]);

  // auto-focus on the terminal when the console tab is open
  useEffect(() => {
    if (
      editorStore.auxPanelDisplayState.isOpen &&
      editorStore.activeAuxPanelMode === AUX_PANEL_MODE.TERMINAL
    ) {
      console.focus();
    }
  }, [
    console,
    editorStore.auxPanelDisplayState.isOpen,
    editorStore.activeAuxPanelMode,
  ]);

  useEffect(() => {
    console.autoResize();
  }, [console, width, height]);

  return (
    <div className="terminal-panel">
      <div className="terminal-panel__header">
        <div className="terminal-panel__header__group">
          <button
            className="terminal-panel__header__action terminal-panel__header__group__action"
            title="Previous Match"
            // disabled={isAlignerDisabled}
            tabIndex={-1}
            // onClick={(): void =>
            //   diagramEditorState.renderer.align(
            //     DIAGRAM_ALIGNER_OPERATOR.ALIGN_LEFT,
            //   )
            // }
          >
            <ArrowUpIcon className="terminal-panel__header__action__icon" />
          </button>
          <button
            className="terminal-panel__header__action terminal-panel__header__group__action"
            title="Next Match"
            // disabled={isAlignerDisabled}
            tabIndex={-1}
            // onClick={(): void =>
            //   diagramEditorState.renderer.align(
            //     DIAGRAM_ALIGNER_OPERATOR.ALIGN_LEFT,
            //   )
            // }
          >
            <ArrowDownIcon className="terminal-panel__header__action__icon" />
          </button>
        </div>
        <div className="terminal-panel__header__group__separator" />
        <div className="terminal-panel__header__group">
          <button
            className={clsx(
              'terminal-panel__header__action terminal-panel__header__group__action',
              {
                'terminal-panel__header__action--active': console.preserveLog,
              },
            )}
            title="Toggle Preserve Console"
            tabIndex={-1}
            onClick={() => console.setPreserveLog(!console.preserveLog)}
          >
            <HistoryIcon className="terminal-panel__header__action__icon" />
          </button>
          <button
            className="terminal-panel__header__action terminal-panel__header__group__action"
            title="Clear Console"
            tabIndex={-1}
            onClick={() => {
              console.clear();
              console.focus();
            }}
          >
            <TrashIcon className="terminal-panel__header__action__icon" />
          </button>
          <button
            className="terminal-panel__header__action terminal-panel__header__group__action"
            title="Show Help"
            tabIndex={-1}
            onClick={() => console.showHelp()}
          >
            <QuestionCircleIcon className="terminal-panel__header__action__icon" />
          </button>
        </div>
      </div>
      <div ref={ref} className="terminal-panel__content" />
    </div>
  );
});
