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
  LogEvent,
  isBoolean,
  isNumber,
  isObject,
  isString,
} from '@finos/legend-shared';
import type { GenericLegendApplicationStore } from './ApplicationStore.js';
import { StorageStore } from './storage/StorageService.js';
import { APPLICATION_EVENT } from '../__lib__/LegendApplicationEvent.js';

type UserDataValue = object | string | number | boolean;

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

  getNumericValue(key: string): number | undefined {
    const value = this.storage.getValue(key);
    if (value !== undefined && !isNumber(value)) {
      this.applicationStore.logService.warn(
        LogEvent.create(APPLICATION_EVENT.USER_DATA_RETRIEVE_FAILURE),
        `Can't retrieve numeric value for user data '${key}'`,
      );
      return undefined;
    }
    return value;
  }

  getStringValue(key: string): string | undefined {
    const value = this.storage.getValue(key);
    if (value !== undefined && !isString(value)) {
      this.applicationStore.logService.warn(
        LogEvent.create(APPLICATION_EVENT.USER_DATA_RETRIEVE_FAILURE),
        `Can't retrieve string value for user data '${key}'`,
      );
      return undefined;
    }
    return value;
  }

  getBooleanValue(key: string): boolean | undefined {
    const value = this.storage.getValue(key);
    if (value !== undefined && !isBoolean(value)) {
      this.applicationStore.logService.warn(
        LogEvent.create(APPLICATION_EVENT.USER_DATA_RETRIEVE_FAILURE),
        `Can't retrieve boolean value for user data '${key}'`,
      );
      return undefined;
    }
    return value;
  }

  getObjectValue(key: string): object | undefined {
    const value = this.storage.getValue(key);
    if (value !== undefined && !isObject(value)) {
      this.applicationStore.logService.warn(
        LogEvent.create(APPLICATION_EVENT.USER_DATA_RETRIEVE_FAILURE),
        `Can't retrieve object value for user data '${key}'`,
      );
      return undefined;
    }
    return value;
  }

  persistValue(key: string, value: UserDataValue | undefined): void {
    this.storage.persistValue(key, value);
  }
}
