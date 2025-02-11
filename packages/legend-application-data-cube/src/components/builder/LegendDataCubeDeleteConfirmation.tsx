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

import { FormButton, FormTextInput } from '@finos/legend-data-cube';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { useLegendDataCubeBuilderStore } from './LegendDataCubeBuilderStoreProvider.js';
import { formatDate } from '@finos/legend-shared';
import { useApplicationStore } from '@finos/legend-application';

export const LegendDataCubeDeleteConfirmation = observer(() => {
  const [text, setText] = useState('');
  const store = useLegendDataCubeBuilderStore();
  const application = useApplicationStore();
  const persistentDataCube = store.dataCubeToDelete;
  const confirmationText = `${application.identityService.isAnonymous ? '' : application.identityService.currentUser}_${formatDate(Date.now(), 'yyyyMMdd')}`;

  useEffect(() => {
    setText('');
  }, [persistentDataCube]);

  if (!persistentDataCube) {
    return null;
  }
  return (
    <>
      <div className="h-[calc(100%_-_40px)] w-full px-2 pt-2">
        <div className="h-full w-full overflow-auto border border-neutral-300 bg-white">
          <div className="h-full w-full p-2">
            <div>
              <div className="whitespace-break-spaces">
                You are about to delete this DataCube. Once deleted, it{' '}
                <span className="font-bold">cannot be recovered</span>
                <br />
                Please type the following to confirm:
                <span className="ml-1 rounded-sm bg-neutral-100 p-0.5 font-mono font-bold text-red-500">
                  {confirmationText}
                </span>
              </div>
              <div className="mt-1 whitespace-break-spaces text-neutral-500">
                {text}
              </div>
            </div>
            <div className="flex h-6 w-full items-center">
              <FormTextInput
                className="w-full"
                value={text}
                onChange={(event) => {
                  setText(event.target.value);
                }}
              />
            </div>
          </div>
        </div>
      </div>
      <div className="flex h-10 items-center justify-end px-2">
        <FormButton onClick={() => store.deleteConfirmationDisplay.close()}>
          Cancel
        </FormButton>
        <FormButton
          className="ml-2"
          disabled={store.deleteState.isInProgress || text !== confirmationText}
          onClick={() => {
            store
              .deleteDataCube()
              .catch((error) => store.alertService.alertUnhandledError(error));
          }}
        >
          Delete
        </FormButton>
      </div>
    </>
  );
});
