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
import {
  DataCube,
  FormButton,
  type DataCubeSettingValues,
  DataCubePlaceholder,
  DataCubeNativeMenuItem,
  DataCubePlaceholderErrorDisplay,
  type DataCubeMenuItem,
} from '@finos/legend-data-cube';
import {} from '@finos/legend-art';
import {
  useLegendDataCubeBuilderStore,
  withLegendDataCubeBuilderStore,
} from './LegendDataCubeBuilderStoreProvider.js';
import { useParams } from '@finos/legend-application/browser';
import {
  LEGEND_DATA_CUBE_ROUTE_PATTERN_TOKEN,
  type LegendDataCubeBuilderPathParams,
} from '../../__lib__/LegendDataCubeNavigation.js';
import { useEffect } from 'react';
import { LegendDataCubeSettingStorageKey } from '../../__lib__/LegendDataCubeSetting.js';

const LegendDataCubeBuilderHeader = observer(() => {
  const store = useLegendDataCubeBuilderStore();

  return (
    <div className="flex h-full items-center">
      <FormButton compact={true} onClick={() => store.loader.display.open()}>
        Load DataCube
      </FormButton>
      <FormButton
        compact={true}
        className="ml-1.5"
        onClick={() => store.creator.display.open()}
      >
        New DataCube
      </FormButton>
      <FormButton
        compact={true}
        className="ml-1.5"
        disabled={!store.builder?.dataCube}
        onClick={() => store.saverDisplay.open()}
      >
        Save DataCube
      </FormButton>
    </div>
  );
});

