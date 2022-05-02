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

import type { Persistence } from '../../../../../metamodels/pure/model/packageableElements/persistence/DSLPersistence_Persistence';
import { getPersistence } from '../../../../../../graphManager/DSLPersistence_GraphManagerHelper';
import type {
  PackageableElementImplicitReference,
  V1_GraphBuilderContext,
} from '@finos/legend-graph';

export const V1_resolvePersistence = (
  path: string,
  context: V1_GraphBuilderContext,
): PackageableElementImplicitReference<Persistence> =>
  context.createImplicitPackageableElementReference(path, (_path: string) =>
    getPersistence(_path, context.graph),
  );
