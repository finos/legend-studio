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

import type { DataCubeState } from './DataCubeState.js';
import {
  DataCubeSettingGroup,
  DataCubeSettingKey,
  DataCubeSettingType,
  type DataCubeSetting,
  type DataCubeSettingValue,
  type DataCubeSettingValues,
} from './core/DataCubeSetting.js';
import {
  hashArray,
  IllegalStateError,
  isBoolean,
  isNumber,
  isString,
  LogEvent,
  UnsupportedOperationError,
} from '@finos/legend-shared';
import { DataCubeEvent } from '../__lib__/DataCubeEvent.js';
import type { DataCubeOptions } from './DataCubeOptions.js';
import {
  action,
  computed,
  makeObservable,
  observable,
  runInAction,
} from 'mobx';
import type { DisplayState } from './core/DataCubeLayoutManagerState.js';
import { DataCubeSettingsPanel } from '../components/core/DataCubeSettingsPanel.js';

export class DataCubeSettings {
  readonly dataCube: DataCubeState;
  readonly display: DisplayState;
  readonly configurations = new Map<string, DataCubeSetting>();
  readonly defaultValues = new Map<string, DataCubeSettingValue>();
  readonly defaultValuesHashCode!: string;
  readonly values = new Map<string, DataCubeSettingValue>();
  readonly currentValues = new Map<string, DataCubeSettingValue>();

  getSettingValues?: (() => DataCubeSettingValues | undefined) | undefined;
  onSettingValuesChanged?:
    | ((values: DataCubeSettingValues) => void)
    | undefined;
  gridClientLicense?: string | undefined;

  constructor(dataCube: DataCubeState, options?: DataCubeOptions | undefined) {
    makeObservable(this, {
      values: observable,
      save: action,
      valuesHashCode: computed,

      currentValues: observable,
      resetDefaultValues: action,
      currentValuesHashCode: computed,
    });

    this.dataCube = dataCube;
    this.getSettingValues = options?.getSettingValues;
    this.onSettingValuesChanged = options?.onSettingValuesChanged;

    this.display = this.dataCube.engine.layout.newDisplay(
      'Settings',
      () => <DataCubeSettingsPanel />,
      {
        x: -50,
        y: 50,
        width: 600,
        height: 400,
        minWidth: 300,
        minHeight: 200,
        center: false,
      },
    );

    const CORE_SETTINGS: DataCubeSetting[] = [
      {
        key: DataCubeSettingKey.DEBUGGER__ENABLE_DEBUG_MODE,
        title: `Debug Mode: Enabled`,
        description: `Enables debug logging when running data queries, updating snapshots, etc.`,
        group: DataCubeSettingGroup.DEBUG,
        type: DataCubeSettingType.BOOLEAN,
        defaultValue: false,
      } satisfies DataCubeSetting<boolean>,
      {
        key: DataCubeSettingKey.GRID_CLIENT__SUPPRESS_LARGE_DATASET_WARNING,
        title: `Large Dataset Warning: Disabled`,
        description: `Suggests user to enable pagination when handling large datasets to improve performance.`,
        group: DataCubeSettingGroup.GRID,
        type: DataCubeSettingType.BOOLEAN,
        defaultValue: false,
      } satisfies DataCubeSetting<boolean>,
      {
        key: DataCubeSettingKey.GRID_CLIENT__ROW_BUFFER,
        title: `Row Buffer`,
        description: `Sets the number of rows the grid renders outside of the viewable area. e.g. if the buffer is 10 and your grid is showing 50 rows (as that's all that fits on your screen without scrolling), then the grid will actually render 70 in total (10 extra above and 10 extra below). Then when you scroll, the grid will already have 10 rows ready and waiting to show, no redraw is needed. A low small buffer will make initial draws of the grid faster; whereas a big one will reduce the redraw visible vertically scrolling.`,
        group: DataCubeSettingGroup.GRID,
        type: DataCubeSettingType.NUMERIC,
        defaultValue: 50,
        numericValueMin: 10,
        numericValueStep: 10,
        action: (newValue) =>
          this.dataCube.runTaskForEachView((view) => {
            view.grid.client.updateGridOptions({
              rowBuffer: newValue,
            });
          }),
      } satisfies DataCubeSetting<number>,
      {
        key: DataCubeSettingKey.GRID_CLIENT__PURGE_CLOSED_ROW_NODES,
        title: `Refresh Group Node Data: Enabled`,
        description: `Forces refresh data when group node is opened.`,
        group: DataCubeSettingGroup.GRID,
        type: DataCubeSettingType.BOOLEAN,
        defaultValue: false,
        action: (newValue) =>
          this.dataCube.runTaskForEachView((view) => {
            view.grid.client.updateGridOptions({
              purgeClosedRowNodes: newValue,
            });
          }),
      } satisfies DataCubeSetting<boolean>,
      {
        key: DataCubeSettingKey.GRID_CLIENT__ACTION__REFRESH_FAILED_DATA_FETCHES,
        title: `Refresh Failed Data Fetch: Action`,
        description: `Manually re-runs all failed data fetches in the grid.`,
        group: DataCubeSettingGroup.GRID,
        type: DataCubeSettingType.ACTION,
        action: () => this.dataCube.refreshFailedDataFetches(),
        defaultValue: undefined,
      } satisfies DataCubeSetting,
    ];

    [...CORE_SETTINGS, ...(options?.getSettingItems?.() ?? [])].forEach(
      (configuration) => {
        this.configurations.set(configuration.key, configuration);
        this.setValue(configuration.key, configuration.defaultValue, [
          this.defaultValues,
          this.values,
          this.currentValues,
        ]);
      },
    );

    const settingValues = this.getSettingValues?.() ?? {};
    Object.keys(settingValues).forEach((key) => {
      const value = settingValues[key];
      // for unknown settings (e.g. outdated settings, settings' keys changed, etc.), we ignore them
      const configuration = this.configurations.get(key);
      if (!configuration) {
        return;
      }
      this.setValue(key, value, [this.values, this.currentValues]);
    });

    // NOTE: if we support explicity setting values from options, they should
    // be processed here, as they should override the settings retrieved from
    // cache.

    this.defaultValuesHashCode = this.computeValuesHashCode(this.defaultValues);
  }

