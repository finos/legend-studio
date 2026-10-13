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
  SourceNode,
  type SourceResolution,
  UNRESOLVED,
} from '../../graph/QueryNode.js';
import { ensureSchemas, validate } from '../../inference/ValidationUtils.js';
import {
  MESSAGE_PARAMETER_VALUE_INVALID,
  MESSAGE_PARAMETER_VALUE_OUT_OF_RANGE,
  MESSAGE_PARAMETER_WITHOUT_VALUE,
  MESSAGE_SOURCE_SCHEMA_UNRESOLVED,
} from '../../messages/CubeMessages.js';
import type { Schema } from '../../schema/Schema.js';
import type { CubeType } from '../../types/CubeType.js';
import type { JsonObject } from '../../utils/Json.js';
import type { EnteredValue } from '../../values/LiteralValue.js';
import { checkValue } from '../../values/ValueEntry.js';
import type { SnapshotColumnRest } from './RelationalTableSource.js';

/**
 * A parameter of a function, as its signature declares it: a primitive type,
 * `[1]`, or `[0..1]` when it may be left empty (PLAN §6.5)
 */
export interface FunctionParameter {
  readonly name: string;
  readonly type: CubeType;
  /** `[0..1]`: an empty value is passed as `[]` */
  readonly optional: boolean;
}

/** Which function a source calls (PLAN §6.5) */
export interface FunctionCoordinates {
  /** The path the lambda calls, e.g. `sales::ordersAbove` */
  readonly function: string;
  /**
   * The engine's full name of the function, e.g.
   * `sales::ordersAbove_Float_1__Relation_1_`, which tells overloads apart
   */
  readonly signature: string;
  readonly parameters: readonly FunctionParameter[];
}

const NO_COLUMN_REST: ReadonlyMap<string, SnapshotColumnRest> = new Map();

const COORDINATES_REQUIRED = `A function source needs a function, a signature and its parameters`;

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0;

/** The coordinates in a value, or an error when one is missing or not the right shape */
const readCoordinates = (value: unknown): FunctionCoordinates => {
  if (typeof value !== 'object' || value === null) {
    throw new Error(COORDINATES_REQUIRED);
  }
  const fields = value as Record<string, unknown>;
  const { parameters } = fields;
  if (
    !isNonEmptyString(fields.function) ||
    !isNonEmptyString(fields.signature) ||
    !Array.isArray(parameters) ||
    parameters.some(
      (parameter: unknown) =>
        typeof parameter !== 'object' ||
        parameter === null ||
        !isNonEmptyString((parameter as Partial<FunctionParameter>).name) ||
        typeof (parameter as Partial<FunctionParameter>).optional !==
          'boolean' ||
        (parameter as Partial<FunctionParameter>).type === undefined,
    )
  ) {
    throw new Error(COORDINATES_REQUIRED);
  }
  return {
    function: fields.function,
    signature: fields.signature,
    parameters: (parameters as FunctionParameter[]).map(
      ({ name, type, optional }) => ({ name, type, optional }),
    ),
  };
};

/** The problem of a parameter's value, as a message; none for a valid one */
export const getFunctionParameterValueError = (
  parameter: FunctionParameter,
  value: EnteredValue,
): string | undefined => {
  if (value === undefined && parameter.optional) {
    return undefined;
  }
  const problem = checkValue(value, parameter.type);
  if (!problem) {
    return undefined;
  }
  switch (problem.reason) {
    case 'required':
      return MESSAGE_PARAMETER_WITHOUT_VALUE(parameter.name);
    case 'outOfRange':
      return MESSAGE_PARAMETER_VALUE_OUT_OF_RANGE(
        parameter.name,
        problem.text,
        parameter.type.displayName,
      );
    default:
      return MESSAGE_PARAMETER_VALUE_INVALID(
        parameter.name,
        problem.text,
        parameter.type.displayName,
      );
  }
};

/**
 * A function of the cube's model that returns a relation, called with a value
 * for each parameter (PLAN §6.5). Its columns are the engine's typing of the
 * call, which doesn't depend on the values; its runtime is the cube's.
 */
