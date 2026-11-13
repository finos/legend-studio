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
  guaranteeIsNumber,
  guaranteeIsString,
  guaranteeIsBoolean,
  guaranteeIsObject,
  isNonNullable,
  returnUndefOnError,
  isEmpty,
} from '@finos/legend-shared';
import type { GenericLegendApplicationStore } from '../ApplicationStore.js';
import { LocalStorage } from './ApplicationStorage.js';

type StoredValue = object | string | number | boolean;
type StorageStoreData = Record<PropertyKey, StoredValue>;
type StorageData = Record<string, StorageStoreData>;

export class StorageStore {
  readonly storeIndex;
  readonly storageService: StorageService;

  constructor(storageService: StorageService, storeIndex: string) {
    this.storageService = storageService;
    this.storeIndex = storeIndex;
  }

  getValue(key: string): StoredValue | undefined {
    // NOTE: always read through the service, its data is reloaded when
    // another tab of the application saves
    return this.storageService.getIndex(this.storeIndex)?.[key];
  }

  getNumericValue(key: string): number | undefined {
    const value = this.getValue(key);
    return value !== undefined ? guaranteeIsNumber(value) : undefined;
  }

  getStringValue(key: string): string | undefined {
    const value = this.getValue(key);
    return value !== undefined ? guaranteeIsString(value) : undefined;
  }

  getBooleanValue(key: string): boolean | undefined {
    const value = this.getValue(key);
    return value !== undefined ? guaranteeIsBoolean(value) : undefined;
  }

  getObjectValue(key: string): object | undefined {
    const value = this.getValue(key);
    return value !== undefined ? guaranteeIsObject(value) : undefined;
  }

  hasValue(key: string): boolean {
    return isNonNullable(this.getValue(key));
  }

  persistValue(key: string, value: StoredValue | undefined): void {
    this.storageService.updateValue(this.storeIndex, key, value);
  }
}

/**
 * The application keeps all its data in a single entry of the local storage,
 * which is shared by all the tabs where the application is open. So that a tab
 * does not overwrite what other tabs saved after it loaded, each save reads the
 * entry again and only changes the saved index (or key), and the data is
 * reloaded when another tab saves.
 */
export class StorageService {
  readonly applicationStore: GenericLegendApplicationStore;
  private readonly storage: LocalStorage;
  private data: StorageData;

  constructor(applicationStore: GenericLegendApplicationStore) {
    this.applicationStore = applicationStore;
    this.storage = new LocalStorage();
    this.data = this.readData();
    // NOTE: the browser fires this event in the other tabs, not in the one
    // which changed the storage
    window.addEventListener('storage', this.handleStorageEvent);
  }

  private get storageKey(): string {
    return this.applicationStore.config.applicationStorageKey;
  }

  private readonly handleStorageEvent = (event: StorageEvent): void => {
    if (
      event.storageArea === window.localStorage &&
      // NOTE: the key is `null` when the storage is cleared
      (event.key === null || event.key === this.storageKey)
    ) {
      this.data = this.readData();
    }
  };

  private readData(): StorageData {
    const data = this.storage.getItem(this.storageKey);
    return data
      ? (returnUndefOnError(() => JSON.parse(data) as StorageData) ?? {})
      : {};
  }

  private writeData(data: StorageData): void {
    this.storage.setItem(this.storageKey, JSON.stringify(data));
    this.data = data;
  }

  getIndex(index: string): StorageStoreData | undefined {
    return this.data[index];
  }

  updateIndex(index: string, value: StorageStoreData): void {
    const data = this.readData();
    if (isEmpty(value)) {
      delete data[index];
    } else {
      data[index] = value;
    }
    this.writeData(data);
  }

  updateValue(
    index: string,
    key: string,
    value: StoredValue | undefined,
  ): void {
    const data = this.readData();
    const indexData = data[index] ?? {};
    if (value !== undefined) {
      indexData[key] = value;
    } else {
      delete indexData[key];
    }
    if (isEmpty(indexData)) {
      delete data[index];
    } else {
      data[index] = indexData;
    }
    this.writeData(data);
  }
}
