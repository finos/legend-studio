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

import { useRef, useState, useEffect, useCallback, forwardRef } from 'react';
import { type DropTargetMonitor, useDrop } from 'react-dnd';
import { observer } from 'mobx-react-lite';
import {
  DIAGRAM_ALIGNER_OPERATOR,
  DiagramRenderer,
  DIAGRAM_INTERACTION_MODE,
  DIAGRAM_RELATIONSHIP_EDIT_MODE,
  DIAGRAM_ZOOM_LEVELS,
} from '../DiagramRenderer.js';
import {
  type DiagramEditorInlineClassCreatorState,
  type DiagramEditorInlineClassRenamerState,
  type DiagramEditorInlinePropertyEditorState,
  DIAGRAM_EDITOR_SIDE_PANEL_TAB,
  DiagramEditorClassViewEditorSidePanelState,
  DiagramEditorState,
} from '../../stores/studio/DiagramEditorState.js';
import {
  type ResizablePanelHandlerProps,
  ContextMenu,
  getCollapsiblePanelGroupProps,
  BasePopover,
  BlankPanelContent,
  CaretDownIcon,
  CheckSquareIcon,
  clsx,
  createFilter,
  CustomSelectorInput,
  KeyboardIcon,
  ControlledDropdownMenu,
  MenuContent,
  MenuContentDivider,
  MenuContentItem,
  PlusIcon,
  SquareIcon,
  ResizablePanelGroup,
  ResizablePanelSplitter,
  ResizablePanel,
  ResizeIcon,
  MinusIcon,
  MousePointerIcon,
  MoveIcon,
  PlusCircleIcon,
  SidebarIcon,
  TriangleIcon,
  ZoomInIcon,
  ZoomOutIcon,
  Dialog,
  AlignEndIcon,
  DistributeHorizontalIcon,
  DistributeVerticalIcon,
  AlignStartIcon,
  AlignCenterIcon,
  AlignTopIcon,
  AlignMiddleIcon,
  AlignBottomIcon,
  useResizeDetector,
  Modal,
  ModalBody,
  ModalHeader,
} from '@finos/legend-art';
import {
  type Type,
  type Multiplicity,
  Class,
  DerivedProperty,
  Property,
  ELEMENT_PATH_DELIMITER,
  MULTIPLICITY_INFINITE,
  GenericType,
  createPath,
  isValidFullPath,
  isValidPathIdentifier,
  resolvePackagePathAndElementName,
} from '@finos/legend-graph';
import { guaranteeNonNullable, prettyCONSTName } from '@finos/legend-shared';
import { flowResult } from 'mobx';
import {
  useApplicationStore,
  useApplicationNavigationContext,
  useCommands,
} from '@finos/legend-application';
import {
  ClassFormEditor,
  CORE_DND_TYPE,
  ElementDragSource,
  useEditorStore,
  property_setName,
  property_setGenericType,
  property_setMultiplicity,
  queryClass,
} from '@finos/legend-application-studio';
import { cleanUpDeadReferencesInDiagram } from '../../graph/helpers/DSL_Diagram_Helper.js';
import { Point } from '../../graph/metamodel/pure/packageableElements/diagram/geometry/DSL_Diagram_Point.js';
import {
  classView_setHideProperties,
  classView_setHideStereotypes,
  classView_setHideTaggedValues,
} from '../../stores/studio/DSL_Diagram_GraphModifierHelper.js';
import { DSL_DIAGRAM_LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY } from '../../__lib__/studio/DSL_Diagram_LegendStudioApplicationNavigationContext.js';
import { DSL_DIAGRAM_TEST_ID } from '../../__lib__/studio/DSL_Diagram_LegendStudioTesting.js';
import {
  buildElementOption,
  type PackageableElementOption,
} from '@finos/legend-lego/graph-editor';