export class FunctionSource extends SourceNode {
  static readonly TYPE = 'function';

  readonly function: string;
  readonly signature: string;
  readonly parameters: readonly FunctionParameter[];
  /** One per parameter, in order: `undefined` when none is entered */
  readonly values: readonly EnteredValue[];
  readonly resolution: SourceResolution;
  /**
   * Unknown keys of the saved schema snapshot's columns, by column name. They
   * stay with the columns of that name when the source is resolved again.
   */
  readonly columnRest: ReadonlyMap<string, SnapshotColumnRest>;

  constructor(
    id: string,
    coordinates: FunctionCoordinates,
    values: readonly EnteredValue[] = [],
    resolution: SourceResolution = UNRESOLVED,
    rest?: JsonObject,
    columnRest: ReadonlyMap<string, SnapshotColumnRest> = NO_COLUMN_REST,
  ) {
    super(id, rest);
    const read = readCoordinates(coordinates);
    if (values.length > read.parameters.length) {
      throw new Error(
        `A function source has a value for each of its ${read.parameters.length} parameters, not ${values.length}`,
      );
    }
    this.function = read.function;
    this.signature = read.signature;
    this.parameters = read.parameters;
    this.values = read.parameters.map((_, index) => values[index]);
    this.resolution = resolution;
    this.columnRest = columnRest;
  }

  /**
   * Builds an unresolved source from what the source picker returns: the
   * function's coordinates, and optionally its `values`; other keys are left
   * out.
   */
  static fromCoordinates(id: string, coordinates: unknown): FunctionSource {
    const values = (coordinates as { values?: unknown } | null)?.values;
    return new FunctionSource(
      id,
      readCoordinates(coordinates),
      Array.isArray(values) ? (values as EnteredValue[]) : [],
    );
  }

  get type(): string {
    return FunctionSource.TYPE;
  }

  /** The function's name: the last segment of its path */
  get functionName(): string {
    const index = this.function.lastIndexOf('::');
    return index < 0 ? this.function : this.function.slice(index + 2);
  }

  /** A new source, with the same id, function and values, and this resolution */
  withResolution(resolution: SourceResolution): FunctionSource {
    return new FunctionSource(
      this.id,
      this,
      this.values,
      resolution,
      this.rest,
      this.columnRest,
    );
  }

  /** A new source, with the same id, function and resolution, and these values */
  withValues(values: readonly EnteredValue[]): FunctionSource {
    return new FunctionSource(
      this.id,
      this,
      values,
      this.resolution,
      this.rest,
      this.columnRest,
    );
  }

  /**
   * Valid once resolved, with a valid value for each parameter. A failed
   * resolution reports the first line of its error.
   */
  validate(inputSchemas: readonly Schema[], errors?: string[]): boolean {
    ensureSchemas(inputSchemas, this.ports);
    let valid = true;
    if (this.resolution.kind === 'failed') {
      const [firstLine] = this.resolution.message.split('\n');
      valid = validate(
        false,
        firstLine?.trim() ? firstLine.trim() : MESSAGE_SOURCE_SCHEMA_UNRESOLVED,
        errors,
      );
    } else {
      valid = validate(
        this.resolution.kind === 'resolved',
        MESSAGE_SOURCE_SCHEMA_UNRESOLVED,
        errors,
      );
    }
    this.parameters.forEach((parameter, index) => {
      const error = getFunctionParameterValueError(
        parameter,
        this.values[index],
      );
      valid = validate(error === undefined, error ?? '', errors) && valid;
    });
    return valid;
  }

  schematize(inputSchemas: readonly Schema[]): Schema | undefined {
    ensureSchemas(inputSchemas, this.ports);
    return this.resolution.kind === 'resolved'
      ? this.resolution.schema
      : undefined;
  }

  /** The function by name, with its parameters' names */
  describe(): string {
    return this.resolution.kind === 'unresolved'
      ? '(unknown)'
      : `Function "${this.functionName}"${
          this.parameters.length
            ? `(${this.parameters.map((parameter) => parameter.name).join(', ')})`
            : ''
        }`;
  }
}
