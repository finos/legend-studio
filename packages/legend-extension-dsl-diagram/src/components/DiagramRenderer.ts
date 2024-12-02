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

import {
  uuid,
  noop,
  getNullableFirstEntry,
  UnsupportedOperationError,
  IllegalStateError,
  guaranteeNonNullable,
  findLast,
  uniqBy,
} from '@finos/legend-shared';
import {
  type AbstractProperty,
  Class,
  Enumeration,
  PrimitiveType,
  DerivedProperty,
  PackageableElementExplicitReference,
  PropertyExplicitReference,
  GenericTypeExplicitReference,
  GenericType,
  Property,
  Multiplicity,
  getAllSuperclasses,
  getAllOwnClassProperties,
  generateMultiplicityString,
  getRawGenericType,
  AggregationKind,
} from '@finos/legend-graph';
import { action, makeObservable, observable } from 'mobx';
import type { Diagram } from '../graph/metamodel/pure/packageableElements/diagram/DSL_Diagram_Diagram.js';
import { Rectangle } from '../graph/metamodel/pure/packageableElements/diagram/geometry/DSL_Diagram_Rectangle.js';
import { Point } from '../graph/metamodel/pure/packageableElements/diagram/geometry/DSL_Diagram_Point.js';
import { PositionedRectangle } from '../graph/metamodel/pure/packageableElements/diagram/geometry/DSL_Diagram_PositionedRectangle.js';
import { ClassView } from '../graph/metamodel/pure/packageableElements/diagram/DSL_Diagram_ClassView.js';
import type { PropertyHolderView } from '../graph/metamodel/pure/packageableElements/diagram/DSL_Diagram_PropertyHolderView.js';
import { GeneralizationView } from '../graph/metamodel/pure/packageableElements/diagram/DSL_Diagram_GeneralizationView.js';
import { RelationshipView } from '../graph/metamodel/pure/packageableElements/diagram/DSL_Diagram_RelationshipView.js';
import { PropertyView } from '../graph/metamodel/pure/packageableElements/diagram/DSL_Diagram_PropertyView.js';
import {
  boxContains,
  buildBottomRightCornerBox,
  getBottomRightCornerPoint,
  getElementPosition,
  rotatePointX,
  rotatePointY,
} from '../graph/helpers/DSL_Diagram_Helper.js';
import { AssociationView } from '../graph/metamodel/pure/packageableElements/diagram/DSL_Diagram_AssociationView.js';
import {
  class_addProperty,
  class_addSuperType,
} from '@finos/legend-application-studio';
import {
  classView_setHideProperties,
  classView_setHideStereotypes,
  classView_setHideTaggedValues,
  diagram_addClassView,
  diagram_addGeneralizationView,
  diagram_addPropertyView,
  diagram_deleteAssociationView,
  diagram_deleteClassView,
  diagram_deleteGeneralizationView,
  diagram_deletePropertyView,
  diagram_setAssociationViews,
  diagram_setClassViews,
  diagram_setGeneralizationViews,
  diagram_setPropertyViews,
  findOrBuildPoint,
  positionedRectangle_forceRefreshHash,
  positionedRectangle_setPosition,
  positionedRectangle_setRectangle,
  relationshipEdgeView_setOffsetX,
  relationshipEdgeView_setOffsetY,
  relationshipView_changePoint,
  relationshipView_simplifyPath,
  relationshipView_setPath,
} from '../stores/studio/DSL_Diagram_GraphModifierHelper.js';

export enum DIAGRAM_INTERACTION_MODE {
  LAYOUT,
  PAN,
  ZOOM_IN,
  ZOOM_OUT,
  ADD_RELATIONSHIP,
  ADD_CLASS,
}

export enum DIAGRAM_RELATIONSHIP_EDIT_MODE {
  // ASSOCIATION,
  PROPERTY,
  INHERITANCE,
  NONE,
}

export enum DIAGRAM_ALIGNER_OPERATOR {
  ALIGN_LEFT,
  ALIGN_CENTER,
  ALIGN_RIGHT,
  ALIGN_TOP,
  ALIGN_MIDDLE,
  ALIGN_BOTTOM,
  SPACE_HORIZONTALLY,
  SPACE_VERTICALLY,
}

const MIN_ZOOM_LEVEL = 0.05; // 5%
const FIT_ZOOM_PADDING = 10;
export const DIAGRAM_ZOOM_LEVELS = [
  50, 75, 90, 100, 110, 125, 150, 200, 250, 300, 400,
];

const getPropertyDisplayName = (property: AbstractProperty): string =>
  (property instanceof DerivedProperty ? '/ ' : '') + property.name;

export class DiagramRenderer {
  diagram: Diagram;

  isReadOnly: boolean;
  enableLayoutAutoAdjustment: boolean;

  div: HTMLDivElement;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;

  // Rendering elements
  canvasDimension: Rectangle; // dimension of the canvas, i.e. the dimension of the container element that hosts the canvas
  canvasCenter: Point;
  /**
   * The screen or artboard that contains all parts of the diagram. It's important to understand that this is indeed a virtual screen
   * because it is constructed by constructing the smallest possible bounding rectangle around the diagram. As such, information about
   * the screen is not persisted (in the protocol JSON)
   */
  virtualScreen: PositionedRectangle;
  /**
   * This refers the offset of the virtual screen with respect to the canvas. We have 2 types of coordinate:
   * `stored` (in the JSON protocol of class and relationship views) vs. `rendering`.
   *
   * There are 2 important facts about stored coordinates:
   * 1. Zoom is not taken into account (unlike rendering coordinates which change as we zoom)
   * 2. They are with respect to the canvas, not the screen (because the screen is virtual - see above)
   *
   * As such, when we debug, let's say we have a position (x,y), if we want to find that coordinate in the coordiante system of the canvas, we have to
   * add the offset, so the coordinate of (x, y) is (x + screenOffset.x, y + screenOffset.y) when we refer to the canvas coordinate system
   * So if we turn on debug mode and try to move the top left corner of the screen to the `offset crosshair` the screen coordinate system should align
   * with the canvas coordinate system. Of course due to centering and moving the screen around there is still an offset between the 2 coordinate system,
   * but we know for a fact that the top left of the screen will have stored coordinate (0,0)
   */
  screenOffset: Point;
  zoom: number;

  // edit modes
  // NOTE: we keep the edit mode separated like this
  // becase we anticipate more complex interactions in the future
  interactionMode: DIAGRAM_INTERACTION_MODE;
  relationshipMode: DIAGRAM_RELATIONSHIP_EDIT_MODE;

  // UML specific shapes
  triangle: [Point, Point, Point];
  diamond: [Point, Point, Point, Point];

  // Font
  fontFamily: string;
  fontSize: number;
  lineHeight: number;

  // Wrap text
  truncateText: boolean;
  maxLineLength: number;
  // TODO: we might want to do text wrapping as well

  // Spacing
  screenPadding: number; // the padding of the diagram (art board)
  classViewSpaceX: number;
  classViewSpaceY: number;
  propertySpacing: number;

  // Screen Grid (for debugging)
  showScreenGrid: boolean; // show the screen coordinate system
  showScreenBoxGuide: boolean; // show the screen border box and center
  screenGridAxisTickLength: number;
  screenGridSpacingX: number;
  screenGridSpacingY: number;
  screenGridLineWidth: number;
  screenGridLineColor: string;
  screenGridLabelTextColor: string;
  screenGuideLineColor: string;
  screenGuideLabelTextColor: string;

  // Canvas Grid (for debugging)
  showCanvasGrid: boolean; // show the canvas coordinate system
  showCanvasBoxGuide: boolean; // show the canvas border box and center
  showScreenOffsetGuide: boolean; // show the offset of the screen with respect to the canvas
  canvasGridAxisTickLength: number;
  canvasGridSpacingX: number;
  canvasGridSpacingY: number;
  canvasGridLineWidth: number;
  canvasGridLineColor: string;
  canvasGridLabelTextColor: string;
  canvasGuideLineColor: string;
  canvasGuideLabelTextColor: string;
  screenOffsetGuideLineColor: string;
  screenOffsetGuideLabelTextColor: string;

  // Line
  defaultLineWidth: number;

  // Color
  defaultLineColor: string;
  canvasColor: string;
  backgroundColor: string;
  classViewFillColor: string;
  classViewHeaderTextColor: string;
  classViewPropertyTextColor: string;
  classViewPrimitivePropertyTextColor: string;
  classViewDerivedPropertyTextColor: string;
  relationshipViewTextColor: string;
  propertyViewOwnedDiamondColor: string;
  propertyViewSharedDiamondColor: string;
  generalizationViewInheritanceTriangeFillColor: string;
  selectionBoxBorderColor: string;

  // Selection
  selection?: PositionedRectangle | undefined;
  selectionStart?: Point | undefined;
  selectedClassCorner?: ClassView | undefined; // the class view which we currently select the bottom right corner
  selectedClassProperty?:
    | { property: AbstractProperty; selectionPoint: Point }
    | undefined;
  selectedClasses: ClassView[];
  selectedPropertyOrAssociation?: PropertyHolderView | undefined;
  selectedInheritance?: GeneralizationView | undefined;
  selectedPoint?: Point | undefined;

  private _selectedClassesInitialPositions: {
    classView: ClassView;
    oldPos: Point;
  }[];

  // Relationship
  startClassView?: ClassView | undefined;
  handleAddRelationship?:
    | ((start: ClassView, target: ClassView) => RelationshipView | undefined)
    | undefined;

  mouseOverClassCorner?: ClassView | undefined;
  mouseOverClassName?: ClassView | undefined;
  mouseOverClassView?: ClassView | undefined;
  mouseOverClassProperty?: AbstractProperty | undefined;
  mouseOverPropertyHolderViewLabel?: PropertyHolderView | undefined;
  cursorPosition: Point;

  leftClick: boolean;
  middleClick: boolean;
  rightClick: boolean;
  clickX: number;
  clickY: number;
  positionBeforeLastMove: Point;

  // interactions
  onAddClassViewClick: (point: Point) => void = noop();
  onClassViewRightClick: (classView: ClassView, point: Point) => void = noop();

  onBackgroundDoubleClick?: ((point: Point) => void) | undefined;
  onClassViewDoubleClick?:
    | ((classView: ClassView, point: Point) => void)
    | undefined;
  onClassNameDoubleClick?:
    | ((classView: ClassView, point: Point) => void)
    | undefined;
  onClassPropertyDoubleClick?:
    | ((
        property: AbstractProperty,
        point: Point,
        propertyHolderView: PropertyHolderView | undefined,
      ) => void)
    | undefined;

  handleEditClassView: (classView: ClassView) => void = noop();
  handleEditProperty: (
    property: AbstractProperty,
    point: Point,
    propertyHolderView: PropertyHolderView | undefined,
  ) => void = noop();
  handleAddSimpleProperty: (classView: ClassView) => void = noop();

  constructor(div: HTMLDivElement, diagram: Diagram) {
    makeObservable(this, {
      isReadOnly: observable,
      enableLayoutAutoAdjustment: observable,
      interactionMode: observable,
      relationshipMode: observable,
      zoom: observable,
      mouseOverClassView: observable,
      mouseOverClassName: observable,
      mouseOverClassCorner: observable,
      mouseOverClassProperty: observable,
      mouseOverPropertyHolderViewLabel: observable,
      selectionStart: observable,
      selectedClassCorner: observable,
      selectedClasses: observable,
      selectedPropertyOrAssociation: observable,
      selectedInheritance: observable,
      leftClick: observable,
      middleClick: observable,
      rightClick: observable,
      changeMode: action,
      setIsReadOnly: action,
      setEnableLayoutAutoAdjustment: action,
      setMouseOverClassView: action,
      setMouseOverClassName: action,
      setMouseOverClassCorner: action,
      setMouseOverClassProperty: action,
      setMouseOverPropertyHolderViewLabel: action,
      setSelectionStart: action,
      setSelectedClassCorner: action,
      setSelectedClasses: action,
      setSelectedPropertyOrAssociation: action,
      setSelectedInheritance: action,
      setLeftClick: action,
      setMiddleClick: action,
      setRightClick: action,
      setZoomLevel: action,
      align: action,
    });

    this.diagram = diagram;

    // Container and canvas
    this.div = div;
    this.div.childNodes.forEach((node) => this.div.removeChild(node)); // Clear the <div> container
    this.canvas = document.createElement('canvas');
    this.canvasDimension = new Rectangle(
      this.div.offsetWidth,
      this.div.offsetHeight,
    );
    this.canvasCenter = new Point(
      this.canvasDimension.width / 2,
      this.canvasDimension.height / 2,
    );
    this.canvas.width = this.canvasDimension.width;
    this.canvas.height = this.canvasDimension.height;
    this.canvas.style.position = 'absolute';
    this.canvas.style.left = '0';
    this.canvas.style.top = '0';
    this.div.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d') as CanvasRenderingContext2D;
    this.screenOffset = new Point(0, 0);
    this.virtualScreen = new PositionedRectangle(
      new Point(0, 0),
      new Rectangle(0, 0),
    );
    this.zoom = 1;

    // UML specific shapes
    this.triangle = [new Point(0, 0), new Point(-15, -10), new Point(-15, 10)];
    this.diamond = [
      new Point(0, 0),
      new Point(-10, -5),
      new Point(-20, 0),
      new Point(-10, 5),
    ];

    // Font
    // this.fontFamily = 'Roboto Mono'; // intentionally choose a monospaced font so it's easier for calculation (such as text wrapping)
    this.fontFamily = 'Arial'; // convert this back to non-monospaced font for now since monospaced fonts look rather off
    this.fontSize = 12;
    this.lineHeight = 14;

    // Wrap text
    this.truncateText = true;
    this.maxLineLength = 40;

    // Screen Grid (for debugging purpose)
    this.showScreenGrid = false;
    this.showScreenBoxGuide = true;
    this.screenGridAxisTickLength = 50;
    this.screenGridSpacingX = 100;
    this.screenGridSpacingY = 100;
    this.screenGridLineWidth = 0.5;

    // Canvas Grid
    this.showCanvasGrid = false;
    this.showCanvasBoxGuide = true;
    this.showScreenOffsetGuide = true;
    this.canvasGridAxisTickLength = 50;
    this.canvasGridSpacingX = 100;
    this.canvasGridSpacingY = 100;
    this.canvasGridLineWidth = 0.5;

    // Line
    this.defaultLineWidth = 1;

    // Color
    this.screenGridLineColor = 'rgba(61,126,154,0.56)';
    this.screenGridLabelTextColor = 'rgba(61,126,154,0.56)';
    this.screenGuideLineColor = 'red';
    this.screenGuideLabelTextColor = 'red';
    this.canvasGridLineColor = 'green';
    this.canvasGridLabelTextColor = 'green';
    this.canvasGuideLineColor = 'orange';
    this.canvasGuideLabelTextColor = 'orange';
    this.screenOffsetGuideLineColor = 'purple';
    this.screenOffsetGuideLabelTextColor = 'purple';
    this.defaultLineColor = 'rgb(0,0,0)';
    this.canvasColor = 'rgb(220,220,220)';
    this.backgroundColor = 'rgb(255,255,255)';
    this.classViewFillColor = 'rgb(185,185,185)';
    this.classViewHeaderTextColor = 'rgb(0,0,0)';
    this.classViewPropertyTextColor = 'rgb(0,0,0)';
    this.classViewPrimitivePropertyTextColor = 'rgb(255,255,255)';
    this.classViewDerivedPropertyTextColor = 'rgb(100,100,100)';
    this.relationshipViewTextColor = 'rgb(0,0,0)';
    this.propertyViewSharedDiamondColor = 'rgb(255,255,255)';
    this.propertyViewOwnedDiamondColor = 'rgb(0,0,0)';
    this.generalizationViewInheritanceTriangeFillColor = 'rgb(255,255,255)';
    this.selectionBoxBorderColor = 'rgba(0,0,0, 0.02)';

    // Preferences
    this.interactionMode = DIAGRAM_INTERACTION_MODE.LAYOUT;
    this.relationshipMode = DIAGRAM_RELATIONSHIP_EDIT_MODE.NONE;
    this.isReadOnly = false;
    this.enableLayoutAutoAdjustment = false;
    this.screenPadding = 20;
    this.classViewSpaceX = 10;
    this.classViewSpaceY = 4;
    this.propertySpacing = 10;

    // Event handlers
    this.selectionStart = undefined;
    this.selection = undefined;
    this.selectedClasses = [];
    this._selectedClassesInitialPositions = [];
    this.cursorPosition = new Point(0, 0);
    this.leftClick = false;
    this.middleClick = false;
    this.rightClick = false;
    this.clickX = 0;
    this.clickY = 0;
    this.positionBeforeLastMove = new Point(0, 0);
    this.div.onwheel = this.mousewheel.bind(this);
    this.div.onmousedown = this.mousedown.bind(this);
    this.div.onkeydown = this.keydown.bind(this);
    this.div.ondblclick = this.mousedblclick.bind(this);
    this.div.onmouseup = this.mouseup.bind(this);
    this.div.onmousemove = this.mousemove.bind(this);
  }

