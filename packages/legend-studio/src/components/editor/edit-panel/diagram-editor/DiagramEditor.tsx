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
import { ClassEditorState } from '../../../../stores/editor-state/element-editor-state/ClassEditorState';
import { ClassFormEditor } from '../uml-editor/ClassEditor';
import { useResizeDetector } from 'react-resize-detector';
import type { DropTargetMonitor } from 'react-dnd';
import { useDrop } from 'react-dnd';
import { useEditorStore } from '../../../../stores/EditorStore';
import {
  FaChevronDown,
  FaChevronRight,
  FaFolder,
  FaRegKeyboard,
} from 'react-icons/fa';
import { observer } from 'mobx-react-lite';
import {
  DiagramRenderer,
  DIAGRAM_EDIT_MODE,
  DIAGRAM_RELATIONSHIP_EDIT_MODE,
} from '../../../shared/diagram-viewer/DiagramRenderer';
import type { DiagramEditorInlinePropertyEditorState } from '../../../../stores/editor-state/element-editor-state/DiagramEditorState';
import {
  DiagramEditorClassEditorSidePanelState,
  DiagramEditorNewClassSidePanelState,
  DiagramEditorState,
} from '../../../../stores/editor-state/element-editor-state/DiagramEditorState';
import {
  CORE_DND_TYPE,
  ElementDragSource,
} from '../../../../stores/shared/DnDUtil';
import {
  BaseMenu,
  clsx,
  TimesIcon,
  TreeView,
} from '@finos/legend-studio-components';
import { isNonNullable, guaranteeType } from '@finos/legend-studio-shared';
import {
  getPackableElementTreeNodeData,
  getSelectedPackageTreeNodePackage,
} from '../../../../stores/shared/PackageTreeUtil';
import type { TreeNodeContainerProps } from '@finos/legend-studio-components';
import type { PackageTreeNodeData } from '../../../../stores/shared/TreeUtil';
import { Class } from '../../../../models/metamodels/pure/model/packageableElements/domain/Class';
import { Point } from '../../../../models/metamodels/pure/model/packageableElements/diagram/geometry/Point';
import { Package } from '../../../../models/metamodels/pure/model/packageableElements/domain/Package';
import type { PackageableElement } from '../../../../models/metamodels/pure/model/packageableElements/PackageableElement';
import {
  FiMinus,
  FiMove,
  FiPlusCircle,
  FiSidebar,
  FiTriangle,
} from 'react-icons/fi';
import { IoResize } from 'react-icons/io5';
import { useApplicationStore } from '../../../../stores/ApplicationStore';
import { Dialog } from '@material-ui/core';
import type { HandlerProps } from 'react-reflex';
import { ReflexContainer, ReflexSplitter, ReflexElement } from 'react-reflex';
import { DerivedProperty } from '../../../../models/metamodels/pure/model/packageableElements/domain/DerivedProperty';
import { Property } from '../../../../models/metamodels/pure/model/packageableElements/domain/Property';
import { Multiplicity } from '../../../../models/metamodels/pure/model/packageableElements/domain/Multiplicity';
import { MULTIPLICITY_INFINITE } from '../../../../models/MetaModelConst';

const PackageTreeNodeContainer: React.FC<
  TreeNodeContainerProps<
    PackageTreeNodeData,
    { onNodeExpand: (node: PackageTreeNodeData) => void }
  >
> = (props) => {
  const { node, level, stepPaddingInRem, onNodeSelect, innerProps } = props;
  const { onNodeExpand } = innerProps;
  const isPackage = Boolean(node.childrenIds?.length);
  const nodeExpandIcon = isPackage ? (
    node.childrenIds?.length ? (
      node.isOpen ? (
        <FaChevronDown />
      ) : (
        <FaChevronRight />
      )
    ) : (
      <div />
    )
  ) : (
    <div />
  );
  const nodeTypeIcon = <FaFolder />;
  const selectNode = (): void => onNodeSelect?.(node);
  const toggleExpansion = (): void => onNodeExpand(node);

  return (
    <div
      className={clsx('tree-view__node__container', {
        'package-tree__node__container--selected': node.isSelected,
      })}
      onClick={selectNode}
      style={{
        paddingLeft: `${level * (stepPaddingInRem ?? 1)}rem`,
        display: 'flex',
      }}
    >
      <div className="tree-view__node__icon package-tree__node__icon">
        <div className="package-tree__expand-icon" onClick={toggleExpansion}>
          {nodeExpandIcon}
        </div>
        <div className="package-tree__type-icon">{nodeTypeIcon}</div>
      </div>
      <div className="tree-view__node__label">{node.label}</div>
    </div>
  );
};

