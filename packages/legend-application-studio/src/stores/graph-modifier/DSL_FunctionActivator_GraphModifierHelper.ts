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
  observe_RestServiceOwnership,
  type RestDeploymentOwnership,
  type RestService,
  type RestServiceOwnership,
  DEFAULT_REST_SERVICE_PATTERN,
} from '@finos/legend-graph';
import { action } from 'mobx';

export const restService_setOwnership = action(
  (restService: RestService, value: RestServiceOwnership | undefined): void => {
    restService.ownership = value
      ? observe_RestServiceOwnership(value)
      : undefined;
  },
);

export const restService_deploymentOwnership = action(
  (restService: RestDeploymentOwnership, val: string): void => {
    restService.id = val;
  },
);

export const restService_setDocumentation = action(
  (restService: RestService, val: string): void => {
    restService.documentation = val;
  },
);

export const restService_setAutoActivateUpdates = action(
  (restService: RestService, val: boolean): void => {
    restService.autoActivateUpdates = val;
  },
);

export const restService_setPattern = action(
  (restService: RestService, val: string): void => {
    restService.pattern = val;
  },
);

export const restService_removePatternParameter = action(
  (restService: RestService, value: string): void => {
    const newPattern = restService.pattern
      .replace(new RegExp(`\\/\\{${value}\\}`, 'ug'), '')
      .replace(/\/{2,}/gu, '/');
    restService.pattern =
      newPattern !== '' ? newPattern : DEFAULT_REST_SERVICE_PATTERN;
  },
);

export const restService_setStoreModel = action(
  (restService: RestService, val: boolean): void => {
    restService.storeModel = val;
  },
);

export const restService_setGenerateLineage = action(
  (restService: RestService, val: boolean): void => {
    restService.generateLineage = val;
  },
);

export const restService_setHost = action(
  (restService: RestService, val: string): void => {
    restService.activationConfiguration.host = val;
  },
);

export const restService_setPort = action(
  (restService: RestService, val: number): void => {
    restService.activationConfiguration.port = val;
  },
);

export const restService_setPath = action(
  (restService: RestService, val: string): void => {
    restService.activationConfiguration.path = val;
  },
);
