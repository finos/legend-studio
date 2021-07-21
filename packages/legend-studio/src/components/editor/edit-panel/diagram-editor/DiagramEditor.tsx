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

import { useRef, useState, useEffect, useCallback } from 'react';
import { ClassFormEditor } from '../uml-editor/ClassEditor';
import { useResizeDetector } from 'react-resize-detector';
import type { DropTargetMonitor } from 'react-dnd';
import { useDrop } from 'react-dnd';
import { useEditorStore } from '../../../../stores/EditorStore';
import { FaRegKeyboard } from 'react-icons/fa';
import { observer } from 'mobx-react-lite';
import {
  DiagramRenderer,
  DIAGRAM_INTERACTION_MODE,
  DIAGRAM_RELATIONSHIP_EDIT_MODE,
  DIAGRAM_ZOOM_LEVELS,
} from '../../../shared/diagram-viewer/DiagramRenderer';
import type {
  DiagramEditorInlineClassCreatorState,
  DiagramEditorInlinePropertyEditorState,
} from '../../../../stores/editor-state/element-editor-state/DiagramEditorState';
import {
  DIAGRAM_EDITOR_SIDE_PANEL_TAB,
  DiagramEditorClassViewEditorSidePanelState,
  DiagramEditorState,
} from '../../../../stores/editor-state/element-editor-state/DiagramEditorState';
import {
  CORE_DND_TYPE,
  ElementDragSource,
} from '../../../../stores/shared/DnDUtil';
import {
  BasePopover,
  BlankPanelContent,
  CaretDownIcon,
  CheckSquareIcon,
  clsx,
  createFilter,
  CustomSelectorInput,
  DropdownMenu,
  MenuContent,
  MenuContentDivider,
  MenuContentItem,
  PlusIcon,
  SquareIcon,
  TimesIcon,
} from '@finos/legend-studio-components';
import { Class } from '../../../../models/metamodels/pure/model/packageableElements/domain/Class';
import { Point } from '../../../../models/metamodels/pure/model/packageableElements/diagram/geometry/Point';
import type { PackageableElementSelectOption } from '../../../../models/metamodels/pure/model/packageableElements/PackageableElement';
import {
  FiMinus,
  FiMousePointer,
  FiMove,
  FiPlusCircle,
  FiSidebar,
  FiTriangle,
  FiZoomIn,
  FiZoomOut,
} from 'react-icons/fi';
import { IoResize } from 'react-icons/io5';
import { Dialog } from '@material-ui/core';
import type { HandlerProps } from 'react-reflex';
import { ReflexContainer, ReflexSplitter, ReflexElement } from 'react-reflex';
import { DerivedProperty } from '../../../../models/metamodels/pure/model/packageableElements/domain/DerivedProperty';
import { Property } from '../../../../models/metamodels/pure/model/packageableElements/domain/Property';
import { Multiplicity } from '../../../../models/metamodels/pure/model/packageableElements/domain/Multiplicity';
import {
  ELEMENT_PATH_DELIMITER,
  MULTIPLICITY_INFINITE,
} from '../../../../models/MetaModelConst';
import type { Type } from '../../../../models/metamodels/pure/model/packageableElements/domain/Type';
import { GenericType } from '../../../../models/metamodels/pure/model/packageableElements/domain/GenericType';
import {
  isValidFullPath,
  resolvePackagePathAndElementName,
} from '../../../../models/MetaModelUtils';
import { prettyCONSTName } from '@finos/legend-studio-shared';

