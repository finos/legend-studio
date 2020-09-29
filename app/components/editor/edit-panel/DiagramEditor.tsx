/**
 * Copyright 2020 Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { TYPICAL_MULTIPLICITY_TYPE } from 'MetaModelConst';
import { ClassEditorState } from 'Stores/editor-state/element-editor-state/ClassEditorState';
import { ClassFormEditor } from './uml-editor/ClassEditor';
import ReactResizeDetector from 'react-resize-detector';
import { useDrop, DropTargetMonitor } from 'react-dnd';
import { useEditorStore } from 'Stores/EditorStore';
import { FaTimes, FaChevronDown, FaChevronRight, FaFolder } from 'react-icons/fa';
import SplitPane from 'react-split-pane';
import { observer } from 'mobx-react-lite';
import { DiagramRenderer } from 'Components/shared/diagram-viewer/DiagramRenderer';
import { DiagramEditorState } from 'Stores/editor-state/element-editor-state/DiagramEditorState';
import { DND_TYPE, DiagramEditorDropTarget, ElementDragSource } from 'Utilities/DnDUtil';
import clsx from 'clsx';
import { isNonNullable, guaranteeType } from 'Utilities/GeneralUtil';
import { getPackableElementTreeData, getPackableElementTreeNodeData, openNode, getSelectedPackageTreeNodePackage } from 'Utilities/PackageTreeUtil';
import { TreeView, TreeNodeContainerProps } from 'Components/shared/TreeView';
import { TreeData, PackageTreeNodeData } from 'Utilities/TreeUtil';
import { Class } from 'MM/model/packageableElements/domain/Class';
import { Point } from 'MM/model/packageableElements/diagram/geometry/Point';
import { ClassView } from 'MM/model/packageableElements/diagram/ClassView';
import { Package } from 'MM/model/packageableElements/domain/Package';
import { PackageableElement } from 'MM/model/packageableElements/PackageableElement';
import { Property } from 'MM/model/packageableElements/domain/Property';
import { GenericType } from 'MM/model/packageableElements/domain/GenericType';
import { GenericTypeExplicitReference } from 'MM/model/packageableElements/domain/GenericTypeReference';

const PackageTreeNodeContainer: React.FC<TreeNodeContainerProps<PackageTreeNodeData, { onNodeExpand: (node: PackageTreeNodeData) => void }>> = props => {
  const { node, level, stepPaddingInRem, onNodeSelect, innerProps } = props;
  const { onNodeExpand } = innerProps;
  const isPackage = Boolean(node.childrenIds?.length);
  const nodeExpandIcon = isPackage
    ? node.childrenIds?.length
      ? node.isOpen ? <FaChevronDown /> : <FaChevronRight />
      : <div></div>
    : <div></div>;
  const nodeTypeIcon = <FaFolder />;
  const selectNode = (): void => onNodeSelect?.(node);
  const toggleExpansion = (): void => onNodeExpand(node);

  return (
    <div className={clsx('tree-view__node__container', { 'package-tree__node__container--selected': node.isSelected })}
      onClick={selectNode}
      style={{ paddingLeft: `${level * (stepPaddingInRem ?? 1)}rem`, display: 'flex' }}>
      <div className="tree-view__node__icon package-tree__node__icon">
        <div className="package-tree__expand-icon" onClick={toggleExpansion}>
          {nodeExpandIcon}
        </div>
        <div className="package-tree__type-icon">
          {nodeTypeIcon}
        </div>
      </div>
      <div className="tree-view__node__label">
        {node.label}
      </div>
    </div>
  );
};

export const DiagramEditorClassCreator = observer((props: {
  onSubmit: (_class: Class, position: Point) => void;
  createNewClassEvent: MouseEvent;
  packageTree: TreeData<PackageTreeNodeData>;
}) => {
  const { onSubmit, createNewClassEvent, packageTree } = props;
  const editorStore = useEditorStore();
  // Name
  const [name, setName] = useState('');
  const handleNameChange: React.ChangeEventHandler<HTMLInputElement> = event => setName(event.target.value);
  const elementNameInputRef = useRef<HTMLInputElement>(null);
  // Package
  const [treeData, setTreeData] = useState<TreeData<PackageTreeNodeData>>(packageTree);
  const [selectedTreeNode, setSelectedTreeNode] = useState<PackageTreeNodeData | undefined>(Array.from(packageTree.nodes.values()).find(node => node.isSelected));
  const selectedPackage = getSelectedPackageTreeNodePackage(selectedTreeNode) ?? editorStore.graphState.graph.root;
  const onNodeSelect = (node: PackageTreeNodeData): void => {
    if (selectedTreeNode) { selectedTreeNode.isSelected = false }
    node.isSelected = true;
    setSelectedTreeNode(node);
  };

  const onNodeExpand = (node: PackageTreeNodeData): void => {
    // Expand if possible
    if (node.childrenIds?.length) {
      node.isOpen = !node.isOpen;
      if (node.packageableElement instanceof Package) {
        node.packageableElement.children
          .map(child => getPackableElementTreeNodeData(child, (childElement: PackageableElement) => childElement instanceof Package))
          .filter(childNode => !treeData.nodes.has(childNode.id))
          .forEach(childNode => {
            treeData.nodes.set(childNode.id, childNode);
          });
      }
    }
    setTreeData({ ...treeData });
  };

  const getChildNodes = (node: PackageTreeNodeData): PackageTreeNodeData[] => {
    if (!node.childrenIds) {
      return [];
    }
    const childrenNodes = node.childrenIds
      .map(id => treeData.nodes.get(id))
      .filter(isNonNullable)
      .filter(node => node.packageableElement instanceof Package)
      // packages comes first, within each group, sort by name
      .sort((a, b) => a.label.localeCompare(b.label))
      .sort((a, b) => (b.packageableElement instanceof Package ? 1 : 0) - (a.packageableElement instanceof Package ? 1 : 0));
    return childrenNodes;
  };

  useEffect(() => {
    elementNameInputRef.current?.focus();
  }, []);

  // Submit button
  const elementToOverride = selectedPackage.children.find(child => child instanceof Class && child.name === name);
  const buttonText = elementToOverride
    ? 'Overriding is not allowed'
    : editorStore.graphState.graph.isRoot(selectedPackage) ? 'Creating class at root is not allowed' : 'Create';
  const save = (): void => {
    if (name && !elementToOverride) {
      const _class = new Class(name);
      selectedPackage.addElement(_class);
      editorStore.graphState.graph.addElement(_class);
      editorStore.explorerTreeState.reprocess();
      onSubmit(_class, new Point(createNewClassEvent.x, createNewClassEvent.y));
    }
  };

  return (
    <div className="diagram-editor__class-panel__create-new">
      <div className="diagram-editor__class-panel__create-new__title">Create new class</div>
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
            TreeNodeContainer: PackageTreeNodeContainer
          }}
          treeData={treeData}
          onNodeSelect={onNodeSelect}
          getChildNodes={getChildNodes}
          innerProps={{
            onNodeExpand
          }}
        />
      </div>
      <button
        className="btn btn--primary diagram-editor__class-panel__create-new__submit-btn"
        disabled={!name || Boolean(elementToOverride) || editorStore.graphState.graph.isRoot(selectedPackage)}
        onClick={save}
      >{buttonText}</button>
    </div>
  );
});

const DEFAULT_CLASS_PANEL_SIZE = 500;
const CLASS_PANEL_SIZE_SNAP_THRESHOLD = 100;
enum DIAGRAM_EDITOR_CLASS_PANEL_MODE {
  CREATE_NEW_CLASS = 'CREATE_NEW_CLASS',
  EDIT_CLASS = 'EDIT_CLASS',
  NONE = 'NONE',
}

export const DiagramEditor = observer(() => {
  const editorStore = useEditorStore();
  const defaultMultiplicity = editorStore.graphState.graph.getTypicalMultiplicity(TYPICAL_MULTIPLICITY_TYPE.ONE);
  const diagramEditorState = editorStore.getCurrentEditorState(DiagramEditorState);
  const diagram = diagramEditorState.diagram;
  const isReadOnly = diagramEditorState.isReadOnly;
  const [diagramRenderer, setDiagramRenderer] = useState<DiagramRenderer>();
  const [selectedClassEditor, setSelectedClassEditor] = useState<ClassEditorState | undefined>();
  const [createNewClassEvent, setCreateNewClassEvent] = useState<MouseEvent | undefined>();
  const [mode, setMode] = useState<DIAGRAM_EDITOR_CLASS_PANEL_MODE>(DIAGRAM_EDITOR_CLASS_PANEL_MODE.NONE);
  const canvas = useRef<HTMLDivElement>(null);
  const handleResize = (): void => diagramRenderer?.refresh();
  // Class Panel
  const [classPanelSize, setClassPanelSize] = useState(0);
  const resizeClassPanel = (newSize: number | undefined): void => {
    if (newSize !== undefined) {
      setClassPanelSize(newSize < CLASS_PANEL_SIZE_SNAP_THRESHOLD ? (classPanelSize > 0 ? 0 : DEFAULT_CLASS_PANEL_SIZE) : newSize);
    }
  };
  const closeClassPanel = (): void => {
    setClassPanelSize(0);
    setCreateNewClassEvent(undefined);
    setSelectedClassEditor(undefined);
    setMode(DIAGRAM_EDITOR_CLASS_PANEL_MODE.NONE);
  };
  const showClassPanel = useCallback(() => { if (!classPanelSize) { setClassPanelSize(DEFAULT_CLASS_PANEL_SIZE) } }, [classPanelSize]);
  const redrawOnClassChange = useCallback((): void => { diagramRenderer?.start() }, [diagramRenderer]);
  const onCreateClassSubmit = (_class: Class, position: Point): void => {
    if (diagramRenderer) {
      diagramRenderer.addClassView(_class, position);
      // close the create new class panel and show the property panel
      setCreateNewClassEvent(undefined);
      const classEditorState = editorStore.openedEditorStates.find((elementState): elementState is ClassEditorState => elementState instanceof ClassEditorState && elementState.element === _class) ?? editorStore.createElementState(_class);
      setSelectedClassEditor(guaranteeType(classEditorState, ClassEditorState));
      setMode(DIAGRAM_EDITOR_CLASS_PANEL_MODE.EDIT_CLASS);
    }
  };

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
      const classEditorState = editorStore.openedEditorStates.find((elementState): elementState is ClassEditorState => elementState instanceof ClassEditorState && elementState.element === cv.class.value) ?? editorStore.createElementState(cv.class.value);
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
    diagramRenderer.onAddClassPropertyForSelectedClass = (cv: ClassView): void => {
      if (selectedClassEditor) {
        selectedClassEditor.class.addProperty(new Property('', defaultMultiplicity, GenericTypeExplicitReference.create(new GenericType(cv.class.value)), selectedClassEditor.class));
      }
    };
  }

  const renderNewClassPanel = (createNewClassEvent: MouseEvent): React.ReactElement => {
    const treeData = getPackableElementTreeData(editorStore.graphState.graph.root, '', (childElement: PackageableElement) => childElement instanceof Package);
    const selectedPackageTreeNodePackage = getSelectedPackageTreeNodePackage(editorStore.explorerTreeState.selectedNode);
    if (selectedPackageTreeNodePackage) {
      const openingNode = openNode(selectedPackageTreeNodePackage, treeData, (childElement: PackageableElement) => childElement instanceof Package);
      if (openingNode) { openingNode.isSelected = true }
    }
    return <DiagramEditorClassCreator createNewClassEvent={createNewClassEvent} onSubmit={onCreateClassSubmit} packageTree={treeData} />;
  };

  // Drag and Drop
  const handleDrop = (item: DiagramEditorDropTarget, monitor: DropTargetMonitor): void => {
    if (!isReadOnly) {
      if (canvas.current && diagramRenderer && item instanceof ElementDragSource) {
        if (item.data.packageableElement instanceof Class) {
          const dropPosition = monitor.getSourceClientOffset();
          diagramRenderer.addClassView(item.data.packageableElement, dropPosition ? new Point(dropPosition.x, dropPosition.y) : undefined);
        }
      }
    }
  };
  const [, dropRef] = useDrop({
    accept: DND_TYPE.PROJECT_EXPLORER_CLASS,
    drop: (item: ElementDragSource, monitor): void => handleDrop(item, monitor)
  });

  return (
    <SplitPane split="vertical" size={classPanelSize} primary="second" onDragFinished={resizeClassPanel} defaultSize={0} minSize={0} maxSize={-300}>
      <ReactResizeDetector
        handleHeight={true}
        handleWidth={true}
        onResize={handleResize}
        refreshMode="debounce"
        refreshRate={50}
      >
        <div ref={dropRef} className="diagram-editor">
          <div ref={canvas}
            className="diagram-canvas"
            tabIndex={0}
            onContextMenu={(event): void => event.preventDefault()}
          />
        </div>
      </ReactResizeDetector>
      <div className="panel diagram-editor__class-panel">
        <div className="panel__header diagram-editor__class-panel__header">
          <button
            className="diagram-editor__class-panel__close-btn"
            onClick={closeClassPanel}
            tabIndex={-1}
            title={'Close'}
          ><FaTimes /></button>
        </div>
        <div className="panel__content diagram-editor__class-panel__content">
          {mode === DIAGRAM_EDITOR_CLASS_PANEL_MODE.CREATE_NEW_CLASS && createNewClassEvent && renderNewClassPanel(createNewClassEvent)}
          {mode === DIAGRAM_EDITOR_CLASS_PANEL_MODE.EDIT_CLASS && selectedClassEditor &&
            <ClassFormEditor _class={selectedClassEditor.class} editorState={selectedClassEditor} onHashChange={redrawOnClassChange} />
          }
          {mode === DIAGRAM_EDITOR_CLASS_PANEL_MODE.NONE &&
            <div className="diagram-editor__class-panel__content__editor--empty">Double click on a class on diagram to show it here</div>
          }
        </div>
      </div>
    </SplitPane>
  );
});
