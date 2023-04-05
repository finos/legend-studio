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

import { hashArray, type Hashable, assertTrue } from '@finos/legend-shared';
import { RelationshipViewEnd } from './DSL_Diagram_RelationshipViewEnd.js';
import { Point } from './geometry/DSL_Diagram_Point.js';
import type { ClassView } from './DSL_Diagram_ClassView.js';
import type { Diagram } from './DSL_Diagram_Diagram.js';
import { ClassViewExplicitReference } from './DSL_Diagram_ClassViewReference.js';
import { DIAGRAM_HASH_STRUCTURE } from '../../../../DSL_Diagram_HashUtils.js';

export class RelationshipView implements Hashable {
  readonly _OWNER: Diagram;

  from: RelationshipViewEnd;
  to: RelationshipViewEnd;
  /**
   * NOTE: Unlike in the protocol model, we don't store the end points in the path but only store the
   * offsets of that point from the center of the end/start classviews. The main purpose here is to
   * make less error. We don't need to bother maintaining these points in the path. They are
   * auto-managed. Even if an erroneous path is set (e.g. an empty list of points), this logic
   * that we have will rectify that and create a sensible path.
   *
   * In exchange, this logic is a little complicated, we have tried to document as much about it as we could
   * but the logic is not straight forward. Perhaps, we could simplify this in the future.
   */
  path: Point[] = [];

  constructor(owner: Diagram, from: ClassView, to: ClassView) {
    this._OWNER = owner;
    this.from = new RelationshipViewEnd(
      ClassViewExplicitReference.create(from),
    );
    this.to = new RelationshipViewEnd(ClassViewExplicitReference.create(to));
  }

  // TODO: to be simplified out of metamodel
  // we will move these when we move hashing out of metamodel
  /**
   * Calculate the end points of the edge using offset, otherwise, use the center
   */
  private computeEdgeEndpoint(
    edgeView: RelationshipViewEnd,
    allowChange = true,
  ): Point {
    const box = edgeView.classView.value;
    const center = edgeView.classView.value.center();
    const newX = center.x + (edgeView._offsetX ?? 0);
    const newY = center.y + (edgeView._offsetY ?? 0);
    if (box.contains(newX, newY)) {
      return new Point(newX, newY);
    }
    if (allowChange) {
      edgeView._offsetX = 0;
      edgeView._offsetY = 0;
    }
    return new Point(center.x, center.y);
  }

  // TODO: to be simplified out of metamodel
  // we will move these when we move hashing out of metamodel
  /**
   * Compute the full path for the relationship view (including the ends even if these
   * ends lie inside of the classviews)
   *
   * Notice here that the end points are recomputed every time, as such
   * `path` only stores point that matters to the edge but are not end points
   */
  buildFullPath(allowChange = true): Point[] {
    return [
      this.computeEdgeEndpoint(this.from, allowChange),
      ...this.path,
      this.computeEdgeEndpoint(this.to, allowChange),
    ];
  }

  // TODO: to be simplified out of metamodel
  // we will move these when we move hashing out of metamodel
  /**
   * For a path, only keep **at most** 1 point at each end that lies inside the class view.
   * If there is no inside points, none of kept, so the path only contains outside points.
   */
  static pruneUnnecessaryInsidePoints = (
    path: Point[],
    from: ClassView,
    to: ClassView,
  ): Point[] => {
    assertTrue(Boolean(path.length), 'Path requires at least 1 point');

    let start = 0;
    let startPoint = path[start] as Point;

    while (
      start < path.length - 1 &&
      from.contains(startPoint.x, startPoint.y)
    ) {
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
    const newPath = path.slice(start - 1, end + 2);
    // In the event we have trimmed all paths, we will return start and end point to ensure the path still contains 2 points
    return newPath.length < 2 ? [startPoint, endPoint] : newPath;
  };

  // TODO: to be simplified out of metamodel
  // we will move these when we move hashing out of metamodel
  /**
   * This method will compute the full path from the offset within class view for serialization and persistence purpose
   */
  get pathForSerialization(): Point[] {
    return RelationshipView.pruneUnnecessaryInsidePoints(
      this.buildFullPath(),
      this.from.classView.value,
      this.to.classView.value,
    );
  }

  get hashCode(): string {
    return hashArray([
      DIAGRAM_HASH_STRUCTURE.RELATIONSHIP_VIEW,
      this.from.classView.value.id,
      this.to.classView.value.id,
      hashArray(this.pathForSerialization),
    ]);
  }
}
