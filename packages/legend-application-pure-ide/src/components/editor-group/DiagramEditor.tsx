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

import { forwardRef, useCallback, useEffect, useRef } from 'react';
import { observer } from 'mobx-react-lite';
import type { DiagramEditorState } from '../../stores/DiagramEditorState.js';
import {
  DIAGRAM_ALIGNER_OPERATOR,
  DiagramRenderer,
  DIAGRAM_ZOOM_LEVELS,
  DIAGRAM_INTERACTION_MODE,
  DIAGRAM_RELATIONSHIP_EDIT_MODE,
} from '@finos/legend-extension-dsl-diagram/application';
import { Point } from '@finos/legend-extension-dsl-diagram/graph';
import { type DropTargetMonitor, useDrop } from 'react-dnd';
import { CONCEPT_TREE_DND_TYPE } from '../side-bar/ConceptTreeExplorer.js';
import { ConceptNode } from '../../server/models/ConceptTree.js';
import { flowResult } from 'mobx';
import { useApplicationStore, useCommands } from '@finos/legend-application';
import {
  AlignBottomIcon,
  AlignCenterIcon,
  AlignEndIcon,
  AlignMiddleIcon,
  AlignStartIcon,
  AlignTopIcon,
  CaretDownIcon,
  clsx,
  DistributeHorizontalIcon,
  DistributeVerticalIcon,
  ControlledDropdownMenu,
  GoToFileIcon,
  MenuContent,
  MenuContentDivider,
  MenuContentItem,
  MousePointerIcon,
  MoveIcon,
  useResizeDetector,
  ZoomInIcon,
  ZoomOutIcon,
} from '@finos/legend-art';
import { usePureIDEStore } from '../PureIDEStoreProvider.js';
import { FileCoordinate } from '../../server/models/File.js';

const DiagramEditorDiagramCanvas = observer(
  forwardRef<
    HTMLDivElement,
    {
      diagramEditorState: DiagramEditorState;
    }
  >(function DiagramEditorDiagramCanvas(props, _ref) {
    const { diagramEditorState } = props;
    const applicationStore = useApplicationStore();
    const diagram = diagramEditorState.diagram;
    const ref = _ref as React.RefObject<HTMLDivElement>;

    const { width, height } = useResizeDetector<HTMLDivElement>({
      refreshMode: 'debounce',
      refreshRate: 50,
      targetRef: ref,
    });

    useEffect(() => {
      const renderer = new DiagramRenderer(ref.current, diagram);
      diagramEditorState.setRenderer(renderer);
      diagramEditorState.setupRenderer();
      renderer.render({ initial: true });
    }, [ref, diagramEditorState, diagram]);

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
    dropConnector(ref);

    return (
      <div
        ref={ref}
        className={clsx(
          'diagram-canvas diagram-editor__canvas',
          diagramEditorState.diagramCursorClass,
        )}
        tabIndex={0}
      />
    );
  }),
);

