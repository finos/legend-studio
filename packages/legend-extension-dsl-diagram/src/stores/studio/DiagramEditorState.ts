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
import {
  guaranteeNonNullable,
  guaranteeType,
  isType,
  uuid,
} from '@finos/legend-shared';
import {
  type DiagramRenderer,
  DIAGRAM_INTERACTION_MODE,
} from '../../components/DiagramRenderer.js';
import { PanelDisplayState } from '@finos/legend-art';
import {
  type PackageableElement,
  type AbstractProperty,
  type PropertyReference,
  GenericTypeExplicitReference,
  Property,
  GenericType,
  PropertyExplicitReference,
  isElementReadOnly,
  Multiplicity,
  PrimitiveType,
} from '@finos/legend-graph';
import {
  type EditorStore,
  ClassEditorState,
  ElementEditorState,
  class_addProperty,
} from '@finos/legend-application-studio';
import type { ClassView } from '../../graph/metamodel/pure/packageableElements/diagram/DSL_Diagram_ClassView.js';
import type { Point } from '../../graph/metamodel/pure/packageableElements/diagram/geometry/DSL_Diagram_Point.js';
import { Diagram } from '../../graph/metamodel/pure/packageableElements/diagram/DSL_Diagram_Diagram.js';
import type { PropertyHolderView } from '../../graph/metamodel/pure/packageableElements/diagram/DSL_Diagram_PropertyHolderView.js';
import { DSL_DIAGRAM_LEGEND_STUDIO_COMMAND_KEY } from '../../__lib__/studio/DSL_Diagram_LegendStudioCommand.js';
import type { CommandRegistrar } from '@finos/legend-application';

export abstract class DiagramEditorSidePanelState {
  readonly uuid = uuid();
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

export enum DIAGRAM_EDITOR_SIDE_PANEL_TAB {
  ELEMENT = 'ELEMENT',
  VIEW = 'VIEW',
}

export class DiagramEditorClassViewEditorSidePanelState extends DiagramEditorSidePanelState {
  classEditorState: ClassEditorState;
  classView: ClassView;
  selectedTab = DIAGRAM_EDITOR_SIDE_PANEL_TAB.ELEMENT;

  constructor(
    editorStore: EditorStore,
    diagramEditorState: DiagramEditorState,
    classView: ClassView,
  ) {
    super(editorStore, diagramEditorState);

    makeObservable(this, {
      selectedTab: observable,
      setSelectedTab: action,
    });

    this.classView = classView;
    this.classEditorState = guaranteeType(
      this.editorStore.tabManagerState.tabs.find(
        (elementState) =>
          isType(elementState, ClassEditorState) &&
          elementState.element === classView.class.value,
      ) ?? new ClassEditorState(this.editorStore, classView.class.value),
      ClassEditorState,
    );
  }

  setSelectedTab(val: DIAGRAM_EDITOR_SIDE_PANEL_TAB): void {
    this.selectedTab = val;
  }
}

export class DiagramEditorInlineClassCreatorState {
  diagramEditorState: DiagramEditorState;
  point: Point;

  constructor(diagramEditorState: DiagramEditorState, point: Point) {
    this.diagramEditorState = diagramEditorState;
    this.point = point;
  }
}

export class DiagramEditorInlineClassRenamerState {
  diagramEditorState: DiagramEditorState;
  classView: ClassView;
  point: Point;

  constructor(
    diagramEditorState: DiagramEditorState,
    classView: ClassView,
    point: Point,
  ) {
    this.diagramEditorState = diagramEditorState;
    this.classView = classView;
    this.point = point;
  }
}

export class DiagramEditorInlinePropertyEditorState {
  diagramEditorState: DiagramEditorState;
  property: PropertyReference;
  point: Point;
  isEditingPropertyView: boolean;

