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

export const _relationshipView_setPath = (
  relationshipView: RelationshipView,
  val: Point[],
): void => {
  relationshipView.path = val;
};

/**
 * For a path, only keep **at most** 1 point at each end that lies inside the class view.
 * If there is no inside points, none of kept, so the path only contains outside points.
 */
export const _relationshipView_pruneUnnecessaryInsidePoints = (
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

  // NOTE: due to the usage path, we could make sure `end > start`, but maybe this
  // is an improvement to be done

  let end = path.length - 1;
  let endPoint = path[end] as Point;

  while (end > 0 && to.contains(endPoint.x, endPoint.y)) {
    end--;
    endPoint = path[end] as Point;
  }

  // NOTE: slice upper bound is exclusive, hence the +2 instead of +1
  return path.slice(start - 1, end + 2);
};

/**
 * Simplify the path.
 *
 * Flatten the path if the angle is wide enough between 3 consecutive points
 * Also remove unnecessary inside points
 */
export const _relationshipView_SimplifyPath = (
  relationshipView: RelationshipView,
): void => {
  const fullPath = relationshipView.buildFullPath();
  // NOTE: this method here will `swallow` up points inside of the boxes
  const newPath = _relationshipView_pruneUnnecessaryInsidePoints(
    fullPath,
    relationshipView.from.classView.value,
    relationshipView.to.classView.value,
  );

  // recompute the offset point from center inside of `from` and `to` classviews.
  // for each, we first check if `manageInsidePointsDynamically` removes any points from the full path
  // if it does we will update the offset
  if (newPath[0] !== fullPath[0]) {
    const center = relationshipView.from.classView.value.center();
    relationshipView.from.offsetX = (newPath[0] as Point).x - center.x;
    relationshipView.from.offsetY = (newPath[0] as Point).y - center.y;
  }

  if (newPath[newPath.length - 1] !== fullPath[fullPath.length - 1]) {
    const center = relationshipView.to.classView.value.center();
    relationshipView.to.offsetX =
      (newPath[newPath.length - 1] as Point).x - center.x;
    relationshipView.to.offsetY =
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
