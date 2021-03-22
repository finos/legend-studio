/**
 * Copyright Goldman Sachs
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

import { observable, action, makeObservable } from 'mobx';
import type { ClassViewReference } from '../../../model/packageableElements/diagram/ClassViewReference';

export class RelationShipEdgeView {
  classView: ClassViewReference;
  offsetX?: number;
  offsetY?: number;

  constructor(classView: ClassViewReference) {
    makeObservable(this, {
      offsetX: observable,
      offsetY: observable,
      setOffsetX: action,
      setOffsetY: action,
    });

    this.classView = classView;
  }

  setOffsetX(val: number): void {
    this.offsetX = val;
  }
  setOffsetY(val: number): void {
    this.offsetY = val;
  }
}
