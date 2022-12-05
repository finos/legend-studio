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

import { useCallback, useEffect, useRef } from 'react';
import { observer } from 'mobx-react-lite';
import type { DiagramEditorState } from '../../../stores/DiagramEditorState.js';
import { DiagramRenderer, Point } from '@finos/legend-extension-dsl-diagram';
import { type DropTargetMonitor, useDrop } from 'react-dnd';
import { CONCEPT_TREE_DND_TYPE } from '../side-bar/ConceptTreeExplorer.js';
import { ConceptNode } from '../../../server/models/ConceptTree.js';
import { flowResult } from 'mobx';
import { useApplicationStore } from '@finos/legend-application';
import { useResizeDetector } from '@finos/legend-art';

const DiagramCanvas = observer(
  (props: { diagramEditorState: DiagramEditorState }) => {
    const { diagramEditorState } = props;
    const applicationStore = useApplicationStore();
    const diagram = diagramEditorState.diagram;
    const diagramCanvasRef = useRef<HTMLDivElement>(null);

    const { width, height } = useResizeDetector<HTMLDivElement>({
      refreshMode: 'debounce',
      refreshRate: 50,
      targetRef: diagramCanvasRef,
    });

    // Drag and Drop
    const handleDrop = useCallback(
      (item: ConceptNode, monitor: DropTargetMonitor): void => {
        if (item instanceof ConceptNode) {
          const dropPosition = monitor.getClientOffset();
          const position = dropPosition
            ? diagramEditorState.renderer.canvasCoordinateToModelCoordinate(
                diagramEditorState.renderer.eventCoordinateToCanvasCoordinate(
                  new Point(dropPosition.x, dropPosition.y),
                ),
              )
            : undefined;
          flowResult(
            diagramEditorState.addClassView(item.li_attr.pureId, position),
          ).catch(applicationStore.alertUnhandledError);
        }
      },
      [applicationStore, diagramEditorState],
    );
    const [, dropConnector] = useDrop(
      () => ({
        accept: CONCEPT_TREE_DND_TYPE.CLASS,
        drop: (item: ConceptNode, monitor): void => handleDrop(item, monitor),
      }),
      [handleDrop],
    );
    dropConnector(diagramCanvasRef);

    useEffect(() => {
      if (diagramCanvasRef.current) {
        const renderer = new DiagramRenderer(diagramCanvasRef.current, diagram);
        diagramEditorState.setRenderer(renderer);
        diagramEditorState.setupRenderer();
        renderer.render();
        renderer.autoRecenter();
      }
    }, [diagramCanvasRef, diagramEditorState, diagram]);

    useEffect(() => {
      if (diagramEditorState.isDiagramRendererInitialized) {
        diagramEditorState.renderer.refresh();
      }
    }, [diagramEditorState, width, height]);

    return (
      <div
        ref={diagramCanvasRef}
        className="diagram-canvas"
        tabIndex={0}
        onContextMenu={(event): void => event.preventDefault()}
      />
    );
  },
);

export const DiagramEditor = observer(
  (props: { editorState: DiagramEditorState }) => {
    const { editorState } = props;

    return (
      <div className="panel edit-panel">
        <div className="panel__header"></div>
        <div className="panel__content edit-panel__content">
          <DiagramCanvas diagramEditorState={editorState} />
        </div>
      </div>
    );
  },
);
