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
import { PositionedRectangle } from './geometry/DSLDiagram_PositionedRectangle';
import { Rectangle } from './geometry/DSLDiagram_Rectangle';
import { Point } from './geometry/DSLDiagram_Point';
import type { Diagram } from './DSLDiagram_Diagram';
import { DIAGRAM_HASH_STRUCTURE } from '../../../../DSLDiagram_ModelUtils';
import type { Class, PackageableElementReference } from '@finos/legend-graph';

export class /*toCHECK*/ ClassView
  extends PositionedRectangle
  implements Hashable
{
  owner: Diagram;
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
    this.owner = owner;
    this.id = id;
    this.class = _class;
  }

  override get hashCode(): string {
    return hashArray([
      DIAGRAM_HASH_STRUCTURE.CLASS_VIEW,
      super.hashCode,
      this.id,
      this.class.hashValue,
      this.hideProperties?.toString() ?? '',
      this.hideTaggedValues?.toString() ?? '',
      this.hideStereotypes?.toString() ?? '',
    ]);
  }
}
