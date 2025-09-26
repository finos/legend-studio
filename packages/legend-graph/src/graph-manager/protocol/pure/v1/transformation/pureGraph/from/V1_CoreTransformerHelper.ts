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

import type { Multiplicity } from '../../../../../../../graph/metamodel/pure/packageableElements/domain/Multiplicity.js';
import type { PackageableElement } from '../../../../../../../graph/metamodel/pure/packageableElements/PackageableElement.js';
import type { PackageableElementReference } from '../../../../../../../graph/metamodel/pure/packageableElements/PackageableElementReference.js';
import { V1_Multiplicity } from '../../../model/packageableElements/domain/V1_Multiplicity.js';
import {
  V1_PackageableElementPointer,
  type V1_PackageableElement,
} from '../../../model/packageableElements/V1_PackageableElement.js';

export const V1_transformElementReferencePointer = <
  T extends PackageableElement,
>(
  pointerType: string | undefined,
  ref: PackageableElementReference<T>,
): V1_PackageableElementPointer =>
  new V1_PackageableElementPointer(
    pointerType,
    ref.valueForSerialization ?? '',
  );

export const V1_initPackageableElement = (
  protocolElement: V1_PackageableElement,
  element: PackageableElement,
): void => {
  protocolElement.name = element.name;
  protocolElement.package = element.package?.path ?? '';
};

export const V1_transformMultiplicity = (
  element: Multiplicity,
): V1_Multiplicity => {
  const multiplicity = new V1_Multiplicity(
    element.lowerBound,
    element.upperBound,
  );
  return multiplicity;
};