const DiagramRendererHotkeyInfosModal = observer(
  (props: { open: boolean; onClose: () => void }) => {
    const { open, onClose } = props;
    return (
      <Dialog
        open={open}
        onClose={onClose}
        classes={{
          root: 'editor-modal__root-container',
          container: 'editor-modal__container',
          paper: 'editor-modal__content--scrollable',
        }}
      >
        <div className="modal modal--dark modal--scrollable diagram-editor__hotkeys__dialog">
          <div className="modal__header">
            <div className="modal__title">Diagram Hotkeys</div>
          </div>
          <div className="modal__body">
            <div className="diagram-editor__hotkey__groups">
              <div className="diagram-editor__hotkey__group">
                <div className="diagram-editor__hotkey__annotation">
                  Remove selected element(s)
                </div>
                <div className="hotkey__combination diagram-editor__hotkey__keys">
                  <div className="hotkey__key">Delete</div>
                </div>
              </div>
              <div className="diagram-editor__hotkey__group">
                <div className="diagram-editor__hotkey__annotation">
                  Edit the selected element
                </div>
                <div className="hotkey__combination diagram-editor__hotkey__keys">
                  <div className="hotkey__key">E</div>
                </div>
              </div>

              <div className="diagram-editor__hotkey__groups__divider" />
              <div className="diagram-editor__hotkey__group">
                <div className="diagram-editor__hotkey__annotation">
                  Recenter
                </div>
                <div className="hotkey__combination diagram-editor__hotkey__keys">
                  <div className="hotkey__key">R</div>
                </div>
              </div>
              <div className="diagram-editor__hotkey__group">
                <div className="diagram-editor__hotkey__annotation">Zoom</div>
                <div className="hotkey__combination diagram-editor__hotkey__keys">
                  <div className="hotkey__key">Z</div>
                </div>
              </div>

              <div className="diagram-editor__hotkey__groups__divider" />
              <div className="diagram-editor__hotkey__group">
                <div className="diagram-editor__hotkey__annotation">
                  Use view tool
                </div>
                <div className="hotkey__combination diagram-editor__hotkey__keys">
                  <div className="hotkey__key">V</div>
                </div>
              </div>
              <div className="diagram-editor__hotkey__group">
                <div className="diagram-editor__hotkey__annotation">
                  Use pan tool
                </div>
                <div className="hotkey__combination diagram-editor__hotkey__keys">
                  <div className="hotkey__key">M</div>
                </div>
              </div>
              <div className="diagram-editor__hotkey__group">
                <div className="diagram-editor__hotkey__annotation">
                  Use property tool
                </div>
                <div className="hotkey__combination diagram-editor__hotkey__keys">
                  <div className="hotkey__key">P</div>
                </div>
              </div>
              <div className="diagram-editor__hotkey__group">
                <div className="diagram-editor__hotkey__annotation">
                  Use inheritance tool
                </div>
                <div className="hotkey__combination diagram-editor__hotkey__keys">
                  <div className="hotkey__key">I</div>
                </div>
              </div>
              <div className="diagram-editor__hotkey__group">
                <div className="diagram-editor__hotkey__annotation">
                  Add class
                </div>
                <div className="hotkey__combination diagram-editor__hotkey__keys">
                  <div className="hotkey__key">+</div>
                </div>
              </div>

              <div className="diagram-editor__hotkey__groups__divider" />
              <div className="diagram-editor__hotkey__group">
                <div className="diagram-editor__hotkey__annotation">
                  Toggle display for properties of selected element(s)
                </div>
                <div className="hotkey__combination diagram-editor__hotkey__keys">
                  <div className="hotkey__key">Alt</div>
                  <div className="hotkey__plus">
                    <PlusIcon />
                  </div>
                  <div className="hotkey__key">P</div>
                </div>
              </div>
              <div className="diagram-editor__hotkey__group">
                <div className="diagram-editor__hotkey__annotation">
                  Toggle display for tagged values of selected element(s)
                </div>
                <div className="hotkey__combination diagram-editor__hotkey__keys">
                  <div className="hotkey__key">Alt</div>
                  <div className="hotkey__plus">
                    <PlusIcon />
                  </div>
                  <div className="hotkey__key">T</div>
                </div>
              </div>
              <div className="diagram-editor__hotkey__group">
                <div className="diagram-editor__hotkey__annotation">
                  Toggle display for stereotypes of selected element(s)
                </div>
                <div className="hotkey__combination diagram-editor__hotkey__keys">
                  <div className="hotkey__key">Alt</div>
                  <div className="hotkey__plus">
                    <PlusIcon />
                  </div>
                  <div className="hotkey__key">S</div>
                </div>
              </div>

              <div className="diagram-editor__hotkey__groups__divider" />

              <div className="diagram-editor__hotkey__group">
                <div className="diagram-editor__hotkey__annotation">
                  Add simple property to selected class
                </div>
                <div className="hotkey__combination diagram-editor__hotkey__keys">
                  <div className="hotkey__key">Alt</div>
                  <div className="hotkey__plus">
                    <PlusIcon />
                  </div>
                  <div className="hotkey__key">&darr;</div>
                </div>
              </div>

              <div className="diagram-editor__hotkey__groups__divider" />

              <div className="diagram-editor__hotkey__group">
                <div className="diagram-editor__hotkey__annotation">
                  Add subtypes of the selected classes to the diagram
                </div>
                <div className="hotkey__combination diagram-editor__hotkey__keys">
                  <div className="hotkey__key">&darr;</div>
                </div>
              </div>
              <div className="diagram-editor__hotkey__group">
                <div className="diagram-editor__hotkey__annotation">
                  Add supertypes of the selected classes to the diagram
                </div>
                <div className="hotkey__combination diagram-editor__hotkey__keys">
                  <div className="hotkey__key">&uarr;</div>
                </div>
              </div>
              <div className="diagram-editor__hotkey__group">
                <div className="diagram-editor__hotkey__annotation">
                  Eject the property
                </div>
                <div className="hotkey__combination diagram-editor__hotkey__keys">
                  <div className="hotkey__key">&rarr;</div>
                </div>
              </div>
              <div className="diagram-editor__hotkey__group">
                <div className="diagram-editor__hotkey__annotation">
                  Add the selected class as property of the opened class
                </div>
                <div className="hotkey__combination diagram-editor__hotkey__keys">
                  <div className="hotkey__key">&larr;</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Dialog>
    );
  },
);

