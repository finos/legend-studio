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

import {
  observe_Abstract_PackageableElement,
  observe_ConnectionPointer,
  skipObserved,
} from '@finos/legend-graph';
import { makeObservable, observable, override } from 'mobx';
import type { SnowflakeApp } from '../../../graph/metamodel/pure/model/packageableElements/snowflakeApp/DSL_SnowflakeApp_SnowflakeApp.js';
import type { SnowflakeAppDeploymentConfiguration } from '../../../graph/metamodel/pure/model/functionActivator/DSL_SnowflakeApp_SnowflakeAppDeploymentConfiguration.js';

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

export const observe_SnowflakeApp = skipObserved(
  (metamodel: SnowflakeApp): SnowflakeApp => {
    observe_Abstract_PackageableElement(metamodel);

    makeObservable<SnowflakeApp, '_elementHashCode'>(metamodel, {
      applicationName: observable,
      description: observable,
      owner: observable,
      activationConfiguration: observable,
      type: observable,
      _elementHashCode: override,
    });

    observe_SnowflakeAppDeploymentConfiguration(
      metamodel.activationConfiguration,
    );
    return metamodel;
  },
);
