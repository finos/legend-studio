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
import { TYPICAL_MULTIPLICITY_TYPE } from '../../../models/MetaModelConst';
import { ClassEditorState } from '../../../stores/editor-state/element-editor-state/ClassEditorState';
import { ClassFormEditor } from './uml-editor/ClassEditor';
import { useResizeDetector } from 'react-resize-detector';
import type { DropTargetMonitor } from 'react-dnd';
import { useDrop } from 'react-dnd';
import { useEditorStore } from '../../../stores/EditorStore';
import {
  FaTimes,
  FaChevronDown,
  FaChevronRight,
  FaFolder,
  FaRegKeyboard,
} from 'react-icons/fa';
import SplitPane from 'react-split-pane';
import { observer } from 'mobx-react-lite';
import {
  DiagramRenderer,
  DIAGRAM_EDIT_MODE,
  DIAGRAM_RELATIONSHIP_EDIT_MODE,
} from '../../shared/diagram-viewer/DiagramRenderer';
import { DiagramEditorState } from '../../../stores/editor-state/element-editor-state/DiagramEditorState';
import {
  CORE_DND_TYPE,
  ElementDragSource,
} from '../../../stores/shared/DnDUtil';
import { clsx, TreeView } from '@finos/legend-studio-components';
import { isNonNullable, guaranteeType } from '@finos/legend-studio-shared';
import {
  getPackableElementTreeData,
  getPackableElementTreeNodeData,
  openNode,
  getSelectedPackageTreeNodePackage,
} from '../../../stores/shared/PackageTreeUtil';
import type {
  TreeNodeContainerProps,
  TreeData,
} from '@finos/legend-studio-components';
import type { PackageTreeNodeData } from '../../../stores/shared/TreeUtil';
import { Class } from '../../../models/metamodels/pure/model/packageableElements/domain/Class';
import { Point } from '../../../models/metamodels/pure/model/packageableElements/diagram/geometry/Point';
import type { ClassView } from '../../../models/metamodels/pure/model/packageableElements/diagram/ClassView';
import { Package } from '../../../models/metamodels/pure/model/packageableElements/domain/Package';
import type { PackageableElement } from '../../../models/metamodels/pure/model/packageableElements/PackageableElement';
import { Property } from '../../../models/metamodels/pure/model/packageableElements/domain/Property';
import { GenericType } from '../../../models/metamodels/pure/model/packageableElements/domain/GenericType';
import { GenericTypeExplicitReference } from '../../../models/metamodels/pure/model/packageableElements/domain/GenericTypeReference';
import { FiMinus, FiMove, FiPlusCircle, FiTriangle } from 'react-icons/fi';
import { IoResize } from 'react-icons/io5';
import { useApplicationStore } from '../../../stores/ApplicationStore';
import { Dialog } from '@material-ui/core';

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

