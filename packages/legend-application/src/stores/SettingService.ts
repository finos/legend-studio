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
  deepEqual,
  isBoolean,
  isNumber,
  isObject,
  isString,
  LogEvent,
} from '@finos/legend-shared';
import { APPLICATION_EVENT } from '../__lib__/LegendApplicationEvent.js';
import type { GenericLegendApplicationStore } from './ApplicationStore.js';
import { StorageStore } from './storage/StorageService.js';

type SettingValue = object | string | number | boolean;
type SettingConfigurationEntryData = {
  // TODO: we can make these shape more specific when we do validation
  // See https://github.com/finos/legend-studio/issues/407
  defaultValue: SettingValue;
};
export type SettingOverrideConfigData = Record<string, SettingValue>;
export type SettingConfigurationEntry = {
  key: string;
  defaultValue: SettingValue;
};
export type SettingConfigurationData = Record<
  string,
  SettingConfigurationEntryData
>;

export const collectSettingConfigurationEntriesFromConfig = (
  data: SettingConfigurationData,
): SettingConfigurationEntry[] =>
  Object.entries(data).map((entry) => ({
    key: entry[0],
    ...entry[1],
  }));

const APPLICATION_SETTING_STORAGE_KEY = 'application-settings-storage';

export class SettingService {
  readonly applicationStore: GenericLegendApplicationStore;
  private readonly storage: StorageStore;
  private readonly registry = new Map<string, SettingConfigurationEntry>();

  constructor(applicationStore: GenericLegendApplicationStore) {
    this.applicationStore = applicationStore;
    this.storage = new StorageStore(
      this.applicationStore.storageService,
      APPLICATION_SETTING_STORAGE_KEY,
    );

    this.applicationStore.pluginManager
      .getApplicationPlugins()
      .flatMap((plugin) => plugin.getExtraSettingConfigurationEntries?.() ?? [])
      .forEach((entry) => {
        if (this.registry.has(entry.key)) {
          this.applicationStore.logService.warn(
            LogEvent.create(
              APPLICATION_EVENT.SETTING_CONFIGURATION_CHECK__FAILURE,
            ),
            `Found duplicated setting with key '${entry.key}'`,
          );
          return;
        }
        // TODO: do validation check here
        // See https://github.com/finos/legend-studio/issues/407
        this.registry.set(entry.key, entry);
      });
  }

  getNumericValue(key: string): number | undefined {
    const value =
      this.storage.getValue(key) ?? this.registry.get(key)?.defaultValue;
    if (value !== undefined && !isNumber(value)) {
      this.applicationStore.logService.warn(
        LogEvent.create(APPLICATION_EVENT.SETTING_RETRIVE_FAILURE),
        `Can't retrieve numeric value for setting '${key}'`,
      );
      return undefined;
    }
    return value;
  }

  getStringValue(key: string): string | undefined {
    const value =
      this.storage.getValue(key) ?? this.registry.get(key)?.defaultValue;
    if (value !== undefined && !isString(value)) {
      this.applicationStore.logService.warn(
        LogEvent.create(APPLICATION_EVENT.SETTING_RETRIVE_FAILURE),
        `Can't retrieve string value for setting '${key}'`,
      );
      return undefined;
    }
    return value;
  }

  getBooleanValue(key: string): boolean | undefined {
    const value =
      this.storage.getValue(key) ?? this.registry.get(key)?.defaultValue;
    if (value !== undefined && !isBoolean(value)) {
      this.applicationStore.logService.warn(
        LogEvent.create(APPLICATION_EVENT.SETTING_RETRIVE_FAILURE),
        `Can't retrieve boolean value for setting '${key}'`,
      );
      return undefined;
    }
    return value;
  }

  getObjectValue(key: string): object | undefined {
    const value =
      this.storage.getValue(key) ?? this.registry.get(key)?.defaultValue;
    if (value !== undefined && !isObject(value)) {
      this.applicationStore.logService.warn(
        LogEvent.create(APPLICATION_EVENT.SETTING_RETRIVE_FAILURE),
        `Can't retrieve object value for setting '${key}'`,
      );
      return undefined;
    }
    return value;
  }

  persistValue(key: string, value: SettingValue | undefined): void {
    const defaultValue = this.registry.get(key)?.defaultValue;
    this.storage.persistValue(
      key,
      // NOTE: if the value equals to default value, the value will be unset instead
      defaultValue !== undefined && deepEqual(defaultValue, value)
        ? undefined
        : value,
    );
  }
}