  setIsReadOnly(val: boolean): void {
    this.isReadOnly = val;
  }

  setEnableLayoutAutoAdjustment(val: boolean): void {
    this.enableLayoutAutoAdjustment = val;
  }

  setMouseOverClassView(val: ClassView | undefined): void {
    this.mouseOverClassView = val;
  }

  setMouseOverClassName(val: ClassView | undefined): void {
    this.mouseOverClassName = val;
  }

  setMouseOverClassCorner(val: ClassView | undefined): void {
    this.mouseOverClassCorner = val;
  }

  setMouseOverClassProperty(val: AbstractProperty | undefined): void {
    this.mouseOverClassProperty = val;
  }

  setMouseOverPropertyHolderViewLabel(
    val: PropertyHolderView | undefined,
  ): void {
    this.mouseOverPropertyHolderViewLabel = val;
  }

  setSelectionStart(val: Point | undefined): void {
    this.selectionStart = val;
  }

  setSelectedClassCorner(val: ClassView | undefined): void {
    this.selectedClassCorner = val;
  }

  setSelectedClasses(val: ClassView[]): void {
    this.selectedClasses = val;
  }

  setSelectedPropertyOrAssociation(val: PropertyHolderView | undefined): void {
    this.selectedPropertyOrAssociation = val;
  }

  setSelectedInheritance(val: GeneralizationView | undefined): void {
    this.selectedInheritance = val;
  }

  setLeftClick(val: boolean): void {
    this.leftClick = val;
  }

  setMiddleClick(val: boolean): void {
    this.middleClick = val;
  }

  setRightClick(val: boolean): void {
    this.rightClick = val;
  }

  setZoomLevel(val: number): void {
    this.zoom = val;
  }

  render(options?: { initial?: boolean | undefined }): void {
    this.diagram.classViews.forEach((classView) =>
      this.ensureClassViewMeetMinDimensions(classView),
    );
    this.refresh();

    if (options?.initial) {
      this.autoRecenter();

      // only zoom to fit if needed
      if (
        this.canvas.width <
          this.virtualScreen.rectangle.width +
            this.screenPadding * 2 +
            FIT_ZOOM_PADDING * 2 ||
        this.canvas.height <
          this.virtualScreen.rectangle.height +
            this.screenPadding * 2 +
            FIT_ZOOM_PADDING * 2
      ) {
        this.zoomToFit();
      }
    }
  }

  refresh(): void {
    this.refreshCanvas();
    this.drawScreen();
  }

  refreshCanvas(): void {
    this.canvasDimension = new Rectangle(
      this.div.offsetWidth,
      this.div.offsetHeight,
    );
    this.canvasCenter = new Point(
      this.canvasDimension.width / 2,
      this.canvasDimension.height / 2,
    );
    this.canvas.width = this.canvasDimension.width;
    this.canvas.height = this.canvasDimension.height;
  }

  clearScreen(): void {
    this.ctx.fillStyle = this.canvasColor;
    this.ctx.fillRect(
      0,
      0,
      this.canvasDimension.width,
      this.canvasDimension.height,
    );
  }

  private drawScreen(): void {
    this.manageVirtualScreen();
    this.clearScreen();
    this.drawAll();
  }

  autoRecenter(): void {
    this.center(
      this.virtualScreen.position.x + this.virtualScreen.rectangle.width / 2,
      this.virtualScreen.position.y + this.virtualScreen.rectangle.height / 2,
    );
  }

  /**
   * Reset the screen offset
   */
  private center(x: number, y: number): void {
    this.screenOffset = new Point(
      -x + this.canvasCenter.x,
      -y + this.canvasCenter.y,
    );
    this.refresh();
  }

  changeMode(
    editMode: DIAGRAM_INTERACTION_MODE,
    relationshipMode: DIAGRAM_RELATIONSHIP_EDIT_MODE,
  ): void {
    switch (editMode) {
      case DIAGRAM_INTERACTION_MODE.LAYOUT:
      case DIAGRAM_INTERACTION_MODE.PAN:
      case DIAGRAM_INTERACTION_MODE.ZOOM_IN:
      case DIAGRAM_INTERACTION_MODE.ZOOM_OUT:
      case DIAGRAM_INTERACTION_MODE.ADD_CLASS: {
        if (relationshipMode !== DIAGRAM_RELATIONSHIP_EDIT_MODE.NONE) {
          throw new IllegalStateError(
            `Can't change to '${editMode}' mode: relationship mode should not be specified in layout mode`,
          );
        }
        break;
      }
      case DIAGRAM_INTERACTION_MODE.ADD_RELATIONSHIP: {
        if (relationshipMode === DIAGRAM_RELATIONSHIP_EDIT_MODE.NONE) {
          throw new IllegalStateError(
            `Can't switch to relationship mode: relationship mode is not specified`,
          );
        }
        break;
      }
      default:
        throw new UnsupportedOperationError(
          `Can't switch to mode '${editMode}': unsupported mode`,
        );
    }

    this.interactionMode = editMode;
    this.relationshipMode = relationshipMode;

    if (editMode === DIAGRAM_INTERACTION_MODE.ADD_RELATIONSHIP) {
      switch (relationshipMode) {
        case DIAGRAM_RELATIONSHIP_EDIT_MODE.INHERITANCE: {
          this.handleAddRelationship = (
            startClassView: ClassView,
            targetClassView: ClassView,
          ): RelationshipView | undefined => {
            if (
              // Do not allow creating self-inheritance
              startClassView.class.value !== targetClassView.class.value &&
              // Avoid creating inhertance that already existed
              !getAllSuperclasses(startClassView.class.value).includes(
                targetClassView.class.value,
              ) &&
              // Avoid loop (might be expensive)
              !getAllSuperclasses(targetClassView.class.value).includes(
                startClassView.class.value,
              )
            ) {
              class_addSuperType(
                startClassView.class.value,
                GenericTypeExplicitReference.create(
                  new GenericType(targetClassView.class.value),
                ),
              );
            }
            // only add an inheritance relationship view if the start class
            // has already had the target class as its supertype
            if (
              startClassView.class.value.generalizations.find(
                (generalization) =>
                  generalization.value.rawType === targetClassView.class.value,
              )
            ) {
              const gview = new GeneralizationView(
                this.diagram,
                startClassView,
                targetClassView,
              );
              diagram_addGeneralizationView(this.diagram, gview);
              return gview;
            }
            return undefined;
          };
          break;
        }
        case DIAGRAM_RELATIONSHIP_EDIT_MODE.PROPERTY: {
          this.handleAddRelationship = (
            startClassView: ClassView,
            targetClassView: ClassView,
          ): PropertyView | undefined => {
            const property = new Property(
              `property_${startClassView.class.value.properties.length + 1}`,
              Multiplicity.ONE,
              GenericTypeExplicitReference.create(
                new GenericType(targetClassView.class.value),
              ),
              startClassView.class.value,
            );
            class_addProperty(startClassView.class.value, property);
            // only create property view if the classviews are different
            // else we end up with a weird rendering where the property view
            // is not targetable
            if (startClassView !== targetClassView) {
              const pView = new PropertyView(
                this.diagram,
                PropertyExplicitReference.create(property),
                startClassView,
                targetClassView,
              );
              diagram_addPropertyView(this.diagram, pView);
              return pView;
            }
            return undefined;
          };
          break;
        }
        default:
          throw new UnsupportedOperationError(
            `Can't switch to relationship mode '${relationshipMode}': unsupported mode`,
          );
      }
    }
  }

  align(op: DIAGRAM_ALIGNER_OPERATOR): void {
    if (this.selectedClasses.length < 2) {
      return;
    }
    switch (op) {
      case DIAGRAM_ALIGNER_OPERATOR.ALIGN_LEFT: {
        const leftBound = this.selectedClasses.reduce(
          (val, view) => Math.min(val, view.position.x),
          Number.MAX_SAFE_INTEGER,
        );
        this.selectedClasses.forEach((view) =>
          positionedRectangle_setPosition(
            view,
            new Point(leftBound, view.position.y),
          ),
        );
        break;
      }
      case DIAGRAM_ALIGNER_OPERATOR.ALIGN_CENTER: {
        const center =
          this.selectedClasses.reduce(
            (val, view) => val + view.position.x + view.rectangle.width / 2,
            0,
          ) / this.selectedClasses.length;
        this.selectedClasses.forEach((view) =>
          positionedRectangle_setPosition(
            view,
            new Point(center - view.rectangle.width / 2, view.position.y),
          ),
        );
        break;
      }
      case DIAGRAM_ALIGNER_OPERATOR.ALIGN_RIGHT: {
        const rightBound = this.selectedClasses.reduce(
          (val, view) => Math.max(val, view.position.x + view.rectangle.width),
          -Number.MAX_SAFE_INTEGER,
        );
        this.selectedClasses.forEach((view) =>
          positionedRectangle_setPosition(
            view,
            new Point(rightBound - view.rectangle.width, view.position.y),
          ),
        );
        break;
      }
      case DIAGRAM_ALIGNER_OPERATOR.ALIGN_TOP: {
        const topBound = this.selectedClasses.reduce(
          (val, view) => Math.min(val, view.position.y),
          Number.MAX_SAFE_INTEGER,
        );
        this.selectedClasses.forEach((view) =>
          positionedRectangle_setPosition(
            view,
            new Point(view.position.x, topBound),
          ),
        );
        break;
      }
      case DIAGRAM_ALIGNER_OPERATOR.ALIGN_MIDDLE: {
        const middle =
          this.selectedClasses.reduce(
            (val, view) => val + view.position.y + view.rectangle.height / 2,
            0,
          ) / this.selectedClasses.length;
        this.selectedClasses.forEach((view) =>
          positionedRectangle_setPosition(
            view,
            new Point(view.position.x, middle - view.rectangle.height / 2),
          ),
        );
        break;
      }
      case DIAGRAM_ALIGNER_OPERATOR.ALIGN_BOTTOM: {
        const bottomBound = this.selectedClasses.reduce(
          (val, view) => Math.max(val, view.position.y + view.rectangle.height),
          -Number.MAX_SAFE_INTEGER,
        );
        this.selectedClasses.forEach((view) =>
          positionedRectangle_setPosition(
            view,
            new Point(view.position.x, bottomBound - view.rectangle.height),
          ),
        );
        break;
      }
      case DIAGRAM_ALIGNER_OPERATOR.SPACE_HORIZONTALLY: {
        const sorted = this.selectedClasses.toSorted(
          (a, b) => a.position.x - b.position.x,
        );
        // NOTE: handle special case where there are only 2 views, make them adjacent
        if (sorted.length === 2) {
          const previousView = sorted[0] as ClassView;
          const currentView = sorted[1] as ClassView;
          positionedRectangle_setPosition(
            currentView,
            new Point(
              previousView.position.x + previousView.rectangle.width,
              currentView.position.y,
            ),
          );
        } else {
          const spacings = [];
          for (let idx = 1; idx < sorted.length; idx++) {
            const previousView = sorted[idx - 1] as ClassView;
            const currentView = sorted[idx] as ClassView;
            spacings.push(
              currentView.position.x -
                (previousView.position.x + previousView.rectangle.width),
            );
          }
          const averageSpacing =
            spacings.reduce((val, distance) => val + distance, 0) /
            spacings.length;
          for (let idx = 1; idx < sorted.length; idx++) {
            const previousView = sorted[idx - 1] as ClassView;
            const currentView = sorted[idx] as ClassView;
            positionedRectangle_setPosition(
              currentView,
              new Point(
                previousView.position.x +
                  previousView.rectangle.width +
                  averageSpacing,
                currentView.position.y,
              ),
            );
          }
        }
        break;
      }
      case DIAGRAM_ALIGNER_OPERATOR.SPACE_VERTICALLY: {
        const sorted = this.selectedClasses.toSorted(
          (a, b) => a.position.y - b.position.y,
        );
        // NOTE: handle special case where there are only 2 views, make them adjacent
        if (sorted.length === 2) {
          const previousView = sorted[0] as ClassView;
          const currentView = sorted[1] as ClassView;
          positionedRectangle_setPosition(
            currentView,
            new Point(
              currentView.position.x,
              previousView.position.y + previousView.rectangle.height,
            ),
          );
        } else {
          const spacings = [];
          for (let idx = 1; idx < sorted.length; idx++) {
            const previousView = sorted[idx - 1] as ClassView;
            const currentView = sorted[idx] as ClassView;
            spacings.push(
              currentView.position.y -
                (previousView.position.y + previousView.rectangle.height),
            );
          }
          const averageSpacing =
            spacings.reduce((val, distance) => val + distance, 0) /
            spacings.length;
          for (let idx = 1; idx < sorted.length; idx++) {
            const previousView = sorted[idx - 1] as ClassView;
            const currentView = sorted[idx] as ClassView;
            positionedRectangle_setPosition(
              currentView,
              new Point(
                currentView.position.x,
                previousView.position.y +
                  previousView.rectangle.height +
                  averageSpacing,
              ),
            );
          }
        }
        break;
      }
      default:
        break;
    }

    this.drawScreen();
  }

  truncateTextWithEllipsis(val: string, limit = this.maxLineLength): string {
    const ellipsis = '...';
    return val.length > limit
      ? `${val.substring(0, limit + 1 - ellipsis.length)}${ellipsis}`
      : val;
  }

  canvasCoordinateToModelCoordinate(point: Point): Point {
    return new Point(
      (point.x - this.canvasCenter.x) / this.zoom -
        this.screenOffset.x +
        this.canvasCenter.x,
      (point.y - this.canvasCenter.y) / this.zoom -
        this.screenOffset.y +
        this.canvasCenter.y,
    );
  }

