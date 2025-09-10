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
  _defaultPrimitiveTypeValue,
  _primitiveValue,
  FormTextInput,
  isPrimitiveType,
} from '@finos/legend-data-cube';
import { CustomSelectorInput } from '@finos/legend-art';
import { useAuth } from 'react-oidc-context';
import { useLegendDataCubeBuilderStore } from '../LegendDataCubeBuilderStoreProvider.js';
import {
  assertErrorThrown,
  guaranteeNonNullable,
  guaranteeType,
} from '@finos/legend-shared';
import { useEffect } from 'react';
import type { LakehouseConsumerDataCubeSourceBuilderState } from '../../../stores/builder/source/LakehouseConsumerDataCubeSourceBuilderState.js';
import {
  PRIMITIVE_TYPE,
  V1_observe_ValueSpecification,
  V1_PackageableType,
  type V1_ValueSpecification,
} from '@finos/legend-graph';
import { V1_BasicValueSpecificationEditor } from '@finos/legend-query-builder';

export const LakehouseConsumerDataCubeSourceBuilder: React.FC<{
  sourceBuilder: LakehouseConsumerDataCubeSourceBuilderState;
}> = observer(({ sourceBuilder: state }) => {
  const auth = useAuth();
  const store = useLegendDataCubeBuilderStore();

  useEffect(() => {
    state.reset();
    state.loadDataProducts();
  }, [state]);

  return (
    <div className="flex h-full w-full">
      <div className="m-3 flex w-full flex-col items-stretch gap-2 text-neutral-500">
        <div className="query-setup__wizard__group mt-3">
          <div className="query-setup__wizard__group__title">Data Product</div>
          <CustomSelectorInput
            className="query-setup__wizard__selector text-nowrap"
            options={state.dataProducts.map((dataProduct) => ({
              label: guaranteeNonNullable(dataProduct.path),
              value: guaranteeNonNullable(dataProduct.path),
            }))}
            disabled={
              state.dataProductLoadingState.isInProgress ||
              state.dataProductLoadingState.hasFailed
            }
            isLoading={state.dataProductLoadingState.isInProgress}
            onChange={(newValue: { label: string; value: string } | null) => {
              state.setSelectedDataProduct(newValue?.value ?? '');
              state.fetchDataProductEnvironments(auth.user?.access_token);
            }}
            value={
              state.selectedDataProduct
                ? {
                    label: state.selectedDataProduct,
                    value: state.selectedDataProduct,
                  }
                : null
            }
            placeholder={`Choose a Data Product`}
            isClearable={false}
            escapeClearsValue={true}
          />
        </div>
        {state.environments.length > 0 && (
          <div className="query-setup__wizard__group mt-2">
            <div className="query-setup__wizard__group__title">Environment</div>
            <CustomSelectorInput
              className="query-setup__wizard__selector"
              options={state.environments.map((env) => ({
                label: env,
                value: env,
              }))}
              disabled={false}
              isLoading={false}
              onChange={(newValue: { label: string; value: string } | null) => {
                const env = newValue?.value ?? '';
                state.setSelectedEnvironment(env);
                state.fetchAccessPoints();
              }}
              value={
                state.selectedEnvironment
                  ? {
                      label: state.selectedEnvironment,
                      value: state.selectedEnvironment,
                    }
                  : null
              }
              isClearable={false}
              escapeClearsValue={true}
            />
          </div>
        )}
        {state.accessPoints.length > 0 && (
          <div className="query-setup__wizard__group mt-2">
            <div className="query-setup__wizard__group__title">
              Access Point
            </div>
            <CustomSelectorInput
              className="query-setup__wizard__selector"
              options={state.accessPoints.map((accessPoint) => ({
                label: accessPoint,
                value: accessPoint,
              }))}
              disabled={false}
              isLoading={false}
              onChange={(newValue: { label: string; value: string } | null) => {
                const accessPoint = newValue?.value ?? '';
                state.setSelectedAccessPoint(accessPoint);
                state
                  .fetchEnvironment(auth.user?.access_token)
                  .catch((error) => {
                    assertErrorThrown(error);
                    store.alertService.alertUnhandledError(error);
                  });
              }}
              value={
                state.selectedAccessPoint
                  ? {
                      label: state.selectedAccessPoint,
                      value: state.selectedAccessPoint,
                    }
                  : null
              }
              isClearable={false}
              escapeClearsValue={true}
            />
          </div>
        )}
        {state.selectedAccessPoint && (
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
        {state.queryParameters && state.queryParameters.length > 0 && (
          <div className="h-50 mt-2 w-full overflow-auto">
            {state.queryParameterValues &&
              Object.entries(state.queryParameterValues).map(
                ([name, { variable, valueSpec }]) => {
                  const packageableType = guaranteeType(
                    variable.genericType?.rawType,
                    V1_PackageableType,
                    'Can only edit parameters with packageable type',
                  );
                  const resetValue = (): void => {
                    if (isPrimitiveType(packageableType.fullPath)) {
                      state.setQueryParameterValue(
                        name,
                        V1_observe_ValueSpecification(
                          _primitiveValue(
                            packageableType.fullPath,
                            _defaultPrimitiveTypeValue(
                              packageableType.fullPath,
                            ),
                          ),
                        ),
                      );
                    }
                    // TODO: check if enum is ever present for Data Products
                  };
                  return (
                    <div key={name} className="mt-1 flex h-fit min-h-5 w-full">
                      <div className="my-auto">
                        {name}
                        {': '}
                      </div>
                      <V1_BasicValueSpecificationEditor
                        valueSpecification={valueSpec}
                        multiplicity={variable.multiplicity}
                        typeCheckOption={{
                          expectedType: packageableType,
                          match:
                            packageableType.fullPath ===
                            PRIMITIVE_TYPE.DATETIME,
                        }}
                        setValueSpecification={(val: V1_ValueSpecification) => {
                          state.setQueryParameterValue(
                            name,
                            V1_observe_ValueSpecification(val),
                          );
                        }}
                        resetValue={resetValue}
                        className="ml-2 flex flex-auto"
                        selectorConfig={{
                          optionCustomization: { rowHeight: 20 },
                        }}
                        lightMode={true}
                      />
                    </div>
                  );
                },
              )}
          </div>
        )}
      </div>
    </div>
  );
});
