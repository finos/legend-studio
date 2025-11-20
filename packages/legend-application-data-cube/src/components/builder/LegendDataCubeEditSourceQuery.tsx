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

import { DataCubeCodeEditor, FormButton } from '@finos/legend-data-cube';
import { observer } from 'mobx-react-lite';
import { useEffect, useMemo } from 'react';
import { useLegendDataCubeBuilderStore } from './LegendDataCubeBuilderStoreProvider.js';
import { assertErrorThrown, guaranteeNonNullable } from '@finos/legend-shared';
import { LegendDataCubeCodeEditorState } from '../../stores/builder/LegendDataCubeCodeEditorState.js';

export const LegendDataCubeEditSourceQuery = observer(() => {
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
    const initializeQuery = async () => {
      if (builder.source?.query) {
        try {
          const query = await store.engine.getValueSpecificationCode(
            builder.source.query,
          );
          state.initialize(query);
        } catch (error) {
          assertErrorThrown(error);
          const message = `Datacube Reload failure: ${error}`;
          store.queryEditorDisplay.close();
          store.alertService.alertError(error, { message });
        }
      }
    };
    // eslint-disable-next-line no-void
    void initializeQuery();
  }, [builder, store, state]);

  return (
    <>
      <div className="h-[calc(100%_-_40px)] w-full px-2 pt-2">
        <div className="h-full w-full overflow-auto border border-neutral-300 bg-white">
          <DataCubeCodeEditor state={state} />
        </div>
      </div>
      <div className="flex h-10 items-center justify-between px-2">
        <div className="flex">
          <FormButton onClick={() => store.queryEditorDisplay.close()}>
            Cancel
          </FormButton>
          <FormButton
            className="ml-2"
            onClick={() => {
              // eslint-disable-next-line no-void
              void (async () => {
                await store.updateBuilderWithNewSpecification(state);
              })();
            }}
          >
            Apply
          </FormButton>
        </div>
      </div>
    </>
  );
});