const DiagramEditorClassCreator = observer(
  (props: {
    newClassEditorState: DiagramEditorNewClassSidePanelState;
    // onSubmit: (_class: Class, position: Point) => void;
    // createNewClassEvent: MouseEvent;
    // packageTree: TreeData<PackageTreeNodeData>;
  }) => {
    const { newClassEditorState } = props;
    const editorStore = useEditorStore();
    const diagramEditorState = newClassEditorState.diagramEditorState;
    // Name
    const [name, setName] = useState('');
    const handleNameChange: React.ChangeEventHandler<HTMLInputElement> = (
      event,
    ) => setName(event.target.value);
    const treeData = newClassEditorState.packageTreeData;
    const elementNameInputRef = useRef<HTMLInputElement>(null);
    // Package
    const [selectedTreeNode, setSelectedTreeNode] = useState<
      PackageTreeNodeData | undefined
    >(Array.from(treeData.nodes.values()).find((node) => node.isSelected));
    const selectedPackage =
      getSelectedPackageTreeNodePackage(selectedTreeNode) ??
      editorStore.graphState.graph.root;
    const onNodeSelect = (node: PackageTreeNodeData): void => {
      if (selectedTreeNode) {
        selectedTreeNode.isSelected = false;
      }
      node.isSelected = true;
      setSelectedTreeNode(node);
    };

    const onNodeExpand = (node: PackageTreeNodeData): void => {
      // Expand if possible
      if (node.childrenIds?.length) {
        node.isOpen = !node.isOpen;
        if (node.packageableElement instanceof Package) {
          node.packageableElement.children
            .map((child) =>
              getPackableElementTreeNodeData(
                editorStore,
                child,
                (childElement: PackageableElement) =>
                  childElement instanceof Package,
              ),
            )
            .filter((childNode) => !treeData.nodes.has(childNode.id))
            .forEach((childNode) => {
              treeData.nodes.set(childNode.id, childNode);
            });
        }
      }
      newClassEditorState.setPackageTreeData({ ...treeData });
    };

    const getChildNodes = (
      node: PackageTreeNodeData,
    ): PackageTreeNodeData[] => {
      if (!node.childrenIds) {
        return [];
      }
      const childrenNodes = node.childrenIds
        .map((id) => treeData.nodes.get(id))
        .filter(isNonNullable)
        .filter((childNode) => childNode.packageableElement instanceof Package)
        // packages comes first, within each group, sort by name
        .sort((a, b) => a.label.localeCompare(b.label))
        .sort(
          (a, b) =>
            (b.packageableElement instanceof Package ? 1 : 0) -
            (a.packageableElement instanceof Package ? 1 : 0),
        );
      return childrenNodes;
    };

    useEffect(() => {
      elementNameInputRef.current?.focus();
    }, []);

    // Submit button
    const elementToOverride = selectedPackage.children.find(
      (child) => child instanceof Class && child.name === name,
    );
    // TODO: fix this, showing feedback in button like this is a no-no, show an warning/error indicator at input field instead
    const buttonText = elementToOverride
      ? 'Overriding is not allowed'
      : editorStore.graphState.graph.isRoot(selectedPackage)
      ? 'Creating class at root is not allowed'
      : 'Create';
    const save = (): void => {
      if (name && !elementToOverride) {
        const _class = new Class(name);
        selectedPackage.addElement(_class);
        editorStore.graphState.graph.addElement(_class);
        editorStore.explorerTreeState.reprocess();
        diagramEditorState.diagramRenderer.addClassView(
          _class,
          new Point(
            newClassEditorState.creationMouseEvent.x,
            newClassEditorState.creationMouseEvent.y,
          ),
        );
        const classEditorState = guaranteeType(
          editorStore.openedEditorStates.find(
            (elementState): elementState is ClassEditorState =>
              elementState instanceof ClassEditorState &&
              elementState.element === _class,
          ) ?? editorStore.createElementState(_class),
          ClassEditorState,
        );
        diagramEditorState.setSidePanelState(
          new DiagramEditorClassEditorSidePanelState(
            editorStore,
            diagramEditorState,
            classEditorState,
          ),
        );
      }
    };

    return (
      <div className="diagram-editor__side-panel__create-new">
        <div className="diagram-editor__side-panel__create-new__title">
          Create new class
        </div>
        <input
          className="input diagram-editor__side-panel__create-new__name"
          ref={elementNameInputRef}
          spellCheck={false}
          value={name}
          onChange={handleNameChange}
          placeholder="Class name"
        />
        <div className="diagram-editor__side-panel__create-new__package-tree">
          <TreeView
            components={{
              TreeNodeContainer: PackageTreeNodeContainer,
            }}
            treeData={treeData}
            onNodeSelect={onNodeSelect}
            getChildNodes={getChildNodes}
            innerProps={{
              onNodeExpand,
            }}
          />
        </div>
        <button
          className="btn btn--primary diagram-editor__side-panel__create-new__submit-btn"
          disabled={
            !name ||
            Boolean(elementToOverride) ||
            editorStore.graphState.graph.isRoot(selectedPackage)
          }
          onClick={save}
        >
          {buttonText}
        </button>
      </div>
    );
  },
);

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
          paper: 'editor-modal__content',
        }}
      >
        <div className="modal modal--dark diagram-editor__hotkeys__dialog">
          <div className="modal__header">
            <div className="modal__title">Diagram Hotkeys</div>
          </div>
          <div className="modal__body">
            <div className="diagram-editor__hotkey__groups">
              <div className="diagram-editor__hotkey__group">
                <div className="diagram-editor__hotkey__annotation">
                  Remove selected element(s)
                </div>
                <div className="diagram-editor__hotkey__keys">
                  <div className="hotkey__key">Delete</div>
                </div>
              </div>
              <div className="diagram-editor__hotkey__group">
                <div className="diagram-editor__hotkey__annotation">
                  Toggle display for properties of selected element(s)
                </div>
                <div className="diagram-editor__hotkey__keys">
                  <div className="hotkey__key">h</div>
                </div>
              </div>
              <div className="diagram-editor__hotkey__group">
                <div className="diagram-editor__hotkey__annotation">
                  Toggle display for stereotypes of selected element(s)
                </div>
                <div className="diagram-editor__hotkey__keys">
                  <div className="hotkey__key">s</div>
                </div>
              </div>
              <div className="diagram-editor__hotkey__group">
                <div className="diagram-editor__hotkey__annotation">
                  Toggle display for tagged values of selected element(s)
                </div>
                <div className="diagram-editor__hotkey__keys">
                  <div className="hotkey__key">t</div>
                </div>
              </div>
              <div className="diagram-editor__hotkey__group">
                <div className="diagram-editor__hotkey__annotation">
                  Edit the selected element
                </div>
                <div className="diagram-editor__hotkey__keys">
                  <div className="hotkey__key">e</div>
                </div>
              </div>
              <div className="diagram-editor__hotkey__group">
                <div className="diagram-editor__hotkey__annotation">
                  Add simple property to selected class
                </div>
                <div className="diagram-editor__hotkey__keys">
                  <div className="hotkey__key">b</div>
                </div>
              </div>
              <div className="diagram-editor__hotkey__group">
                <div className="diagram-editor__hotkey__annotation">
                  Eject the property
                </div>
                <div className="diagram-editor__hotkey__keys">
                  <div className="hotkey__key">a</div>
                </div>
              </div>
              <div className="diagram-editor__hotkey__group">
                <div className="diagram-editor__hotkey__annotation">
                  Add the selected class as property of the opened class
                </div>
                <div className="diagram-editor__hotkey__keys">
                  <div className="hotkey__key">p</div>
                </div>
              </div>
              <div className="diagram-editor__hotkey__group">
                <div className="diagram-editor__hotkey__annotation">
                  Recenter
                </div>
                <div className="diagram-editor__hotkey__keys">
                  <div className="hotkey__key">c</div>
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
    const diagramRenderer = diagramEditorState.diagramRenderer;
    const applicationStore = useApplicationStore();
    const isReadOnly = diagramEditorState.isReadOnly;
    const showDiagramRendererHokeysModal = (): void =>
      diagramEditorState.setShowHotkeyInfosModal(true);
    const hideDiagramRendererHokeysModal = (): void =>
      diagramEditorState.setShowHotkeyInfosModal(false);

    const switchToLayoutMode = (): void => {
      if (!isReadOnly) {
        diagramRenderer.changeMode(
          DIAGRAM_EDIT_MODE.LAYOUT,
          DIAGRAM_RELATIONSHIP_EDIT_MODE.NONE,
        );
      }
    };

    const switchToRelationshipPropertyMode = (): void => {
      if (!isReadOnly) {
        diagramRenderer.changeMode(
          DIAGRAM_EDIT_MODE.RELATIONSHIP,
          DIAGRAM_RELATIONSHIP_EDIT_MODE.PROPERTY,
        );
      }
    };

    const switchToRelationshipAssociationMode = (): void => {
      if (!isReadOnly) {
        applicationStore.notifyUnsupportedFeature(`Create association`);
        // diagramRenderer.changeMode(
        //   DIAGRAM_EDIT_MODE.RELATIONSHIP,
        //   DIAGRAM_RELATIONSHIP_EDIT_MODE.ASSOCIATION,
        // );
      }
    };

    const switchToRelationshipInheritanceMode = (): void => {
      if (!isReadOnly) {
        diagramRenderer.changeMode(
          DIAGRAM_EDIT_MODE.RELATIONSHIP,
          DIAGRAM_RELATIONSHIP_EDIT_MODE.INHERITANCE,
        );
      }
    };

    const addNewClassView = (): void => {
      if (!isReadOnly) {
        diagramRenderer.changeMode(
          DIAGRAM_EDIT_MODE.ADD_CLASS,
          DIAGRAM_RELATIONSHIP_EDIT_MODE.NONE,
        );
      }
    };

    return (
      <div className="diagram-editor__tools">
        <button
          className={clsx('diagram-editor__tool', {
            'diagram-editor__tool--active':
              diagramRenderer.editMode === DIAGRAM_EDIT_MODE.LAYOUT,
          })}
          tabIndex={-1}
          onClick={switchToLayoutMode}
          title="View Tool"
        >
          <FiMove className="diagram-editor__icon--layout" />
        </button>
        <button
          className={clsx('diagram-editor__tool', {
            'diagram-editor__tool--active':
              diagramRenderer.editMode === DIAGRAM_EDIT_MODE.RELATIONSHIP &&
              diagramRenderer.relationshipMode ===
                DIAGRAM_RELATIONSHIP_EDIT_MODE.PROPERTY,
          })}
          tabIndex={-1}
          title="Property Tool"
          onClick={switchToRelationshipPropertyMode}
        >
          <FiMinus className="diagram-editor__icon--property" />
        </button>
        <button
          className={clsx('diagram-editor__tool', {
            'diagram-editor__tool--active':
              diagramRenderer.editMode === DIAGRAM_EDIT_MODE.RELATIONSHIP &&
              diagramRenderer.relationshipMode ===
                DIAGRAM_RELATIONSHIP_EDIT_MODE.INHERITANCE,
          })}
          tabIndex={-1}
          title="Inheritance Tool"
          onClick={switchToRelationshipInheritanceMode}
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
          onClick={switchToRelationshipAssociationMode}
        >
          <IoResize className="diagram-editor__icon--association" />
        </button>
        <button
          className={clsx('diagram-editor__tool', {
            'diagram-editor__tool--active':
              diagramRenderer.editMode === DIAGRAM_EDIT_MODE.ADD_CLASS,
          })}
          tabIndex={-1}
          title="New Class..."
          onClick={addNewClassView}
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

const DiagramEditorOverlay = observer(() => {
  const editorStore = useEditorStore();
  const diagramEditorState =
    editorStore.getCurrentEditorState(DiagramEditorState);
  const sidePanelState = diagramEditorState.sidePanelState;

  const resizeSidePanel = (handleProps: HandlerProps): void =>
    diagramEditorState.sidePanelDisplayState.setSize(
      (handleProps.domElement as HTMLDivElement).getBoundingClientRect().width,
    );

  const redrawOnClassChange = useCallback((): void => {
    diagramEditorState.diagram.deadReferencesCleanUp(
      editorStore.graphState.graph,
    );
    diagramEditorState.diagramRenderer.start();
  }, [diagramEditorState, editorStore]);

  return (
    <ReflexContainer className="diagram-editor__overlay" orientation="vertical">
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
          <div className="panel__header diagram-editor__side-panel__header"></div>
          <div className="panel__content diagram-editor__side-panel__content">
            {sidePanelState instanceof DiagramEditorNewClassSidePanelState && (
              <DiagramEditorClassCreator newClassEditorState={sidePanelState} />
            )}
            {sidePanelState instanceof
              DiagramEditorClassEditorSidePanelState && (
              <ClassFormEditor
                _class={sidePanelState.classEditorState.class}
                editorState={sidePanelState.classEditorState}
                onHashChange={redrawOnClassChange}
              />
            )}
          </div>
        </div>
      </ReflexElement>
    </ReflexContainer>
  );
});

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
        // redraw diagram
        diagramEditorState.diagramRenderer.start();
      }
    };

    const changeMultiplicity = (val: Multiplicity): void => {
      if (property instanceof DerivedProperty || property instanceof Property) {
        property.setMultiplicity(val);
        // redraw diagram
        diagramEditorState.diagramRenderer.start();
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

const INLINE_PROPERTY_EDITOR_HEIGHT = 38;
const INLINE_PROPERTY_EDITOR_WIDTH = 200;

const DiagramEditorInlinePropertyEditor = observer(
  (props: { diagramEditorState: DiagramEditorState }) => {
    const { diagramEditorState } = props;
    const closeEditor = (): void => {
      diagramEditorState.setInlinePropertyEditorState(undefined);
    };
    const inlinePropertyEditorState =
      diagramEditorState.inlinePropertyEditorState;
    const anchorPositionPoint = inlinePropertyEditorState
      ? diagramEditorState.diagramRenderer.toCanvasCoordinate(
          inlinePropertyEditorState.point,
        )
      : new Point(0, 0);

    return (
      <BaseMenu
        onClose={closeEditor}
        anchorPosition={{
          left:
            diagramEditorState.diagramRenderer.divPosition.x +
            anchorPositionPoint.x -
            INLINE_PROPERTY_EDITOR_WIDTH / 2,
          top:
            diagramEditorState.diagramRenderer.divPosition.y +
            anchorPositionPoint.y -
            INLINE_PROPERTY_EDITOR_HEIGHT / 2,
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
      </BaseMenu>
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
        diagramEditorState.setDiagramRenderer(renderer);
        diagramEditorState.setupDiagramRenderer();
        renderer.start();
        renderer.autoRecenter();
      }
    }, [diagramCanvasRef, diagramEditorState]);

    useEffect(() => {
      if (diagramEditorState.isDiagramRendererInitialized) {
        diagramEditorState.diagramRenderer.refresh();
      }
    }, [diagramEditorState, width, height]);

    // Drag and Drop
    const handleDrop = useCallback(
      (item: ElementDragSource, monitor: DropTargetMonitor): void => {
        if (!isReadOnly) {
          if (item instanceof ElementDragSource) {
            if (item.data.packageableElement instanceof Class) {
              const dropPosition = monitor.getSourceClientOffset();
              diagramEditorState.diagramRenderer.addClassView(
                item.data.packageableElement,
                dropPosition
                  ? new Point(dropPosition.x, dropPosition.y)
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

export const DiagramEditor = observer(() => {
  const editorStore = useEditorStore();
  const diagramEditorState =
    editorStore.getCurrentEditorState(DiagramEditorState);
  const diagramCanvasRef = useRef<HTMLDivElement>(null);

  const toggleSidePanel = (): void => {
    diagramEditorState.sidePanelDisplayState.toggle();
    if (!diagramEditorState.sidePanelDisplayState.isOpen) {
      diagramEditorState.setSidePanelState(undefined);
    }
  };

  return (
    <div className="diagram-editor">
      <div className="diagram-editor__header">
        {diagramEditorState.isDiagramRendererInitialized && (
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
        )}
      </div>
      <div className="diagram-editor__content">
        {diagramEditorState.isDiagramRendererInitialized && (
          <DiagramEditorOverlay />
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
            <DiagramEditorInlinePropertyEditor
              diagramEditorState={diagramEditorState}
            />
          )}
        </div>
      </div>
    </div>
  );
});
