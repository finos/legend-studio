/**
 * Copyright (c) 2025-present, Goldman Sachs
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
import { DataCubeCodeEditor, FormTextInput } from '@finos/legend-data-cube';
import { CustomSelectorInput } from '@finos/legend-art';
import { useAuth } from 'react-oidc-context';
import { assertErrorThrown, guaranteeNonNullable } from '@finos/legend-shared';
import { useEffect, type ReactNode } from 'react';
import type { LakehouseConsumerDataCubeSourceBuilderState } from '../../../stores/builder/source/LakehouseConsumerDataCubeSourceBuilderState.js';
import { useLegendDataCubeBuilderStore } from '../LegendDataCubeBuilderStoreProvider.js';
import {
  V1_EntitlementsLakehouseEnvironmentType,
  type V1_EntitlementsDataProductLite,
} from '@finos/legend-graph';

export const LakehouseConsumerDataCubeSourceBuilder: React.FC<{
  sourceBuilder: LakehouseConsumerDataCubeSourceBuilderState;
}> = observer(({ sourceBuilder }) => {
  const auth = useAuth();
  const store = useLegendDataCubeBuilderStore();

  const renderDataProductLabel = (
    dataProduct: V1_EntitlementsDataProductLite,
  ): ReactNode => {
    const title = dataProduct.title;
    const id = guaranteeNonNullable(dataProduct.id);
    // If title is empty, show id only. Otherwise show title (prominent) and id (muted)
    // Main text: slightly larger and normal weight. Subtext: grey and slightly smaller.
    return (
      <div className="flex w-full flex-col items-start">
        <div className="w-full whitespace-normal break-words text-base font-normal text-black">
          {title ?? id}
        </div>
        {title ? (
          <div className="mt-1 w-full truncate text-sm text-neutral-500">
            {id}
          </div>
        ) : null}
      </div>
    );
  };
  const renderDataProductMainText = (
    dataProduct: V1_EntitlementsDataProductLite,
  ): ReactNode => {
    const title = dataProduct.title;
    const id = guaranteeNonNullable(dataProduct.id);
    // Ensure selected value is vertically centered inside the control by
    // making the label container full-height and centering its content.
    return (
      <div className="flex h-full w-full items-center whitespace-normal break-words text-base font-normal text-black">
        {title ?? id}
      </div>
    );
  };

  useEffect(() => {
    sourceBuilder.reset();
    try {
      sourceBuilder.loadDataProducts(auth.user?.access_token);
    } catch (error) {
      assertErrorThrown(error);
      store.alertService.alertUnhandledError(error);
    }
  }, [sourceBuilder, auth, store]);

  return (
    <div className="flex h-full w-full">
      <div className="m-3 flex w-full flex-col items-stretch gap-2 text-neutral-500">
        <div className="query-setup__wizard__group mt-3">
          <div className="query-setup__wizard__group__title">Mode</div>
          <CustomSelectorInput
            className="query-setup__wizard__selector"
            options={[
              {
                label: 'Production',
                value: V1_EntitlementsLakehouseEnvironmentType.PRODUCTION,
              },
              {
                label: 'Production (parallel)',
                value:
                  V1_EntitlementsLakehouseEnvironmentType.PRODUCTION_PARALLEL,
              },
            ]}
            onChange={(
              newVal: {
                label: string;
                value: V1_EntitlementsLakehouseEnvironmentType;
              } | null,
            ) => {
              sourceBuilder.setEnvMode(newVal?.value);
              sourceBuilder.setSelectedDataProduct(undefined);
            }}
            value={
              sourceBuilder.envMode
                ? {
                    label:
                      sourceBuilder.envMode ===
                      V1_EntitlementsLakehouseEnvironmentType.PRODUCTION
                        ? 'Production'
                        : sourceBuilder.envMode ===
                            V1_EntitlementsLakehouseEnvironmentType.PRODUCTION_PARALLEL
                          ? 'Production (parallel)'
                          : 'Development',
                    value: sourceBuilder.envMode,
                  }
                : null
            }
            placeholder="Choose mode"
            isClearable={true}
            escapeClearsValue={true}
          />
        </div>
        {sourceBuilder.envMode && (
          <div className="query-setup__wizard__group mt-3">
            <div className="query-setup__wizard__group__title">
              Data Product
            </div>
            <CustomSelectorInput
              className="query-setup__wizard__selector text-nowrap"
              // give the option rows more height to accommodate wrapped titles
              optionCustomization={{ rowHeight: 56 }}
              options={sourceBuilder.filteredDataProducts.map((dataProduct) => {
                const title = dataProduct.title;
                const id = guaranteeNonNullable(dataProduct.id);
                return {
                  label: renderDataProductLabel(dataProduct),
                  // include a searchable text so react-select filter can match id/title
                  searchText: `${title} ${id}`.trim(),
                  value: guaranteeNonNullable(dataProduct),
                };
              })}
              filterOption={(option, rawInput) => {
                const input = rawInput.toLowerCase();
                // option.data may contain our custom searchText
                const data = option.data as { searchText?: string } | undefined;

                // Prefer a non-empty searchText from data when available
                const searchTextSource =
                  data?.searchText && data.searchText.trim() !== ''
                    ? data.searchText.toLowerCase().trim()
                    : ''.trim();

                // If user hasn't typed anything, show all options
                if (input === '') {
                  return true;
                }

                return searchTextSource.includes(input);
              }}
              disabled={
                sourceBuilder.dataProductLoadingState.isInProgress ||
                sourceBuilder.dataProductLoadingState.hasFailed
              }
              isLoading={sourceBuilder.dataProductLoadingState.isInProgress}
              onChange={(
                newValue: {
                  label: ReactNode;
                  searchText?: string;
                  value: V1_EntitlementsDataProductLite;
                } | null,
              ) => {
                sourceBuilder.setSelectedDataProduct(newValue?.value);
                sourceBuilder
                  .fetchDataProduct(auth.user?.access_token)
                  .catch((error) =>
                    store.alertService.alertUnhandledError(error),
                  );
              }}
              value={
                sourceBuilder.selectedDataProduct
                  ? {
                      label: renderDataProductMainText(
                        sourceBuilder.selectedDataProduct,
                      ),
                      searchText:
                        `${sourceBuilder.selectedDataProduct.title ?? ''} ${sourceBuilder.selectedDataProduct.id}`.trim(),
                      value: sourceBuilder.selectedDataProduct,
                    }
                  : null
              }
              placeholder={`Choose a Data Product`}
              isClearable={false}
              escapeClearsValue={true}
            />
          </div>
        )}
        {sourceBuilder.accessPoints.length > 0 && (
          <div className="query-setup__wizard__group mt-2">
            <div className="query-setup__wizard__group__title">
              Access Point
            </div>
            <CustomSelectorInput
              className="query-setup__wizard__selector"
              options={sourceBuilder.accessPoints.map((accessPoint) => ({
                label: accessPoint,
                value: accessPoint,
              }))}
              disabled={false}
              isLoading={false}
              onChange={(newValue: { label: string; value: string } | null) => {
                const accessPoint = newValue?.value ?? '';
                sourceBuilder.setSelectedAccessPoint(accessPoint);
                sourceBuilder.setWarehouse(
                  sourceBuilder.DEFAULT_CONSUMER_WAREHOUSE,
                );
                sourceBuilder
                  .initializeQuery()
                  .catch((error) =>
                    store.alertService.alertUnhandledError(error),
                  );
              }}
              value={
                sourceBuilder.selectedAccessPoint
                  ? {
                      label: sourceBuilder.selectedAccessPoint,
                      value: sourceBuilder.selectedAccessPoint,
                    }
                  : null
              }
              isClearable={false}
              escapeClearsValue={true}
            />
          </div>
        )}
        {sourceBuilder.selectedAccessPoint && (
          <div className="query-setup__wizard__group mt-2">
            <div className="query-setup__wizard__group__title">Warehouse</div>
            <FormTextInput
              className="w-full text-base text-black"
              value={sourceBuilder.warehouse}
              onChange={(event) => {
                sourceBuilder.setWarehouse(event.target.value);
              }}
            />
          </div>
        )}
        {sourceBuilder.warehouse && sourceBuilder.showQueryEditor && (
          <div className="query-setup__wizard__group">
            <div className="query-setup__wizard__group__title">Query</div>

            <div
              className="mt-2 h-40 w-full"
              style={{
                border: '2px solid #e5e7eb',
                padding: '5px',
                borderRadius: '5px',
                position: 'relative',
              }}
            >
              <DataCubeCodeEditor state={sourceBuilder.codeEditorState} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
