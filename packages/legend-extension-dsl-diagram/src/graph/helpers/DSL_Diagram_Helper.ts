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

import { RelationshipView } from '../metamodel/pure/packageableElements/diagram/DSL_Diagram_RelationshipView.js';
import { Point } from '../metamodel/pure/packageableElements/diagram/geometry/DSL_Diagram_Point.js';
import {
  type PureModel,
  Class,
  getAllOwnClassProperties,
} from '@finos/legend-graph';
import { deleteEntry, guaranteeNonNullable } from '@finos/legend-shared';
import type { ClassView } from '../metamodel/pure/packageableElements/diagram/DSL_Diagram_ClassView.js';
import type { Diagram } from '../metamodel/pure/packageableElements/diagram/DSL_Diagram_Diagram.js';
import { PositionedRectangle } from '../metamodel/pure/packageableElements/diagram/geometry/DSL_Diagram_PositionedRectangle.js';
import { Rectangle } from '../metamodel/pure/packageableElements/diagram/geometry/DSL_Diagram_Rectangle.js';

export class Vector {
  readonly x: number;
  readonly y: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  static fromPoints(a: Point, b: Point): Vector {
    return new Vector(b.x - a.x, b.y - a.y);
  }

  unit(): Vector {
    const norm = Math.sqrt(this.x * this.x + this.y * this.y);
    return new Vector(this.x / norm, this.y / norm);
  }

  normal(other: Vector): Vector {
    return new Vector(other.y - this.y, -(other.x - this.x));
  }

  dotProduct(other: Vector): number {
    return this.x * other.x + this.y * other.y;
  }
}

/**
 * Get absolute position of element on the screen by recursively walking up element tree
 */
export const getElementPosition = (element: HTMLElement): Point => {
  let xPosition = 0;
  let yPosition = 0;
  while (element.offsetParent) {
    xPosition += element.offsetLeft - element.scrollLeft + element.clientLeft;
    yPosition += element.offsetTop - element.scrollTop + element.clientTop;
    element = element.offsetParent as HTMLElement;
  }
  return new Point(xPosition, yPosition);
};

export const getClassView = (
  diagram: Diagram,
  sourceViewId: string,
): ClassView | undefined =>
  diagram.classViews.find((classView) => classView.id === sourceViewId);

export const cleanUpDeadReferencesInDiagram = (
  diagram: Diagram,
  graph: PureModel,
): void => {
  // Delete orphan property views
  const propertyViewsToRemove = diagram.propertyViews.filter(
    (propertyView) =>
      !(
        propertyView.property.ownerReference.value instanceof Class
          ? getAllOwnClassProperties(propertyView.property.ownerReference.value)
          : propertyView.property.ownerReference.value.properties
      )
        .map((property) => property.name)
        .includes(propertyView.property.value.name),
  );
  propertyViewsToRemove.forEach((propertyView) =>
    deleteEntry(diagram.propertyViews, propertyView),
  );

  // Fix orphan class views
  const classViewsToRemove = diagram.classViews.filter(
    (cv) => !graph.getNullableClass(cv.class.value.path),
  );
  classViewsToRemove.forEach((cw) => deleteEntry(diagram.classViews, cw));

  // Fix orphan gneralization views
  const generalizationViewsToRemove = diagram.generalizationViews.filter(
    (g) => {
      const srcClass = g.from.classView.value.class.value;
      const targetClass = g.to.classView.value.class.value;
      return (
        !graph.getNullableClass(srcClass.path) ||
        !graph.getNullableClass(targetClass.path) ||
        srcClass.generalizations.filter((c) => c.value.rawType === targetClass)
          .length === 0
      );
    },
  );
  generalizationViewsToRemove.forEach((g) =>
    deleteEntry(diagram.generalizationViews, g),
  );
};

export const _relationshipView_setPath = (
  relationshipView: RelationshipView,
  val: Point[],
): void => {
  relationshipView.path = val;
};

/**
 * Simplify the path.
 *
 * Flatten the path if the angle is wide enough between 3 consecutive points
 * Also remove unnecessary inside points
 */