  modelCoordinateToCanvasCoordinate(point: Point): Point {
    return new Point(
      (point.x - this.canvasCenter.x + this.screenOffset.x) * this.zoom +
        this.canvasCenter.x,
      (point.y - this.canvasCenter.y + this.screenOffset.y) * this.zoom +
        this.canvasCenter.y,
    );
  }

  /**
   * Mouse events' coordinate x,y are relative to the viewport, not the canvas element
   * so we need to calculate them relative to the canvas element
   */
  resolveMouseEventCoordinate(e: MouseEvent): Point {
    if (e.target instanceof HTMLElement) {
      const targetEl = getElementPosition(e.target);
      return new Point(targetEl.x + e.offsetX, targetEl.y + e.offsetY);
    }
    // NOTE: this is a fallback, should not happen
    // since all mouse events shoud target the canvas element
    return new Point(e.x, e.y);
  }

  eventCoordinateToCanvasCoordinate(point: Point): Point {
    return new Point(
      point.x - this.divPosition.x + this.div.scrollLeft,
      point.y - this.divPosition.y + this.div.scrollTop,
    );
  }

  canvasCoordinateToEventCoordinate(point: Point): Point {
    return new Point(
      point.x - this.div.scrollLeft + this.divPosition.x,
      point.y - this.div.scrollTop + this.divPosition.y,
    );
  }

  hasPropertyView(classView: ClassView, property: AbstractProperty): boolean {
    return (
      this.diagram.propertyViews.filter(
        (p) =>
          p.property.value === property && p.from.classView.value === classView,
      ).length > 0
    );
  }

  get divPosition(): Point {
    return getElementPosition(this.div);
  }

  private manageVirtualScreen(): void {
    if (this.diagram.classViews.length) {
      const firstClassView = guaranteeNonNullable(this.diagram.classViews[0]);
      let minX = firstClassView.position.x;
      let minY = firstClassView.position.y;
      let maxX = firstClassView.position.x + firstClassView.rectangle.width;
      let maxY = firstClassView.position.y + firstClassView.rectangle.height;
      for (const classView of this.diagram.classViews) {
        minX = Math.min(minX, classView.position.x);
        minY = Math.min(minY, classView.position.y);
        maxX = Math.max(maxX, classView.position.x + classView.rectangle.width);
        maxY = Math.max(
          maxY,
          classView.position.y + classView.rectangle.height,
        );
      }
      const relationshipViews = (
        this.diagram.associationViews as RelationshipView[]
      )
        .concat(this.diagram.generalizationViews)
        .concat(this.diagram.propertyViews);
      for (const relationshipView of relationshipViews) {
        const fullPath = RelationshipView.pruneUnnecessaryInsidePoints(
          relationshipView.buildFullPath(),
          relationshipView.from.classView.value,
          relationshipView.to.classView.value,
        );
        if (relationshipView instanceof PropertyView) {
          const box = this.drawLinePropertyText(
            // NOTE: by the way we compute the full path, it would guarantee
            // to always have at least 2 points
            guaranteeNonNullable(
              fullPath[fullPath.length - 2],
              'Diagram path expected to have at least 2 points',
            ),
            guaranteeNonNullable(
              fullPath[fullPath.length - 1],
              'Diagram path expected to have at least 2 points',
            ),
            relationshipView.to.classView.value,
            relationshipView.property.value,
            false,
          );
          minX = Math.min(minX, box.position.x);
          minY = Math.min(minY, box.position.y);
          maxX = Math.max(maxX, getBottomRightCornerPoint(box).x);
          maxY = Math.max(maxY, getBottomRightCornerPoint(box).y);
        }
        // if (relationshipView.from.name) {
        //   var box = this.displayText(fullPath[1], fullPath[0], relationshipView.from.classView, relationshipView.property, this.ctx);
        //   minX = Math.min(minX, box.x);
        //   minY = Math.min(minY, box.y);
        //   maxX = Math.max(maxX, box.x2);
        //   maxY = Math.max(maxY, box.y2);
        // }
        for (const point of relationshipView.path) {
          minX = Math.min(minX, point.x);
          minY = Math.min(minY, point.y);
          maxX = Math.max(maxX, point.x);
          maxY = Math.max(maxY, point.y);
        }
      }
      this.virtualScreen = new PositionedRectangle(
        new Point(minX, minY),
        new Rectangle(maxX - minX, maxY - minY),
      );
    } else {
      this.setZoomLevel(1);
      this.screenOffset = new Point(0, 0);
      this.virtualScreen = new PositionedRectangle(
        new Point(
          this.canvasDimension.width / 2,
          this.canvasDimension.height / 2,
        ),
        new Rectangle(0, 0),
      );
    }
  }

  /**
   * Here we zoom with respect to the point the mouse is currently pointing at.
   * The idea is fairly simple. We convert the coordinate of the zoom point
   * to the model coordinate and find a way to alter `screenOffset` in response
   * to change in zoom level to ensure the model coordinate stays constant.
   */
  private executeZoom(newZoomLevel: number, point: Point): void {
    // NOTE: we cap the minimum zoom level to avoid negative zoom
    newZoomLevel = Math.max(newZoomLevel, MIN_ZOOM_LEVEL);

    const currentZoomLevel = this.zoom;
    this.setZoomLevel(newZoomLevel);

    this.screenOffset = new Point(
      ((point.x - this.canvasCenter.x) * (currentZoomLevel - newZoomLevel) +
        this.screenOffset.x * currentZoomLevel) /
        newZoomLevel,
      ((point.y - this.canvasCenter.y) * (currentZoomLevel - newZoomLevel) +
        this.screenOffset.y * currentZoomLevel) /
        newZoomLevel,
    );

    this.clearScreen();
    this.drawAll();
  }

  private zoomPoint(zoomLevel: number, zoomPoint: Point): void {
    this.executeZoom(zoomLevel, zoomPoint);
  }

  zoomCenter(zoomLevel: number): void {
    // NOTE: we cap the minimum zoom level to avoid negative zoom
    this.setZoomLevel(Math.max(zoomLevel, MIN_ZOOM_LEVEL));
    this.clearScreen();
    this.drawAll();
  }

  zoomToFit(): void {
    this.autoRecenter();
    this.zoomCenter(
      Math.max(
        Math.min(
          this.canvas.width /
            (this.virtualScreen.rectangle.width +
              this.screenPadding * 2 +
              FIT_ZOOM_PADDING * 2),
          this.canvas.height /
            (this.virtualScreen.rectangle.height +
              this.screenPadding * 2 +
              FIT_ZOOM_PADDING * 2),
        ),
        MIN_ZOOM_LEVEL,
      ),
    );
  }

  /**
   * Add a classview to current diagram and draw it.
   * This function is intended to be used with drag and drop, hence the position paramter, which must be relative to the screen/window
   */
  addClassView(
    addedClass: Class,
    classViewModelCoordinate?: Point,
  ): ClassView | undefined {
    if (!this.isReadOnly) {
      // NOTE: Using `uuid` might be overkill since the `id` is only required to be unique
      // across the diagram, but maintaining a counter has its own downside
      // NOTE: checking for collision to guarantee stability, especially since class view is usually manually added
      const existingIds = this.diagram.classViews.map(
        (classView) => classView.id,
      );
      let id = uuid();
      while (existingIds.includes(id)) {
        id = uuid();
      }
      const newClassView = new ClassView(
        this.diagram,
        id,
        PackageableElementExplicitReference.create(addedClass),
      );
      positionedRectangle_setPosition(
        newClassView,
        classViewModelCoordinate ??
          this.canvasCoordinateToModelCoordinate(
            new Point(
              this.virtualScreen.position.x +
                this.virtualScreen.rectangle.width / 2,
              this.virtualScreen.position.y +
                this.virtualScreen.rectangle.height / 2,
            ),
          ),
      );
      diagram_addClassView(this.diagram, newClassView);
      // Refresh hash since ClassView position is not observable
      // NOTE: here we refresh after adding the class view to the diagram, that way the diagram hash is refreshed
      positionedRectangle_forceRefreshHash(newClassView);
      this.diagram.classViews
        .filter((classView) => classView.class.value !== addedClass)
        .forEach((classView) => {
          const _class = classView.class.value;
          // Add supertype
          if (
            addedClass.generalizations
              .map((generalization) => generalization.value.rawType)
              .includes(_class)
          ) {
            diagram_addGeneralizationView(
              this.diagram,
              new GeneralizationView(this.diagram, newClassView, classView),
            );
          }
          if (
            _class.generalizations
              .map((generalization) => generalization.value.rawType)
              .includes(addedClass)
          ) {
            diagram_addGeneralizationView(
              this.diagram,

              new GeneralizationView(this.diagram, classView, newClassView),
            );
          }
          // Add property view
          getAllOwnClassProperties(addedClass).forEach((property) => {
            if (property.genericType.value.rawType === _class) {
              diagram_addPropertyView(
                this.diagram,

                new PropertyView(
                  this.diagram,
                  PropertyExplicitReference.create(property),
                  newClassView,
                  classView,
                ),
              );
            }
          });
          getAllOwnClassProperties(_class).forEach((property) => {
            if (property.genericType.value.rawType === addedClass) {
              diagram_addPropertyView(
                this.diagram,
                new PropertyView(
                  this.diagram,
                  PropertyExplicitReference.create(property),
                  classView,
                  newClassView,
                ),
              );
            }
          });
        });
      this.drawClassView(newClassView);
      this.drawScreen();
      return newClassView;
    }
    return undefined;
  }

  private drawBoundingBox(): void {
    this.ctx.fillStyle = this.backgroundColor;
    this.ctx.lineWidth = 1;
    this.ctx.fillRect(
      (this.virtualScreen.position.x +
        this.screenOffset.x -
        this.canvasCenter.x -
        this.screenPadding) *
        this.zoom +
        this.canvasCenter.x,
      (this.virtualScreen.position.y +
        this.screenOffset.y -
        this.canvasCenter.y -
        this.screenPadding) *
        this.zoom +
        this.canvasCenter.y,
      (this.virtualScreen.rectangle.width + this.screenPadding * 2) * this.zoom,
      (this.virtualScreen.rectangle.height + this.screenPadding * 2) *
        this.zoom,
    );
    this.ctx.strokeRect(
      (this.virtualScreen.position.x +
        this.screenOffset.x -
        this.canvasCenter.x -
        this.screenPadding) *
        this.zoom +
        this.canvasCenter.x,
      (this.virtualScreen.position.y +
        this.screenOffset.y -
        this.canvasCenter.y -
        this.screenPadding) *
        this.zoom +
        this.canvasCenter.y,
      (this.virtualScreen.rectangle.width + this.screenPadding * 2) * this.zoom,
      (this.virtualScreen.rectangle.height + this.screenPadding * 2) *
        this.zoom,
    );
  }

  private drawDiagram(): void {
    this.diagram.associationViews.forEach((associationView) =>
      this.drawPropertyOrAssociation(associationView),
    );
    this.diagram.generalizationViews.forEach((generalizationView) =>
      this.drawInheritance(generalizationView),
    );
    this.diagram.propertyViews.forEach((propertyView) =>
      this.drawPropertyOrAssociation(propertyView),
    );
    this.diagram.classViews.forEach((classView) =>
      this.drawClassView(classView),
    );
    if (this.showCanvasGrid) {
      this.drawCanvasGrid();
    }
    if (this.showScreenGrid) {
      this.drawScreenGrid();
    }
  }

  drawAll(): void {
    this.drawBoundingBox();
    this.drawDiagram();
  }

  private drawScreenGrid(): void {
    const startX =
      (this.virtualScreen.position.x +
        this.screenOffset.x -
        this.canvasCenter.x) *
        this.zoom +
      this.canvasCenter.x;
    const startY =
      (this.virtualScreen.position.y +
        this.screenOffset.y -
        this.canvasCenter.y) *
        this.zoom +
      this.canvasCenter.y;
    const width =
      (this.virtualScreen.rectangle.width + this.screenPadding * 2) * this.zoom;
    const height =
      (this.virtualScreen.rectangle.height + this.screenPadding * 2) *
      this.zoom;
    this.ctx.beginPath();
    this.ctx.fillStyle = this.screenGridLabelTextColor;
    this.ctx.strokeStyle = this.screenGridLineColor;
    this.ctx.lineWidth = this.screenGridLineWidth;
    this.ctx.font = `${(this.fontSize - 1) * this.zoom}px ${this.fontFamily}`;
    const labelPadding = 5;
    // draw vertical grid lines
    let gridX = 0;
    for (
      let x = startX;
      x < startX + width - this.screenPadding * 2;
      x += this.screenGridSpacingX * this.zoom
    ) {
      this.ctx.fillText(
        `${gridX}`,
        x + labelPadding * this.zoom,
        startY -
          (this.screenGridAxisTickLength + this.screenPadding) * this.zoom,
      );
      this.ctx.fillText(
        `[${Math.round(this.virtualScreen.position.x + gridX)}]`,
        x + labelPadding * this.zoom,
        startY -
          (this.screenGridAxisTickLength +
            this.screenPadding -
            this.lineHeight) *
            this.zoom,
      );
      this.ctx.moveTo(
        x,
        startY -
          (this.screenGridAxisTickLength + this.screenPadding) * this.zoom,
      );
      this.ctx.lineTo(x, startY + height - this.screenPadding * this.zoom);
      this.ctx.stroke();
      gridX += this.screenGridSpacingX;
    }
    // draw horizontal grid lines
    let gridY = 0;
    for (
      let y = startY;
      y < startY + height - this.screenPadding * 2;
      y += this.screenGridSpacingY * this.zoom
    ) {
      this.ctx.fillText(
        `${gridY}`,
        startX -
          (this.screenGridAxisTickLength + this.screenPadding) * this.zoom,
        y + labelPadding * this.zoom,
      );
      this.ctx.fillText(
        `[${Math.round(this.virtualScreen.position.y + gridY)}]`,
        startX -
          (this.screenGridAxisTickLength + this.screenPadding) * this.zoom,
        y + (labelPadding + this.lineHeight) * this.zoom,
      );
      this.ctx.moveTo(
        startX -
          (this.screenGridAxisTickLength + this.screenPadding) * this.zoom,
        y,
      );
      this.ctx.lineTo(startX + width - this.screenPadding * this.zoom, y);
      this.ctx.stroke();
      gridY += this.screenGridSpacingY;
    }
    // draw screen padding border grid line
    if (this.showScreenBoxGuide) {
      this.ctx.beginPath();
      this.ctx.fillStyle = this.screenGuideLabelTextColor;
      this.ctx.strokeStyle = this.screenGuideLineColor;
      this.ctx.moveTo(startX, startY);
      this.ctx.lineTo(
        startX,
        startY + height - this.screenPadding * 2 * this.zoom,
      );
      this.ctx.stroke();
      this.ctx.lineTo(
        startX,
        startY + height - this.screenPadding * 2 * this.zoom,
      );
      this.ctx.lineTo(
        startX + width - this.screenPadding * 2 * this.zoom,
        startY + height - this.screenPadding * 2 * this.zoom,
      );
      this.ctx.stroke();
      this.ctx.lineTo(
        startX + width - this.screenPadding * 2 * this.zoom,
        startY + height - this.screenPadding * 2 * this.zoom,
      );
      this.ctx.lineTo(
        startX + width - this.screenPadding * 2 * this.zoom,
        startY,
      );
      this.ctx.stroke();
      this.ctx.lineTo(
        startX + width - this.screenPadding * 2 * this.zoom,
        startY,
      );
      this.ctx.lineTo(startX, startY);
      this.ctx.stroke();
      // draw center guides
      this.ctx.fillText(
        `${Math.round(this.virtualScreen.rectangle.width / 2)}`,
        startX + width / 2 - (this.screenPadding - labelPadding) * this.zoom,
        startY + labelPadding * this.zoom,
      );
      this.ctx.fillText(
        `[${Math.round(
          this.virtualScreen.position.x +
            this.virtualScreen.rectangle.width / 2,
        )}]`,
        startX + width / 2 - (this.screenPadding - labelPadding) * this.zoom,
        startY + (labelPadding + this.lineHeight) * this.zoom,
      );
      this.ctx.lineTo(
        startX + width / 2 - this.screenPadding * this.zoom,
        startY,
      );
      this.ctx.lineTo(
        startX + width / 2 - this.screenPadding * this.zoom,
        startY + height - this.screenPadding * 2 * this.zoom,
      );
      this.ctx.stroke();
      this.ctx.fillText(
        `${Math.round(this.virtualScreen.rectangle.height / 2)}`,
        startX + labelPadding * this.zoom,
        startY + height / 2 - (this.screenPadding - labelPadding) * this.zoom,
      );
      this.ctx.fillText(
        `[${Math.round(
          this.virtualScreen.position.y +
            this.virtualScreen.rectangle.height / 2,
        )}]`,
        startX + labelPadding * this.zoom,
        startY +
          height / 2 -
          (this.screenPadding - labelPadding - this.lineHeight) * this.zoom,
      );
      this.ctx.lineTo(
        startX,
        startY + height / 2 - this.screenPadding * this.zoom,
      );
      this.ctx.lineTo(
        startX + width - this.screenPadding * 2 * this.zoom,
        startY + height / 2 - this.screenPadding * this.zoom,
      );
      this.ctx.stroke();
    }
    this.ctx.strokeStyle = this.defaultLineColor;
    this.ctx.lineWidth = this.defaultLineWidth;
  }

