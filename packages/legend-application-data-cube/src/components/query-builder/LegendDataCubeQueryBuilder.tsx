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
  useLegendDataCubeQueryBuilderStore,
  withLegendDataCubeQueryBuilderStore,
} from './LegendDataCubeQueryBuilderStoreProvider.js';
import { useParams } from '@finos/legend-application/browser';
import {
  LEGEND_DATA_CUBE_ROUTE_PATTERN_TOKEN,
  type LegendDataCubeQueryBuilderPathParams,
} from '../../__lib__/LegendDataCubeNavigation.js';
import { useEffect } from 'react';
import { LegendDataCubeSettingStorageKey } from '../../__lib__/LegendDataCubeSetting.js';

const LegendDataCubeQueryBuilderHeader = observer(() => {
  const store = useLegendDataCubeQueryBuilderStore();

  return (
    <div className="flex h-full items-center">
      <FormButton compact={true} onClick={() => store.loader.display.open()}>
        Load Query
      </FormButton>
      <FormButton
        compact={true}
        className="ml-1.5"
        onClick={() => store.newQueryState.display.open()}
      >
        New Query
      </FormButton>
      <FormButton
        compact={true}
        className="ml-1.5"
        disabled={!store.builder?.dataCube}
        onClick={() => store.saverDisplay.open()}
      >
        Save Query
      </FormButton>
    </div>
  );
});

export const LegendDataCubeQueryBuilder = withLegendDataCubeQueryBuilderStore(
  observer(() => {
    const store = useLegendDataCubeQueryBuilderStore();
    const builder = store.builder;
    const application = store.application;
    const params = useParams<LegendDataCubeQueryBuilderPathParams>();
    const queryId = params[LEGEND_DATA_CUBE_ROUTE_PATTERN_TOKEN.QUERY_ID];

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
        .loadQuery(queryId)
        .catch((error) => store.alertService.alertUnhandledError(error));
    }, [store, queryId]);

    if (!builder) {
      return (
        <DataCubePlaceholder
          title="[ Legend DataCube ]"
          layoutManager={store.layoutService.manager}
          taskManager={store.taskService.manager}
          headerContent={<LegendDataCubeQueryBuilderHeader />}
          menuItems={[
            {
              label: 'See Documentation',
              action: () => {
                const url = application.documentationService.url;
                if (url) {
                  application.navigationService.navigator.visitAddress(url);
                }
              },
              disabled: true, // TODO: enable when we set up the documentation websit
            },
          ]}
        >
          <div className="h-full w-full p-2">
            <div>Create a new query to start</div>
            <FormButton
              className="mt-1.5"
              onClick={() => store.newQueryState.display.open()}
            >
              New Query
            </FormButton>
          </div>
        </DataCubePlaceholder>
      );
    }
    return (
      <DataCube
        key={builder.uuid} // used as mechanism to reload data-cube component when changing between queries or create/edit mode
        query={builder.query}
        engine={store.baseStore.engine}
        options={{
          layoutManager: store.layoutService.manager,
          taskManager: store.taskService.manager,
          gridClientLicense: store.baseStore.gridClientLicense,
          onInitialized(event) {
            builder.setDataCube(event.api);
          },
          innerHeaderRenderer: () => <LegendDataCubeQueryBuilderHeader />,
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
          documentationUrl: application.documentationService.url,
          enableCache: true,
        }}
      />
    );
  }),
);
