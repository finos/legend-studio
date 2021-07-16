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

import { computed, action, makeObservable, observable } from 'mobx';
import type { EditorStore } from '../../EditorStore';
import {
  guaranteeNonNullable,
  guaranteeType,
  uuid,
} from '@finos/legend-studio-shared';
import { ElementEditorState } from './ElementEditorState';
import type { PackageableElement } from '../../../models/metamodels/pure/model/packageableElements/PackageableElement';
import { Diagram } from '../../../models/metamodels/pure/model/packageableElements/diagram/Diagram';
import type { DiagramRenderer } from '../../../components/shared/diagram-viewer/DiagramRenderer';
import { ClassEditorState } from './ClassEditorState';
import {
  getPackableElementTreeData,
  getSelectedPackageTreeNodePackage,
  openNode,
} from '../../shared/PackageTreeUtil';
import { Package } from '../../../models/metamodels/pure/model/packageableElements/domain/Package';
import type { PackageTreeNodeData } from '../../shared/TreeUtil';
import type { TreeData } from '@finos/legend-studio-components';
import { PanelDisplayState } from '@finos/legend-studio-components';
import type { ClassView } from '../../../models/metamodels/pure/model/packageableElements/diagram/ClassView';
import { GenericTypeExplicitReference } from '../../../models/metamodels/pure/model/packageableElements/domain/GenericTypeReference';
import { TYPICAL_MULTIPLICITY_TYPE } from '../../../models/MetaModelConst';
import { Property } from '../../../models/metamodels/pure/model/packageableElements/domain/Property';
import { GenericType } from '../../../models/metamodels/pure/model/packageableElements/domain/GenericType';

export abstract class DiagramEditorSidePanelState {
  uuid = uuid();
  editorStore: EditorStore;
  diagramEditorState: DiagramEditorState;

  constructor(
    editorStore: EditorStore,
    diagramEditorState: DiagramEditorState,
  ) {
    this.editorStore = editorStore;
    this.diagramEditorState = diagramEditorState;
  }
}

export class DiagramEditorClassEditorSidePanelState extends DiagramEditorSidePanelState {
  classEditorState: ClassEditorState;

  constructor(
    editorStore: EditorStore,
    diagramEditorState: DiagramEditorState,
    classEditorState: ClassEditorState,
  ) {
    super(editorStore, diagramEditorState);
    this.classEditorState = classEditorState;
  }
}

export class DiagramEditorNewClassSidePanelState extends DiagramEditorSidePanelState {
  creationMouseEvent: MouseEvent;
  packageTreeData: TreeData<PackageTreeNodeData>;

  constructor(
    editorStore: EditorStore,
    diagramEditorState: DiagramEditorState,
    creationMouseEvent: MouseEvent,
  ) {
    super(editorStore, diagramEditorState);

    makeObservable(this, {
      packageTreeData: observable,
      setPackageTreeData: action,
    });

    this.creationMouseEvent = creationMouseEvent;
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
    this.packageTreeData = treeData;
  }

  setPackageTreeData(val: TreeData<PackageTreeNodeData>): void {
    this.packageTreeData = val;
  }
}

export class DiagramEditorState extends ElementEditorState {
  _diagramRenderer?: DiagramRenderer;
  showHotkeyInfosModal = false;
  sidePanelDisplayState = new PanelDisplayState({
    initial: 0,
    default: 500,
    snap: 100,
  });
  sidePanelState?: DiagramEditorSidePanelState;

  constructor(editorStore: EditorStore, element: PackageableElement) {
    super(editorStore, element);

    makeObservable(this, {
      _diagramRenderer: observable,
      showHotkeyInfosModal: observable,
      sidePanelDisplayState: observable,
      sidePanelState: observable,
      diagramRenderer: computed,
      diagram: computed,
      isDiagramRendererInitialized: computed,
      setShowHotkeyInfosModal: action,
      setDiagramRenderer: action,
      setSidePanelState: action,
      reprocess: action,
    });
  }

  get diagram(): Diagram {
    return guaranteeType(
      this.element,
      Diagram,
      'Element inside diagram editor state must be a diagram',
    );
  }

  get diagramRenderer(): DiagramRenderer {
    return guaranteeNonNullable(
      this._diagramRenderer,
      `Diagram renderer must be initialized (this is likely caused by calling this method at the wrong place)`,
    );
  }

  get isDiagramRendererInitialized(): boolean {
    return Boolean(this._diagramRenderer);
  }

  setDiagramRenderer(val: DiagramRenderer): void {
    this._diagramRenderer = val;
  }

  setShowHotkeyInfosModal(val: boolean): void {
    this.showHotkeyInfosModal = val;
  }

  setSidePanelState(val: DiagramEditorSidePanelState | undefined): void {
    this.sidePanelState = val;
  }

  setupDiagramRenderer(): void {
    this.diagramRenderer.setIsReadOnly(this.isReadOnly);
    this.diagramRenderer.onClassViewDoubleClick = (
      classView: ClassView,
    ): void => {
      this.setSidePanelState(
        new DiagramEditorClassEditorSidePanelState(
          this.editorStore,
          this,
          guaranteeType(
            this.editorStore.openedEditorStates.find(
              (elementState): elementState is ClassEditorState =>
                elementState instanceof ClassEditorState &&
                elementState.element === classView.class.value,
            ) ?? this.editorStore.createElementState(classView.class.value),
            ClassEditorState,
          ),
        ),
      );
      this.sidePanelDisplayState.open();
    };
    const createNewClassView = (event: MouseEvent): void => {
      if (!this.isReadOnly) {
        this.setSidePanelState(
          new DiagramEditorNewClassSidePanelState(
            this.editorStore,
            this,
            event,
          ),
        );
        this.sidePanelDisplayState.open();
      }
    };
    this.diagramRenderer.onBackgroundDoubleClick = createNewClassView;
    this.diagramRenderer.onAddClassViewClick = createNewClassView;
    this.diagramRenderer.onAddClassPropertyForSelectedClass = (
      classView: ClassView,
    ): void => {
      if (
        this.sidePanelState instanceof DiagramEditorClassEditorSidePanelState
      ) {
        const _class = this.sidePanelState.classEditorState.class;
        _class.addProperty(
          new Property(
            `newProperty_${_class.properties.length}`,
            this.editorStore.graphState.graph.getTypicalMultiplicity(
              TYPICAL_MULTIPLICITY_TYPE.ONE,
            ),
            GenericTypeExplicitReference.create(
              new GenericType(classView.class.value),
            ),
            _class,
          ),
        );
      }
    };
  }

  reprocess(
    newElement: PackageableElement,
    editorStore: EditorStore,
  ): ElementEditorState {
    const diagramEditorState = new DiagramEditorState(editorStore, newElement);
    return diagramEditorState;
  }
}
