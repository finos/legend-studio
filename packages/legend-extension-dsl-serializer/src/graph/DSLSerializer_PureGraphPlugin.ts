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

import packageJson from '../../package.json';
import { Binding } from '../models/metamodels/pure/model/packageableElements/store/Binding';
import { SchemaSet } from '../models/metamodels/pure/model/packageableElements/schemaSet/SchemaSet';
import type { Clazz } from '@finos/legend-shared';
import type { PackageableElement } from '@finos/legend-graph';
import { PureGraphPlugin } from '@finos/legend-graph';

export class DSLSerializer_PureGraphPlugin extends PureGraphPlugin {
  constructor() {
    super(packageJson.extensions.pureGraphPlugin, packageJson.version);
  }

  override getExtraPureGraphExtensionClasses(): Clazz<PackageableElement>[] {
    return [Binding, SchemaSet];
  }
}
