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
  getNullableFirstElement,
} from '@finos/legend-studio-shared';
import { PositionedRectangle } from '../../../models/metamodels/pure/model/packageableElements/diagram/geometry/PositionedRectangle';
import { Point } from '../../../models/metamodels/pure/model/packageableElements/diagram/geometry/Point';
import { Rectangle } from '../../../models/metamodels/pure/model/packageableElements/diagram/geometry/Rectangle';
import { ClassView } from '../../../models/metamodels/pure/model/packageableElements/diagram/ClassView';
import type { Diagram } from '../../../models/metamodels/pure/model/packageableElements/diagram/Diagram';
import { GeneralizationView } from '../../../models/metamodels/pure/model/packageableElements/diagram/GeneralizationView';
import type { RelationshipView } from '../../../models/metamodels/pure/model/packageableElements/diagram/RelationshipView';
import {
  manageInsidePointsDynamically,
  getElementPosition,
} from '../../../models/metamodels/pure/model/packageableElements/diagram/RelationshipView';
import { PropertyView } from '../../../models/metamodels/pure/model/packageableElements/diagram/PropertyView';
import type { PropertyHolderView } from '../../../models/metamodels/pure/model/packageableElements/diagram/PropertyHolderView';
import { AssociationView } from '../../../models/metamodels/pure/model/packageableElements/diagram/AssociationView';
import { Class } from '../../../models/metamodels/pure/model/packageableElements/domain/Class';
import { Enumeration } from '../../../models/metamodels/pure/model/packageableElements/domain/Enumeration';
import { PrimitiveType } from '../../../models/metamodels/pure/model/packageableElements/domain/PrimitiveType';
import type { AbstractProperty } from '../../../models/metamodels/pure/model/packageableElements/domain/AbstractProperty';
import { DerivedProperty } from '../../../models/metamodels/pure/model/packageableElements/domain/DerivedProperty';
import { PackageableElementExplicitReference } from '../../../models/metamodels/pure/model/packageableElements/PackageableElementReference';
import { PropertyExplicitReference } from '../../../models/metamodels/pure/model/packageableElements/domain/PropertyReference';

export class DiagramRenderer {
  diagram: Diagram;
  isReadOnly: boolean;

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
   * This is the offset of the virtual screen with respect to the canvas. To understand this better, please read on.
   * (to make it clear, we have 2 types of coordinate: `stored` (in the JSON protocol) and `rendering`)
   * There are 2 important facts about all the stored coordinates in the protocol (e.g. position of classview, line points):
   * 1. Zoom is not taken into account (rendering coordinates change as we zoom)
   * 2. They are with respect to the canvas, not the screen (because the screen is virtual - see above)
   * As such, when we debug, let's say we have a position (x,y), if we want to find that coordinate in the coordiante system of the canvas, we have to
   * add the offset, so the coordinate of (x, y) is (x + screenOffset.x, y + screenOffset.y) when we refer to the canvas coordinate system
   * So if we turn on debug mode and try to move the top left corner of the screen to the `offset crosshair` the screen coordinate system should align
   * with the canvas coordinate system. Of course due to centering and moving the screen around there is still an offset between the 2 coordinate system,
   * but we know for a fact that the top left of the screen will have stored coordinate (0,0)
   */
  screenOffset: Point;
  zoom: number;

  // UML specific shapes
  triangle: Point[];
  diamond: Point[];

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
  selectionStart?: Point;
  selectedClassCorner?: ClassView; // the class view which we currently select the bottom right corner
  selection?: PositionedRectangle;
  selectedClasses: ClassView[];
  selectedClassesOldPos: { classView: ClassView; oldPos: Point }[];
  selectedPropertyOrAssociation?: PropertyHolderView;
  selectedInheritance?: GeneralizationView;
  selectedPoint?: Point;

  mouseOverProperty?: AbstractProperty;
  mouseOverClassView?: ClassView;
  cursorPosition: Point;

  leftClick: boolean;
  rightClick: boolean;
  clickX: number;
  clickY: number;
  positionBeforeLastMove: Point;

  // functions to interact with diagram editor
  onClassViewClick: (classView: ClassView) => void = noop();
  onBackgroundDoubleClick: (event: MouseEvent) => void = noop();
  onAddClassPropertyForSelectedClass: (classView: ClassView) => void = noop();