const DiagramEditorContextMenu = observer(
  forwardRef<
    HTMLDivElement,
    {
      diagramEditorState: DiagramEditorState;
    }
  >(function DiagramEditorContextMenu(props, ref) {
    const { diagramEditorState } = props;
    const editorStore = useEditorStore();

    // actions
    const buildQuery = editorStore.applicationStore.guardUnhandledError(
      async () => {
        const classView = guaranteeNonNullable(
          diagramEditorState.contextMenuClassView,
        );
        await queryClass(classView.class.value, editorStore);
      },
    );

    return (
      <MenuContent>
        <MenuContentItem onClick={buildQuery}>Query...</MenuContentItem>
      </MenuContent>
    );
  }),
);

const DiagramRendererHotkeyInfosModal = observer(
  (props: { open: boolean; onClose: () => void }) => {
    const { open, onClose } = props;
    const applicationStore = useApplicationStore();
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
        <Modal
          darkMode={
            !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled
          }
          className="modal--scrollable diagram-editor__hotkeys__dialog"
        >
          <ModalHeader title="Diagram Hotkeys" />
          <ModalBody>
            <div className="diagram-editor__hotkey__groups">
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
                <div className="diagram-editor__hotkey__annotation">Zoom</div>
                <div className="hotkey__combination diagram-editor__hotkey__keys">
                  <div className="hotkey__key">Z</div>
                </div>
              </div>
              <div className="diagram-editor__hotkey__group">
                <div className="diagram-editor__hotkey__annotation">
                  Recenter
                </div>
                <div className="hotkey__combination diagram-editor__hotkey__keys">
                  <div className="hotkey__key">R</div>
                </div>
              </div>

              <div className="diagram-editor__hotkey__groups__divider" />
              <div className="diagram-editor__hotkey__group">
                <div className="diagram-editor__hotkey__annotation">
                  Remove selected element(s)
                </div>
                <div className="hotkey__combination diagram-editor__hotkey__keys">
                  <div className="hotkey__key">Remove</div>
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
                  <div className="hotkey__key">C</div>
                </div>
              </div>
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
                  Toggle display for properties of selected classes
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
                  Toggle display for tagged values of selected classes
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
                  Toggle display for stereotypes of selected classes
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
                  Eject the property
                </div>
                <div className="hotkey__combination diagram-editor__hotkey__keys">
                  <div className="hotkey__key">&rarr;</div>
                </div>
              </div>
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
            </div>
          </ModalBody>
        </Modal>
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
          <MinusIcon className="diagram-editor__icon--property" />
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
          <TriangleIcon className="diagram-editor__icon--inheritance" />
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
          <ResizeIcon className="diagram-editor__icon--association" />
        </button>
        <button
          className={clsx('diagram-editor__tool', {
            'diagram-editor__tool--active':
              renderer.interactionMode === DIAGRAM_INTERACTION_MODE.ADD_CLASS,
          })}
          tabIndex={-1}
          title="Add class tool (C)"
          disabled={isReadOnly}
          onClick={createModeSwitcher(
            DIAGRAM_INTERACTION_MODE.ADD_CLASS,
            DIAGRAM_RELATIONSHIP_EDIT_MODE.NONE,
          )}
        >
          <PlusCircleIcon className="diagram-editor__icon--add-class" />
        </button>
        <div className="diagram-editor__tools__divider" />
        <button
          className="diagram-editor__tool"
          tabIndex={-1}
          title="Show Hotkeys"
          onClick={showDiagramRendererHokeysModal}
        >
          <KeyboardIcon className="diagram-editor__icon--hotkey-info" />
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
    const isReadOnly = diagramEditorState.isReadOnly;

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
      cleanUpDeadReferencesInDiagram(
        diagramEditorState.diagram,
        editorStore.graphManagerState.graph,
      );
      diagramEditorState.renderer.render();
    }, [diagramEditorState, editorStore]);

    const toggleHideProperties = (): void => {
      if (isReadOnly) {
        return;
      }
      classView_setHideProperties(classView, !classView.hideProperties);
      diagramEditorState.renderer.render();
    };
    const toggleHideTaggedValues = (): void => {
      if (isReadOnly) {
        return;
      }
      classView_setHideTaggedValues(classView, !classView.hideTaggedValues);
      diagramEditorState.renderer.render();
    };
    const toggleHideStereotypes = (): void => {
      if (isReadOnly) {
        return;
      }
      classView_setHideStereotypes(classView, !classView.hideStereotypes);
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
                    disabled={isReadOnly}
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
                    disabled={isReadOnly}
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
                    disabled={isReadOnly}
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

    const resizeSidePanel = (handleProps: ResizablePanelHandlerProps): void =>
      diagramEditorState.sidePanelDisplayState.setSize(
        (handleProps.domElement as HTMLDivElement).getBoundingClientRect()
          .width,
      );

    // layout
    const sidePanelCollapsiblePanelGroupProps = getCollapsiblePanelGroupProps(
      diagramEditorState.sidePanelDisplayState.size === 0,
      {
        classes: ['diagram-editor__overlay__panel'],
        onStopResize: resizeSidePanel,
        size: diagramEditorState.sidePanelDisplayState.size,
      },
    );

    return (
      <ResizablePanelGroup
        className="diagram-editor__overlay"
        orientation="vertical"
      >
        <ResizablePanel
          {...sidePanelCollapsiblePanelGroupProps.remainingPanel}
          minSize={300}
        >
          <div className="diagram-editor__view-finder" />
        </ResizablePanel>
        <ResizablePanelSplitter className="diagram-editor__overlay__panel-resizer" />
        <ResizablePanel
          {...sidePanelCollapsiblePanelGroupProps.collapsiblePanel}
          direction={-1}
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
        </ResizablePanel>
      </ResizablePanelGroup>
    );
  },
);

