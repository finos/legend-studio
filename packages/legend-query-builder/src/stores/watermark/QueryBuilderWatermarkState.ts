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
  type ValueSpecification,
  VariableExpression,
  observe_ValueSpecification,
  GenericTypeExplicitReference,
  GenericType,
  PrimitiveInstanceValue,
  PrimitiveType,
} from '@finos/legend-graph';
import { type Hashable, hashArray } from '@finos/legend-shared';
import { makeObservable, observable, action, computed } from 'mobx';
import { DATA_DNS_ENV } from '../../graph/QueryBuilderMetaModelConst.js';
import { QUERY_BUILDER_STATE_HASH_STRUCTURE } from '../QueryBuilderStateHashUtils.js';
import type { QueryBuilderState } from '../QueryBuilderState.js';
import {
  isValidInstanceValue,
  isValueExpressionReferencedInValue,
} from '../QueryBuilderValueSpecificationHelper.js';

/**
 * A query has at most one watermark, either the standard `forWatermark()` or the Data DNS
 * `forDataDNSWatermark()`: the watermark state holds a single `QueryBuilderWatermark`.
 */
export abstract class QueryBuilderWatermark implements Hashable {
  abstract get hashCode(): string;

  abstract isVariableUsed(variable: VariableExpression): boolean;
}

/**
 * Watermark given as a single value, i.e. `forWatermark()`.
 */
export class QueryBuilderStandardWatermark extends QueryBuilderWatermark {
  value: ValueSpecification;

  constructor(value: ValueSpecification) {
    super();
    makeObservable(this, {
      value: observable,
      hashCode: computed,
    });
    this.value = value;
  }

  isVariableUsed(variable: VariableExpression): boolean {
    return isValueExpressionReferencedInValue(variable, this.value);
  }

  get hashCode(): string {
    return hashArray([
      QUERY_BUILDER_STATE_HASH_STRUCTURE.STANDARD_WATERMARK_STATE,
      this.value,
    ]);
  }
}

/**
 * Watermark resolved through the Data DNS Watermark Resolver, i.e. `forDataDNSWatermark()`.
 */
export class QueryBuilderDataDNSWatermark extends QueryBuilderWatermark {
  env: DATA_DNS_ENV = DATA_DNS_ENV.PROD;
  registryUri = '';
  // the business date parameter of the query, which the watermark follows, or a date of the user's own
  date: PrimitiveInstanceValue | VariableExpression | undefined;
  milestone = '';

  constructor() {
    super();
    makeObservable(this, {
      env: observable,
      registryUri: observable,
      date: observable,
      milestone: observable,
      setEnv: action,
      setRegistryUri: action,
      setDate: action,
      setMilestone: action,
      hashCode: computed,
    });
  }

  setEnv(val: DATA_DNS_ENV): void {
    this.env = val;
  }

  setRegistryUri(val: string): void {
    this.registryUri = val;
  }

  setDate(val: PrimitiveInstanceValue | VariableExpression | undefined): void {
    this.date = val;
  }

  setMilestone(val: string): void {
    this.milestone = val;
  }

  // the business date parameter of the query is given as context: the date can be it only while the query has it
  isValid(businessDateVariable: VariableExpression | undefined): boolean {
    return Boolean(
      this.registryUri.trim() &&
        this.date !== undefined &&
        (this.date instanceof VariableExpression
          ? this.date.name === businessDateVariable?.name
          : isValidInstanceValue(this.date)),
    );
  }

  isVariableUsed(variable: VariableExpression): boolean {
    return this.date !== undefined
      ? isValueExpressionReferencedInValue(variable, this.date)
      : false;
  }

  get hashCode(): string {
    return hashArray([
      QUERY_BUILDER_STATE_HASH_STRUCTURE.DATA_DNS_WATERMARK_STATE,
      this.env,
      this.registryUri,
      this.date ?? '',
      this.milestone,
    ]);
  }
}

export class QueryBuilderWatermarkState implements Hashable {
  readonly queryBuilderState: QueryBuilderState;
  watermark?: QueryBuilderWatermark | undefined;

  constructor(queryBuilderState: QueryBuilderState) {
    makeObservable(this, {
      watermark: observable,
      setWatermark: action,
      isEnabled: computed,
      businessDateVariable: computed,
      validationIssues: computed,
      isValid: computed,
      hashCode: computed,
    });

    this.queryBuilderState = queryBuilderState;
  }

  getDefaultValue(): ValueSpecification {
    const watermarkConstant = new PrimitiveInstanceValue(
      GenericTypeExplicitReference.create(
        new GenericType(PrimitiveType.STRING),
      ),
    );

    return watermarkConstant;
  }

  setWatermark(val: QueryBuilderWatermark | undefined): void {
    if (val instanceof QueryBuilderStandardWatermark) {
      val.value = observe_ValueSpecification(
        val.value,
        this.queryBuilderState.observerContext,
      );
    }
    this.watermark = val;
  }

  get isEnabled(): boolean {
    return this.watermark !== undefined;
  }

  /**
   * The business date of the query, when it is a parameter: the Data DNS watermark uses the parameter
   * itself, so that the watermark follows the value of the parameter.
   */
  get businessDateVariable(): VariableExpression | undefined {
    const milestoningState = this.queryBuilderState.milestoningState;
    return !milestoningState.isAllVersionsEnabled &&
      milestoningState.businessDate instanceof VariableExpression
      ? milestoningState.businessDate
      : undefined;
  }

  get validationIssues(): string[] {
    const watermark = this.watermark;
    if (
      watermark instanceof QueryBuilderDataDNSWatermark &&
      !watermark.isValid(this.businessDateVariable)
    ) {
      return watermark.date instanceof VariableExpression &&
        watermark.date.name !== this.businessDateVariable?.name
        ? [
            'Data DNS watermark uses the business date, which must be a date parameter',
          ]
        : ['Data DNS watermark is incomplete'];
    }
    return [];
  }

  get isValid(): boolean {
    return this.validationIssues.length === 0;
  }

  isVariableUsed(variable: VariableExpression): boolean {
    return this.watermark?.isVariableUsed(variable) ?? false;
  }

  get hashCode(): string {
    return hashArray([
      QUERY_BUILDER_STATE_HASH_STRUCTURE.WATERMARK_STATE,
      this.watermark ?? '',
    ]);
  }
}
