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
