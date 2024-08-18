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
import { Point } from './DSL_Diagram_Point.js';
import { Rectangle } from './DSL_Diagram_Rectangle.js';
import { DIAGRAM_HASH_STRUCTURE } from '../../../../../DSL_Diagram_HashUtils.js';

export class PositionedRectangle implements Hashable {
  _dummyObservable = {};

  position: Point;
  rectangle: Rectangle;

  constructor(position: Point, rectangle: Rectangle) {
    this.position = position;
    this.rectangle = rectangle;
  }

  // TODO: to be simplified out of metamodel
  // to be moved out when we move hashing out
  center = (): Point =>
    new Point(
      this.position.x + this.rectangle.width / 2,
      this.position.y + this.rectangle.height / 2,
    );

  // TODO: to be simplified out of metamodel
  // to be moved out when we move hashing out
  contains(x: number, y: number): boolean {
    const box = this.normalizeBox(this);
    return (
      x > box.position.x &&
      x < box.position.x + box.rectangle.width &&
      y > box.position.y &&
      y < box.position.y + box.rectangle.height
    );
  }

  // TODO: to be simplified out of metamodel
  // to be moved out when we move hashing out
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
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    this._dummyObservable; // manually trigger class-view hash code recomputation
    return hashArray([
      DIAGRAM_HASH_STRUCTURE.POSITIONED_RECTANGLE,
      this.position,
      this.rectangle,
    ]);
  }
}
