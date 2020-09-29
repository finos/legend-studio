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

import { serializable, list, object } from 'serializr';
import { hashArray } from 'Utilities/HashUtil';
import { Hashable } from 'MetaModelUtility';
import { HASH_STRUCTURE } from 'MetaModelConst';
import { ClassView } from './ClassView';
import { PropertyView } from './PropertyView';
import { GeneralizationView } from './GeneralizationView';
import { PackageableElement, PackageableElementVisitor } from 'V1/model/packageableElements/PackageableElement';

export class Diagram extends PackageableElement implements Hashable {
  @serializable(list(object(ClassView))) classViews: ClassView[] = [];
  @serializable(list(object(PropertyView))) propertyViews: PropertyView[] = [];
  @serializable(list(object(GeneralizationView))) generalizationViews: GeneralizationView[] = [];

  get hashCode(): string {
    return hashArray([
      HASH_STRUCTURE.DIAGRAM,
      super.hashCode,
      hashArray(this.classViews),
      // TODO: association views
      hashArray(this.generalizationViews),
      hashArray(this.propertyViews),
    ]);
  }

  accept_PackageableElementVisitor<T>(visitor: PackageableElementVisitor<T>): T {
    return visitor.visit_Diagram(this);
  }
}