const DiagramEditorInlineClassRenamerContent = observer(
  (props: {
    inlineClassRenamerState: DiagramEditorInlineClassRenamerState;
  }) => {
    const { inlineClassRenamerState } = props;
    const editorStore = useEditorStore();
    const applicationStore = useApplicationStore();
    const diagramEditorState = inlineClassRenamerState.diagramEditorState;
    const _class = inlineClassRenamerState.classView.class.value;
    const isReadOnly = diagramEditorState.isReadOnly;
    const [name, setName] = useState(_class.name);
    const [packagePath] = resolvePackagePathAndElementName(_class.path);
    const newClassPath = createPath(packagePath, name);
    const isClassNameNonEmpty = name !== '';
    const isClassNameValid = isValidPathIdentifier(name);
    const existingElement =
      editorStore.graphManagerState.graph.getNullableElement(newClassPath);
    const isClassNameUnique = !existingElement || existingElement === _class;
    // const class
    const classCreationValidationErrorMessage = !isClassNameNonEmpty
      ? `Class name cannot be empty`
      : !isClassNameValid
        ? `Class name is not valid`
        : !isClassNameUnique
          ? `Element of the same name already existed`
          : undefined;
    const canRenameClass =
      isClassNameNonEmpty && isClassNameValid && isClassNameUnique;

    const close = (event: React.MouseEvent<HTMLButtonElement>): void => {
      event.preventDefault();
      if (canRenameClass) {
        diagramEditorState.setInlineClassRenamerState(undefined);
        flowResult(
          editorStore.graphEditorMode.renameElement(_class, newClassPath),
        ).catch(applicationStore.alertUnhandledError);
      }
    };
    const pathInputRef = useRef<HTMLInputElement>(null);

    const changePath: React.ChangeEventHandler<HTMLInputElement> = (event) =>
      setName(event.target.value);

    useEffect(() => {
      pathInputRef.current?.focus();
    }, [inlineClassRenamerState]);

    return (
      <form className="diagram-editor__inline-class-creator">
        <div className="input-group">
          <input
            className="diagram-editor__inline-class-creator__path input-group__input input--dark"
            ref={pathInputRef}
            disabled={isReadOnly}
            value={name}
            placeholder="Enter class name"
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
        />
      </form>
    );
  },
);

