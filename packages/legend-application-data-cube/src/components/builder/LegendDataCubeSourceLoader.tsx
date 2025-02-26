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
import { LocalFileDataCubeSourceLoaderBuilderState } from '../../stores/builder/source/loader/LocalFileDataCubeSourceLoaderBuilderState.js';
import { LocalFileDataCubeSourceLoader } from './source/loader/LocalFileDataCubeSourceLoader.js';

export const LegendDataCubeSourceLoader = observer(() => {
  const store = useLegendDataCubeBuilderStore();
  const state = store.sourceLoader;
  const sourceLoaderBuilder = state.sourceLoaderBuilder;

  return (
    <>
      <div className="h-[calc(100%_-_40px)] w-full px-2 pt-2">
        <div className="h-full w-full border border-neutral-300 bg-white">
          <div className="h-full w-full select-none">
            <div className="ml-2 h-[1px] w-[calc(100%_-_16px)] bg-neutral-200" />
            <div className="h-[calc(100%_-_41px)] w-full overflow-auto">
              {sourceLoaderBuilder instanceof
                LocalFileDataCubeSourceLoaderBuilderState && (
                <LocalFileDataCubeSourceLoader
                  sourceBuilder={sourceLoaderBuilder}
                />
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="flex h-10 items-center justify-end px-2">
        <FormButton onClick={() => state.display.close()}>Cancel</FormButton>
        <FormButton
          className="ml-2"
          disabled={
            !sourceLoaderBuilder.isValid || state.finalizeState.isInProgress
          }
          onClick={() => {
            state
              .finalize()
              .catch((error) => store.alertService.alertUnhandledError(error));
          }}
        >
          OK
        </FormButton>
      </div>
    </>
  );
});
