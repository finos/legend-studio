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
  DataCubeCodeEditor,
  DataCubeSpecification,
  FormButton,
} from '@finos/legend-data-cube';
import { observer } from 'mobx-react-lite';
import { useEffect, useMemo } from 'react';
import { useLegendDataCubeBuilderStore } from './LegendDataCubeBuilderStoreProvider.js';
import {
  assertErrorThrown,
  guaranteeNonNullable,
  returnUndefOnError,
} from '@finos/legend-shared';
import { LegendDataCubeCodeEditorState } from '../../stores/builder/LegendDataCubeCodeEditorState.js';

export const LegendDataCubeQueryEditor = observer(() => {
  const store = useLegendDataCubeBuilderStore();
  const builder = guaranteeNonNullable(store.builder);
  const state: LegendDataCubeCodeEditorState = useMemo(
    () =>
      new LegendDataCubeCodeEditorState(
        store.engine,
        store.alertService,
        builder.source,
      ),
    [store, builder],
  );

  useEffect(() => {
    const persistentDataCube = builder.persistentDataCube;
    const latestSpecification = persistentDataCube
      ? returnUndefOnError(() =>
          DataCubeSpecification.serialization.fromJson(
            persistentDataCube.content,
          ),
        )
      : undefined;
    state.initialize(guaranteeNonNullable(latestSpecification).query);
  }, [builder, state]);

  return (
    <>
      <div className="h-[calc(100%_-_40px)] w-full px-2 pt-2">
        <div className="h-full w-full overflow-auto border border-neutral-300 bg-white">
          <DataCubeCodeEditor state={state} />
        </div>
      </div>
      <div className="flex h-10 items-center justify-between px-2">
        <div className="flex">
          <FormButton onClick={() => store.codeEditorDisplay.close()}>
            Cancel
          </FormButton>
          <FormButton
            className="ml-2"
            disabled={!builder.dataCube || store.codeEditorState.isInProgress}
            onClick={() => {
              const spec = DataCubeSpecification.serialization.fromJson(
                guaranteeNonNullable(builder.persistentDataCube).content,
              );
              const finalSpec = guaranteeNonNullable(spec);
              finalSpec.query = state.code;
              builder.dataCube
                ?.applySpecification(finalSpec)
                .then(() => {
                  state.close();
                  store.codeEditorDisplay.close();
                  store
                    .saveDataCube(
                      guaranteeNonNullable(builder.persistentDataCube).name,
                    )
                    .then(() => {
                      store.application.navigationService.navigator.reload({
                        ignoreBlocking: true,
                      });
                    })
                    .catch((error) => {
                      assertErrorThrown(error);
                      store.alertService.alertUnhandledError(error);
                    });
                })
                .catch((error) => {
                  assertErrorThrown(error);
                  store.alertService.alertUnhandledError(error);
                });
            }}
          >
            Save
          </FormButton>
        </div>
      </div>
    </>
  );
});
