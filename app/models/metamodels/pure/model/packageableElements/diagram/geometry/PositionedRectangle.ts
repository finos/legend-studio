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

import { observable, action } from 'mobx';
import { hashArray } from 'Utilities/HashUtil';
import { Hashable } from 'MetaModelUtility';
import { HASH_STRUCTURE } from 'MetaModelConst';
import { Point } from './Point';
import { Rectangle } from './Rectangle';

export class PositionedRectangle implements Hashable {
  position: Point;
  rectangle: Rectangle;
  @observable dummyObservable = {};

  constructor(position: Point, rectangle: Rectangle) {
    this.position = position;
    this.rectangle = rectangle;
  }

  setRectangle(value: Rectangle): void { this.rectangle = value }
  setPosition(value: Point): void { this.position = value }
  /**
   * NOTE: Having `position` and `rectangle` as observables compromises the performance of diagram
   * so we want to have a way to refresh the hash for change detection to pick up new hash when we resize
   * the class view box or move it.
   */
  @action forceRefreshHash(): void { this.dummyObservable = {} }

  edgePoint = (): Point => new Point(this.position.x + this.rectangle.width, this.position.y + this.rectangle.height);
  center = (): Point => new Point(this.position.x + this.rectangle.width / 2, this.position.y + this.rectangle.height / 2);

  /**
   * Build a small box at the bottom right corner of the rectangle so we can use that for selection to resize the box
   */
  buildBottomRightCornerBox(): PositionedRectangle {
    const cornerX = this.position.x + this.rectangle.width;
    const cornerY = this.position.y + this.rectangle.height;
    const boxSize = 10;
    return new PositionedRectangle(new Point(cornerX - boxSize / 2, cornerY - boxSize / 2), new Rectangle(boxSize, boxSize));
  }

  boxContains(otherBox: PositionedRectangle): boolean {
    otherBox = this.normalizeBox(otherBox);
    return this.contains(otherBox.position.x, otherBox.position.y) ||
      this.contains(otherBox.position.x + otherBox.rectangle.width, otherBox.position.y) ||
      this.contains(otherBox.position.x, otherBox.position.y + otherBox.rectangle.height) ||
      this.contains(otherBox.position.x + otherBox.rectangle.width, otherBox.position.y + otherBox.rectangle.height);
  }

  contains(x: number, y: number): boolean {
    const box = this.normalizeBox(this);
    return x > box.position.x && x < box.position.x + box.rectangle.width && y > box.position.y && y < box.position.y + box.rectangle.height;
  }

  normalizeBox(box: PositionedRectangle): PositionedRectangle {
    let newBox = box;
    if (box.rectangle.width < 0) {
      newBox = new PositionedRectangle(
        new Point(box.position.x + box.rectangle.width, box.position.y),
        new Rectangle(-box.rectangle.width, box.rectangle.height)
      );
    }
    if (box.rectangle.height < 0) {
      newBox = new PositionedRectangle(
        new Point(box.position.x, box.position.y + box.rectangle.height),
        new Rectangle(box.rectangle.width, -box.rectangle.height)
      );
    }
    return newBox;
  }

  get hashCode(): string {
    this.dummyObservable; // have this here so we can re-trigger hashCode computation (in this case for class view)
    return hashArray([
      HASH_STRUCTURE.POSITIONED_RECTANGLE,
      this.position,
      this.rectangle
    ]);
  }
}
