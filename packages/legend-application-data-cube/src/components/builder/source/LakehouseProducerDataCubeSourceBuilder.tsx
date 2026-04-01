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
import type { LakehouseProducerDataCubeSourceBuilderState } from '../../../stores/builder/source/LakehouseProducerDataCubeSourceBuilderState.js';
import { FormCheckbox, FormTextInput } from '@finos/legend-data-cube';
import { CustomSelectorInput } from '@finos/legend-art';
import { useAuth } from 'react-oidc-context';
import { useLegendDataCubeBuilderStore } from '../LegendDataCubeBuilderStoreProvider.js';
import { guaranteeNonNullable } from '@finos/legend-shared';
import { useEffect, useState } from 'react';
import { V1_EntitlementsLakehouseEnvironmentType } from '@finos/legend-graph';

export const LakehouseProducerDataCubeSourceBuilder: React.FC<{
  sourceBuilder: LakehouseProducerDataCubeSourceBuilderState;
}> = observer(({ sourceBuilder: state }) => {
  const auth = useAuth();
  const store = useLegendDataCubeBuilderStore();
  const [isIcebergFlowSelected, setIsIcebergFlowSelected] = useState(true);

  const toggleSetisIcebergEnabled = () => {
    setIsIcebergFlowSelected(!isIcebergFlowSelected);
    state.setEnableIceberg(!isIcebergFlowSelected);
  };

  useEffect(() => {
    state.resetAll();
    state.initialLoad(auth.user?.access_token);
  }, [state, auth]);

  function createUrnPairs(
    urns: string[],
  ): Record<string, string | undefined>[] {
    return urns.map((urn) => ({
      urn,
      decoratedUrn: state.decoratedIngest(urn),
    }));
  }

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
              state.setEnvMode(newVal.value, auth.user?.access_token);
            }}
            value={{
              label:
                state.envMode ===
                V1_EntitlementsLakehouseEnvironmentType.PRODUCTION
                  ? 'Production'
                  : 'Production (parallel)',
              value: state.envMode,
            }}
            placeholder="Choose mode"
            isClearable={false}
            escapeClearsValue={true}
          />
        </div>
        {state.userEntitledLakehouseEnv && (
          <div className="query-setup__wizard__group mt-3">
            <div className="query-setup__wizard__group__title">Producer</div>
            <CustomSelectorInput
              className="query-setup__wizard__selector"
              options={state.producerEnvironments.map((env) => ({
                label: env.split(':').pop() ?? env,
                value: env,
              }))}
              onChange={(newVal: { label: string; value: string } | null) => {
                state.setSelectedProducerEnv(newVal?.value);
                if (newVal?.value) {
                  state
                    .fetchIngestUrns(auth.user?.access_token)
                    .catch((error: Error) =>
                      store.alertService.alertUnhandledError(error),
                    );
                }
              }}
              value={
                state.selectedProducerEnv
                  ? {
                      label:
                        state.selectedProducerEnv.split(':').pop() ??
                        state.selectedProducerEnv,
                      value: state.selectedProducerEnv,
                    }
                  : null
              }
              isLoading={state.fetchProducerEnvironmentsState.isInProgress}
              placeholder="Choose producer environment"
              isClearable={false}
              escapeClearsValue={true}
            />
          </div>
        )}

        {state.icebergEnabled && (
          <div className="query-setup__wizard__group mt-2">
            <div className="flex h-5 w-[calc(100%_-_40px)] overflow-x-auto">
              <FormCheckbox
                label="Use Iceberg"
                checked={isIcebergFlowSelected}
                onChange={toggleSetisIcebergEnabled}
              />
            </div>
          </div>
        )}
        {state.ingestUrns.length > 0 && (
          <div className="query-setup__wizard__group mt-3">
            <div className="query-setup__wizard__group__title">Ingest Urn</div>
            <CustomSelectorInput
              className="query-setup__wizard__selector text-nowrap"
              options={createUrnPairs(state.ingestUrns)
                .filter((def) => def.decoratedUrn !== undefined)
                .map((urn) => ({
                  label: guaranteeNonNullable(urn.decoratedUrn),
                  value: guaranteeNonNullable(urn.urn),
                }))}
              disabled={false}
              isLoading={false}
              onChange={(newValue: { label: string; value: string } | null) => {
                const ingestUrn = newValue?.value ?? '';
                state.setSelectedIngestUrn(ingestUrn);
                state
                  .fetchDatasets(auth.user?.access_token)
                  .catch((error) =>
                    store.alertService.alertUnhandledError(error),
                  );
              }}
              value={
                state.selectedIngestUrn
                  ? {
                      label: state.selectedIngestUrn,
                      value: state.selectedIngestUrn,
                    }
                  : null
              }
              isClearable={false}
              escapeClearsValue={true}
            />
          </div>
        )}
        {state.tables.length > 0 && (
          <div className="query-setup__wizard__group mt-2">
            <div className="query-setup__wizard__group__title">Dataset</div>
            <CustomSelectorInput
              className="query-setup__wizard__selector"
              options={state.tables.map((table) => ({
                label: `${state.datasetGroup}.${table}`,
                value: table,
              }))}
              disabled={false}
              isLoading={false}
              onChange={(newValue: { label: string; value: string } | null) => {
                const table = newValue?.value ?? '';
                state.setSelectedTable(table);
              }}
              value={
                state.selectedTable
                  ? { label: state.selectedTable, value: state.selectedTable }
                  : null
              }
              isClearable={false}
              escapeClearsValue={true}
            />
          </div>
        )}
        {state.selectedTable &&
          (!isIcebergFlowSelected || !state.icebergEnabled) && (
            <div className="query-setup__wizard__group mt-2">
              <div className="query-setup__wizard__group__title">Warehouse</div>
              <FormTextInput
                className="w-full text-base text-black"
                value={state.warehouse}
                onChange={(event) => {
                  state.setWarehouse(event.target.value);
                }}
              />
            </div>
          )}
      </div>
    </div>
  );
});
