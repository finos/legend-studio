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
import { Persistence } from './metamodel/pure/model/packageableElements/persistence/DSL_Persistence_Persistence.js';
import { PersistenceContext } from './metamodel/pure/model/packageableElements/persistence/DSL_Persistence_PersistenceContext.js';
import {
  type PackageableElement,
  PureGraphPlugin,
  type PureModel,
  type TestablesCollector,
  type Testable,
} from '@finos/legend-graph';
import { type Clazz, filterByType } from '@finos/legend-shared';

export class DSL_Persistence_PureGraphPlugin extends PureGraphPlugin {
  constructor() {
    super(packageJson.extensions.pureGraphPlugin, packageJson.version);
  }

  override getExtraPureGraphExtensionClasses(): Clazz<PackageableElement>[] {
    return [Persistence, PersistenceContext];
  }

  override getExtraTestablesCollectors(): TestablesCollector[] {
    return [
      (graph: PureModel): Testable[] =>
        graph.allElements.filter(filterByType(Persistence)),
    ];
  }
}