  private drawCanvasGrid(): void {
    const startX = -this.canvasCenter.x * this.zoom + this.canvasCenter.x;
    const startY = -this.canvasCenter.y * this.zoom + this.canvasCenter.y;
    const width = this.canvasDimension.width;
    const height = this.canvasDimension.height;
    this.ctx.setLineDash([5, 5]);
    this.ctx.fillStyle = this.canvasGridLabelTextColor;
    this.ctx.strokeStyle = this.canvasGridLineColor;
    this.ctx.lineWidth = this.canvasGridLineWidth;
    this.ctx.font = `${(this.fontSize - 1) * this.zoom}px ${this.fontFamily}`;
    const labelPadding = 5;
    this.ctx.beginPath();
    // draw vertical grid lines
    let gridX = 0;
    for (let x = startX; x < width; x += this.canvasGridSpacingX * this.zoom) {
      if (x !== 0) {
        this.ctx.fillText(
          `[${Math.round(gridX)}]`,
          x + labelPadding * this.zoom,
          labelPadding * this.zoom,
        );
      }
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, height);
      this.ctx.stroke();
      gridX += this.canvasGridSpacingX;
    }
    // draw horizontal grid lines
    let gridY = 0;
    for (let y = startY; y < height; y += this.canvasGridSpacingY * this.zoom) {
      if (y !== 0) {
        this.ctx.fillText(
          `[${Math.round(gridY)}]`,
          labelPadding * this.zoom,
          y + labelPadding * this.zoom,
        );
      }
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(width, y);
      this.ctx.stroke();
      gridY += this.canvasGridSpacingY;
    }
    // draw canvas padding border grid line
    if (this.showCanvasBoxGuide) {
      this.ctx.beginPath();
      this.ctx.fillStyle = this.canvasGuideLabelTextColor;
      this.ctx.strokeStyle = this.canvasGuideLineColor;
      // draw center guides
      this.ctx.fillText(
        `[${Math.round(width / 2)}]`,
        width / 2 + labelPadding * this.zoom,
        labelPadding * this.zoom,
      );
      this.ctx.moveTo(width / 2, 0);
      this.ctx.lineTo(width / 2, height);
      this.ctx.stroke();
      this.ctx.fillText(
        `[${Math.round(height / 2)}]`,
        labelPadding * this.zoom,
        height / 2 + labelPadding * this.zoom,
      );
      this.ctx.moveTo(0, height / 2);
      this.ctx.lineTo(width, height / 2);
      this.ctx.stroke();
    }
    // draw offset guides
    if (this.showScreenOffsetGuide) {
      const offsetPointRadius = 5;
      const thresholdToHideOffsetTickLabel = 35;
      this.ctx.beginPath();
      this.ctx.setLineDash([]); // return solid line
      this.ctx.fillStyle = this.screenOffsetGuideLabelTextColor;
      this.ctx.strokeStyle = this.screenOffsetGuideLineColor;
      // draw the crosshair
      this.ctx.arc(
        startX + this.screenOffset.x * this.zoom,
        startY + this.screenOffset.y * this.zoom,
        offsetPointRadius * this.zoom,
        0,
        2 * Math.PI,
      );
      this.ctx.moveTo(
        startX + (this.screenOffset.x - offsetPointRadius) * this.zoom,
        startY + this.screenOffset.y * this.zoom,
      );
      this.ctx.lineTo(
        startX + (this.screenOffset.x + offsetPointRadius * 2) * this.zoom,
        startY + this.screenOffset.y * this.zoom,
      );
      this.ctx.moveTo(
        startX + this.screenOffset.x * this.zoom,
        startY + (this.screenOffset.y - offsetPointRadius) * this.zoom,
      );
      this.ctx.lineTo(
        startX + this.screenOffset.x * this.zoom,
        startY + (this.screenOffset.y + offsetPointRadius * 2) * this.zoom,
      );
      this.ctx.stroke();
      // draw the offset distance
      this.ctx.setLineDash([5, 5]);
      this.ctx.moveTo(startX, startY + this.screenOffset.y * this.zoom);
      this.ctx.lineTo(
        startX + (this.screenOffset.x - offsetPointRadius) * this.zoom,
        startY + this.screenOffset.y * this.zoom,
      );
      this.ctx.moveTo(startX + this.screenOffset.x * this.zoom, startY + 0);
      this.ctx.lineTo(
        startX + this.screenOffset.x * this.zoom,
        startY + (this.screenOffset.y - offsetPointRadius) * this.zoom,
      );
      this.ctx.stroke();
      this.ctx.beginPath();
      if (
        this.screenOffset.x >= thresholdToHideOffsetTickLabel &&
        this.screenOffset.y >= thresholdToHideOffsetTickLabel
      ) {
        this.ctx.fillText(
          `[${Math.round(this.screenOffset.x)}]`,
          startX + (this.screenOffset.x + labelPadding) * this.zoom,
          startY + labelPadding * this.zoom,
        );
        this.ctx.fillText(
          `[${Math.round(this.screenOffset.y)}]`,
          startX + labelPadding * this.zoom,
          startY + (this.screenOffset.y + labelPadding) * this.zoom,
        );
      } else if (this.screenOffset.x >= 0 && this.screenOffset.y >= 0) {
        this.ctx.fillText(
          `\u0394 [${Math.round(this.screenOffset.x)},${Math.round(
            this.screenOffset.y,
          )}]`,
          startX +
            (this.screenOffset.x + offsetPointRadius + labelPadding) *
              this.zoom,
          startY +
            (this.screenOffset.y + offsetPointRadius + labelPadding) *
              this.zoom,
        );
      } else {
        this.ctx.fillText(
          `\u0394 [${Math.round(this.screenOffset.x)},${Math.round(
            this.screenOffset.y,
          )}]`,
          startX + (offsetPointRadius + labelPadding) * this.zoom,
          startY + (offsetPointRadius + labelPadding) * this.zoom,
        );
      }
    }
    this.ctx.setLineDash([]); // return solid line
    this.ctx.strokeStyle = this.defaultLineColor;
    this.ctx.lineWidth = this.defaultLineWidth;
  }

  private drawClassViewProperty(
    classView: ClassView,
    property: AbstractProperty,
    propX: number,
    propY: number,
    measureOnly: boolean,
  ): number {
    this.ctx.font =
      this.mouseOverClassView === classView &&
      this.mouseOverClassProperty === property
        ? `bold ${(this.fontSize - 1) * (measureOnly ? 1 : this.zoom)}px ${
            this.fontFamily
          }`
        : `${measureOnly ? 'bold' : ''} ${
            (this.fontSize - 1) * (measureOnly ? 1 : this.zoom)
          }px ${this.fontFamily}`;
    const propertyName = getPropertyDisplayName(property);
    let txtMeasure = this.ctx.measureText(`${propertyName} : `).width;
    if (!measureOnly) {
      this.ctx.fillText(`${propertyName} : `, propX, propY);
      this.ctx.fillText(
        property.genericType.value.rawType.name,
        propX + txtMeasure,
        propY,
      );
      // Draw Enumeration Property - with underscore
      if (property.genericType.value.rawType instanceof Enumeration) {
        this.ctx.beginPath();
        this.ctx.moveTo(
          propX + txtMeasure,
          propY + (this.fontSize - 1) * this.zoom,
        );
        this.ctx.lineTo(
          propX +
            txtMeasure +
            this.ctx.measureText(property.genericType.value.rawType.name).width,
          propY + (this.fontSize - 1) * this.zoom,
        );
        this.ctx.stroke();
      }
    }
    txtMeasure += this.ctx.measureText(
      property.genericType.value.rawType.name,
    ).width;
    this.ctx.font = `${(this.fontSize - 1) * (measureOnly ? 1 : this.zoom)}px ${
      this.fontFamily
    }`;
    const multiplicityString = generateMultiplicityString(
      property.multiplicity.lowerBound,
      property.multiplicity.upperBound,
    );
    if (!measureOnly) {
      this.ctx.fillText(`[${multiplicityString}]`, propX + txtMeasure, propY);
    }
    txtMeasure += this.ctx.measureText(`[${multiplicityString}]`).width;
    return txtMeasure;
  }

  private computeClassNameWidth(classView: ClassView): number {
    this.ctx.font = `bold ${this.fontSize}px ${this.fontFamily}`;
    this.ctx.textBaseline = 'top'; // Compute min dimensions

    // Calculate the box for the class name header
    return this.ctx.measureText(
      this.truncateTextWithEllipsis(classView.class.value.name),
    ).width;
  }

  ensureClassViewMeetMinDimensions(classView: ClassView): void {
    // Calculate the box for the class name header
    let classMinWidth = this.computeClassNameWidth(classView);
    let classMinHeight = this.lineHeight + this.classViewSpaceY * 2; // padding top and bottom fo the header

    // Calculate box for Stereotypes
    if (!classView.hideStereotypes) {
      this.ctx.font = `${this.fontSize}px ${this.fontFamily}`;
      for (const stereotype of classView.class.value.stereotypes) {
        const stereotypeTxt = `<< ${this.truncateTextWithEllipsis(
          stereotype.value.value,
          this.maxLineLength - 6,
        )} >>`;
        const stereoWidth = this.ctx.measureText(stereotypeTxt).width;
        classMinWidth = Math.max(classMinWidth, stereoWidth);
        classMinHeight = classMinHeight + this.lineHeight;
      }
    }

    // Calculate box for TaggedValues
    if (!classView.hideTaggedValues) {
      this.ctx.font = `${this.fontSize}px ${this.fontFamily}`;
      this.ctx.textBaseline = 'top'; // Compute min dimensions
      for (const taggedValue of classView.class.value.taggedValues) {
        const taggedValueTxt = `{ ${this.truncateTextWithEllipsis(
          `${taggedValue.tag.value.value} = ${taggedValue.value}`,
          this.maxLineLength - 4,
        )} }`;
        const taggedValueWidth = this.ctx.measureText(taggedValueTxt).width;
        classMinWidth = Math.max(classMinWidth, taggedValueWidth);
        classMinHeight = classMinHeight + this.lineHeight;
      }
    }

    // Calculate box for properties
    if (!classView.hideProperties) {
      getAllOwnClassProperties(classView.class.value).forEach((property) => {
        if (!this.hasPropertyView(classView, property)) {
          const propertyTextMeasure = this.drawClassViewProperty(
            classView,
            property,
            // these means nothing since we only need to measure here
            0,
            0,
            true,
          );
          classMinWidth = Math.max(classMinWidth, propertyTextMeasure);
          classMinHeight = classMinHeight + this.lineHeight;
        }
      });
      classMinHeight = classMinHeight + this.classViewSpaceY * 2;
    }

    classMinWidth = classMinWidth + this.classViewSpaceX * 2;
    // Modify the dimension according to the newly computed height and width
    if (!this.isReadOnly || this.enableLayoutAutoAdjustment) {
      const width =
        classView.rectangle.width && classView.rectangle.width > classMinWidth
          ? classView.rectangle.width
          : classMinWidth;
      const height =
        classView.rectangle.height &&
        classView.rectangle.height > classMinHeight
          ? classView.rectangle.height
          : classMinHeight;
      positionedRectangle_setRectangle(classView, new Rectangle(width, height));
    }
  }

  private drawClassView(classView: ClassView): void {
    const classMinWidth = this.computeClassNameWidth(classView);
    this.ensureClassViewMeetMinDimensions(classView);
    this.ctx.fillStyle = this.classViewFillColor;

    // Draw the Box
    const position = this.modelCoordinateToCanvasCoordinate(classView.position);
    this.ctx.fillRect(
      position.x,
      position.y,
      classView.rectangle.width * this.zoom,
      classView.rectangle.height * this.zoom,
    );
    this.ctx.lineWidth =
      this.selectedClasses.length !== 0 &&
      this.selectedClasses.indexOf(classView) !== -1
        ? 2
        : 1;
    this.ctx.strokeRect(
      position.x,
      position.y,
      classView.rectangle.width * this.zoom,
      classView.rectangle.height * this.zoom,
    );
    const startX = classView.position.x;
    const startY = classView.position.y;
    this.ctx.lineWidth = 1;
    this.ctx.fillStyle = this.classViewHeaderTextColor;
    let cursorY = startY;
    this.ctx.font = `${this.fontSize * this.zoom}px ${this.fontFamily}`;

    // Print Stereotypes
    if (!classView.hideStereotypes) {
      for (const stereotype of classView.class.value.stereotypes) {
        this.ctx.font = `${this.fontSize}px ${this.fontFamily}`;
        const stereotypeTxt = `<< ${this.truncateTextWithEllipsis(
          stereotype.value.value,
          this.maxLineLength - 6,
        )} >>`;
        const stereoWidth = this.ctx.measureText(stereotypeTxt).width;
        this.ctx.font = `${this.fontSize * this.zoom}px ${this.fontFamily}`;
        this.ctx.fillText(
          stereotypeTxt,
          (startX +
            this.screenOffset.x +
            (classView.rectangle.width - stereoWidth) / 2 -
            this.canvasCenter.x) *
            this.zoom +
            this.canvasCenter.x,
          (cursorY +
            this.screenOffset.y +
            this.classViewSpaceY -
            this.canvasCenter.y) *
            this.zoom +
            this.canvasCenter.y,
        );
        cursorY = cursorY + this.lineHeight;
      }
    }

    // Print Class Name
    this.ctx.font = `bold ${this.fontSize * this.zoom}px ${this.fontFamily}`;
    const classNameText = this.truncateTextWithEllipsis(
      classView.class.value.name,
    );
    this.ctx.fillText(
      classNameText,
      (startX +
        this.screenOffset.x +
        (classView.rectangle.width - classMinWidth) / 2 -
        this.canvasCenter.x) *
        this.zoom +
        this.canvasCenter.x,
      (cursorY +
        this.screenOffset.y +
        this.classViewSpaceY -
        this.canvasCenter.y) *
        this.zoom +
        this.canvasCenter.y,
    );
    cursorY = cursorY + this.lineHeight;

    // Print Tagges Values
    if (!classView.hideTaggedValues) {
      for (const taggedValue of classView.class.value.taggedValues) {
        this.ctx.font = `${this.fontSize}px ${this.fontFamily}`;
        const taggedValueTxt = `{ ${this.truncateTextWithEllipsis(
          `${taggedValue.tag.value.value} = ${taggedValue.value}`,
          this.maxLineLength - 4,
        )} }`;
        const taggedValueWidth = this.ctx.measureText(taggedValueTxt).width;
        this.ctx.font = `${this.fontSize * this.zoom}px ${this.fontFamily}`;
        this.ctx.fillText(
          taggedValueTxt,
          (startX +
            this.screenOffset.x +
            (classView.rectangle.width - taggedValueWidth) / 2 -
            this.canvasCenter.x) *
            this.zoom +
            this.canvasCenter.x,
          (cursorY +
            this.screenOffset.y +
            this.classViewSpaceY -
            this.canvasCenter.y) *
            this.zoom +
            this.canvasCenter.y,
        );
        cursorY = cursorY + this.lineHeight;
      }
    }

    // 2 spaces (above and below for class name) and 1 space (above) for properties block
    cursorY = cursorY + this.classViewSpaceY * 3;

    // Draw properties
    if (!classView.hideProperties) {
      // Draw Line the line that separate header and property list
      this.ctx.beginPath();
      const yLineCoord =
        (startY +
          this.screenOffset.y +
          this.lineHeight +
          (!classView.hideStereotypes
            ? classView.class.value.stereotypes.length * this.lineHeight
            : 0) +
          (!classView.hideTaggedValues
            ? classView.class.value.taggedValues.length * this.lineHeight
            : 0) +
          this.classViewSpaceY -
          this.canvasCenter.y) *
          this.zoom +
        this.canvasCenter.y;
      this.ctx.moveTo(
        (startX + this.screenOffset.x - this.canvasCenter.x) * this.zoom +
          this.canvasCenter.x,
        yLineCoord,
      );
      this.ctx.lineTo(
        (startX +
          this.screenOffset.x +
          classView.rectangle.width -
          this.canvasCenter.x) *
          this.zoom +
          this.canvasCenter.x,
        yLineCoord,
      );
      this.ctx.stroke();

      for (const property of getAllOwnClassProperties(classView.class.value)) {
        if (!this.hasPropertyView(classView, property)) {
          this.ctx.fillStyle =
            property instanceof DerivedProperty
              ? this.classViewDerivedPropertyTextColor
              : property.genericType.value.rawType instanceof PrimitiveType
                ? this.classViewPrimitivePropertyTextColor
                : this.classViewPropertyTextColor;
          const propX =
            (startX +
              this.screenOffset.x +
              this.classViewSpaceX -
              this.canvasCenter.x) *
              this.zoom +
            this.canvasCenter.x;
          const propY =
            (cursorY + this.screenOffset.y - this.canvasCenter.y) * this.zoom +
            this.canvasCenter.y;
          this.drawClassViewProperty(classView, property, propX, propY, false);
          cursorY = cursorY + this.lineHeight;
        }
      }
    }
    // NOTE: force hash reload when we redraw class view; this would help with cases where
    // we auto add new properties to the class view, causing the box to expand, hence we need
    // to recompute hash
    positionedRectangle_forceRefreshHash(classView);
  }

  private drawLinePropertyNameAndMultiplicity(
    property: AbstractProperty,
    textPositionX: (n: number) => number,
    textPositionY: (n: number) => number,
    multiplicityPositionX: (n: number) => number,
    multiplicityPositionY: (n: number) => number,
    measureOnly: boolean,
  ): PositionedRectangle {
    this.ctx.font = `${this.fontSize}px ${this.fontFamily}`;
    const propertyName = getPropertyDisplayName(property);
    const multiplictyString = generateMultiplicityString(
      property.multiplicity.lowerBound,
      property.multiplicity.upperBound,
    );
    const textSize = this.ctx.measureText(propertyName).width;
    const mulSize = this.ctx.measureText(multiplictyString).width;
    this.ctx.font = `${this.fontSize * this.zoom}px ${this.fontFamily}`;
    const posX = textPositionX(textSize);
    const posY = textPositionY(textSize);
    const propertyPosition = this.modelCoordinateToCanvasCoordinate(
      new Point(textPositionX(textSize), textPositionY(textSize)),
    );
    if (!measureOnly) {
      this.ctx.fillText(propertyName, propertyPosition.x, propertyPosition.y);
    }
    const mulPosX = multiplicityPositionX(mulSize);
    const mulPosY = multiplicityPositionY(mulSize);
    const multiplicityPosition = this.modelCoordinateToCanvasCoordinate(
      new Point(multiplicityPositionX(mulSize), multiplicityPositionY(mulSize)),
    );
    if (!measureOnly) {
      this.ctx.fillText(
        multiplictyString,
        multiplicityPosition.x,
        multiplicityPosition.y,
      );
    }
    const position = new Point(
      Math.min(posX, mulPosX),
      Math.min(posY, mulPosY),
    );
    return new PositionedRectangle(
      position,
      new Rectangle(
        Math.max(posX, mulPosX) + Math.max(textSize, mulSize) - position.x,
        Math.max(posY, mulPosY) + this.lineHeight - position.y,
      ),
    );
  }

  private drawLinePropertyText(
    from: Point,
    to: Point,
    viewSide: ClassView,
    property: AbstractProperty,
    measureOnly: boolean,
  ): PositionedRectangle {
    this.ctx.textBaseline = 'top';
    this.ctx.fillStyle = this.relationshipViewTextColor;
    const startX = from.x;
    const startY = from.y;
    const endX = to.x;
    const endY = to.y;
    const rect = viewSide.rectangle;
    if (startY < endY) {
      const x =
        startX +
        ((endX - startX) / (endY - startY)) * (viewSide.position.y - startY);
      if (x > viewSide.position.x && x < viewSide.position.x + rect.width) {
        return this.drawLinePropertyNameAndMultiplicity(
          property,
          (textSize) =>
            x < viewSide.position.x + rect.width / 2
              ? x + this.propertySpacing
              : x - textSize - this.propertySpacing,
          (textSize) =>
            viewSide.position.y - this.lineHeight - this.propertySpacing,
          (mulSize) =>
            x < viewSide.position.x + rect.width / 2
              ? x - mulSize - this.propertySpacing
              : x + this.propertySpacing,
          (mulSize) =>
            viewSide.position.y - this.lineHeight - this.propertySpacing,
          measureOnly,
        );
      }
    } else {
      const x =
        startX +
        ((endX - startX) / (endY - startY)) *
          (viewSide.position.y + rect.height - startY);
      if (x > viewSide.position.x && x < viewSide.position.x + rect.width) {
        return this.drawLinePropertyNameAndMultiplicity(
          property,
          (textSize) =>
            x < viewSide.position.x + rect.width / 2
              ? x + this.propertySpacing
              : x - textSize - this.propertySpacing,
          (textSize) =>
            viewSide.position.y + rect.height + this.propertySpacing,
          (mulSize) =>
            x < viewSide.position.x + rect.width / 2
              ? x - mulSize - this.propertySpacing
              : x + this.propertySpacing,
          (mulSize) => viewSide.position.y + rect.height + this.propertySpacing,
          measureOnly,
        );
      }
    }
    if (startX < endX) {
      const y =
        startY +
        ((endY - startY) / (endX - startX)) * (viewSide.position.x - startX);
      if (y > viewSide.position.y && y < viewSide.position.y + rect.height) {
        return this.drawLinePropertyNameAndMultiplicity(
          property,
          (textSize) => viewSide.position.x - textSize - this.propertySpacing,
          (textSize) =>
            y < viewSide.position.y + viewSide.rectangle.height / 2
              ? y + this.propertySpacing
              : y - this.lineHeight - this.propertySpacing,
          (mulSize) => viewSide.position.x - mulSize - this.propertySpacing,
          (mulSize) =>
            y < viewSide.position.y + viewSide.rectangle.height / 2
              ? y - this.lineHeight - this.propertySpacing
              : y + this.propertySpacing,
          measureOnly,
        );
      }
    } else {
      const y =
        startY +
        ((endY - startY) / (endX - startX)) *
          (viewSide.position.x + viewSide.rectangle.width - startX);
      if (
        y > viewSide.position.y &&
        y < viewSide.position.y + viewSide.rectangle.height
      ) {
        return this.drawLinePropertyNameAndMultiplicity(
          property,
          (textSize) =>
            viewSide.position.x +
            viewSide.rectangle.width +
            this.propertySpacing,
          (textSize) =>
            y < viewSide.position.y + viewSide.rectangle.height / 2
              ? y + this.propertySpacing
              : y - this.lineHeight - this.propertySpacing,
          (mulSize) =>
            viewSide.position.x +
            viewSide.rectangle.width +
            this.propertySpacing,
          (mulSize) =>
            y < viewSide.position.y + viewSide.rectangle.height / 2
              ? y - this.lineHeight - this.propertySpacing
              : y + this.propertySpacing,
          measureOnly,
        );
      }
    }
    return new PositionedRectangle(new Point(0, 0), new Rectangle(0, 0));
  }

  private drawPropertyOrAssociation(propertyView: PropertyView): void {
    const fullPath = RelationshipView.pruneUnnecessaryInsidePoints(
      propertyView.buildFullPath(),
      propertyView.from.classView.value,
      propertyView.to.classView.value,
    );
    // const toProperty = asso instanceof.property ? asso.property : asso.association.properties[1];
    const toProperty = propertyView.property.value;
    this.drawLinePropertyText(
      // NOTE: by the way we compute the full path, it would guarantee
      // to always have at least 2 points
      guaranteeNonNullable(
        fullPath[fullPath.length - 2],
        'Diagram path expected to have at least 2 points',
      ),
      guaranteeNonNullable(
        fullPath[fullPath.length - 1],
        'Diagram path expected to have at least 2 points',
      ),
      propertyView.to.classView.value,
      toProperty,
      false,
    );
    // if (asso.association) {
    //   this.displayText(fullPath[1], fullPath[0], asso.from.classView, asso.association.properties[0], this.ctx);
    // }
    this.ctx.beginPath();
    this.ctx.lineWidth =
      propertyView === this.selectedPropertyOrAssociation ? 2 : 1;
    fullPath.forEach((point, idx) => {
      const position = this.modelCoordinateToCanvasCoordinate(point);
      if (idx === 0) {
        this.ctx.moveTo(position.x, position.y);
      } else {
        this.ctx.lineTo(position.x, position.y);
      }
    });
    this.ctx.stroke();
    this.ctx.lineWidth = 1;
    if (toProperty instanceof Property) {
      const startPoint = fullPath[1] as Point;
      const endPoint = fullPath[0] as Point;
      const startX = startPoint.x;
      const startY = startPoint.y;
      const endX = endPoint.x;
      const endY = endPoint.y;
      const to = propertyView.from;
      let resultX = 0;
      let resultY = 0;
      if (endY > startY) {
        const x =
          startX +
          ((endX - startX) / (endY - startY)) *
            (to.classView.value.position.y - startY);
        if (
          x > to.classView.value.position.x &&
          x < to.classView.value.position.x + to.classView.value.rectangle.width
        ) {
          resultX = (x - this.canvasCenter.x) * this.zoom + this.canvasCenter.x;
          resultY =
            (to.classView.value.position.y - this.canvasCenter.y) * this.zoom +
            this.canvasCenter.y;
        }
      } else {
        const x =
          startX +
          ((endX - startX) / (endY - startY)) *
            (to.classView.value.position.y +
              to.classView.value.rectangle.height -
              startY);
        if (
          x > to.classView.value.position.x &&
          x < to.classView.value.position.x + to.classView.value.rectangle.width
        ) {
          resultX = (x - this.canvasCenter.x) * this.zoom + this.canvasCenter.x;
          resultY =
            (to.classView.value.position.y +
              to.classView.value.rectangle.height -
              this.canvasCenter.y) *
              this.zoom +
            this.canvasCenter.y;
        }
      }
      if (endX > startX) {
        const y =
          startY +
          ((endY - startY) / (endX - startX)) *
            (to.classView.value.position.x - startX);
        if (
          y > to.classView.value.position.y &&
          y <
            to.classView.value.position.y + to.classView.value.rectangle.height
        ) {
          resultX =
            (to.classView.value.position.x - this.canvasCenter.x) * this.zoom +
            this.canvasCenter.x;
          resultY = (y - this.canvasCenter.y) * this.zoom + this.canvasCenter.y;
        }
      } else {
        const y =
          startY +
          ((endY - startY) / (endX - startX)) *
            (to.classView.value.position.x +
              to.classView.value.rectangle.width -
              startX);
        if (
          y > to.classView.value.position.y &&
          y <
            to.classView.value.position.y + to.classView.value.rectangle.height
        ) {
          resultX =
            (to.classView.value.position.x +
              to.classView.value.rectangle.width -
              this.canvasCenter.x) *
              this.zoom +
            this.canvasCenter.x;
          resultY = (y - this.canvasCenter.y) * this.zoom + this.canvasCenter.y;
        }
      }
      if (
        toProperty.aggregation === AggregationKind.COMPOSITE ||
        toProperty.aggregation === AggregationKind.SHARED
      ) {
        // Draw Diamond
        let angle = Math.atan((endY - startY) / (endX - startX));
        angle = endX >= startX ? angle : angle + Math.PI;
        this.ctx.beginPath();
        this.ctx.moveTo(
          resultX +
            (this.screenOffset.x + rotatePointX(this.diamond[0], angle)) *
              this.zoom,
          resultY +
            (this.screenOffset.y + rotatePointY(this.diamond[0], angle)) *
              this.zoom,
        );
        this.ctx.lineTo(
          resultX +
            (this.screenOffset.x + rotatePointX(this.diamond[1], angle)) *
              this.zoom,
          resultY +
            (this.screenOffset.y + rotatePointY(this.diamond[1], angle)) *
              this.zoom,
        );
        this.ctx.lineTo(
          resultX +
            (this.screenOffset.x + rotatePointX(this.diamond[2], angle)) *
              this.zoom,
          resultY +
            (this.screenOffset.y + rotatePointY(this.diamond[2], angle)) *
              this.zoom,
        );
        this.ctx.lineTo(
          resultX +
            (this.screenOffset.x + rotatePointX(this.diamond[3], angle)) *
              this.zoom,
          resultY +
            (this.screenOffset.y + rotatePointY(this.diamond[3], angle)) *
              this.zoom,
        );
        this.ctx.lineTo(
          resultX +
            (this.screenOffset.x + rotatePointX(this.diamond[0], angle)) *
              this.zoom,
          resultY +
            (this.screenOffset.y + rotatePointY(this.diamond[0], angle)) *
              this.zoom,
        );
        if (toProperty.aggregation === AggregationKind.SHARED) {
          this.ctx.fillStyle = this.propertyViewSharedDiamondColor;
        }
        if (toProperty.aggregation === AggregationKind.COMPOSITE) {
          this.ctx.fillStyle = this.propertyViewOwnedDiamondColor;
        }
        this.ctx.fill();
        this.ctx.stroke();
        this.ctx.lineWidth = 1;
      }
    }
  }

  private drawInheritance(inheritance: GeneralizationView): void {
    const rect = inheritance.to.classView.value.rectangle;
    const fullPath = RelationshipView.pruneUnnecessaryInsidePoints(
      inheritance.buildFullPath(),
      inheritance.from.classView.value,
      inheritance.to.classView.value,
    );
    // NOTE: by the way we compute the full path, it would guarantee
    // to always have at least 2 points
    const startX = guaranteeNonNullable(
      fullPath[fullPath.length - 2],
      'Diagram path expected to have at least 2 points',
    ).x;
    const startY = guaranteeNonNullable(
      fullPath[fullPath.length - 2],
      'Diagram path expected to have at least 2 points',
    ).y;
    const endX = guaranteeNonNullable(
      fullPath[fullPath.length - 1],
      'Diagram path expected to have at least 2 points',
    ).x;
    const endY = guaranteeNonNullable(
      fullPath[fullPath.length - 1],
      'Diagram path expected to have at least 2 points',
    ).y;
    let resultX = 0;
    let resultY = 0;
    if (endY > startY) {
      const x =
        startX +
        ((endX - startX) / (endY - startY)) *
          (inheritance.to.classView.value.position.y - startY);
      if (
        x > inheritance.to.classView.value.position.x &&
        x < inheritance.to.classView.value.position.x + rect.width
      ) {
        resultX = (x - this.canvasCenter.x) * this.zoom + this.canvasCenter.x;
        resultY =
          (inheritance.to.classView.value.position.y - this.canvasCenter.y) *
            this.zoom +
          this.canvasCenter.y;
      }
    } else {
      const x =
        startX +
        ((endX - startX) / (endY - startY)) *
          (inheritance.to.classView.value.position.y + rect.height - startY);
      if (
        x > inheritance.to.classView.value.position.x &&
        x < inheritance.to.classView.value.position.x + rect.width
      ) {
        resultX = (x - this.canvasCenter.x) * this.zoom + this.canvasCenter.x;
        resultY =
          (inheritance.to.classView.value.position.y +
            rect.height -
            this.canvasCenter.y) *
            this.zoom +
          this.canvasCenter.y;
      }
    }
    if (endX > startX) {
      const y =
        startY +
        ((endY - startY) / (endX - startX)) *
          (inheritance.to.classView.value.position.x - startX);
      if (
        y > inheritance.to.classView.value.position.y &&
        y < inheritance.to.classView.value.position.y + rect.height
      ) {
        resultX =
          (inheritance.to.classView.value.position.x - this.canvasCenter.x) *
            this.zoom +
          this.canvasCenter.x;
        resultY = (y - this.canvasCenter.y) * this.zoom + this.canvasCenter.y;
      }
    } else {
      const y =
        startY +
        ((endY - startY) / (endX - startX)) *
          (inheritance.to.classView.value.position.x + rect.width - startX);
      if (
        y > inheritance.to.classView.value.position.y &&
        y < inheritance.to.classView.value.position.y + rect.height
      ) {
        resultX =
          (inheritance.to.classView.value.position.x +
            rect.width -
            this.canvasCenter.x) *
            this.zoom +
          this.canvasCenter.x;
        resultY = (y - this.canvasCenter.y) * this.zoom + this.canvasCenter.y;
      }
    }
    this.ctx.beginPath();
    this.ctx.lineWidth = inheritance === this.selectedInheritance ? 2 : 1;
    fullPath.forEach((point, idx) => {
      const position = this.modelCoordinateToCanvasCoordinate(point);
      if (idx === 0) {
        this.ctx.moveTo(position.x, position.y);
      } else {
        this.ctx.lineTo(position.x, position.y);
      }
    });
    this.ctx.stroke(); // Draw Triangle
    let angle = Math.atan((endY - startY) / (endX - startX));
    angle = endX >= startX ? angle : angle + Math.PI;
    this.ctx.beginPath();
    this.ctx.moveTo(
      resultX +
        (this.screenOffset.x + rotatePointX(this.triangle[0], angle)) *
          this.zoom,
      resultY +
        (this.screenOffset.y + rotatePointY(this.triangle[0], angle)) *
          this.zoom,
    );
    this.ctx.lineTo(
      resultX +
        (this.screenOffset.x + rotatePointX(this.triangle[1], angle)) *
          this.zoom,
      resultY +
        (this.screenOffset.y + rotatePointY(this.triangle[1], angle)) *
          this.zoom,
    );
    this.ctx.lineTo(
      resultX +
        (this.screenOffset.x + rotatePointX(this.triangle[2], angle)) *
          this.zoom,
      resultY +
        (this.screenOffset.y + rotatePointY(this.triangle[2], angle)) *
          this.zoom,
    );
    this.ctx.lineTo(
      resultX +
        (this.screenOffset.x + rotatePointX(this.triangle[0], angle)) *
          this.zoom,
      resultY +
        (this.screenOffset.y + rotatePointY(this.triangle[0], angle)) *
          this.zoom,
    );
    this.ctx.fillStyle = this.generalizationViewInheritanceTriangeFillColor;
    this.ctx.fill();
    this.ctx.stroke();
    this.ctx.lineWidth = 1;
  }

  /**
   * Reorder will move the class view to the top of the class view array of the diagram,
   * This will bring it to front.
   */
  private reorderDiagramDomain(
    firstClass: ClassView,
    diagram: Diagram,
  ): ClassView[] {
    const newClasses = diagram.classViews.filter(
      (classView) => classView !== firstClass,
    );
    newClasses.push(firstClass);
    return newClasses;
  }

  /**
   * Shift relationship views if both ends' classviews are moved.
   */
  private potentiallyShiftRelationships(
    relationshipViews: RelationshipView[],
    selectedClasses: ClassView[],
    newMovingDeltaX: number,
    newMovingDeltaY: number,
  ): void {
    relationshipViews.forEach((view) => {
      if (
        selectedClasses.indexOf(view.from.classView.value) !== -1 &&
        selectedClasses.indexOf(view.to.classView.value) !== -1
      ) {
        relationshipView_setPath(
          view,
          view.path.map(
            (point) =>
              new Point(point.x - newMovingDeltaX, point.y - newMovingDeltaY),
          ),
        );
      }
    });
  }

  // -------------------------------- Actions ------------------------------

  recenter(): void {
    if (this.selectedClasses.length !== 0) {
      const firstClass = getNullableFirstEntry(this.selectedClasses);
      if (firstClass) {
        this.center(
          firstClass.position.x + firstClass.rectangle.width / 2,
          firstClass.position.y + firstClass.rectangle.height / 2,
        );
      }
    } else {
      this.autoRecenter();
    }
  }

  switchToZoomMode(): void {
    this.changeMode(
      this.interactionMode !== DIAGRAM_INTERACTION_MODE.ZOOM_IN
        ? DIAGRAM_INTERACTION_MODE.ZOOM_IN
        : DIAGRAM_INTERACTION_MODE.ZOOM_OUT,
      DIAGRAM_RELATIONSHIP_EDIT_MODE.NONE,
    );
  }

  switchToViewMode(): void {
    this.changeMode(
      DIAGRAM_INTERACTION_MODE.LAYOUT,
      DIAGRAM_RELATIONSHIP_EDIT_MODE.NONE,
    );
  }

  switchToPanMode(): void {
    this.changeMode(
      DIAGRAM_INTERACTION_MODE.PAN,
      DIAGRAM_RELATIONSHIP_EDIT_MODE.NONE,
    );
  }

  switchToAddPropertyMode(): void {
    if (!this.isReadOnly) {
      this.changeMode(
        DIAGRAM_INTERACTION_MODE.ADD_RELATIONSHIP,
        DIAGRAM_RELATIONSHIP_EDIT_MODE.PROPERTY,
      );
    }
  }

  switchToAddInheritanceMode(): void {
    if (!this.isReadOnly) {
      this.changeMode(
        DIAGRAM_INTERACTION_MODE.ADD_RELATIONSHIP,
        DIAGRAM_RELATIONSHIP_EDIT_MODE.INHERITANCE,
      );
    }
  }

  switchToAddClassMode(): void {
    if (!this.isReadOnly) {
      this.changeMode(
        DIAGRAM_INTERACTION_MODE.ADD_CLASS,
        DIAGRAM_RELATIONSHIP_EDIT_MODE.NONE,
      );
    }
  }

  ejectProperty(): void {
    if (!this.isReadOnly) {
      if (this.mouseOverClassProperty) {
        if (
          this.mouseOverClassProperty.genericType.value.rawType instanceof Class
        ) {
          this.addClassView(
            this.mouseOverClassProperty.genericType.value.rawType,
            this.canvasCoordinateToModelCoordinate(
              this.eventCoordinateToCanvasCoordinate(
                new Point(this.cursorPosition.x, this.cursorPosition.y),
              ),
            ),
          );
        }
      } else if (this.selectedClassProperty) {
        if (
          this.selectedClassProperty.property.genericType.value
            .rawType instanceof Class
        ) {
          this.addClassView(
            this.selectedClassProperty.property.genericType.value.rawType,
            this.selectedClassProperty.selectionPoint,
          );
        }
        this.selectedClassProperty = undefined;
      }
    }
  }

  getSuperTypeLevels(
    classViews: ClassView[],
    diagram: Diagram,
    currentDepth: number,
    recurseMaxDepth: number,
  ): ClassView[][] {
    if (classViews.length) {
      const res = uniqBy(
        classViews.flatMap((classView) =>
          classView.class.value.generalizations.map(
            (generation) =>
              new ClassView(
                diagram,
                uuid(),
                PackageableElementExplicitReference.create(
                  getRawGenericType(generation.value, Class),
                ),
              ),
          ),
        ),
        (a: ClassView) => a.class.value,
      );
      res.forEach((classView) =>
        this.ensureClassViewMeetMinDimensions(classView),
      );
      if (recurseMaxDepth === -1 || currentDepth < recurseMaxDepth) {
        const rec = this.getSuperTypeLevels(
          res,
          diagram,
          currentDepth + 1,
          recurseMaxDepth,
        );
        rec.push(classViews);
        return rec;
      } else {
        return [classViews];
      }
    }
    return [];
  }

  layoutTaxonomy(
    classViewLevels: ClassView[][],
    diagram: Diagram,
    positionInitialClass: boolean,
    superType: boolean,
  ): [ClassView[], GeneralizationView[]] {
    // Offsets
    const spaceY = 30;
    const spaceX = 10;

    classViewLevels.reverse();

    const classViews = classViewLevels.flatMap((levels, currentLevelIndex) => {
      // Get the bounding box of the precedent level
      let precedentTotalWidth = 0;
      let precedentTotalHeight = 0;
      let precedentX = 0;
      let precedentY = 0;
      if (currentLevelIndex > 0) {
        const precedent = classViewLevels[currentLevelIndex - 1] as ClassView[];
        if (precedent.length) {
          const precedentByX = [...precedent].sort(
            (a, b) => a.position.x - b.position.x,
          );
          precedentX = (precedentByX[0] as ClassView).position.x;
          precedentTotalWidth =
            (precedentByX[precedentByX.length - 1] as ClassView).position.x +
            (precedentByX[precedentByX.length - 1] as ClassView).rectangle
              .width -
            (precedentByX[0] as ClassView).position.x;

          const precedentByY = [...precedent].sort(
            (a, b) => a.position.y - b.position.y,
          );
          precedentY = (precedentByY[0] as ClassView).position.y;
          precedentTotalHeight =
            (precedentByY[precedentByY.length - 1] as ClassView).position.y +
            (precedentByY[precedentByY.length - 1] as ClassView).rectangle
              .height -
            (precedentByY[0] as ClassView).position.y;
        }
      }

      // Get the bounding box of current Level
      const maxHeight = Math.max(
        ...levels.map((classView) => classView.rectangle.height),
      );

      const totalWidth = levels
        .map((classView) => classView.rectangle.width)
        .reduce((a, b) => a + b + spaceX);

      // Get the starting position
      const startX = precedentX + precedentTotalWidth / 2 - totalWidth / 2;
      const currentLevelY = superType
        ? precedentY - maxHeight - spaceY
        : precedentY + precedentTotalHeight + spaceY;

      // Set layout of current level
      if (positionInitialClass || currentLevelIndex > 0) {
        positionedRectangle_setPosition(
          levels[0] as ClassView,
          new Point(startX, currentLevelY),
        );
        levels.forEach((view, idx) => {
          if (idx > 0) {
            const precedent = levels[idx - 1] as ClassView;
            positionedRectangle_setPosition(
              view,
              new Point(
                precedent.position.x + precedent.rectangle.width + spaceX,
                currentLevelY,
              ),
            );
          }
        });
      }
      return levels;
    });

    const generalizationViews = (
      superType ? classViewLevels : classViewLevels.slice().reverse()
    )
      .slice(0, classViewLevels.length - 1)
      .flatMap((level, idx) =>
        level.flatMap((fromClassView) =>
          (classViewLevels[idx + 1] as ClassView[]).flatMap((toClassView) => {
            if (
              fromClassView.class.value.generalizations
                .map((g) => g.value.rawType)
                .includes(toClassView.class.value)
            ) {
              return new GeneralizationView(
                diagram,
                fromClassView,
                toClassView,
              );
            }
            return [];
          }),
        ),
      );
    return [classViews, generalizationViews];
  }

  // --------------------------------- Event handler --------------------------

  keydown(e: KeyboardEvent): void {
    // Remove selected view(s)
    if ('Delete' === e.code) {
      if (!this.isReadOnly) {
        this.selectedClasses.forEach((classView) => {
          diagram_deleteClassView(this.diagram, classView);
          diagram_setAssociationViews(
            this.diagram,

            this.diagram.associationViews.filter(
              (associationView) =>
                !(
                  associationView.from.classView.value === classView ||
                  associationView.to.classView.value === classView
                ),
            ),
          );
          diagram_setGeneralizationViews(
            this.diagram,

            this.diagram.generalizationViews.filter(
              (generalizationView) =>
                !(
                  generalizationView.from.classView.value === classView ||
                  generalizationView.to.classView.value === classView
                ),
            ),
          );
          diagram_setPropertyViews(
            this.diagram,

            this.diagram.propertyViews.filter(
              (propertyView) =>
                !(
                  propertyView.from.classView.value === classView ||
                  propertyView.to.classView.value === classView
                ),
            ),
          );
        });
        if (this.selectedPropertyOrAssociation instanceof AssociationView) {
          diagram_deleteAssociationView(
            this.diagram,

            this.selectedPropertyOrAssociation,
          );
        } else if (this.selectedPropertyOrAssociation instanceof PropertyView) {
          diagram_deletePropertyView(
            this.diagram,
            this.selectedPropertyOrAssociation,
          );
        }
        if (this.selectedInheritance) {
          if (
            this.diagram.generalizationViews.find(
              (generalizationView) =>
                generalizationView === this.selectedInheritance,
            )
          ) {
            diagram_deleteGeneralizationView(
              this.diagram,
              this.selectedInheritance,
            );
          }
        }
        this.setSelectedClasses([]);
        this.drawScreen();
      }
    }
    // Edit selected view
    // NOTE: since the current behavior when editing property is to immediately
    // focus on the property name input when the inline editor pops up
    // we need to call `preventDefault` to avoid typing `e` in the property name input
    else if ('KeyE' === e.code) {
      if (this.selectedClassProperty) {
        this.handleEditProperty(
          this.selectedClassProperty.property,
          this.selectedClassProperty.selectionPoint,
          undefined,
        );
        e.preventDefault();
      } else if (this.selectedPropertyOrAssociation) {
        // TODO: we might want to revise this to allow edit property holder view
        // on the side panel instead of showing the inline property editor
        this.handleEditProperty(
          this.selectedPropertyOrAssociation.property.value,
          this.selectedPoint ??
            (this.selectedPropertyOrAssociation.path.length
              ? (this.selectedPropertyOrAssociation.path[0] as Point)
              : this.selectedPropertyOrAssociation.from.classView.value.center()),
          this.selectedPropertyOrAssociation,
        );
        e.preventDefault();
      } else if (this.selectedClasses.length === 1) {
        this.handleEditClassView(this.selectedClasses[0] as ClassView);
      }
    }

    // Hide/show properties for selected element(s)
    else if (e.altKey && 'KeyP' === e.code) {
      if (!this.isReadOnly) {
        if (this.selectedClasses.length !== 0) {
          this.selectedClasses.forEach((classView) => {
            classView_setHideProperties(classView, !classView.hideProperties);
          });
          this.drawScreen();
        }
      }
    }
    // Hide/show stereotypes for selected element(s)
    else if (e.altKey && 'KeyS' === e.code) {
      if (!this.isReadOnly) {
        if (this.selectedClasses.length !== 0) {
          this.selectedClasses.forEach((classView) => {
            classView_setHideStereotypes(classView, !classView.hideStereotypes);
          });
          this.drawScreen();
        }
      }
    }
    // Hide/show tagged values for selected element(s)
    else if (e.altKey && 'KeyT' === e.code) {
      if (!this.isReadOnly) {
        if (this.selectedClasses.length !== 0) {
          this.selectedClasses.forEach((classView) => {
            classView_setHideTaggedValues(
              classView,
              !classView.hideTaggedValues,
            );
          });
          this.drawScreen();
        }
      }
    }

    // Add a new simple property to selected class
    else if (e.altKey && 'ArrowDown' === e.code) {
      if (!this.isReadOnly && this.selectedClasses.length === 1) {
        this.handleAddSimpleProperty(this.selectedClasses[0] as ClassView);
      }
    }

    // Add supertypes of selected classes to the diagram
    else if ('ArrowUp' === e.code) {
      const views = this.getSuperTypeLevels(
        this.selectedClasses,
        this.diagram,
        0,
        1,
      );
      const res = this.layoutTaxonomy(views, this.diagram, false, true);
      res[0].forEach((cv) => diagram_addClassView(this.diagram, cv));
      res[1].forEach((gv) => diagram_addGeneralizationView(this.diagram, gv));

      this.drawScreen();
    }

    // Add subtypes of selected classes to the diagram
    else if ('ArrowDown' === e.code) {
      const views = uniqBy(
        this.selectedClasses.flatMap((x) =>
          x.class.value._subclasses.flatMap(
            (c) =>
              new ClassView(
                this.diagram,
                uuid(),
                PackageableElementExplicitReference.create(c),
              ),
          ),
        ),
        (cv) => cv.class.value,
      );

      if (views.length > 0) {
        views.forEach((classView) =>
          this.ensureClassViewMeetMinDimensions(classView),
        );

        const res = this.layoutTaxonomy(
          [views, this.selectedClasses],
          this.diagram,
          false,
          false,
        );
        res[0].forEach((cv) => diagram_addClassView(this.diagram, cv));
        res[1].forEach((gv) => diagram_addGeneralizationView(this.diagram, gv));
      }

      this.drawScreen();
    }
  }

  mouseup(e: MouseEvent): void {
    const mouseEventCoordinate = this.resolveMouseEventCoordinate(e);

    switch (this.interactionMode) {
      case DIAGRAM_INTERACTION_MODE.ZOOM_IN: {
        // Rounding up the current zoom level to make sure floating point precision
        // does not come into play when comparing with recommended zoom levels:
        // e.g. in Javascript, 110 === 110.000000000000001
        const currentZoomLevel = Math.round(this.zoom * 100);
        let nextZoomLevel: number;
        // NOTE: below the smallest recommended zoom level, we will start decrement by 10
        // and increment by 100 beyond the largest recommended zoom level.
        if (currentZoomLevel <= (DIAGRAM_ZOOM_LEVELS[0] as number) - 10) {
          nextZoomLevel = Math.floor(currentZoomLevel / 10) * 10 + 10;
        } else if (
          currentZoomLevel >=
          (DIAGRAM_ZOOM_LEVELS[DIAGRAM_ZOOM_LEVELS.length - 1] as number)
        ) {
          nextZoomLevel = Math.floor(currentZoomLevel / 100) * 100 + 100;
        } else {
          nextZoomLevel = guaranteeNonNullable(
            DIAGRAM_ZOOM_LEVELS.find(
              (zoomLevel) => zoomLevel > currentZoomLevel,
            ),
          );
        }
        this.zoomPoint(
          nextZoomLevel / 100,
          this.canvasCoordinateToModelCoordinate(
            this.eventCoordinateToCanvasCoordinate(mouseEventCoordinate),
          ),
        );
        break;
      }
      case DIAGRAM_INTERACTION_MODE.ZOOM_OUT: {
        const currentZoomLevel = Math.round(this.zoom * 100);
        let nextZoomLevel: number;
        if (currentZoomLevel <= (DIAGRAM_ZOOM_LEVELS[0] as number)) {
          nextZoomLevel = Math.ceil(currentZoomLevel / 10) * 10 - 10;
        } else if (
          currentZoomLevel >=
          (DIAGRAM_ZOOM_LEVELS[DIAGRAM_ZOOM_LEVELS.length - 1] as number) + 100
        ) {
          nextZoomLevel = Math.ceil(currentZoomLevel / 100) * 100 - 100;
        } else {
          nextZoomLevel = guaranteeNonNullable(
            findLast(
              DIAGRAM_ZOOM_LEVELS,
              (zoomLevel) => zoomLevel < currentZoomLevel,
            ),
          );
        }
        this.zoomPoint(
          nextZoomLevel / 100,
          this.canvasCoordinateToModelCoordinate(
            this.eventCoordinateToCanvasCoordinate(mouseEventCoordinate),
          ),
        );
        break;
      }
      default:
        break;
    }

    if (!this.isReadOnly) {
      switch (this.interactionMode) {
        case DIAGRAM_INTERACTION_MODE.LAYOUT: {
          this.diagram.generalizationViews.forEach((generalizationView) =>
            relationshipView_simplifyPath(generalizationView),
          );
          this.diagram.associationViews.forEach((associationView) =>
            relationshipView_simplifyPath(associationView),
          );
          this.diagram.propertyViews.forEach((propertyView) =>
            relationshipView_simplifyPath(propertyView),
          );
          break;
        }
        case DIAGRAM_INTERACTION_MODE.ADD_CLASS: {
          const eventPointInModelCoordinate =
            this.canvasCoordinateToModelCoordinate(
              this.eventCoordinateToCanvasCoordinate(mouseEventCoordinate),
            );
          this.onAddClassViewClick(eventPointInModelCoordinate);
          this.changeMode(
            DIAGRAM_INTERACTION_MODE.LAYOUT,
            DIAGRAM_RELATIONSHIP_EDIT_MODE.NONE,
          );
          break;
        }
        case DIAGRAM_INTERACTION_MODE.ADD_RELATIONSHIP: {
          if (
            this.startClassView &&
            this.selectionStart &&
            this.handleAddRelationship
          ) {
            const eventPointInModelCoordinate =
              this.canvasCoordinateToModelCoordinate(
                this.eventCoordinateToCanvasCoordinate(mouseEventCoordinate),
              );
            for (let i = this.diagram.classViews.length - 1; i >= 0; i--) {
              const targetClassView = this.diagram.classViews[i] as ClassView;

              if (
                targetClassView.contains(
                  eventPointInModelCoordinate.x,
                  eventPointInModelCoordinate.y,
                )
              ) {
                const gview = this.handleAddRelationship(
                  this.startClassView,
                  targetClassView,
                );

                if (gview) {
                  relationshipEdgeView_setOffsetX(
                    gview.from,
                    -(
                      this.startClassView.position.x +
                      this.startClassView.rectangle.width / 2 -
                      this.selectionStart.x
                    ),
                  );
                  relationshipEdgeView_setOffsetY(
                    gview.from,
                    -(
                      this.startClassView.position.y +
                      this.startClassView.rectangle.height / 2 -
                      this.selectionStart.y
                    ),
                  );
                  relationshipEdgeView_setOffsetX(
                    gview.to,
                    -(
                      targetClassView.position.x +
                      targetClassView.rectangle.width / 2 -
                      eventPointInModelCoordinate.x
                    ),
                  );
                  relationshipEdgeView_setOffsetY(
                    gview.to,
                    -(
                      targetClassView.position.y +
                      targetClassView.rectangle.height / 2 -
                      eventPointInModelCoordinate.y
                    ),
                  );
                }
              }
            }
            this.changeMode(
              DIAGRAM_INTERACTION_MODE.LAYOUT,
              DIAGRAM_RELATIONSHIP_EDIT_MODE.NONE,
            );
          }
          break;
        }
        default:
          break;
      }
    }
    this.setLeftClick(false);
    this.setMiddleClick(false);
    this.setRightClick(false);

    this.setSelectedClassCorner(undefined);
    this.setSelectionStart(undefined);
    this.drawScreen();
  }

  mousedblclick(e: MouseEvent): void {
    const mouseEventCoordinate = this.resolveMouseEventCoordinate(e);

    if (
      [
        DIAGRAM_INTERACTION_MODE.ADD_RELATIONSHIP,
        DIAGRAM_INTERACTION_MODE.ADD_CLASS,
        DIAGRAM_INTERACTION_MODE.ZOOM_IN,
        DIAGRAM_INTERACTION_MODE.ZOOM_OUT,
      ].includes(this.interactionMode)
    ) {
      return;
    }

    const eventPointInModelCoordinate = this.canvasCoordinateToModelCoordinate(
      this.eventCoordinateToCanvasCoordinate(mouseEventCoordinate),
    );

    // Check double click on class property
    if (this.mouseOverClassProperty) {
      if (this.onClassPropertyDoubleClick) {
        this.onClassPropertyDoubleClick(
          this.mouseOverClassProperty,
          eventPointInModelCoordinate,
          undefined,
        );
        return;
      }
    }

    // Check double click on class name
    if (this.mouseOverClassName) {
      if (this.onClassNameDoubleClick) {
        this.onClassNameDoubleClick(
          this.mouseOverClassName,
          eventPointInModelCoordinate,
        );
        return;
      }
    }

    // Check double click on class view
    const selectedClass = this.diagram.classViews.find((classView) =>
      classView.contains(
        eventPointInModelCoordinate.x,
        eventPointInModelCoordinate.y,
      ),
    );
    if (selectedClass) {
      if (this.onClassViewDoubleClick) {
        this.onClassViewDoubleClick(selectedClass, eventPointInModelCoordinate);
        return;
      }
    }

    // Check double click on line property label
    if (this.mouseOverPropertyHolderViewLabel) {
      if (this.onClassPropertyDoubleClick) {
        this.onClassPropertyDoubleClick(
          this.mouseOverPropertyHolderViewLabel.property.value,
          eventPointInModelCoordinate,
          this.mouseOverPropertyHolderViewLabel,
        );
        return;
      }
    }

    // Check double click on background
    if (this.onBackgroundDoubleClick) {
      this.onBackgroundDoubleClick(eventPointInModelCoordinate);
    }
  }

  mousedown(e: MouseEvent): void {
    const mouseEventCoordinate = this.resolveMouseEventCoordinate(e);

    this.setSelectionStart(undefined);
    this.setSelectedClassCorner(undefined);
    this.setSelectedPropertyOrAssociation(undefined);
    this.setSelectedInheritance(undefined);
    this.selection = undefined;
    this.selectedClassProperty = undefined;
    this.selectedPoint = undefined;
    this.startClassView = undefined;

    const eventPointInCanvasCoordinate =
      this.eventCoordinateToCanvasCoordinate(mouseEventCoordinate);
    const eventPointInModelCoordinate = this.canvasCoordinateToModelCoordinate(
      eventPointInCanvasCoordinate,
    );

    // left click
    if (e.button === 0) {
      this.setLeftClick(true);

      switch (this.interactionMode) {
        case DIAGRAM_INTERACTION_MODE.PAN: {
          this.positionBeforeLastMove = mouseEventCoordinate;
          return;
        }
        case DIAGRAM_INTERACTION_MODE.LAYOUT: {
          // Check if the selection lies within the bottom right corner box of a box (so we can do resize of box here)
          // NOTE: Traverse backwards the class views to preserve z-index buffer
          for (let i = this.diagram.classViews.length - 1; i >= 0; i--) {
            const targetClassView = this.diagram.classViews[i] as ClassView;
            if (
              buildBottomRightCornerBox(targetClassView).contains(
                eventPointInModelCoordinate.x,
                eventPointInModelCoordinate.y,
              )
            ) {
              this.setSelectedClasses([]);
              this.setSelectedClassCorner(this.diagram.classViews[i]);
              if (!this.isReadOnly) {
                // Bring the class view to front
                diagram_setClassViews(
                  this.diagram,
                  this.reorderDiagramDomain(
                    guaranteeNonNullable(this.selectedClassCorner),
                    this.diagram,
                  ),
                );
              }
              break;
            }
          }

          if (!this.selectedClassCorner) {
            if (this.mouseOverClassProperty) {
              // Check for selection of property within a class view
              this.selectedClassProperty = {
                property: this.mouseOverClassProperty,
                selectionPoint: eventPointInModelCoordinate,
              };
              this.setSelectedClasses([]);
            } else {
              // Check for selection of class view(s)

              let anyClassesSelected = false;
              // Traverse backwards the class views to preserve z-index buffer
              for (let i = this.diagram.classViews.length - 1; i >= 0; i--) {
                const targetClassView = this.diagram.classViews[i] as ClassView;
                if (
                  targetClassView.contains(
                    eventPointInModelCoordinate.x,
                    eventPointInModelCoordinate.y,
                  )
                ) {
                  if (
                    this.selectedClasses.length === 0 ||
                    this.selectedClasses.indexOf(targetClassView) === -1
                  ) {
                    this.setSelectedClasses([targetClassView]);
                  }
                  if (!this.isReadOnly) {
                    // Bring the class view to front
                    diagram_setClassViews(
                      this.diagram,

                      this.reorderDiagramDomain(
                        this.selectedClasses[0] as ClassView,
                        this.diagram,
                      ),
                    );
                  }
                  this.clickX =
                    eventPointInCanvasCoordinate.x / this.zoom -
                    this.screenOffset.x;
                  this.clickY =
                    eventPointInCanvasCoordinate.y / this.zoom -
                    this.screenOffset.y;
                  // Set this here so we can keep moving the classviews
                  // NOTE: in the past we tried to reset this every time after we reset `this.selectedClasses`
                  // and that causes the selected classviews janks and jumps to a weird position during zoom.
                  this._selectedClassesInitialPositions =
                    this.selectedClasses.map((cv) => ({
                      classView: cv,
                      oldPos: new Point(cv.position.x, cv.position.y),
                    }));
                  anyClassesSelected = true;
                  break;
                }
              }
              if (!anyClassesSelected) {
                this.setSelectedClasses([]);
              }

              if (!this.selectedClasses.length) {
                // NOTE: we start checking for the selected point to decide
                // whether or not to set a selection (selected inheritance view, property view, etc.)
                // the order really matters here as each selection does set the selection point
                // which causes the next selection to not happen

                // check for selection of inheritance view
                for (const generalizationView of this.diagram
                  .generalizationViews) {
                  const val = findOrBuildPoint(
                    generalizationView,
                    eventPointInModelCoordinate.x,
                    eventPointInModelCoordinate.y,
                    this.zoom,
                    !this.isReadOnly,
                  );
                  if (val) {
                    this.selectedPoint = val;
                    this.setSelectedInheritance(generalizationView);
                    break;
                  }
                }

                // check for selection of association view
                if (!this.selectedPoint) {
                  for (const associationView of this.diagram.associationViews) {
                    const val = findOrBuildPoint(
                      associationView,
                      eventPointInModelCoordinate.x,
                      eventPointInModelCoordinate.y,
                      this.zoom,
                      !this.isReadOnly,
                    );
                    if (val) {
                      this.selectedPoint = val;
                      this.setSelectedPropertyOrAssociation(associationView);
                      break;
                    }
                  }
                }

                // check for selection of property view
                if (!this.selectedPoint) {
                  for (const propertyView of this.diagram.propertyViews) {
                    const val = findOrBuildPoint(
                      propertyView,
                      eventPointInModelCoordinate.x,
                      eventPointInModelCoordinate.y,
                      this.zoom,
                      !this.isReadOnly,
                    );
                    if (val) {
                      this.selectedPoint = val;
                      this.setSelectedPropertyOrAssociation(propertyView);
                      break;
                    }
                  }
                }

                // if the selected point is not identified then it is consider the start of a selection
                if (!this.selectedPoint) {
                  this.setSelectionStart(eventPointInModelCoordinate);
                }
              }
            }
          }
          break;
        }
        case DIAGRAM_INTERACTION_MODE.ADD_RELATIONSHIP: {
          this.setSelectionStart(eventPointInModelCoordinate);
          this.startClassView = undefined;
          for (let i = this.diagram.classViews.length - 1; i >= 0; i--) {
            const targetClassView = this.diagram.classViews[i] as ClassView;
            if (
              targetClassView.contains(
                eventPointInModelCoordinate.x,
                eventPointInModelCoordinate.y,
              )
            ) {
              this.startClassView = targetClassView;
            }
          }
          if (!this.startClassView) {
            this.changeMode(
              DIAGRAM_INTERACTION_MODE.LAYOUT,
              DIAGRAM_RELATIONSHIP_EDIT_MODE.NONE,
            );
          }
          break;
        }
        default:
          break;
      }
    }
    // middle click
    else if (e.button === 1) {
      this.setMiddleClick(true);
      this.positionBeforeLastMove = mouseEventCoordinate;
      return;
    }
    // right click
    else if (e.button === 2) {
      this.setRightClick(true);
      this.positionBeforeLastMove = mouseEventCoordinate;
      if (this.mouseOverClassView) {
        this.onClassViewRightClick(
          this.mouseOverClassView,
          eventPointInModelCoordinate,
        );
        this.setRightClick(false);
      }
      return;
    }
    this.clearScreen();
    this.drawAll();
  }

  mousewheel(e: WheelEvent): void {
    const mouseEventCoordinate = this.resolveMouseEventCoordinate(e);

    // no scrolling to be done since we want to convert scroll into zoom
    e.preventDefault();
    e.stopImmediatePropagation();
    // if scrolling is more horizontal than vertical, i.e. zoom using trackpad
    // we don't want to treat this as zooming
    if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) {
      return;
    }
    // scroll down to zoom in and up to zoom out
    const newZoomLevel = this.zoom - (e.deltaY / 120) * 0.05;
    this.executeZoom(
      newZoomLevel,
      this.canvasCoordinateToModelCoordinate(
        this.eventCoordinateToCanvasCoordinate(mouseEventCoordinate),
      ),
    );
  }

  mousemove(e: MouseEvent): void {
    const mouseEventCoordinate = this.resolveMouseEventCoordinate(e);
    this.cursorPosition = mouseEventCoordinate;

    // Pan/Move
    if (
      this.rightClick ||
      this.middleClick ||
      (this.leftClick && this.interactionMode === DIAGRAM_INTERACTION_MODE.PAN)
    ) {
      this.screenOffset = new Point(
        this.screenOffset.x +
          (mouseEventCoordinate.x - this.positionBeforeLastMove.x) / this.zoom,
        this.screenOffset.y +
          (mouseEventCoordinate.y - this.positionBeforeLastMove.y) / this.zoom,
      );
      this.positionBeforeLastMove = mouseEventCoordinate;
      this.clearScreen();
      this.drawAll();
    } else if (this.leftClick) {
      const eventPointInCanvasCoordinate =
        this.eventCoordinateToCanvasCoordinate(mouseEventCoordinate);
      const eventPointInModelCoordinate =
        this.canvasCoordinateToModelCoordinate(eventPointInCanvasCoordinate);

      switch (this.interactionMode) {
        case DIAGRAM_INTERACTION_MODE.LAYOUT: {
          // Resize class view
          if (this.selectedClassCorner) {
            // Make sure width and height are in range!
            positionedRectangle_setRectangle(
              this.selectedClassCorner,
              new Rectangle(
                eventPointInModelCoordinate.x -
                  this.selectedClassCorner.position.x,
                eventPointInModelCoordinate.y -
                  this.selectedClassCorner.position.y,
              ),
            );
            // Refresh hash since ClassView rectangle is not observable
            positionedRectangle_forceRefreshHash(this.selectedClassCorner);
            this.drawClassView(this.selectedClassCorner);
            this.drawScreen();
          }

          // Move class view
          if (!this.selectionStart && this.selectedClasses.length) {
            if (!this.isReadOnly) {
              let newMovingDeltaX = 0;
              let newMovingDeltaY = 0;
              this.selectedClasses.forEach((selectedClass, idx) => {
                const selectedClassOldPosition =
                  this._selectedClassesInitialPositions.length > idx
                    ? this._selectedClassesInitialPositions[idx]
                    : undefined;

                if (selectedClassOldPosition) {
                  const newMovingX =
                    eventPointInCanvasCoordinate.x / this.zoom -
                    this.screenOffset.x -
                    (this.clickX - selectedClassOldPosition.oldPos.x);
                  const newMovingY =
                    eventPointInCanvasCoordinate.y / this.zoom -
                    this.screenOffset.y -
                    (this.clickY - selectedClassOldPosition.oldPos.y);
                  newMovingDeltaX = selectedClass.position.x - newMovingX;
                  newMovingDeltaY = selectedClass.position.y - newMovingY;
                  positionedRectangle_setPosition(
                    selectedClass,
                    new Point(newMovingX, newMovingY),
                  );
                  // Refresh hash since ClassView position is not observable
                  positionedRectangle_forceRefreshHash(selectedClass);
                }
              });
              this.potentiallyShiftRelationships(
                this.diagram.associationViews,
                this.selectedClasses,
                newMovingDeltaX,
                newMovingDeltaY,
              );
              this.potentiallyShiftRelationships(
                this.diagram.propertyViews,
                this.selectedClasses,
                newMovingDeltaX,
                newMovingDeltaY,
              );
              this.potentiallyShiftRelationships(
                this.diagram.generalizationViews,
                this.selectedClasses,
                newMovingDeltaX,
                newMovingDeltaY,
              );
              this.drawScreen();
            }
          }

          // Change line (add a new point to the line)
          if (this.selectedPoint) {
            if (this.selectedPropertyOrAssociation) {
              relationshipView_changePoint(
                this.selectedPropertyOrAssociation,
                this.selectedPoint,
                eventPointInModelCoordinate,
              );
            } else if (this.selectedInheritance) {
              relationshipView_changePoint(
                this.selectedInheritance,
                this.selectedPoint,
                eventPointInModelCoordinate,
              );
            }
            this.selectedPoint = eventPointInModelCoordinate;
            this.drawScreen();
          }

          // Draw selection box
          if (this.selectionStart) {
            this.clearScreen();
            this.drawAll();
            const selectionStartPointInCanvasCoordinate =
              this.modelCoordinateToCanvasCoordinate(this.selectionStart);
            this.ctx.fillStyle = this.selectionBoxBorderColor;
            this.ctx.fillRect(
              selectionStartPointInCanvasCoordinate.x,
              selectionStartPointInCanvasCoordinate.y,
              eventPointInCanvasCoordinate.x -
                selectionStartPointInCanvasCoordinate.x,
              eventPointInCanvasCoordinate.y -
                selectionStartPointInCanvasCoordinate.y,
            );
            this.ctx.strokeRect(
              selectionStartPointInCanvasCoordinate.x,
              selectionStartPointInCanvasCoordinate.y,
              eventPointInCanvasCoordinate.x -
                selectionStartPointInCanvasCoordinate.x,
              eventPointInCanvasCoordinate.y -
                selectionStartPointInCanvasCoordinate.y,
            );
            const selectionBoxWidth =
              (eventPointInCanvasCoordinate.x -
                selectionStartPointInCanvasCoordinate.x) /
              this.zoom;
            const selectionBoxHeight =
              (eventPointInCanvasCoordinate.y -
                selectionStartPointInCanvasCoordinate.y) /
              this.zoom;
            this.selection = new PositionedRectangle(
              new Point(
                selectionBoxWidth > 0
                  ? this.selectionStart.x
                  : this.selectionStart.x + selectionBoxWidth,
                selectionBoxHeight > 0
                  ? this.selectionStart.y
                  : this.selectionStart.y + selectionBoxHeight,
              ),
              new Rectangle(
                Math.abs(selectionBoxWidth),
                Math.abs(selectionBoxHeight),
              ),
            );
            this.setSelectedClasses([]);
            for (const classView of this.diagram.classViews) {
              if (
                boxContains(this.selection, classView) ||
                boxContains(classView, this.selection)
              ) {
                this.setSelectedClasses([...this.selectedClasses, classView]);
              }
            }
          }
          break;
        }
        case DIAGRAM_INTERACTION_MODE.ADD_RELATIONSHIP: {
          if (this.selectionStart && this.startClassView) {
            this.clearScreen();
            this.drawBoundingBox();
            const selectionStartPointInCanvasCoordinate =
              this.modelCoordinateToCanvasCoordinate(this.selectionStart);

            // Draw Line ------
            this.ctx.moveTo(
              selectionStartPointInCanvasCoordinate.x,
              selectionStartPointInCanvasCoordinate.y,
            );
            this.ctx.lineTo(
              eventPointInCanvasCoordinate.x,
              eventPointInCanvasCoordinate.y,
            );
            this.ctx.stroke();
            // Draw Line ------

            this.drawDiagram();
          }
          break;
        }
        default:
          break;
      }
    } else {
      this.drawScreen();

      const eventPointInCanvasCoordinate =
        this.eventCoordinateToCanvasCoordinate(mouseEventCoordinate);
      const eventPointInModelCoordinate =
        this.canvasCoordinateToModelCoordinate(eventPointInCanvasCoordinate);

      // Check for hovering state
      this.setMouseOverClassView(undefined);
      this.setMouseOverClassName(undefined);
      this.setMouseOverClassCorner(undefined);
      this.setMouseOverClassProperty(undefined);
      this.setMouseOverPropertyHolderViewLabel(undefined);

      for (const classView of this.diagram.classViews.slice().reverse()) {
        if (
          classView.contains(
            eventPointInModelCoordinate.x,
            eventPointInModelCoordinate.y,
          )
        ) {
          this.setMouseOverClassView(classView);

          // Check hover class corner
          if (
            buildBottomRightCornerBox(classView).contains(
              eventPointInModelCoordinate.x,
              eventPointInModelCoordinate.y,
            )
          ) {
            this.setMouseOverClassCorner(classView);
          }

          // TODO: we probably should make this a shared function so we don't need to maintain
          // this computation in both places: here and when we draw class view properties
          const _class = classView.class.value;
          let cursorY = classView.position.y + this.classViewSpaceY;

          // account for height of stereotypes
          cursorY =
            cursorY +
            (classView.hideStereotypes
              ? 0
              : _class.stereotypes.length * this.lineHeight);

          // Check hover class name
          const classNameWidth = this.computeClassNameWidth(classView);
          if (
            new PositionedRectangle(
              this.modelCoordinateToCanvasCoordinate(
                new Point(
                  classView.position.x +
                    (classView.rectangle.width - classNameWidth) / 2,
                  cursorY,
                ),
              ),
              new Rectangle(
                classNameWidth,
                this.lineHeight, // class name takes 1 line
              ),
            ).contains(
              eventPointInCanvasCoordinate.x,
              eventPointInCanvasCoordinate.y,
            )
          ) {
            this.setMouseOverClassName(classView);
          }

          // account for height of class name
          cursorY += this.lineHeight;

          // account for height of tagged values
          cursorY =
            cursorY +
            (classView.hideTaggedValues
              ? 0
              : _class.taggedValues.length * this.lineHeight);

          // 2 spaces: 1 space (below for class name) and 1 space (above) for properties block
          cursorY += this.classViewSpaceY * 2;

          // Check hover class property
          for (const property of getAllOwnClassProperties(_class)) {
            if (!this.hasPropertyView(classView, property)) {
              this.ctx.font = `${(this.fontSize - 1) * this.zoom}px ${
                this.fontFamily
              }`;
              if (
                new PositionedRectangle(
                  this.modelCoordinateToCanvasCoordinate(
                    new Point(
                      classView.position.x + this.classViewSpaceX,
                      cursorY,
                    ),
                  ),
                  new Rectangle(
                    this.drawClassViewProperty(
                      classView,
                      property,
                      // these dimensions mean nothing since we only measure here
                      0,
                      0,
                      true,
                    ) * this.zoom,
                    this.lineHeight * this.zoom, // property takes 1 line
                  ),
                ).contains(
                  eventPointInCanvasCoordinate.x,
                  eventPointInCanvasCoordinate.y,
                )
              ) {
                this.setMouseOverClassProperty(property);
              }
              cursorY = cursorY + this.lineHeight;
            }
          }
          break;
        }
      }

      const propertyHolderViews: PropertyHolderView[] = [
        ...this.diagram.propertyViews,
        ...this.diagram.associationViews,
      ];
      for (const propertyHolderView of propertyHolderViews) {
        const fullPath = RelationshipView.pruneUnnecessaryInsidePoints(
          propertyHolderView.buildFullPath(),
          propertyHolderView.from.classView.value,
          propertyHolderView.to.classView.value,
        );
        const propertyInfoBox = this.drawLinePropertyText(
          // NOTE: by the way we compute the full path, it would guarantee
          // to always have at least 2 points
          guaranteeNonNullable(
            fullPath[fullPath.length - 2],
            'Diagram path expected to have at least 2 points',
          ),
          guaranteeNonNullable(
            fullPath[fullPath.length - 1],
            'Diagram path expected to have at least 2 points',
          ),
          propertyHolderView.to.classView.value,
          propertyHolderView.property.value,
          false,
        );
        if (
          propertyInfoBox.contains(
            eventPointInModelCoordinate.x,
            eventPointInModelCoordinate.y,
          )
        ) {
          this.setMouseOverPropertyHolderViewLabel(propertyHolderView);
          break;
        }
      }
    }
  }
}
