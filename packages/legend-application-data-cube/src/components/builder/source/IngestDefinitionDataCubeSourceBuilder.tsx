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
import type { IngestDefinitionDataCubeSourceBuilderState } from '../../../stores/builder/source/IngestDefinitionDataCubeSourceBuilderState.js';
import { FormButton, FormTextInput } from '@finos/legend-data-cube';
import { CustomSelectorInput } from '@finos/legend-art';
import { useAuth } from 'react-oidc-context';
import { useLegendDataCubeBuilderStore } from '../LegendDataCubeBuilderStoreProvider.js';

export const IngestDefinitionDataCubeSourceBuilder: React.FC<{
  sourceBuilder: IngestDefinitionDataCubeSourceBuilderState;
}> = observer(({ sourceBuilder: state }) => {
  const auth = useAuth();
  const store = useLegendDataCubeBuilderStore();

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
        {state.ingestUrns.length > 0 && (
          <div className="query-setup__wizard__group mt-3">
            <div className="query-setup__wizard__group__title">Ingest Urn</div>
            <CustomSelectorInput
              className="query-setup__wizard__selector"
              options={state.ingestUrns.map((urn) => ({
                label: urn,
                value: urn,
              }))}
              disabled={false}
              isLoading={false}
              onChange={(newValue: { label: string; value: string } | null) => {
                const ingestUrn = newValue?.value ?? '';
                state.setSelectedIngestUrn(ingestUrn);
                state.setTables(state.fetchDatasets());
              }}
              value={
                state.selectedIngestUrn
                  ? {
                      label: state.selectedIngestUrn,
                      value: state.selectedIngestUrn,
                    }
                  : null
              }
              placeholder={state.ingestUrns.at(0)}
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
                label: table,
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
              placeholder={state.tables.at(0)}
              isClearable={false}
              escapeClearsValue={true}
            />
          </div>
        )}
        {state.selectedTable && (
          <div className="query-setup__wizard__group mt-2">
            <div className="query-setup__wizard__group__title">Warehouse</div>
            <FormTextInput
              className="w-full text-base text-black"
              value={state.warehouse}
              onChange={(event) => {
                state.setWarehouse(event.target.value);
              }}
              placeholder="Enter Warehouse Name"
            />
          </div>
        )}
      </div>
    </div>
  );
});
