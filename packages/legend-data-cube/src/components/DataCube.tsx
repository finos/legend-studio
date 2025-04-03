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
import type { DataCubeSpecification } from '../stores/core/model/DataCubeSpecification.js';
import { DataCubeTitleBar } from './DataCubeTitleBar.js';
import {
  DataCubeTitleBarMenuItems,
  DEFAULT_REPORT_NAME,
} from '../stores/core/DataCubeQueryEngine.js';
import {
  DataCubePlaceholderErrorDisplay,
  DataCubePlaceholder,
} from './DataCubePlaceholder.js';
import { DataCubeEvent } from '../__lib__/DataCubeEvent.js';

const DataCubeRoot = observer(() => {
  const dataCube = useDataCube();
  const view = dataCube.view;

  const logMenuItem = (menuName: string) => {
    view.dataCube.telemetryService.sendTelemetry(
      DataCubeEvent.SELECT_ITEM_TITLE_BAR,
      {
        ...view.engine.getDataFromSource(view.getInitialSource()),
        menuName: menuName,
      },
    );
  };

  useEffect(() => {
    dataCube.view
      .initialize(dataCube.specification)
      .catch((error) => dataCube.logService.logUnhandledError(error));
  }, [dataCube]);

  return (
    <div className="data-cube relative flex h-full w-full flex-col bg-white">
      <DataCubeTitleBar
        title={view.info.name}
        menuItems={[
          {
            label: DataCubeTitleBarMenuItems.UNDO,
            action: () => {
              dataCube.view.snapshotService.undo();
              logMenuItem(DataCubeTitleBarMenuItems.UNDO);
            },
            disabled: !dataCube.view.snapshotService.canUndo,
          },
          {
            label: DataCubeTitleBarMenuItems.REDO,
            action: () => {
              dataCube.view.snapshotService.redo();
              logMenuItem(DataCubeTitleBarMenuItems.REDO);
            },
            disabled: !dataCube.view.snapshotService.canRedo,
          },
          {
            label: DataCubeTitleBarMenuItems.SETTINGS,
            action: () => {
              dataCube.settingService.display.open();
              logMenuItem(DataCubeTitleBarMenuItems.SETTINGS);
            },
          },
        ]}
        getMenuItems={dataCube.options?.getHeaderMenuItems}
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
    specification: DataCubeSpecification;
    engine: DataCubeEngine;
    options?: DataCubeOptions | undefined;
  }) => {
    const { specification, engine, options } = props;
    const dataCube = useLocalObservable(
      () => new DataCubeState(specification, engine, options),
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
          taskManager={dataCube.taskService.manager}
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
