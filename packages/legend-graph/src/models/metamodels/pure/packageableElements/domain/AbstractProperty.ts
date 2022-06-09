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

import type { Hashable } from '@finos/legend-shared';
import type { GenericTypeReference } from './GenericTypeReference.js';
import type { Multiplicity } from './Multiplicity.js';
import type { Class } from './Class.js';
import type { Association } from './Association.js';
import type { AnnotatedElement } from './AnnotatedElement.js';

// NOTE: In PURE we have `Class` and `Association` extends `PropertyOwner`, which extends `PackageableElement`
export type PropertyOwner = Class | Association;

export interface AbstractProperty extends Hashable, AnnotatedElement {
  _OWNER: PropertyOwner;

  name: string;
  genericType: GenericTypeReference;
  multiplicity: Multiplicity;
}
