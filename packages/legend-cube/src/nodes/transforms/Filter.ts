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

import { type FilterRule, isFilterRule } from '../../filter/FilterTree.js';
import { UnaryNode } from '../../graph/QueryNode.js';
import { ensureSchemas, validate } from '../../inference/ValidationUtils.js';
import {
  BLANK_PLACEHOLDER,
  MESSAGE_FILTER_EMPTY,
} from '../../messages/CubeMessages.js';
import type { Schema } from '../../schema/Schema.js';
import type { JsonObject } from '../../utils/Json.js';

/** Keeps the rows of its input that match its filter; the columns stay as they are */
export class Filter extends UnaryNode {
  static readonly TYPE = 'filter';

  readonly filter: FilterRule | undefined;

  /** By default, no filter yet */
  constructor(id: string, filter?: FilterRule, rest?: JsonObject) {
    super(id, rest);
    // decoded filters arrive as `unknown`, so check the shape anyway
    const value: unknown = filter;
    if (value !== undefined && !isFilterRule(value)) {
      throw new Error(`A filter node's filter must be a filter rule`);
    }
    this.filter = filter;
  }

  get type(): string {
    return Filter.TYPE;
  }

  /** A new filter node with the same id, and this filter */
  withFilter(filter: FilterRule | undefined): Filter {
    return new Filter(this.id, filter, this.rest);
  }

  /** Needs a filter, which must be valid against the input schema */
  validate(inputSchemas: readonly Schema[], errors?: string[]): boolean {
    // `ensureSchemas` has checked there is one schema per port
    const [schema] = ensureSchemas(inputSchemas, this.ports) as [Schema];
    return (
      validate(this.filter !== undefined, MESSAGE_FILTER_EMPTY, errors) &&
      (this.filter as FilterRule).validate(schema, errors)
    );
  }

  /** The input schema, or `undefined` when the filter is invalid */
  override schematize(inputSchemas: readonly Schema[]): Schema | undefined {
    return this.validate(inputSchemas) ? inputSchemas[0] : undefined;
  }

  describe(): string {
    return `Filter by ${this.filter?.toString() ?? BLANK_PLACEHOLDER}`;
  }

  /** The description without the filter's values, which may be sensitive, for logs and telemetry */
  override describeRedacted(): string {
    return `Filter by ${this.filter?.toRedactedString() ?? BLANK_PLACEHOLDER}`;
  }
}
