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
import { useEditorStore } from '@finos/legend-application-studio';
import { BaseRadioGroup, CustomSelectorInput } from '@finos/legend-art';
import type { Mapping } from '@finos/legend-graph';
import {
  type PackageableElementOption,
  buildElementOption,
} from '@finos/legend-lego/graph-editor';
import {
  type RuntimeOption,
  DataQuality_ElementDriver,
  CLASS_ELEMENT_CREATION_BASIS,
  DQ_VALIDATION_ELEMENT_TYPE,
} from './DSL_DataQuality_ElementDriver.js';
import type { DataSpace } from '@finos/legend-extension-dsl-data-space/graph';
import { prettyCONSTName } from '@finos/legend-shared';

export const NewDataQualityValidationElementEditor = observer(() => {
  const editorStore = useEditorStore();
  const applicationStore = editorStore.applicationStore;

  const dataQualityValidationDriver =
    editorStore.newElementState.getNewElementDriver(DataQuality_ElementDriver);
  const dqValidationElementType =
    dataQualityValidationDriver.dqValidationElementType;
  const dqElementCreationBasis =
    dataQualityValidationDriver.dqClassElementCreationBasis;
  const dataSpacesOptions = dataQualityValidationDriver.dataSpaceOptions;
  const mappingOptions = dataQualityValidationDriver.mappingOptions;
  const runtimeOptions =
    dataQualityValidationDriver.compatibleMappingRuntimes.map(
      buildElementOption,
    );
  const dqValidationElementTypeOptions = Object.values(
    DQ_VALIDATION_ELEMENT_TYPE,
  )
    .filter(
      (validation) =>
        validation !== DQ_VALIDATION_ELEMENT_TYPE.SERVICE_VALIDATION,
    )
    .map((validationType) => ({
      label: prettyCONSTName(validationType),
      value: validationType,
    }));

  const onDataSpaceChange = (
    val: PackageableElementOption<DataSpace> | null,
  ): void => {
    if (val) {
      dataQualityValidationDriver.setDataSpaceSelected(val);
    }
  };

  const onMappingChange = (
    val: PackageableElementOption<Mapping> | null,
  ): void => {
    if (val) {
      dataQualityValidationDriver.setMappingSelected(val);
    } else {
      dataQualityValidationDriver.setMappingSelected(undefined);
    }
    dataQualityValidationDriver.setRuntimeSelected(
      dataQualityValidationDriver.runtimeOptions.length > 0
        ? dataQualityValidationDriver.runtimeOptions[0]
        : undefined,
    );
  };

  const onRuntimeChange = (val: RuntimeOption | null): void => {
    if (val) {
      dataQualityValidationDriver.setRuntimeSelected(val);
    }
  };

  const handleDQClassElementCreationBasisChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ): void => {
    const classValidationElementCreationBasis = (
      event.target as HTMLInputElement
    ).value as CLASS_ELEMENT_CREATION_BASIS;
    dataQualityValidationDriver.setDqClassElementCreationBasis(
      classValidationElementCreationBasis,
    );
  };

  const handleDQValidationElementTypeChange = (val: {
    label: string;
    value: DQ_VALIDATION_ELEMENT_TYPE;
  }): void => {
    dataQualityValidationDriver.setDqValidationElementType(val.value);
  };

  const selectedDqValidationElementType = {
    label: prettyCONSTName(dataQualityValidationDriver.dqValidationElementType),
    value: dataQualityValidationDriver.dqValidationElementType,
  };

  return (
    <div>
      <div className="panel__content__form__section__header__label">
        Validation Type
      </div>
      <div className="panel__content__form__section__header__prompt">
        Type of Data Quality Validation to be configured
      </div>
      <CustomSelectorInput
        options={dqValidationElementTypeOptions}
        onChange={handleDQValidationElementTypeChange}
        value={selectedDqValidationElementType}
        darkMode={
          !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled
        }
        placeholder="Choose a data quality validation type"
        isClearable={false}
        className={'dq-validation-element-type'}
      />
      {dqValidationElementType ===
        DQ_VALIDATION_ELEMENT_TYPE.CLASS_VALIDATION && (
        <div>
          <div className="element-creation-basis">
            <div className="panel__content__form__section__header__label">
              Basis of Data Quality Class Validation
            </div>
            <BaseRadioGroup
              value={dqElementCreationBasis}
              onChange={handleDQClassElementCreationBasisChange}
              row={false}
              options={[
                CLASS_ELEMENT_CREATION_BASIS.DATASPACE_BASED,
                CLASS_ELEMENT_CREATION_BASIS.MAPPING_RUNTIME_BASED,
              ]}
              size={2}
            />
          </div>
          {dqElementCreationBasis ===
          CLASS_ELEMENT_CREATION_BASIS.DATASPACE_BASED ? (
            <div>
              <div className="panel__content__form__section__header__label">
                DataSpace
              </div>
              <div className="data-quality-explorer__new-element-modal__driver">
                <CustomSelectorInput
                  className="data-quality-explorer__new-element-modal__driver__dropdown"
                  options={dataSpacesOptions}
                  onChange={onDataSpaceChange}
                  value={dataQualityValidationDriver.dataSpaceSelected}
                  darkMode={
                    !applicationStore.layoutService
                      .TEMPORARY__isLightColorThemeEnabled
                  }
                />
              </div>
            </div>
          ) : (
            <div>
              <div className="panel__content__form__section__header__label">
                Mapping
              </div>
              <div className="data-quality-explorer__new-element-modal__driver">
                <CustomSelectorInput
                  className="data-quality-explorer__new-element-modal__driver__dropdown"
                  options={mappingOptions}
                  onChange={onMappingChange}
                  value={dataQualityValidationDriver.mappingSelected}
                  darkMode={
                    !applicationStore.layoutService
                      .TEMPORARY__isLightColorThemeEnabled
                  }
                />
              </div>
              <div className="panel__content__form__section__header__label">
                Runtime
              </div>
              <div className="data-quality-explorer__new-element-modal__driver">
                <CustomSelectorInput
                  className="data-quality-explorer__new-element-modal__driver__dropdown"
                  options={runtimeOptions}
                  onChange={onRuntimeChange}
                  value={dataQualityValidationDriver.runtimeSelected}
                  darkMode={
                    !applicationStore.layoutService
                      .TEMPORARY__isLightColorThemeEnabled
                  }
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
});
