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
  DataQuality_ClassElementDriver,
  ELEMENT_CREATION_BASIS,
} from './DSL_DataQuality_ClassElementDriver.js';
import type { DataSpace } from '@finos/legend-extension-dsl-data-space/graph';

export const NewDataQualityClassValidationElementEditor = observer(() => {
  const editorStore = useEditorStore();
  const applicationStore = editorStore.applicationStore;

  const dataQualityDataSpaceDriver =
    editorStore.newElementState.getNewElementDriver(
      DataQuality_ClassElementDriver,
    );
  const dqElementCreationBasis =
    dataQualityDataSpaceDriver.dqElementCreationBasis;
  const dataSpacesOptions = dataQualityDataSpaceDriver.dataSpaceOptions;
  const mappingOptions = dataQualityDataSpaceDriver.mappingOptions;
  const runtimeOptions =
    dataQualityDataSpaceDriver.compatibleMappingRuntimes.map(
      buildElementOption,
    );

  const onDataSpaceChange = (
    val: PackageableElementOption<DataSpace> | null,
  ): void => {
    if (val) {
      dataQualityDataSpaceDriver.setDataSpaceSelected(val);
    }
  };

  const onMappingChange = (
    val: PackageableElementOption<Mapping> | null,
  ): void => {
    if (val) {
      dataQualityDataSpaceDriver.setMappingSelected(val);
    } else {
      dataQualityDataSpaceDriver.setMappingSelected(undefined);
    }
    dataQualityDataSpaceDriver.setRuntimeSelected(
      dataQualityDataSpaceDriver.runtimeOptions.length > 0
        ? dataQualityDataSpaceDriver.runtimeOptions[0]
        : undefined,
    );
  };

  const onRuntimeChange = (val: RuntimeOption | null): void => {
    if (val) {
      dataQualityDataSpaceDriver.setRuntimeSelected(val);
    }
  };

  const handleDQElementCreationBasisChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ): void => {
    const validationElementCreationBasis = (event.target as HTMLInputElement)
      .value as ELEMENT_CREATION_BASIS;
    dataQualityDataSpaceDriver.setDqElementCreationBasis(
      validationElementCreationBasis,
    );
  };

  return (
    <div>
      <div className="element-creation-basis">
        <BaseRadioGroup
          value={dqElementCreationBasis}
          onChange={handleDQElementCreationBasisChange}
          row={false}
          options={[
            ELEMENT_CREATION_BASIS.DATASPACE_BASED,
            ELEMENT_CREATION_BASIS.MAPPING_RUNTIME_BASED,
          ]}
          size={2}
        />
      </div>
      {dqElementCreationBasis === ELEMENT_CREATION_BASIS.DATASPACE_BASED ? (
        <div>
          <div className="panel__content__form__section__header__label">
            DataSpace
          </div>
          <div className="data-quality-explorer__new-element-modal__driver">
            <CustomSelectorInput
              className="data-quality-explorer__new-element-modal__driver__dropdown"
              options={dataSpacesOptions}
              onChange={onDataSpaceChange}
              value={dataQualityDataSpaceDriver.dataSpaceSelected}
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
              value={dataQualityDataSpaceDriver.mappingSelected}
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
              value={dataQualityDataSpaceDriver.runtimeSelected}
              darkMode={
                !applicationStore.layoutService
                  .TEMPORARY__isLightColorThemeEnabled
              }
            />
          </div>
        </div>
      )}
    </div>
  );
});
