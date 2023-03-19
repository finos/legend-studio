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
} from '@finos/legend-shared';
import type { GenericLegendApplicationStore } from '../ApplicationStore.js';
import { LocalStorage } from './ApplicationStorage.js';

type StoredValue = object | string | number | boolean;

export class StorageStore {
  readonly storeIndex;
  readonly storageService: StorageService;
  private readonly data!: Record<PropertyKey, StoredValue>;

  constructor(storageService: StorageService, storeIndex: string) {
    this.storageService = storageService;
    this.storeIndex = storeIndex;
    const store = this.storageService.storage.getItem(this.storeIndex);

    if (store) {
      const data = JSON.parse(store) as Record<PropertyKey, StoredValue>;
      this.data = data;
    } else {
      this.data = {};
    }
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
    this.storageService.storage.setItem(
      this.storeIndex,
      JSON.stringify(this.data),
    );
  }
}

export class StorageService {
  readonly applicationStore: GenericLegendApplicationStore;
  readonly storage: LocalStorage;

  constructor(applicationStore: GenericLegendApplicationStore) {
    this.applicationStore = applicationStore;
    this.storage = new LocalStorage();
  }
}
