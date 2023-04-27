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
  AnchorLinkIcon,
  CircleIcon,
  ContextMenu,
  MenuContent,
  MenuContentItem,
  ThinChevronLeftIcon,
  ThinChevronRightIcon,
  clsx,
  useResizeDetector,
} from '@finos/legend-art';
import {
  DATA_SPACE_VIEWER_ACTIVITY_MODE,
  generateAnchorForActivity,
  type DataSpaceViewerState,
  generateAnchorForDiagram,
} from '../stores/DataSpaceViewerState.js';
import { observer } from 'mobx-react-lite';
import { forwardRef, useEffect, useRef } from 'react';
import { type Diagram } from '@finos/legend-extension-dsl-diagram/graph';
import { DiagramRenderer } from '@finos/legend-extension-dsl-diagram/application';
import { DataSpaceWikiPlaceholder } from './DataSpacePlaceholder.js';

const DataSpaceDiagramCanvas = observer(
  forwardRef<
    HTMLDivElement,
    {
      dataSpaceViewerState: DataSpaceViewerState;
      diagram: Diagram;
    }
  >(function DataSpaceDiagramCanvas(props, ref) {
    const { dataSpaceViewerState, diagram } = props;
    const diagramViewerState = dataSpaceViewerState.diagramViewerState;
    const diagramCanvasRef = ref as React.MutableRefObject<HTMLDivElement>;

    const { width, height } = useResizeDetector<HTMLDivElement>({
      refreshMode: 'debounce',
      refreshRate: 50,
      targetRef: diagramCanvasRef,
    });

    useEffect(() => {
      const renderer = new DiagramRenderer(diagramCanvasRef.current, diagram);
      diagramViewerState.setDiagramRenderer(renderer);
      diagramViewerState.setupDiagramRenderer();
      renderer.render({ initial: true });
    }, [diagramCanvasRef, diagramViewerState, diagram]);

    useEffect(() => {
      if (diagramViewerState.isDiagramRendererInitialized) {
        diagramViewerState.diagramRenderer.refresh();
      }
    }, [diagramViewerState, width, height]);

    // actions
    const queryClass = (): void => {
      if (diagramViewerState.contextMenuClassView) {
        dataSpaceViewerState.queryClass(
          diagramViewerState.contextMenuClassView.class.value,
        );
      }
    };
    const viewClassDocumentation = (): void => {
      if (
        diagramViewerState.contextMenuClassView &&
        dataSpaceViewerState.modelsDocumentationState.hasClassDocumentation(
          diagramViewerState.contextMenuClassView.class.value.path,
        )
      ) {
        dataSpaceViewerState.modelsDocumentationState.viewClassDocumentation(
          diagramViewerState.contextMenuClassView.class.value.path,
        );
        dataSpaceViewerState.changeZone(
          generateAnchorForActivity(
            DATA_SPACE_VIEWER_ACTIVITY_MODE.MODELS_DOCUMENTATION,
          ),
        );
      }
    };

    return (
      <ContextMenu
        className="data-space__viewer__diagram-viewer__canvas"
        content={
          <MenuContent>
            <MenuContentItem
              onClick={queryClass}
              disabled={!diagramViewerState.contextMenuClassView}
            >
              Query
            </MenuContentItem>
            <MenuContentItem
              onClick={viewClassDocumentation}
              disabled={
                !diagramViewerState.contextMenuClassView ||
                !dataSpaceViewerState.modelsDocumentationState.hasClassDocumentation(
                  diagramViewerState.contextMenuClassView.class.value.path,
                )
              }
            >
              View Documentation
            </MenuContentItem>
          </MenuContent>
        }
        disabled={!diagramViewerState.contextMenuClassView}
        menuProps={{ elevation: 7 }}
        onClose={(): void =>
          diagramViewerState.setContextMenuClassView(undefined)
        }
      >
        <div
          ref={diagramCanvasRef}
          className={clsx(
            'diagram-canvas',
            diagramViewerState.diagramCursorClass,
          )}
          tabIndex={0}
        />
      </ContextMenu>
    );
  }),
);