const DiagramEditorInlineClassRenamer = observer(
  (props: { diagramEditorState: DiagramEditorState }) => {
    const { diagramEditorState } = props;
    const closeEditor = (): void => {
      diagramEditorState.setInlineClassRenamerState(undefined);
    };
    const inlineClassRenamerState = diagramEditorState.inlineClassRenamerState;
    const anchorPositionPoint = inlineClassRenamerState
      ? diagramEditorState.renderer.canvasCoordinateToEventCoordinate(
          diagramEditorState.renderer.modelCoordinateToCanvasCoordinate(
            inlineClassRenamerState.point,
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
        open={Boolean(inlineClassRenamerState)}
        BackdropProps={{
          invisible: true,
        }}
        elevation={0}
        marginThreshold={0}
        disableRestoreFocus={true}
      >
        <div className="diagram-editor__inline-class-creator__container">
          {inlineClassRenamerState && (
            <DiagramEditorInlineClassRenamerContent
              inlineClassRenamerState={inlineClassRenamerState}
            />
          )}
        </div>
      </BasePopover>
    );
  },
);

const DiagramEditorInlineClassCreatorContent = observer(
  (props: {
    inlineClassCreatorState: DiagramEditorInlineClassCreatorState;
  }) => {
    const { inlineClassCreatorState } = props;
    const editorStore = useEditorStore();
    const applicationStore = useApplicationStore();
    const diagramEditorState = inlineClassCreatorState.diagramEditorState;
    const isReadOnly = diagramEditorState.isReadOnly;
    const [path, setPath] = useState(
      `${
        diagramEditorState.diagram.package
          ? `${diagramEditorState.diagram.package.path}${ELEMENT_PATH_DELIMITER}`
          : ''
      }Class_${editorStore.graphManagerState.graph.ownClasses.length + 1}`,
    );
    const isClassPathNonEmpty = path !== '';
    const isNotTopLevelClass = path.includes(ELEMENT_PATH_DELIMITER);
    const isValidPath = isValidFullPath(path);
    const isClassUnique =
      !editorStore.graphManagerState.graph.getNullableElement(path);
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

    const createClass = async (
      event: React.MouseEvent<HTMLButtonElement>,
    ): Promise<void> => {
      event.preventDefault();
      if (canCreateClass) {
        diagramEditorState.setInlineClassCreatorState(undefined);
        const [packagePath, name] = resolvePackagePathAndElementName(path);
        const _class = new Class(name);
        await flowResult(
          editorStore.graphEditorMode.addElement(_class, packagePath, false),
        );
        diagramEditorState.renderer.addClassView(
          _class,
          inlineClassCreatorState.point,
        );
      }
    };
    const close = (event: React.MouseEvent<HTMLButtonElement>): void => {
      createClass(event).catch(applicationStore.alertUnhandledError);
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
        />
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
            <DiagramEditorInlineClassCreatorContent
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
    const editorStore = useEditorStore();
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
        updateValue(
          editorStore.graphManagerState.graph.getMultiplicity(lBound, uBound),
        );
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

const DiagramEditorInlinePropertyEditorContent = observer(
  (props: {
    inlinePropertyEditorState: DiagramEditorInlinePropertyEditorState;
  }) => {
    const { inlinePropertyEditorState } = props;
    const editorStore = useEditorStore();
    const applicationStore = editorStore.applicationStore;
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
        property_setName(property, event.target.value);
        diagramEditorState.renderer.render();
      }
    };

    const changeMultiplicity = (val: Multiplicity): void => {
      if (property instanceof DerivedProperty || property instanceof Property) {
        property_setMultiplicity(property, val);
        diagramEditorState.renderer.render();
      }
    };

    // Type
    const currentPropertyType = property.genericType.value.rawType;
    const propertyTypeOptions =
      editorStore.graphManagerState.usableClassPropertyTypes.map(
        buildElementOption,
      );
    const propertyTypeFilterOption = createFilter({
      ignoreCase: true,
      ignoreAccents: false,
      stringify: (option: { data: PackageableElementOption<Type> }): string =>
        option.data.value.path,
    });
    const selectedPropertyType = {
      value: currentPropertyType,
      label: currentPropertyType.name,
    };
    const changePropertyType = (val: PackageableElementOption<Type>): void => {
      if (property instanceof Property || property instanceof DerivedProperty) {
        property_setGenericType(property, new GenericType(val.value));
      }
    };

    useEffect(() => {
      propertyNameInputRef.current?.focus();
    }, [inlinePropertyEditorState]);

    return (
      <form
        className={clsx('diagram-editor__inline-property-editor', {
          'diagram-editor__inline-property-editor--with-type':
            !inlinePropertyEditorState.isEditingPropertyView,
        })}
      >
        <input
          className="diagram-editor__inline-property-editor__name input--dark"
          ref={propertyNameInputRef}
          disabled={isReadOnly}
          value={property.name}
          onChange={changePropertyName}
        />
        {!inlinePropertyEditorState.isEditingPropertyView && (
          <CustomSelectorInput
            className="diagram-editor__inline-property-editor__type"
            disabled={isReadOnly}
            options={propertyTypeOptions}
            onChange={changePropertyType}
            value={selectedPropertyType}
            placeholder="Choose a type..."
            darkMode={
              !applicationStore.layoutService
                .TEMPORARY__isLightColorThemeEnabled
            }
            filterOption={propertyTypeFilterOption}
          />
        )}
        <DiagramEditorInlinePropertyMultiplicityEditor
          isReadOnly={isReadOnly}
          value={property.multiplicity}
          updateValue={changeMultiplicity}
        />
        <button
          type="submit"
          className="diagram-editor__inline-property-editor__close-btn"
          onClick={close}
        />
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
            <DiagramEditorInlinePropertyEditorContent
              inlinePropertyEditorState={inlinePropertyEditorState}
            />
          )}
        </div>
      </BasePopover>
    );
  },
);

