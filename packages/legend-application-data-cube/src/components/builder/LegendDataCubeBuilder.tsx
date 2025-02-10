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
import { isNonNullable } from '@finos/legend-shared';

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
        .loadDataCube(dataCubeId)
        .catch((error) => store.alertService.alertUnhandledError(error));
    }, [store, dataCubeId]);

    useEffect(() => {
      store.engine
        .initializeCacheManager()
        .catch((error) => store.alertService.alertUnhandledError(error));
      return () => {
        store.engine
          .disposeCacheManager()
          .catch((error) => store.alertService.alertUnhandledError(error));
      };
    }, [store]);

    if (!builder) {
      return (
        <DataCubePlaceholder
          title="[ Legend DataCube ]"
          layoutManager={store.layoutService.manager}
          taskManager={store.taskService.manager}
          headerContent={<LegendDataCubeBuilderHeader />}
          menuItems={[]}
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
            return [
              builder.persistentDataCube &&
              store.canCurrentUserManageDataCube(builder.persistentDataCube)
                ? {
                    label: 'Delete DataCube...',
                    action: () => {
                      store.setDataCubeToDelete(builder.persistentDataCube);
                      store.deleteConfirmationDisplay.open();
                    },
                  }
                : undefined,
            ].filter(isNonNullable);
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
