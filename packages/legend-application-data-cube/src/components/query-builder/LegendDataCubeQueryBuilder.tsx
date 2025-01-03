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
  FormBadge_WIP,
  DataCubeLayout,
  FormButton,
  type DataCubeState,
  type DataCubeSettingValues,
} from '@finos/legend-data-cube';
import {
  DataCubeIcon,
  DropdownMenu,
  DropdownMenuItem,
  useDropdownMenu,
} from '@finos/legend-art';
import {
  useLegendDataCubeQueryBuilderStore,
  withLegendDataCubeQueryBuilderStore,
} from './LegendDataCubeQueryBuilderStoreProvider.js';
import { useParams } from '@finos/legend-application/browser';
import {
  LEGEND_DATA_CUBE_ROUTE_PATTERN_TOKEN,
  type LegendDataCubeQueryBuilderQueryPathParams,
} from '../../__lib__/LegendDataCubeNavigation.js';
import { useEffect } from 'react';
import { LegendDataCubeSettingStorageKey } from '../../__lib__/LegendDataCubeSetting.js';

const LegendDataCubeQueryBuilderHeader = observer(
  (props: { dataCube?: DataCubeState | undefined }) => {
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
  },
);

const LegendDataCubeBlankQueryBuilder = observer(() => {
  const store = useLegendDataCubeQueryBuilderStore();
  const application = store.application;
  const [openMenuDropdown, closeMenuDropdown, menuDropdownProps] =
    useDropdownMenu();

  return (
    <div className="data-cube relative flex h-full w-full flex-col bg-white">
      <div className="flex h-7 justify-between bg-neutral-100">
        <div className="flex select-none items-center pl-1 pr-2 text-lg font-medium">
          <DataCubeIcon.Cube className="mr-1 h-4 w-4" />
          <div>{`[ Legend DataCube ]`}</div>
        </div>
        <div className="flex">
          <LegendDataCubeQueryBuilderHeader />
          <button
            className="flex aspect-square h-full flex-shrink-0 items-center justify-center text-lg"
            onClick={openMenuDropdown}
          >
            <DataCubeIcon.Menu />
          </button>
          <DropdownMenu
            {...menuDropdownProps}
            menuProps={{
              anchorOrigin: { vertical: 'bottom', horizontal: 'right' },
              transformOrigin: { vertical: 'top', horizontal: 'left' },
              classes: {
                paper: 'rounded-none mt-[1px]',
                list: 'w-40 p-0 rounded-none border border-neutral-400 bg-white max-h-40 overflow-y-auto py-0.5',
              },
            }}
          >
            <DropdownMenuItem
              className="flex h-[22px] w-full items-center px-2.5 text-base hover:bg-neutral-100 focus:bg-neutral-100"
              onClick={() => {
                const url = application.documentationService.url;
                if (url) {
                  application.navigationService.navigator.visitAddress(url);
                }
                closeMenuDropdown();
              }}
              disabled={true} // TODO: enable when we set up the documentation website
            >
              See Documentation
              <FormBadge_WIP />
            </DropdownMenuItem>
          </DropdownMenu>
        </div>
      </div>
      <div className="h-[calc(100%_-_48px)] w-full border border-x-0 border-neutral-200 bg-neutral-50 p-2">
        <div>Create a new query to start</div>
        <FormButton
          className="mt-1.5"
          onClick={() => store.newQueryState.display.open()}
        >
          New Query
        </FormButton>
      </div>
      <div className="flex h-5 w-full justify-between bg-neutral-100">
        <div className="flex">
          <button
            className="flex items-center px-2 text-neutral-400"
            disabled={true}
          >
            <DataCubeIcon.Settings className="text-xl" />
            <div className="pl-0.5 underline">Properties</div>
          </button>
          <div className="flex">
            <button
              className="flex items-center text-neutral-400"
              disabled={true}
            >
              <DataCubeIcon.TableFilter className="text-lg" />
              <div className="pl-0.5 underline">Filter</div>
            </button>
          </div>
        </div>
        <div className="flex items-center px-2"></div>
      </div>

      <DataCubeLayout layout={store.layoutService} />
    </div>
  );
});

export const LegendDataCubeQueryBuilder = withLegendDataCubeQueryBuilderStore(
  observer(() => {
    const store = useLegendDataCubeQueryBuilderStore();
    const builder = store.builder;
    const application = store.application;
    const params = useParams<LegendDataCubeQueryBuilderQueryPathParams>();
    const queryId = params[LEGEND_DATA_CUBE_ROUTE_PATTERN_TOKEN.QUERY_ID];

    useEffect(() => {
      if (queryId !== store.builder?.persistentQuery?.id) {
        store
          .loadQuery(queryId)
          .catch((error) => store.alertService.alertUnhandledError(error));
      }
    }, [store, queryId]);

    useEffect(() => {
      if (!store.builder && !queryId) {
        store.loader.display.open();
      }
    }, [store, queryId]);

    if (!builder) {
      return <LegendDataCubeBlankQueryBuilder />;
    }
    return (
      <DataCube
        key={builder.uuid} // used as mechanism to reload data-cube component when changing between queries or create/edit mode
        query={builder.query}
        engine={store.baseStore.engine}
        options={{
          gridClientLicense: store.baseStore.gridClientLicense,
          onInitialized(dataCube) {
            builder.setDataCube(dataCube);
          },
          innerHeaderComponent: (dataCube) => (
            <LegendDataCubeQueryBuilderHeader dataCube={dataCube} />
          ),
          settingValues: application.settingService.getObjectValue(
            LegendDataCubeSettingStorageKey.DATA_CUBE,
          ) as DataCubeSettingValues | undefined,
          onSettingValuesChanged(values) {
            application.settingService.persistValue(
              LegendDataCubeSettingStorageKey.DATA_CUBE,
              values,
            );
          },
          getSettingItems() {
            return store.baseStore.settings;
          },
          documentationUrl: application.documentationService.url,
        }}
      />
    );
  }),
);
