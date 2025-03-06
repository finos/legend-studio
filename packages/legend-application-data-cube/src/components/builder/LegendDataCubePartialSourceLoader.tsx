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
import { FormButton } from '@finos/legend-data-cube';
import { useLegendDataCubeBuilderStore } from './LegendDataCubeBuilderStoreProvider.js';
import { LocalFileDataCubePartialSourceLoaderState } from '../../stores/builder/source/loader/LocalFileDataCubePartialSourceLoaderState.js';
import { LocalFileDataCubePartialSourceLoader } from './source/loader/LocalFileDataCubePartialSourceLoader.js';
import { useEffect } from 'react';
import { DataCubeIcon } from '@finos/legend-art';
import { formatDistanceToNow } from '@finos/legend-shared';

export const LegendDataCubePartialSourceLoader = observer(() => {
  const store = useLegendDataCubeBuilderStore();
  const state = store.loader.sourceLoader;
  const sourceLoader = state.partialSourceLoader;

  useEffect(() => {
    sourceLoader.initialize();
  }, [sourceLoader]);

  return (
    <>
      <div className="h-[calc(100%_-_40px)] w-full px-2 pt-2">
        <div className="h-full w-full border border-neutral-300 bg-white">
          <div className="h-full w-full select-none p-2">
            <div className="relative mb-0.5 flex h-[42px] w-full border border-neutral-200 bg-neutral-100">
              <div className="w-full">
                <div className="h-6 w-4/5 overflow-hidden text-ellipsis whitespace-nowrap px-1.5 leading-6">
                  {state.persistentDataCube?.name}
                </div>
                <div className="flex h-[18px] items-start justify-between px-1.5">
                  <div className="flex">
                    <DataCubeIcon.ClockEdit className="text-sm text-neutral-500" />
                    <div className="ml-1 text-sm text-neutral-500">
                      {state.persistentDataCube?.lastUpdatedAt
                        ? formatDistanceToNow(
                            new Date(state.persistentDataCube.lastUpdatedAt),
                            {
                              includeSeconds: true,
                              addSuffix: true,
                            },
                          )
                        : '(unknown)'}
                    </div>
                  </div>
                  <div className="flex">
                    <DataCubeIcon.User className="text-sm text-neutral-500" />
                    <div className="ml-1 text-sm text-neutral-500">
                      {state.persistentDataCube?.owner}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex h-10 w-full items-center">
              <div className="flex h-full w-32 flex-shrink-0 items-center text-sm">
                Source Type:
                <div className="pl-3">{sourceLoader.label}</div>
              </div>
            </div>
            <div className="h-[calc(100%_-_41px)] w-full overflow-auto">
              {sourceLoader instanceof
                LocalFileDataCubePartialSourceLoaderState && (
                <LocalFileDataCubePartialSourceLoader
                  partialSourceLoader={sourceLoader}
                />
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="flex h-10 items-center justify-end px-2">
        <FormButton onClick={state.display.onClose}>Cancel</FormButton>
        <FormButton
          className="ml-2"
          disabled={!sourceLoader.isValid || state.finalizeState.isInProgress}
          onClick={() => {
            state
              .finalize()
              .then(() => store.loadPartialSourceDataCube())
              .catch((error) => {
                store.alertService.alertUnhandledError(error);
              })
              .finally(() => {
                state.display.close();
              });
          }}
        >
          OK
        </FormButton>
      </div>
    </>
  );
});
