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
  type Class,
  type Mapping,
  type Runtime,
  PackageableElementExplicitReference,
  RuntimePointer,
  getMappingCompatibleRuntimes,
  getClassCompatibleMappings,
} from '@finos/legend-graph';
import { useApplicationStore } from '@finos/legend-application';
import {
  buildRuntimeValueOption,
  getRuntimeOptionFormatter,
  QueryBuilderClassSelector,
} from '../QueryBuilderSideBar.js';
import type { ClassQueryBuilderState } from '../../stores/workflows/ClassQueryBuilderState.js';
import {
  buildElementOption,
  getPackageableElementOptionFormatter,
  type PackageableElementOption,
} from '@finos/legend-lego/graph-editor';

/**
 * This setup panel supports cascading in order: Class -> Mapping -> Runtime
 *
 * In other words, we will only show:
 * - For mapping selector: the list of compatible mappings with the selected class
 * - For runtime value selector: the list of compatible runtimes with the selected mapping
 *
 * See details on propagation/cascading in {@link ClassQueryBuilderState}
 */
const ClassQueryBuilderSetupPanelContent = observer(
  (props: { queryBuilderState: ClassQueryBuilderState }) => {
    const { queryBuilderState } = props;
    const applicationStore = useApplicationStore();

    // class
    const classes = queryBuilderState.graphManagerState.usableClasses;
    const onClassChange = (val: Class): void =>
      queryBuilderState.propagateClassChange(val);

    // mapping
    const mappingOptions = (
      queryBuilderState.class
        ? getClassCompatibleMappings(
            queryBuilderState.class,
            queryBuilderState.graphManagerState.usableMappings,
          )
        : []
    )
      .map(buildElementOption)
      .sort(compareLabelFn);
    const selectedMappingOption = queryBuilderState.executionContextState
      .mapping
      ? buildElementOption(queryBuilderState.executionContextState.mapping)
      : null;
    const changeMapping = (val: PackageableElementOption<Mapping>): void => {
      if (
        !queryBuilderState.class ||
        val.value === queryBuilderState.executionContextState.mapping
      ) {
        return;
      }
      queryBuilderState.changeMapping(val.value);
      queryBuilderState.propagateMappingChange(val.value);
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
                  : 'No compatible mapping found for class'
              }
              noMatchMessage="No compatible mapping found for specified class"
              disabled={!queryBuilderState.class}
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
              disabled={
                !queryBuilderState.class ||
                !queryBuilderState.executionContextState.mapping
              }
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
              onClassChange={onClassChange}
            />
          </div>
        </div>
      </div>
    );
  },
);

export const renderClassQueryBuilderSetupPanelContent = (
  queryBuilderState: ClassQueryBuilderState,
): React.ReactNode => (
  <ClassQueryBuilderSetupPanelContent queryBuilderState={queryBuilderState} />
);
