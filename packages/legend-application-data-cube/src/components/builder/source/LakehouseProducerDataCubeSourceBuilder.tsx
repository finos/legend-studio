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
import {
  FormButton,
  FormCheckbox,
  FormTextInput,
} from '@finos/legend-data-cube';
import { CustomSelectorInput } from '@finos/legend-art';
import { useAuth } from 'react-oidc-context';
import { useLegendDataCubeBuilderStore } from '../LegendDataCubeBuilderStoreProvider.js';
import { guaranteeNonNullable } from '@finos/legend-shared';
import { useEffect, useState } from 'react';

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
    state.reset();
  }, [state]);

  useEffect(() => {
    state.setUserManagerSettings(auth.settings);
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
        <div className="query-setup__wizard__group">
          <div className="query-setup__wizard__group__title">Deploymet ID</div>
          <div className="flex h-full w-fit flex-auto items-center justify-end text-nowrap">
            <FormTextInput
              className="text-base text-black"
              value={state.deploymentId}
              onChange={(event) => {
                state.setDeploymentId(Number(event.target.value));
              }}
              placeholder="Enter Deployment ID"
            />
            <FormButton
              compact={true}
              className="ml-1.5 text-nowrap text-sm text-black"
              onClick={() => {
                state
                  .fetchIngestUrns(auth.user?.access_token)
                  .catch((error) =>
                    store.alertService.alertUnhandledError(error),
                  );
              }}
            >
              Proceed
            </FormButton>
          </div>
        </div>
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
