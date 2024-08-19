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

import packageJson from '../../package.json' with { type: 'json' };
import { Persistence } from '../graph/metamodel/pure/model/packageableElements/persistence/DSL_Persistence_Persistence.js';
import { PersistenceContext } from '../graph/metamodel/pure/model/packageableElements/persistence/DSL_Persistence_PersistenceContext.js';
import {
  observe_Persistence,
  observe_PersistenceTest,
} from './action/changeDetection/DSL_Persistence_ObserverHelper.js';
import { observe_PersistenceContext } from './action/changeDetection/DSL_PersistenceContext_ObserverHelper.js';
import {
  type AtomicTest,
  type AtomicTestObserver,
  type ElementObserver,
  type ObserverContext,
  type PackageableElement,
  PureGraphManagerPlugin,
  type Testable_PureGraphManagerPlugin_Extension,
} from '@finos/legend-graph';
import { PersistenceTest } from '../graph/metamodel/pure/model/packageableElements/persistence/DSL_Persistence_PersistenceTest.js';

export class DSL_Persistence_PureGraphManagerPlugin
  extends PureGraphManagerPlugin
  implements Testable_PureGraphManagerPlugin_Extension
{
  constructor() {
    super(packageJson.extensions.pureGraphManagerPlugin, packageJson.version);
  }

  override getExtraElementObservers(): ElementObserver[] {
    return [
      (
        element: PackageableElement,
        context: ObserverContext,
      ): PackageableElement | undefined => {
        if (element instanceof Persistence) {
          return observe_Persistence(element, context);
        } else if (element instanceof PersistenceContext) {
          return observe_PersistenceContext(element);
        }
        return undefined;
      },
    ];
  }

  getExtraAtomicTestObservers(): AtomicTestObserver[] {
    return [
      (
        element: AtomicTest,
        context: ObserverContext,
      ): AtomicTest | undefined => {
        if (element instanceof PersistenceTest) {
          return observe_PersistenceTest(element, context);
        }
        return undefined;
      },
    ];
  }
}
