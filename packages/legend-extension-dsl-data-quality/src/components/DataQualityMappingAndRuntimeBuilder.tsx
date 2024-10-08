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
import {
  type PackageableElementOption,
  buildElementOption,
  getPackageableElementOptionFormatter,
} from '@finos/legend-lego/graph-editor';
import {
  type Mapping,
  type Runtime,
  getMappingCompatibleClasses,
  getMappingCompatibleRuntimes,
  PackageableElementExplicitReference,
  RuntimePointer,
} from '@finos/legend-graph';
import {
  createFilter,
  CustomSelectorInput,
  PURE_MappingIcon,
  PURE_RuntimeIcon,
} from '@finos/legend-art';
import { DataQualityClassSelector } from './DataQualitySideBar.js';
import type { DataQualityClassValidationState } from './states/DataQualityClassValidationState.js';
import {
  buildRuntimeValueOption,
  getRuntimeOptionFormatter,
} from '@finos/legend-query-builder';

export const DataQualityMappingAndRuntimeBuilder = observer(
  (props: { dataQualityState: DataQualityClassValidationState }) => {
    const { dataQualityState } = props;
    const { dataQualityQueryBuilderState } = dataQualityState;
    const applicationStore = useApplicationStore();

    const getRuntimesBasedOnMapping = (): RuntimePointer[] =>
      dataQualityQueryBuilderState.executionContextState.mapping
        ? getMappingCompatibleRuntimes(
            dataQualityQueryBuilderState.executionContextState.mapping,
            dataQualityState.graphManagerState.usableRuntimes,
          ).map(
            (rt) =>
              new RuntimePointer(
                PackageableElementExplicitReference.create(rt),
              ),
          )
        : [];

    const mappingOptions =
      dataQualityState.graphManagerState.usableMappings.map(buildElementOption);

    const selectedMappingOption = dataQualityQueryBuilderState
      .executionContextState.mapping
      ? buildElementOption(
          dataQualityQueryBuilderState.executionContextState.mapping,
        )
      : null;

    const changeMapping = (val: PackageableElementOption<Mapping>): void => {
      if (
        val.value ===
          dataQualityQueryBuilderState.executionContextState.mapping ||
        dataQualityState.isMappingReadOnly
      ) {
        return;
      }
      dataQualityState.changeMapping(val.value);
      const runtimeOptions = getRuntimesBasedOnMapping();
      if (runtimeOptions.length) {
        dataQualityQueryBuilderState.changeRuntime(runtimeOptions[0]!);
      }
      dataQualityState.updateElementOnMappingChange();
      const classes = getMappingCompatibleClasses(
        dataQualityQueryBuilderState.executionContextState.mapping!,
        dataQualityState.graphManagerState.usableClasses,
      );
      if (runtimeOptions.length && classes.length) {
        dataQualityState.changeClass(classes[0]!);
        dataQualityState.updateElementOnClassChange();
      }
    };

    const mappingFilterOption = createFilter({
      ignoreCase: true,
      ignoreAccents: false,
      stringify: (option: {
        data: PackageableElementOption<Mapping>;
      }): string => option.data.value.path,
    });

    const runtimeOptions = getRuntimesBasedOnMapping().map(
      buildRuntimeValueOption,
    );

    const selectedRuntimeOption = dataQualityQueryBuilderState
      .executionContextState.runtimeValue
      ? buildRuntimeValueOption(
          dataQualityQueryBuilderState.executionContextState.runtimeValue,
        )
      : null;

    const classes = selectedRuntimeOption
      ? getMappingCompatibleClasses(
          dataQualityQueryBuilderState.executionContextState.mapping!,
          dataQualityState.graphManagerState.usableClasses,
        )
      : [];

    const changeRuntime = (val: { value: Runtime }): void => {
      if (
        val.value ===
          dataQualityQueryBuilderState.executionContextState.runtimeValue ||
        dataQualityState.isRuntimeReadOnly
      ) {
        return;
      }
      dataQualityQueryBuilderState.changeRuntime(val.value);
      dataQualityState.updateElementOnRuntimeChange(val.value);
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
      <>
        <div className="data-quality-validation__setup__config-group">
          <div className="data-quality-validation__setup__config-group__header">
            <div className="data-quality-validation__setup__config-group__header__title">
              execution context
            </div>
          </div>
          <div className="data-quality-validation__setup__config-group__content">
            <div className="data-quality-validation__setup__config-group__item">
              <div
                className="btn--sm data-quality-validation__setup__config-group__item__label"
                title="mapping"
              >
                <PURE_MappingIcon />
              </div>
              <CustomSelectorInput
                className="panel__content__form__section__dropdown data-quality-validation__setup__config-group__item__selector"
                placeholder={
                  mappingOptions.length
                    ? 'Choose a mapping...'
                    : 'No mapping found'
                }
                disabled={dataQualityState.isMappingReadOnly}
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
            <div className="data-quality-validation__setup__config-group__item">
              <div
                className="btn--sm data-quality-validation__setup__config-group__item__label"
                title="runtime"
              >
                <PURE_RuntimeIcon />
              </div>
              <CustomSelectorInput
                className="panel__content__form__section__dropdown data-quality-validation__setup__config-group__item__selector"
                placeholder={
                  runtimeOptions.length
                    ? 'Choose a runtime...'
                    : 'No runtime found'
                }
                disabled={
                  dataQualityState.isRuntimeReadOnly ||
                  !dataQualityQueryBuilderState.executionContextState.mapping
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
          </div>
        </div>
        <DataQualityClassSelector
          dataQualityState={dataQualityState}
          classes={classes}
        />
      </>
    );
  },
);
