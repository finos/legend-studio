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

import { generateGAVCoordinates } from '@finos/legend-storage';
import type { ServiceInfo } from '../stores/ServiceInfo.js';

export type ServiceOption = { label: string; value: ServiceInfo };
export const buildServiceOption = (value: ServiceInfo): ServiceOption => ({
  label: value.name,
  value,
});

export const formatServiceOptionLabel = (
  option: ServiceOption,
): React.ReactNode => (
  <div
    className="query-setup__service-option"
    title={`${option.label} - ${option.value.urlPattern ?? ''} - ${
      option.value.path
    } - ${generateGAVCoordinates(
      option.value.groupId,
      option.value.artifactId,
      option.value.versionId,
    )}`}
  >
    <div className="query-setup__service-option__label">{option.label}</div>
    <div className="query-setup__service-option__path">{option.value.path}</div>
    <div className="query-setup__service-option__pattern">
      {option.value.urlPattern ?? 'no pattern'}
    </div>
    <div className="query-setup__service-option__gav">
      {option.value.groupId && option.value.artifactId
        ? generateGAVCoordinates(
            option.value.groupId,
            option.value.artifactId,
            option.value.versionId,
          )
        : null}
    </div>
  </div>
);