const DiagramEditorDiagramCanvas = observer(
  forwardRef<
    HTMLDivElement,
    {
      diagramEditorState: DiagramEditorState;
    }
  >(function DiagramEditorDiagramCanvas(props, ref) {
    const { diagramEditorState } = props;
    const diagramCanvasRef = ref as React.MutableRefObject<HTMLDivElement>;
    const isReadOnly = diagramEditorState.isReadOnly;

    const { width, height } = useResizeDetector<HTMLDivElement>({
      refreshMode: 'debounce',
      refreshRate: 50,
      targetRef: diagramCanvasRef,
    });

    useEffect(() => {
      const renderer = new DiagramRenderer(
        diagramCanvasRef.current,
        diagramEditorState.diagram,
      );
      diagramEditorState.setRenderer(renderer);
      diagramEditorState.setupRenderer();
      renderer.render({ initial: true });
    }, [diagramCanvasRef, diagramEditorState]);

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
    const [, dropConnector] = useDrop<ElementDragSource>(
      () => ({
        accept: CORE_DND_TYPE.PROJECT_EXPLORER_CLASS,
        drop: (item, monitor): void => handleDrop(item, monitor),
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
        data-testid={DSL_DIAGRAM_TEST_ID.DIAGRAM_EDITOR}
        tabIndex={0}
      />
    );
  }),
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
            className={clsx('diagram-editor__header__action', {
              'diagram-editor__header__action--active':
                diagramEditorState.sidePanelDisplayState.isOpen,
            })}
            tabIndex={-1}
            onClick={toggleSidePanel}
          >
            <SidebarIcon className="diagram-editor__icon--sidebar" />
          </button>
        </div>
      </>
    );
  },
);

export const DiagramEditor = observer(() => {
  const editorStore = useEditorStore();
  const diagramEditorState =
    editorStore.tabManagerState.getCurrentEditorState(DiagramEditorState);
  const diagramCanvasRef = useRef<HTMLDivElement>(null);
  const onContextMenuClose = (): void => diagramEditorState.closeContextMenu();

  useApplicationNavigationContext(
    DSL_DIAGRAM_LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY.DIAGRAM_EDITOR,
  );

  useCommands(diagramEditorState);

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
        <ContextMenu
          className="diagram-editor__stage"
          content={
            <DiagramEditorContextMenu diagramEditorState={diagramEditorState} />
          }
          disabled={!diagramEditorState.showContextMenu}
          menuProps={{ elevation: 7 }}
          onClose={onContextMenuClose}
        >
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
              <DiagramEditorInlineClassRenamer
                diagramEditorState={diagramEditorState}
              />
            </>
          )}
        </ContextMenu>
      </div>
    </div>
  );
});
