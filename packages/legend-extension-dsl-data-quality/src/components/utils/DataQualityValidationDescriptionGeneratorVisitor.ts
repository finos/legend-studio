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

import { DataQualityFunctionDefaults } from './DataQualityFunctionDefaults.js';
import type {
  DataQualityValidationFunctionVisitor,
  DataQualityValidationFilterFunction,
  DataQualityValidationCustomHelperFunction,
  DataQualityValidationFilterCondition,
  DataQualityValidationLogicalGroupFunction,
} from './DataQualityValidationFunction.js';
import {
  CollectionInstanceValue,
  PrimitiveInstanceValue,
} from '@finos/legend-graph';

export class DataQualityValidationDescriptionGeneratorVisitor
  implements DataQualityValidationFunctionVisitor<string>
{
  visitAssertion(): string {
    return '';
  }

  visitFilter(func: DataQualityValidationFilterFunction): string {
    const { parameters } = func;
    const { lambda } = parameters;

    return lambda.body.accept(this);
  }

  visitCustomHelper(func: DataQualityValidationCustomHelperFunction): string {
    const { parameters, name } = func;
    const { column, otherParams } = parameters;
    const values: string[] = [];
    const description =
      DataQualityFunctionDefaults.getFunctionDescriptionTemplate(name);

    if (!description) {
      return '';
    }

    if (!column.values[0]) {
      return description;
    }

    otherParams.forEach((param) => {
      if (param instanceof PrimitiveInstanceValue) {
        values.push(param.values[0] as string);
      }

      if (param instanceof CollectionInstanceValue) {
        values.push(
          `${param.values
            .map((value) => (value as PrimitiveInstanceValue).values[0])
            .join(',')}`,
        );
      }
    });

    return this.composeDescription(column.values[0].name, values, description);
  }

  visitFilterCondition(func: DataQualityValidationFilterCondition): string {
    const { property, otherParams } = func.parameters;
    const values: string[] = [];
    const description =
      DataQualityFunctionDefaults.getFunctionDescriptionTemplate(func.name);
    const columnName = property.func.value.name;

    if (!columnName || !description) {
      return '';
    }

    otherParams.forEach((param) => {
      if (param instanceof PrimitiveInstanceValue) {
        values.push(param.values[0] as string);
      }

      if (param instanceof CollectionInstanceValue) {
        values.push(
          param.values
            .map((value) => (value as PrimitiveInstanceValue).values[0])
            .join(','),
        );
      }
    });

    return this.composeDescription(columnName, values, description);
  }

  visitLogicalGroup(func: DataQualityValidationLogicalGroupFunction): string {
    const leftDescription = func.parameters.left.accept(this);
    const rightDescription = func.parameters.right.accept(this);

    const operator = func.name.toUpperCase();

    if (!leftDescription || !rightDescription) {
      return '';
    }

    return `${leftDescription} ${operator} ${rightDescription}`;
  }

  private composeDescription(
    columnName: string,
    params: string[],
    descriptionPlaceholder: string,
  ) {
    let description = descriptionPlaceholder;
    description = description.replace(/\[column\]/gi, columnName);

    params.forEach((param, index) => {
      const placeholder = new RegExp(`\\[param-${index + 1}\\]`, 'gi');
      description = description.replace(placeholder, String(param).trim());
    });

    return description;
  }
}
