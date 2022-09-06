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
  createFilter,
  CogIcon,
  PURE_MappingIcon,
  PURE_RuntimeIcon,
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
import {
  type PackageableElementOption,
  getPackageableElementOptionFormatter,
  buildElementOption,
  useApplicationStore,
} from '@finos/legend-application';
import { QueryBuilderClassSelector } from '../QueryBuilderSideBar.js';
import type { ClassQueryBuilderState } from '../../../stores/query-builder/workflows/ClassQueryBuilderState.js';

export const ClassQueryBuilderSetup = observer(
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
    ).map(buildElementOption);
    const selectedMappingOption = queryBuilderState.mapping
      ? buildElementOption(queryBuilderState.mapping)
      : null;
    const changeMapping = (val: PackageableElementOption<Mapping>): void => {
      if (
        !queryBuilderState.class ||
        val.value === queryBuilderState.mapping ||
        queryBuilderState.isMappingReadOnly
      ) {
        return;
      }
      queryBuilderState.changeMapping(val.value);
      queryBuilderState.propagateMappingChange(val.value);
    };
    const mappingFilterOption = createFilter({
      ignoreCase: true,
      ignoreAccents: false,
      stringify: (option: PackageableElementOption<Mapping>): string =>
        option.value.path,
    });

    // runtime
    const runtimeOptions = (
      queryBuilderState.mapping
        ? getMappingCompatibleRuntimes(
            queryBuilderState.mapping,
            queryBuilderState.graphManagerState.usableRuntimes,
          )
        : []
    ).map((rt) => ({
      value: new RuntimePointer(PackageableElementExplicitReference.create(rt)),
      label: rt.name,
    }));
    const selectedRuntimeOption = queryBuilderState.runtimeValue
      ? {
          value: queryBuilderState.runtimeValue,
          label:
            queryBuilderState.runtimeValue instanceof RuntimePointer ? (
              queryBuilderState.runtimeValue.packageableRuntime.value.name
            ) : (
              <div className="query-builder__setup__runtime-option--custom">
                <CogIcon />
                <div className="query-builder__setup__runtime-option--custom__label">
                  custom
                </div>
              </div>
            ),
        }
      : null;
    const changeRuntime = (val: { value: Runtime }): void => {
      if (
        val.value === queryBuilderState.runtimeValue ||
        queryBuilderState.isRuntimeReadOnly
      ) {
        return;
      }
      queryBuilderState.changeRuntime(val.value);
    };
    const runtimeFilterOption = createFilter({
      ignoreCase: true,
      ignoreAccents: false,
      stringify: (option: { value: Runtime }): string =>
        option.value instanceof RuntimePointer
          ? option.value.packageableRuntime.value.path
          : 'custom',
    });

    return (
      <>
        <QueryBuilderClassSelector
          queryBuilderState={queryBuilderState}
          classes={classes}
          onClassChange={onClassChange}
        />
        <div className="query-builder__setup__config-group">
          <div className="query-builder__setup__config-group__header">
            execution context
          </div>
          <div className="query-builder__setup__config-group__content">
            <div className="query-builder__setup__config-group__item">
              <div
                className="btn--sm query-builder__setup__config-group__item__label"
                title="mapping"
              >
                <PURE_MappingIcon />
              </div>
              <CustomSelectorInput
                className="panel__content__form__section__dropdown query-builder__setup__config-group__item__selector"
                placeholder={
                  mappingOptions.length
                    ? 'Choose a mapping...'
                    : 'No compatible mapping found for class'
                }
                disabled={
                  queryBuilderState.isMappingReadOnly ||
                  !queryBuilderState.class ||
                  !mappingOptions.length
                }
                options={mappingOptions}
                onChange={changeMapping}
                value={selectedMappingOption}
                darkMode={!applicationStore.TEMPORARY__isLightThemeEnabled}
                filterOption={mappingFilterOption}
                formatOptionLabel={getPackageableElementOptionFormatter({
                  darkMode: !applicationStore.TEMPORARY__isLightThemeEnabled,
                })}
              />
            </div>
            <div className="query-builder__setup__config-group__item">
              <div
                className="btn--sm query-builder__setup__config-group__item__label"
                title="runtime"
              >
                <PURE_RuntimeIcon />
              </div>
              <CustomSelectorInput
                className="panel__content__form__section__dropdown query-builder__setup__config-group__item__selector"
                placeholder="Choose or create a runtime..."
                disabled={
                  queryBuilderState.isRuntimeReadOnly ||
                  !queryBuilderState.class ||
                  !queryBuilderState.mapping
                }
                options={runtimeOptions}
                onChange={changeRuntime}
                value={selectedRuntimeOption}
                darkMode={!applicationStore.TEMPORARY__isLightThemeEnabled}
                filterOption={runtimeFilterOption}
              />
            </div>
          </div>
        </div>
      </>
    );
  },
);
