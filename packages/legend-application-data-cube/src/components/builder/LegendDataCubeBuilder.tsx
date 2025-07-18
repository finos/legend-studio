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
  DataCubeSpecification,
  DataCubeEvent,
  DataCubeTitleBarMenuItems,
} from '@finos/legend-data-cube';
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
import type { LegendDataCubeBuilderStore } from '../../stores/builder/LegendDataCubeBuilderStore.js';
import { ReleaseViewer } from '@finos/legend-application';
import { isNonNullable } from '@finos/legend-shared';

const LegendDataCubeBuilderHeader = observer(() => {
  const store = useLegendDataCubeBuilderStore();

  return (
    <div className="flex h-full w-full items-center justify-between">
      {store.application.pluginManager
        .getApplicationPlugins()
        .map((plugin) => plugin.builderInnerHeaderRenderer?.(store.builder))}
      <div className="flex h-full w-fit flex-auto items-center justify-end text-nowrap pl-2">
        <FormButton compact={true} onClick={() => store.loader.display.open()}>
          Load DataCube
        </FormButton>
        <FormButton
          compact={true}
          className="ml-1.5 text-nowrap"
          onClick={() => store.creator.display.open()}
        >
          New DataCube
        </FormButton>
        <FormButton
          compact={true}
          className="ml-1.5 text-nowrap"
          disabled={!store.builder?.dataCube}
          onClick={() => store.saverDisplay.open()}
        >
          Save DataCube
        </FormButton>
      </div>
    </div>
  );
});

export const LegendDataCubeReleaseLogManager = observer(
  (props: { showOnlyLatestNotes: boolean }) => {
    const { showOnlyLatestNotes } = props;
    const store = useLegendDataCubeBuilderStore();
    const applicationStore = store.application;
    const releaseService = applicationStore.releaseNotesService;
    const releaseNotes =
      (showOnlyLatestNotes
        ? releaseService.showableVersions()
        : releaseService.releaseNotes) ?? [];

    applicationStore.releaseNotesService.updateViewedVersion();

    return (
      <div className="legend-datacube-release-notes h-full items-center p-3">
        <div className="my-0.5 flex font-mono">
          New features, enhancements and bug fixes that were released
        </div>
        <div className="p-2">
          {releaseNotes.map((e) => (
            <ReleaseViewer key={e.version} releaseNotes={e} />
          ))}
        </div>
      </div>
    );
  },
);

