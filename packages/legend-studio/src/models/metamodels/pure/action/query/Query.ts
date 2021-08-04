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

import type { Mapping } from '../../model/packageableElements/mapping/Mapping';
import type { PackageableElementReference } from '../../model/packageableElements/PackageableElementReference';
import type { PackageableRuntime } from '../../model/packageableElements/runtime/PackageableRuntime';

export class Query {
  name!: string;
  id!: string;
  projectId!: string;
  versionId!: string;
  mapping!: PackageableElementReference<Mapping>;
  runtime!: PackageableElementReference<PackageableRuntime>;
  owners: string[] = [];
  // NOTE: we decide to store the query in text because text format is more compact and stable than JSON
  content!: string;
}

export class LightQuery {
  name!: string;
  id!: string;
  projectId!: string;
  versionId!: string;
}
