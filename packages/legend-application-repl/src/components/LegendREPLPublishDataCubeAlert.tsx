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

import { useLegendREPLBaseStore } from './LegendREPLFramworkProvider.js';
import type { PersistentDataCubeQuery } from '@finos/legend-graph';
import { EXTERNAL_APPLICATION_NAVIGATION__generateDataCubeViewUrl } from '../application/LegendREPLNavigation.js';
import { DataCubeIcon } from '@finos/legend-art';

export const LegendREPLPublishDataCubeAlert = (props: {
  query: PersistentDataCubeQuery;
}) => {
  const { query } = props;
  const store = useLegendREPLBaseStore();
  const link = store.hostedApplicationBaseUrl
    ? EXTERNAL_APPLICATION_NAVIGATION__generateDataCubeViewUrl(
        store.hostedApplicationBaseUrl,
        query.id,
      )
    : undefined;

  return (
    <div className="h-full w-full p-6">
      <div className="flex w-full overflow-auto">
        <div className="mr-3">
          <DataCubeIcon.AlertSuccess className="flex-shrink-0 stroke-[0.5px] text-[40px] text-green-500" />
        </div>
        <div>
          <div className="whitespace-break-spaces text-lg">
            Published query successfully!
          </div>
          {link && (
            <div className="mt-1 whitespace-break-spaces text-neutral-500">
              To view or share the published query, use the link below.
            </div>
          )}
          {!link && (
            <div className="mt-1 whitespace-break-spaces text-neutral-500">
              See the published query ID below.
            </div>
          )}
        </div>
      </div>
      {link && (
        <div className="mt-3 flex h-6 w-full">
          <div className="flex h-full w-[calc(100%_-_20px)] items-center border border-r-0 border-neutral-400 bg-neutral-200 px-1.5">
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="overflow-hidden overflow-ellipsis whitespace-nowrap"
            >
              {link}
            </a>
          </div>
          <button
            className="flex aspect-square h-full w-6 items-center justify-center border border-neutral-400 bg-neutral-300 hover:brightness-95"
            onClick={() => {
              store.application.clipboardService
                .copyTextToClipboard(link)
                .catch(store.application.alertUnhandledError);
            }}
            title="Copy Link"
          >
            <DataCubeIcon.Clipboard />
          </button>
        </div>
      )}
      {!link && (
        <div className="mt-3 flex h-6 w-full">
          <div className="flex h-full w-[calc(100%_-_20px)] items-center border border-r-0 border-neutral-400 bg-neutral-200 px-1.5">
            <div className="overflow-hidden overflow-ellipsis whitespace-nowrap">
              {query.id}
            </div>
          </div>
          <button
            className="flex aspect-square h-full w-6 items-center justify-center border border-neutral-400 bg-neutral-300 hover:brightness-95"
            onClick={() => {
              store.application.clipboardService
                .copyTextToClipboard(query.id)
                .catch(store.application.alertUnhandledError);
            }}
            title="Copy ID"
          >
            <DataCubeIcon.Clipboard />
          </button>
        </div>
      )}
    </div>
  );
};
