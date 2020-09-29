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

import { observable, action, computed } from 'mobx';
import { hashArray } from 'Utilities/HashUtil';
import { Hashable } from 'MetaModelUtility';
import { HASH_STRUCTURE } from 'MetaModelConst';
import { changeEntry } from 'Utilities/GeneralUtil';
import { RelationShipEdgeView as RelationshipEdgeView } from './RelationshipEdgeView';
import { Point } from './geometry/Point';
import { ClassView } from './ClassView';
import { Vector } from './geometry/Vector';
import { Diagram } from 'MM/model/packageableElements/diagram/Diagram';
import { ClassViewExplicitReference } from 'MM/model/packageableElements/diagram/ClassViewReference';

/**
 * Get absolute position of element on the screen by recursively walking up element tree
 */
export function getElementPosition(element: HTMLElement): Point {
  let xPosition = 0;
  let yPosition = 0;
  while (element.offsetParent) {
    xPosition += element.offsetLeft - element.scrollLeft + element.clientLeft;
    yPosition += element.offsetTop - element.scrollTop + element.clientTop;
    element = element.offsetParent as HTMLElement;
  }
  return new Point(xPosition, yPosition);
}

/**
 * For a path, only counts the points which lie outside of the 2 class views
 */
export function manageInsidePointsDynamically(path: Point[], from: ClassView, to: ClassView): Point[] {
  let start = 0;
  let startPoint = path[start];

  while (start < path.length - 1 && from.contains(startPoint.x, startPoint.y)) {
    start++;
    startPoint = path[start];
  }

  let end = path.length - 1;
  let endPoint = path[end];

  while (end > 0 && to.contains(endPoint.x, endPoint.y)) {
    end--;
    endPoint = path[end];
  }

  return path.slice(start - 1, end + 2);
}

export class RelationshipView implements Hashable {
  owner: Diagram;
  from: RelationshipEdgeView;
  to: RelationshipEdgeView;
  // NOTE: to optimize performance for diagram, we have made classview's position and rectangle non-observable
  // if we need to further optimize, perhaps we can also remove observability from path
  @observable path: Point[] = [];

  constructor(owner: Diagram, from: ClassView, to: ClassView) {
    this.owner = owner;
    this.from = new RelationshipEdgeView(ClassViewExplicitReference.create(from));
    this.to = new RelationshipEdgeView(ClassViewExplicitReference.create(to));
  }

  @action setPath(val: Point[]): void { this.path = val }
  @action changePoint(val: Point, newVal: Point): void { changeEntry(this.path, val, newVal) }

  /**
   * Compute the full path for an edge, but notice here that the end points are recomputed every time, as such
   * `path` only stores point that matters to the edge but are not end points
   */
  buildFullPath(allowChange = true): Point[] {
    return [this.computeEdgeEndpoint(this.from, allowChange), ...this.path, this.computeEdgeEndpoint(this.to, allowChange)];
  }

  /**
   * This method will compute the full path from the offset within class view for persistence purpose
   */
  @computed get fullPath(): Point[] {
    return manageInsidePointsDynamically(this.buildFullPath(), this.from.classView.value, this.to.classView.value);
  }

  /**
   * Flatten the path if the angle is wide enough
   * Also `swallow` points in path which lie inside of the rectangle of a view
   */
  possiblyFlattenPath(): void {
    const fullPath = this.buildFullPath();
    // NOTE: this method here will `swallow` up points inside of the boxes
    const newPath = manageInsidePointsDynamically(fullPath, this.from.classView.value, this.to.classView.value);

    // recompute the offset point from center inside of `from` and `to` classviews.
    // for each, we first check if `manageInsidePointsDynamically` removes any points from the full path
    // if it does we will update the offset
    if (newPath[0] !== fullPath[0]) {
      const center = this.from.classView.value.center();
      this.from.setOffsetX(newPath[0].x - center.x);
      this.from.setOffsetY(newPath[0].y - center.y);
    }

    if (newPath[newPath.length - 1] !== fullPath[fullPath.length - 1]) {
      const center = this.to.classView.value.center();
      this.to.setOffsetX(newPath[newPath.length - 1].x - center.x);
      this.to.setOffsetY(newPath[newPath.length - 1].y - center.y);
    }

    // find the point which can be flattened due to its wide angle
    const result = [];
    for (let i = 0; i < newPath.length - 2; i++) {
      const v1 = Vector.fromPoints(newPath[i + 1], newPath[i]).norm();
      const v2 = Vector.fromPoints(newPath[i + 1], newPath[i + 2]).norm();
      const dot = v1.dotProduct(v2);
      const angle = Math.acos(dot) * 180 / Math.PI;
      if (Math.abs(angle - 180) > 5) {
        result.push(newPath[i + 1]);
      }
    }
    // here's where we will modify the path, i.e. swallow inside points if we have to
    this.setPath(result);
  }

  /**
   * Based on the location, find the point on the path that matches or create new point
   * (within a threshold of proximity) from the coordinate and put this in the path array
   * so it doesn't look too weird
   */
  findOrBuildPoint(x: number, y: number, zoom: number, allowChange = true): Point | undefined {
    for (const point of this.path) {
      if (Math.sqrt((x - point.x) * (x - point.x) + (y - point.y) * (y - point.y)) < 10 / zoom) {
        return point;
      }
    }

    const fullPath = this.buildFullPath(allowChange);
    const newPath = [];
    let point;

    for (let i = 0; i < fullPath.length - 1; i++) {
      const a = fullPath[i];
      const b = fullPath[i + 1];
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
        newPath.push(fullPath[i + 1]);
      }
    }
    if (point && allowChange) {
      this.setPath(newPath);
    }
    return point;
  }

  /**
   * Calculate the end points of the edge using offset, otherwise, use the center
   */
  private computeEdgeEndpoint(edgeView: RelationshipEdgeView, allowChange = true): Point {
    const box = edgeView.classView.value;
    const center = edgeView.classView.value.center();
    const newX = center.x + (edgeView.offsetX ?? 0);
    const newY = center.y + (edgeView.offsetY ?? 0);
    if (box.contains(newX, newY)) {
      return new Point(newX, newY);
    }
    if (allowChange) {
      edgeView.setOffsetX(0);
      edgeView.setOffsetY(0);
    }
    return new Point(center.x, center.y);
  }

  get hashCode(): string {
    return hashArray([
      HASH_STRUCTURE.RELATIONSHIP_VIEW,
      this.from.classView.value.id,
      this.to.classView.value.id,
      hashArray(this.fullPath)
    ]);
  }
}
