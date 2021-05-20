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
} from 'react-icons/fa';
import SplitPane from 'react-split-pane';
import { observer } from 'mobx-react-lite';
import { DiagramRenderer } from '../../shared/diagram-viewer/DiagramRenderer';
import { DiagramEditorState } from '../../../stores/editor-state/element-editor-state/DiagramEditorState';
import type { DiagramEditorDropTarget } from '../../../stores/shared/DnDUtil';
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
          placeholder={`Class name`}
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

export const DiagramEditor = observer(() => {
  const editorStore = useEditorStore();
  const defaultMultiplicity =
    editorStore.graphState.graph.getTypicalMultiplicity(
      TYPICAL_MULTIPLICITY_TYPE.ONE,
    );
  const diagramEditorState =
    editorStore.getCurrentEditorState(DiagramEditorState);
  const diagram = diagramEditorState.diagram;
  const isReadOnly = diagramEditorState.isReadOnly;
  const [diagramRenderer, setDiagramRenderer] = useState<DiagramRenderer>();
  const [selectedClassEditor, setSelectedClassEditor] =
    useState<ClassEditorState | undefined>();
  const [createNewClassEvent, setCreateNewClassEvent] =
    useState<MouseEvent | undefined>();
  const [mode, setMode] = useState<DIAGRAM_EDITOR_CLASS_PANEL_MODE>(
    DIAGRAM_EDITOR_CLASS_PANEL_MODE.NONE,
  );
  const canvas = useRef<HTMLDivElement>(null);

  // Resize
  const { ref, width, height } = useResizeDetector<HTMLDivElement>({
    refreshMode: 'debounce',
    refreshRate: 50,
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
    setMode(DIAGRAM_EDITOR_CLASS_PANEL_MODE.NONE);
  };
  const showClassPanel = useCallback(() => {
    if (!classPanelSize) {
      setClassPanelSize(DEFAULT_CLASS_PANEL_SIZE);
    }
  }, [classPanelSize]);
  const redrawOnClassChange = useCallback((): void => {
    diagramRenderer?.start();
  }, [diagramRenderer]);
  const onCreateClassSubmit = (_class: Class, position: Point): void => {
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
      setMode(DIAGRAM_EDITOR_CLASS_PANEL_MODE.EDIT_CLASS);
    }
  };

  useEffect(() => {
    diagramRenderer?.refresh();
  }, [diagramRenderer, width, height]);

  // Update the diagram viewer when diagram changes
  useEffect(() => {
    if (canvas.current) {
      const renderer = new DiagramRenderer(canvas.current, diagram);
      renderer.isReadOnly = isReadOnly;
      setDiagramRenderer(renderer);
      renderer.start();
      renderer.autoRecenter();
    }
  }, [diagram, isReadOnly]);

  if (diagramRenderer) {
    diagramRenderer.onClassViewClick = (cv: ClassView): void => {
      setCreateNewClassEvent(undefined);
      const classEditorState =
        editorStore.openedEditorStates.find(
          (elementState): elementState is ClassEditorState =>
            elementState instanceof ClassEditorState &&
            elementState.element === cv.class.value,
        ) ?? editorStore.createElementState(cv.class.value);
      setSelectedClassEditor(guaranteeType(classEditorState, ClassEditorState));
      setMode(DIAGRAM_EDITOR_CLASS_PANEL_MODE.EDIT_CLASS);
      showClassPanel();
    };
    diagramRenderer.onBackgroundDoubleClick = (event: MouseEvent): void => {
      if (!isReadOnly) {
        setCreateNewClassEvent(event);
        setMode(DIAGRAM_EDITOR_CLASS_PANEL_MODE.CREATE_NEW_CLASS);
        showClassPanel();
      }
    };
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

  // Drag and Drop
  const handleDrop = useCallback(
    (item: DiagramEditorDropTarget, monitor: DropTargetMonitor): void => {
      if (!isReadOnly) {
        if (
          canvas.current &&
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
  dropConnector(ref);

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
      <div ref={ref} className="diagram-editor">
        <div
          ref={canvas}
          className="diagram-canvas"
          tabIndex={0}
          onContextMenu={(event): void => event.preventDefault()}
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
          {mode === DIAGRAM_EDITOR_CLASS_PANEL_MODE.CREATE_NEW_CLASS &&
            createNewClassEvent &&
            renderNewClassPanel(createNewClassEvent)}
          {mode === DIAGRAM_EDITOR_CLASS_PANEL_MODE.EDIT_CLASS &&
            selectedClassEditor && (
              <ClassFormEditor
                _class={selectedClassEditor.class}
                editorState={selectedClassEditor}
                onHashChange={redrawOnClassChange}
              />
            )}
          {mode === DIAGRAM_EDITOR_CLASS_PANEL_MODE.NONE && (
            <div className="diagram-editor__class-panel__content__editor--empty">
              Double click on a class on diagram to show it here
            </div>
          )}
        </div>
      </div>
    </SplitPane>
  );
});
