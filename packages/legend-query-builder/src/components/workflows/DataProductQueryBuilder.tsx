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

import { useApplicationStore } from '@finos/legend-application';
import {
  buildExecOptions,
  buildModelAccessPointGroupOption,
  type DataProductOption,
  type DataProductQueryBuilderState,
  type ModelAccessPointGroupOption,
  NativeModelDataProductExecutionState,
  ModelAccessPointDataProductExecutionState,
} from '../../stores/workflows/dataProduct/DataProductQueryBuilderState.js';
import {
  buildElementOption,
  type PackageableElementOption,
} from '@finos/legend-lego/graph-editor';
import { CustomSelectorInput } from '@finos/legend-art';
import { QueryBuilderClassSelector } from '../QueryBuilderSideBar.js';
import { observer } from 'mobx-react-lite';
import {
  resolveUsableDataProductClasses,
  type NativeModelExecutionContext,
  type PackageableRuntime,
} from '@finos/legend-graph';
import type { DepotEntityWithOrigin } from '@finos/legend-storage';
import { useEffect } from 'react';
import { flowResult } from 'mobx';

export type NativeExecutionContextOption = {
  label: string;
  value: NativeModelExecutionContext;
};

export const buildNativeExecutionContextOption = (
  value: NativeModelExecutionContext,
): NativeExecutionContextOption => ({
  label: value.key,
  value,
});

export type DataProductRuntimeInfoOption = {
  label: string;
  value: NativeModelExecutionContext;
};
export const buildDataProductRuntimeInfoOption = (
  value: NativeModelExecutionContext,
): DataProductRuntimeInfoOption => ({
  label: value.key,
  value,
});

export const buildDataProductOption = (
  value: DepotEntityWithOrigin,
): DataProductOption => ({
  label: value.name,
  value,
});

