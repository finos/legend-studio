import {
  V1_AppliedProperty,
  V1_CBoolean,
  V1_CByteArray,
  V1_CDate,
  V1_CDecimal,
  V1_CFloat,
  V1_CInteger,
  V1_Collection,
  V1_CStrictTime,
  V1_CString,
  V1_EnumValue,
  V1_ValueSpecification,
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
      ? `"${valueSpecification.value?.toString()}"`
      : valueSpecification.value?.toString();
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
