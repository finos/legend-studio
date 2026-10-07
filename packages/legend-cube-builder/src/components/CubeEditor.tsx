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
import { CubeNodeList } from './graph/CubeNodeList.js';

const CubeGraphRegion = observer((props: { editorState: CubeEditorState }) => {
  const { editorState } = props;
  return (
    <div
      className="flex h-full flex-col bg-[var(--color-bg-panel)]"
      data-testid={LEGEND_CUBE_TEST_ID.GRAPH_REGION}
    >
      <div className="flex h-8 shrink-0 items-center gap-2 border-b border-[var(--color-border-default)] bg-[var(--color-bg-panel-header)] px-2">
        <span className="truncate text-lg font-medium">
          {editorState.document.name ?? UNSAVED_CUBE_NAME}
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <CubeNodeList
          editorState={editorState}
          emptyState="No tables yet: add a table to start."
        />
      </div>
    </div>
  );
});

const CubeGridRegion: React.FC = () => (
  <div
    className="flex h-full items-center justify-center bg-[var(--color-bg-panel)] text-base text-[var(--color-text-secondary)]"
    data-testid={LEGEND_CUBE_TEST_ID.GRID_REGION}
  >
    Execute the query to see its rows.
  </div>
);

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
            <CubeGridRegion />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    );
  },
);