const DiagramEditorToolPanel = observer(
  (props: { diagramEditorState: DiagramEditorState }) => {
    const { diagramEditorState } = props;
    const renderer = diagramEditorState.renderer;
    const isReadOnly = diagramEditorState.isReadOnly;
    const showDiagramRendererHokeysModal = (): void =>
      diagramEditorState.setShowHotkeyInfosModal(true);
    const hideDiagramRendererHokeysModal = (): void =>
      diagramEditorState.setShowHotkeyInfosModal(false);
    const createModeSwitcher =
      (
        editMode: DIAGRAM_INTERACTION_MODE,
        relationshipMode: DIAGRAM_RELATIONSHIP_EDIT_MODE,
      ): (() => void) =>
      (): void => {
        if (!isReadOnly) {
          renderer.changeMode(editMode, relationshipMode);
        }
      };

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
          <FiMousePointer className="diagram-editor__icon--layout" />
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
          <FiMove className="diagram-editor__icon--pan" />
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
          <FiZoomIn className="diagram-editor__icon--zoom-in" />
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
          <FiZoomOut className="diagram-editor__icon--zoom-out" />
        </button>
        <div className="diagram-editor__tools__divider" />
        <button
          className={clsx('diagram-editor__tool', {
            'diagram-editor__tool--active':
              renderer.interactionMode ===
                DIAGRAM_INTERACTION_MODE.ADD_RELATIONSHIP &&
              renderer.relationshipMode ===
                DIAGRAM_RELATIONSHIP_EDIT_MODE.PROPERTY,
          })}
          tabIndex={-1}
          title="Property Tool (P)"
          disabled={isReadOnly}
          onClick={createModeSwitcher(
            DIAGRAM_INTERACTION_MODE.ADD_RELATIONSHIP,
            DIAGRAM_RELATIONSHIP_EDIT_MODE.PROPERTY,
          )}
        >
          <FiMinus className="diagram-editor__icon--property" />
        </button>
        <button
          className={clsx('diagram-editor__tool', {
            'diagram-editor__tool--active':
              renderer.interactionMode ===
                DIAGRAM_INTERACTION_MODE.ADD_RELATIONSHIP &&
              renderer.relationshipMode ===
                DIAGRAM_RELATIONSHIP_EDIT_MODE.INHERITANCE,
          })}
          tabIndex={-1}
          title="Inheritance Tool (I)"
          disabled={isReadOnly}
          onClick={createModeSwitcher(
            DIAGRAM_INTERACTION_MODE.ADD_RELATIONSHIP,
            DIAGRAM_RELATIONSHIP_EDIT_MODE.INHERITANCE,
          )}
        >
          <FiTriangle className="diagram-editor__icon--inheritance" />
        </button>
        <button
          className={clsx('diagram-editor__tool', {
            // 'diagram-editor__tool--active':
            //   diagramRenderer.editMode === DIAGRAM_EDIT_MODE.RELATIONSHIP &&
            //   diagramRenderer.relationshipMode ===
            //     DIAGRAM_RELATIONSHIP_EDIT_MODE.ASSOCIATION,
          })}
          tabIndex={-1}
          title="Association Tool"
          disabled={true}
          // onClick={changeMode(
          //   DIAGRAM_INTERACTION_MODE.ADD_RELATIONSHIP,
          //   DIAGRAM_RELATIONSHIP_EDIT_MODE.ASSOCIATION,
          // )}
        >
          <IoResize className="diagram-editor__icon--association" />
        </button>
        <button
          className={clsx('diagram-editor__tool', {
            'diagram-editor__tool--active':
              renderer.interactionMode === DIAGRAM_INTERACTION_MODE.ADD_CLASS,
          })}
          tabIndex={-1}
          title="New Class... (+)"
          disabled={isReadOnly}
          onClick={createModeSwitcher(
            DIAGRAM_INTERACTION_MODE.ADD_CLASS,
            DIAGRAM_RELATIONSHIP_EDIT_MODE.NONE,
          )}
        >
          <FiPlusCircle className="diagram-editor__icon--add-class" />
        </button>
        <div className="diagram-editor__tools__divider" />
        <button
          className="diagram-editor__tool"
          tabIndex={-1}
          title="Show Hotkeys"
          onClick={showDiagramRendererHokeysModal}
        >
          <FaRegKeyboard className="diagram-editor__icon--hotkey-info" />
        </button>
        <DiagramRendererHotkeyInfosModal
          open={diagramEditorState.showHotkeyInfosModal}
          onClose={hideDiagramRendererHokeysModal}
        />
      </div>
    );
  },
);

