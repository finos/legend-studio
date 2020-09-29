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

import { computed, observable, action } from 'mobx';
import { hashArray } from 'Utilities/HashUtil';
import { Hashable } from 'MetaModelUtility';
import { HASH_STRUCTURE } from 'MetaModelConst';
import { Class } from 'MM/model/packageableElements/domain/Class';
import { PositionedRectangle } from './geometry/PositionedRectangle';
import { Rectangle } from './geometry/Rectangle';
import { Point } from './geometry/Point';
import { PackageableElementReference } from 'MM/model/packageableElements/PackageableElementReference';
import { Diagram } from 'MM/model/packageableElements/diagram/Diagram';

export class ClassView extends PositionedRectangle implements Hashable {
  owner: Diagram;
  class: PackageableElementReference<Class>;
  @observable id: string;
  @observable hideProperties = false;
  @observable hideTaggedValues = false;
  @observable hideStereotypes = false;

  constructor(owner: Diagram, id: string, _class: PackageableElementReference<Class>) {
    super(new Point(0, 0), new Rectangle(0, 0));
    this.owner = owner;
    this.id = id;
    this.class = _class;
  }

  @action setHideProperties(val: boolean): void { this.hideProperties = val }
  @action setHideStereotypes(val: boolean): void { this.hideStereotypes = val }
  @action setHideTaggedValues(val: boolean): void { this.hideTaggedValues = val }

  @computed get hashCode(): string {
    return hashArray([
      HASH_STRUCTURE.CLASS_VIEW,
      super.hashCode,
      this.id,
      this.class.valueForSerialization,
      Boolean(this.hideProperties).toString(),
      Boolean(this.hideTaggedValues).toString(),
      Boolean(this.hideStereotypes).toString(),
    ]);
  }
}