  private setValue(
    key: string,
    value: unknown,
    valueIndexes: Map<string, unknown>[],
  ) {
    const configuration = this.configurations.get(key);
    if (!configuration) {
      this.dataCube.engine.logWarning(
        LogEvent.create(
          DataCubeEvent.SETTINGS__FAILURE__FOUND_UNREGISTERED_SETTING,
        ),
        `Can't set value for unregistered setting '${key}'`,
      );
      return false;
    }
    switch (configuration.type) {
      case DataCubeSettingType.BOOLEAN: {
        if (
          !(
            isBoolean(value) ||
            (value === undefined && configuration.valueOptional)
          )
        ) {
          this.dataCube.engine.logWarning(
            LogEvent.create(
              DataCubeEvent.SETTINGS__FAILURE__FOUND_UNREGISTERED_SETTING,
            ),
            `Can't set value for setting '${key}': boolean value expected`,
          );
          return false;
        }
        break;
      }
      case DataCubeSettingType.NUMERIC: {
        if (
          !(
            isNumber(value) ||
            (value === undefined && configuration.valueOptional)
          )
        ) {
          this.dataCube.engine.logWarning(
            LogEvent.create(
              DataCubeEvent.SETTINGS__FAILURE__FOUND_UNREGISTERED_SETTING,
            ),
            `Can't set value for setting '${key}': numeric value expected`,
          );
          return false;
        }
        break;
      }
      case DataCubeSettingType.STRING: {
        if (
          !(
            isString(value) ||
            (value === undefined && configuration.valueOptional)
          )
        ) {
          this.dataCube.engine.logWarning(
            LogEvent.create(
              DataCubeEvent.SETTINGS__FAILURE__FOUND_UNREGISTERED_SETTING,
            ),
            `Can't set value for setting '${key}': string value expected`,
          );
          return false;
        }
        break;
      }
      case DataCubeSettingType.ACTION: {
        return false;
      }
      default:
        throw new UnsupportedOperationError(
          `Can't set value for unsupported setting type '${configuration.type}'`,
        );
    }
    valueIndexes.forEach((valueIndex) => {
      runInAction(() => valueIndex.set(key, value));
    });
    return true;
  }

  private getConfiguration(key: string) {
    const configuration = this.configurations.get(key);
    if (!configuration) {
      this.dataCube.engine.logWarning(
        LogEvent.create(
          DataCubeEvent.SETTINGS__FAILURE__FOUND_UNREGISTERED_SETTING,
        ),
        `Can't retrieve value for unregistered setting '${key}'`,
      );
      throw new IllegalStateError(
        `Can't retrieve value for unregistered setting '${key}'`,
      );
    }
    return configuration;
  }

