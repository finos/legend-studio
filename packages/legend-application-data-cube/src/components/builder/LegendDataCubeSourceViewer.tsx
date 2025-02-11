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
import { useLegendDataCubeBuilderStore } from './LegendDataCubeBuilderStoreProvider.js';
import { LegendQueryDataCubeSource } from '../../stores/model/LegendQueryDataCubeSource.js';
import { useLegendDataCubeApplicationStore } from '../LegendDataCubeFrameworkProvider.js';
import { EXTERNAL_APPLICATION_NAVIGATION__generateQueryViewUrl } from '../../__lib__/LegendDataCubeNavigation.js';
import { DataCubeIcon } from '@finos/legend-art';

export const LegendDataCubeSourceViewer = observer(() => {
  const store = useLegendDataCubeBuilderStore();
  const source = store.builder?.source;
  const application = useLegendDataCubeApplicationStore();

  if (!source) {
    return null;
  }
  if (source instanceof LegendQueryDataCubeSource) {
    const link = application.config.queryApplicationUrl
      ? EXTERNAL_APPLICATION_NAVIGATION__generateQueryViewUrl(
          application.config.queryApplicationUrl,
          source.info.id,
        )
      : undefined;
    return (
      <div className="h-full w-full px-2 pt-2">
        <div className="h-[calc(100%_-_8px)] w-full border border-neutral-300 bg-white">
          <div className="h-full w-full select-none p-2">
            <div className="flex h-6">
              <div className="flex h-6 items-center text-xl font-medium">
                <DataCubeIcon.Table />
              </div>
              <div className="ml-1 flex h-6 items-center text-xl font-medium">
                Legend Query
              </div>
            </div>
            {link && (
              <div className="mt-2 flex h-6 w-full">
                <div className="flex h-full w-[calc(100%_-_20px)] items-center border border-r-0 border-neutral-400 px-1.5 font-bold text-sky-500 underline">
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
                      .catch((error) =>
                        store.alertService.alertUnhandledError(error),
                      );
                  }}
                  title="Copy Link"
                >
                  <DataCubeIcon.Clipboard />
                </button>
              </div>
            )}
            {!link && (
              <div className="mt-2 flex h-6 w-full">
                <div className="flex h-full w-[calc(100%_-_20px)] items-center border border-r-0 border-neutral-400 bg-neutral-200 px-1.5">
                  <div className="overflow-hidden overflow-ellipsis whitespace-nowrap">
                    {source.info.id}
                  </div>
                </div>
                <button
                  className="flex aspect-square h-full w-6 items-center justify-center border border-neutral-400 bg-neutral-300 hover:brightness-95"
                  onClick={() => {
                    application.clipboardService
                      .copyTextToClipboard(source.info.id)
                      .catch((error) =>
                        store.alertService.alertUnhandledError(error),
                      );
                  }}
                  title="Copy ID"
                >
                  <DataCubeIcon.Clipboard />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="h-full w-full px-2 pt-2">{`Can't display source`}</div>
  );
});
