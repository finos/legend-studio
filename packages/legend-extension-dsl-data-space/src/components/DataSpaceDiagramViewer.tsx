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
  CaretDownIcon,
  CenterFocusIcon,
  CircleIcon,
  CloseIcon,
  ContextMenu,
  CustomSelectorInput,
  DescriptionIcon,
  ControlledDropdownMenu,
  MenuContent,
  MenuContentDivider,
  MenuContentItem,
  MousePointerIcon,
  MoveIcon,
  ShapesIcon,
  ThinChevronDownIcon,
  ThinChevronLeftIcon,
  ThinChevronRightIcon,
  ThinChevronUpIcon,
  ZoomInIcon,
  ZoomOutIcon,
  clsx,
  useResizeDetector,
  createFilter,
} from '@finos/legend-art';
import { type DataSpaceViewerState } from '../stores/DataSpaceViewerState.js';
import { observer } from 'mobx-react-lite';
import { forwardRef, useEffect, useRef } from 'react';
import { type Diagram } from '@finos/legend-extension-dsl-diagram/graph';
import {
  DIAGRAM_INTERACTION_MODE,
  DIAGRAM_RELATIONSHIP_EDIT_MODE,
  DIAGRAM_ZOOM_LEVELS,
  DiagramRenderer,
} from '@finos/legend-extension-dsl-diagram/application';
import { DataSpaceWikiPlaceholder } from './DataSpacePlaceholder.js';
import { at } from '@finos/legend-shared';
import { DataSpaceMarkdownTextViewer } from './DataSpaceMarkdownTextViewer.js';
import { useCommands } from '@finos/legend-application';
import {
  DATA_SPACE_VIEWER_ACTIVITY_MODE,
  generateAnchorForActivity,
  generateAnchorForDiagram,
} from '../stores/DataSpaceViewerNavigation.js';
import type { DataSpaceDiagramAnalysisResult } from '../graph-manager/action/analytics/DataSpaceAnalysis.js';