const DataProductQueryBuilderSetupPanelContent = observer(
  (props: { queryBuilderState: DataProductQueryBuilderState }) => {
    const { queryBuilderState } = props;
    const applicationStore = useApplicationStore();
    const executionState = queryBuilderState.executionState;

    // data product
    const dataProductOptions = queryBuilderState.dataProductOptions;
    const selectedDataProductOption =
      queryBuilderState.selectedDataProductOption;
    const onDataProductOptionChange = (
      option: DataProductOption | null,
    ): void => {
      if (option?.value) {
        queryBuilderState.handleDataProductChange(option.value);
      }
    };

    const isNativeMode =
      executionState instanceof NativeModelDataProductExecutionState;
    const isModelAccessPointGroupMode =
      executionState instanceof ModelAccessPointDataProductExecutionState;

    // native execution context options
    const executionContextOptions = queryBuilderState.execOptions;
    const showExecutionContextOptions =
      isNativeMode && executionContextOptions.length > 1;
    const selectedExecOption =
      executionState instanceof NativeModelDataProductExecutionState
        ? buildExecOptions(executionState.exectionValue)
        : undefined;

    // model access point group options
    const modelAccessPointGroupOptions =
      queryBuilderState.modelAccessPointGroupOptions;
    const showModelAccessPointGroupSelector =
      isModelAccessPointGroupMode && modelAccessPointGroupOptions.length > 1;
    const selectedModelAccessPointGroupOption =
      executionState instanceof ModelAccessPointDataProductExecutionState
        ? buildModelAccessPointGroupOption(executionState.exectionValue)
        : undefined;

    // runtime options (only for model access point group)
    const showRuntimeSelector =
      executionState instanceof ModelAccessPointDataProductExecutionState &&
      executionState.showRuntimeOptions;
    const runtimeOptions =
      executionState instanceof ModelAccessPointDataProductExecutionState
        ? executionState.compatibleRuntimes.map(buildElementOption)
        : [];
    const selectedRuntimeOption =
      executionState instanceof ModelAccessPointDataProductExecutionState &&
      executionState.selectedRuntime
        ? buildElementOption(executionState.selectedRuntime)
        : null;

    const onRuntimeOptionChange = (
      option: PackageableElementOption<PackageableRuntime>,
    ): void => {
      if (
        executionState instanceof ModelAccessPointDataProductExecutionState &&
        option.value === executionState.selectedRuntime
      ) {
        return;
      }
      if (executionState instanceof ModelAccessPointDataProductExecutionState) {
        executionState.changeSelectedRuntime(option.value);
      }
    };

    // class — resolve from the active mapping and featured elements
    const activeMapping = queryBuilderState.activeMapping;
    const activeFeaturedElements = queryBuilderState.activeFeaturedElements;
    const classes = activeMapping
      ? resolveUsableDataProductClasses(
          activeFeaturedElements,
          activeMapping,
          queryBuilderState.graphManagerState,
          undefined,
        )
      : [];

    useEffect(() => {
      flowResult(queryBuilderState.loadEntities()).catch(
        applicationStore.alertUnhandledError,
      );
    }, [queryBuilderState, applicationStore]);

    const onExecutionContextOptionChange = async (
      option: NativeExecutionContextOption,
    ): Promise<void> => {
      if (isNativeMode && option.value === executionState.exectionValue) {
        return;
      }
      queryBuilderState.setExecutionState(option.value);
      await queryBuilderState.propagateExecutionContextChange();
      queryBuilderState.onExecutionContextChange?.(option.value);
    };

    const handleExecutionContextOptionChange = (
      option: NativeExecutionContextOption,
    ): void => {
      flowResult(onExecutionContextOptionChange(option));
    };

    const onModelAccessPointGroupOptionChange = async (
      option: ModelAccessPointGroupOption,
    ): Promise<void> => {
      if (
        isModelAccessPointGroupMode &&
        option.value === executionState.exectionValue
      ) {
        return;
      }
      queryBuilderState.setExecutionState(option.value);
      await queryBuilderState.propagateExecutionContextChange();
    };

    const handleModelAccessPointGroupOptionChange = (
      option: ModelAccessPointGroupOption,
    ): void => {
      flowResult(onModelAccessPointGroupOptionChange(option));
    };

    return (
      <div className="query-builder__setup__config-group">
        <div className="query-builder__setup__config-group__content">
          <div className="query-builder__setup__config-group__item">
            <label
              className="btn--sm query-builder__setup__config-group__data-product"
              title="data product"
              htmlFor="query-builder__setup__data-product-selector"
            >
              Data Product
            </label>
            <CustomSelectorInput
              inputId="query-builder__setup__data-product-selector"
              className="panel__content__form__section__dropdown query-builder__setup__config-group__item__selector"
              options={dataProductOptions}
              isLoading={
                queryBuilderState.loadDataProductModelState.isInProgress
              }
              onChange={onDataProductOptionChange}
              value={selectedDataProductOption}
              placeholder="Search for data product..."
              escapeClearsValue={true}
              darkMode={
                !applicationStore.layoutService
                  .TEMPORARY__isLightColorThemeEnabled
              }
            />
          </div>
          {Boolean(showExecutionContextOptions) && (
            <div className="query-builder__setup__config-group__item">
              <label
                className="btn--sm query-builder__setup__config-group__item__label"
                title="execution context"
                htmlFor="query-builder__setup__context-selector"
              >
                Context
              </label>
              <CustomSelectorInput
                inputId="query-builder__setup__context-selector"
                className="panel__content__form__section__dropdown query-builder__setup__config-group__item__selector"
                placeholder="Choose an execution context..."
                options={executionContextOptions}
                disabled={
                  executionContextOptions.length < 1 ||
                  (executionContextOptions.length === 1 &&
                    Boolean(selectedExecOption))
                }
                onChange={handleExecutionContextOptionChange}
                value={selectedExecOption}
                darkMode={
                  !applicationStore.layoutService
                    .TEMPORARY__isLightColorThemeEnabled
                }
              />
            </div>
          )}
          {Boolean(showModelAccessPointGroupSelector) && (
            <div className="query-builder__setup__config-group__item">
              <label
                className="btn--sm query-builder__setup__config-group__item__label"
                title="access point group"
                htmlFor="query-builder__setup__access-point-group-selector"
              >
                Access Point Group
              </label>
              <CustomSelectorInput
                inputId="query-builder__setup__access-point-group-selector"
                className="panel__content__form__section__dropdown query-builder__setup__config-group__item__selector"
                placeholder="Choose an access point group..."
                options={modelAccessPointGroupOptions}
                disabled={modelAccessPointGroupOptions.length < 1}
                onChange={handleModelAccessPointGroupOptionChange}
                value={selectedModelAccessPointGroupOption}
                darkMode={
                  !applicationStore.layoutService
                    .TEMPORARY__isLightColorThemeEnabled
                }
              />
            </div>
          )}
          {Boolean(showRuntimeSelector) && (
            <div className="query-builder__setup__config-group__item">
              <label
                className="btn--sm query-builder__setup__config-group__item__label"
                title="runtime"
                htmlFor="query-builder__setup__runtime-selector"
              >
                Runtime
              </label>
              <CustomSelectorInput
                inputId="query-builder__setup__runtime-selector"
                className="panel__content__form__section__dropdown query-builder__setup__config-group__item__selector"
                placeholder="Choose a runtime..."
                options={runtimeOptions}
                disabled={runtimeOptions.length < 1}
                onChange={onRuntimeOptionChange}
                value={selectedRuntimeOption}
                darkMode={
                  !applicationStore.layoutService
                    .TEMPORARY__isLightColorThemeEnabled
                }
              />
            </div>
          )}
          <div className="query-builder__setup__config-group__item">
            <QueryBuilderClassSelector
              queryBuilderState={queryBuilderState}
              classes={classes}
              onClassChange={queryBuilderState.onClassChange}
              noMatchMessage="No compatible entity found for specified execution context"
            />
          </div>
        </div>
      </div>
    );
  },
);

export const renderDataProductQueryBuilderSetupPanelContent = (
  queryBuilderState: DataProductQueryBuilderState,
): React.ReactNode => (
  <DataProductQueryBuilderSetupPanelContent
    queryBuilderState={queryBuilderState}
  />
);
