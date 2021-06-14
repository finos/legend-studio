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

import { computed, observable, action, makeObservable } from 'mobx';
import { hashArray } from '@finos/legend-studio-shared';
import type { Hashable } from '@finos/legend-studio-shared';
import { CORE_HASH_STRUCTURE } from '../../../../../MetaModelConst';
import type { Class } from '../../../model/packageableElements/domain/Class';
import { PositionedRectangle } from './geometry/PositionedRectangle';
import { Rectangle } from './geometry/Rectangle';
import { Point } from './geometry/Point';
import type { PackageableElementReference } from '../../../model/packageableElements/PackageableElementReference';
import type { Diagram } from '../../../model/packageableElements/diagram/Diagram';

export class ClassView extends PositionedRectangle implements Hashable {
  owner: Diagram;
  class: PackageableElementReference<Class>;
  id: string;
  hideProperties = false;
  hideTaggedValues = false;
  hideStereotypes = false;

  constructor(
    owner: Diagram,
    id: string,
    _class: PackageableElementReference<Class>,
  ) {
    super(new Point(0, 0), new Rectangle(0, 0));

    makeObservable(this, {
      id: observable,
      hideProperties: observable,
      hideTaggedValues: observable,
      hideStereotypes: observable,
      setHideProperties: action,
      setHideStereotypes: action,
      setHideTaggedValues: action,
      hashCode: computed,
    });

    this.owner = owner;
    this.id = id;
    this.class = _class;
  }

  setHideProperties(val: boolean): void {
    this.hideProperties = val;
  }
  setHideStereotypes(val: boolean): void {
    this.hideStereotypes = val;
  }
  setHideTaggedValues(val: boolean): void {
    this.hideTaggedValues = val;
  }

  override get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.CLASS_VIEW,
      super.hashCode,
      this.id,
      this.class.valueForSerialization,
      Boolean(this.hideProperties).toString(),
      Boolean(this.hideTaggedValues).toString(),
      Boolean(this.hideStereotypes).toString(),
    ]);
  }
}
