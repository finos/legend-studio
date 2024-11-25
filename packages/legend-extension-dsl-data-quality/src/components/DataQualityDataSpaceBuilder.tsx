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

import { observer } from 'mobx-react-lite';
import { useApplicationStore } from '@finos/legend-application';
import { useEffect } from 'react';
import { guaranteeType } from '@finos/legend-shared';
import { flowResult } from 'mobx';
import {
  type Runtime,
  getMappingCompatibleRuntimes,
  PackageableElementExplicitReference,
  RuntimePointer,
} from '@finos/legend-graph';
import { DataQualityClassSelector } from './DataQualitySideBar.js';
import {
  CheckIcon,
  createFilter,
  MenuContentItemIcon,
  MenuContentItemLabel,
  MoreHorizontalIcon,
  PlayIcon,
  CustomSelectorInput,
  ControlledDropdownMenu,
  MenuContent,
  MenuContentItem,
  PURE_RuntimeIcon,
} from '@finos/legend-art';
import { resolveUsableDataSpaceClasses } from '@finos/legend-extension-dsl-data-space/graph';
import type { DataQualityClassValidationState } from './states/DataQualityClassValidationState.js';
import { DataSpaceIcon } from '@finos/legend-extension-dsl-data-space/application';
import {
  type DataSpaceOption,
  type ExecutionContextOption,
  buildDataSpaceOption,
  buildExecutionContextOption,
  formatDataSpaceOptionLabel,
} from '@finos/legend-extension-dsl-data-space/application-query';
import {
  buildRuntimeValueOption,
  getRuntimeOptionFormatter,
} from '@finos/legend-query-builder';

