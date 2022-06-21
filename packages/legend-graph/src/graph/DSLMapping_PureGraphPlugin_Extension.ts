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

import type { AssociationImplementation } from './metamodel/pure/packageableElements/mapping/AssociationImplementation.js';
import type { EnumerationMapping } from './metamodel/pure/packageableElements/mapping/EnumerationMapping.js';
import type { SetImplementation } from './metamodel/pure/packageableElements/mapping/SetImplementation.js';
import { PureGraphPlugin } from './PureGraphPlugin.js';

export type InstanceSetImplementationChecker = (
  setImplementation:
    | EnumerationMapping
    | SetImplementation
    | AssociationImplementation,
) => boolean | undefined;

export abstract class DSLMapping_PureGraphPlugin_Extension extends PureGraphPlugin {
  getExtraInstanceSetImplementationCheckers?(): InstanceSetImplementationChecker[];
}
