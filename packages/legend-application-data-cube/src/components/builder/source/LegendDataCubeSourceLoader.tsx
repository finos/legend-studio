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
import { FormButton, FormDropdownMenuTrigger } from '@finos/legend-data-cube';
import { useLegendDataCubeBuilderStore } from '../LegendDataCubeBuilderStoreProvider.js';
import type { LocalFileDataCubeSourceLoaderState } from '../../../stores/builder/source/LocalFileDataCubeSourceLoaderState.js';
import { LocalFileDataCubePartialSourceLoader } from './LocalFileDataCubeSourceLoader.js';
import { DataCubeIcon } from '@finos/legend-art';
import { formatDistanceToNow } from '@finos/legend-shared';
import type { LegendDataCubeSourceLoaderState } from '../../../stores/builder/source/LegendDataCubeSourceLoaderState.js';
import { LegendDataCubeBlockingWindow } from '../../LegendDataCubeBlockingWindow.js';
import { LegendDataCubeSourceBuilderType } from '../../../stores/builder/source/LegendDataCubeSourceBuilderState.js';

export const LegendDataCubeSourceLoader = observer(
  (props: { state: LegendDataCubeSourceLoaderState }) => {
    const { state } = props;
    const store = useLegendDataCubeBuilderStore();
    const persistentDataCube = state.persistentDataCube;

    return (
      <>
        <div className="h-[calc(100%_-_40px)] w-full px-2 pt-2">
          <div className="h-full w-full border border-neutral-300 bg-white">
            <div className="h-full w-full select-none p-2">
              <div className="relative mb-0.5 flex h-[42px] w-full border border-neutral-200 bg-neutral-100">
                <div className="w-full">
                  <div className="h-6 w-4/5 overflow-hidden text-ellipsis whitespace-nowrap px-1.5 leading-6">
                    {persistentDataCube.name}
                  </div>
                  <div className="flex h-[18px] items-start justify-between px-1.5">
                    <div className="flex">
                      <DataCubeIcon.ClockEdit className="text-sm text-neutral-500" />
                      <div className="ml-1 text-sm text-neutral-500">
                        {persistentDataCube.lastUpdatedAt
                          ? formatDistanceToNow(
                              new Date(persistentDataCube.lastUpdatedAt),
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
                        {persistentDataCube.owner}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-2 h-[1px] w-full bg-neutral-200" />
              <div className="flex h-10 w-full items-center py-2">
                <div className="flex h-full w-32 flex-shrink-0 items-center text-sm">
                  Source Type:
                </div>
                <FormDropdownMenuTrigger
                  className="w-80"
                  onClick={() => {}}
                  open={false}
                  disabled={true}
                >
                  <div className="flex items-center">{state.label}</div>
                </FormDropdownMenuTrigger>
              </div>
              <div className="mb-2 h-[1px] w-full bg-neutral-200" />
              <div className="h-[calc(100%_-_98px)] w-full overflow-auto">
                {state.label === LegendDataCubeSourceBuilderType.LOCAL_FILE && (
                  <LocalFileDataCubePartialSourceLoader
                    partialSourceLoader={
                      state as LocalFileDataCubeSourceLoaderState
                    }
                  />
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="flex h-10 items-center justify-end px-2">
          <FormButton
            onClick={() => {
              state.display.onClose?.();
              state.display.close();
            }}
          >
            Cancel
          </FormButton>
          <FormButton
            className="ml-2"
            disabled={!state.isValid || state.finalizeState.isInProgress}
            onClick={() => {
              state.finalize().catch((error) => {
                store.alertService.alertUnhandledError(error);
              });
            }}
          >
            OK
          </FormButton>
        </div>
      </>
    );
  },
);

export const LegendDataCubeSourceLoaderBlockingWindow = observer(() => {
  const store = useLegendDataCubeBuilderStore();

  if (!store.sourceLoader) {
    return null;
  }
  return (
    <LegendDataCubeBlockingWindow windowState={store.sourceLoader.display} />
  );
});
