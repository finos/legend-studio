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
import { EditorHotkey } from '../../EditorStore';
import {
  guaranteeNonNullable,
  guaranteeType,
  uuid,
} from '@finos/legend-shared';
import { ElementEditorState } from './ElementEditorState';
import type { DiagramRenderer } from '../../../components/shared/diagram-viewer/DiagramRenderer';
import { DIAGRAM_INTERACTION_MODE } from '../../../components/shared/diagram-viewer/DiagramRenderer';
import { ClassEditorState } from './ClassEditorState';
import { PanelDisplayState } from '@finos/legend-application-components';
import type {
  PackageableElement,
  ClassView,
  AbstractProperty,
  Point,
  PropertyHolderView,
  PropertyReference,
} from '@finos/legend-graph';
import {
  Diagram,
  GenericTypeExplicitReference,
  PRIMITIVE_TYPE,
  TYPICAL_MULTIPLICITY_TYPE,
  Property,
  GenericType,
  PropertyExplicitReference,
} from '@finos/legend-graph';

enum DIAGRAM_EDITOR_HOTKEY {
  RECENTER = 'RECENTER',
  USE_ZOOM_TOOL = 'USE_ZOOM_TOOL',
  USE_VIEW_TOOL = 'USE_VIEW_TOOL',
  USE_PAN_TOOL = 'USE_PAN_TOOL',
  USE_PROPERTY_TOOL = 'USE_PROPERTY_TOOL',
  USE_INHERITANCE_TOOL = 'USE_INHERITANCE_TOOL',
  ADD_CLASS = 'ADD_CLASS',
  EJECT_PROPERTY = 'EJECT_PROPERTY',
}

const DIAGRAM_EDITOR_HOTKEY_MAP = Object.freeze({
  [DIAGRAM_EDITOR_HOTKEY.RECENTER]: 'r',
  [DIAGRAM_EDITOR_HOTKEY.USE_ZOOM_TOOL]: 'z',
  [DIAGRAM_EDITOR_HOTKEY.USE_VIEW_TOOL]: 'v',
  [DIAGRAM_EDITOR_HOTKEY.USE_PAN_TOOL]: 'm',
  [DIAGRAM_EDITOR_HOTKEY.USE_PROPERTY_TOOL]: 'p',
  [DIAGRAM_EDITOR_HOTKEY.USE_INHERITANCE_TOOL]: 'i',
  [DIAGRAM_EDITOR_HOTKEY.ADD_CLASS]: 'c',
  [DIAGRAM_EDITOR_HOTKEY.EJECT_PROPERTY]: 'ArrowRight',
});

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
      this.editorStore.openedEditorStates.find(
        (elementState): elementState is ClassEditorState =>
          elementState instanceof ClassEditorState &&
          elementState.element === classView.class.value,
      ) ?? this.editorStore.createElementState(classView.class.value),
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

