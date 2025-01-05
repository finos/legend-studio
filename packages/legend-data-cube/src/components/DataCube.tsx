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

import { observer, useLocalObservable } from 'mobx-react-lite';
import { DataCubeLayout } from './core/DataCubeLayout.js';
import { INTERNAL__MonacoEditorWidgetsRoot } from './core/DataCubePureCodeEditorUtils.js';
import { DataCubeView } from './DataCubeView.js';
import { useEffect } from 'react';
import type { DataCubeEngine } from '../stores/core/DataCubeEngine.js';
import { DataCubeState } from '../stores/DataCubeState.js';
import { type DataCubeOptions } from '../stores/DataCubeOptions.js';
import { DataCubeContextProvider, useDataCube } from './DataCubeProvider.js';
import type { DataCubeQuery } from '../stores/core/model/DataCubeQuery.js';
import { DataCubeTitleBar } from './DataCubeTitleBar.js';
import { DEFAULT_REPORT_NAME } from '../stores/core/DataCubeQueryEngine.js';
import {
  DataCubePlaceholderErrorDisplay,
  DataCubePlaceholder,
} from './DataCubePlaceholder.js';

const DataCubeRoot = observer(() => {
  const dataCube = useDataCube();
  const view = dataCube.view;

  useEffect(() => {
    dataCube.view
      .initialize(dataCube.query)
      .catch((error) => dataCube.logService.logUnhandledError(error));
  }, [dataCube]);

  return (
    <div className="data-cube relative flex h-full w-full flex-col bg-white">
      <DataCubeTitleBar
        title={view.info.name}
        menuItems={[
          {
            label: 'See Documentation',
            action: () => {
              const url = dataCube.options?.documentationUrl;
              if (url) {
                dataCube.navigationService.openLink(url);
              }
            },
          },
          {
            label: 'Settings...',
            action: () => dataCube.settingService.display.open(),
          },
        ]}
      >
        {dataCube.options?.innerHeaderRenderer?.({ api: dataCube.api }) ?? null}
      </DataCubeTitleBar>

      <DataCubeView view={view} />

      <DataCubeLayout layout={dataCube.layoutService.manager} />
      <INTERNAL__MonacoEditorWidgetsRoot />
    </div>
  );
});

export const DataCube = observer(
  (props: {
    query: DataCubeQuery;
    engine: DataCubeEngine;
    options?: DataCubeOptions | undefined;
  }) => {
    const { query, engine, options } = props;
    const dataCube = useLocalObservable(
      () => new DataCubeState(query, engine, options),
    );

    useEffect(() => {
      dataCube
        .initialize()
        .catch((error) => dataCube.logService.logUnhandledError(error));
      return () => dataCube.dispose();
    }, [dataCube]);

    if (!dataCube.initializeState.hasSucceeded) {
      return (
        <DataCubePlaceholder
          title={DEFAULT_REPORT_NAME}
          headerContent={
            dataCube.options?.innerHeaderRenderer?.({ api: dataCube.api }) ??
            null
          }
          layoutManager={dataCube.layoutService.manager}
        >
          {dataCube.initializeState.hasFailed && (
            <DataCubePlaceholderErrorDisplay
              message="Initialization Failure"
              prompt="Resolve the issue and reload."
            />
          )}
        </DataCubePlaceholder>
      );
    }
    return (
      <DataCubeContextProvider value={dataCube}>
        <DataCubeRoot key={dataCube.uuid} />
      </DataCubeContextProvider>
    );
  },
);
