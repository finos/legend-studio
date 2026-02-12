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

import {
  CollectionInstanceValue,
  PrimitiveInstanceValue,
} from '@finos/legend-graph';
import { DataQualityFunctionDefaults } from './DataQualityFunctionDefaults.js';
import type {
  DataQualityValidationAssertionFunction,
  DataQualityValidationCustomHelperFunction,
  DataQualityValidationFilterCondition,
  DataQualityValidationFilterFunction,
  DataQualityValidationFunctionVisitor,
  DataQualityValidationLogicalGroupFunction,
} from './DataQualityValidationFunction.js';
import { hashArray } from '@finos/legend-shared';

export class DataQualityValidationNameGeneratorVisitor
  implements DataQualityValidationFunctionVisitor<string>
{
  depth = 0;
  visitAssertion(func: DataQualityValidationAssertionFunction): string {
    return '';
  }

  visitCustomHelper(func: DataQualityValidationCustomHelperFunction): string {
    const { column, otherParams } = func.parameters;
    const values: string[] = [];
    const nameTemplate = DataQualityFunctionDefaults.getFunctionNameTemplate(
      func.name,
    );

    const columnName = column.values[0]?.name;
    if (!columnName || !nameTemplate) {
      return '';
    }

    otherParams.forEach((param) => {
      if (param instanceof PrimitiveInstanceValue) {
        const value = param.values[0] as string;
        values.push(String(value));
      }

      if (param instanceof CollectionInstanceValue) {
        values.push('List');
      }
    });

    return this.composeName(columnName, values, nameTemplate);
  }

  visitFilter(func: DataQualityValidationFilterFunction): string {
    const { lambda } = func.parameters;

    return this.splitAndHashLongNames(lambda.body.accept(this), 3);
  }

  visitFilterCondition(func: DataQualityValidationFilterCondition): string {
    const { property, otherParams } = func.parameters;
    const values: string[] = [];
    const nameTemplate = DataQualityFunctionDefaults.getFunctionNameTemplate(
      func.name,
    );

    const columnName = property.func.value.name;
    if (!columnName || !nameTemplate) {
      return '';
    }

    otherParams.forEach((param) => {
      if (param instanceof PrimitiveInstanceValue) {
        const value = param.values[0] as string;
        values.push(String(value));
      }

      if (param instanceof CollectionInstanceValue) {
        values.push('_List');
      }
    });

    return this.composeName(columnName, values, nameTemplate);
  }

  visitLogicalGroup(func: DataQualityValidationLogicalGroupFunction): string {
    const leftName = this.capitalizeFirstLetter(
      func.parameters.left.accept(this),
    );
    const rightName = this.capitalizeFirstLetter(
      func.parameters.right.accept(this),
    );
    const operator = this.capitalizeFirstLetter(func.name);

    if (!leftName && !rightName) {
      return '';
    }

    return `${leftName}${operator}${rightName}`;
  }

  private composeName(
    columnName: string,
    params: string[],
    nameTemplate: string,
  ): string {
    let name = nameTemplate;

    name = name.replace(/\[column\]/gi, this.toCamelCase(columnName));

    params.forEach((param, index) => {
      const placeholder = new RegExp(`\\[param-${index + 1}\\]`, 'giu');
      name = name.replace(
        placeholder,
        this.capitalizeFirstLetter(param.trim()),
      );
    });

    return name;
  }

  private splitAndHashLongNames(str: string, maxParts: number = 4): string {
    const parts = str.split(/(?=And|Or)/g).filter((part) => part.length > 0);

    if (parts.length <= maxParts) {
      return str;
    }

    const keepParts = parts.slice(0, maxParts - 1);
    const remainingParts = parts.slice(maxParts - 1);
    const hash = hashArray(remainingParts).slice(0, 6);

    return `${keepParts.join('')}_${hash}`;
  }

  private capitalizeFirstLetter(str: string) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  private toCamelCase(str: string): string {
    if (!str) {
      return '';
    }

    // Split by common delimiters: spaces, underscores, hyphens, dots
    const words = str.split(/[\s_\-\.]+/g).filter((word) => word.length > 0);

    if (words.length === 0) {
      return '';
    }

    return words
      .map((word, index) => {
        const lowerWord = word.toLowerCase();

        if (index === 0) {
          return lowerWord;
        }

        return lowerWord.charAt(0).toUpperCase() + lowerWord.slice(1);
      })
      .join('');
  }
}
