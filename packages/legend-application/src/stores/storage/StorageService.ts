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
} from '@finos/legend-shared';
import type { GenericLegendApplicationStore } from '../ApplicationStore.js';
import { LocalStorage } from './ApplicationStorage.js';

const APPLICATION_SETTINGS_STORAGE_KEY = 'application-settings-storage';

type StoredValue = object | string | number | boolean;

class StorageStore {
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

  private getValue(key: string, defaultValue: StoredValue): StoredValue {
    return this.data[key] ?? defaultValue;
  }

  getNumberValue(key: string, defaultValue: number): number {
    return guaranteeIsNumber(this.getValue(key, defaultValue));
  }

  getStringValue(key: string, defaultValue: string): string {
    return guaranteeIsString(this.getValue(key, defaultValue));
  }

  getBooleanValue(key: string, defaultValue: boolean): boolean {
    return guaranteeIsBoolean(this.getValue(key, defaultValue));
  }

  getObjectValue(key: string, defaultValue: object): object {
    return guaranteeIsObject(this.getValue(key, defaultValue));
  }

  persist(key: string, value: StoredValue): void {
    this.data[key] = value;
    this.storageService.storage.setItem(
      this.storeIndex,
      JSON.stringify(this.data),
    );
  }
}

export class StorageService {
  readonly applicationStore: GenericLegendApplicationStore;
  readonly storage: LocalStorage;
  readonly settingsStore: StorageStore;

  constructor(applicationStore: GenericLegendApplicationStore) {
    this.applicationStore = applicationStore;
    this.storage = new LocalStorage();
    this.settingsStore = new StorageStore(
      this,
      APPLICATION_SETTINGS_STORAGE_KEY,
    );
  }
}
