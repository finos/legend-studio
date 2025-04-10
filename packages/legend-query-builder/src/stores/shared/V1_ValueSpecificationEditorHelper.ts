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
  type V1_ValueSpecification,
  V1_AppliedFunction,
  V1_AppliedProperty,
  V1_CBoolean,
  V1_CByteArray,
  V1_CDate,
  V1_CDateTime,
  V1_CDecimal,
  V1_CFloat,
  V1_CInteger,
  V1_Collection,
  V1_CStrictDate,
  V1_CStrictTime,
  V1_CString,
  V1_EnumValue,
  V1_Multiplicity,
  V1_PrimitiveValueSpecification,
} from '@finos/legend-graph';
import { buildDatePickerOption } from '../../components/shared/CustomDatePickerHelper.js';
import type {
  ApplicationStore,
  LegendApplicationConfig,
  LegendApplicationPluginManager,
  LegendApplicationPlugin,
} from '@finos/legend-application';

export const getV1_ValueSpecificationStringValue = (
  valueSpecification: V1_ValueSpecification,
  applicationStore: ApplicationStore<
    LegendApplicationConfig,
    LegendApplicationPluginManager<LegendApplicationPlugin>
  >,
  options?: {
    omitEnumOwnerName?: boolean;
    wrapStringInDoubleQuotes?: boolean;
  },
): string | undefined => {
  if (
    valueSpecification instanceof V1_CDate ||
    valueSpecification instanceof V1_CStrictTime
  ) {
    return buildDatePickerOption(valueSpecification, applicationStore).label;
  } else if (valueSpecification instanceof V1_CString) {
    return options?.wrapStringInDoubleQuotes
      ? `"${valueSpecification.value.toString()}"`
      : valueSpecification.value.toString();
  } else if (
    valueSpecification instanceof V1_CBoolean ||
    valueSpecification instanceof V1_CByteArray ||
    valueSpecification instanceof V1_CDecimal ||
    valueSpecification instanceof V1_CFloat ||
    valueSpecification instanceof V1_CInteger ||
    valueSpecification instanceof V1_EnumValue
  ) {
    return valueSpecification.value.toString();
  } else if (valueSpecification instanceof V1_AppliedProperty) {
    return valueSpecification.property;
  } else if (valueSpecification instanceof V1_AppliedFunction) {
    return valueSpecification.function;
  } else if (valueSpecification instanceof V1_Collection) {
    return valueSpecification.values
      .map((valueSpec) =>
        getV1_ValueSpecificationStringValue(
          valueSpec,
          applicationStore,
          options,
        ),
      )
      .join(',');
  }
  return undefined;
};

export const isValidV1_ValueSpecification = (
  valueSpecification: V1_ValueSpecification,
  multiplicity: V1_Multiplicity,
): boolean => {
  const isRequired = multiplicity.lowerBound >= 1;
  if (valueSpecification instanceof V1_PrimitiveValueSpecification) {
    // required and no values provided. LatestDate doesn't have any values so we skip that check for it.
    if (isRequired) {
      if (valueSpecification instanceof V1_CString) {
        return valueSpecification.value.length > 0;
      } else if (
        valueSpecification instanceof V1_CBoolean ||
        valueSpecification instanceof V1_CByteArray ||
        valueSpecification instanceof V1_CDecimal ||
        valueSpecification instanceof V1_CFloat ||
        valueSpecification instanceof V1_CInteger ||
        valueSpecification instanceof V1_CStrictTime ||
        valueSpecification instanceof V1_CDateTime ||
        valueSpecification instanceof V1_CStrictDate
      ) {
        return true;
      }
    }
  } else if (valueSpecification instanceof V1_AppliedProperty && isRequired) {
    return valueSpecification.property.length > 0;
  } else if (valueSpecification instanceof V1_Collection) {
    // collection instance can't be empty if multiplicity lower bound is 1 or more.
    if (
      multiplicity.lowerBound >= 1 &&
      valueSpecification.values.length === 0
    ) {
      return false;
    }
    // collection instance must have all valid values.
    return valueSpecification.values.every((val) =>
      isValidV1_ValueSpecification(val, V1_Multiplicity.ONE),
    );
  }

  return true;
};
