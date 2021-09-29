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
import { hashArray } from '@finos/legend-shared';
import type { Hashable } from '@finos/legend-shared';
import { CORE_HASH_STRUCTURE } from '../../../../../../../MetaModelConst';
import type { Class } from '../../../domain/Class';
import { InstanceSetImplementation } from '../../../mapping/InstanceSetImplementation';
import type { PurePropertyMapping } from './PurePropertyMapping';
import type { SetImplementationVisitor } from '../../../mapping/SetImplementation';
import type { Stubable } from '../../../../../../../helpers/Stubable';
import { isStubArray } from '../../../../../../../helpers/Stubable';
import type { RawLambda } from '../../../../rawValueSpecification/RawLambda';
import type {
  PackageableElementReference,
  OptionalPackageableElementReference,
} from '../../../PackageableElementReference';
import type { InferableMappingElementIdValue } from '../../../mapping/InferableMappingElementId';
import type { Mapping } from '../../../mapping/Mapping';
import type { InferableMappingElementRoot } from '../../../mapping/InferableMappingElementRoot';

export class PureInstanceSetImplementation
  extends InstanceSetImplementation
  implements Hashable, Stubable
{
  srcClass: OptionalPackageableElementReference<Class>;
  filter?: RawLambda | undefined; // @MARKER GENERATED MODEL DISCREPANCY --- Studio does not process lambda
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
      setMappingFilter: action,
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
  setMappingFilter(value: RawLambda | undefined): void {
    this.filter = value;
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

  override get isStub(): boolean {
    return super.isStub && isStubArray(this.propertyMappings);
  }

  override get hashCode(): string {
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
