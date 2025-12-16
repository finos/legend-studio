/**
 * Copyright (c) 2025-present, Goldman Sachs
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

import { matchFunctionName } from '@finos/legend-graph';
import {
  SUPPORTED_TYPES,
  DATA_QUALITY_VALIDATION_HELPER_FUNCTIONS,
  type DATA_QUALITY_TERMINAL_ASSERTION_HELPER_FUNCTIONS,
  type DATA_QUALITY_FILTER_VALIDATION_HELPER_FUNCTIONS,
} from '../constants/DataQualityConstants.js';
import {
  DataQualityValidationHelperUtils,
  type LambdaBody,
  type ValidationParameters,
} from '../utils/DataQualityValidationHelperUtils.js';

export class DataQualityValidationHelperFunction {
  id: string | undefined;
  name:
    | DATA_QUALITY_FILTER_VALIDATION_HELPER_FUNCTIONS
    | DATA_QUALITY_TERMINAL_ASSERTION_HELPER_FUNCTIONS;
  parameters: ValidationParameters;
  description: string;
  private type = '';

  constructor(name: string, withRelationalRef?: boolean) {
    this.name = name as
      | DATA_QUALITY_FILTER_VALIDATION_HELPER_FUNCTIONS
      | DATA_QUALITY_TERMINAL_ASSERTION_HELPER_FUNCTIONS;
    const details =
      DataQualityValidationHelperUtils.getHelperFunctionDetails(name);
    this.description = details.description;
    this.parameters = details.defaultParams;
    if (withRelationalRef) {
      this.parameters.relationalRef = {
        value: 'rel',
        type: 'var',
      };
    }
  }

  clone(name: string) {
    const clone = new DataQualityValidationHelperFunction(name);
    clone.parameters.columns = this.parameters.columns;

    clone.type = this.type;
    clone.id = this.id;

    if (this.parameters.relationalRef) {
      clone.parameters.relationalRef = this.parameters.relationalRef;
    }

    return clone;
  }

  createChildFunction(name: string) {
    const child = new DataQualityValidationHelperFunction(name);
    child.parameters.relationalRef = this.parameters.relationalRef;
    this.parameters.relationalRef = undefined;
    return child;
  }

  validate() {
    const hasValidFunctionName = matchFunctionName(
      this.name,
      DATA_QUALITY_VALIDATION_HELPER_FUNCTIONS,
    );

    if (!hasValidFunctionName) {
      return false;
    }

    const hasValidColumn = !!this.parameters.columns.value?.length;

    if (!hasValidColumn) {
      return false;
    }
    const actualOtherParams = this.parameters.otherParams.filter(
      (param) =>
        param.value !== undefined && param.value !== null && param.value !== '',
    );

    if (
      actualOtherParams.length <
      DataQualityValidationHelperUtils.getRequiredOtherParamsCount(this.name)
    ) {
      return false;
    }

    for (const param of this.parameters.otherParams) {
      if (
        param.value !== undefined &&
        !this.isValidOtherParameterValue(param.value as string, param.type)
      ) {
        return false;
      }
    }

    return true;
  }

  changeType(name: string, type: string) {
    if (this.type !== type) {
      this.type = type;
      this.parameters.otherParams =
        DataQualityValidationHelperUtils.getHelperFunctionDetails(
          name,
        ).defaultParams.otherParams;
    }
  }

  getType() {
    return this.type;
  }

  createParameterFromLambda(
    lambdaBody: LambdaBody,
    columnOptions: { value: string; type: string }[],
  ) {
    this.parameters = this.mergeParameters(
      this.parameters,
      this.getFunctionParameters(lambdaBody),
    );

    const columnName = this.parameters.columns.value;
    this.type =
      columnOptions.find(({ value }) => value === columnName)?.type || '';
  }

  mergeParameters(
    target: ValidationParameters,
    source: ValidationParameters,
  ): ValidationParameters {
    return {
      columns: source.columns.value ? source.columns : target.columns,
      otherParams:
        source.otherParams.length > 0 ? source.otherParams : target.otherParams,
      relationalRef: source.relationalRef || target.relationalRef,
    };
  }

  handleParameterChange = (
    value: string | number | boolean | string[],
    type: SUPPORTED_TYPES,
    index?: number,
  ) => {
    if (
      type === SUPPORTED_TYPES.COL_SPEC ||
      type === SUPPORTED_TYPES.COL_SPEC_ARRAY
    ) {
      this.updateColumns(value as string[] | string);
    } else {
      this.updateOtherParams(
        value as string | number | boolean,
        index as number,
      );
    }
  };

  private getFunctionParameters(func: LambdaBody): ValidationParameters {
    const { columns, otherParams, relationalRef } =
      DataQualityValidationHelperUtils.processFunctionParameter(
        func.parameters,
      );
    return {
      columns,
      otherParams,
      relationalRef,
    };
  }

  private updateColumns = (value: string[] | string) => {
    this.parameters.columns.value = value;
  };

  private updateOtherParams = (
    value: string | number | boolean,
    index: number,
  ) => {
    if (this.parameters.otherParams[index]) {
      this.parameters.otherParams[index].value = value;
    }
  };

  private isValidOtherParameterValue(value: string, type: string): boolean {
    if (value === undefined || value === null) {
      return false;
    }

    switch (type) {
      case SUPPORTED_TYPES.INTEGER:
        const intValue =
          typeof value === 'string' ? parseInt(value, 10) : value;
        return Number.isInteger(intValue);

      case SUPPORTED_TYPES.FLOAT:
      case SUPPORTED_TYPES.DECIMAL:
        const floatValue =
          typeof value === 'string' ? parseFloat(value) : value;
        return typeof floatValue === 'number' && !isNaN(floatValue);

      case SUPPORTED_TYPES.STRING:
        return typeof value === 'string' && value.trim().length > 0;

      case SUPPORTED_TYPES.BOOLEAN:
        return typeof value === 'boolean';

      default:
        return true;
    }
  }
}
