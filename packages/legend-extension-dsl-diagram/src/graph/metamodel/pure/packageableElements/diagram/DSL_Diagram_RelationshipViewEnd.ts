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

import type { ClassViewReference } from './DSL_Diagram_ClassViewReference.js';

export class RelationshipViewEnd {
  /**
   * Offsets from the center of the class view.
   *
   * These offsets can be used to compute the end points of relationship views.
   */
  _offsetX?: number | undefined;
  _offsetY?: number | undefined;

  classView: ClassViewReference;

  constructor(classView: ClassViewReference) {
    this.classView = classView;
  }
}