const DataSpaceDiagramCanvas = observer(
  forwardRef<
    HTMLDivElement,
    {
      dataSpaceViewerState: DataSpaceViewerState;
      diagram: Diagram;
    }
  >(function DataSpaceDiagramCanvas(props, _ref) {
    const { dataSpaceViewerState, diagram } = props;
    const diagramViewerState = dataSpaceViewerState.diagramViewerState;
    const ref = _ref as React.RefObject<HTMLDivElement>;
    const descriptionText = diagramViewerState.currentDiagram?.description;

    const { width, height } = useResizeDetector<HTMLDivElement>({
      refreshMode: 'debounce',
      refreshRate: 50,
      targetRef: ref,
    });

    useEffect(() => {
      diagramViewerState.setExpandDescription(false);
    }, [diagramViewerState, diagramViewerState.currentDiagram]);

    useEffect(() => {
      const renderer = new DiagramRenderer(ref.current, diagram);
      diagramViewerState.setDiagramRenderer(renderer);
      diagramViewerState.setupDiagramRenderer();
      renderer.render({ initial: true });
    }, [ref, diagramViewerState, diagram]);

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
              See Model Documentation
            </MenuContentItem>
          </MenuContent>
        }
        disabled={!diagramViewerState.contextMenuClassView}
        menuProps={{ elevation: 7 }}
        onClose={(): void =>
          diagramViewerState.setContextMenuClassView(undefined)
        }
      >
        {diagramViewerState.showDescription && (
          <div
            className={clsx('data-space__viewer__diagram-viewer__description', {
              'data-space__viewer__diagram-viewer__description--expanded':
                diagramViewerState.expandDescription,
            })}
          >
            <button
              className="data-space__viewer__diagram-viewer__description__close-btn"
              tabIndex={-1}
              title="Hide Description"
              onClick={() => diagramViewerState.setShowDescription(false)}
            >
              <CloseIcon />
            </button>
            <div className="data-space__viewer__diagram-viewer__description__title">
              {diagramViewerState.currentDiagram?.title
                ? diagramViewerState.currentDiagram.title
                : 'Untitled'}
            </div>
            <div className="data-space__viewer__diagram-viewer__description__content">
              {descriptionText ? (
                <DataSpaceMarkdownTextViewer value={descriptionText} />
              ) : (
                <div className="data-space__viewer__diagram-viewer__description__content__placeholder">
                  (not specified)
                </div>
              )}
            </div>
            <button
              className="data-space__viewer__diagram-viewer__description__expand-btn"
              tabIndex={-1}
              title={
                diagramViewerState.expandDescription ? 'Collapse' : 'Expand'
              }
              onClick={() =>
                diagramViewerState.setExpandDescription(
                  !diagramViewerState.expandDescription,
                )
              }
            >
              {diagramViewerState.expandDescription ? (
                <ThinChevronUpIcon />
              ) : (
                <ThinChevronDownIcon />
              )}
            </button>
          </div>
        )}
        <div
          ref={ref}
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

type DiagramOption = {
  label: React.ReactNode;
  value: DataSpaceDiagramAnalysisResult;
};
const buildDiagramOption = (
  diagram: DataSpaceDiagramAnalysisResult,
): DiagramOption => ({
  label: (
    <div className="data-space__viewer__diagram-viewer__header__navigation__selector__label">
      <ShapesIcon className="data-space__viewer__diagram-viewer__header__navigation__selector__icon" />
      <div className="data-space__viewer__diagram-viewer__header__navigation__selector__title">
        {diagram.title ? diagram.title : 'Untitled'}
      </div>
    </div>
  ),
  value: diagram,
});

const DataSpaceDiagramViewerHeader = observer(
  (props: { dataSpaceViewerState: DataSpaceViewerState }) => {
    const { dataSpaceViewerState } = props;
    const applicationStore = dataSpaceViewerState.applicationStore;
    const diagramViewerState = dataSpaceViewerState.diagramViewerState;
    const diagramOptions =
      dataSpaceViewerState.dataSpaceAnalysisResult.diagrams.map(
        buildDiagramOption,
      );
    const selectedDiagramOption = diagramViewerState.currentDiagram
      ? buildDiagramOption(diagramViewerState.currentDiagram)
      : null;
    const onDiagramOptionChange = (option: DiagramOption): void => {
      if (option.value !== diagramViewerState.currentDiagram) {
        diagramViewerState.setCurrentDiagram(option.value);
      }
    };
    const diagramFilterOption = createFilter({
      ignoreCase: true,
      ignoreAccents: false,
      stringify: (option: { data: DiagramOption }) => option.data.value.title,
    });
    const createModeSwitcher =
      (
        editMode: DIAGRAM_INTERACTION_MODE,
        relationshipMode: DIAGRAM_RELATIONSHIP_EDIT_MODE,
      ): (() => void) =>
      (): void =>
        diagramViewerState.diagramRenderer.changeMode(
          editMode,
          relationshipMode,
        );
    const createCenterZoomer =
      (zoomLevel: number): (() => void) =>
      (): void => {
        diagramViewerState.diagramRenderer.zoomCenter(zoomLevel / 100);
      };
    const zoomToFit = (): void =>
      diagramViewerState.diagramRenderer.zoomToFit();

    return (
      <div className="data-space__viewer__diagram-viewer__header">
        <div className="data-space__viewer__diagram-viewer__header__navigation">
          <CustomSelectorInput
            className="data-space__viewer__diagram-viewer__header__navigation__selector"
            options={diagramOptions}
            onChange={onDiagramOptionChange}
            value={selectedDiagramOption}
            placeholder="Search for a diagram"
            darkMode={
              !applicationStore.layoutService
                .TEMPORARY__isLightColorThemeEnabled
            }
            filterOption={diagramFilterOption}
          />
          <div className="data-space__viewer__diagram-viewer__header__navigation__pager">
            <input
              className="data-space__viewer__diagram-viewer__header__navigation__pager__input input--dark"
              value={diagramViewerState.currentDiagramIndex}
              type="number"
              onChange={(event) => {
                const value = parseInt(event.target.value, 10);
                if (
                  isNaN(value) ||
                  value < 1 ||
                  value >
                    dataSpaceViewerState.dataSpaceAnalysisResult.diagrams.length
                ) {
                  return;
                }
                diagramViewerState.setCurrentDiagram(
                  at(
                    dataSpaceViewerState.dataSpaceAnalysisResult.diagrams,
                    value - 1,
                  ),
                );
              }}
            />
          </div>
          <div className="data-space__viewer__diagram-viewer__header__navigation__pager__count">
            /{dataSpaceViewerState.dataSpaceAnalysisResult.diagrams.length}
          </div>
        </div>
        <div className="data-space__viewer__diagram-viewer__header__actions">
          {diagramViewerState.isDiagramRendererInitialized && (
            <>
              <div className="data-space__viewer__diagram-viewer__header__group">
                <button
                  className="data-space__viewer__diagram-viewer__header__tool"
                  tabIndex={-1}
                  onClick={(): void => {
                    if (diagramViewerState.currentDiagram) {
                      dataSpaceViewerState.syncZoneWithNavigation(
                        generateAnchorForDiagram(
                          diagramViewerState.currentDiagram,
                        ),
                      );
                    }
                  }}
                  title="Copy Link"
                >
                  <AnchorLinkIcon />
                </button>
                <button
                  className="data-space__viewer__diagram-viewer__header__tool"
                  tabIndex={-1}
                  onClick={() => diagramViewerState.diagramRenderer.recenter()}
                  title="Recenter (R)"
                >
                  <CenterFocusIcon className="data-space__viewer__diagram-viewer__icon--recenter" />
                </button>
                <button
                  className={clsx(
                    'data-space__viewer__diagram-viewer__header__tool',
                    {
                      'data-space__viewer__diagram-viewer__header__tool--active':
                        diagramViewerState.showDescription,
                    },
                  )}
                  tabIndex={-1}
                  onClick={() =>
                    diagramViewerState.setShowDescription(
                      !diagramViewerState.showDescription,
                    )
                  }
                  title="Toggle Description (D)"
                >
                  <DescriptionIcon className="data-space__viewer__diagram-viewer__icon--description" />
                </button>
              </div>
              <div className="data-space__viewer__diagram-viewer__header__group__separator" />
              <div className="data-space__viewer__diagram-viewer__header__group">
                <button
                  className={clsx(
                    'data-space__viewer__diagram-viewer__header__tool',
                    {
                      'data-space__viewer__diagram-viewer__header__tool--active':
                        diagramViewerState.diagramRenderer.interactionMode ===
                        DIAGRAM_INTERACTION_MODE.LAYOUT,
                    },
                  )}
                  tabIndex={-1}
                  onClick={createModeSwitcher(
                    DIAGRAM_INTERACTION_MODE.LAYOUT,
                    DIAGRAM_RELATIONSHIP_EDIT_MODE.NONE,
                  )}
                  title="View Tool (V)"
                >
                  <MousePointerIcon className="data-space__viewer__diagram-viewer__icon--layout" />
                </button>
                <button
                  className={clsx(
                    'data-space__viewer__diagram-viewer__header__tool',
                    {
                      'data-space__viewer__diagram-viewer__header__tool--active':
                        diagramViewerState.diagramRenderer.interactionMode ===
                        DIAGRAM_INTERACTION_MODE.PAN,
                    },
                  )}
                  tabIndex={-1}
                  onClick={createModeSwitcher(
                    DIAGRAM_INTERACTION_MODE.PAN,
                    DIAGRAM_RELATIONSHIP_EDIT_MODE.NONE,
                  )}
                  title="Pan Tool (M)"
                >
                  <MoveIcon className="data-space__viewer__diagram-viewer__icon--pan" />
                </button>
                <button
                  className={clsx(
                    'data-space__viewer__diagram-viewer__header__tool',
                    {
                      'data-space__viewer__diagram-viewer__header__tool--active':
                        diagramViewerState.diagramRenderer.interactionMode ===
                        DIAGRAM_INTERACTION_MODE.ZOOM_IN,
                    },
                  )}
                  tabIndex={-1}
                  title="Zoom In (Z)"
                  onClick={createModeSwitcher(
                    DIAGRAM_INTERACTION_MODE.ZOOM_IN,
                    DIAGRAM_RELATIONSHIP_EDIT_MODE.NONE,
                  )}
                >
                  <ZoomInIcon className="data-space__viewer__diagram-viewer__icon--zoom-in" />
                </button>
                <button
                  className={clsx(
                    'data-space__viewer__diagram-viewer__header__tool',
                    {
                      'data-space__viewer__diagram-viewer__header__tool--active':
                        diagramViewerState.diagramRenderer.interactionMode ===
                        DIAGRAM_INTERACTION_MODE.ZOOM_OUT,
                    },
                  )}
                  tabIndex={-1}
                  title="Zoom Out (Z)"
                  onClick={createModeSwitcher(
                    DIAGRAM_INTERACTION_MODE.ZOOM_OUT,
                    DIAGRAM_RELATIONSHIP_EDIT_MODE.NONE,
                  )}
                >
                  <ZoomOutIcon className="data-space__viewer__diagram-viewer__icon--zoom-out" />
                </button>
              </div>
              <div className="data-space__viewer__diagram-viewer__header__group__separator" />
              <ControlledDropdownMenu
                className="data-space__viewer__diagram-viewer__header__group data-space__viewer__diagram-viewer__header__dropdown"
                title="Zoom..."
                content={
                  <MenuContent>
                    <MenuContentItem
                      className="data-space__viewer__diagram-viewer__header__zoomer__dropdown__menu__item"
                      onClick={zoomToFit}
                    >
                      Fit
                    </MenuContentItem>
                    <MenuContentDivider />
                    {DIAGRAM_ZOOM_LEVELS.map((zoomLevel) => (
                      <MenuContentItem
                        key={zoomLevel}
                        className="data-space__viewer__diagram-viewer__header__zoomer__dropdown__menu__item"
                        onClick={createCenterZoomer(zoomLevel)}
                      >
                        {zoomLevel}%
                      </MenuContentItem>
                    ))}
                  </MenuContent>
                }
                menuProps={{
                  anchorOrigin: { vertical: 'bottom', horizontal: 'right' },
                  transformOrigin: { vertical: 'top', horizontal: 'right' },
                  elevation: 7,
                }}
              >
                <div className="data-space__viewer__diagram-viewer__header__dropdown__label data-space__viewer__diagram-viewer__header__zoomer__dropdown__label">
                  {Math.round(diagramViewerState.diagramRenderer.zoom * 100)}%
                </div>
                <div className="data-space__viewer__diagram-viewer__header__dropdown__trigger data-space__viewer__diagram-viewer__header__zoomer__dropdown__trigger">
                  <CaretDownIcon />
                </div>
              </ControlledDropdownMenu>
            </>
          )}
        </div>
      </div>
    );
  },
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

    useCommands(diagramViewerState);

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
              <DataSpaceDiagramViewerHeader
                dataSpaceViewerState={dataSpaceViewerState}
              />
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
                      previousDiagram?.title
                        ? previousDiagram.title
                        : '(untitled)'
                    } (⇦)`}
                    disabled={!previousDiagram}
                    onClick={showPreviousDiagram}
                  >
                    <ThinChevronLeftIcon />
                  </button>
                  <button
                    className="data-space__viewer__diagram-viewer__carousel__frame__navigator data-space__viewer__diagram-viewer__carousel__frame__navigator--next"
                    tabIndex={-1}
                    title={`Next - ${
                      nextDiagram?.title ? nextDiagram.title : '(untitled)'
                    } (⇨)`}
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
          {!analysisResult.diagrams.length && (
            <DataSpaceWikiPlaceholder message="(not specified)" />
          )}
        </div>
      </div>
    );
  },
);