export const _relationshipView_simplifyPath = (
  relationshipView: RelationshipView,
): void => {
  const fullPath = relationshipView.buildFullPath();
  // NOTE: this method here will `swallow` up points inside of the boxes
  const newPath = RelationshipView.pruneUnnecessaryInsidePoints(
    fullPath,
    relationshipView.from.classView.value,
    relationshipView.to.classView.value,
  );

  // recompute the offset point from center inside of `from` and `to` classviews.
  // for each, we first check if `manageInsidePointsDynamically` removes any points from the full path
  // if it does we will update the offset
  if (newPath[0] !== fullPath[0]) {
    const center = relationshipView.from.classView.value.center();
    relationshipView.from._offsetX =
      guaranteeNonNullable(
        newPath[0],
        'Diagram path expected to have at least 2 points',
      ).x - center.x;
    relationshipView.from._offsetY =
      guaranteeNonNullable(
        newPath[0],
        'Diagram path expected to have at least 2 points',
      ).y - center.y;
  }

  if (newPath[newPath.length - 1] !== fullPath[fullPath.length - 1]) {
    const center = relationshipView.to.classView.value.center();
    relationshipView.to._offsetX =
      (newPath[newPath.length - 1] as Point).x - center.x;
    relationshipView.to._offsetY =
      (newPath[newPath.length - 1] as Point).y - center.y;
  }

  // find the point which can be flattened due to its wide angle
  const result = [];
  for (let i = 0; i < newPath.length - 2; i++) {
    const v1 = Vector.fromPoints(
      newPath[i + 1] as Point,
      newPath[i] as Point,
    ).unit();
    const v2 = Vector.fromPoints(
      newPath[i + 1] as Point,
      newPath[i + 2] as Point,
    ).unit();
    const dot = v1.dotProduct(v2);
    const angle = (Math.acos(dot) * 180) / Math.PI;
    if (Math.abs(angle - 180) > 5) {
      result.push(newPath[i + 1] as Point);
    }
  }

  // NOTE: this new path does not contain the 2 end points
  _relationshipView_setPath(relationshipView, result);
};

/**
 * Based on the location, find the point on the path that matches or create new point
 * (within a threshold of proximity) from the coordinate and put this in the path array
 * so it doesn't look too weird
 */
export const _findOrBuildPoint = (
  relationshipView: RelationshipView,
  x: number,
  y: number,
  zoom: number,
  allowChange: boolean,
): Point | undefined => {
  for (const pt of relationshipView.path) {
    if (
      Math.sqrt((x - pt.x) * (x - pt.x) + (y - pt.y) * (y - pt.y)) <
      10 / zoom
    ) {
      return pt;
    }
  }

  const fullPath = relationshipView.buildFullPath(allowChange);
  const newPath = [];
  let point;

  for (let i = 0; i < fullPath.length - 1; i++) {
    const a = fullPath[i] as Point;
    const b = fullPath[i + 1] as Point;
    const u = new Vector(a.x, a.y).normal(new Vector(b.x, b.y)).unit();
    const v = Vector.fromPoints(a, new Point(x, y));

    // if the selection point is not too far from the segment
    // of the path, create a new point and make it part of the path
    if (Math.abs(u.dotProduct(v)) < 5 / zoom) {
      const lx = (a.x < b.x ? a.x : b.x) - 5 / zoom;
      const hx = (a.x < b.x ? b.x : a.x) + 5 / zoom;
      const ly = (a.y < b.y ? a.y : b.y) - 5 / zoom;
      const hy = (a.y < b.y ? b.y : a.y) + 5 / zoom;

      if (lx <= x && x <= hx && ly <= y && y <= hy) {
        point = new Point(x, y);
        newPath.push(point);
      }
    }

    if (i < fullPath.length - 2) {
      newPath.push(fullPath[i + 1] as Point);
    }
  }
  if (point && allowChange) {
    // NOTE: this new path does not contain the 2 end points
    _relationshipView_setPath(relationshipView, newPath);
  }
  return point;
};

export const rotatePointX = (point: Point, angle: number): number =>
  point.x * Math.cos(angle) - point.y * Math.sin(angle);

export const rotatePointY = (point: Point, angle: number): number =>
  point.x * Math.sin(angle) + point.y * Math.cos(angle);

export const getBottomRightCornerPoint = (pR: PositionedRectangle): Point =>
  new Point(
    pR.position.x + pR.rectangle.width,
    pR.position.y + pR.rectangle.height,
  );

/**
 * Build a small box at the bottom right corner of the rectangle so we
 * can use that for selection to resize the box
 */
export const buildBottomRightCornerBox = (
  pR: PositionedRectangle,
): PositionedRectangle => {
  const bottomRightCornerPoint = getBottomRightCornerPoint(pR);
  const boxSize = 10;
  return new PositionedRectangle(
    new Point(
      bottomRightCornerPoint.x - boxSize / 2,
      bottomRightCornerPoint.y - boxSize / 2,
    ),
    new Rectangle(boxSize, boxSize),
  );
};

/**
 * Check if a box contains another box
 */
export const boxContains = (
  box: PositionedRectangle,
  otherBox: PositionedRectangle,
): boolean => {
  otherBox = box.normalizeBox(otherBox);
  return (
    box.contains(otherBox.position.x, otherBox.position.y) ||
    box.contains(
      otherBox.position.x + otherBox.rectangle.width,
      otherBox.position.y,
    ) ||
    box.contains(
      otherBox.position.x,
      otherBox.position.y + otherBox.rectangle.height,
    ) ||
    box.contains(
      otherBox.position.x + otherBox.rectangle.width,
      otherBox.position.y + otherBox.rectangle.height,
    )
  );
};