  getBooleanValue(key: string) {
    const value = this.values.get(key);
    const configuration = this.getConfiguration(key);
    if (
      configuration.type !== DataCubeSettingType.BOOLEAN ||
      !isBoolean(value)
    ) {
      this.dataCube.engine.logWarning(
        LogEvent.create(
          DataCubeEvent.SETTINGS__FAILURE__RETRIEVE_INCOMPATIBLE_VALUE,
        ),
        `Can't retrieve boolean value for setting '${key}'`,
      );
      throw new IllegalStateError(
        `Can't retrieve boolean value for setting '${key}'`,
      );
    }
    return value;
  }

  getNumericValue(key: string) {
    const value = this.values.get(key);
    const configuration = this.getConfiguration(key);
    if (
      configuration.type !== DataCubeSettingType.NUMERIC ||
      !isNumber(value)
    ) {
      this.dataCube.engine.logWarning(
        LogEvent.create(
          DataCubeEvent.SETTINGS__FAILURE__RETRIEVE_INCOMPATIBLE_VALUE,
        ),
        `Can't retrieve numeric value for setting '${key}'`,
      );
      throw new IllegalStateError(
        `Can't retrieve numeric value for setting '${key}'`,
      );
    }
    return value;
  }

  getStringValue(key: string) {
    const value = this.values.get(key);
    const configuration = this.getConfiguration(key);
    if (configuration.type !== DataCubeSettingType.STRING || !isString(value)) {
      this.dataCube.engine.logWarning(
        LogEvent.create(
          DataCubeEvent.SETTINGS__FAILURE__RETRIEVE_INCOMPATIBLE_VALUE,
        ),
        `Can't retrieve string value for setting '${key}'`,
      );
      throw new IllegalStateError(
        `Can't retrieve string value for setting '${key}'`,
      );
    }
    return value;
  }

  updateValue(key: string, value: DataCubeSettingValue) {
    const configuration = this.configurations.get(key);
    if (!configuration) {
      this.dataCube.engine.logWarning(
        LogEvent.create(
          DataCubeEvent.SETTINGS__FAILURE__FOUND_UNREGISTERED_SETTING,
        ),
        `Can't set value for unregistered setting '${key}'`,
      );
      return;
    }

    if (!this.setValue(key, value, [this.values, this.currentValues])) {
      return;
    }

    // trigger hook
    this.onSettingValuesChanged?.(this.getCurrentSettingValues());

    // trigger action
    configuration.action?.(value);
  }

  private computeValuesHashCode(values: Map<string, DataCubeSettingValue>) {
    return hashArray(
      Array.from(values.entries())
        .toSorted((a, b) => a[0].localeCompare(b[0]))
        .map(([key, value]) => `${key}:${value}`),
    );
  }

  get valuesHashCode() {
    return this.computeValuesHashCode(this.values);
  }

  get currentValuesHashCode() {
    return this.computeValuesHashCode(this.currentValues);
  }

  resetDefaultValues() {
    this.currentValues.clear();
    this.defaultValues.forEach((value, key) =>
      this.currentValues.set(key, value),
    );
  }

  private getCurrentSettingValues(): DataCubeSettingValues {
    const settingValues: DataCubeSettingValues = {};
    this.values.forEach((value, key) => {
      const configuration = this.configurations.get(key);
      // skip if value is the same as default value
      if (configuration && value !== configuration.defaultValue) {
        settingValues[key] = value;
      }
    });
    return settingValues;
  }

  save() {
    const changedSettingKeys = new Set<string>();
    this.values.forEach((value, key) => {
      if (value !== this.currentValues.get(key)) {
        changedSettingKeys.add(key);
      }
    });

    // update values
    this.values.clear();
    this.currentValues.forEach((value, key) => this.values.set(key, value));

    // trigger hook
    this.onSettingValuesChanged?.(this.getCurrentSettingValues());

    // trigger action
    let requiresReload = false;
    for (const key of changedSettingKeys) {
      const configuration = this.configurations.get(key);
      if (configuration?.requiresReload) {
        requiresReload = true;
      }
      if (configuration?.action) {
        configuration.action(this.values.get(key));
      }
    }

    if (requiresReload) {
      this.dataCube.reload();
    }
  }
}