export const LegendDataCubeAbout = observer(() => {
  const store = useLegendDataCubeBuilderStore();
  const releaseService = store.application.releaseNotesService;
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
      {releaseService.isConfigured && (
        <div
          onClick={() => store.releaseLogDisplay.open()}
          className="my-0.5 flex cursor-pointer font-bold text-sky-500 underline"
        >
          <div>Details of Released Versions</div>
        </div>
      )}
      <div className="mt-3 rounded-sm bg-white px-4 py-2">
        <div className="my-0.5 flex font-mono">
          <div>Engine Server:</div>
          <div className="ml-1 font-bold text-sky-500 underline">
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
          <div className="ml-1 font-bold text-sky-500 underline">
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
            <div className="ml-1 font-bold text-sky-500 underline">
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

function generateMenuItems(store: LegendDataCubeBuilderStore) {
  const application = store.application;
  const builder = store.builder;
  const persistentDataCube = builder?.persistentDataCube;

  const logMenuItem = (menuName: string) => {
    store.engine.sendTelemetry(DataCubeEvent.SELECT_ITEM_TITLE_BAR, {
      ...store.engine.getDataFromSource(
        builder?.dataCube?.getProcessedSource(),
      ),
      menuName: menuName,
    });
  };

  const menuItems: (DataCubeMenuItem | DataCubeNativeMenuItem)[] = builder
    ? [
        ...(builder.source
          ? [
              {
                label: DataCubeTitleBarMenuItems.VIEW_SOURCE,
                action: () => {
                  const sourceViewerHeight =
                    store.application.pluginManager
                      .getApplicationPlugins()
                      .map((plugin) =>
                        plugin.getSourceViewerHeight?.(store.builder),
                      )
                      .filter(isNonNullable)[0] ?? 200;
                  store.sourceViewerDisplay.configuration.window.height =
                    Math.min(600, sourceViewerHeight);
                  store.sourceViewerDisplay.open();
                  logMenuItem(DataCubeTitleBarMenuItems.VIEW_SOURCE);
                },
              },
            ]
          : []),
        ...(persistentDataCube
          ? [
              {
                label: DataCubeTitleBarMenuItems.RESET_TO_LATEST_SAVE,
                action: () => {
                  const latestSpecification =
                    DataCubeSpecification.serialization.fromJson(
                      persistentDataCube.content,
                    );
                  builder.dataCube
                    ?.applySpecification(latestSpecification)
                    .catch((error) =>
                      store.alertService.alertUnhandledError(error),
                    );
                  logMenuItem(DataCubeTitleBarMenuItems.VIEW_SOURCE);
                },
              },
              {
                label: DataCubeTitleBarMenuItems.EDIT_QUERY,
                action: () => {
                  store.codeEditorDisplay.open();
                  logMenuItem(DataCubeTitleBarMenuItems.EDIT_QUERY);
                },
              },
              {
                label: DataCubeTitleBarMenuItems.UPDATE_INFO,
                action: () => {
                  // effectively, we open the save window to let user update the DataCube info, such as name, auto-enable caching, etc.
                  store.saverDisplay.open();
                  logMenuItem(DataCubeTitleBarMenuItems.UPDATE_INFO);
                },
                disabled:
                  !store.canCurrentUserManageDataCube(persistentDataCube),
              },
              {
                label: DataCubeTitleBarMenuItems.DELETE_DATACUBE,
                action: () => {
                  store.setDataCubeToDelete(builder.persistentDataCube);
                  store.deleteConfirmationDisplay.open();
                  logMenuItem(DataCubeTitleBarMenuItems.DELETE_DATACUBE);
                },
                disabled:
                  !store.canCurrentUserManageDataCube(persistentDataCube),
              },
            ]
          : []),
      ]
    : [];
  return [
    ...(menuItems.length
      ? [...menuItems, DataCubeNativeMenuItem.SEPARATOR]
      : []),
    {
      label: DataCubeTitleBarMenuItems.SEE_DOCUMENTATION,
      action: () => {
        const url = application.documentationService.url;
        if (url) {
          application.navigationService.navigator.visitAddress(
            application.documentationService.url,
          );
        }
        logMenuItem(DataCubeTitleBarMenuItems.SEE_DOCUMENTATION);
      },
      disabled: !application.documentationService.url,
    },
    {
      label: DataCubeTitleBarMenuItems.ABOUT,
      action: () => {
        store.aboutDisplay.open();
        logMenuItem(DataCubeTitleBarMenuItems.ABOUT);
      },
    },
  ];
}

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

    useEffect(() => {
      const releaseService = application.releaseNotesService;
      const releaseNotes = releaseService.showableVersions();
      const isOpen = releaseService.showCurrentReleaseModal;

      if (releaseService.isConfigured && isOpen && releaseNotes?.length) {
        store.releaseNotesDisplay.open();
      } else {
        releaseService.updateViewedVersion();
      }
    }, [application, store]);

    if (!store.initializeState.hasSucceeded) {
      return (
        <DataCubePlaceholder
          title="[ Legend DataCube ]"
          layoutManager={store.layoutService.manager}
          taskManager={store.taskService.manager}
          headerContent={<LegendDataCubeBuilderHeader />}
          menuItems={generateMenuItems(store)}
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
          menuItems={generateMenuItems(store)}
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
        specification={builder.initialSpecification}
        engine={store.baseStore.engine}
        options={{
          layoutManager: store.layoutService.manager,
          taskManager: store.taskService.manager,
          gridClientLicense: store.baseStore.gridClientLicense,
          onInitialized(event) {
            builder.setDataCube(event.api);
          },
          onViewInitialized(event) {
            builder.setSource(event.source);
          },
          innerHeaderRenderer: () => <LegendDataCubeBuilderHeader />,
          getHeaderMenuItems: () => generateMenuItems(store),
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
