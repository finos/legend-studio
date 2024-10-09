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
  type Mapping,
  type Runtime,
  PackageableElementExplicitReference,
  RuntimePointer,
  getMappingCompatibleRuntimes,
  getMappingCompatibleClasses,
} from '@finos/legend-graph';
import { useApplicationStore } from '@finos/legend-application';
import {
  buildRuntimeValueOption,
  getRuntimeOptionFormatter,
  QueryBuilderClassSelector,
} from '../QueryBuilderSideBar.js';
import { guaranteeType } from '@finos/legend-shared';
import type { MappingQueryBuilderState } from '../../stores/workflows/MappingQueryBuilderState.js';
import {
  buildElementOption,
  getPackageableElementOptionFormatter,
  type PackageableElementOption,
} from '@finos/legend-lego/graph-editor';

/**
 * This setup panel supports cascading in order: Mapping -> Runtime + Class
 *
 * In other words, we will only show:
 * - For class selector: the list of compatible classes with the selected mapping
 * - For runtime value selector: the list of compatible runtimes with the selected mapping
 *
 * See details on propagation/cascading in {@link MappingQueryBuilderState}
 */
const MappingQueryBuilderSetupPanelContent = observer(
  (props: { queryBuilderState: MappingQueryBuilderState }) => {
    const { queryBuilderState } = props;
    const applicationStore = useApplicationStore();

    // mapping
    const mappingOptions = queryBuilderState.graphManagerState.usableMappings
      .map(buildElementOption)
      .sort(compareLabelFn);
    const selectedMappingOption = queryBuilderState.executionContextState
      .mapping
      ? buildElementOption(queryBuilderState.executionContextState.mapping)
      : null;
    const changeMapping = (val: PackageableElementOption<Mapping>): void => {
      if (val.value === queryBuilderState.executionContextState.mapping) {
        return;
      }
      queryBuilderState.changeMapping(val.value);
      queryBuilderState.propagateMappingChange(val.value);
      queryBuilderState.onMappingChange?.(val.value);
    };
    const mappingFilterOption = createFilter({
      ignoreCase: true,
      ignoreAccents: false,
      stringify: (option: {
        data: PackageableElementOption<Mapping>;
      }): string => option.data.value.path,
    });

    // runtime
    const runtimeOptions = (
      queryBuilderState.executionContextState.mapping
        ? getMappingCompatibleRuntimes(
            queryBuilderState.executionContextState.mapping,
            queryBuilderState.graphManagerState.usableRuntimes,
          )
        : []
    )
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
      queryBuilderState.onRuntimeChange?.(val.value);
    };
    const runtimeFilterOption = createFilter({
      ignoreCase: true,
      ignoreAccents: false,
      stringify: (option: { data: { value: Runtime } }): string =>
        guaranteeType(option.data.value, RuntimePointer).packageableRuntime
          .value.path,
    });

    // class
    const classes = queryBuilderState.executionContextState.mapping
      ? getMappingCompatibleClasses(
          queryBuilderState.executionContextState.mapping,
          queryBuilderState.graphManagerState.usableClasses,
        )
      : [];

    return (
      <div className="query-builder__setup__config-group">
        <PanelHeader title="properties" />
        <div className="query-builder__setup__config-group__content">
          <div className="query-builder__setup__config-group__item">
            <label
              className="btn--sm query-builder__setup__config-group__item__label"
              title="mapping"
              htmlFor="query-builder__setup__mapping-selector"
            >
              Mapping
            </label>
            <CustomSelectorInput
              inputId="query-builder__setup__mapping-selector"
              className="panel__content__form__section__dropdown query-builder__setup__config-group__item__selector"
              placeholder={
                mappingOptions.length
                  ? 'Choose a mapping...'
                  : 'No mapping found'
              }
              noMatchMessage="No mapping found"
              options={mappingOptions}
              onChange={changeMapping}
              value={selectedMappingOption}
              darkMode={
                !applicationStore.layoutService
                  .TEMPORARY__isLightColorThemeEnabled
              }
              filterOption={mappingFilterOption}
              formatOptionLabel={getPackageableElementOptionFormatter({
                darkMode:
                  !applicationStore.layoutService
                    .TEMPORARY__isLightColorThemeEnabled,
              })}
            />
          </div>
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
              noMatchMessage="No compatible runtime found for specified mapping"
              disabled={!queryBuilderState.executionContextState.mapping}
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
          <div className="query-builder__setup__config-group__item">
            <QueryBuilderClassSelector
              queryBuilderState={queryBuilderState}
              classes={classes}
              noMatchMessage="No compatible entity found for specified mapping"
            />
          </div>
        </div>
      </div>
    );
  },
);

export const renderMappingQueryBuilderSetupPanelContent = (
  queryBuilderState: MappingQueryBuilderState,
): React.ReactNode => (
  <MappingQueryBuilderSetupPanelContent queryBuilderState={queryBuilderState} />
);
