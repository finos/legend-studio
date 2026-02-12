/**
 * Copyright (c) 2026-present, Goldman Sachs
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

import { PRIMITIVE_TYPE } from '@finos/legend-graph';
import {
  DATA_QUALITY_VALIDATION_PURE_FUNCTIONS,
  DATA_QUALITY_FILTER_VALIDATION_HELPER_FUNCTIONS,
  DATA_QUALITY_TERMINAL_ASSERTION_HELPER_FUNCTIONS,
  PARAMETER_COMPONENTS,
  SUPPORTED_TYPES,
} from '../constants/DataQualityConstants.js';

export class DataQualityValidationFunctionsUtils {
  static getComponentType(type: string) {
    switch (type) {
      case SUPPORTED_TYPES.STRING:
        return PARAMETER_COMPONENTS.STRING;
      case SUPPORTED_TYPES.INTEGER:
      case SUPPORTED_TYPES.FLOAT:
      case SUPPORTED_TYPES.DECIMAL:
      case SUPPORTED_TYPES.NUMBER:
        return PARAMETER_COMPONENTS.NUMBER;
      case SUPPORTED_TYPES.COL_SPEC:
        return PARAMETER_COMPONENTS.COLUMN;
      case SUPPORTED_TYPES.PROPERTY:
        return PARAMETER_COMPONENTS.COLUMN;
      case SUPPORTED_TYPES.COL_SPEC_ARRAY:
        return PARAMETER_COMPONENTS.COLUMN_LIST;
      case SUPPORTED_TYPES.COLLECTION:
        return PARAMETER_COMPONENTS.LIST;
      default:
        return PARAMETER_COMPONENTS.NONE;
    }
  }

  static getValidationFunctionsByColumnType(
    columnType: string,
  ): (
    | DATA_QUALITY_FILTER_VALIDATION_HELPER_FUNCTIONS
    | DATA_QUALITY_VALIDATION_PURE_FUNCTIONS
  )[] {
    const defaultOptions = [
      DATA_QUALITY_FILTER_VALIDATION_HELPER_FUNCTIONS.ROWS_WITH_EMPTY_COLUMN,
      DATA_QUALITY_FILTER_VALIDATION_HELPER_FUNCTIONS.ROWS_WITH_NON_EMPTY_COLUMN,
      DATA_QUALITY_VALIDATION_PURE_FUNCTIONS.EQUAL,
      DATA_QUALITY_VALIDATION_PURE_FUNCTIONS.IN,
    ];
    switch (columnType) {
      case PRIMITIVE_TYPE.STRING:
        return [
          ...defaultOptions,
          DATA_QUALITY_FILTER_VALIDATION_HELPER_FUNCTIONS.ROWS_WITH_COLUMN_LONGER_THAN,
          DATA_QUALITY_FILTER_VALIDATION_HELPER_FUNCTIONS.ROWS_WITH_COLUMN_DIFFERS_FROM_PATTERN,
          DATA_QUALITY_VALIDATION_PURE_FUNCTIONS.ENDS_WITH,
          DATA_QUALITY_VALIDATION_PURE_FUNCTIONS.CONTAINS,
        ];

      case PRIMITIVE_TYPE.NUMBER:
        return [
          ...defaultOptions,
          DATA_QUALITY_FILTER_VALIDATION_HELPER_FUNCTIONS.ROWS_WITH_NEGATIVE_VALUE,
          DATA_QUALITY_FILTER_VALIDATION_HELPER_FUNCTIONS.ROWS_WITH_VALUE_OUTSIDE_RANGE,
          DATA_QUALITY_VALIDATION_PURE_FUNCTIONS.GREATER_THAN,
          DATA_QUALITY_VALIDATION_PURE_FUNCTIONS.GREATER_THAN_EQUAL,
          DATA_QUALITY_VALIDATION_PURE_FUNCTIONS.LESS_THAN,
          DATA_QUALITY_VALIDATION_PURE_FUNCTIONS.LESS_THAN_EQUAL,
        ];

      default:
        return defaultOptions;
    }
  }

  static getFilterValidationFunctionsByColumnType(
    columnType: string,
  ): (
    | DATA_QUALITY_FILTER_VALIDATION_HELPER_FUNCTIONS
    | DATA_QUALITY_VALIDATION_PURE_FUNCTIONS
  )[] {
    const defaultOptions = [
      DATA_QUALITY_VALIDATION_PURE_FUNCTIONS.EQUAL,
      DATA_QUALITY_VALIDATION_PURE_FUNCTIONS.IN,
    ];
    switch (columnType) {
      case PRIMITIVE_TYPE.STRING:
        return [
          ...defaultOptions,
          DATA_QUALITY_VALIDATION_PURE_FUNCTIONS.ENDS_WITH,
          DATA_QUALITY_VALIDATION_PURE_FUNCTIONS.CONTAINS,
        ];

      case PRIMITIVE_TYPE.NUMBER:
        return [
          ...defaultOptions,
          DATA_QUALITY_VALIDATION_PURE_FUNCTIONS.GREATER_THAN,
          DATA_QUALITY_VALIDATION_PURE_FUNCTIONS.GREATER_THAN_EQUAL,
          DATA_QUALITY_VALIDATION_PURE_FUNCTIONS.LESS_THAN,
          DATA_QUALITY_VALIDATION_PURE_FUNCTIONS.LESS_THAN_EQUAL,
        ];

      default:
        return defaultOptions;
    }
  }

  static getDataQualityValidationHelperFunctionLabel(
    functionName:
      | DATA_QUALITY_FILTER_VALIDATION_HELPER_FUNCTIONS
      | DATA_QUALITY_TERMINAL_ASSERTION_HELPER_FUNCTIONS
      | DATA_QUALITY_VALIDATION_PURE_FUNCTIONS
      | string,
  ): string {
    switch (functionName) {
      case DATA_QUALITY_FILTER_VALIDATION_HELPER_FUNCTIONS.ROWS_WITH_EMPTY_COLUMN:
        return 'Is Empty';
      case DATA_QUALITY_FILTER_VALIDATION_HELPER_FUNCTIONS.ROWS_WITH_NON_EMPTY_COLUMN:
        return 'Is Not Empty';
      case DATA_QUALITY_FILTER_VALIDATION_HELPER_FUNCTIONS.ROWS_WITH_COLUMN_LONGER_THAN:
        return 'Is Longer Than';
      case DATA_QUALITY_FILTER_VALIDATION_HELPER_FUNCTIONS.ROWS_WITH_NEGATIVE_VALUE:
        return 'Is Negative Value';
      case DATA_QUALITY_FILTER_VALIDATION_HELPER_FUNCTIONS.ROWS_WITH_COLUMN_DIFFERS_FROM_PATTERN:
        return 'Is Different From Pattern';
      case DATA_QUALITY_FILTER_VALIDATION_HELPER_FUNCTIONS.ROWS_WITH_VALUE_OUTSIDE_RANGE:
        return 'Is Outside Range';
      case DATA_QUALITY_VALIDATION_PURE_FUNCTIONS.GREATER_THAN:
        return 'Is Greater Than';
      case DATA_QUALITY_VALIDATION_PURE_FUNCTIONS.GREATER_THAN_EQUAL:
        return 'Is Greater Than or Equal';
      case DATA_QUALITY_VALIDATION_PURE_FUNCTIONS.LESS_THAN:
        return 'Is Less Than';
      case DATA_QUALITY_VALIDATION_PURE_FUNCTIONS.LESS_THAN_EQUAL:
        return 'Is Less Than or Equal';
      case DATA_QUALITY_VALIDATION_PURE_FUNCTIONS.IN:
        return 'Is In List Of';
      case DATA_QUALITY_VALIDATION_PURE_FUNCTIONS.CONTAINS:
        return 'Contains';
      case DATA_QUALITY_VALIDATION_PURE_FUNCTIONS.ENDS_WITH:
        return 'Ends With';
      case DATA_QUALITY_VALIDATION_PURE_FUNCTIONS.EQUAL:
        return 'Is';
      case DATA_QUALITY_TERMINAL_ASSERTION_HELPER_FUNCTIONS.ASSERT_RELATION_EMPTY:
        return 'Assert Relation Empty';
      default:
        return '';
    }
  }

  static getFunctionOptionsByColType(type: string): {
    label: string;
    value: string;
  }[] {
    return DataQualityValidationFunctionsUtils.getValidationFunctionsByColumnType(
      type,
    ).map((func) => ({
      label:
        DataQualityValidationFunctionsUtils.getDataQualityValidationHelperFunctionLabel(
          func,
        ),
      value: func,
    }));
  }

  static getFilterFunctionOptionsByColType(type: string): {
    label: string;
    value: string;
  }[] {
    return DataQualityValidationFunctionsUtils.getFilterValidationFunctionsByColumnType(
      type,
    ).map((func) => ({
      label:
        DataQualityValidationFunctionsUtils.getDataQualityValidationHelperFunctionLabel(
          func,
        ),
      value: func,
    }));
  }
}
