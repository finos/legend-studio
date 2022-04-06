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

import { hashArray, type Hashable } from '@finos/legend-shared';
import { RelationshipEdgeView } from './DSLDiagram_RelationshipEdgeView';
import { Point } from './geometry/DSLDiagram_Point';
import type { ClassView } from './DSLDiagram_ClassView';
import type { Diagram } from './DSLDiagram_Diagram';
import { ClassViewExplicitReference } from './DSLDiagram_ClassViewReference';
import { DIAGRAM_HASH_STRUCTURE } from '../../../../DSLDiagram_ModelUtils';
import { _relationshipView_pruneUnnecessaryInsidePoints } from './DSLDiagram_GraphModifierHelper';

export class RelationshipView implements Hashable {
  owner: Diagram;
  from: RelationshipEdgeView;
  to: RelationshipEdgeView;
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
    this.owner = owner;
    this.from = new RelationshipEdgeView(
      ClassViewExplicitReference.create(from),
    );
    this.to = new RelationshipEdgeView(ClassViewExplicitReference.create(to));
  }

  /**
   * Calculate the end points of the edge using offset, otherwise, use the center
   */
  private computeEdgeEndpoint(
    edgeView: RelationshipEdgeView,
    allowChange = true,
  ): Point {
    const box = edgeView.classView.value;
    const center = edgeView.classView.value.center();
    const newX = center.x + (edgeView.offsetX ?? 0);
    const newY = center.y + (edgeView.offsetY ?? 0);
    if (box.contains(newX, newY)) {
      return new Point(newX, newY);
    }
    if (allowChange) {
      edgeView.offsetX = 0;
      edgeView.offsetY = 0;
    }
    return new Point(center.x, center.y);
  }

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

  /**
   * This method will compute the full path from the offset within class view for serialization and persistence purpose
   */
  get pathForSerialization(): Point[] {
    return _relationshipView_pruneUnnecessaryInsidePoints(
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
