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

import type { Multiplicity } from '../../../../../../metamodels/pure/packageableElements/domain/Multiplicity.js';
import type { PackageableElement } from '../../../../../../metamodels/pure/packageableElements/PackageableElement.js';
import type {
  OptionalPackageableElementReference,
  PackageableElementReference,
} from '../../../../../../metamodels/pure/packageableElements/PackageableElementReference.js';
import { V1_Multiplicity } from '../../../model/packageableElements/domain/V1_Multiplicity.js';
import {
  V1_PackageableElementPointer,
  type V1_PackageableElement,
} from '../../../model/packageableElements/V1_PackageableElement.js';

export const V1_transformOptionalElementReference = <
  T extends PackageableElement,
>(
  ref: OptionalPackageableElementReference<T>,
): string | undefined => ref.valueForSerialization;

export const V1_transformElementReference = <T extends PackageableElement>(
  ref: PackageableElementReference<T>,
): string => ref.valueForSerialization ?? '';

export const V1_transformElementReferencePointer = <
  T extends PackageableElement,
>(
  pointerType: string,
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
  const multiplicity = new V1_Multiplicity();
  multiplicity.lowerBound = element.lowerBound;
  multiplicity.upperBound = element.upperBound;
  return multiplicity;
};
