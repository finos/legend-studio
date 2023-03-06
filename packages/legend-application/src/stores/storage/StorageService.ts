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
  readonly key = APPLICATION_SETTINGS_STORAGE_KEY;
  readonly storage: LocalStorage;
  readonly storageService!: StorageService;
  private value!: Record<PropertyKey, StoredValue>;

  constructor() {
    this.storage = new LocalStorage();
    const storage = this.storage.getItem(this.key);
    if (storage) {
      const data = JSON.parse(storage) as Record<PropertyKey, StoredValue>;
      this.value = data;
    } else {
      this.value = {};
    }
  }

  private getValue(key: string, defaultValue: StoredValue): StoredValue {
    return this.value[key] ?? defaultValue;
  }

  getNumberValue(key: string, defaultValue: number): number {
    const storedValue = this.getValue(key, defaultValue);
    return guaranteeIsNumber(storedValue);
  }

  getStringValue(key: string, defaultValue: string): string {
    const storedValue = this.getValue(key, defaultValue);
    return guaranteeIsString(storedValue);
  }

  getBooleanValue(key: string, defaultValue: boolean): boolean {
    const storedValue = this.getValue(key, defaultValue);
    return guaranteeIsBoolean(storedValue);
  }

  getObjectValue(key: string, defaultValue: object): object {
    const storedValue = this.getValue(key, defaultValue);
    return guaranteeIsObject(storedValue);
  }

  persist(key: string, value: StoredValue): void {
    this.value[key] = value;
    this.storage.setItem(this.key, JSON.stringify(this.value));
  }
}

export class StorageService {
  readonly applicationStore: GenericLegendApplicationStore;
  settingsStore!: StorageStore;

  constructor(applicationStore: GenericLegendApplicationStore) {
    this.applicationStore = applicationStore;
    this.settingsStore = new StorageStore();
  }
}
