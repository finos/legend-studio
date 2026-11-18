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
import {
  DataCubeCodeEditor,
  FormLoadingIndicator,
  FormTextInput,
} from '@finos/legend-data-cube';
import { CustomSelectorInput } from '@finos/legend-art';
import { useAuth } from 'react-oidc-context';
import {
  debounce,
  guaranteeNonNullable,
  guaranteeType,
} from '@finos/legend-shared';
import { flowResult } from 'mobx';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { LakehouseConsumerDataCubeSourceBuilderState } from '../../../stores/builder/source/LakehouseConsumerDataCubeSourceBuilderState.js';
import { useLegendDataCubeBuilderStore } from '../LegendDataCubeBuilderStoreProvider.js';
import {
  V1_EntitlementsLakehouseEnvironmentType,
  type V1_EntitlementsDataProductLite,
} from '@finos/legend-graph';
import {
  LakehouseDataProductSearchResultDetails,
  type DataProductSearchResult,
} from '@finos/legend-server-marketplace';

const renderDataProductLabel = (
  title: string | undefined,
  id: string,
): ReactNode => (
  // If title is empty, show id only. Otherwise show title (prominent) and id (muted)
  <div className="flex w-full flex-col items-start">
    <div className="w-full whitespace-normal break-words text-base font-normal text-black">
      {title ?? id}
    </div>
    {title ? (
      <div className="mt-1 w-full truncate text-sm text-neutral-500">{id}</div>
    ) : null}
  </div>
);

// vertically centered inside the control
const renderSelectedDataProduct = (
  dataProduct: V1_EntitlementsDataProductLite,
): ReactNode => (
  <div className="flex h-full w-full items-center whitespace-normal break-words text-base font-normal text-black">
    {dataProduct.title ?? dataProduct.id}
  </div>
);

/**
 * Lists all the data products of the environment, to filter in the browser, for
 * when data products can't be searched.
 */
const DataProductListSelector = observer(
  (props: {
    sourceBuilder: LakehouseConsumerDataCubeSourceBuilderState;
    accessToken: string | undefined;
  }) => {
    const { sourceBuilder, accessToken } = props;
    const store = useLegendDataCubeBuilderStore();

    // NOTE: the auth context hands back a brand new value on every token refresh,
    // so this must not depend on it directly, else a silent renew would re-run the
    // initialization and wipe out the form the user has already filled out.
    // We still retry while the data products have not been loaded successfully,
    // to cover the case where the access token only arrives after the first render.
    useEffect(() => {
      if (
        sourceBuilder.dataProductLoadingState.isInProgress ||
        sourceBuilder.dataProductLoadingState.hasSucceeded
      ) {
        return;
      }
      sourceBuilder.reset();
      flowResult(sourceBuilder.loadDataProducts(accessToken)).catch(
        store.application.alertUnhandledError,
      );
    }, [sourceBuilder, accessToken, store]);

    return (
      <CustomSelectorInput
        className="query-setup__wizard__selector text-nowrap"
        // give the option rows more height to accommodate wrapped titles
        optionCustomization={{ rowHeight: 56 }}
        options={sourceBuilder.filteredDataProducts.map((dataProduct) => ({
          label: renderDataProductLabel(
            dataProduct.title,
            guaranteeNonNullable(dataProduct.id),
          ),
          // include a searchable text so react-select filter can match id/title
          searchText: `${dataProduct.title} ${dataProduct.id}`.trim(),
          value: guaranteeNonNullable(dataProduct),
        }))}
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
            .fetchAccessPoints()
            .catch((error) => store.alertService.alertUnhandledError(error));
        }}
        value={
          sourceBuilder.selectedDataProduct
            ? {
                label: renderSelectedDataProduct(
                  sourceBuilder.selectedDataProduct,
                ),
                searchText:
                  `${sourceBuilder.selectedDataProduct.title ?? ''} ${sourceBuilder.selectedDataProduct.id}`.trim(),
                value: sourceBuilder.selectedDataProduct,
              }
            : null
        }
        placeholder="Choose a Data Product"
        isClearable={false}
        escapeClearsValue={true}
      />
    );
  },
);

// the chosen data product has no search result of its own, only the found ones do
type DataProductSearchOption = {
  label: ReactNode;
  value: DataProductSearchResult | undefined;
};

/**
 * Searches the data products as one types, instead of listing them all.
 */
