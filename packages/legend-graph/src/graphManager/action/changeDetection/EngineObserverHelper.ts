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

import { action, makeObservable, observable } from 'mobx';
import type { TEMPORARY__AbstractEngineConfig } from '../TEMPORARY__AbstractEngineConfig.js';
import { skipObserved } from './CoreObserverHelper.js';

export const observe_TEMPORARY__AbstractEngineConfig = skipObserved(
  (
    metamodel: TEMPORARY__AbstractEngineConfig,
  ): TEMPORARY__AbstractEngineConfig =>
    makeObservable(metamodel, {
      env: observable,
      currentUserId: observable,
      baseUrl: observable,
      useClientRequestPayloadCompression: observable,
      useBase64ForAdhocConnectionDataUrls: observable,
      setEnv: action,
      setCurrentUserId: action,
      setBaseUrl: action,
      setUseClientRequestPayloadCompression: action,
      setUseBase64ForAdhocConnectionDataUrls: action,
    }),
);