export class DiagramEditorState extends ElementEditorState {
  _renderer?: DiagramRenderer;
  showHotkeyInfosModal = false;
  sidePanelDisplayState = new PanelDisplayState({
    initial: 0,
    default: 500,
    snap: 100,
  });
  sidePanelState?: DiagramEditorSidePanelState;
  inlinePropertyEditorState?: DiagramEditorInlinePropertyEditorState;
  inlineClassCreatorState?: DiagramEditorInlineClassCreatorState;
  inlineClassRenamerState?: DiagramEditorInlineClassRenamerState;

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
      renderer: computed,
      diagram: computed,
      isDiagramRendererInitialized: computed,
      setShowHotkeyInfosModal: action,
      setRenderer: action,
      setSidePanelState: action,
      setInlinePropertyEditorState: action,
      setInlineClassCreatorState: action,
      setInlineClassRenamerState: action,
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
            this.renderer.mouseOverClassProperty.owner.isReadOnly
            ? 'diagram-editor__cursor--not-allowed'
            : 'diagram-editor__cursor--text';
        } else if (this.renderer.mouseOverPropertyHolderViewLabel) {
          return this.isReadOnly ||
            this.renderer.mouseOverPropertyHolderViewLabel.property.value.owner
              .isReadOnly
            ? 'diagram-editor__cursor--not-allowed'
            : 'diagram-editor__cursor--text';
        } else if (this.renderer.mouseOverClassName) {
          return this.isReadOnly ||
            this.renderer.mouseOverClassName.class.value.isReadOnly
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

  setupRenderer(): void {
    this.renderer.setIsReadOnly(this.isReadOnly);
    this.renderer.editClassView = (classView: ClassView): void => {
      this.setSidePanelState(
        new DiagramEditorClassViewEditorSidePanelState(
          this.editorStore,
          this,
          classView,
        ),
      );
      this.sidePanelDisplayState.open();
    };
    const createNewClassView = (point: Point): void => {
      if (!this.isReadOnly) {
        this.setInlineClassCreatorState(
          new DiagramEditorInlineClassCreatorState(this, point),
        );
      }
    };
    this.renderer.onBackgroundDoubleClick = createNewClassView;
    this.renderer.onAddClassViewClick = createNewClassView;
    this.renderer.editClassName = (
      classView: ClassView,
      point: Point,
    ): void => {
      if (!this.isReadOnly && !classView.class.value.isReadOnly) {
        this.setInlineClassRenamerState(
          new DiagramEditorInlineClassRenamerState(this, classView, point),
        );
      }
    };
    this.renderer.editProperty = (
      property: AbstractProperty,
      point: Point,
      propertyHolderView: PropertyHolderView | undefined,
    ): void => {
      if (!this.isReadOnly && !property.owner.isReadOnly) {
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
    this.renderer.addSimpleProperty = (classView: ClassView): void => {
      if (!this.isReadOnly && !classView.class.value.isReadOnly) {
        const _class = classView.class.value;
        _class.addProperty(
          new Property(
            `property_${_class.properties.length + 1}`,
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
        this.renderer.render();
      }
    };

    /**
     * NOTE: although our renderer handles hotkeys, it only does so
     * when it is in focus. This does not happen when the user just
     * open the diagram editor, or click out of it. As such, here we create
     * some global hotkeys that will call the renderer's hotkey handler method.
     *
     * We use {@link createDiagramHotKeyAction} to ensure global hotkeys are appropriately
     * called and especially not called twice when the diagram is in focus. In such case,
     * its native hotkey handlers will take precedence
     */
    [
      DIAGRAM_EDITOR_HOTKEY.RECENTER,
      DIAGRAM_EDITOR_HOTKEY.USE_ZOOM_TOOL,
      DIAGRAM_EDITOR_HOTKEY.USE_VIEW_TOOL,
      DIAGRAM_EDITOR_HOTKEY.USE_PAN_TOOL,
      DIAGRAM_EDITOR_HOTKEY.USE_PROPERTY_TOOL,
      DIAGRAM_EDITOR_HOTKEY.USE_INHERITANCE_TOOL,
      DIAGRAM_EDITOR_HOTKEY.ADD_CLASS,
      DIAGRAM_EDITOR_HOTKEY.EJECT_PROPERTY,
    ].forEach((key) => {
      this.editorStore.addHotKey(
        new EditorHotkey(
          key,
          [DIAGRAM_EDITOR_HOTKEY_MAP[key]],
          this.createDiagramHotKeyAction((event?: KeyboardEvent) => {
            if (event) {
              this.renderer.keydown(event);
            }
          }),
        ),
      );
    });
  }

  cleanUp(): void {
    this.editorStore.resetHotkeys();
  }

  private createDiagramHotKeyAction = (
    handler: (event?: KeyboardEvent) => void,
  ): ((event?: KeyboardEvent) => void) =>
    this.editorStore.createGlobalHotKeyAction((event?: KeyboardEvent): void => {
      if (
        // make sure the current active editor is this diagram editor
        this.editorStore.currentEditorState === this &&
        // make sure the renderer is initialized
        this.isDiagramRendererInitialized &&
        // make sure the renderer canvas is currently not being in focused
        // so we don't end up triggering a hotkey twice, because natively the renderer
        // listens to keydown event as well
        this.renderer.div !== document.activeElement &&
        // since we use hotkeys that can be easily in text input
        // we would need to do this check to make sure we don't accidentally
        // trigger hotkeys when the user is typing
        (!document.activeElement ||
          !['input', 'textarea', 'select'].includes(
            document.activeElement.tagName.toLowerCase(),
          ))
      ) {
        handler(event);
      }
    }, false);

  reprocess(
    newElement: PackageableElement,
    editorStore: EditorStore,
  ): ElementEditorState {
    const diagramEditorState = new DiagramEditorState(editorStore, newElement);
    return diagramEditorState;
  }
}