const DiagramEditorClassViewEditor = observer(
  (props: {
    classViewEditorState: DiagramEditorClassViewEditorSidePanelState;
  }) => {
    const { classViewEditorState } = props;
    const editorStore = useEditorStore();
    const classView = classViewEditorState.classView;
    const diagramEditorState = classViewEditorState.diagramEditorState;

    // Tabs
    const selectedTab = classViewEditorState.selectedTab;
    const tabs = [
      DIAGRAM_EDITOR_SIDE_PANEL_TAB.ELEMENT,
      DIAGRAM_EDITOR_SIDE_PANEL_TAB.VIEW,
    ];
    const changeTab =
      (tab: DIAGRAM_EDITOR_SIDE_PANEL_TAB): (() => void) =>
      (): void => {
        classViewEditorState.setSelectedTab(tab);
      };

    const redrawOnClassChange = useCallback((): void => {
      diagramEditorState.diagram.cleanUpDeadReferences(
        editorStore.graphState.graph,
      );
      diagramEditorState.renderer.render();
    }, [diagramEditorState, editorStore]);

    const toggleHideProperties = (): void => {
      classView.setHideProperties(!classView.hideProperties);
      diagramEditorState.renderer.render();
    };
    const toggleHideTaggedValues = (): void => {
      classView.setHideTaggedValues(!classView.hideTaggedValues);
      diagramEditorState.renderer.render();
    };
    const toggleHideStereotypes = (): void => {
      classView.setHideStereotypes(!classView.hideStereotypes);
      diagramEditorState.renderer.render();
    };

    return (
      <div className="diagram-editor__class-view-editor">
        <div className="diagram-editor__class-view-editor__header">
          <div className="diagram-editor__class-view-editor__header__tabs">
            {tabs.map((tab) => (
              <div
                key={tab}
                onClick={changeTab(tab)}
                className={clsx(
                  'diagram-editor__class-view-editor__header__tab',
                  {
                    'diagram-editor__class-view-editor__header__tab--active':
                      tab === selectedTab,
                  },
                )}
              >
                {prettyCONSTName(tab)}
              </div>
            ))}
          </div>
        </div>
        <div className="diagram-editor__class-view-editor__content">
          {DIAGRAM_EDITOR_SIDE_PANEL_TAB.ELEMENT === selectedTab && (
            <ClassFormEditor
              _class={classViewEditorState.classEditorState.class}
              editorState={classViewEditorState.classEditorState}
              onHashChange={redrawOnClassChange}
            />
          )}
          {DIAGRAM_EDITOR_SIDE_PANEL_TAB.VIEW === selectedTab && (
            <div className="panel__content__form diagram-editor__class-view-editor__content__form">
              <div className="panel__content__form__section">
                {/* Hide properties */}
                <div
                  className={clsx('panel__content__form__section__toggler')}
                  onClick={toggleHideProperties}
                >
                  <button
                    className={clsx(
                      'panel__content__form__section__toggler__btn',
                      {
                        'panel__content__form__section__toggler__btn--toggled':
                          classView.hideProperties,
                      },
                    )}
                  >
                    {classView.hideProperties ? (
                      <CheckSquareIcon />
                    ) : (
                      <SquareIcon />
                    )}
                  </button>
                  <div className="panel__content__form__section__toggler__prompt">
                    Specifies if properties should be hidden
                  </div>
                </div>
                {/* Hide tagged-values */}
                <div
                  className={clsx('panel__content__form__section__toggler')}
                  onClick={toggleHideTaggedValues}
                >
                  <button
                    className={clsx(
                      'panel__content__form__section__toggler__btn',
                      {
                        'panel__content__form__section__toggler__btn--toggled':
                          classView.hideTaggedValues,
                      },
                    )}
                  >
                    {classView.hideTaggedValues ? (
                      <CheckSquareIcon />
                    ) : (
                      <SquareIcon />
                    )}
                  </button>
                  <div className="panel__content__form__section__toggler__prompt">
                    Specifies if tagged values should be hidden
                  </div>
                </div>
                {/* Hide stereotypes */}
                <div
                  className={clsx('panel__content__form__section__toggler')}
                  onClick={toggleHideStereotypes}
                >
                  <button
                    className={clsx(
                      'panel__content__form__section__toggler__btn',
                      {
                        'panel__content__form__section__toggler__btn--toggled':
                          classView.hideStereotypes,
                      },
                    )}
                  >
                    {classView.hideStereotypes ? (
                      <CheckSquareIcon />
                    ) : (
                      <SquareIcon />
                    )}
                  </button>
                  <div className="panel__content__form__section__toggler__prompt">
                    Specifies if stereotypes should be hidden
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  },
);

const DiagramEditorOverlay = observer(
  (props: { diagramEditorState: DiagramEditorState }) => {
    const { diagramEditorState } = props;
    const sidePanelState = diagramEditorState.sidePanelState;

    const resizeSidePanel = (handleProps: HandlerProps): void =>
      diagramEditorState.sidePanelDisplayState.setSize(
        (handleProps.domElement as HTMLDivElement).getBoundingClientRect()
          .width,
      );

    return (
      <ReflexContainer
        className="diagram-editor__overlay"
        orientation="vertical"
      >
        <ReflexElement direction={1}>
          <div className="diagram-editor__view-finder" />
        </ReflexElement>
        <ReflexSplitter className="diagram-editor__overlay__panel-resizer" />
        <ReflexElement
          className="diagram-editor__overlay__panel"
          flex={0}
          size={diagramEditorState.sidePanelDisplayState.size}
          direction={-1}
          onStopResize={resizeSidePanel}
        >
          <div className="panel diagram-editor__side-panel">
            {sidePanelState instanceof
              DiagramEditorClassViewEditorSidePanelState && (
              <DiagramEditorClassViewEditor
                classViewEditorState={sidePanelState}
              />
            )}
            {!sidePanelState && (
              <BlankPanelContent>No element selected</BlankPanelContent>
            )}
          </div>
        </ReflexElement>
      </ReflexContainer>
    );
  },
);

const DiagramEditorInlineClassCreatorInner = observer(
  (props: {
    inlineClassCreatorState: DiagramEditorInlineClassCreatorState;
  }) => {
    const { inlineClassCreatorState } = props;
    const editorStore = useEditorStore();
    const diagramEditorState = inlineClassCreatorState.diagramEditorState;
    const isReadOnly = diagramEditorState.isReadOnly;
    const [path, setPath] = useState(
      `${
        diagramEditorState.diagram.package
          ? `${diagramEditorState.diagram.package.name}${ELEMENT_PATH_DELIMITER}`
          : ''
      }Class_${editorStore.graphState.graph.classes.length + 1}`,
    );
    const isClassPathNonEmpty = path !== '';
    const isNotTopLevelClass = path.includes(ELEMENT_PATH_DELIMITER);
    const isValidPath = isValidFullPath(path);
    const isClassUnique =
      !editorStore.graphState.graph.getNullableElement(path);
    const classCreationValidationErrorMessage = !isClassPathNonEmpty
      ? `Class path cannot be empty`
      : !isNotTopLevelClass
      ? `Creating top level class is not allowed`
      : !isValidPath
      ? `Class path is not valid`
      : !isClassUnique
      ? `Class already existed`
      : undefined;
    const canCreateClass =
      isClassPathNonEmpty && isNotTopLevelClass && isValidPath && isClassUnique;

    const close = (event: React.MouseEvent<HTMLButtonElement>): void => {
      event.preventDefault();
      if (canCreateClass) {
        diagramEditorState.setInlinePropertyEditorState(undefined);
        const [packagePath, name] = resolvePackagePathAndElementName(path);
        const _class = new Class(name);
        editorStore.graphState.graph
          .getOrCreatePackage(packagePath)
          .addElement(_class);
        editorStore.graphState.graph.addElement(_class);
        editorStore.explorerTreeState.reprocess();
        diagramEditorState.renderer.addClassView(
          _class,
          inlineClassCreatorState.point,
        );
      }
    };
    const pathInputRef = useRef<HTMLInputElement>(null);

    const changePath: React.ChangeEventHandler<HTMLInputElement> = (event) =>
      setPath(event.target.value);

    useEffect(() => {
      pathInputRef.current?.focus();
    }, [inlineClassCreatorState]);

    return (
      <form className="diagram-editor__inline-class-creator">
        <div className="input-group">
          <input
            className="diagram-editor__inline-class-creator__path input-group__input input--dark"
            ref={pathInputRef}
            disabled={isReadOnly}
            value={path}
            placeholder="Enter class path"
            onChange={changePath}
          />
          {classCreationValidationErrorMessage && (
            <div className="input-group__error-message">
              {classCreationValidationErrorMessage}
            </div>
          )}
        </div>
        <button
          type="submit"
          className="diagram-editor__inline-class-creator__close-btn"
          onClick={close}
        >
          <TimesIcon />
        </button>
      </form>
    );
  },
);

const DiagramEditorInlineClassCreator = observer(
  (props: { diagramEditorState: DiagramEditorState }) => {
    const { diagramEditorState } = props;
    const closeEditor = (): void => {
      diagramEditorState.setInlineClassCreatorState(undefined);
    };
    const inlineClassCreatorState = diagramEditorState.inlineClassCreatorState;
    const anchorPositionPoint = inlineClassCreatorState
      ? diagramEditorState.renderer.canvasCoordinateToEventCoordinate(
          diagramEditorState.renderer.modelCoordinateToCanvasCoordinate(
            inlineClassCreatorState.point,
          ),
        )
      : new Point(0, 0);

    return (
      <BasePopover
        onClose={closeEditor}
        anchorPosition={{
          left: anchorPositionPoint.x,
          top: anchorPositionPoint.y,
        }}
        anchorReference="anchorPosition"
        open={Boolean(inlineClassCreatorState)}
        BackdropProps={{
          invisible: true,
        }}
        elevation={0}
        marginThreshold={0}
        disableRestoreFocus={true}
      >
        <div className="diagram-editor__inline-class-creator__container">
          {inlineClassCreatorState && (
            <DiagramEditorInlineClassCreatorInner
              inlineClassCreatorState={inlineClassCreatorState}
            />
          )}
        </div>
      </BasePopover>
    );
  },
);

const DiagramEditorInlinePropertyMultiplicityEditor = observer(
  (props: {
    value: Multiplicity;
    updateValue: (val: Multiplicity) => void;
    isReadOnly: boolean;
  }) => {
    const { value, updateValue, isReadOnly } = props;
    const [lowerBound, setLowerBound] = useState<string | number>(
      value.lowerBound,
    );
    const [upperBound, setUpperBound] = useState<string | number>(
      value.upperBound ?? MULTIPLICITY_INFINITE,
    );
    const updateMultiplicity = (
      lower: number | string,
      upper: number | string,
    ): void => {
      const lBound = typeof lower === 'number' ? lower : parseInt(lower, 10);
      const uBound =
        upper === MULTIPLICITY_INFINITE
          ? undefined
          : typeof upper === 'number'
          ? upper
          : parseInt(upper, 10);
      if (!isNaN(lBound) && (uBound === undefined || !isNaN(uBound))) {
        updateValue(new Multiplicity(lBound, uBound));
      }
    };
    const changeLowerBound: React.ChangeEventHandler<HTMLInputElement> = (
      event,
    ) => {
      setLowerBound(event.target.value);
      updateMultiplicity(event.target.value, upperBound);
    };
    const changeUpperBound: React.ChangeEventHandler<HTMLInputElement> = (
      event,
    ) => {
      setUpperBound(event.target.value);
      updateMultiplicity(lowerBound, event.target.value);
    };

    return (
      <div className="diagram-editor__inline-property-editor__multiplicity-editor">
        <input
          className="diagram-editor__inline-property-editor__multiplicity-editor__bound input--dark"
          disabled={isReadOnly}
          spellCheck={false}
          value={lowerBound}
          onChange={changeLowerBound}
        />
        <div className="diagram-editor__inline-property-editor__multiplicity-editor__range">
          ..
        </div>
        <input
          className="diagram-editor__inline-property-editor__multiplicity-editor__bound input--dark"
          disabled={isReadOnly}
          spellCheck={false}
          value={upperBound}
          onChange={changeUpperBound}
        />
      </div>
    );
  },
);

const DiagramEditorInlinePropertyEditorInner = observer(
  (props: {
    inlinePropertyEditorState: DiagramEditorInlinePropertyEditorState;
  }) => {
    const { inlinePropertyEditorState } = props;
    const editorStore = useEditorStore();
    const diagramEditorState = inlinePropertyEditorState.diagramEditorState;
    const isReadOnly = diagramEditorState.isReadOnly;
    const propertyNameInputRef = useRef<HTMLInputElement>(null);
    const property = inlinePropertyEditorState.property.value;
    const close = (event: React.MouseEvent<HTMLButtonElement>): void => {
      event.preventDefault();
      diagramEditorState.setInlinePropertyEditorState(undefined);
    };

    const changePropertyName: React.ChangeEventHandler<HTMLInputElement> = (
      event,
    ) => {
      if (property instanceof DerivedProperty || property instanceof Property) {
        property.setName(event.target.value);
        diagramEditorState.renderer.render();
      }
    };

    const changeMultiplicity = (val: Multiplicity): void => {
      if (property instanceof DerivedProperty || property instanceof Property) {
        property.setMultiplicity(val);
        diagramEditorState.renderer.render();
      }
    };

    // Type
    const currentPropertyType = property.genericType.value.rawType;
    const propertyTypeOptions =
      editorStore.classPropertyGenericTypeOptions.filter(
        (option) =>
          // Do not allow to pick other class if we're editing a property view
          !inlinePropertyEditorState.isEditingPropertyView ||
          !(option.value instanceof Class) ||
          option.value === currentPropertyType,
      );
    const propertyTypeFilterOption = createFilter({
      ignoreCase: true,
      ignoreAccents: false,
      stringify: (option: PackageableElementSelectOption<Type>): string =>
        option.value.path,
    });
    const selectedPropertyType = {
      value: currentPropertyType,
      label: currentPropertyType.name,
    };
    const changePropertyType = (
      val: PackageableElementSelectOption<Type>,
    ): void => {
      if (property instanceof Property || property instanceof DerivedProperty) {
        property.setGenericType(new GenericType(val.value));
      }
    };

    useEffect(() => {
      propertyNameInputRef.current?.focus();
    }, [inlinePropertyEditorState]);

    return (
      <form className="diagram-editor__inline-property-editor">
        <input
          className="diagram-editor__inline-property-editor__name input--dark"
          ref={propertyNameInputRef}
          disabled={isReadOnly}
          value={property.name}
          onChange={changePropertyName}
        />
        <CustomSelectorInput
          className="diagram-editor__inline-property-editor__type"
          disabled={isReadOnly}
          options={propertyTypeOptions}
          onChange={changePropertyType}
          value={selectedPropertyType}
          placeholder="Choose a data type or enumeration"
          darkMode={true}
          filterOption={propertyTypeFilterOption}
        />
        <DiagramEditorInlinePropertyMultiplicityEditor
          isReadOnly={isReadOnly}
          value={property.multiplicity}
          updateValue={changeMultiplicity}
        />
        <button
          type="submit"
          className="diagram-editor__inline-property-editor__close-btn"
          onClick={close}
        >
          <TimesIcon />
        </button>
      </form>
    );
  },
);

const DiagramEditorInlinePropertyEditor = observer(
  (props: { diagramEditorState: DiagramEditorState }) => {
    const { diagramEditorState } = props;
    const closeEditor = (): void => {
      diagramEditorState.setInlinePropertyEditorState(undefined);
    };
    const inlinePropertyEditorState =
      diagramEditorState.inlinePropertyEditorState;
    const anchorPositionPoint = inlinePropertyEditorState
      ? diagramEditorState.renderer.canvasCoordinateToEventCoordinate(
          diagramEditorState.renderer.modelCoordinateToCanvasCoordinate(
            inlinePropertyEditorState.point,
          ),
        )
      : new Point(0, 0);

    return (
      <BasePopover
        onClose={closeEditor}
        anchorPosition={{
          left: anchorPositionPoint.x,
          top: anchorPositionPoint.y,
        }}
        anchorReference="anchorPosition"
        open={Boolean(inlinePropertyEditorState)}
        BackdropProps={{
          invisible: true,
        }}
        elevation={0}
        marginThreshold={0}
        disableRestoreFocus={true}
      >
        <div className="diagram-editor__inline-property-editor__container">
          {inlinePropertyEditorState && (
            <DiagramEditorInlinePropertyEditorInner
              inlinePropertyEditorState={inlinePropertyEditorState}
            />
          )}
        </div>
      </BasePopover>
    );
  },
);

const DiagramEditorDiagramCanvas = observer(
  (
    props: {
      diagramEditorState: DiagramEditorState;
    },
    ref: React.Ref<HTMLDivElement>,
  ) => {
    const { diagramEditorState } = props;
    const diagramCanvasRef =
      ref as React.MutableRefObject<HTMLDivElement | null>;
    const isReadOnly = diagramEditorState.isReadOnly;

    const { width, height } = useResizeDetector<HTMLDivElement>({
      refreshMode: 'debounce',
      refreshRate: 50,
      targetRef: diagramCanvasRef,
    });

    useEffect(() => {
      if (diagramCanvasRef.current) {
        const renderer = new DiagramRenderer(
          diagramCanvasRef.current,
          diagramEditorState.diagram,
        );
        diagramEditorState.setRenderer(renderer);
        diagramEditorState.setupDiagramRenderer();
        renderer.render();
        renderer.autoRecenter();
      }
    }, [diagramCanvasRef, diagramEditorState]);

    useEffect(() => {
      if (diagramEditorState.isDiagramRendererInitialized) {
        diagramEditorState.renderer.refresh();
      }
    }, [diagramEditorState, width, height]);

    // Drag and Drop
    const handleDrop = useCallback(
      (item: ElementDragSource, monitor: DropTargetMonitor): void => {
        if (!isReadOnly) {
          if (item instanceof ElementDragSource) {
            if (item.data.packageableElement instanceof Class) {
              const dropPosition = monitor.getClientOffset();
              diagramEditorState.renderer.addClassView(
                item.data.packageableElement,
                dropPosition
                  ? diagramEditorState.renderer.canvasCoordinateToModelCoordinate(
                      diagramEditorState.renderer.eventCoordinateToCanvasCoordinate(
                        new Point(dropPosition.x, dropPosition.y),
                      ),
                    )
                  : undefined,
              );
            }
          }
        }
      },
      [diagramEditorState, isReadOnly],
    );
    const [, dropConnector] = useDrop(
      () => ({
        accept: CORE_DND_TYPE.PROJECT_EXPLORER_CLASS,
        drop: (item: ElementDragSource, monitor): void =>
          handleDrop(item, monitor),
      }),
      [handleDrop],
    );
    dropConnector(diagramCanvasRef);

    return (
      <div
        ref={diagramCanvasRef}
        className={clsx(
          'diagram-canvas diagram-editor__canvas',
          diagramEditorState.diagramCursorClass,
        )}
        tabIndex={0}
        onContextMenu={(event): void => event.preventDefault()}
      />
    );
  },
  { forwardRef: true },
);

const DiagramEditorHeader = observer(
  (props: { diagramEditorState: DiagramEditorState }) => {
    const { diagramEditorState } = props;
    const createCenterZoomer =
      (zoomLevel: number): (() => void) =>
      (): void => {
        diagramEditorState.renderer.zoomCenter(zoomLevel / 100);
      };
    const zoomToFit = (): void => diagramEditorState.renderer.zoomToFit();

    const toggleSidePanel = (): void => {
      diagramEditorState.sidePanelDisplayState.toggle();
      if (!diagramEditorState.sidePanelDisplayState.isOpen) {
        diagramEditorState.setSidePanelState(undefined);
      }
    };

    return (
      <>
        <DropdownMenu
          className="diagram-editor__header__dropdown"
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
          <button
            className="diagram-editor__header__dropdown__label diagram-editor__header__zoomer__dropdown__label"
            tabIndex={-1}
            title="Zoom..."
          >
            {Math.round(diagramEditorState.renderer.zoom * 100)}%
          </button>
          <div className="diagram-editor__header__dropdown__trigger diagram-editor__header__zoomer__dropdown__trigger">
            <CaretDownIcon />
          </div>
        </DropdownMenu>
        <div className="diagram-editor__header__actions">
          <button
            className={clsx('diagram-editor__header__action', {
              'diagram-editor__header__action--active':
                diagramEditorState.sidePanelDisplayState.isOpen,
            })}
            tabIndex={-1}
            onClick={toggleSidePanel}
          >
            <FiSidebar className="diagram-editor__icon--sidebar" />
          </button>
        </div>
      </>
    );
  },
);

export const DiagramEditor = observer(() => {
  const editorStore = useEditorStore();
  const diagramEditorState =
    editorStore.getCurrentEditorState(DiagramEditorState);
  const diagramCanvasRef = useRef<HTMLDivElement>(null);

  return (
    <div className="diagram-editor">
      <div className="diagram-editor__header">
        {diagramEditorState.isDiagramRendererInitialized && (
          <DiagramEditorHeader diagramEditorState={diagramEditorState} />
        )}
      </div>
      <div className="diagram-editor__content">
        {diagramEditorState.isDiagramRendererInitialized && (
          <DiagramEditorOverlay diagramEditorState={diagramEditorState} />
        )}
        <div className="diagram-editor__stage">
          {diagramEditorState.isDiagramRendererInitialized && (
            <DiagramEditorToolPanel diagramEditorState={diagramEditorState} />
          )}
          <DiagramEditorDiagramCanvas
            diagramEditorState={diagramEditorState}
            ref={diagramCanvasRef}
          />
          {diagramEditorState.isDiagramRendererInitialized && (
            <>
              <DiagramEditorInlinePropertyEditor
                diagramEditorState={diagramEditorState}
              />
              <DiagramEditorInlineClassCreator
                diagramEditorState={diagramEditorState}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
});
