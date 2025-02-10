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
  DEFAULT_REPORT_NAME,
  FormBadge_Advanced,
  FormButton,
  FormCheckbox,
  FormTextInput,
} from '@finos/legend-data-cube';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { useLegendDataCubeBuilderStore } from './LegendDataCubeBuilderStoreProvider.js';
import { guaranteeNonNullable } from '@finos/legend-shared';

export const LegendDataCubeSaver = observer(() => {
  const [name, setName] = useState(DEFAULT_REPORT_NAME);
  const [syncName, setSyncName] = useState(false);
  const [autoEnableCache, setAutoEnableCache] = useState(false);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const store = useLegendDataCubeBuilderStore();
  const builder = guaranteeNonNullable(store.builder);

  useEffect(() => {
    setName(
      builder.persistentDataCube?.name ??
        builder.specification.configuration?.name ??
        DEFAULT_REPORT_NAME,
    );
    setSyncName(false);
    setAutoEnableCache(builder.specification.options?.autoEnableCache ?? false);
  }, [builder]);

  return (
    <>
      <div className="h-[calc(100%_-_40px)] w-full px-2 pt-2">
        <div className="h-full w-full overflow-auto border border-neutral-300 bg-white">
          <div className="h-full w-full select-none p-2">
            <div className="flex h-5 w-full items-center">
              <div className="flex h-full w-20 flex-shrink-0 items-center text-sm">
                Name:
              </div>
              <FormTextInput
                className="w-80"
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                }}
                autoFocus={true}
              />
            </div>
            <div className="mt-2 flex h-5 w-full items-center">
              <div className="flex h-full w-20 flex-shrink-0" />
              <FormCheckbox
                label="Ensure report name is in sync with DataCube name"
                checked={syncName}
                onChange={() => setSyncName(!syncName)}
              />
            </div>
            {showAdvancedSettings && (
              <>
                <div className="my-2 h-[1px] w-full bg-neutral-200" />
                <div className="mt-2 flex h-5 w-full items-center">
                  <div className="flex h-full w-20 flex-shrink-0 items-center text-sm">
                    Caching:
                  </div>
                  <FormCheckbox
                    label="Auto-enable caching"
                    checked={autoEnableCache}
                    onChange={() => setAutoEnableCache(!autoEnableCache)}
                  />
                  <FormBadge_Advanced />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="flex h-10 items-center justify-between px-2">
        <div className="flex h-full items-center pl-1">
          <FormCheckbox
            label="Show advanced settings?"
            checked={showAdvancedSettings}
            onChange={() => setShowAdvancedSettings(!showAdvancedSettings)}
          />
          <FormBadge_Advanced />
        </div>
        <div className="flex">
          <FormButton onClick={() => store.saverDisplay.close()}>
            Cancel
          </FormButton>
          {builder.persistentDataCube ? (
            // updating existing DataCube
            <>
              <FormButton
                className="ml-2"
                disabled={!builder.dataCube || store.saveState.isInProgress}
                onClick={() => {
                  store
                    .saveDataCube(name, {
                      syncName,
                      autoEnableCache,
                      saveAsNew: false,
                    })
                    .catch((error) =>
                      store.alertService.alertUnhandledError(error),
                    );
                }}
              >
                Save
              </FormButton>
              <FormButton
                className="ml-2"
                disabled={!builder.dataCube || store.saveState.isInProgress}
                onClick={() => {
                  store
                    .saveDataCube(name, {
                      syncName,
                      autoEnableCache,
                      saveAsNew: true,
                    })
                    .catch((error) =>
                      store.alertService.alertUnhandledError(error),
                    );
                }}
              >
                Save As
              </FormButton>
            </>
          ) : (
            // creating new DataCube
            <>
              <FormButton
                className="ml-2"
                disabled={!builder.dataCube || store.saveState.isInProgress}
                onClick={() => {
                  store
                    .createNewDataCube(name, {
                      syncName,
                      autoEnableCache,
                    })
                    .catch((error) =>
                      store.alertService.alertUnhandledError(error),
                    );
                }}
              >
                Save
              </FormButton>
            </>
          )}
        </div>
      </div>
    </>
  );
});
