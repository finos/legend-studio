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

import type { Diagram } from './DSL_Diagram_Diagram.js';
import type { ClassView } from './DSL_Diagram_ClassView.js';
import {
  PackageableElementExplicitReference,
  ReferenceWithOwner,
  type PackageableElementImplicitReference,
  type PackageableElementReference,
} from '@finos/legend-graph';

export abstract class ClassViewReference extends ReferenceWithOwner {
  override readonly ownerReference: PackageableElementReference<Diagram>;
  value: ClassView;

  protected constructor(
    ownerReference: PackageableElementReference<Diagram>,
    value: ClassView,
  ) {
    super(ownerReference);
    this.ownerReference = ownerReference;
    this.value = value;
  }
}

export class ClassViewExplicitReference extends ClassViewReference {
  override readonly ownerReference: PackageableElementExplicitReference<Diagram>;

  private constructor(value: ClassView) {
    const ownerReference = PackageableElementExplicitReference.create(
      value._OWNER,
    );
    super(ownerReference, value);
    this.ownerReference = ownerReference;
  }

  static create(value: ClassView): ClassViewExplicitReference {
    return new ClassViewExplicitReference(value);
  }
}

export class ClassViewImplicitReference extends ClassViewReference {
  override readonly ownerReference: PackageableElementImplicitReference<Diagram>;

  private constructor(
    ownerReference: PackageableElementImplicitReference<Diagram>,
    value: ClassView,
  ) {
    super(ownerReference, value);
    this.ownerReference = ownerReference;
  }

  static create(
    ownerReference: PackageableElementImplicitReference<Diagram>,
    value: ClassView,
  ): ClassViewImplicitReference {
    return new ClassViewImplicitReference(ownerReference, value);
  }
}
