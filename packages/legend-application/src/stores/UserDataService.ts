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

import { LogEvent, isObject } from '@finos/legend-shared';
import type { GenericLegendApplicationStore } from './ApplicationStore.js';
import { StorageStore } from './storage/StorageService.js';
import { APPLICATION_EVENT } from '../__lib__/LegendApplicationEvent.js';

const APPLICATION_USER_DATA_STORAGE_KEY = 'application-user-data-storage';

export class UserDataService {
  readonly applicationStore: GenericLegendApplicationStore;
  private readonly storage: StorageStore;

  constructor(applicationStore: GenericLegendApplicationStore) {
    this.applicationStore = applicationStore;
    this.storage = new StorageStore(
      this.applicationStore.storageService,
      APPLICATION_USER_DATA_STORAGE_KEY,
    );
  }

  getValue(key: string): object | undefined {
    const value = this.storage.getValue(key);
    if (!isObject(value)) {
      this.applicationStore.logService.warn(
        LogEvent.create(APPLICATION_EVENT.USER_DATA_RETRIEVE_FAILURE),
        `Can't retrieve cache value for '${key}'`,
      );
      return undefined;
    }
    return value;
  }

  persistValue(key: string, value: object | undefined): void {
    this.storage.persistValue(key, value);
  }
}
