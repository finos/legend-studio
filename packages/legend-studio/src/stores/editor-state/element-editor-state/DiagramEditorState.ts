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
import { DIAGRAM_EDIT_MODE } from '../../../components/shared/diagram-viewer/DiagramRenderer';
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
import {
  PRIMITIVE_TYPE,
  TYPICAL_MULTIPLICITY_TYPE,
} from '../../../models/MetaModelConst';
import { Property } from '../../../models/metamodels/pure/model/packageableElements/domain/Property';
import { GenericType } from '../../../models/metamodels/pure/model/packageableElements/domain/GenericType';
import type { AbstractProperty } from '../../../models/metamodels/pure/model/packageableElements/domain/AbstractProperty';
import type { Point } from '../../../models/metamodels/pure/model/packageableElements/diagram/geometry/Point';
import type { PropertyHolderView } from '../../../models/metamodels/pure/model/packageableElements/diagram/PropertyHolderView';
import type { PropertyReference } from '../../../models/metamodels/pure/model/packageableElements/domain/PropertyReference';
import { PropertyExplicitReference } from '../../../models/metamodels/pure/model/packageableElements/domain/PropertyReference';

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

export class DiagramEditorInlinePropertyEditorState {
  diagramEditorState: DiagramEditorState;
  property: PropertyReference;
  point: Point;

  constructor(
    diagramEditorState: DiagramEditorState,
    property: AbstractProperty,
    point: Point,
  ) {
    this.diagramEditorState = diagramEditorState;
    this.property = PropertyExplicitReference.create(property);
    this.point = point;
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
  inlinePropertyEditorState?: DiagramEditorInlinePropertyEditorState;

  constructor(editorStore: EditorStore, element: PackageableElement) {
    super(editorStore, element);

    makeObservable(this, {
      _diagramRenderer: observable,
      showHotkeyInfosModal: observable,
      sidePanelDisplayState: observable,
      sidePanelState: observable,
      inlinePropertyEditorState: observable,
      diagramRenderer: computed,
      diagram: computed,
      isDiagramRendererInitialized: computed,
      setShowHotkeyInfosModal: action,
      setDiagramRenderer: action,
      setSidePanelState: action,
      setInlinePropertyEditorState: action,
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

  // NOTE: we have tried to use React to control the cursor and
  // could not overcome the jank/lag problem, so we settle with CSS-based approach
  // See https://css-tricks.com/using-css-cursors/
  // See https://developer.mozilla.org/en-US/docs/Web/CSS/cursor
  get diagramCursorClass(): string {
    if (this.isReadOnly || !this.isDiagramRendererInitialized) {
      return '';
    }
    switch (this.diagramRenderer.editMode) {
      case DIAGRAM_EDIT_MODE.ADD_CLASS: {
        return 'diagram-editor__cursor--add';
      }
      case DIAGRAM_EDIT_MODE.RELATIONSHIP: {
        if (
          this.diagramRenderer.mouseOverClassView &&
          this.diagramRenderer.selectionStart
        ) {
          return 'diagram-editor__cursor--add';
        }
        return 'diagram-editor__cursor--crosshair';
      }
      case DIAGRAM_EDIT_MODE.LAYOUT: {
        if (this.diagramRenderer.selectionStart) {
          return 'diagram-editor__cursor--crosshair';
        } else if (
          this.diagramRenderer.mouseOverClassCorner ||
          this.diagramRenderer.selectedClassCorner
        ) {
          return 'diagram-editor__cursor--resize';
        } else if (this.diagramRenderer.mouseOverProperty) {
          return 'diagram-editor__cursor--text';
        } else if (this.diagramRenderer.mouseOverClassView) {
          return 'diagram-editor__cursor--pointer';
        }
        return '';
      }
      default:
        return '';
    }
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

  setInlinePropertyEditorState(
    val: DiagramEditorInlinePropertyEditorState | undefined,
  ): void {
    this.inlinePropertyEditorState = val;
  }

  setupDiagramRenderer(): void {
    this.diagramRenderer.setIsReadOnly(this.isReadOnly);
    this.diagramRenderer.editClass = (classView: ClassView): void => {
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
    const createNewClassView = (mouseEvent: MouseEvent): void => {
      if (!this.isReadOnly) {
        this.setSidePanelState(
          new DiagramEditorNewClassSidePanelState(
            this.editorStore,
            this,
            mouseEvent,
          ),
        );
        this.sidePanelDisplayState.open();
      }
    };
    this.diagramRenderer.onBackgroundDoubleClick = createNewClassView;
    this.diagramRenderer.onAddClassViewClick = createNewClassView;
    this.diagramRenderer.addSelectedClassAsPropertyOfOpenedClass = (
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
        // TODO?: should we also try to add property views between these 2 classes?
        // we would need to scan all possible source class view(s) and potentially link them to
        // the class view selected or all class view(s) for the class of the selected class view
      }
    };
    this.diagramRenderer.editProperty = (
      property: AbstractProperty,
      point: Point,
    ): void => {
      this.setInlinePropertyEditorState(
        new DiagramEditorInlinePropertyEditorState(this, property, point),
      );
    };
    this.diagramRenderer.editPropertyView = (
      propertyHolderView: PropertyHolderView,
    ): void => {
      this.setInlinePropertyEditorState(
        new DiagramEditorInlinePropertyEditorState(
          this,
          propertyHolderView.property.value,
          propertyHolderView.path.length
            ? propertyHolderView.path[0]
            : propertyHolderView.from.classView.value.center(),
        ),
      );
    };
    this.diagramRenderer.addSimpleProperty = (classView: ClassView): void => {
      const _class = classView.class.value;
      _class.addProperty(
        new Property(
          `newProperty_${_class.properties.length}`,
          this.editorStore.graphState.graph.getTypicalMultiplicity(
            TYPICAL_MULTIPLICITY_TYPE.ONE,
          ),
          GenericTypeExplicitReference.create(
            new GenericType(
              this.editorStore.graphState.graph.getPrimitiveType(
                PRIMITIVE_TYPE.STRING,
              ),
            ),
          ),
          _class,
        ),
      );
      this.diagramRenderer.start();
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