const DataProductSearchSelector = observer(
  (props: {
    sourceBuilder: LakehouseConsumerDataCubeSourceBuilderState;
    accessToken: string | undefined;
  }) => {
    const { sourceBuilder, accessToken } = props;
    const store = useLegendDataCubeBuilderStore();
    const selectedDataProduct = sourceBuilder.selectedDataProduct;
    const selectedText = selectedDataProduct
      ? (selectedDataProduct.title ?? selectedDataProduct.id)
      : '';

    // the text stays editable after a data product is chosen, so it is kept here, not by react-select
    const [inputText, setInputText] = useState(selectedText);
    // a choice, or none, sets the text; adjusted while rendering, as an effect would show the old text first
    const [syncedDataProduct, setSyncedDataProduct] =
      useState(selectedDataProduct);
    if (syncedDataProduct !== selectedDataProduct) {
      setSyncedDataProduct(selectedDataProduct);
      setInputText(selectedText);
    }

    const debouncedSearch = useMemo(
      () =>
        debounce((text: string) => {
          sourceBuilder
            .searchDataProducts(text)
            .catch((error) => store.alertService.alertUnhandledError(error));
        }, 300),
      [store, sourceBuilder],
    );
    useEffect(
      () => () => {
        debouncedSearch.cancel();
        sourceBuilder.stopSearch();
      },
      [debouncedSearch, sourceBuilder],
    );

    return (
      <>
        <CustomSelectorInput
          className="query-setup__wizard__selector text-nowrap"
          // give the option rows more height to accommodate wrapped titles
          optionCustomization={{ rowHeight: 56 }}
          options={sourceBuilder.searchResults.map(
            (result): DataProductSearchOption => ({
              label: renderDataProductLabel(
                result.dataProductTitle ?? undefined,
                guaranteeType(
                  result.dataProductDetails,
                  LakehouseDataProductSearchResultDetails,
                ).dataProductId,
              ),
              value: result,
            }),
          )}
          // the options are already the matches of the input
          filterOption={() => true}
          isLoading={sourceBuilder.searchState.isInProgress}
          inputValue={inputText}
          onInputChange={(text, { action }) => {
            if (action === 'input-change') {
              setInputText(text);
              if (!text) {
                sourceBuilder.resetDataProduct();
              }
              debouncedSearch.cancel();
              debouncedSearch(text);
            } else if (action === 'input-blur') {
              // an edit that no choice followed is dropped
              debouncedSearch.cancel();
              sourceBuilder.stopSearch();
              setInputText(selectedText);
            }
          }}
          noOptionsMessage={() =>
            sourceBuilder.searchState.hasSucceeded
              ? 'No options'
              : sourceBuilder.searchState.isInProgress
                ? 'Searching...'
                : 'Type to search data products'
          }
          onChange={(newValue: DataProductSearchOption | null) => {
            if (newValue?.value) {
              sourceBuilder
                .selectSearchResult(newValue.value, accessToken)
                .catch((error) =>
                  store.alertService.alertUnhandledError(error),
                );
            }
          }}
          value={
            selectedDataProduct
              ? {
                  label: renderSelectedDataProduct(selectedDataProduct),
                  value: undefined,
                }
              : null
          }
          placeholder="Choose a Data Product"
          isClearable={false}
          escapeClearsValue={true}
        />
        {sourceBuilder.isSearchCutShort && (
          <div className="mt-1 text-sm text-neutral-500">
            Showing the first matches only. Refine the search to narrow them
            down.
          </div>
        )}
      </>
    );
  },
);

export const LakehouseConsumerDataCubeSourceBuilder: React.FC<{
  sourceBuilder: LakehouseConsumerDataCubeSourceBuilderState;
}> = observer(({ sourceBuilder }) => {
  const auth = useAuth();
  const store = useLegendDataCubeBuilderStore();
  const accessToken = auth.user?.access_token;

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
            onChange={(newVal: {
              label: string;
              value: V1_EntitlementsLakehouseEnvironmentType;
            }) => {
              sourceBuilder
                .switchEnvMode(newVal.value, accessToken)
                .catch(store.application.alertUnhandledError);
            }}
            value={{
              label:
                sourceBuilder.envMode ===
                V1_EntitlementsLakehouseEnvironmentType.PRODUCTION
                  ? 'Production'
                  : sourceBuilder.envMode ===
                      V1_EntitlementsLakehouseEnvironmentType.PRODUCTION_PARALLEL
                    ? 'Production (parallel)'
                    : 'Development',
              value: sourceBuilder.envMode,
            }}
            placeholder="Choose mode"
            isClearable={true}
            escapeClearsValue={true}
          />
        </div>
        <div className="query-setup__wizard__group mt-3">
          <div className="query-setup__wizard__group__title">Data Product</div>
          {sourceBuilder.isSearchEnabled ? (
            <DataProductSearchSelector
              sourceBuilder={sourceBuilder}
              accessToken={accessToken}
            />
          ) : (
            <DataProductListSelector
              sourceBuilder={sourceBuilder}
              accessToken={accessToken}
            />
          )}
        </div>
        {sourceBuilder.accessPoints.size > 0 && (
          <div className="query-setup__wizard__group mt-2">
            <div className="query-setup__wizard__group__title">
              Access Point
            </div>
            <CustomSelectorInput
              className="query-setup__wizard__selector"
              options={Array.from(sourceBuilder.accessPoints.entries()).map(
                ([id, title]) => ({
                  label: title?.trim() ? title : id,
                  value: id,
                }),
              )}
              disabled={false}
              isLoading={false}
              onChange={(newValue: { label: string; value: string } | null) => {
                const value = newValue?.value ?? '';
                const label = newValue?.label ?? '';
                sourceBuilder.setSelectedAccessPoint([value, label]);
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
                      label: sourceBuilder.selectedAccessPoint[1],
                      value: sourceBuilder.selectedAccessPoint[0],
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

            <div className="relative mt-2 h-40 w-full rounded-[5px] border-2 border-neutral-200 p-[5px]">
              {sourceBuilder.queryInitializationState.isInProgress ? (
                <FormLoadingIndicator message="Generating query..." />
              ) : (
                <DataCubeCodeEditor state={sourceBuilder.codeEditorState} />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