export const DataQualityDataSpaceBuilderSetupPanelContent = observer(
  (props: { dataQualityState: DataQualityClassValidationState }) => {
    const { dataQualityState } = props;
    const { dataQualityQueryBuilderState } = dataQualityState;
    const dataSpace = dataQualityState.dataSpace;
    if (!dataSpace) {
      return null;
    }
    const applicationStore = useApplicationStore();

    // data product
    const dataSpaceOptions =
      dataQualityState.dataSpaces.map(buildDataSpaceOption);

    const selectedDataSpaceOption = {
      label: dataSpace.title ?? dataSpace.name,
      value: {
        title: dataSpace.title,
        name: dataSpace.name,
        path: dataSpace.path,
        defaultExecutionContext: dataSpace.defaultExecutionContext.name,
      },
    } as DataSpaceOption;
    const executionContextOptions = dataSpace.executionContexts.map(
      buildExecutionContextOption,
    );
    const runtimeOptions = getMappingCompatibleRuntimes(
      dataQualityQueryBuilderState.executionContextState.mapping!,
      dataQualityState.graphManagerState.usableRuntimes,
    )
      .map(
        (rt) =>
          new RuntimePointer(PackageableElementExplicitReference.create(rt)),
      )
      .map(buildRuntimeValueOption);

    const selectedRuntimeOption = dataQualityQueryBuilderState
      .executionContextState.runtimeValue
      ? buildRuntimeValueOption(
          dataQualityQueryBuilderState.executionContextState.runtimeValue,
        )
      : null;
    const classes = resolveUsableDataSpaceClasses(
      dataSpace,
      dataQualityQueryBuilderState.executionContextState.mapping!,
      dataQualityState.graphManagerState,
    );

    const onDataSpaceOptionChange = (option: DataSpaceOption): void => {
      dataQualityState.onDataSpaceChange(option.value);
      dataQualityState.updateElementOnDataSpaceChange();
    };

    const selectedExecutionContextOption = buildExecutionContextOption(
      dataQualityState.executionContext,
    );
    const onExecutionContextOptionChange = (
      option: ExecutionContextOption,
    ): void => {
      if (option.value === dataQualityState.executionContext) {
        return;
      }
      dataQualityState.setExecutionContext(option.value);
      dataQualityState.propagateExecutionContextChange(option.value);
      dataQualityState.updateElementOnExecutionContextChange(option.value.name);
      dataQualityState.onExecutionContextChange?.(option.value);
    };

    const changeRuntime = (option: { value: Runtime }): void => {
      if (
        option.value ===
        dataQualityQueryBuilderState.executionContextState.runtimeValue
      ) {
        return;
      }
      dataQualityQueryBuilderState.changeRuntime(option.value);
      dataQualityState.onRuntimeChange?.(option.value);
    };

    const runtimeFilterOption = createFilter({
      ignoreCase: true,
      ignoreAccents: false,
      stringify: (option: { data: { value: Runtime } }): string =>
        guaranteeType(option.data.value, RuntimePointer).packageableRuntime
          .value.path,
    });

    useEffect(() => {
      flowResult(dataQualityState.loadDataSpaces()).catch(
        applicationStore.alertUnhandledError,
      );
    }, [dataQualityState, applicationStore]);

    return (
      <>
        <div className="data-quality-validation__setup__config-group">
          <div className="data-quality-validation__setup__config-group__header">
            <div className="data-quality-validation__setup__config-group__header__title">
              data product execution context
            </div>
            <ControlledDropdownMenu
              className="data-quality-validation__setup__config-group__header__dropdown-trigger"
              title="Show Settings..."
              content={
                <MenuContent>
                  <MenuContentItem
                    onClick={(): void =>
                      dataQualityState.setShowRuntimeSelector(
                        !dataQualityState.showRuntimeSelector,
                      )
                    }
                  >
                    <MenuContentItemIcon>
                      {dataQualityState.showRuntimeSelector ? (
                        <CheckIcon />
                      ) : null}
                    </MenuContentItemIcon>
                    <MenuContentItemLabel>
                      Show Runtime Selector
                    </MenuContentItemLabel>
                  </MenuContentItem>
                </MenuContent>
              }
              menuProps={{
                anchorOrigin: { vertical: 'bottom', horizontal: 'right' },
                transformOrigin: { vertical: 'top', horizontal: 'right' },
              }}
            >
              <MoreHorizontalIcon />
            </ControlledDropdownMenu>
          </div>
          <div className="data-quality-validation__setup__config-group__content">
            <div className="data-quality-validation__setup__config-group__item">
              <div
                className="btn--sm data-quality-validation__setup__config-group__item__label"
                title="data product"
              >
                <DataSpaceIcon />
              </div>
              <CustomSelectorInput
                className="panel__content__form__section__dropdown data-quality-validation__setup__config-group__item__selector"
                options={dataSpaceOptions}
                isLoading={dataQualityState.loadDataSpacesState.isInProgress}
                onChange={onDataSpaceOptionChange}
                value={selectedDataSpaceOption}
                placeholder="Search for data product..."
                escapeClearsValue={true}
                darkMode={
                  !applicationStore.layoutService
                    .TEMPORARY__isLightColorThemeEnabled
                }
                formatOptionLabel={formatDataSpaceOptionLabel}
              />
            </div>
            <div className="data-quality-validation__setup__config-group__item">
              <div
                className="btn--sm data-quality-validation__setup__config-group__item__label"
                title="execution context"
              >
                <PlayIcon className="data-quality-validation__setup__data-space__icon__execution-context" />
              </div>
              <CustomSelectorInput
                className="panel__content__form__section__dropdown data-quality-validation__setup__config-group__item__selector"
                placeholder="Choose an execution context..."
                options={executionContextOptions}
                disabled={
                  executionContextOptions.length < 1 ||
                  (executionContextOptions.length === 1 &&
                    Boolean(selectedExecutionContextOption))
                }
                onChange={onExecutionContextOptionChange}
                value={selectedExecutionContextOption}
                darkMode={
                  !applicationStore.layoutService
                    .TEMPORARY__isLightColorThemeEnabled
                }
              />
            </div>
            {dataQualityState.showRuntimeSelector && (
              <div className="data-quality-validation__setup__config-group__item">
                <div
                  className="btn--sm data-quality-validation__setup__config-group__item__label"
                  title="runtime"
                >
                  <PURE_RuntimeIcon />
                </div>
                <CustomSelectorInput
                  className="panel__content__form__section__dropdown data-quality-validation__setup__config-group__item__selector"
                  placeholder="Choose a runtime..."
                  noMatchMessage="No compatible runtime found for specified execution context"
                  options={runtimeOptions}
                  onChange={changeRuntime}
                  value={selectedRuntimeOption}
                  darkMode={
                    !applicationStore.layoutService
                      .TEMPORARY__isLightColorThemeEnabled
                  }
                  filterOption={runtimeFilterOption}
                  formatOptionLabel={getRuntimeOptionFormatter({
                    darkMode:
                      !applicationStore.layoutService
                        .TEMPORARY__isLightColorThemeEnabled,
                  })}
                  disabled={true}
                />
              </div>
            )}
          </div>
        </div>
        <DataQualityClassSelector
          dataQualityState={dataQualityState}
          classes={classes}
          noMatchMessage="No compatible class found for specified execution context"
        />
      </>
    );
  },
);
