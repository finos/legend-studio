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
import { PositionedRectangle } from './geometry/DSL_Diagram_PositionedRectangle.js';
import { Rectangle } from './geometry/DSL_Diagram_Rectangle.js';
import { Point } from './geometry/DSL_Diagram_Point.js';
import type { Diagram } from './DSL_Diagram_Diagram.js';
import { DIAGRAM_HASH_STRUCTURE } from '../../../../DSL_Diagram_HashUtils.js';
import type { Class, PackageableElementReference } from '@finos/legend-graph';

export class ClassView extends PositionedRectangle implements Hashable {
  readonly _OWNER: Diagram;

  class: PackageableElementReference<Class>;
  id: string;
  hideProperties?: boolean | undefined;
  hideTaggedValues?: boolean | undefined;
  hideStereotypes?: boolean | undefined;

  constructor(
    owner: Diagram,
    id: string,
    _class: PackageableElementReference<Class>,
  ) {
    super(new Point(0, 0), new Rectangle(0, 0));
    this._OWNER = owner;
    this.id = id;
    this.class = _class;
  }

  override get hashCode(): string {
    return hashArray([
      DIAGRAM_HASH_STRUCTURE.CLASS_VIEW,
      super.hashCode,
      this.id,
      this.class.valueForSerialization ?? '',
      this.hideProperties?.toString() ?? '',
      this.hideTaggedValues?.toString() ?? '',
      this.hideStereotypes?.toString() ?? '',
    ]);
  }
}
