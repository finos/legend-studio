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
import { useEffect } from 'react';
import type { IngestDefinitionDataCubeSourceLoaderState } from '../../../stores/builder/source/IngestDefinitionDataCubeSourceLoaderState.js';
import { useAuth } from 'react-oidc-context';
import { useLegendDataCubeBuilderStore } from '../LegendDataCubeBuilderStoreProvider.js';
import { FormButton, FormTextInput } from '@finos/legend-data-cube';

export const IngestDefinitionDataCubeSourceLoader = observer(
  (props: {
    partialSourceLoader: IngestDefinitionDataCubeSourceLoaderState;
  }) => {
    const { partialSourceLoader } = props;
    const auth = useAuth();
    const store = useLegendDataCubeBuilderStore();

    useEffect(() => {
      partialSourceLoader.reset();
    }, [partialSourceLoader]);

    return (
      <div className="flex h-full w-full">
        <div className="m-3 flex w-full flex-col items-stretch gap-2 text-neutral-500">
          <div className="query-setup__wizard__group">
            <div className="query-setup__wizard__group__title">Ingest Urn</div>
            <div className="flex h-full w-fit flex-auto items-center justify-end text-nowrap">
              <FormTextInput
                className="text-base"
                value={partialSourceLoader.ingestDefinitionUrn}
                disabled={true}
              />
              <FormButton
                compact={true}
                className="ml-1.5 text-nowrap text-sm text-black"
                onClick={() => {
                  partialSourceLoader
                    .loadIngestDefinition(
                      auth.user?.access_token,
                      store.ingestServerClient,
                    )
                    .catch((error) =>
                      store.alertService.alertUnhandledError(error),
                    );
                }}
              >
                {Boolean(partialSourceLoader.ingestDefinition)
                  ? 'Loaded!'
                  : 'Load Ingest'}
              </FormButton>
            </div>
          </div>
        </div>
      </div>
    );
  },
);
