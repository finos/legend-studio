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
import type { Diagram } from '@finos/legend-extension-dsl-diagram';
import { getDiagram } from '@finos/legend-extension-dsl-diagram';
import type { Entity } from '@finos/legend-storage';
import { useRef, useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import '../../../style/index.scss';
import { postMessage } from '../../utils/VsCodeUtils.js';
import {
  GET_PROJECT_ENTITIES,
  GET_PROJECT_ENTITIES_RESPONSE,
} from '../../utils/Const.js';
import { getPureGraph } from '../../graph-manager/index.js';
import type { DiagramEditorState } from '../../stores/DiagramEditorState.js';
import { LegendStyleProvider } from '@finos/legend-art';
import { DiagramEditorHeader } from './DiagramHeader.js';
import { DiagramEditorDiagramCanvas } from './DiagramEditorDiagramCanvas.js';
import { DiagramEditorToolPanel } from './DiagramEditorToolPanel.js';

export const DiagramEditor = observer(
  (props: { diagramId: string; diagramEditorState: DiagramEditorState }) => {
    const diagramCanvasRef = useRef<HTMLDivElement>(null);
    const { diagramId, diagramEditorState } = props;
    const [diagram, setDiagram] = useState<Diagram | null>(null);
    const [entities, setEntities] = useState<Entity[]>([]);
    const [error, setError] = useState<string | null>();

    useEffect(() => {
      postMessage({
        command: GET_PROJECT_ENTITIES,
      });
    }, [diagramId]);

    window.addEventListener(
      'message',
      (event: MessageEvent<{ result: Entity[]; command: string }>) => {
        const message = event.data;
        if (message.command === GET_PROJECT_ENTITIES_RESPONSE) {
          const es: Entity[] = message.result;
          setEntities(es);
        }
      },
    );

    useEffect(() => {
      if (entities.length && diagramId) {
        getPureGraph(entities, [])
          .then((pureModel) => {
            const diagram = getDiagram(diagramId, pureModel);
            setDiagram(diagram);
            diagramEditorState.setDiagram(diagram);
            diagramEditorState.setGraph(pureModel);
            setError(null);
          })
          .catch((e) => {
            setError(e.message);
            setDiagram(null);
          });
      }
    }, [entities, diagramId]);

    return (
      <LegendStyleProvider>
        <div className="diagram-editor">
          {error ? (
            <div className="diagram-editor__error">
              <span>Something went wrong. Diagram cannot be created.</span>
              <span
                className="diagram-editor__error__details"
                title={`${error}`}
              >
                Error Details.
              </span>
            </div>
          ) : (
            <>
              <div className="diagram-editor__header">
                {diagramEditorState.isDiagramRendererInitialized && (
                  <DiagramEditorHeader
                    diagramEditorState={diagramEditorState}
                  />
                )}
              </div>
              <div className="diagram-editor__content">
                <div className="diagram-editor__stage">
                  {diagramEditorState.isDiagramRendererInitialized && (
                    <DiagramEditorToolPanel
                      diagramEditorState={diagramEditorState}
                    />
                  )}
                  <DiagramEditorDiagramCanvas
                    diagramEditorState={diagramEditorState}
                    ref={diagramCanvasRef}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </LegendStyleProvider>
    );
  },
);
