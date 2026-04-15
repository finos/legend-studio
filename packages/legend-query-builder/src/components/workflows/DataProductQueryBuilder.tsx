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
  type DataProductOption,
  type DataProductQueryBuilderState,
  type ExecutionIdOption,
  LakehouseDataProductExecutionState,
  ModelAccessPointDataProductExecutionState,
} from '../../stores/workflows/dataProduct/DataProductQueryBuilderState.js';
import {
  buildElementOption,
  type PackageableElementOption,
} from '@finos/legend-lego/graph-editor';
import { CustomSelectorInput } from '@finos/legend-art';
import { QueryBuilderClassSelector } from '../QueryBuilderSideBar.js';
import { observer } from 'mobx-react-lite';
import type { PackageableRuntime } from '@finos/legend-graph';
import { useEffect } from 'react';
import { flowResult } from 'mobx';

/**
 * Shared form selectors for data product query builder setup.
 * Renders the data product selector, execution context / access point group
 * selector, and class selector. Consumed by both the base setup panel and
 * the LegendQuery-specific setup panel.
 */
export const DataProductQueryBuilderSetupFormContent = observer(
  (props: {
    queryBuilderState: DataProductQueryBuilderState;
    formatOptionLabel?:
      | ((option: DataProductOption) => React.ReactNode)
      | undefined;
    isLoading?: boolean | undefined;
  }) => {
    const { queryBuilderState, formatOptionLabel, isLoading } = props;
    const applicationStore = useApplicationStore();

    const onDataProductOptionChange = (
      option: DataProductOption | null,
    ): void => {
      if (option?.value) {
        queryBuilderState.handleDataProductChange(option.value);
      }
    };

    useEffect(() => {
      flowResult(queryBuilderState.loadEntities()).catch(
        applicationStore.alertUnhandledError,
      );
    }, [queryBuilderState, applicationStore]);

    return (
      <>
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
            options={queryBuilderState.dataProductOptions}
            isLoading={
              isLoading ??
              queryBuilderState.loadDataProductModelState.isInProgress
            }
            onChange={onDataProductOptionChange}
            value={queryBuilderState.selectedDataProductOption}
            placeholder="Search for data product..."
            escapeClearsValue={true}
            darkMode={
              !applicationStore.layoutService
                .TEMPORARY__isLightColorThemeEnabled
            }
            {...(formatOptionLabel ? { formatOptionLabel } : {})}
          />
        </div>
        {Boolean(queryBuilderState.showExecutionIdSelector) && (
          <div className="query-builder__setup__config-group__item">
            <label
              className="btn--sm query-builder__setup__config-group__item__label"
              title="execution id"
              htmlFor="query-builder__setup__execution-id-selector"
            >
              Execution ID
            </label>
            <CustomSelectorInput
              inputId="query-builder__setup__execution-id-selector"
              className="panel__content__form__section__dropdown query-builder__setup__config-group__item__selector"
              placeholder="Choose an execution id..."
              options={queryBuilderState.executionIdOptions}
              disabled={queryBuilderState.executionIdOptions.length < 2}
              onChange={(option: ExecutionIdOption) => {
                queryBuilderState
                  .changeExecutionId(option)
                  .catch(applicationStore.alertUnhandledError);
              }}
              value={queryBuilderState.selectedExecutionIdOption}
              formatOptionLabel={(option: ExecutionIdOption) => (
                <div className="query-builder__setup__config-group__item__selector__option">
                  <span>{option.label}</span>
                  <span className="query-builder__setup__config-group__item__selector__option__tag">
                    {option.tag}
                  </span>
                </div>
              )}
              darkMode={
                !applicationStore.layoutService
                  .TEMPORARY__isLightColorThemeEnabled
              }
            />
          </div>
        )}
        {!queryBuilderState.isLakehouseMode && (
          <div className="query-builder__setup__config-group__item">
            <QueryBuilderClassSelector
              queryBuilderState={queryBuilderState}
              classes={queryBuilderState.usableClasses}
              onClassChange={queryBuilderState.onClassChange}
              noMatchMessage="No compatible entity found for specified execution context"
            />
          </div>
        )}
      </>
    );
  },
);

const DataProductQueryBuilderSetupPanelContent = observer(
  (props: { queryBuilderState: DataProductQueryBuilderState }) => {
    const { queryBuilderState } = props;
    const applicationStore = useApplicationStore();
    const executionState = queryBuilderState.executionState;

    // runtime options (only for model access point group)
    const runtimeRequired =
      executionState instanceof ModelAccessPointDataProductExecutionState ||
      executionState instanceof LakehouseDataProductExecutionState;
    const showRuntimeSelector =
      runtimeRequired && executionState.showRuntimeOptions;
    const runtimeOptions = runtimeRequired
      ? executionState.compatibleRuntimes.map(buildElementOption)
      : [];
    const selectedRuntimeOption =
      runtimeRequired && executionState.selectedRuntime
        ? buildElementOption(executionState.selectedRuntime)
        : null;

    const onRuntimeOptionChange = (
      option: PackageableElementOption<PackageableRuntime>,
    ): void => {
      if (runtimeRequired) {
        if (option.value === executionState.selectedRuntime) {
          return;
        }
        executionState.changeSelectedRuntime(option.value);
      }
    };

    return (
      <div className="query-builder__setup__config-group">
        <div className="query-builder__setup__config-group__content">
          <DataProductQueryBuilderSetupFormContent
            queryBuilderState={queryBuilderState}
          />
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
