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
  ResizablePanel,
  ResizablePanelGroup,
  ResizablePanelSplitter,
} from '@finos/legend-art';
import type { CubeDocument } from '@finos/legend-cube';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { UNSAVED_CUBE_NAME } from '../__lib__/LegendCubeLabels.js';
import { LEGEND_CUBE_TEST_ID } from '../__lib__/LegendCubeTesting.js';
import { CubeEditorState } from '../stores/CubeEditorState.js';
import type { CubeHost } from '../stores/CubeHost.js';
import { CubeButton } from './CubeButton.js';
import { CubeNodeList } from './graph/CubeNodeList.js';
import { CubeGridRegion } from './grid/CubeGridRegion.js';
import { CubeSourcePicker } from './source-picker/CubeSourcePicker.js';

const CubeGraphRegion = observer((props: { editorState: CubeEditorState }) => {
  const { editorState } = props;
  return (
    <div
      className="flex h-full flex-col bg-[var(--color-bg-panel)]"
      data-testid={LEGEND_CUBE_TEST_ID.GRAPH_REGION}
    >
      <div className="flex h-8 shrink-0 items-center gap-2 border-b border-[var(--color-border-default)] bg-[var(--color-bg-panel-header)] px-2">
        <span className="min-w-0 flex-1 truncate text-lg font-medium">
          {editorState.document.name ?? UNSAVED_CUBE_NAME}
        </span>
        <CubeButton onClick={() => editorState.sourcePicker.open()}>
          Add table
        </CubeButton>
        <CubeButton
          title="Undo the last change"
          disabled={!editorState.canUndo}
          onClick={() => editorState.undo()}
        >
          Undo
        </CubeButton>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <CubeNodeList
          editorState={editorState}
          emptyState={
            <div className="flex flex-col items-center gap-2">
              <span>No tables yet: add a table to start.</span>
              <CubeButton
                primary={true}
                onClick={() => editorState.sourcePicker.open()}
              >
                Add a table
              </CubeButton>
            </div>
          }
        />
      </div>
      <CubeSourcePicker editorState={editorState} />
    </div>
  );
});

/**
 * The Legend Cube page: the query above, its results below, both always
 * shown (PLAN §7.1). The host gives it the engine, the models and the
 * application store; the page's state lives as long as the page.
 */
export const CubeEditor = observer(
  (props: {
    host: CubeHost;
    /** The cube to open; an empty one by default */
    initialDocument?: CubeDocument | undefined;
  }) => {
    const [editorState] = useState(
      () => new CubeEditorState(props.host, props.initialDocument),
    );
    useEffect(() => () => editorState.dispose(), [editorState]);

    return (
      <div
        className="legend-cube flex flex-col bg-[var(--color-bg-app)] text-[var(--color-text-primary)]"
        data-testid={LEGEND_CUBE_TEST_ID.EDITOR}
      >
        <ResizablePanelGroup orientation="horizontal">
          <ResizablePanel minSize={96}>
            <CubeGraphRegion editorState={editorState} />
          </ResizablePanel>
          <ResizablePanelSplitter />
          <ResizablePanel minSize={96}>
            <CubeGridRegion editorState={editorState} />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    );
  },
);
