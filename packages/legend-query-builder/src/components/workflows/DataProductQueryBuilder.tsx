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
  ModelAccessPointDataProductExecutionState,
} from '../../stores/workflows/dataProduct/DataProductQueryBuilderState.js';
import {
  buildElementOption,
  type PackageableElementOption,
} from '@finos/legend-lego/graph-editor';
import { CustomSelectorInput } from '@finos/legend-art';
import { QueryBuilderClassSelector } from '../QueryBuilderSideBar.js';
import { observer } from 'mobx-react-lite';
import type {
  PackageableRuntime,
  NativeModelExecutionContext,
  ModelAccessPointGroup,
} from '@finos/legend-graph';
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
        {Boolean(queryBuilderState.showExecutionContextOptions) && (
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
              options={queryBuilderState.execOptions}
              disabled={
                queryBuilderState.execOptions.length < 1 ||
                (queryBuilderState.execOptions.length === 1 &&
                  Boolean(queryBuilderState.selectedExecOption))
              }
              onChange={(option: { value: NativeModelExecutionContext }) =>
                queryBuilderState.changeNativeExecutionContext(option.value)
              }
              value={queryBuilderState.selectedExecOption}
              darkMode={
                !applicationStore.layoutService
                  .TEMPORARY__isLightColorThemeEnabled
              }
            />
          </div>
        )}
        {Boolean(queryBuilderState.showModelAccessPointGroupSelector) && (
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
              options={queryBuilderState.modelAccessPointGroupOptions}
              disabled={
                queryBuilderState.modelAccessPointGroupOptions.length < 1
              }
              onChange={(option: { value: ModelAccessPointGroup }) =>
                queryBuilderState.changeModelAccessPointGroupValue(option.value)
              }
              value={queryBuilderState.selectedModelAccessPointGroupOption}
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
            classes={queryBuilderState.usableClasses}
            onClassChange={queryBuilderState.onClassChange}
            noMatchMessage="No compatible entity found for specified execution context"
          />
        </div>
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
      if (executionState instanceof ModelAccessPointDataProductExecutionState) {
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
