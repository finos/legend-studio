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

/**
 * Manhattan grid layout: arranges ClassViews on a grid with a small gap
 * between cells, placing connected nodes in adjacent cells via BFS so
 * that edges stay short and crossings are minimised.
 * The final layout is centred on (0, 0).
 *
 * Assumes rectangle dimensions on each ClassView have already been set
 * (e.g. by DiagramRenderer.ensureClassViewMeetMinDimensions).
 */
export const layoutDiagram = (diagram: Diagram): void => {
  const classViews = diagram.classViews;
  if (classViews.length === 0) {
    return;
  }

  const viewMap = new Map<string, ClassView>();
  for (const cv of classViews) {
    viewMap.set(cv.id, cv);
  }

  const neighbors = new Map<string, Set<string>>();
  for (const cv of classViews) {
    neighbors.set(cv.id, new Set());
  }

  for (const gv of diagram.generalizationViews) {
    const fromId = gv.from.classView.value.id;
    const toId = gv.to.classView.value.id;
    const fromSet = neighbors.get(fromId);
    if (fromSet) {
      fromSet.add(toId);
    }
    const toSet = neighbors.get(toId);
    if (toSet) {
      toSet.add(fromId);
    }
  }

  for (const pv of diagram.propertyViews) {
    const fromId = pv.from.classView.value.id;
    const toId = pv.to.classView.value.id;
    const fromSet = neighbors.get(fromId);
    if (fromSet) {
      fromSet.add(toId);
    }
    const toSet = neighbors.get(toId);
    if (toSet) {
      toSet.add(fromId);
    }
  }

  // Start BFS from the most-connected node to keep the densest cluster central
  const sortedByDegree = [...classViews].sort((a, b) => {
    const degA = neighbors.get(a.id)?.size ?? 0;
    const degB = neighbors.get(b.id)?.size ?? 0;
    return degB - degA;
  });

  // Tracks which grid cells are taken
  const gridAssignment = new Map<string, { row: number; col: number }>();
  const occupied = new Set<string>();
  const cellKey = (r: number, c: number): string => `${r},${c}`;

  // Four directions
  const dirs: [number, number][] = [
    [0, 1],
    [1, 0],
    [0, -1],
    [-1, 0],
  ];

  // Pick the best unoccupied cell adjacent to already-placed neighbours
  const findBestCell = (nodeId: string): { row: number; col: number } => {
    const nodeNeighbors = neighbors.get(nodeId);
    const placedCells: { row: number; col: number }[] = [];
    if (nodeNeighbors) {
      for (const nId of nodeNeighbors) {
        const cell = gridAssignment.get(nId);
        if (cell) {
          placedCells.push(cell);
        }
      }
    }

    const candidates: { row: number; col: number; score: number }[] = [];
    const seen = new Set<string>();
    for (const cell of placedCells) {
      for (const [dr, dc] of dirs) {
        const nr = cell.row + dr;
        const nc = cell.col + dc;
        const key = cellKey(nr, nc);
        if (!occupied.has(key) && !seen.has(key)) {
          seen.add(key);
          let dist = 0;
          for (const pc of placedCells) {
            dist += Math.abs(nr - pc.row) + Math.abs(nc - pc.col);
          }
          candidates.push({ row: nr, col: nc, score: dist });
        }
      }
    }

    if (candidates.length > 0) {
      candidates.sort((a, b) => a.score - b.score);
      const best = candidates[0];
      if (best) {
        return { row: best.row, col: best.col };
      }
    }

    for (let radius = 0; radius <= classViews.length + 1; radius++) {
      for (let r = -radius; r <= radius; r++) {
        for (let c = -radius; c <= radius; c++) {
          if (
            Math.abs(r) + Math.abs(c) === radius &&
            !occupied.has(cellKey(r, c))
          ) {
            return { row: r, col: c };
          }
        }
      }
    }
    return { row: 0, col: 0 };
  };

  // BFS across every connected component, starting from highest-degree node
  const visited = new Set<string>();
  for (const startNode of sortedByDegree) {
    if (visited.has(startNode.id)) {
      continue;
    }

    if (gridAssignment.size === 0) {
      gridAssignment.set(startNode.id, { row: 0, col: 0 });
      occupied.add(cellKey(0, 0));
    } else {
      const cell = findBestCell(startNode.id);
      gridAssignment.set(startNode.id, cell);
      occupied.add(cellKey(cell.row, cell.col));
    }
    visited.add(startNode.id);

    const queue: string[] = [startNode.id];
    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) {
        continue;
      }
      const currentNeighbors = neighbors.get(current);
      if (!currentNeighbors) {
        continue;
      }
      for (const nId of currentNeighbors) {
        if (visited.has(nId)) {
          continue;
        }
        visited.add(nId);
        const cell = findBestCell(nId);
        gridAssignment.set(nId, cell);
        occupied.add(cellKey(cell.row, cell.col));
        queue.push(nId);
      }
    }
  }

  const CELL_GAP = 100;
  const MAX_PER_ROW = 5;

  const gridRowItems = new Map<number, { cv: ClassView; col: number }[]>();
  for (const cv of classViews) {
    const cell = gridAssignment.get(cv.id);
    if (!cell) {
      continue;
    }
    const items = gridRowItems.get(cell.row) ?? [];
    items.push({ cv, col: cell.col });
    gridRowItems.set(cell.row, items);
  }

  const visualRows: { cv: ClassView; col: number }[][] = [];
  const sortedGridRows = [...gridRowItems.keys()].sort((a, b) => a - b);
  for (const gridRow of sortedGridRows) {
    const items = gridRowItems.get(gridRow);
    if (!items) {
      continue;
    }
    items.sort((a, b) => a.col - b.col);
    for (let i = 0; i < items.length; i += MAX_PER_ROW) {
      visualRows.push(items.slice(i, i + MAX_PER_ROW));
    }
  }

  const rowHeights: number[] = visualRows.map((items) =>
    items.reduce((max, item) => Math.max(max, item.cv.rectangle.height), 0),
  );
  const rowYOffsets: number[] = [];
  let cumY = 0;
  for (let i = 0; i < rowHeights.length; i++) {
    rowYOffsets.push(cumY);
    cumY += (rowHeights[i] ?? 0) + CELL_GAP;
  }

  for (let r = 0; r < visualRows.length; r++) {
    const items = visualRows[r];
    if (!items) {
      continue;
    }
    let curX = 0;
    const yPos = rowYOffsets[r] ?? 0;
    for (const item of items) {
      item.cv.position = new Point(curX, yPos);
      curX += item.cv.rectangle.width + CELL_GAP;
    }
  }
};
