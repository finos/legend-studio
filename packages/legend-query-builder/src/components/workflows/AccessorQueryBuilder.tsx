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

import {
  CustomSelectorInput,
  PanelHeader,
  compareLabelFn,
  createFilter,
} from '@finos/legend-art';
import { observer } from 'mobx-react-lite';
import {
  type Runtime,
  RuntimePointer,
  PackageableElementExplicitReference,
} from '@finos/legend-graph';
import { useApplicationStore } from '@finos/legend-application';
import {
  buildRuntimeValueOption,
  getRuntimeOptionFormatter,
} from '../QueryBuilderSideBar.js';
import type {
  AccessorQueryBuilderState,
  AccessorOwnerOption,
} from '../../stores/workflows/accessor/AccessorQueryBuilderState.js';
import { getPackageableElementOptionFormatter } from '@finos/legend-lego/graph-editor';

type AccessorOption = {
  label: string;
  value: { schemaName?: string | undefined; tableName: string };
};

const AccessorQueryBuilderSetupPanelContent = observer(
  (props: { queryBuilderState: AccessorQueryBuilderState }) => {
    const { queryBuilderState } = props;
    const applicationStore = useApplicationStore();

    // accessor owner (IngestDefinition or Database)
    const accessorOwnerOptions =
      queryBuilderState.accessorOwnerOptions.sort(compareLabelFn);
    const selectedAccessorOwnerOption = queryBuilderState.selectedAccessorOwner
      ? (queryBuilderState.accessorOwnerOptions.find(
          (opt) => opt.value === queryBuilderState.selectedAccessorOwner,
        ) ?? null)
      : null;
    const changeAccessorOwner = (val: AccessorOwnerOption): void => {
      if (val.value === queryBuilderState.selectedAccessorOwner) {
        return;
      }
      queryBuilderState.changeAccessorOwner(val.value);
    };
    const accessorOwnerFilterOption = createFilter({
      ignoreCase: true,
      ignoreAccents: false,
      stringify: (option: { data: AccessorOwnerOption }): string =>
        option.data.value.path,
    });

    // accessor (dataset / table)
    const accessorOptions =
      queryBuilderState.accessorsOptions.sort(compareLabelFn);
    const selectedAccessorOption = queryBuilderState.sourceAccessor
      ? (queryBuilderState.accessorsOptions.find(
          (opt) =>
            opt.value.tableName ===
              queryBuilderState.sourceAccessor?.accessor &&
            opt.value.schemaName === queryBuilderState.sourceAccessor.schema,
        ) ?? null)
      : null;
    const changeAccessor = (val: AccessorOption): void => {
      queryBuilderState.changeAccessor(val.value);
    };
    const showAccessorSelector = accessorOptions.length > 0;

    // runtime
    const runtimeOptions = queryBuilderState.compatibleRuntimes
      .map(
        (rt) =>
          new RuntimePointer(PackageableElementExplicitReference.create(rt)),
      )
      .map(buildRuntimeValueOption)
      .sort(compareLabelFn);
    const selectedRuntimeOption = queryBuilderState.executionContextState
      .runtimeValue
      ? buildRuntimeValueOption(
          queryBuilderState.executionContextState.runtimeValue,
        )
      : null;
    const changeRuntime = (val: { value: Runtime }): void => {
      if (val.value === queryBuilderState.executionContextState.runtimeValue) {
        return;
      }
      queryBuilderState.changeRuntime(val.value);
    };
    const runtimeFilterOption = createFilter({
      ignoreCase: true,
      ignoreAccents: false,
      stringify: (option: { data: { value: Runtime } }): string =>
        option.data.value instanceof RuntimePointer
          ? option.data.value.packageableRuntime.value.path
          : 'custom',
    });

    return (
      <div className="query-builder__setup__config-group">
        <PanelHeader title="properties" />
        <div className="query-builder__setup__config-group__content">
          <div className="query-builder__setup__config-group__item">
            <label
              className="btn--sm query-builder__setup__config-group__item__label"
              title="source"
              htmlFor="query-builder__setup__source-selector"
            >
              Source
            </label>
            <CustomSelectorInput
              inputId="query-builder__setup__source-selector"
              className="panel__content__form__section__dropdown query-builder__setup__config-group__item__selector"
              placeholder="Choose a source..."
              options={accessorOwnerOptions}
              onChange={changeAccessorOwner}
              value={selectedAccessorOwnerOption}
              darkMode={
                !applicationStore.layoutService
                  .TEMPORARY__isLightColorThemeEnabled
              }
              filterOption={accessorOwnerFilterOption}
              formatOptionLabel={getPackageableElementOptionFormatter({
                darkMode:
                  !applicationStore.layoutService
                    .TEMPORARY__isLightColorThemeEnabled,
              })}
            />
          </div>
          {showAccessorSelector && (
            <div className="query-builder__setup__config-group__item">
              <label
                className="btn--sm query-builder__setup__config-group__item__label"
                title="accessor"
                htmlFor="query-builder__setup__accessor-selector"
              >
                {queryBuilderState.accessorLabel}
              </label>
              <CustomSelectorInput
                inputId="query-builder__setup__accessor-selector"
                className="panel__content__form__section__dropdown query-builder__setup__config-group__item__selector"
                placeholder={`Choose a ${queryBuilderState.accessorLabel.toLocaleLowerCase()}...`}
                options={accessorOptions}
                onChange={changeAccessor}
                value={selectedAccessorOption}
                darkMode={
                  !applicationStore.layoutService
                    .TEMPORARY__isLightColorThemeEnabled
                }
              />
            </div>
          )}
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
              noMatchMessage="No compatible runtime found"
              disabled={!queryBuilderState.selectedAccessorOwner}
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
            />
          </div>
        </div>
      </div>
    );
  },
);

export const renderAccessorQueryBuilderSetupPanelContent = (
  queryBuilderState: AccessorQueryBuilderState,
): React.ReactNode => (
  <AccessorQueryBuilderSetupPanelContent
    queryBuilderState={queryBuilderState}
  />
);
