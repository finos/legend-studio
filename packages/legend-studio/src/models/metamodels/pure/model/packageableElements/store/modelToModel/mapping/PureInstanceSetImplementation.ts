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

import { observable, action, computed, makeObservable } from 'mobx';
import { hashArray } from '@finos/legend-studio-shared';
import type { Hashable } from '@finos/legend-studio-shared';
import { CORE_HASH_STRUCTURE } from '../../../../../../../MetaModelConst';
import type { Class } from '../../../../../model/packageableElements/domain/Class';
import { InstanceSetImplementation } from '../../../../../model/packageableElements/mapping/InstanceSetImplementation';
import type { PurePropertyMapping } from '../../../../../model/packageableElements/store/modelToModel/mapping/PurePropertyMapping';
import type { SetImplementationVisitor } from '../../../../../model/packageableElements/mapping/SetImplementation';
import type { Stubable } from '../../../../../model/Stubable';
import { isStubArray } from '../../../../../model/Stubable';
import type { RawLambda } from '../../../../../model/rawValueSpecification/RawLambda';
import type {
  PackageableElementReference,
  OptionalPackageableElementReference,
} from '../../../../../model/packageableElements/PackageableElementReference';
import type { InferableMappingElementIdValue } from '../../../../../model/packageableElements/mapping/InferableMappingElementId';
import type { Mapping } from '../../../../../model/packageableElements/mapping/Mapping';
import type { InferableMappingElementRoot } from '../../../../../model/packageableElements/mapping/InferableMappingElementRoot';

export class PureInstanceSetImplementation
  extends InstanceSetImplementation
  implements Hashable, Stubable
{
  srcClass: OptionalPackageableElementReference<Class>;
  filter?: RawLambda; // @MARKER GENERATED MODEL DISCREPANCY --- Studio does not process lambda
  declare propertyMappings: PurePropertyMapping[];

  constructor(
    id: InferableMappingElementIdValue,
    parent: Mapping,
    _class: PackageableElementReference<Class>,
    root: InferableMappingElementRoot,
    srcClass: OptionalPackageableElementReference<Class>,
  ) {
    super(id, parent, _class, root);

    makeObservable(this, {
      filter: observable,
      setPropertyMappings: action,
      setSrcClass: action,
      isStub: computed,
      hashCode: computed,
    });

    this.srcClass = srcClass;
  }

  setPropertyMappings(value: PurePropertyMapping[]): void {
    this.propertyMappings = value;
  }
  setSrcClass(value: Class | undefined): void {
    this.srcClass.setValue(value);
  }

  findPropertyMapping(
    propertyName: string,
    targetId: string | undefined,
  ): PurePropertyMapping | undefined {
    let properties = undefined;
    properties = this.propertyMappings.filter(
      (propertyMapping) => propertyMapping.property.value.name === propertyName,
    );
    if (targetId === undefined || properties.length === 1) {
      return properties[0];
    }
    return properties.find(
      (propertyMapping) =>
        propertyMapping.targetSetImplementation &&
        propertyMapping.targetSetImplementation.id.value === targetId,
    );
  }

  get isStub(): boolean {
    return super.isStub && isStubArray(this.propertyMappings);
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.PURE_INSTANCE_SET_IMPLEMENTATION,
      super.hashCode,
      this.srcClass.valueForSerialization ?? '',
      this.filter ?? '',
      hashArray(
        this.propertyMappings.filter(
          (propertyMapping) => !propertyMapping.isStub,
        ),
      ),
    ]);
  }

  accept_SetImplementationVisitor<T>(visitor: SetImplementationVisitor<T>): T {
    return visitor.visit_PureInstanceSetImplementation(this);
  }

  getEmbeddedSetImplmentations(): InstanceSetImplementation[] {
    return [];
  }
}
