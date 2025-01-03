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

import { observer } from 'mobx-react-lite';
import { DataCubeIcon } from '@finos/legend-art';
import {
  FormButton,
  FormCheckbox,
  FormNumberInput,
  FormTextInput,
} from './DataCubeFormUtils.js';
import { useDataCube } from '../DataCubeProvider.js';
import {
  DataCubeSettingGroup,
  DataCubeSettingType,
  type DataCubeSetting,
} from '../../stores/services/DataCubeSettingService.js';
import {
  guaranteeIsBoolean,
  guaranteeIsNumber,
  guaranteeIsString,
} from '@finos/legend-shared';
import { runInAction } from 'mobx';

const DataCubeSettingEntryDisplay = observer(
  (props: { configuration: DataCubeSetting }) => {
    const { configuration } = props;
    const dataCube = useDataCube();
    const panel = dataCube.settingService;

    switch (configuration.type) {
      case DataCubeSettingType.BOOLEAN: {
        const value = guaranteeIsBoolean(
          panel.currentValues.get(configuration.key),
        );
        return (
          <div className="my-2">
            <div className="font-medium">{configuration.title}</div>
            <div className="flex pr-2">
              <FormCheckbox
                label={configuration.description}
                checked={value}
                onChange={() => {
                  runInAction(() => {
                    panel.currentValues.set(configuration.key, !value);
                  });
                }}
              />
            </div>
          </div>
        );
      }
      case DataCubeSettingType.NUMERIC: {
        const value = guaranteeIsNumber(
          panel.currentValues.get(configuration.key),
        );
        const defaultValue = configuration.defaultValue as number;
        return (
          <div className="my-2">
            <div className="font-medium">{configuration.title}</div>
            <div className="mb-1.5 text-sm text-neutral-700">
              {configuration.description}
            </div>
            <FormNumberInput
              className="w-20 text-sm"
              min={configuration.numericValueMin}
              step={configuration.numericValueStep}
              max={configuration.numericValueMax}
              defaultValue={defaultValue}
              value={value}
              setValue={(newValue) => {
                runInAction(() => {
                  panel.currentValues.set(
                    configuration.key,
                    newValue ?? defaultValue,
                  );
                });
              }}
            />
          </div>
        );
      }
      case DataCubeSettingType.STRING: {
        const value = guaranteeIsString(
          panel.currentValues.get(configuration.key),
        );
        return (
          <div className="my-2">
            <div className="font-medium">{configuration.title}</div>
            <div className="mb-1.5 text-sm text-neutral-700">
              {configuration.description}
            </div>
            <FormTextInput
              className="w-80 text-sm"
              value={value}
              onChange={(event) => {
                runInAction(() => {
                  panel.currentValues.set(
                    configuration.key,
                    event.target.value,
                  );
                });
              }}
            />
          </div>
        );
      }
      case DataCubeSettingType.ACTION: {
        return (
          <div className="my-2">
            <div className="font-medium">{configuration.title}</div>
            <div className="mb-1.5 text-sm text-neutral-700">
              {configuration.description}
            </div>
            <div className="flex pr-2">
              <FormButton
                compact={true}
                onClick={() => configuration.action?.(dataCube.api, undefined)}
              >
                Run Action
              </FormButton>
            </div>
          </div>
        );
      }
      default:
        return null;
    }
  },
);

export const DataCubeSettingsPanel = observer(() => {
  const dataCube = useDataCube();
  const panel = dataCube.settingService;
  const configurations = Array.from(panel.configurations.values()).toSorted(
    (a, b) => a.title.localeCompare(b.title),
  );

  return (
    <>
      <div className="h-[calc(100%_-_40px)] w-full p-2 pb-0">
        <div className="h-full w-full select-none overflow-auto border border-neutral-300 bg-white p-2">
          <div className="mt-1 flex h-5">
            <div className="flex h-full">
              <div className="flex h-5 items-center text-xl font-medium">
                <DataCubeIcon.Table />
              </div>
              <div className="ml-1 flex h-5 items-center text-xl font-medium">
                Grid
              </div>
            </div>
          </div>
          {configurations
            .filter((setting) => setting.group === DataCubeSettingGroup.GRID)
            .map((configuration) => (
              <DataCubeSettingEntryDisplay
                key={configuration.key}
                configuration={configuration}
              />
            ))}

          <div className="my-2 h-[1px] w-full bg-neutral-200" />

          <div className="mt-1 flex h-5">
            <div className="flex h-full">
              <div className="flex h-5 items-center text-xl font-medium">
                <DataCubeIcon.Debug />
              </div>
              <div className="ml-1 flex h-5 items-center text-xl font-medium">
                Debug
              </div>
            </div>
          </div>
          {configurations
            .filter((setting) => setting.group === DataCubeSettingGroup.DEBUG)
            .map((configuration) => (
              <DataCubeSettingEntryDisplay
                key={configuration.key}
                configuration={configuration}
              />
            ))}
        </div>
      </div>
      <div className="flex h-10 items-center justify-end px-2">
        <FormButton
          onClick={() => panel.restoreDefaultValues()}
          disabled={!panel.allowRestoreDefaultValues}
        >
          Restore Default Settings
        </FormButton>
        <FormButton
          className="ml-2"
          onClick={() => {
            panel.display.close();
          }}
        >
          Cancel
        </FormButton>
        <FormButton className="ml-2" onClick={() => panel.save(dataCube.api)}>
          Apply
        </FormButton>
        <FormButton
          className="ml-2"
          onClick={() => {
            panel.save(dataCube.api);
            panel.display.close();
          }}
        >
          OK
        </FormButton>
      </div>
    </>
  );
});
