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

import { makeObservable, override } from 'mobx';
import type { ExecutionEnvironmentInstance } from '../../../graph/metamodel/pure/packageableElements/service/ExecutionEnvironmentInstance.js';
import {
  observe_Abstract_PackageableElement,
  skipObservedWithContext,
} from './CoreObserverHelper.js';

export const observe_ExecutionEnvironmentInstance = skipObservedWithContext(
  (
    metamodel: ExecutionEnvironmentInstance,
    context,
  ): ExecutionEnvironmentInstance => {
    observe_Abstract_PackageableElement(metamodel);

    makeObservable<ExecutionEnvironmentInstance, '_elementHashCode'>(
      metamodel,
      {
        _elementHashCode: override,
      },
    );
    // TODO once form is implemented
    return metamodel;
  },
);
