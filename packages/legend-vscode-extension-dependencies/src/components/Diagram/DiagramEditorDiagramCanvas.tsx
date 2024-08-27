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
import { clsx, useResizeDetector } from '@finos/legend-art';
import {
  type Diagram,
  DiagramRenderer,
  Point,
  V1_diagramModelSchema,
  V1_transformDiagram,
} from '@finos/legend-extension-dsl-diagram';
import { Class } from '@finos/legend-graph';
import { observer } from 'mobx-react-lite';
import { flowResult } from 'mobx';
import {
  forwardRef,
  useEffect,
  type DragEvent,
  type KeyboardEvent,
} from 'react';
import { serialize } from 'serializr';
import { DIAGRAM_DROP_CLASS_ERROR, WRITE_ENTITY } from '../../utils/Const.js';
import type { DiagramEditorState } from '../../stores/DiagramEditorState.js';
import { postMessage } from '../../utils/VsCodeUtils.js';

export const DiagramEditorDiagramCanvas = observer(
  forwardRef<
    HTMLDivElement,
    {
      diagramEditorState: DiagramEditorState;
    }
  >(function DiagramEditorDiagramCanvas(props, ref) {
    const { diagramEditorState } = props;
    const diagram = diagramEditorState.diagram;
    const diagramCanvasRef = ref as React.MutableRefObject<HTMLDivElement>;

    const { width, height } = useResizeDetector<HTMLDivElement>({
      refreshMode: 'debounce',
      refreshRate: 50,
      targetRef: diagramCanvasRef,
    });

    useEffect(() => {
      if (diagram) {
        const renderer = new DiagramRenderer(diagramCanvasRef.current, diagram);
        diagramEditorState.setRenderer(renderer);
        diagramEditorState.setupRenderer();
        renderer.render({ initial: true });
      }
    }, [diagramCanvasRef, diagramEditorState, diagram]);

    useEffect(() => {
      // since after the diagram render is initialized, we start
      // showing the toolbar and the header, which causes the auto-zoom fit
      // to be off, we need to call this method again
      if (diagramEditorState.isDiagramRendererInitialized) {
        diagramEditorState.renderer.render({ initial: true });
      }
    }, [diagramEditorState, diagramEditorState.isDiagramRendererInitialized]);

    useEffect(() => {
      if (diagramEditorState.isDiagramRendererInitialized) {
        diagramEditorState.renderer.refresh();
      }
    }, [diagramEditorState, width, height]);

    const dropTarget = document.getElementById('root') ?? document.body;

    dropTarget.addEventListener('dragover', (event) => {
      // accept any DnD
      event.preventDefault();
    });

    const drop = (event: DragEvent) => {
      event.preventDefault();
      const droppedEntityIds: string[] = (
        JSON.parse(
          event.dataTransfer.getData(
            'application/vnd.code.tree.legendConceptTree',
          ),
        ).itemHandles as string[]
      ).map((item) => item.split('/')[1] ?? '');
      const position =
        diagramEditorState.renderer.canvasCoordinateToModelCoordinate(
          diagramEditorState.renderer.eventCoordinateToCanvasCoordinate(
            new Point(event.clientX, event.clientY),
          ),
        );

      droppedEntityIds
        .filter((entityId) => {
          const isClassInstance =
            diagramEditorState.graph?.getElement(entityId) instanceof Class;
          if (!isClassInstance) {
            postMessage({
              command: DIAGRAM_DROP_CLASS_ERROR,
            });
          }
          return isClassInstance;
        })
        .forEach((entityId) => {
          flowResult(diagramEditorState.addClassView(entityId, position)).catch(
            // eslint-disable-next-line no-console
            (error: unknown) => console.error(error),
          );
        });
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault();

        postMessage({
          command: WRITE_ENTITY,
          msg: serialize(
            V1_diagramModelSchema,
            V1_transformDiagram(
              diagramEditorState._renderer?.diagram as Diagram,
            ),
          ),
        });
      }
    };

    return (
      <div
        onDrop={drop}
        onKeyDown={handleKeyDown}
        ref={diagramCanvasRef}
        className={clsx(
          'diagram-canvas diagram-editor__canvas',
          diagramEditorState.diagramCursorClass,
        )}
        tabIndex={0}
      />
    );
  }),
);
