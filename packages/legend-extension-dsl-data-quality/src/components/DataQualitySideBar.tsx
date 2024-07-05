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
  clsx,
  createFilter,
  CustomSelectorInput,
  PURE_ClassIcon,
} from '@finos/legend-art';
import { observer } from 'mobx-react-lite';
import { useApplicationStore } from '@finos/legend-application';
import type { DataQualityState } from './states/DataQualityState.js';
import { DataQualityDataSpaceBuilderSetupPanelContent } from './DataQualityDataSpaceBuilder.js';
import { DataQualityMappingAndRuntimeBuilder } from './DataQualityMappingAndRuntimeBuilder.js';
import { ELEMENT_CREATION_BASIS } from './DSL_DataQuality_ClassElementDriver.js';
import { type Class, isElementDeprecated } from '@finos/legend-graph';
import {
  getPackageableElementOptionFormatter,
  type PackageableElementOption,
} from '@finos/legend-lego/graph-editor';
import type { DataQualityClassValidationState } from './states/DataQualityClassValidationState.js';
import type { DataQualityServiceValidationState } from './states/DataQualityServiceValidationState.js';
import { DATA_QUALITY_VALIDATION_TEST_ID } from './constants/DataQualityConstants.js';

const generateClassLabel = (
  val: Class,
  dataQualityState: DataQualityState,
): string | React.ReactNode => {
  const isDeprecatedClass = isElementDeprecated(
    val,
    dataQualityState.graphManagerState.graph,
  );

  return (
    <div
      className={clsx('data-quality-validation__setup__class-option-label', {
        'data-quality-validation__setup__class-option-label--deprecated':
          isDeprecatedClass,
      })}
    >
      <div className="data-quality-validation__setup__class-option-label__name">
        {val.name}
      </div>
    </div>
  );
};

export const DataQualityClassSelector = observer(
  (props: {
    dataQualityState: DataQualityState;
    classes: Class[];
    onClassChange?: ((val: Class) => void) | undefined;
    noMatchMessage?: string | undefined;
  }) => {
    const { dataQualityState, classes, onClassChange, noMatchMessage } = props;
    const { dataQualityQueryBuilderState } = dataQualityState;
    const applicationStore = useApplicationStore();

    const elementFilterOption = createFilter({
      ignoreCase: true,
      ignoreAccents: false,
      stringify: (option: PackageableElementOption<Class>): string =>
        option.value.path,
    });

    const classOptions = classes.map((_class) => ({
      value: _class,
      label: generateClassLabel(_class, dataQualityState),
    }));
    const selectedClassOption = dataQualityQueryBuilderState.class
      ? {
          value: dataQualityQueryBuilderState.class,
          label: generateClassLabel(
            dataQualityQueryBuilderState.class,
            dataQualityState,
          ),
        }
      : null;
    const changeClass = (val: PackageableElementOption<Class>): void => {
      if (val.value === dataQualityQueryBuilderState.class) {
        return;
      }
      dataQualityState.changeClass(val.value);
      dataQualityState.updateElementOnClassChange();
      onClassChange?.(val.value);
    };

    return (
      <div className="data-quality-validation__setup__config-group data-quality-validation__setup__config-group--class">
        <div className="data-quality-validation__setup__config-group__content">
          <div className="data-quality-validation__setup__config-group__item">
            <div
              className="btn--sm data-quality-validation__setup__config-group__item__label"
              title="class"
            >
              <PURE_ClassIcon />
            </div>
            <CustomSelectorInput
              className="panel__content__form__section__dropdown data-quality-validation__setup__config-group__item__selector data-quality-validation__setup__config-group__item__selector__milestoned"
              placeholder={
                classOptions.length
                  ? 'Choose a class...'
                  : noMatchMessage ?? 'No class found'
              }
              disabled={
                classOptions.length < 1 ||
                (classOptions.length === 1 && Boolean(selectedClassOption))
              }
              noMatchMessage={noMatchMessage}
              options={classOptions}
              onChange={changeClass}
              value={selectedClassOption}
              darkMode={
                !applicationStore.layoutService
                  .TEMPORARY__isLightColorThemeEnabled
              }
              filterOption={elementFilterOption}
              formatOptionLabel={getPackageableElementOptionFormatter({
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
export const DataQualityServiceValidationSideBar = observer(
  (props: {
    dataQualityState: DataQualityServiceValidationState;
    children: React.ReactNode;
  }) => {
    const { dataQualityState, children } = props;

    return (
      <div
        className={clsx(
          'data-quality-validation__side-bar',
          dataQualityState.sideBarClassName,
        )}
      >
        <div
          data-testid={
            DATA_QUALITY_VALIDATION_TEST_ID.DATA_QUALITY_VALIDATION_SETUP
          }
          className="panel data-quality-validation__setup"
        >
          <div className="panel__content data-quality-validation__setup__content">
            service selection to be show
          </div>
        </div>
        <div className="data-quality-validation__side-bar__content">
          {children}
        </div>
      </div>
    );
  },
);

export const DataQualityClassValidationSideBar = observer(
  (props: {
    dataQualityClassValidationState: DataQualityClassValidationState;
    children: React.ReactNode;
  }) => {
    const { dataQualityClassValidationState, children } = props;
    const validationElementCreationBasis =
      dataQualityClassValidationState.validationElementCreationBasis;

    return (
      <div
        className={clsx(
          'data-quality-validation__side-bar',
          dataQualityClassValidationState.sideBarClassName,
        )}
      >
        <div
          data-testid={
            DATA_QUALITY_VALIDATION_TEST_ID.DATA_QUALITY_VALIDATION_SETUP
          }
          className="panel data-quality-validation__setup"
        >
          <div className="panel__content data-quality-validation__setup__content">
            {validationElementCreationBasis ===
            ELEMENT_CREATION_BASIS.DATASPACE_BASED ? (
              <DataQualityDataSpaceBuilderSetupPanelContent
                dataQualityState={dataQualityClassValidationState}
              />
            ) : (
              <DataQualityMappingAndRuntimeBuilder
                dataQualityState={dataQualityClassValidationState}
              />
            )}
          </div>
        </div>
        <div className="data-quality-validation__side-bar__content">
          {children}
        </div>
      </div>
    );
  },
);