  constructor(div: HTMLDivElement, diagram: Diagram) {
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
    this.isReadOnly = false;
    this.screenPadding = 20;
    this.classViewSpaceX = 10;
    this.classViewSpaceY = 4;
    this.propertySpacing = 10;

    // Event handlers
    this.selectionStart = undefined;
    this.selection = undefined;
    this.selectedClasses = [];
    this.selectedClassesOldPos = [];
    this.cursorPosition = new Point(0, 0);
    this.leftClick = false;
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

  start(): void {
    this.diagram.classViews.forEach((classView) =>
      this.computeClassViewMinDimensions(classView),
    );
    this.refresh();
  }

  refresh(): void {
    this.refreshCanvas();
    this.redraw();
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

  redraw(): void {
    this.manageVirtualScreen();
    this.clearScreen();
    this.drawAll();
  }

  autoRecenter(): void {
    this.recenter(
      this.virtualScreen.position.x + this.virtualScreen.rectangle.width / 2,
      this.virtualScreen.position.y + this.virtualScreen.rectangle.height / 2,
    );
  }

  /**
   * Reset the screen offset
   */
  recenter(x: number, y: number): void {
    this.screenOffset = new Point(
      -x + this.canvasCenter.x,
      -y + this.canvasCenter.y,
    );
    this.refresh();
  }

  truncateTextWithEllipsis(val: string, limit = this.maxLineLength): string {
    const ellipsis = '...';
    return val.length > limit
      ? `${val.substring(0, limit + 1 - ellipsis.length)}${ellipsis}`
      : val;
  }

  /**
   * Convert from canvas coordinate to model coordinate
   */
  toModelCoordinate(point: Point): Point {
    return new Point(
      (point.x - this.canvasCenter.x) / this.zoom -
        this.screenOffset.x +
        this.canvasCenter.x,
      (point.y - this.canvasCenter.y) / this.zoom -
        this.screenOffset.y +
        this.canvasCenter.y,
    );
  }

  /**
   * Convert from model coordinate to canvas coordinate
   */
  toCanvasCoordinate(point: Point): Point {
    return new Point(
      (point.x - this.canvasCenter.x + this.screenOffset.x) * this.zoom +
        this.canvasCenter.x,
      (point.y - this.canvasCenter.y + this.screenOffset.y) * this.zoom +
        this.canvasCenter.y,
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

  manageVirtualScreen(): void {
    if (this.diagram.classViews.length) {
      let minX = this.diagram.classViews[0].position.x;
      let minY = this.diagram.classViews[0].position.y;
      let maxX =
        this.diagram.classViews[0].position.x +
        this.diagram.classViews[0].rectangle.width;
      let maxY =
        this.diagram.classViews[0].position.y +
        this.diagram.classViews[0].rectangle.height;
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
        let fullPath = relationshipView.buildFullPath();
        fullPath = manageInsidePointsDynamically(
          fullPath,
          relationshipView.from.classView.value,
          relationshipView.to.classView.value,
        );
        if (relationshipView instanceof PropertyView) {
          const box = this.drawLineText(
            fullPath[fullPath.length - 2],
            fullPath[fullPath.length - 1],
            relationshipView.to.classView.value,
            relationshipView.property.value,
          );
          minX = Math.min(minX, box.position.x);
          minY = Math.min(minY, box.position.y);
          maxX = Math.max(maxX, box.edgePoint().x);
          maxY = Math.max(maxY, box.edgePoint().y);
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
      this.zoom = 1;
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
   * Add a classview to current diagram and draw it.
   * This function is intended to be used with drag and drop, hence the position paramter, which must be relative to the screen/window
   */
  addClassView(
    addedClass: Class,
    absolutePosition?: Point,
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
      newClassView.setPosition(
        this.toModelCoordinate(
          new Point(
            absolutePosition ? absolutePosition.x - this.divPosition.x : 0,
            absolutePosition ? absolutePosition.y - this.divPosition.y : 0,
          ),
        ),
      );
      this.diagram.addClassView(newClassView);
      // Refresh hash since ClassView position is not observable
      // NOTE: here we refresh after adding the class view to the diagram, that way the diagram hash is refreshed
      newClassView.forceRefreshHash();
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
            this.diagram.addGeneralizationView(
              new GeneralizationView(this.diagram, newClassView, classView),
            );
          }
          if (
            _class.generalizations
              .map((generalization) => generalization.value.rawType)
              .includes(addedClass)
          ) {
            this.diagram.addGeneralizationView(
              new GeneralizationView(this.diagram, classView, newClassView),
            );
          }
          // Add property view
          addedClass.getAllOwnedProperties().forEach((property) => {
            if (property.genericType.value.rawType === _class) {
              this.diagram.addPropertyView(
                new PropertyView(
                  this.diagram,
                  PropertyExplicitReference.create(property),
                  newClassView,
                  classView,
                ),
              );
            }
          });
          _class.getAllOwnedProperties().forEach((property) => {
            if (property.genericType.value.rawType === addedClass) {
              this.diagram.addPropertyView(
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
      this.redraw();
      return newClassView;
    }
    return undefined;
  }

  drawAll(): void {
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

  drawScreenGrid(): void {
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

  drawCanvasGrid(): void {
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

  drawProperty(
    classView: ClassView,
    property: AbstractProperty,
    measureOnly: boolean,
    propX: number,
    propY: number,
  ): number {
    this.ctx.font =
      this.mouseOverClassView === classView &&
      this.mouseOverProperty === property
        ? `bold ${(this.fontSize - 1) * (measureOnly ? 1 : this.zoom)}px ${
            this.fontFamily
          }`
        : `${measureOnly ? 'bold' : ''} ${
            (this.fontSize - 1) * (measureOnly ? 1 : this.zoom)
          }px ${this.fontFamily}`;
    const propertyName = this.propertyName(property);
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
    if (!measureOnly) {
      this.ctx.fillText(
        `[${property.multiplicity.str}]`,
        propX + txtMeasure,
        propY,
      );
    }
    txtMeasure += this.ctx.measureText(`[${property.multiplicity.str}]`).width;
    return txtMeasure;
  }

  computeClassViewMinDimensions(classView: ClassView): number {
    this.ctx.font = `bold ${this.fontSize}px ${this.fontFamily}`;
    this.ctx.textBaseline = 'top'; // Compute min dimensions

    // Calculate the box for the class name header
    const classNameText = this.truncateTextWithEllipsis(
      classView.class.value.name,
    );
    const classNameWidth = this.ctx.measureText(classNameText).width;
    let classMinWidth = classNameWidth;
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

    // Calculate box for Properties
    if (!classView.hideProperties) {
      classView.class.value.getAllOwnedProperties().forEach((property) => {
        if (!this.hasPropertyView(classView, property)) {
          const txtMeasure = this.drawProperty(
            classView,
            property,
            true,
            -1,
            -1,
          );
          classMinWidth = Math.max(classMinWidth, txtMeasure);
          classMinHeight = classMinHeight + this.lineHeight;
        }
      });
      classMinHeight = classMinHeight + this.classViewSpaceY * 2;
    }

    classMinWidth = classMinWidth + this.classViewSpaceX * 2;
    // Modify the dimension according to the newly computed height and width
    if (!this.isReadOnly) {
      const width =
        classView.rectangle.width && classView.rectangle.width > classMinWidth
          ? classView.rectangle.width
          : classMinWidth;
      const height =
        classView.rectangle.height &&
        classView.rectangle.height > classMinHeight
          ? classView.rectangle.height
          : classMinHeight;
      classView.setRectangle(new Rectangle(width, height));
    }
    return classNameWidth;
  }

  drawClassView(classView: ClassView): void {
    const classMinWidth = this.computeClassViewMinDimensions(classView);
    this.ctx.fillStyle = this.classViewFillColor;

    // Draw the Box
    const position = this.toCanvasCoordinate(classView.position);
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

      for (const property of classView.class.value.getAllOwnedProperties()) {
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
          this.drawProperty(classView, property, false, propX, propY);
          cursorY = cursorY + this.lineHeight;
        }
      }
    }
    // NOTE: force hash reload when we redraw class view; this would help with cases where
    // we auto add new properties to the class view, causing the box to expand, hence we need
    // to recompute hash
    classView.forceRefreshHash();
  }

  propertyName(prop: AbstractProperty): string {
    return (prop instanceof DerivedProperty ? '/ ' : '') + prop.name;
  }

  drawLinePropertyAndMultiplicityText(
    property: AbstractProperty,
    textPositionX: (n: number) => number,
    textPositionY: (n: number) => number,
    multiplicityPositionX: (n: number) => number,
    multiplicityPositionY: (n: number) => number,
  ): PositionedRectangle {
    this.ctx.font = `${this.fontSize}px ${this.fontFamily}`;
    const propertyName = this.propertyName(property);
    const textSize = this.ctx.measureText(propertyName).width;
    const mulSize = this.ctx.measureText(property.multiplicity.str).width;
    this.ctx.font = `${this.fontSize * this.zoom}px ${this.fontFamily}`;
    const posX = textPositionX(textSize);
    const posY = textPositionY(textSize);
    const propertyPosition = this.toCanvasCoordinate(
      new Point(textPositionX(textSize), textPositionY(textSize)),
    );
    this.ctx.fillText(propertyName, propertyPosition.x, propertyPosition.y);
    const mulPosX = multiplicityPositionX(mulSize);
    const mulPosY = multiplicityPositionY(mulSize);
    const multiplicityPosition = this.toCanvasCoordinate(
      new Point(multiplicityPositionX(mulSize), multiplicityPositionY(mulSize)),
    );
    this.ctx.fillText(
      property.multiplicity.str,
      multiplicityPosition.x,
      multiplicityPosition.y,
    );
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

  drawLineText(
    from: Point,
    to: Point,
    viewSide: ClassView,
    property: AbstractProperty,
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
        return this.drawLinePropertyAndMultiplicityText(
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
        );
      }
    } else {
      const x =
        startX +
        ((endX - startX) / (endY - startY)) *
          (viewSide.position.y + rect.height - startY);
      if (x > viewSide.position.x && x < viewSide.position.x + rect.width) {
        return this.drawLinePropertyAndMultiplicityText(
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
        );
      }
    }
    if (startX < endX) {
      const y =
        startY +
        ((endY - startY) / (endX - startX)) * (viewSide.position.x - startX);
      if (y > viewSide.position.y && y < viewSide.position.y + rect.height) {
        return this.drawLinePropertyAndMultiplicityText(
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
        return this.drawLinePropertyAndMultiplicityText(
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
        );
      }
    }
    return new PositionedRectangle(new Point(0, 0), new Rectangle(0, 0));
  }

  drawPropertyOrAssociation(propertyView: PropertyView): void {
    let fullPath = propertyView.buildFullPath();
    fullPath = manageInsidePointsDynamically(
      fullPath,
      propertyView.from.classView.value,
      propertyView.to.classView.value,
    );
    // const toProperty = asso instanceof.property ? asso.property : asso.association.properties[1];
    const toProperty = propertyView.property.value;
    this.drawLineText(
      fullPath[fullPath.length - 2],
      fullPath[fullPath.length - 1],
      propertyView.to.classView.value,
      toProperty,
    );
    // if (asso.association) {
    //   this.displayText(fullPath[1], fullPath[0], asso.from.classView, asso.association.properties[0], this.ctx);
    // }
    this.ctx.beginPath();
    this.ctx.lineWidth =
      propertyView === this.selectedPropertyOrAssociation ? 2 : 1;
    fullPath.forEach((point, idx) => {
      const position = this.toCanvasCoordinate(point);
      if (idx === 0) {
        this.ctx.moveTo(position.x, position.y);
      } else {
        this.ctx.lineTo(position.x, position.y);
      }
    });
    this.ctx.stroke();
    this.ctx.lineWidth = 1;
    // const diamondType = 'none';
    // const startX = fullPath[1].x;
    // const startY = fullPath[1].y;
    // const endX = fullPath[0].x;
    // const endY = fullPath[0].y;
    // const to = propertyView.from;
    // let resultX = 0;
    // let resultY = 0;
    // if (endY > startY) {
    //   const x = startX + (endX - startX) / (endY - startY) * (to.classView.position.y - startY);
    //   if (x > to.classView.position.x && x < to.classView.position.x + to.classView.rectangle.width) {
    //     resultX = (x - this.canvasCenter.x) * this.zoom + this.canvasCenter.x;
    //     resultY = (to.classView.position.y - this.canvasCenter.y) * this.zoom + this.canvasCenter.y;
    //   }
    // } else {
    //   const x = startX + (endX - startX) / (endY - startY) * (to.classView.position.y + to.classView.rectangle.height - startY);
    //   if (x > to.classView.position.x && x < to.classView.position.x + to.classView.rectangle.width) {
    //     resultX = (x - this.canvasCenter.x) * this.zoom + this.canvasCenter.x;
    //     resultY = (to.classView.position.y + to.classView.rectangle.height - this.canvasCenter.y) * this.zoom + this.canvasCenter.y;
    //   }
    // }
    // if (endX > startX) {
    //   const y = startY + (endY - startY) / (endX - startX) * (to.classView.position.x - startX);
    //   if (y > to.classView.position.y && y < to.classView.position.y + to.classView.rectangle.height) {
    //     resultX = (to.classView.position.x - this.canvasCenter.x) * this.zoom + this.canvasCenter.x;
    //     resultY = (y - this.canvasCenter.y) * this.zoom + this.canvasCenter.y;
    //   }
    // } else {
    //   const y = startY + (endY - startY) / (endX - startX) * (to.classView.position.x + to.classView.rectangle.width - startX);
    //   if (y > to.classView.position.y && y < to.classView.position.y + to.classView.rectangle.height) {
    //     resultX = (to.classView.position.x + to.classView.rectangle.width - this.canvasCenter.x) * this.zoom + this.canvasCenter.x;
    //     resultY = (y - this.canvasCenter.y) * this.zoom + this.canvasCenter.y;
    //   }
    // }
    // if (diamondType !== 'none') {
    //   // Draw Diamond
    //   let angle = Math.atan((endY - startY) / (endX - startX));
    //   angle = endX >= startX ? angle : angle + Math.PI;
    //   this.ctx.beginPath();
    //   this.ctx.moveTo(resultX + (this.screenOffset.x + this.diamond[0].rotateX(angle)) * this.zoom, resultY + (this.screenOffset.y + this.diamond[0].rotateY(angle)) * this.zoom);
    //   this.ctx.lineTo(resultX + (this.screenOffset.x + this.diamond[1].rotateX(angle)) * this.zoom, resultY + (this.screenOffset.y + this.diamond[1].rotateY(angle)) * this.zoom);
    //   this.ctx.lineTo(resultX + (this.screenOffset.x + this.diamond[2].rotateX(angle)) * this.zoom, resultY + (this.screenOffset.y + this.diamond[2].rotateY(angle)) * this.zoom);
    //   this.ctx.lineTo(resultX + (this.screenOffset.x + this.diamond[3].rotateX(angle)) * this.zoom, resultY + (this.screenOffset.y + this.diamond[3].rotateY(angle)) * this.zoom);
    //   this.ctx.lineTo(resultX + (this.screenOffset.x + this.diamond[0].rotateX(angle)) * this.zoom, resultY + (this.screenOffset.y + this.diamond[0].rotateY(angle)) * this.zoom);
    //   if (diamondType === 'shared') {
    //     this.ctx.fillStyle = this.propertyViewSharedDiamondColor;
    //   }
    //   if (diamondType === 'owned') {
    //     this.ctx.fillStyle = this.propertyViewOwnedDiamondColor;
    //   }
    //   this.ctx.fill();
    //   this.ctx.stroke();
    //   this.ctx.lineWidth = 1;
    // }
  }

  drawInheritance(inheritance: GeneralizationView): void {
    const rect = inheritance.to.classView.value.rectangle;
    let fullPath = inheritance.buildFullPath();
    fullPath = manageInsidePointsDynamically(
      fullPath,
      inheritance.from.classView.value,
      inheritance.to.classView.value,
    );
    const startX = fullPath[fullPath.length - 2].x;
    const startY = fullPath[fullPath.length - 2].y;
    const endX = fullPath[fullPath.length - 1].x;
    const endY = fullPath[fullPath.length - 1].y;
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
      const position = this.toCanvasCoordinate(point);
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
        (this.screenOffset.x + this.triangle[0].rotateX(angle)) * this.zoom,
      resultY +
        (this.screenOffset.y + this.triangle[0].rotateY(angle)) * this.zoom,
    );
    this.ctx.lineTo(
      resultX +
        (this.screenOffset.x + this.triangle[1].rotateX(angle)) * this.zoom,
      resultY +
        (this.screenOffset.y + this.triangle[1].rotateY(angle)) * this.zoom,
    );
    this.ctx.lineTo(
      resultX +
        (this.screenOffset.x + this.triangle[2].rotateX(angle)) * this.zoom,
      resultY +
        (this.screenOffset.y + this.triangle[2].rotateY(angle)) * this.zoom,
    );
    this.ctx.lineTo(
      resultX +
        (this.screenOffset.x + this.triangle[0].rotateX(angle)) * this.zoom,
      resultY +
        (this.screenOffset.y + this.triangle[0].rotateY(angle)) * this.zoom,
    );
    this.ctx.fillStyle = this.generalizationViewInheritanceTriangeFillColor;
    this.ctx.fill();
    this.ctx.stroke();
    this.ctx.lineWidth = 1;
  }

  keydown(e: KeyboardEvent): void {
    // Remove selected view(s)
    if (e.key === 'Delete') {
      if (!this.isReadOnly) {
        this.selectedClasses.forEach((classView) => {
          this.diagram.deleteClassView(classView);
          this.diagram.setAssociationViews(
            this.diagram.associationViews.filter(
              (associationView) =>
                !(
                  associationView.from.classView.value === classView ||
                  associationView.to.classView.value === classView
                ),
            ),
          );
          this.diagram.setGeneralizationViews(
            this.diagram.generalizationViews.filter(
              (generalizationView) =>
                !(
                  generalizationView.from.classView.value === classView ||
                  generalizationView.to.classView.value === classView
                ),
            ),
          );
          this.diagram.setPropertyViews(
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
          this.diagram.deleteAssociationView(
            this.selectedPropertyOrAssociation,
          );
        } else if (this.selectedPropertyOrAssociation instanceof PropertyView) {
          this.diagram.deletePropertyView(this.selectedPropertyOrAssociation);
        }
        if (this.selectedInheritance) {
          if (
            this.diagram.generalizationViews.find(
              (generalizationView) =>
                generalizationView === this.selectedInheritance,
            )
          ) {
            this.diagram.deleteGeneralizationView(this.selectedInheritance);
          }
        }
        this.redraw();
      }
    }

    // Hide/show properties
    if (e.key === 'h') {
      if (!this.isReadOnly) {
        if (this.selectedClasses.length !== 0) {
          this.selectedClasses.forEach((classView) => {
            classView.setHideProperties(!classView.hideProperties);
          });
          this.clearScreen(); // draw the first time so that the virtualscreen has the right size
          this.drawAll();
          this.manageVirtualScreen();
          this.drawAll();
        }
      }
    }

    // Hide/show stereotypes
    if (e.key === 's') {
      if (!this.isReadOnly) {
        if (this.selectedClasses.length !== 0) {
          this.selectedClasses.forEach((classView) => {
            classView.setHideStereotypes(!classView.hideStereotypes);
          });
          this.clearScreen(); // draw the first time so that the virtualscreen has the right size
          this.drawAll();
          this.manageVirtualScreen();
          this.drawAll();
        }
      }
    }

    // Hide/show tagged values
    if (e.key === 't') {
      if (!this.isReadOnly) {
        if (this.selectedClasses.length !== 0) {
          this.selectedClasses.forEach((classView) => {
            classView.setHideTaggedValues(!classView.hideTaggedValues);
          });
          this.clearScreen(); // draw the first time so that the virtualscreen has the right size
          this.drawAll();
          this.manageVirtualScreen();
          this.drawAll();
        }
      }
    }

    // Recenter
    if (e.key === 'c') {
      if (this.selectedClasses.length !== 0) {
        const firstClass = getNullableFirstElement(this.selectedClasses);
        if (firstClass) {
          this.recenter(
            firstClass.position.x + firstClass.rectangle.width / 2,
            firstClass.position.y + firstClass.rectangle.height / 2,
          );
        }
      } else {
        this.autoRecenter();
      }
    }

    // Add type view
    if (e.key === 'a') {
      if (this.mouseOverProperty) {
        if (this.mouseOverProperty.genericType.value.rawType instanceof Class) {
          this.addClassView(
            this.mouseOverProperty.genericType.value.rawType,
            new Point(this.cursorPosition.x, this.cursorPosition.y),
          );
        }
      }
    }

    // Add currently selected class as property to the currently opened class
    if (e.key === 'p') {
      if (this.selectedClasses.length !== 0) {
        this.selectedClasses.forEach((classView) =>
          this.onAddClassPropertyForSelectedClass(classView),
        );
      }
    }
  }

  mouseup(e: MouseEvent): void {
    this.selectionStart = undefined;
    if (!this.isReadOnly) {
      this.diagram.generalizationViews.forEach((generalizationView) =>
        generalizationView.possiblyFlattenPath(),
      );
      this.diagram.associationViews.forEach((associationView) =>
        associationView.possiblyFlattenPath(),
      );
      this.diagram.propertyViews.forEach((propertyView) =>
        propertyView.possiblyFlattenPath(),
      );
    }
    this.leftClick = false;
    this.rightClick = false;
    this.redraw();
  }

  /**
   * Reorder will move the class view to the top of the class view array of the diagram,
   * This will bring it to front.
   */
  reorderDiagramDomain(firstClass: ClassView, diagram: Diagram): ClassView[] {
    const newClasses = diagram.classViews.filter(
      (classView) => classView !== firstClass,
    );
    newClasses.push(firstClass);
    return newClasses;
  }

  // DOC ???
  potentiallyShiftRelationships(
    assoViews: RelationshipView[],
    selectedClasses: ClassView[],
    newMovingDeltaX: number,
    newMovingDeltaY: number,
  ): void {
    assoViews.forEach((assoView) => {
      if (
        selectedClasses.indexOf(assoView.from.classView.value) !== -1 &&
        selectedClasses.indexOf(assoView.to.classView.value) !== -1
      ) {
        assoView.setPath(
          assoView.path.map(
            (point) =>
              new Point(point.x - newMovingDeltaX, point.y - newMovingDeltaY),
          ),
        );
      }
    });
  }

  mousedblclick(e: MouseEvent): boolean {
    const divPos = this.divPosition;
    const correctedX =
      e.x - divPos.x + this.div.scrollLeft - this.screenOffset.x * this.zoom;
    const correctedY =
      e.y - divPos.y + this.div.scrollTop - this.screenOffset.y * this.zoom;
    const selectedClass = this.diagram.classViews.find((classView) =>
      classView.contains(
        (correctedX - this.canvasCenter.x) / this.zoom + this.canvasCenter.x,
        (correctedY - this.canvasCenter.y) / this.zoom + this.canvasCenter.y,
      ),
    );
    // Click on a class view
    if (selectedClass) {
      this.onClassViewClick(selectedClass);
    }
    // Click outside of a classview
    if (!selectedClass) {
      this.onBackgroundDoubleClick(e);
    }
    return false;
  }

  mousedown(e: MouseEvent): boolean {
    this.selectionStart = undefined;
    this.selection = undefined;
    this.selectedClassCorner = undefined;
    this.selectedPoint = undefined;
    this.selectedPropertyOrAssociation = undefined;
    this.selectedInheritance = undefined;

    if (e.button === 0) {
      this.leftClick = true;
      const divPos = this.divPosition;
      const xInCanvas = e.x - divPos.x + this.div.scrollLeft;
      const yInCanvas = e.y - divPos.y + this.div.scrollTop;
      const correctedX = xInCanvas - this.screenOffset.x * this.zoom;
      const correctedY = yInCanvas - this.screenOffset.y * this.zoom;
      const x =
        (correctedX - this.canvasCenter.x) / this.zoom + this.canvasCenter.x;
      const y =
        (correctedY - this.canvasCenter.y) / this.zoom + this.canvasCenter.y;

      // Check if the selection lies within the bottom right corner box of a box (so we can do resize of box here)
      // NOTE: Traverse backwards the class views to preserve z-index buffer
      for (let i = this.diagram.classViews.length - 1; i >= 0; i--) {
        if (
          this.diagram.classViews[i].buildBottomRightCornerBox().contains(x, y)
        ) {
          this.selectedClasses = [];
          this.selectedClassCorner = this.diagram.classViews[i];
          if (!this.isReadOnly) {
            // Bring the class view to front
            this.diagram.setClassViews(
              this.reorderDiagramDomain(this.selectedClassCorner, this.diagram),
            );
          }
          break;
        }
      }

      if (!this.selectedClassCorner) {
        let selected = false;
        // Traverse backwards the class views to preserve z-index buffer
        for (let i = this.diagram.classViews.length - 1; i >= 0; i--) {
          if (this.diagram.classViews[i].contains(x, y)) {
            if (
              this.selectedClasses.length === 0 ||
              this.selectedClasses.indexOf(this.diagram.classViews[i]) === -1
            ) {
              this.selectedClasses = [this.diagram.classViews[i]];
            }
            if (!this.isReadOnly) {
              // Bring the class view to front
              this.diagram.setClassViews(
                this.reorderDiagramDomain(
                  this.selectedClasses[0],
                  this.diagram,
                ),
              );
            }
            this.clickX = correctedX / this.zoom;
            this.clickY = correctedY / this.zoom;
            // Set this here so we can keep moving the classviews
            // NOTE: in the past we tried to reset this every time after we reset `this.selectedClasses`
            // and that causes the selected classviews janks and jumps to a weird position.
            this.selectedClassesOldPos = this.selectedClasses.map((cv) => ({
              classView: cv,
              oldPos: new Point(cv.position.x, cv.position.y),
            }));
            selected = true;
            break;
          }
        }

        if (!selected) {
          this.selectedClasses = [];
        }
      }

      if (!this.selectedClassCorner && !this.selectedClasses.length) {
        for (const generalizationView of this.diagram.generalizationViews) {
          const val = generalizationView.findOrBuildPoint(
            (correctedX - this.canvasCenter.x) / this.zoom +
              this.canvasCenter.x,
            (correctedY - this.canvasCenter.y) / this.zoom +
              this.canvasCenter.y,
            this.zoom,
            !this.isReadOnly,
          );
          if (val) {
            this.selectedPoint = val;
            this.selectedInheritance = generalizationView;
            break;
          }
        }
      }

      if (
        !this.selectedClassCorner &&
        !this.selectedClasses.length &&
        !this.selectedPoint
      ) {
        for (const associationView of this.diagram.associationViews) {
          const val = associationView.findOrBuildPoint(
            (correctedX - this.canvasCenter.x) / this.zoom +
              this.canvasCenter.x,
            (correctedY - this.canvasCenter.y) / this.zoom +
              this.canvasCenter.y,
            this.zoom,
            !this.isReadOnly,
          );
          if (val) {
            this.selectedPoint = val;
            this.selectedPropertyOrAssociation = associationView;
            break;
          }
        }
      }

      if (
        !this.selectedClassCorner &&
        !this.selectedClasses.length &&
        !this.selectedPoint
      ) {
        for (const propertyView of this.diagram.propertyViews) {
          const val = propertyView.findOrBuildPoint(
            (correctedX - this.canvasCenter.x) / this.zoom +
              this.canvasCenter.x,
            (correctedY - this.canvasCenter.y) / this.zoom +
              this.canvasCenter.y,
            this.zoom,
            !this.isReadOnly,
          );
          if (val) {
            this.selectedPoint = val;
            this.selectedPropertyOrAssociation = propertyView;
            break;
          }
        }
      }

      // if the selected point is not identified then it is consider the start of a selection
      if (
        !this.selectedClassCorner &&
        !this.selectedClasses.length &&
        !this.selectedPoint
      ) {
        this.selectionStart = new Point(x, y);
      }
    }

    if (e.button === 2) {
      e.returnValue = false;
      this.rightClick = true;
      this.positionBeforeLastMove = new Point(e.x, e.y);
      return false;
    }
    this.clearScreen();
    this.drawAll();

    return true;
  }

  mousewheel(e: WheelEvent): void {
    // NOTE: scroll down to zoom in and up to zoom out
    this.zoom = this.zoom - (e.deltaY / 120) * 0.05;
    this.clearScreen();
    this.drawAll();
    e.returnValue = false;
  }

  mousemove(e: MouseEvent): void {
    this.cursorPosition = new Point(e.x, e.y);
    if (this.rightClick) {
      this.screenOffset = new Point(
        this.screenOffset.x + (e.x - this.positionBeforeLastMove.x) / this.zoom,
        this.screenOffset.y + (e.y - this.positionBeforeLastMove.y) / this.zoom,
      );
      this.positionBeforeLastMove = new Point(e.x, e.y);
      this.clearScreen();
      this.drawAll();
    } else if (this.leftClick) {
      // Resize class view
      if (this.selectedClassCorner) {
        const divPos = this.divPosition;
        const correctedX =
          e.x -
          divPos.x +
          this.div.scrollLeft -
          this.screenOffset.x * this.zoom;
        const correctedY =
          e.y - divPos.y + this.div.scrollTop - this.screenOffset.y * this.zoom;
        const newMovingX =
          (correctedX - this.canvasCenter.x) / this.zoom + this.canvasCenter.x;
        const newMovingY =
          (correctedY - this.canvasCenter.y) / this.zoom + this.canvasCenter.y;
        // Make sure width and height are in range!
        this.selectedClassCorner.setRectangle(
          new Rectangle(
            newMovingX - this.selectedClassCorner.position.x,
            newMovingY - this.selectedClassCorner.position.y,
          ),
        );
        // Refresh hash since ClassView rectangle is not observable
        this.selectedClassCorner.forceRefreshHash();
        this.drawClassView(this.selectedClassCorner);
        this.redraw();
      }

      // Move class view
      if (!this.selectionStart && this.selectedClasses.length) {
        if (!this.isReadOnly) {
          const divPos = this.divPosition;
          const correctedX =
            e.x -
            divPos.x +
            this.div.scrollLeft -
            this.screenOffset.x * this.zoom;
          const correctedY =
            e.y -
            divPos.y +
            this.div.scrollTop -
            this.screenOffset.y * this.zoom;
          let newMovingDeltaX = 0;
          let newMovingDeltaY = 0;
          this.selectedClasses.forEach((selectedClass, idx) => {
            const selectedClassOldPos =
              this.selectedClassesOldPos.length > idx
                ? this.selectedClassesOldPos[idx]
                : undefined;
            if (selectedClassOldPos) {
              const newMovingX =
                correctedX / this.zoom -
                (this.clickX - selectedClassOldPos.oldPos.x);
              const newMovingY =
                correctedY / this.zoom -
                (this.clickY - selectedClassOldPos.oldPos.y);
              newMovingDeltaX = selectedClass.position.x - newMovingX;
              newMovingDeltaY = selectedClass.position.y - newMovingY;
              selectedClass.setPosition(new Point(newMovingX, newMovingY));
              // Refresh hash since ClassView position is not observable
              selectedClass.forceRefreshHash();
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
          this.redraw();
        }
      }

      // Change line (add a new point to the line)
      if (this.selectedPoint) {
        const divPos = this.divPosition;
        const correctedX =
          e.x -
          divPos.x +
          this.div.scrollLeft -
          this.screenOffset.x * this.zoom;
        const correctedY =
          e.y - divPos.y + this.div.scrollTop - this.screenOffset.y * this.zoom;
        const updatedSelectedPoint = new Point(
          (correctedX - this.canvasCenter.x) / this.zoom + this.canvasCenter.x,
          (correctedY - this.canvasCenter.y) / this.zoom + this.canvasCenter.y,
        );
        if (this.selectedPropertyOrAssociation) {
          this.selectedPropertyOrAssociation.changePoint(
            this.selectedPoint,
            updatedSelectedPoint,
          );
        } else if (this.selectedInheritance) {
          this.selectedInheritance.changePoint(
            this.selectedPoint,
            updatedSelectedPoint,
          );
        }
        this.selectedPoint = updatedSelectedPoint;
        this.redraw();
      }

      // Draw selection box
      if (this.selectionStart) {
        this.clearScreen();
        this.drawAll();
        const divPos = this.divPosition;
        const correctedX = e.x - divPos.x;
        const correctedY = e.y - divPos.y;
        const startX =
          (this.selectionStart.x - this.canvasCenter.x + this.screenOffset.x) *
            this.zoom +
          this.canvasCenter.x;
        const startY =
          (this.selectionStart.y - this.canvasCenter.y + this.screenOffset.y) *
            this.zoom +
          this.canvasCenter.y;
        this.ctx.fillStyle = this.selectionBoxBorderColor;
        this.ctx.fillRect(
          startX,
          startY,
          correctedX - startX,
          correctedY - startY,
        );
        this.ctx.strokeRect(
          startX,
          startY,
          correctedX - startX,
          correctedY - startY,
        );
        this.selection = new PositionedRectangle(
          new Point(this.selectionStart.x, this.selectionStart.y),
          new Rectangle(
            (correctedX - startX) / this.zoom,
            (correctedY - startY) / this.zoom,
          ),
        );
        this.selectedClasses = [];
        for (const classView of this.diagram.classViews) {
          if (
            this.selection.boxContains(classView) ||
            classView.boxContains(this.selection)
          ) {
            this.selectedClasses = [...this.selectedClasses, classView];
          }
        }
      }
    } else {
      this.manageVirtualScreen();
      this.clearScreen();
      this.drawAll();

      const divPos = this.divPosition;
      const correctedX =
        e.x - divPos.x + this.div.scrollLeft - this.screenOffset.x * this.zoom;
      const correctedY =
        e.y - divPos.y + this.div.scrollTop - this.screenOffset.y * this.zoom;

      const cX =
        (correctedX - this.canvasCenter.x) / this.zoom + this.canvasCenter.x;
      const cY =
        (correctedY - this.canvasCenter.y) / this.zoom + this.canvasCenter.y;
      this.mouseOverClassView = undefined;
      this.mouseOverProperty = undefined;
      for (const classView of this.diagram.classViews.slice().reverse()) {
        if (classView.contains(cX, cY)) {
          this.mouseOverClassView = classView;
          const sX = correctedX + this.screenOffset.x * this.zoom;
          const sY = correctedY + this.screenOffset.y * this.zoom;

          const _class = classView.class.value;
          const startX = classView.position.x;
          const startY = classView.position.y;
          let cursorY = startY + this.lineHeight + this.classViewSpaceY * 2;

          cursorY =
            cursorY +
            (classView.hideStereotypes
              ? 0
              : _class.stereotypes.length * this.fontSize);
          cursorY =
            cursorY +
            (classView.hideTaggedValues
              ? 0
              : _class.taggedValues.length * this.fontSize);

          for (const property of _class.getAllOwnedProperties()) {
            if (!this.hasPropertyView(classView, property)) {
              const propX =
                (startX +
                  this.screenOffset.x +
                  this.classViewSpaceX -
                  this.canvasCenter.x) *
                  this.zoom +
                this.canvasCenter.x;
              const propY =
                (cursorY + this.screenOffset.y - this.canvasCenter.y) *
                  this.zoom +
                this.canvasCenter.y;
              this.ctx.font = `${(this.fontSize - 1) * this.zoom}px ${
                this.fontFamily
              }`;
              const propertyName = this.propertyName(property);
              const txtMeasure = this.ctx.measureText(
                `${propertyName} : `,
              ).width;
              const typeMeasure = this.ctx.measureText(
                property.genericType.value.rawType.name,
              ).width;
              if (
                new PositionedRectangle(
                  new Point(propX, propY),
                  new Rectangle(
                    txtMeasure + typeMeasure,
                    this.fontSize * this.zoom,
                  ),
                ).contains(sX, sY)
              ) {
                this.mouseOverProperty = property;
              }
              cursorY = cursorY + this.fontSize;
            }
          }
          break;
        }
      }
    }
  }
}
