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

import {
  getSchemaSet,
  getBinding,
} from '../../../../../../helpers/DSL_ExternalFormat_GraphManagerHelper.js';
import type { PackageableElementImplicitReference } from '../../../../../../../graph/metamodel/pure/packageableElements/PackageableElementReference.js';
import type { SchemaSet } from '../../../../../../../graph/metamodel/pure/packageableElements/externalFormat/schemaSet/DSL_ExternalFormat_SchemaSet.js';
import type { Binding } from '../../../../../../../graph/metamodel/pure/packageableElements/externalFormat/store/DSL_ExternalFormat_Binding.js';
import type { V1_GraphBuilderContext } from './V1_GraphBuilderContext.js';

export const V1_resolveSchemaSet = (
  path: string,
  context: V1_GraphBuilderContext,
): PackageableElementImplicitReference<SchemaSet> =>
  context.createImplicitPackageableElementReference(path, (_path: string) =>
    getSchemaSet(_path, context.graph),
  );

export const V1_resolveBinding = (
  path: string,
  context: V1_GraphBuilderContext,
): PackageableElementImplicitReference<Binding> =>
  context.createImplicitPackageableElementReference(path, (_path: string) =>
    getBinding(_path, context.graph),
  );