export const DiagramEditorClassCreator = observer(
  (props: {
    onSubmit: (_class: Class, position: Point) => void;
    createNewClassEvent: MouseEvent;
    packageTree: TreeData<PackageTreeNodeData>;
  }) => {
    const { onSubmit, createNewClassEvent, packageTree } = props;
    const editorStore = useEditorStore();
    // Name
    const [name, setName] = useState('');
    const handleNameChange: React.ChangeEventHandler<HTMLInputElement> = (
      event,
    ) => setName(event.target.value);
    const elementNameInputRef = useRef<HTMLInputElement>(null);
    // Package
    const [treeData, setTreeData] =
      useState<TreeData<PackageTreeNodeData>>(packageTree);
    const [selectedTreeNode, setSelectedTreeNode] = useState<
      PackageTreeNodeData | undefined
    >(Array.from(packageTree.nodes.values()).find((node) => node.isSelected));
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
      setTreeData({ ...treeData });
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
        onSubmit(
          _class,
          new Point(createNewClassEvent.x, createNewClassEvent.y),
        );
      }
    };

    return (
      <div className="diagram-editor__class-panel__create-new">
        <div className="diagram-editor__class-panel__create-new__title">
          Create new class
        </div>
        <input
          className="input diagram-editor__class-panel__create-new__name"
          ref={elementNameInputRef}
          spellCheck={false}
          value={name}
          onChange={handleNameChange}
          placeholder="Class name"
        />
        <div className="diagram-editor__class-panel__create-new__package-tree">
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
          className="btn btn--primary diagram-editor__class-panel__create-new__submit-btn"
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

const DEFAULT_CLASS_PANEL_SIZE = 500;
const CLASS_PANEL_SIZE_SNAP_THRESHOLD = 100;
enum DIAGRAM_EDITOR_CLASS_PANEL_MODE {
  CREATE_NEW_CLASS = 'CREATE_NEW_CLASS',
  EDIT_CLASS = 'EDIT_CLASS',
  NONE = 'NONE',
}

export const DiagramRendererHotkeyInfosModal = observer(
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
                  Remove selected element
                </div>
                <div className="diagram-editor__hotkey__keys">
                  <div className="hotkey__key">Delete</div>
                </div>
              </div>
              <div className="diagram-editor__hotkey__group">
                <div className="diagram-editor__hotkey__annotation">
                  Toggle display for properties
                </div>
                <div className="diagram-editor__hotkey__keys">
                  <div className="hotkey__key">h</div>
                </div>
              </div>
              <div className="diagram-editor__hotkey__group">
                <div className="diagram-editor__hotkey__annotation">
                  Toggle display for stereotypes
                </div>
                <div className="diagram-editor__hotkey__keys">
                  <div className="hotkey__key">s</div>
                </div>
              </div>
              <div className="diagram-editor__hotkey__group">
                <div className="diagram-editor__hotkey__annotation">
                  Toggle display for tagged values
                </div>
                <div className="diagram-editor__hotkey__keys">
                  <div className="hotkey__key">t</div>
                </div>
              </div>
              <div className="diagram-editor__hotkey__group">
                <div className="diagram-editor__hotkey__annotation">
                  Reset diagram to center
                </div>
                <div className="diagram-editor__hotkey__keys">
                  <div className="hotkey__key">c</div>
                </div>
              </div>
              <div className="diagram-editor__hotkey__group">
                <div className="diagram-editor__hotkey__annotation">
                  Separate the property being hovered on
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
            </div>
          </div>
        </div>
      </Dialog>
    );
  },
);

