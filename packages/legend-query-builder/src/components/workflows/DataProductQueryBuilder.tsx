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
  type DataProductOption,
  type DataProductQueryBuilderState,
} from '../../stores/workflows/dataProduct/DataProductQueryBuilderState.js';
import { CustomSelectorInput } from '@finos/legend-art';
import { QueryBuilderClassSelector } from '../QueryBuilderSideBar.js';
import { observer } from 'mobx-react-lite';
import {
  resolveUsableDataProductClasses,
  type NativeModelExecutionContext,
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

/**
 * This setup panel supports cascading in order: Data-space -> Execution context (-> Runtime) -> Class
 *
 * In other words, we will only show:
 * - For runtime selector: the list of compatible runtimes with the selected
 execution context mapping
 * - For class selector: the list of compatible class with the selected execution context mapping
 *
 * See details on propagation/cascading in {@link DataSpaceQueryBuilderState}
 */
const DataProductQueryBuilderSetupPanelContent = observer(
  (props: { queryBuilderState: DataProductQueryBuilderState }) => {
    const { queryBuilderState } = props;
    const applicationStore = useApplicationStore();
    // data product
    const nativeAccessGroup = queryBuilderState.nativeNativeModelAccess;
    const selectedExecContext = queryBuilderState.selectedExecContext;
    const dataProductOptions: DataProductOption[] = [];
    const selectedDataProductOption =
      queryBuilderState.selectedDataProductOption;
    const onDataProductOptionChange = (
      option: DataProductOption | null,
    ): void => {
      if (option?.value) {
        queryBuilderState
          .onDataProductChange?.(option.value)
          .catch(queryBuilderState.applicationStore.alertUnhandledError);
      }
    };
    // execution context
    const executionContextOptions = queryBuilderState.execOptions;
    const showExecutionContextOptions = executionContextOptions.length > 1;
    const selectedExecOptions = buildExecOptions(selectedExecContext);
    // class
    const classes = resolveUsableDataProductClasses(
      nativeAccessGroup.featuredElements,
      selectedExecContext.mapping.value,
      queryBuilderState.graphManagerState,
      undefined,
    );

    useEffect(() => {
      flowResult(queryBuilderState.loadEntities()).catch(
        applicationStore.alertUnhandledError,
      );
    }, [queryBuilderState, applicationStore]);

    const onExecutionContextOptionChange = async (
      option: NativeExecutionContextOption,
    ): Promise<void> => {
      if (option.value === queryBuilderState.selectedExecContext) {
        return;
      }
      const currentMapping =
        queryBuilderState.selectedExecContext.mapping.value.path;
      queryBuilderState.setExecOptions(option.value);
      await queryBuilderState.propagateExecutionContextChange(
        currentMapping === option.value.mapping.value.path,
      );
      queryBuilderState.onExecutionContextChange?.(option.value);
    };

    const handleExecutionContextOptionChange = (
      option: NativeExecutionContextOption,
    ): void => {
      flowResult(onExecutionContextOptionChange(option));
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
                    Boolean(selectedExecOptions))
                }
                onChange={handleExecutionContextOptionChange}
                value={selectedExecOptions}
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
