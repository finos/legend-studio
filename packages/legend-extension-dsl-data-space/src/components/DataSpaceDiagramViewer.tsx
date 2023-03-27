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

import {
  BlankPanelContent,
  ChevronLeftIcon,
  ChevronRightIcon,
  CircleIcon,
  clsx,
  useResizeDetector,
} from '@finos/legend-art';
import type { DataSpaceViewerState } from '../stores/DataSpaceViewerState.js';
import { observer } from 'mobx-react-lite';
import { forwardRef, useEffect, useRef } from 'react';
import {
  DiagramRenderer,
  type Diagram,
} from '@finos/legend-extension-dsl-diagram';
import {
  getNullableFirstElement,
  getNullableLastElement,
  guaranteeNonNullable,
} from '@finos/legend-shared';

const DataSpaceDiagramCanvas = observer(
  forwardRef<
    HTMLDivElement,
    {
      dataSpaceViewerState: DataSpaceViewerState;
      diagram: Diagram;
    }
  >(function DataSpaceDiagramCanvas(props, ref) {
    const { dataSpaceViewerState, diagram } = props;
    const diagramCanvasRef = ref as React.MutableRefObject<HTMLDivElement>;

    const { width, height } = useResizeDetector<HTMLDivElement>({
      refreshMode: 'debounce',
      refreshRate: 50,
      targetRef: diagramCanvasRef,
    });

    useEffect(() => {
      const renderer = new DiagramRenderer(diagramCanvasRef.current, diagram);
      dataSpaceViewerState.setRenderer(renderer);
      dataSpaceViewerState.setupRenderer();
      renderer.render({ initial: true });
    }, [diagramCanvasRef, dataSpaceViewerState, diagram]);

    useEffect(() => {
      if (dataSpaceViewerState.isDiagramRendererInitialized) {
        dataSpaceViewerState.renderer.refresh();
      }
    }, [dataSpaceViewerState, width, height]);

    return (
      <div
        ref={diagramCanvasRef}
        className={clsx(
          'diagram-canvas ',
          dataSpaceViewerState.diagramCursorClass,
        )}
        tabIndex={0}
      />
    );
  }),
);

export const DataSpaceDiagramViewer = observer(
  (props: { dataSpaceViewerState: DataSpaceViewerState }) => {
    const { dataSpaceViewerState } = props;
    const analysisResult = dataSpaceViewerState.dataSpaceAnalysisResult;

    // diagram selector
    const diagramCanvasRef = useRef<HTMLDivElement>(null);

    const showPreviousDiagram = (): void => {
      if (!dataSpaceViewerState.currentDiagram) {
        return;
      }
      const idx = analysisResult.featuredDiagrams.indexOf(
        dataSpaceViewerState.currentDiagram,
      );
      if (idx === 0 || idx === -1) {
        return;
      }
      dataSpaceViewerState.setCurrentDiagram(
        guaranteeNonNullable(analysisResult.featuredDiagrams[idx - 1]),
      );
    };
    const showNextDiagram = (): void => {
      if (!dataSpaceViewerState.currentDiagram) {
        return;
      }
      const idx = analysisResult.featuredDiagrams.indexOf(
        dataSpaceViewerState.currentDiagram,
      );
      if (idx === analysisResult.featuredDiagrams.length - 1 || idx === -1) {
        return;
      }
      dataSpaceViewerState.setCurrentDiagram(
        guaranteeNonNullable(analysisResult.featuredDiagrams[idx + 1]),
      );
    };

    if (analysisResult.featuredDiagrams.length === 0) {
      return <BlankPanelContent>No diagrams available</BlankPanelContent>;
    }
    return (
      <div className="data-space__viewer__diagram-viewer__carousel">
        <div className="data-space__viewer__diagram-viewer__carousel__frame">
          <div className="data-space__viewer__diagram-viewer__carousel__frame__display">
            {dataSpaceViewerState.currentDiagram && (
              <DataSpaceDiagramCanvas
                dataSpaceViewerState={dataSpaceViewerState}
                diagram={dataSpaceViewerState.currentDiagram}
                ref={diagramCanvasRef}
              />
            )}
          </div>
          <button
            className="data-space__viewer__diagram-viewer__carousel__frame__navigator data-space__viewer__diagram-viewer__carousel__frame__navigator--back"
            tabIndex={-1}
            title="Previous"
            disabled={
              getNullableFirstElement(analysisResult.featuredDiagrams) ===
              dataSpaceViewerState.currentDiagram
            }
            onClick={showPreviousDiagram}
          >
            <ChevronLeftIcon />
          </button>
          <button
            className="data-space__viewer__diagram-viewer__carousel__frame__navigator data-space__viewer__diagram-viewer__carousel__frame__navigator--next"
            tabIndex={-1}
            title="Previous"
            disabled={
              getNullableLastElement(analysisResult.featuredDiagrams) ===
              dataSpaceViewerState.currentDiagram
            }
            onClick={showNextDiagram}
          >
            <ChevronRightIcon />
          </button>
          <div className="data-space__viewer__diagram-viewer__carousel__frame__indicators">
            <div className="data-space__viewer__diagram-viewer__carousel__frame__indicators__notch">
              {analysisResult.featuredDiagrams.map((diagram) => (
                <button
                  key={diagram.path}
                  className={clsx(
                    'data-space__viewer__diagram-viewer__carousel__frame__indicator',
                    {
                      'data-space__viewer__diagram-viewer__carousel__frame__indicator--active':
                        dataSpaceViewerState.currentDiagram === diagram,
                    },
                  )}
                  onClick={() =>
                    dataSpaceViewerState.setCurrentDiagram(diagram)
                  }
                >
                  <CircleIcon />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  },
);