export const DataSpaceDiagramViewer = observer(
  (props: { dataSpaceViewerState: DataSpaceViewerState }) => {
    const { dataSpaceViewerState } = props;
    const diagramViewerState = dataSpaceViewerState.diagramViewerState;
    const analysisResult = dataSpaceViewerState.dataSpaceAnalysisResult;
    const sectionRef = useRef<HTMLDivElement>(null);
    const anchor = generateAnchorForActivity(
      DATA_SPACE_VIEWER_ACTIVITY_MODE.DIAGRAM_VIEWER,
    );

    useEffect(() => {
      if (sectionRef.current) {
        dataSpaceViewerState.layoutState.setWikiPageAnchor(
          anchor,
          sectionRef.current,
        );
      }
      return () => dataSpaceViewerState.layoutState.unsetWikiPageAnchor(anchor);
    }, [dataSpaceViewerState, anchor]);

    const diagramCanvasRef = useRef<HTMLDivElement>(null);
    const previousDiagram = diagramViewerState.previousDiagram;
    const nextDiagram = diagramViewerState.nextDiagram;

    const showPreviousDiagram = (): void => {
      if (previousDiagram) {
        diagramViewerState.setCurrentDiagram(previousDiagram);
        dataSpaceViewerState.syncZoneWithNavigation(
          generateAnchorForDiagram(previousDiagram),
        );
      }
    };
    const showNextDiagram = (): void => {
      if (nextDiagram) {
        diagramViewerState.setCurrentDiagram(nextDiagram);
        dataSpaceViewerState.syncZoneWithNavigation(
          generateAnchorForDiagram(nextDiagram),
        );
      }
    };

    return (
      <div ref={sectionRef} className="data-space__viewer__wiki__section">
        <div className="data-space__viewer__wiki__section__header">
          <div className="data-space__viewer__wiki__section__header__label">
            Diagrams
            <button
              className="data-space__viewer__wiki__section__header__anchor"
              tabIndex={-1}
              onClick={() => dataSpaceViewerState.changeZone(anchor, true)}
            >
              <AnchorLinkIcon />
            </button>
          </div>
        </div>
        <div className="data-space__viewer__wiki__section__content">
          {analysisResult.diagrams.length > 0 && (
            <div className="data-space__viewer__diagram-viewer">
              <div className="data-space__viewer__diagram-viewer__carousel">
                <div className="data-space__viewer__diagram-viewer__carousel__frame">
                  <div className="data-space__viewer__diagram-viewer__carousel__frame__display">
                    {diagramViewerState.currentDiagram && (
                      <DataSpaceDiagramCanvas
                        dataSpaceViewerState={dataSpaceViewerState}
                        diagram={diagramViewerState.currentDiagram.diagram}
                        ref={diagramCanvasRef}
                      />
                    )}
                  </div>
                  <button
                    className="data-space__viewer__diagram-viewer__carousel__frame__navigator data-space__viewer__diagram-viewer__carousel__frame__navigator--back"
                    tabIndex={-1}
                    title={`Previous - ${
                      previousDiagram && previousDiagram.title
                        ? previousDiagram.title
                        : '(untitled)'
                    }`}
                    disabled={!previousDiagram}
                    onClick={showPreviousDiagram}
                  >
                    <ThinChevronLeftIcon />
                  </button>
                  <button
                    className="data-space__viewer__diagram-viewer__carousel__frame__navigator data-space__viewer__diagram-viewer__carousel__frame__navigator--next"
                    tabIndex={-1}
                    title={`Next - ${
                      nextDiagram && nextDiagram.title
                        ? nextDiagram.title
                        : '(untitled)'
                    }`}
                    disabled={!nextDiagram}
                    onClick={showNextDiagram}
                  >
                    <ThinChevronRightIcon />
                  </button>
                  <div className="data-space__viewer__diagram-viewer__carousel__frame__indicators">
                    <div className="data-space__viewer__diagram-viewer__carousel__frame__indicators__notch">
                      {analysisResult.diagrams.map((diagram) => (
                        <button
                          key={diagram.uuid}
                          className={clsx(
                            'data-space__viewer__diagram-viewer__carousel__frame__indicator',
                            {
                              'data-space__viewer__diagram-viewer__carousel__frame__indicator--active':
                                diagramViewerState.currentDiagram === diagram,
                            },
                          )}
                          title={`View Diagram - ${
                            diagram.title ? diagram.title : '(untitled)'
                          }`}
                          onClick={() => {
                            diagramViewerState.setCurrentDiagram(diagram);
                            dataSpaceViewerState.syncZoneWithNavigation(
                              generateAnchorForDiagram(diagram),
                            );
                          }}
                        >
                          <CircleIcon />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          {analysisResult.diagrams.length <= 0 && (
            <DataSpaceWikiPlaceholder message="(not specified)" />
          )}
        </div>
      </div>
    );
  },
);
