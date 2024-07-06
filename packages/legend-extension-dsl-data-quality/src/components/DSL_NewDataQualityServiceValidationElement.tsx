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
import { CustomSelectorInput } from '@finos/legend-art';
import { DataQuality_ServiceElementDriver } from './DSL_DataQuality_ServiceElementDriver.js';
import {
  type PackageableElementOption,
  buildElementOption,
} from '@finos/legend-lego/graph-editor';
import type { Service } from '@finos/legend-graph';

export const NewDataQualityServiceValidationElementEditor = observer(() => {
  const editorStore = useEditorStore();
  const applicationStore = editorStore.applicationStore;
  const dataQualityServiceElementDriver =
    editorStore.newElementState.getNewElementDriver(
      DataQuality_ServiceElementDriver,
    );

  const serviceOptions =
    editorStore.graphManagerState.usableServices.map(buildElementOption);

  const selectedServiceOption = dataQualityServiceElementDriver.serviceSelected
    ? {
        label: dataQualityServiceElementDriver.serviceSelected.value.name,
        value: dataQualityServiceElementDriver.serviceSelected,
      }
    : undefined;

  const onServiceOptionChange = (
    val: PackageableElementOption<Service> | undefined,
  ): void => {
    if (val) {
      dataQualityServiceElementDriver.setServiceSelected(val);
    }
  };

  return (
    <>
      <div>
        <div className="panel__content__form__section__header__label">
          Service
        </div>
        <div className="data-quality-explorer__new-element-modal__driver">
          <CustomSelectorInput
            className="data-quality-explorer__new-element-modal__driver__dropdown"
            options={serviceOptions}
            onChange={onServiceOptionChange}
            value={selectedServiceOption}
            darkMode={
              !applicationStore.layoutService
                .TEMPORARY__isLightColorThemeEnabled
            }
          />
        </div>
      </div>
    </>
  );
});
