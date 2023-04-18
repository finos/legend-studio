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
import { MasterRecordDefinition } from '../graph/metamodel/pure/model/packageableElements/mastery/DSL_Mastery_MasterRecordDefinition.js';
import { observe_Mastery } from './action/changeDetection/DSL_Mastery_ObserverHelper.js';
import {
  PureGraphManagerPlugin,
  type PackageableElement,
  type ElementObserver,
  type ObserverContext,
} from '@finos/legend-graph';

export class DSL_Mastery_PureGraphManagerPlugin extends PureGraphManagerPlugin {
  constructor() {
    super(packageJson.extensions.pureGraphManagerPlugin, packageJson.version);
  }

  override getExtraElementObservers(): ElementObserver[] {
    return [
      (
        element: PackageableElement,
        context: ObserverContext,
      ): PackageableElement | undefined => {
        if (element instanceof MasterRecordDefinition) {
          return observe_Mastery(element);
        }
        return undefined;
      },
    ];
  }
}
