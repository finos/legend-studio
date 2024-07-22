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

import { returnUndefOnError } from '@finos/legend-shared';
import { ConfigurationProperty } from '../../../../../../../../graph/metamodel/pure/packageableElements/fileGeneration/ConfigurationProperty.js';
import type { PackageableElement } from '../../../../../../../../graph/metamodel/pure/packageableElements/PackageableElement.js';
import {
  type PackageableElementReference,
  PackageableElementExplicitReference,
} from '../../../../../../../../graph/metamodel/pure/packageableElements/PackageableElementReference.js';
import type { V1_GraphBuilderContext } from '../../../../transformation/pureGraph/to/V1_GraphBuilderContext.js';
import type { V1_ConfigurationProperty } from '../../../../model/packageableElements/fileGeneration/V1_ConfigurationProperty.js';

export const V1_buildConfigurationProperty = (
  propSpec: V1_ConfigurationProperty,
): ConfigurationProperty =>
  new ConfigurationProperty(propSpec.name, propSpec.value);

// NOTE: we allow the scope element to be a string so that file generation can compile if it has scope elements depending on generated models.
// This is allowed because file generation is the LAST step of generation.
// We resolve first by looking at the packages, then the elements. This prevents us from resolving something like `test` to
// 'meta::pure::profiles::test` instead of the package `test` in the user project.
export const V1_buildScopeElement = (
  path: string,
  context: V1_GraphBuilderContext,
): PackageableElementReference<PackageableElement> | string => {
  const _package = context.graph.getNullablePackage(path);
  return _package
    ? // NOTE: this is always intended to be provided as full path by user and it's always explicit
      PackageableElementExplicitReference.create(_package)
    : (returnUndefOnError(() => context.resolveElement(path, false)) ?? path);
};