export const LegendDataCubeAbout = observer(() => {
  const store = useLegendDataCubeBuilderStore();
  const config = store.application.config;

  return (
    <div className="h-full items-center p-4">
      <div className="my-0.5 flex font-mono">
        <div>Environment:</div>
        <div className="ml-1 font-bold">{config.env}</div>
      </div>
      <div className="my-0.5 flex font-mono">
        <div>Version:</div>
        <div className="ml-1 font-bold">{config.appVersion}</div>
      </div>
      <div className="my-0.5 flex font-mono">
        <div>Revision:</div>
        <div className="ml-1 font-bold">{config.appVersionCommitId}</div>
      </div>
      <div className="my-0.5 flex font-mono">
        <div>Build Time:</div>
        <div className="ml-1 font-bold">{config.appVersionBuildTime}</div>
      </div>
      <div className="mt-3 rounded-sm bg-white px-4 py-2">
        <div className="my-0.5 flex font-mono">
          <div>Engine Server:</div>
          <div className="ml-1 font-bold text-sky-600">
            <a
              href={config.engineServerUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              {config.engineServerUrl}
            </a>
          </div>
        </div>
        <div className="my-0.5 flex font-mono">
          <div>Depot Server:</div>
          <div className="ml-1 font-bold text-sky-600">
            <a
              href={config.depotServerUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              {config.depotServerUrl}
            </a>
          </div>
        </div>
        {config.engineQueryServerUrl !== undefined && (
          <div className="my-0.5 flex font-mono">
            <div>DataCube Server:</div>
            <div className="ml-1 font-bold text-sky-600">
              <a
                href={config.engineQueryServerUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                {config.engineQueryServerUrl}
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

export const LegendDataCubeBuilder = withLegendDataCubeBuilderStore(
  observer(() => {
    const store = useLegendDataCubeBuilderStore();
    const builder = store.builder;
    const application = store.application;
    const params = useParams<LegendDataCubeBuilderPathParams>();
    const dataCubeId =
      params[LEGEND_DATA_CUBE_ROUTE_PATTERN_TOKEN.DATA_CUBE_ID];

    useEffect(() => {
      application.navigationService.navigator.blockNavigation(
        // Only block navigation in production, in development, we should have
        // the flexibility to reload the page quickly
        // eslint-disable-next-line no-process-env
        [() => process.env.NODE_ENV === 'production'],
      );
      return (): void => {
        application.navigationService.navigator.unblockNavigation();
      };
    }, [application]);

    useEffect(() => {
      store
        .initialize()
        .catch((error) => store.alertService.alertUnhandledError(error));
      return () => {
        store
          .cleanUp()
          .catch((error) => store.alertService.alertUnhandledError(error));
      };
    }, [store]);

    useEffect(() => {
      store
        .loadDataCube(dataCubeId)
        .catch((error) => store.alertService.alertUnhandledError(error));
    }, [store, dataCubeId]);

    if (!store.initializeState.hasSucceeded) {
      return (
        <DataCubePlaceholder
          title="[ Legend DataCube ]"
          layoutManager={store.layoutService.manager}
          taskManager={store.taskService.manager}
          headerContent={<LegendDataCubeBuilderHeader />}
          menuItems={[
            {
              label: 'See Documentation',
              action: () => {
                const url = application.documentationService.url;
                if (url) {
                  application.navigationService.navigator.visitAddress(
                    application.documentationService.url,
                  );
                }
              },
              disabled: !application.documentationService.url,
            },
            {
              label: 'About',
              action: () => {
                store.aboutDisplay.open();
              },
            },
          ]}
        >
          {store.initializeState.isInProgress && (
            <div className="h-full w-full p-2">
              <div>Initializing...</div>
            </div>
          )}
          {store.initializeState.hasFailed && (
            <DataCubePlaceholderErrorDisplay
              message="Initialization Failure"
              prompt="Resolve the issue and reload."
            />
          )}
        </DataCubePlaceholder>
      );
    }
    if (!builder) {
      return (
        <DataCubePlaceholder
          title="[ Legend DataCube ]"
          layoutManager={store.layoutService.manager}
          taskManager={store.taskService.manager}
          headerContent={<LegendDataCubeBuilderHeader />}
          menuItems={[
            {
              label: 'See Documentation',
              action: () => {
                const url = application.documentationService.url;
                if (url) {
                  application.navigationService.navigator.visitAddress(
                    application.documentationService.url,
                  );
                }
              },
              disabled: !application.documentationService.url,
            },
            {
              label: 'About',
              action: () => {
                store.aboutDisplay.open();
              },
            },
          ]}
        >
          <div className="h-full w-full p-2">
            <div>Create a new DataCube to start</div>
            <FormButton
              className="mt-1.5"
              onClick={() => store.creator.display.open()}
            >
              New DataCube
            </FormButton>
          </div>
        </DataCubePlaceholder>
      );
    }
    return (
      <DataCube
        key={builder.uuid} // used as mechanism to reload data-cube component when changing between DataCubes or between create/edit mode
        specification={builder.specification}
        engine={store.baseStore.engine}
        options={{
          layoutManager: store.layoutService.manager,
          taskManager: store.taskService.manager,
          gridClientLicense: store.baseStore.gridClientLicense,
          onInitialized(event) {
            builder.setDataCube(event.api);
          },
          innerHeaderRenderer: () => <LegendDataCubeBuilderHeader />,
          getHeaderMenuItems: () => {
            const menuItems: (DataCubeMenuItem | DataCubeNativeMenuItem)[] = [
              {
                label: 'View Source',
                action: () => {
                  // TODO: show a window with source details
                  // e.g. for Legend Query source, we should allow user to navigate
                  // to the Legend Query editor view of the source query.
                },
                disabled: true,
              },
              ...(builder.persistentDataCube
                ? [
                    {
                      label: 'Update Info...',
                      action: () => {
                        // effectively, we open the save window to let user update the DataCube info, such as name, auto-enable caching, etc.
                        store.saverDisplay.open();
                      },
                      disabled: !store.canCurrentUserManageDataCube(
                        builder.persistentDataCube,
                      ),
                    },
                    {
                      label: 'Delete DataCube...',
                      action: () => {
                        store.setDataCubeToDelete(builder.persistentDataCube);
                        store.deleteConfirmationDisplay.open();
                      },
                      disabled: !store.canCurrentUserManageDataCube(
                        builder.persistentDataCube,
                      ),
                    },
                  ]
                : []),
              DataCubeNativeMenuItem.SEPARATOR,
            ];
            return [
              ...menuItems,
              {
                label: 'See Documentation',
                action: () => {
                  const url = application.documentationService.url;
                  if (url) {
                    application.navigationService.navigator.visitAddress(
                      application.documentationService.url,
                    );
                  }
                },
                disabled: !application.documentationService.url,
              },
              {
                label: 'About',
                action: () => {
                  store.aboutDisplay.open();
                },
              },
            ];
          },
          settingsData: {
            configurations: store.baseStore.settings,
            values: application.settingService.getObjectValue(
              LegendDataCubeSettingStorageKey.DATA_CUBE,
            ) as DataCubeSettingValues | undefined,
          },
          onSettingsChanged(event) {
            application.settingService.persistValue(
              LegendDataCubeSettingStorageKey.DATA_CUBE,
              event.values,
            );
          },
          enableCache: true,
        }}
      />
    );
  }),
);