export const DiagramEditor = observer(() => {
  const editorStore = useEditorStore();
  const applicationStore = useApplicationStore();
  const defaultMultiplicity =
    editorStore.graphState.graph.getTypicalMultiplicity(
      TYPICAL_MULTIPLICITY_TYPE.ONE,
    );
  const diagramEditorState =
    editorStore.getCurrentEditorState(DiagramEditorState);
  const diagram = diagramEditorState.diagram;
  const isReadOnly = diagramEditorState.isReadOnly;
  const [openDiagramRendererHokeysModal, setOpenDiagramRendererHokeysModal] =
    useState(false);
  const showDiagramRendererHokeysModal = (): void =>
    setOpenDiagramRendererHokeysModal(true);
  const hideDiagramRendererHokeysModal = (): void =>
    setOpenDiagramRendererHokeysModal(false);
  const [diagramRenderer, setDiagramRenderer] = useState<DiagramRenderer>();
  const [selectedClassEditor, setSelectedClassEditor] = useState<
    ClassEditorState | undefined
  >();
  const [createNewClassEvent, setCreateNewClassEvent] = useState<
    MouseEvent | undefined
  >();
  const [classViewerMode, setClassViewerMode] =
    useState<DIAGRAM_EDITOR_CLASS_PANEL_MODE>(
      DIAGRAM_EDITOR_CLASS_PANEL_MODE.NONE,
    );
  const canvasRef = useRef<HTMLDivElement>(null);

  // Resize
  const { width, height } = useResizeDetector<HTMLDivElement>({
    refreshMode: 'debounce',
    refreshRate: 50,
    targetRef: canvasRef,
  });

  // Class Panel
  const [classPanelSize, setClassPanelSize] = useState(0);
  const resizeClassPanel = (newSize: number | undefined): void => {
    if (newSize !== undefined) {
      setClassPanelSize(
        newSize < CLASS_PANEL_SIZE_SNAP_THRESHOLD
          ? classPanelSize > 0
            ? 0
            : DEFAULT_CLASS_PANEL_SIZE
          : newSize,
      );
    }
  };
  const closeClassPanel = (): void => {
    setClassPanelSize(0);
    setCreateNewClassEvent(undefined);
    setSelectedClassEditor(undefined);
    setClassViewerMode(DIAGRAM_EDITOR_CLASS_PANEL_MODE.NONE);
  };
  const showClassPanel = useCallback(() => {
    if (!classPanelSize) {
      setClassPanelSize(DEFAULT_CLASS_PANEL_SIZE);
    }
  }, [classPanelSize]);
  const redrawOnClassChange = useCallback((): void => {
    diagramRenderer?.start();
  }, [diagramRenderer]);
  const onCreateClassSubmit = (
    _class: Class,
    position: Point | undefined,
  ): void => {
    if (diagramRenderer) {
      diagramRenderer.addClassView(_class, position);
      // close the create new class panel and show the property panel
      setCreateNewClassEvent(undefined);
      const classEditorState =
        editorStore.openedEditorStates.find(
          (elementState): elementState is ClassEditorState =>
            elementState instanceof ClassEditorState &&
            elementState.element === _class,
        ) ?? editorStore.createElementState(_class);
      setSelectedClassEditor(guaranteeType(classEditorState, ClassEditorState));
      setClassViewerMode(DIAGRAM_EDITOR_CLASS_PANEL_MODE.EDIT_CLASS);
    }
  };

  useEffect(() => {
    diagramRenderer?.refresh();
  }, [diagramRenderer, width, height]);

  // Update the diagram viewer when diagram changes
  useEffect(() => {
    if (canvasRef.current) {
      const renderer = new DiagramRenderer(canvasRef.current, diagram);
      renderer.isReadOnly = isReadOnly;
      setDiagramRenderer(renderer);
      renderer.start();
      renderer.autoRecenter();
    }
  }, [diagram, isReadOnly]);

  if (diagramRenderer) {
    diagramRenderer.onClassViewDoubleClick = (cv: ClassView): void => {
      setCreateNewClassEvent(undefined);
      const classEditorState =
        editorStore.openedEditorStates.find(
          (elementState): elementState is ClassEditorState =>
            elementState instanceof ClassEditorState &&
            elementState.element === cv.class.value,
        ) ?? editorStore.createElementState(cv.class.value);
      setSelectedClassEditor(guaranteeType(classEditorState, ClassEditorState));
      setClassViewerMode(DIAGRAM_EDITOR_CLASS_PANEL_MODE.EDIT_CLASS);
      showClassPanel();
    };
    const createNewClassView = (event: MouseEvent): void => {
      if (!isReadOnly) {
        setCreateNewClassEvent(event);
        setClassViewerMode(DIAGRAM_EDITOR_CLASS_PANEL_MODE.CREATE_NEW_CLASS);
        showClassPanel();
      }
    };
    diagramRenderer.onBackgroundDoubleClick = createNewClassView;
    diagramRenderer.onAddClassViewClick = createNewClassView;
    diagramRenderer.onAddClassPropertyForSelectedClass = (
      cv: ClassView,
    ): void => {
      if (selectedClassEditor) {
        selectedClassEditor.class.addProperty(
          new Property(
            '',
            defaultMultiplicity,
            GenericTypeExplicitReference.create(
              new GenericType(cv.class.value),
            ),
            selectedClassEditor.class,
          ),
        );
      }
    };
  }

  const renderNewClassPanel = (event: MouseEvent): React.ReactElement => {
    const treeData = getPackableElementTreeData(
      editorStore,
      editorStore.graphState.graph.root,
      '',
      (childElement: PackageableElement) => childElement instanceof Package,
    );
    const selectedPackageTreeNodePackage = getSelectedPackageTreeNodePackage(
      editorStore.explorerTreeState.selectedNode,
    );
    if (selectedPackageTreeNodePackage) {
      const openingNode = openNode(
        editorStore,
        selectedPackageTreeNodePackage,
        treeData,
        (childElement: PackageableElement) => childElement instanceof Package,
      );
      if (openingNode) {
        openingNode.isSelected = true;
      }
    }
    return (
      <DiagramEditorClassCreator
        createNewClassEvent={event}
        onSubmit={onCreateClassSubmit}
        packageTree={treeData}
      />
    );
  };

  const switchToLayoutMode = (): void => {
    if (diagramRenderer && !isReadOnly) {
      diagramRenderer.changeMode(
        DIAGRAM_EDIT_MODE.LAYOUT,
        DIAGRAM_RELATIONSHIP_EDIT_MODE.NONE,
      );
    }
  };

  const switchToRelationshipPropertyMode = (): void => {
    if (diagramRenderer && !isReadOnly) {
      diagramRenderer.changeMode(
        DIAGRAM_EDIT_MODE.RELATIONSHIP,
        DIAGRAM_RELATIONSHIP_EDIT_MODE.PROPERTY,
      );
    }
  };

  const switchToRelationshipAssociationMode = (): void => {
    if (diagramRenderer && !isReadOnly) {
      applicationStore.notifyUnsupportedFeature(`Create association`);
      // diagramRenderer.changeMode(
      //   DIAGRAM_EDIT_MODE.RELATIONSHIP,
      //   DIAGRAM_RELATIONSHIP_EDIT_MODE.ASSOCIATION,
      // );
    }
  };

  const switchToRelationshipInheritanceMode = (): void => {
    if (diagramRenderer && !isReadOnly) {
      diagramRenderer.changeMode(
        DIAGRAM_EDIT_MODE.RELATIONSHIP,
        DIAGRAM_RELATIONSHIP_EDIT_MODE.INHERITANCE,
      );
    }
  };

  const addNewClassView = (): void => {
    if (diagramRenderer && !isReadOnly) {
      diagramRenderer.changeMode(
        DIAGRAM_EDIT_MODE.ADD_CLASS,
        DIAGRAM_RELATIONSHIP_EDIT_MODE.NONE,
      );
    }
  };

  // Drag and Drop
  const handleDrop = useCallback(
    (item: ElementDragSource, monitor: DropTargetMonitor): void => {
      if (!isReadOnly) {
        if (
          canvasRef.current &&
          diagramRenderer &&
          item instanceof ElementDragSource
        ) {
          if (item.data.packageableElement instanceof Class) {
            const dropPosition = monitor.getSourceClientOffset();
            diagramRenderer.addClassView(
              item.data.packageableElement,
              dropPosition
                ? new Point(dropPosition.x, dropPosition.y)
                : undefined,
            );
          }
        }
      }
    },
    [diagramRenderer, isReadOnly],
  );
  const [, dropConnector] = useDrop(
    () => ({
      accept: CORE_DND_TYPE.PROJECT_EXPLORER_CLASS,
      drop: (item: ElementDragSource, monitor): void =>
        handleDrop(item, monitor),
    }),
    [handleDrop],
  );
  dropConnector(canvasRef);

  return (
    <SplitPane
      split="vertical"
      size={classPanelSize}
      primary="second"
      onDragFinished={resizeClassPanel}
      defaultSize={0}
      minSize={0}
      maxSize={-300}
    >
      <div className="diagram-editor">
        <div className="diagram-editor__tools">
          <button
            className={clsx('diagram-editor__tool', {
              'diagram-editor__tool--active':
                diagramRenderer?.editMode === DIAGRAM_EDIT_MODE.LAYOUT,
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
                diagramRenderer?.editMode === DIAGRAM_EDIT_MODE.RELATIONSHIP &&
                diagramRenderer?.relationshipMode ===
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
                diagramRenderer?.editMode === DIAGRAM_EDIT_MODE.RELATIONSHIP &&
                diagramRenderer?.relationshipMode ===
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
              //   diagramRenderer?.editMode === DIAGRAM_EDIT_MODE.RELATIONSHIP &&
              //   diagramRenderer?.relationshipMode ===
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
                diagramRenderer?.editMode === DIAGRAM_EDIT_MODE.ADD_CLASS,
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
        </div>
        <div
          ref={canvasRef}
          className="diagram-canvas diagram-editor__canvas"
          tabIndex={0}
          onContextMenu={(event): void => event.preventDefault()}
        />
        <DiagramRendererHotkeyInfosModal
          open={openDiagramRendererHokeysModal}
          onClose={hideDiagramRendererHokeysModal}
        />
      </div>
      <div className="panel diagram-editor__class-panel">
        <div className="panel__header diagram-editor__class-panel__header">
          <button
            className="diagram-editor__class-panel__close-btn"
            onClick={closeClassPanel}
            tabIndex={-1}
            title={'Close'}
          >
            <FaTimes />
          </button>
        </div>
        <div className="panel__content diagram-editor__class-panel__content">
          {classViewerMode ===
            DIAGRAM_EDITOR_CLASS_PANEL_MODE.CREATE_NEW_CLASS &&
            createNewClassEvent &&
            renderNewClassPanel(createNewClassEvent)}
          {classViewerMode === DIAGRAM_EDITOR_CLASS_PANEL_MODE.EDIT_CLASS &&
            selectedClassEditor && (
              <ClassFormEditor
                _class={selectedClassEditor.class}
                editorState={selectedClassEditor}
                onHashChange={redrawOnClassChange}
              />
            )}
          {classViewerMode === DIAGRAM_EDITOR_CLASS_PANEL_MODE.NONE && (
            <div className="diagram-editor__class-panel__content__editor--empty">
              Double click on a class on diagram to show it here
            </div>
          )}
        </div>
      </div>
    </SplitPane>
  );
});
