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
import { Point } from './DSLDiagram_Point';
import { Rectangle } from './DSLDiagram_Rectangle';
import { DIAGRAM_HASH_STRUCTURE } from '../../../../../DSLDiagram_ModelUtils';

export class /*toCHECK*/ PositionedRectangle implements Hashable {
  position: Point;
  rectangle: Rectangle;
  dummyObservable = {};

  constructor(position: Point, rectangle: Rectangle) {
    this.position = position;
    this.rectangle = rectangle;
  }

  edgePoint = (): Point =>
    new Point(
      this.position.x + this.rectangle.width,
      this.position.y + this.rectangle.height,
    );
  center = (): Point =>
    new Point(
      this.position.x + this.rectangle.width / 2,
      this.position.y + this.rectangle.height / 2,
    );

  /**
   * Build a small box at the bottom right corner of the rectangle so we can use that for selection to resize the box
   */
  buildBottomRightCornerBox(): PositionedRectangle {
    const cornerX = this.position.x + this.rectangle.width;
    const cornerY = this.position.y + this.rectangle.height;
    const boxSize = 10;
    return new PositionedRectangle(
      new Point(cornerX - boxSize / 2, cornerY - boxSize / 2),
      new Rectangle(boxSize, boxSize),
    );
  }

  boxContains(otherBox: PositionedRectangle): boolean {
    otherBox = this.normalizeBox(otherBox);
    return (
      this.contains(otherBox.position.x, otherBox.position.y) ||
      this.contains(
        otherBox.position.x + otherBox.rectangle.width,
        otherBox.position.y,
      ) ||
      this.contains(
        otherBox.position.x,
        otherBox.position.y + otherBox.rectangle.height,
      ) ||
      this.contains(
        otherBox.position.x + otherBox.rectangle.width,
        otherBox.position.y + otherBox.rectangle.height,
      )
    );
  }

  contains(x: number, y: number): boolean {
    const box = this.normalizeBox(this);
    return (
      x > box.position.x &&
      x < box.position.x + box.rectangle.width &&
      y > box.position.y &&
      y < box.position.y + box.rectangle.height
    );
  }

  normalizeBox(box: PositionedRectangle): PositionedRectangle {
    let newBox = box;
    if (box.rectangle.width < 0) {
      newBox = new PositionedRectangle(
        new Point(box.position.x + box.rectangle.width, box.position.y),
        new Rectangle(-box.rectangle.width, box.rectangle.height),
      );
    }
    if (box.rectangle.height < 0) {
      newBox = new PositionedRectangle(
        new Point(box.position.x, box.position.y + box.rectangle.height),
        new Rectangle(box.rectangle.width, -box.rectangle.height),
      );
    }
    return newBox;
  }

  get hashCode(): string {
    this.dummyObservable; // manually trigger classview hash code recomputation
    return hashArray([
      DIAGRAM_HASH_STRUCTURE.POSITIONED_RECTANGLE,
      this.position,
      this.rectangle,
    ]);
  }
}
