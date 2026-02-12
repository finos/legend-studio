/**
 * Copyright (c) 2026-present, Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use thfile except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { UnsupportedOperationError } from '@finos/legend-shared';
import {
  DATA_QUALITY_VALIDATION_PURE_FUNCTIONS,
  DATA_QUALITY_FILTER_VALIDATION_HELPER_FUNCTIONS,
  SUPPORTED_TYPES,
} from '../constants/DataQualityConstants.js';
import {
  type ObserverContext,
  PRIMITIVE_TYPE,
  type PureModel,
} from '@finos/legend-graph';
import {
  buildPrimitiveCollectionInstanceValue,
  buildPrimitiveInstanceValue,
} from '@finos/legend-query-builder';

export class DataQualityFunctionDefaults {
  static getHelperFunctionDefaults(
    functionName: string,
    graph: PureModel,
    observerContext: ObserverContext,
  ) {
    switch (functionName) {
      case DATA_QUALITY_FILTER_VALIDATION_HELPER_FUNCTIONS.ROWS_WITH_EMPTY_COLUMN:
        return [];

      case DATA_QUALITY_FILTER_VALIDATION_HELPER_FUNCTIONS.ROWS_WITH_NON_EMPTY_COLUMN:
        return [];
      case DATA_QUALITY_FILTER_VALIDATION_HELPER_FUNCTIONS.ROWS_WITH_COLUMN_LONGER_THAN:
        return [
          buildPrimitiveInstanceValue(
            graph,
            PRIMITIVE_TYPE.INTEGER,
            0,
            observerContext,
          ),
        ];
      case DATA_QUALITY_FILTER_VALIDATION_HELPER_FUNCTIONS.ROWS_WITH_NEGATIVE_VALUE:
        return [];
      case DATA_QUALITY_FILTER_VALIDATION_HELPER_FUNCTIONS.ROWS_WITH_COLUMN_DIFFERS_FROM_PATTERN:
        return [
          buildPrimitiveInstanceValue(
            graph,
            PRIMITIVE_TYPE.STRING,
            '',
            observerContext,
          ),
        ];
      case DATA_QUALITY_FILTER_VALIDATION_HELPER_FUNCTIONS.ROWS_WITH_VALUE_OUTSIDE_RANGE:
        return [
          buildPrimitiveInstanceValue(
            graph,
            PRIMITIVE_TYPE.INTEGER,
            0,
            observerContext,
          ),
          buildPrimitiveInstanceValue(
            graph,
            PRIMITIVE_TYPE.INTEGER,
            1,
            observerContext,
          ),
        ];

      default:
        throw new UnsupportedOperationError(
          `Cannot process function: ${functionName}`,
        );
    }
  }

  static getFilterFunctionDefaults(functionName: string) {
    switch (functionName) {
      case DATA_QUALITY_VALIDATION_PURE_FUNCTIONS.FILTER:
        return {
          defaultParams: {
            column: {
              type: SUPPORTED_TYPES.COL_SPEC,
            },
            otherParams: [],
          },
        };
      default:
        throw new UnsupportedOperationError(
          `Cannot process function: ${functionName}`,
        );
    }
  }

  static getPureFunctionDefaults(
    functionName: string,
    graph: PureModel,
    observerContext: ObserverContext,
  ) {
    switch (functionName) {
      case DATA_QUALITY_VALIDATION_PURE_FUNCTIONS.EQUAL:
        return [
          buildPrimitiveInstanceValue(
            graph,
            PRIMITIVE_TYPE.STRING,
            '',
            observerContext,
          ),
        ];

      case DATA_QUALITY_VALIDATION_PURE_FUNCTIONS.IN:
        return [
          buildPrimitiveCollectionInstanceValue(
            graph,
            PRIMITIVE_TYPE.STRING,
            [],
            observerContext,
          ),
        ];

      case DATA_QUALITY_VALIDATION_PURE_FUNCTIONS.GREATER_THAN:
        return [
          buildPrimitiveInstanceValue(
            graph,
            PRIMITIVE_TYPE.INTEGER,
            0,
            observerContext,
          ),
        ];

      case DATA_QUALITY_VALIDATION_PURE_FUNCTIONS.GREATER_THAN_EQUAL:
        return [
          buildPrimitiveInstanceValue(
            graph,
            PRIMITIVE_TYPE.INTEGER,
            0,
            observerContext,
          ),
        ];

      case DATA_QUALITY_VALIDATION_PURE_FUNCTIONS.LESS_THAN:
        return [
          buildPrimitiveInstanceValue(
            graph,
            PRIMITIVE_TYPE.INTEGER,
            0,
            observerContext,
          ),
        ];

      case DATA_QUALITY_VALIDATION_PURE_FUNCTIONS.LESS_THAN_EQUAL:
        return [
          buildPrimitiveInstanceValue(
            graph,
            PRIMITIVE_TYPE.INTEGER,
            0,
            observerContext,
          ),
        ];

      case DATA_QUALITY_VALIDATION_PURE_FUNCTIONS.CONTAINS:
        return [
          buildPrimitiveInstanceValue(
            graph,
            PRIMITIVE_TYPE.STRING,
            ' ',
            observerContext,
          ),
        ];

      case DATA_QUALITY_VALIDATION_PURE_FUNCTIONS.STARTS_WITH:
        return [
          buildPrimitiveInstanceValue(
            graph,
            PRIMITIVE_TYPE.STRING,
            '',
            observerContext,
          ),
        ];

      case DATA_QUALITY_VALIDATION_PURE_FUNCTIONS.ENDS_WITH:
        return [
          buildPrimitiveInstanceValue(
            graph,
            PRIMITIVE_TYPE.STRING,
            '',
            observerContext,
          ),
        ];

      case DATA_QUALITY_VALIDATION_PURE_FUNCTIONS.MATCHES:
        return [
          buildPrimitiveInstanceValue(
            graph,
            PRIMITIVE_TYPE.STRING,
            '',
            observerContext,
          ),
        ];
      case DATA_QUALITY_VALIDATION_PURE_FUNCTIONS.FILTER:
        return [];
      default:
        throw new UnsupportedOperationError(
          `Cannot process pure function: ${functionName}`,
        );
    }
  }

  static getFunctionDescriptionTemplate(functionName: string): string {
    const allTemplates = {
      ...DataQualityFunctionDefaults.pureFunctionValidationDescriptionTemplates,
      ...DataQualityFunctionDefaults.helperFunctionValidationDescriptionTemplates,
    };

    return allTemplates[functionName] ?? '';
  }

  static getFunctionNameTemplate(functionName: string): string {
    const allTemplates = {
      ...DataQualityFunctionDefaults.pureFunctionValidationNameTemplates,
      ...DataQualityFunctionDefaults.helperFunctionValidationNameTemplates,
    };

    return allTemplates[functionName] ?? '';
  }

  static pureFunctionValidationNameTemplates: Record<string, string> = {
    [DATA_QUALITY_VALIDATION_PURE_FUNCTIONS.EQUAL]: '[column]Not[param-1]',
    [DATA_QUALITY_VALIDATION_PURE_FUNCTIONS.IN]: '[column]NotIn[param-1]',
    [DATA_QUALITY_VALIDATION_PURE_FUNCTIONS.GREATER_THAN]:
      '[column]NotLessThan[param-1]',
    [DATA_QUALITY_VALIDATION_PURE_FUNCTIONS.GREATER_THAN_EQUAL]:
      '[column]NotBeLessThanOrEqualTo[param-1]',
    [DATA_QUALITY_VALIDATION_PURE_FUNCTIONS.LESS_THAN]:
      '[column]NotGreaterThan[param-1]',
    [DATA_QUALITY_VALIDATION_PURE_FUNCTIONS.LESS_THAN_EQUAL]:
      '[column]NotGreaterThanOrEqualTo[param-1]',
    [DATA_QUALITY_VALIDATION_PURE_FUNCTIONS.CONTAINS]:
      '[column]NotContain[param-1]',
    [DATA_QUALITY_VALIDATION_PURE_FUNCTIONS.STARTS_WITH]:
      '[column]NotStartWith[param-1]',
    [DATA_QUALITY_VALIDATION_PURE_FUNCTIONS.ENDS_WITH]:
      '[column]NotEndWith[param-1]',
    [DATA_QUALITY_VALIDATION_PURE_FUNCTIONS.MATCHES]:
      '[column]NotMatchRegex[param-1]',
    [DATA_QUALITY_VALIDATION_PURE_FUNCTIONS.FILTER]: '',
  };

  static helperFunctionValidationNameTemplates: Record<string, string> = {
    [DATA_QUALITY_FILTER_VALIDATION_HELPER_FUNCTIONS.ROWS_WITH_EMPTY_COLUMN]:
      '[column]NotNull',
    [DATA_QUALITY_FILTER_VALIDATION_HELPER_FUNCTIONS.ROWS_WITH_NON_EMPTY_COLUMN]:
      '[column]IsNull',
    [DATA_QUALITY_FILTER_VALIDATION_HELPER_FUNCTIONS.ROWS_WITH_COLUMN_LONGER_THAN]:
      '[column]NotLongerThan[param-1]',
    [DATA_QUALITY_FILTER_VALIDATION_HELPER_FUNCTIONS.ROWS_WITH_NEGATIVE_VALUE]:
      '[column]NotNegative',
    [DATA_QUALITY_FILTER_VALIDATION_HELPER_FUNCTIONS.ROWS_WITH_COLUMN_DIFFERS_FROM_PATTERN]:
      '[column]ShouldSatisfyPattern',
    [DATA_QUALITY_FILTER_VALIDATION_HELPER_FUNCTIONS.ROWS_WITH_VALUE_OUTSIDE_RANGE]:
      '[column]Between[param-1]And[param-2]',
  };

  static helperFunctionValidationDescriptionTemplates: Record<string, string> =
    {
      [DATA_QUALITY_FILTER_VALIDATION_HELPER_FUNCTIONS.ROWS_WITH_EMPTY_COLUMN]:
        'Expect [column] not to be null',
      [DATA_QUALITY_FILTER_VALIDATION_HELPER_FUNCTIONS.ROWS_WITH_NON_EMPTY_COLUMN]:
        'Expect [column] to be null',
      [DATA_QUALITY_FILTER_VALIDATION_HELPER_FUNCTIONS.ROWS_WITH_COLUMN_LONGER_THAN]:
        'Expect [column] to have length [param-1]',
      [DATA_QUALITY_FILTER_VALIDATION_HELPER_FUNCTIONS.ROWS_WITH_NEGATIVE_VALUE]:
        'Expect [column] to be positive',
      [DATA_QUALITY_FILTER_VALIDATION_HELPER_FUNCTIONS.ROWS_WITH_COLUMN_DIFFERS_FROM_PATTERN]:
        'Expect [column] to satisfy the specified pattern',
      [DATA_QUALITY_FILTER_VALIDATION_HELPER_FUNCTIONS.ROWS_WITH_VALUE_OUTSIDE_RANGE]:
        'Expect [column] to be between [param-1] and [param-2]',
    };

  static pureFunctionValidationDescriptionTemplates: Record<string, string> = {
    [DATA_QUALITY_VALIDATION_PURE_FUNCTIONS.EQUAL]:
      'Expect [column] not to equal [param-1]',
    [DATA_QUALITY_VALIDATION_PURE_FUNCTIONS.IN]:
      'Expect [column] not be in [param-1]',
    [DATA_QUALITY_VALIDATION_PURE_FUNCTIONS.GREATER_THAN]:
      'Expect [column] to be less than [param-1]',
    [DATA_QUALITY_VALIDATION_PURE_FUNCTIONS.GREATER_THAN_EQUAL]:
      'Expect [column] to be less than or equal to [param-1]',
    [DATA_QUALITY_VALIDATION_PURE_FUNCTIONS.LESS_THAN]:
      'Expect [column] to be greater than [param-1]',
    [DATA_QUALITY_VALIDATION_PURE_FUNCTIONS.LESS_THAN_EQUAL]:
      'Expect [column] to be greater than or equal to [param-1]',
    [DATA_QUALITY_VALIDATION_PURE_FUNCTIONS.CONTAINS]:
      'Expect [column] not to contain [param-1]',
    [DATA_QUALITY_VALIDATION_PURE_FUNCTIONS.STARTS_WITH]:
      'Expect [column] not to start with [param-1]',
    [DATA_QUALITY_VALIDATION_PURE_FUNCTIONS.ENDS_WITH]:
      'Expect [column] not to end with [param-1]',
    [DATA_QUALITY_VALIDATION_PURE_FUNCTIONS.MATCHES]:
      'Expect [column] not match [param-1]',
    [DATA_QUALITY_VALIDATION_PURE_FUNCTIONS.FILTER]: '',
  };
}
