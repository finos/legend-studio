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
  FormButton,
  FormTextInput,
} from '@finos/legend-data-cube';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { useLegendDataCubeQueryBuilderStore } from './LegendDataCubeQueryBuilderStoreProvider.js';
import { guaranteeNonNullable } from '@finos/legend-shared';

export const LegendDataCubeQuerySaver = observer(() => {
  const [name, setName] = useState(DEFAULT_REPORT_NAME);
  const store = useLegendDataCubeQueryBuilderStore();
  const builder = guaranteeNonNullable(store.builder);

  useEffect(() => {
    setName(builder.persistentQuery?.name ?? DEFAULT_REPORT_NAME);
  }, [builder]);

  return (
    <>
      <div className="h-[calc(100%_-_40px)] w-full px-2 pt-2">
        <div className="h-full w-full overflow-auto border border-neutral-300 bg-white">
          <div className="h-full w-full select-none p-2">
            <div className="flex h-6 w-full items-center">
              <div className="flex h-full w-32 flex-shrink-0 items-center text-sm">
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
          </div>
        </div>
      </div>
      <div className="flex h-10 items-center justify-end px-2">
        <FormButton onClick={() => store.saverDisplay.close()}>
          Cancel
        </FormButton>
        {builder.persistentQuery ? (
          // updating existing query
          <>
            <FormButton
              className="ml-2"
              disabled={!builder.dataCube || store.saveQueryState.isInProgress}
              onClick={() => {
                store
                  .saveQuery(name, false)
                  .catch((error) =>
                    store.alertService.alertUnhandledError(error),
                  );
              }}
            >
              Save
            </FormButton>
            <FormButton
              className="ml-2"
              disabled={!builder.dataCube || store.saveQueryState.isInProgress}
              onClick={() => {
                store
                  .saveQuery(name, true)
                  .catch((error) =>
                    store.alertService.alertUnhandledError(error),
                  );
              }}
            >
              Save As
            </FormButton>
          </>
        ) : (
          // creating new query
          <>
            <FormButton
              className="ml-2"
              disabled={!builder.dataCube || store.saveQueryState.isInProgress}
              onClick={() => {
                store
                  .createQuery(name)
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
    </>
  );
});
