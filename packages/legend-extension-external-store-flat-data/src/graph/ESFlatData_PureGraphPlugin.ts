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
import type { Clazz } from '@finos/legend-shared';
import {
  type PackageableElement,
  type DSLMapping_PureGraphPlugin_Extension,
  type InstanceSetImplementationChecker,
  type AssociationImplementation,
  type EnumerationMapping,
  type SetImplementation,
  PureGraphPlugin,
} from '@finos/legend-graph';
import { FlatData } from '../models/metamodels/pure/model/store/flatData/model/ESFlatData_FlatData.js';
import { EmbeddedFlatDataPropertyMapping } from '../models/metamodels/pure/model/store/flatData/mapping/ESFlatData_EmbeddedFlatDataPropertyMapping.js';

export class ESFlatData_PureGraphPlugin
  extends PureGraphPlugin
  implements DSLMapping_PureGraphPlugin_Extension
{
  constructor() {
    super(packageJson.extensions.pureGraphPlugin, packageJson.version);
  }

  override getExtraPureGraphExtensionClasses(): Clazz<PackageableElement>[] {
    return [FlatData];
  }

  getExtraInstanceSetImplementationCheckers(): InstanceSetImplementationChecker[] {
    return [
      (
        setImplementation:
          | EnumerationMapping
          | SetImplementation
          | AssociationImplementation,
      ): boolean | undefined => {
        if (setImplementation instanceof EmbeddedFlatDataPropertyMapping) {
          return true;
        }
        return undefined;
      },
    ];
  }
}
