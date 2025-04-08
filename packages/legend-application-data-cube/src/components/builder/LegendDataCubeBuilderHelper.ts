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

import type {
  ApplicationStore,
  LegendApplicationConfig,
  LegendApplicationPluginManager,
  LegendApplicationPlugin,
} from '@finos/legend-application';
import {
  type V1_ValueSpecification,
  V1_AppliedFunction,
} from '@finos/legend-graph';
import {
  getV1_ValueSpecificationStringValue,
  buildDatePickerOption,
} from '@finos/legend-query-builder';

export const getNameOfV1ValueSpecification = (
  value: V1_ValueSpecification,
  applicationStore: ApplicationStore<
    LegendApplicationConfig,
    LegendApplicationPluginManager<LegendApplicationPlugin>
  >,
): string | undefined => {
  if (value instanceof V1_AppliedFunction) {
    const possibleDateLabel = buildDatePickerOption(
      value,
      applicationStore,
    ).label;
    if (possibleDateLabel) {
      return possibleDateLabel;
    }
  }
  return getV1_ValueSpecificationStringValue(value, applicationStore);
};
