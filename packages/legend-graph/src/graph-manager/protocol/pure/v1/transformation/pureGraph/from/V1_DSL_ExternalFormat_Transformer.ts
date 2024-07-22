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

import { V1_ModelUnit } from '../../../model/packageableElements/externalFormat/store/V1_DSL_ExternalFormat_ModelUnit.js';
import type { ModelUnit } from '../../../../../../../graph/metamodel/pure/packageableElements/externalFormat/store/DSL_ExternalFormat_ModelUnit.js';
import { PackageableElementReference } from '../../../../../../../graph/metamodel/pure/packageableElements/PackageableElementReference.js';

export const V1_transformModelUnit = (metamodel: ModelUnit): V1_ModelUnit => {
  const modelUnit = new V1_ModelUnit();
  modelUnit.packageableElementExcludes =
    metamodel.packageableElementExcludes.map((path) =>
      path instanceof PackageableElementReference
        ? (path.valueForSerialization ?? '')
        : path,
    );
  modelUnit.packageableElementIncludes =
    metamodel.packageableElementIncludes.map((path) =>
      path instanceof PackageableElementReference
        ? (path.valueForSerialization ?? '')
        : path,
    );
  return modelUnit;
};
