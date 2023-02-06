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
  type PlainObject,
  SerializationFactory,
  usingModelSchema,
} from '@finos/legend-shared';
import { createModelSchema, list, primitive } from 'serializr';
import type { GenericLegendApplicationStore } from '../ApplicationStore.js';
import { LocalStorage } from './LocalStorage.js';

const APPLICATION_SETTINGS_STORAGE_KEY = 'application-settings-storage';

export class StorageItem {
  key!: string;
  value!: string;

  constructor(key: string, value: string) {
    this.key = key;
    this.value = value;
  }

  static create(key: string, value: string): StorageItem {
    return new StorageItem(key, value);
  }
}

const storageItemModelSchema = createModelSchema(StorageItem, {
  key: primitive(),
  value: primitive(),
});

export class StorageStore {
  items: StorageItem[] = [];

  static readonly serialization = new SerializationFactory(
    createModelSchema(StorageStore, {
      items: list(usingModelSchema(storageItemModelSchema)),
    }),
  );

  static serialize(value: StorageStore): PlainObject<StorageStore> {
    return StorageStore.serialization.toJson(value);
  }
}

export class StorageService {
  readonly applicationStore: GenericLegendApplicationStore;
  readonly localStorage: LocalStorage;
  readonly storageKey: string;
  settingsStore = new StorageStore();

  constructor(applicationStore: GenericLegendApplicationStore) {
    this.applicationStore = applicationStore;
    this.localStorage = new LocalStorage();
    this.storageKey = APPLICATION_SETTINGS_STORAGE_KEY;
    // fetching the stored items from client side
    const storage = this.localStorage.getItem(this.storageKey);
    if (storage) {
      const data = JSON.parse(storage) as StorageStore;
      this.settingsStore = data;
    }
  }

  get(key: string): unknown | undefined {
    const savedItem = this.settingsStore.items.find((d) => d.key === key);
    return savedItem ? JSON.parse(savedItem.value) : undefined;
  }

  persist(key: string, value: unknown): void {
    const data = this.settingsStore.items.find(
      (d: StorageItem) => d.key === key,
    );
    if (data) {
      data.value = JSON.stringify(value);
    } else {
      this.settingsStore.items.push(
        StorageItem.create(key, JSON.stringify(value)),
      );
    }
    const serializedValue = StorageStore.serialize(this.settingsStore);
    this.localStorage.setItem(this.storageKey, JSON.stringify(serializedValue));
  }
}
