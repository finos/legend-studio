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
  type Diagram,
  DIAGRAM_ALIGNER_OPERATOR,
  DIAGRAM_ZOOM_LEVELS,
  V1_diagramModelSchema,
  V1_transformDiagram,
} from '@finos/legend-extension-dsl-diagram';
import { observer } from 'mobx-react-lite';
import { serialize } from 'serializr';
import { WRITE_ENTITY } from '../../utils/Const.js';
import {
  AlignBottomIcon,
  AlignCenterIcon,
  AlignEndIcon,
  AlignMiddleIcon,
  AlignStartIcon,
  AlignTopIcon,
  CaretDownIcon,
  ControlledDropdownMenu,
  DistributeHorizontalIcon,
  DistributeVerticalIcon,
  MenuContent,
  MenuContentDivider,
  MenuContentItem,
  SaveIcon,
} from '@finos/legend-art';
import type { DiagramEditorState } from '../../stores/DiagramEditorState.js';
import { postMessage } from '../../utils/VsCodeUtils.js';
import type { PlainObject } from '@finos/legend-shared';

export const DiagramEditorHeader = observer(
  (props: { diagramEditorState: DiagramEditorState }) => {
    const { diagramEditorState } = props;
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
            title="Save"
            tabIndex={-1}
            onClick={(): void =>
              postMessage({
                command: WRITE_ENTITY,
                msg: serialize(
                  V1_diagramModelSchema,
                  V1_transformDiagram(
                    diagramEditorState._renderer?.diagram as Diagram,
                  ),
                ) as PlainObject,
              })
            }
          >
            <SaveIcon className="diagram-editor__icon--aligner" />
          </button>
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
      </>
    );
  },
);