  constructor(
    diagramEditorState: DiagramEditorState,
    property: AbstractProperty,
    point: Point,
    isEditingPropertyView: boolean,
  ) {
    this.diagramEditorState = diagramEditorState;
    this.property = PropertyExplicitReference.create(property);
    this.point = point;
    this.isEditingPropertyView = isEditingPropertyView;
  }
}

export class DiagramEditorState
  extends ElementEditorState
  implements CommandRegistrar
{
  _renderer?: DiagramRenderer | undefined;
  showHotkeyInfosModal = false;
  sidePanelDisplayState = new PanelDisplayState({
    initial: 0,
    default: 500,
    snap: 100,
  });
  sidePanelState?: DiagramEditorSidePanelState | undefined;
  inlinePropertyEditorState?:
    | DiagramEditorInlinePropertyEditorState
    | undefined;
  inlineClassCreatorState?: DiagramEditorInlineClassCreatorState | undefined;
  inlineClassRenamerState?: DiagramEditorInlineClassRenamerState | undefined;
  showContextMenu = false;
  contextMenuClassView?: ClassView | undefined;

  constructor(editorStore: EditorStore, element: PackageableElement) {
    super(editorStore, element);

    makeObservable(this, {
      _renderer: observable,
      showHotkeyInfosModal: observable,
      sidePanelDisplayState: observable,
      sidePanelState: observable,
      inlinePropertyEditorState: observable,
      inlineClassCreatorState: observable,
      inlineClassRenamerState: observable,
      showContextMenu: observable,
      contextMenuClassView: observable,
      renderer: computed,
      diagram: computed,
      isDiagramRendererInitialized: computed,
      setShowHotkeyInfosModal: action,
      setRenderer: action,
      setSidePanelState: action,
      setInlinePropertyEditorState: action,
      setInlineClassCreatorState: action,
      setInlineClassRenamerState: action,
      setShowContextMenu: action,
      setContextMenuClassView: action,
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

  get renderer(): DiagramRenderer {
    return guaranteeNonNullable(
      this._renderer,
      `Diagram renderer must be initialized (this is likely caused by calling this method at the wrong place)`,
    );
  }

  get isDiagramRendererInitialized(): boolean {
    return Boolean(this._renderer);
  }

  // NOTE: we have tried to use React to control the cursor and
  // could not overcome the jank/lag problem, so we settle with CSS-based approach
  // See https://css-tricks.com/using-css-cursors/
  // See https://developer.mozilla.org/en-US/docs/Web/CSS/cursor
  get diagramCursorClass(): string {
    if (!this.isDiagramRendererInitialized) {
      return '';
    }
    if (this.renderer.middleClick || this.renderer.rightClick) {
      return 'diagram-editor__cursor--grabbing';
    }
    switch (this.renderer.interactionMode) {
      case DIAGRAM_INTERACTION_MODE.ADD_CLASS: {
        return !this.isReadOnly ? 'diagram-editor__cursor--add' : '';
      }
      case DIAGRAM_INTERACTION_MODE.PAN: {
        return this.renderer.leftClick
          ? 'diagram-editor__cursor--grabbing'
          : 'diagram-editor__cursor--grab';
      }
      case DIAGRAM_INTERACTION_MODE.ZOOM_IN: {
        return 'diagram-editor__cursor--zoom-in';
      }
      case DIAGRAM_INTERACTION_MODE.ZOOM_OUT: {
        return 'diagram-editor__cursor--zoom-out';
      }
      case DIAGRAM_INTERACTION_MODE.ADD_RELATIONSHIP: {
        if (this.isReadOnly) {
          return '';
        }
        if (this.renderer.mouseOverClassView && this.renderer.selectionStart) {
          return 'diagram-editor__cursor--add';
        }
        return 'diagram-editor__cursor--crosshair';
      }
      case DIAGRAM_INTERACTION_MODE.LAYOUT: {
        if (this.renderer.selectionStart) {
          return 'diagram-editor__cursor--crosshair';
        } else if (
          this.renderer.mouseOverClassCorner ||
          this.renderer.selectedClassCorner
        ) {
          return 'diagram-editor__cursor--resize';
        } else if (this.renderer.mouseOverClassProperty) {
          return this.isReadOnly ||
            isElementReadOnly(this.renderer.mouseOverClassProperty._OWNER)
            ? 'diagram-editor__cursor--not-allowed'
            : 'diagram-editor__cursor--text';
        } else if (this.renderer.mouseOverPropertyHolderViewLabel) {
          return this.isReadOnly ||
            isElementReadOnly(
              this.renderer.mouseOverPropertyHolderViewLabel.property.value
                ._OWNER,
            )
            ? 'diagram-editor__cursor--not-allowed'
            : 'diagram-editor__cursor--text';
        } else if (this.renderer.mouseOverClassName) {
          return this.isReadOnly ||
            isElementReadOnly(this.renderer.mouseOverClassName.class.value)
            ? 'diagram-editor__cursor--not-allowed'
            : 'diagram-editor__cursor--text';
        } else if (this.renderer.mouseOverClassView) {
          return 'diagram-editor__cursor--pointer';
        }
        return '';
      }
      default:
        return '';
    }
  }

  setRenderer(val: DiagramRenderer): void {
    this._renderer = val;
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

  setInlineClassRenamerState(
    val: DiagramEditorInlineClassRenamerState | undefined,
  ): void {
    this.inlineClassRenamerState = val;
  }

  setInlineClassCreatorState(
    val: DiagramEditorInlineClassCreatorState | undefined,
  ): void {
    this.inlineClassCreatorState = val;
  }

  setShowContextMenu(val: boolean): void {
    this.showContextMenu = val;
  }

  setContextMenuClassView(val: ClassView | undefined): void {
    this.contextMenuClassView = val;
  }

  closeContextMenu(): void {
    this.setShowContextMenu(false);
  }

  setupRenderer(): void {
    this.renderer.setIsReadOnly(this.isReadOnly);
    const handleEditClassView = (classView: ClassView): void => {
      this.setSidePanelState(
        new DiagramEditorClassViewEditorSidePanelState(
          this.editorStore,
          this,
          classView,
        ),
      );
      this.sidePanelDisplayState.open();
    };
    this.renderer.onClassViewDoubleClick = handleEditClassView;
    this.renderer.handleEditClassView = handleEditClassView;
    const createNewClassView = (point: Point): void => {
      if (!this.isReadOnly) {
        this.setInlineClassCreatorState(
          new DiagramEditorInlineClassCreatorState(this, point),
        );
      }
    };
    this.renderer.onBackgroundDoubleClick = createNewClassView;
    this.renderer.onAddClassViewClick = createNewClassView;
    this.renderer.onClassViewRightClick = (
      classView: ClassView,
      point: Point,
    ): void => {
      this.setShowContextMenu(true);
      this.setContextMenuClassView(classView);
    };
    this.renderer.onClassNameDoubleClick = (
      classView: ClassView,
      point: Point,
    ): void => {
      if (!this.isReadOnly && !isElementReadOnly(classView.class.value)) {
        this.setInlineClassRenamerState(
          new DiagramEditorInlineClassRenamerState(this, classView, point),
        );
      }
    };
    const editProperty = (
      property: AbstractProperty,
      point: Point,
      propertyHolderView: PropertyHolderView | undefined,
    ): void => {
      if (!this.isReadOnly && !isElementReadOnly(property._OWNER)) {
        this.setInlinePropertyEditorState(
          new DiagramEditorInlinePropertyEditorState(
            this,
            property,
            point,
            Boolean(propertyHolderView),
          ),
        );
      }
    };
    this.renderer.onClassPropertyDoubleClick = editProperty;
    this.renderer.handleEditProperty = editProperty;
    this.renderer.handleAddSimpleProperty = (classView: ClassView): void => {
      if (!this.isReadOnly && !isElementReadOnly(classView.class.value)) {
        const _class = classView.class.value;
        class_addProperty(
          _class,
          new Property(
            `property_${_class.properties.length + 1}`,
            Multiplicity.ONE,
            GenericTypeExplicitReference.create(
              new GenericType(PrimitiveType.STRING),
            ),
            _class,
          ),
        );
        this.renderer.render();
      }
    };
  }

  registerCommands(): void {
    const DEFAULT_TRIGGER = (): boolean =>
      // make sure the current active editor is this diagram editor
      this.editorStore.tabManagerState.currentTab === this &&
      // make sure the renderer is initialized
      this.isDiagramRendererInitialized &&
      // since we use hotkeys that can be easily in text input
      // we would need to do this check to make sure we don't accidentally
      // trigger hotkeys when the user is typing
      (!document.activeElement ||
        !['input', 'textarea', 'select'].includes(
          document.activeElement.tagName.toLowerCase(),
        ));
    this.editorStore.applicationStore.commandService.registerCommand({
      key: DSL_DIAGRAM_LEGEND_STUDIO_COMMAND_KEY.RECENTER,
      trigger: this.editorStore.createEditorCommandTrigger(DEFAULT_TRIGGER),
      action: () => this.renderer.recenter(),
    });
    this.editorStore.applicationStore.commandService.registerCommand({
      key: DSL_DIAGRAM_LEGEND_STUDIO_COMMAND_KEY.USE_ZOOM_TOOL,
      trigger: this.editorStore.createEditorCommandTrigger(DEFAULT_TRIGGER),
      action: () => this.renderer.switchToZoomMode(),
    });
    this.editorStore.applicationStore.commandService.registerCommand({
      key: DSL_DIAGRAM_LEGEND_STUDIO_COMMAND_KEY.USE_VIEW_TOOL,
      trigger: this.editorStore.createEditorCommandTrigger(DEFAULT_TRIGGER),
      action: () => this.renderer.switchToViewMode(),
    });
    this.editorStore.applicationStore.commandService.registerCommand({
      key: DSL_DIAGRAM_LEGEND_STUDIO_COMMAND_KEY.USE_PAN_TOOL,
      trigger: this.editorStore.createEditorCommandTrigger(DEFAULT_TRIGGER),
      action: () => this.renderer.switchToPanMode(),
    });
    this.editorStore.applicationStore.commandService.registerCommand({
      key: DSL_DIAGRAM_LEGEND_STUDIO_COMMAND_KEY.USE_PROPERTY_TOOL,
      trigger: this.editorStore.createEditorCommandTrigger(DEFAULT_TRIGGER),
      action: () => this.renderer.switchToAddPropertyMode(),
    });
    this.editorStore.applicationStore.commandService.registerCommand({
      key: DSL_DIAGRAM_LEGEND_STUDIO_COMMAND_KEY.USE_INHERITANCE_TOOL,
      trigger: this.editorStore.createEditorCommandTrigger(DEFAULT_TRIGGER),
      action: () => this.renderer.switchToAddInheritanceMode(),
    });
    this.editorStore.applicationStore.commandService.registerCommand({
      key: DSL_DIAGRAM_LEGEND_STUDIO_COMMAND_KEY.ADD_CLASS,
      trigger: this.editorStore.createEditorCommandTrigger(DEFAULT_TRIGGER),
      action: () => this.renderer.switchToAddClassMode(),
    });
    this.editorStore.applicationStore.commandService.registerCommand({
      key: DSL_DIAGRAM_LEGEND_STUDIO_COMMAND_KEY.EJECT_PROPERTY,
      trigger: this.editorStore.createEditorCommandTrigger(DEFAULT_TRIGGER),
      action: () => this.renderer.ejectProperty(),
    });
  }

  deregisterCommands(): void {
    [
      DSL_DIAGRAM_LEGEND_STUDIO_COMMAND_KEY.RECENTER,
      DSL_DIAGRAM_LEGEND_STUDIO_COMMAND_KEY.USE_ZOOM_TOOL,
      DSL_DIAGRAM_LEGEND_STUDIO_COMMAND_KEY.USE_VIEW_TOOL,
      DSL_DIAGRAM_LEGEND_STUDIO_COMMAND_KEY.USE_PAN_TOOL,
      DSL_DIAGRAM_LEGEND_STUDIO_COMMAND_KEY.USE_PROPERTY_TOOL,
      DSL_DIAGRAM_LEGEND_STUDIO_COMMAND_KEY.USE_INHERITANCE_TOOL,
      DSL_DIAGRAM_LEGEND_STUDIO_COMMAND_KEY.ADD_CLASS,
      DSL_DIAGRAM_LEGEND_STUDIO_COMMAND_KEY.EJECT_PROPERTY,
    ].forEach((commandKey) =>
      this.editorStore.applicationStore.commandService.deregisterCommand(
        commandKey,
      ),
    );
  }

  reprocess(
    newElement: PackageableElement,
    editorStore: EditorStore,
  ): ElementEditorState {
    const diagramEditorState = new DiagramEditorState(editorStore, newElement);
    return diagramEditorState;
  }
}