const DiagramEditorHeader = observer(
  (props: { diagramEditorState: DiagramEditorState }) => {
    const { diagramEditorState } = props;
    const ideStore = usePureIDEStore();
    const applicationStore = useApplicationStore();
    const goToFile = (): void => {
      flowResult(
        ideStore.loadFile(
          diagramEditorState.filePath,
          new FileCoordinate(
            diagramEditorState.filePath,
            diagramEditorState.fileLine,
            diagramEditorState.fileColumn,
          ),
        ),
      ).catch(applicationStore.alertUnhandledError);
    };
    const createCenterZoomer =
      (zoomLevel: number): (() => void) =>
      (): void => {
        diagramEditorState.renderer.zoomCenter(zoomLevel / 100);
      };
    const zoomToFit = (): void => diagramEditorState.renderer.zoomToFit();
    const isAlignerDisabled =
      diagramEditorState.renderer.selectedClasses.length < 2;

    return (
      <>
        <div className="diagram-editor__header__group">
          <button
            className="diagram-editor__header__action diagram-editor__header__group__action"
            title="Align left"
            disabled={isAlignerDisabled}
            tabIndex={-1}
            onClick={(): void =>
              diagramEditorState.renderer.align(
                DIAGRAM_ALIGNER_OPERATOR.ALIGN_LEFT,
              )
            }
          >
            <AlignStartIcon className="diagram-editor__icon--aligner" />
          </button>
          <button
            className="diagram-editor__header__action diagram-editor__header__group__action"
            title="Align center"
            disabled={isAlignerDisabled}
            tabIndex={-1}
            onClick={(): void =>
              diagramEditorState.renderer.align(
                DIAGRAM_ALIGNER_OPERATOR.ALIGN_CENTER,
              )
            }
          >
            <AlignCenterIcon className="diagram-editor__icon--aligner" />
          </button>
          <button
            className="diagram-editor__header__action diagram-editor__header__group__action"
            title="Align right"
            disabled={isAlignerDisabled}
            tabIndex={-1}
            onClick={(): void =>
              diagramEditorState.renderer.align(
                DIAGRAM_ALIGNER_OPERATOR.ALIGN_RIGHT,
              )
            }
          >
            <AlignEndIcon className="diagram-editor__icon--aligner" />
          </button>
        </div>
        <div className="diagram-editor__header__group__separator" />
        <div className="diagram-editor__header__group">
          <button
            className="diagram-editor__header__action diagram-editor__header__group__action"
            title="Align top"
            disabled={isAlignerDisabled}
            tabIndex={-1}
            onClick={(): void =>
              diagramEditorState.renderer.align(
                DIAGRAM_ALIGNER_OPERATOR.ALIGN_TOP,
              )
            }
          >
            <AlignTopIcon className="diagram-editor__icon--aligner" />
          </button>
          <button
            className="diagram-editor__header__action diagram-editor__header__group__action"
            title="Align middle"
            disabled={isAlignerDisabled}
            tabIndex={-1}
            onClick={(): void =>
              diagramEditorState.renderer.align(
                DIAGRAM_ALIGNER_OPERATOR.ALIGN_MIDDLE,
              )
            }
          >
            <AlignMiddleIcon className="diagram-editor__icon--aligner" />
          </button>
          <button
            className="diagram-editor__header__action diagram-editor__header__group__action"
            title="Align bottom"
            disabled={isAlignerDisabled}
            tabIndex={-1}
            onClick={(): void =>
              diagramEditorState.renderer.align(
                DIAGRAM_ALIGNER_OPERATOR.ALIGN_BOTTOM,
              )
            }
          >
            <AlignBottomIcon className="diagram-editor__icon--aligner" />
          </button>
        </div>
        <div className="diagram-editor__header__group__separator" />
        <div className="diagram-editor__header__group">
          <button
            className="diagram-editor__header__action diagram-editor__header__group__action"
            title="Space horizontally"
            disabled={isAlignerDisabled}
            tabIndex={-1}
            onClick={(): void =>
              diagramEditorState.renderer.align(
                DIAGRAM_ALIGNER_OPERATOR.SPACE_HORIZONTALLY,
              )
            }
          >
            <DistributeHorizontalIcon className="diagram-editor__icon--aligner" />
          </button>
          <button
            className="diagram-editor__header__action diagram-editor__header__group__action"
            title="Space vertically"
            disabled={isAlignerDisabled}
            tabIndex={-1}
            onClick={(): void =>
              diagramEditorState.renderer.align(
                DIAGRAM_ALIGNER_OPERATOR.SPACE_VERTICALLY,
              )
            }
          >
            <DistributeVerticalIcon className="diagram-editor__icon--aligner" />
          </button>
        </div>
        <ControlledDropdownMenu
          className="diagram-editor__header__dropdown"
          title="Zoom..."
          content={
            <MenuContent>
              <MenuContentItem
                className="diagram-editor__header__zoomer__dropdown__menu__item"
                onClick={zoomToFit}
              >
                Fit
              </MenuContentItem>
              <MenuContentDivider />
              {DIAGRAM_ZOOM_LEVELS.map((zoomLevel) => (
                <MenuContentItem
                  key={zoomLevel}
                  className="diagram-editor__header__zoomer__dropdown__menu__item"
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
          <div className="diagram-editor__header__dropdown__label diagram-editor__header__zoomer__dropdown__label">
            {Math.round(diagramEditorState.renderer.zoom * 100)}%
          </div>
          <div className="diagram-editor__header__dropdown__trigger diagram-editor__header__zoomer__dropdown__trigger">
            <CaretDownIcon />
          </div>
        </ControlledDropdownMenu>
        <div className="diagram-editor__header__actions">
          <button
            className="diagram-editor__header__action"
            tabIndex={-1}
            onClick={goToFile}
          >
            <GoToFileIcon className="diagram-editor__icon--go-to-file" />
          </button>
        </div>
      </>
    );
  },
);

const DiagramEditorToolPanel = observer(
  (props: { diagramEditorState: DiagramEditorState }) => {
    const { diagramEditorState } = props;
    const renderer = diagramEditorState.renderer;
    const createModeSwitcher =
      (
        editMode: DIAGRAM_INTERACTION_MODE,
        relationshipMode: DIAGRAM_RELATIONSHIP_EDIT_MODE,
      ): (() => void) =>
      (): void =>
        renderer.changeMode(editMode, relationshipMode);

    return (
      <div className="diagram-editor__tools">
        <button
          className={clsx('diagram-editor__tool', {
            'diagram-editor__tool--active':
              renderer.interactionMode === DIAGRAM_INTERACTION_MODE.LAYOUT,
          })}
          tabIndex={-1}
          onClick={createModeSwitcher(
            DIAGRAM_INTERACTION_MODE.LAYOUT,
            DIAGRAM_RELATIONSHIP_EDIT_MODE.NONE,
          )}
          title="View Tool (V)"
        >
          <MousePointerIcon className="diagram-editor__icon--layout" />
        </button>
        <button
          className={clsx('diagram-editor__tool', {
            'diagram-editor__tool--active':
              renderer.interactionMode === DIAGRAM_INTERACTION_MODE.PAN,
          })}
          tabIndex={-1}
          onClick={createModeSwitcher(
            DIAGRAM_INTERACTION_MODE.PAN,
            DIAGRAM_RELATIONSHIP_EDIT_MODE.NONE,
          )}
          title="Pan Tool (M)"
        >
          <MoveIcon className="diagram-editor__icon--pan" />
        </button>
        <button
          className={clsx('diagram-editor__tool', {
            'diagram-editor__tool--active':
              renderer.interactionMode === DIAGRAM_INTERACTION_MODE.ZOOM_IN,
          })}
          tabIndex={-1}
          title="Zoom In (Z)"
          onClick={createModeSwitcher(
            DIAGRAM_INTERACTION_MODE.ZOOM_IN,
            DIAGRAM_RELATIONSHIP_EDIT_MODE.NONE,
          )}
        >
          <ZoomInIcon className="diagram-editor__icon--zoom-in" />
        </button>
        <button
          className={clsx('diagram-editor__tool', {
            'diagram-editor__tool--active':
              renderer.interactionMode === DIAGRAM_INTERACTION_MODE.ZOOM_OUT,
          })}
          tabIndex={-1}
          title="Zoom Out (Z)"
          onClick={createModeSwitcher(
            DIAGRAM_INTERACTION_MODE.ZOOM_OUT,
            DIAGRAM_RELATIONSHIP_EDIT_MODE.NONE,
          )}
        >
          <ZoomOutIcon className="diagram-editor__icon--zoom-out" />
        </button>
      </div>
    );
  },
);

export const DiagramEditor = observer(
  (props: { diagramEditorState: DiagramEditorState }) => {
    const { diagramEditorState } = props;
    const diagramCanvasRef = useRef<HTMLDivElement>(null);

    useCommands(diagramEditorState);

    return (
      <div className="diagram-editor">
        <div className="diagram-editor__header">
          {diagramEditorState.isDiagramRendererInitialized && (
            <DiagramEditorHeader diagramEditorState={diagramEditorState} />
          )}
        </div>
        <div className="diagram-editor__content">
          <div className="diagram-editor__stage">
            {diagramEditorState.isDiagramRendererInitialized && (
              <DiagramEditorToolPanel diagramEditorState={diagramEditorState} />
            )}
            <DiagramEditorDiagramCanvas
              diagramEditorState={diagramEditorState}
              ref={diagramCanvasRef}
            />
          </div>
        </div>
      </div>
    );
  },
);
