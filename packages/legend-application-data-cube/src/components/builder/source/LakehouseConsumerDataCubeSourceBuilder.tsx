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
import { useEffect } from 'react';
import type { LakehouseConsumerDataCubeSourceBuilderState } from '../../../stores/builder/source/LakehouseConsumerDataCubeSourceBuilderState.js';
import { useLegendDataCubeBuilderStore } from '../LegendDataCubeBuilderStoreProvider.js';
import {
  buildIngestDeploymentServerConfigOption,
  type IngestDeploymentServerConfigOption,
} from '@finos/legend-server-lakehouse';
import { V1_IngestEnvironmentClassification } from '@finos/legend-graph';

export const LakehouseConsumerDataCubeSourceBuilder: React.FC<{
  sourceBuilder: LakehouseConsumerDataCubeSourceBuilderState;
}> = observer(({ sourceBuilder }) => {
  const auth = useAuth();
  const store = useLegendDataCubeBuilderStore();
  const envOptions = sourceBuilder.environments
    .map(buildIngestDeploymentServerConfigOption)
    // not include dev
    .filter(
      (config) =>
        config.value.environmentClassification !==
        V1_IngestEnvironmentClassification.DEV,
    )
    .sort(
      (a, b) =>
        a.value.environmentName.localeCompare(b.value.environmentName) ||
        a.value.environmentClassification.localeCompare(
          b.value.environmentClassification,
        ),
    );

  const selectedEnvOption = sourceBuilder.selectedEnvironment
    ? buildIngestDeploymentServerConfigOption(sourceBuilder.selectedEnvironment)
    : null;
  const onEnvChange = (newValue: IngestDeploymentServerConfigOption | null) => {
    sourceBuilder.setSelectedEnvironment(newValue?.value ?? undefined);
    sourceBuilder
      .fetchAccessPoints()
      .catch((error) => store.alertService.alertUnhandledError(error));
  };

  useEffect(() => {
    sourceBuilder.reset();
    try {
      sourceBuilder.loadDataProducts(auth.user?.access_token);
      sourceBuilder.fetchEnvironment(auth.user?.access_token);
    } catch (error) {
      assertErrorThrown(error);
      store.alertService.alertUnhandledError(error);
    }
  }, [sourceBuilder, auth, store]);

  return (
    <div className="flex h-full w-full">
      <div className="m-3 flex w-full flex-col items-stretch gap-2 text-neutral-500">
        <div className="query-setup__wizard__group mt-3">
          <div className="query-setup__wizard__group__title">Data Product</div>
          <CustomSelectorInput
            className="query-setup__wizard__selector text-nowrap"
            options={sourceBuilder.dataProducts.map((dataProduct) => ({
              label: guaranteeNonNullable(dataProduct.fullPath),
              value: guaranteeNonNullable(dataProduct.fullPath),
            }))}
            disabled={
              sourceBuilder.dataProductLoadingState.isInProgress ||
              sourceBuilder.dataProductLoadingState.hasFailed
            }
            isLoading={sourceBuilder.dataProductLoadingState.isInProgress}
            onChange={(newValue: { label: string; value: string } | null) => {
              sourceBuilder.setSelectedDataProduct(newValue?.value ?? '');
              sourceBuilder
                .fetchDataProduct(auth.user?.access_token)
                .catch((error) =>
                  store.alertService.alertUnhandledError(error),
                );
            }}
            value={
              sourceBuilder.selectedDataProduct
                ? {
                    label: sourceBuilder.selectedDataProduct,
                    value: sourceBuilder.selectedDataProduct,
                  }
                : null
            }
            placeholder={`Choose a Data Product`}
            isClearable={false}
            escapeClearsValue={true}
          />
        </div>
        {sourceBuilder.environments.length > 0 && (
          <div className="query-setup__wizard__group mt-3">
            <div className="query-setup__wizard__group__title">Environment</div>
            <CustomSelectorInput
              className="query-setup__wizard__selector text-nowrap"
              options={envOptions}
              disabled={
                sourceBuilder.ingestEnvLoadingState.isInProgress ||
                sourceBuilder.ingestEnvLoadingState.hasFailed ||
                !sourceBuilder.selectedDataProduct
              }
              isLoading={sourceBuilder.ingestEnvLoadingState.isInProgress}
              onChange={(
                newValue: IngestDeploymentServerConfigOption | null,
              ) => {
                onEnvChange(newValue);
              }}
              value={selectedEnvOption}
              placeholder={`Choose an Environment`}
              isClearable={false}
              escapeClearsValue={true}
            />
          </div>
        )}
        {sourceBuilder.accessPoints.length > 0 &&
          sourceBuilder.selectedEnvironment && (
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
                onChange={(
                  newValue: { label: string; value: string } | null,
                ) => {
                  const accessPoint = newValue?.value ?? '';
                  sourceBuilder.setSelectedAccessPoint(accessPoint);
                  sourceBuilder.setWarehouse(
                    sourceBuilder.DEFAULT_CONSUMER_WAREHOUSE,
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
                sourceBuilder
                  .initializeQuery()
                  .catch((error) =>
                    store.alertService.alertUnhandledError(error),
                  );
              }}
            />
          </div>
        )}
        {sourceBuilder.warehouse && sourceBuilder.showQueryEditor && (
          <div className="mt-4 border-t border-neutral-300 pt-3">
            <div className="query-setup__wizard__group__title mb-2">
              Query Editor
            </div>
            <DataCubeCodeEditor state={sourceBuilder.codeEditorState} />
          </div>
        )}
      </div>
    </div>
  );
});
