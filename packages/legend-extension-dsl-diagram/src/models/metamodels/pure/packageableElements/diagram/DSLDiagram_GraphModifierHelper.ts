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

import type { ClassView } from './DSLDiagram_ClassView';
import type { RelationshipView } from './DSLDiagram_RelationshipView';
import { Point } from './geometry/DSLDiagram_Point';
import { Vector } from './geometry/DSLDiagram_Vector';

export const _relationView_setPath = (
  relationView: RelationshipView,
  val: Point[],
): void => {
  relationView.path = val;
};

/**
 * For a path, only counts the points which lie outside of the 2 class views
 */
export const _relationView_manageInsidePointsDynamically = (
  path: Point[],
  from: ClassView,
  to: ClassView,
): Point[] => {
  if (!path.length) {
    return [];
  }

  let start = 0;
  let startPoint = path[start] as Point;

  while (start < path.length - 1 && from.contains(startPoint.x, startPoint.y)) {
    start++;
    startPoint = path[start] as Point;
  }

  let end = path.length - 1;
  let endPoint = path[end] as Point;

  while (end > 0 && to.contains(endPoint.x, endPoint.y)) {
    end--;
    endPoint = path[end] as Point;
  }

  return path.slice(start - 1, end + 2);
};

/**
 * Flatten the path if the angle is wide enough
 * Also `swallow` points in path which lie inside of the rectangle of a view
 */
export const _relationView_possiblyFlattenPath = (
  relationView: RelationshipView,
): void => {
  const fullPath = relationView.buildFullPath();
  // NOTE: this method here will `swallow` up points inside of the boxes
  const newPath = _relationView_manageInsidePointsDynamically(
    fullPath,
    relationView.from.classView.value,
    relationView.to.classView.value,
  );

  // recompute the offset point from center inside of `from` and `to` classviews.
  // for each, we first check if `manageInsidePointsDynamically` removes any points from the full path
  // if it does we will update the offset
  if (newPath[0] !== fullPath[0]) {
    const center = relationView.from.classView.value.center();

    relationView.from.offsetX = (newPath[0] as Point).x - center.x;
    relationView.from.offsetY = (newPath[0] as Point).y - center.y;
  }

  if (newPath[newPath.length - 1] !== fullPath[fullPath.length - 1]) {
    const center = relationView.to.classView.value.center();
    relationView.to.offsetX =
      (newPath[newPath.length - 1] as Point).x - center.x;
    relationView.to.offsetY =
      (newPath[newPath.length - 1] as Point).y - center.y;
  }

  // find the point which can be flattened due to its wide angle
  const result = [];
  for (let i = 0; i < newPath.length - 2; i++) {
    const v1 = Vector.fromPoints(
      newPath[i + 1] as Point,
      newPath[i] as Point,
    ).norm();
    const v2 = Vector.fromPoints(
      newPath[i + 1] as Point,
      newPath[i + 2] as Point,
    ).norm();
    const dot = v1.dotProduct(v2);
    const angle = (Math.acos(dot) * 180) / Math.PI;
    if (Math.abs(angle - 180) > 5) {
      result.push(newPath[i + 1] as Point);
    }
  }
  // here's where we will modify the path, i.e. swallow inside points if we have to
  _relationView_setPath(relationView, result);
};

/**
 * Based on the location, find the point on the path that matches or create new point
 * (within a threshold of proximity) from the coordinate and put this in the path array
 * so it doesn't look too weird
 */
export const _findOrBuildPoint = (
  relationView: RelationshipView,
  x: number,
  y: number,
  zoom: number,
  allowChange = true,
): Point | undefined => {
  for (const pt of relationView.path) {
    if (
      Math.sqrt((x - pt.x) * (x - pt.x) + (y - pt.y) * (y - pt.y)) <
      10 / zoom
    ) {
      return pt;
    }
  }

  const fullPath = relationView.buildFullPath(allowChange);
  const newPath = [];
  let point;

  for (let i = 0; i < fullPath.length - 1; i++) {
    const a = fullPath[i] as Point;
    const b = fullPath[i + 1] as Point;
    const n = new Vector(a.x, a.y).normal(new Vector(b.x, b.y)).norm();
    const v = Vector.fromPoints(a, new Point(x, y));

    if (Math.abs(n.dotProduct(v)) < 5 / zoom) {
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
    _relationView_setPath(relationView, newPath);
  }
  return point;
};
