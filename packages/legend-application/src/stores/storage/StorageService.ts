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

export class StorageStore {
  readonly storeIndex;
  readonly storageService: StorageService;
  private readonly data!: StorageStoreData;

  constructor(storageService: StorageService, storeIndex: string) {
    this.storageService = storageService;
    this.storeIndex = storeIndex;
    this.data = this.storageService.getIndex(this.storeIndex) ?? {};
  }

  getValue(key: string): StoredValue | undefined {
    return this.data[key];
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
    return isNonNullable(this.data[key]);
  }

  persistValue(key: string, value: StoredValue | undefined): void {
    if (value !== undefined) {
      this.data[key] = value;
    } else {
      delete this.data[key];
    }
    this.storageService.updateIndex(this.storeIndex, this.data);
  }
}

export class StorageService {
  readonly applicationStore: GenericLegendApplicationStore;
  private readonly storage: LocalStorage;
  private readonly data!: Record<string, StorageStoreData>;

  constructor(applicationStore: GenericLegendApplicationStore) {
    this.applicationStore = applicationStore;
    this.storage = new LocalStorage();
    const data = this.storage.getItem(
      applicationStore.config.applicationStorageKey,
    );
    this.data = data
      ? (returnUndefOnError(
          () => JSON.parse(data) as Record<string, StorageStoreData>,
        ) ?? {})
      : {};
  }

  getIndex(index: string): StorageStoreData | undefined {
    return this.data[index];
  }

  updateIndex(index: string, value: StorageStoreData): void {
    if (isEmpty(value)) {
      delete this.data[index];
    } else {
      this.data[index] = value;
    }
    this.storage.setItem(
      this.applicationStore.config.applicationStorageKey,
      JSON.stringify(this.data),
    );
  }
}
