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

import { computed, makeObservable, observable } from 'mobx';
import type { SnowflakeAppDeploymentConfiguration } from '../../../graph/metamodel/pure/functionActivator/SnowflakeAppDeploymentConfiguration.js';
import { skipObserved } from './CoreObserverHelper.js';
import { observe_ConnectionPointer } from './DSL_Mapping_ObserverHelper.js';
import type { DeploymentOwner } from '../../../graph/metamodel/pure/packageableElements/function/Ownership.js';

export const observe_SnowflakeAppDeploymentConfiguration = skipObserved(
  (
    metamodel: SnowflakeAppDeploymentConfiguration,
  ): SnowflakeAppDeploymentConfiguration => {
    makeObservable(metamodel, {
      activationConnection: observable,
    });

    if (metamodel.activationConnection) {
      observe_ConnectionPointer(metamodel.activationConnection);
    }

    return metamodel;
  },
);

export const observe_DeploymentOwnership = skipObserved(
  (metamodel: DeploymentOwner): DeploymentOwner => {
    makeObservable(metamodel, {
      id: observable,
      hashCode: computed,
    });
    return metamodel;
  },
);
