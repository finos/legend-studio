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
  DATA_QUALITY_TERMINAL_ASSERTION_HELPER_FUNCTIONS,
  type SUPPORTED_TYPES,
} from '../constants/DataQualityConstants.js';
import { uuid } from '@finos/legend-shared';
import { action, computed, makeObservable, observable } from 'mobx';
import { DataQualityValidationHelperUtils } from '../utils/DataQualityValidationHelperUtils.js';
import { DataQualityValidationHelperFunction } from '../utils/DataQualityValidationHelperFunction.js';

export class DataQualityValidationHelperRuleState {
  rule: {
    assert: DataQualityValidationHelperFunction | undefined;
    filters: Map<string, DataQualityValidationHelperFunction>;
  } = {
    assert: undefined,
    filters: new Map(),
  };

  constructor() {
    makeObservable(this, {
      rule: observable,
      addRuleFunction: action,
      handleAssertChange: action,
      handleFiltersChange: action,
      handleFilterColumnChange: action,
      assertion: computed,
      filterHelpers: computed,
    });
  }

  validateRule() {
    return (
      this.rule.assert?.validate() &&
      this.filterHelpers.every((fRule) => fRule.validate())
    );
  }

  get description() {
    const filter = this.filterHelpers[0];
    const { columns, otherParams = [] } = filter?.parameters || {};
    const expectedParamsCount =
      DataQualityValidationHelperUtils.getRequiredOtherParamsCount(
        filter?.name || '',
      );
    let description = '';
    if (
      columns?.value &&
      otherParams.filter(
        ({ value }) =>
          String(value) && ![undefined, null].includes(value as undefined),
      ).length === expectedParamsCount
    ) {
      description =
        filter?.description.replace('[column]', columns.value as string) || '';

      otherParams.forEach(({ value }, index) => {
        description = description?.replace(
          `[param-${index + 1}]`,
          (value as string) || '',
        );
      });
    }
    return description;
  }

  handleAssertChange = (value: string | string[], type: SUPPORTED_TYPES) => {
    this.rule.assert?.handleParameterChange(value, type);
    this.rule = { ...this.rule };
  };

  handleFilterColumnChange = (
    id: string,
    col: { value: string | number | boolean | string[]; type: string },
    type: SUPPORTED_TYPES,
    index?: number,
  ) => {
    const currentFunc = this.rule.filters.get(id);
    currentFunc?.handleParameterChange(col.value, type, index);
    currentFunc?.changeType(col.value as string, col.type);
    this.rule = { ...this.rule };
  };

  handleFiltersChange = (
    id: string,
    value: string | number | boolean | string[],
    type: SUPPORTED_TYPES,
    index?: number,
  ) => {
    const currentFunc = this.rule.filters.get(id);
    currentFunc?.handleParameterChange(value, type, index);
    this.rule = { ...this.rule };
  };

  addRuleFunction = (func: DataQualityValidationHelperFunction) => {
    const id = uuid();
    func.id = id;
    if (
      matchFunctionName(
        func.name,
        Object.values(DATA_QUALITY_TERMINAL_ASSERTION_HELPER_FUNCTIONS),
      )
    ) {
      this.rule.assert = func;
    } else {
      this.rule.filters.set(id, func);
    }
  };

  handleRuleChange = (name: string, filterId: string) => {
    const currentFunc = this.rule.filters.get(filterId);
    if (currentFunc) {
      const func = currentFunc.clone(name);
      this.rule.filters.set(filterId, func);
      this.rule = { ...this.rule };
    }
  };

  get assertion() {
    if (this.rule.assert) {
      return this.rule.assert;
    }

    const assertFunc = new DataQualityValidationHelperFunction(
      DATA_QUALITY_TERMINAL_ASSERTION_HELPER_FUNCTIONS.ASSERT_RELATION_EMPTY,
      this.rule.filters.size < 1,
    );

    this.addRuleFunction(assertFunc);
    return assertFunc;
  }

  get filterHelpers() {
    if (this.rule.filters.size > 0) {
      return [...this.rule.filters.values()];
    }

    const filterHelper = this.assertion.createChildFunction('');

    this.addRuleFunction(filterHelper);

    return [filterHelper];
  }
}
