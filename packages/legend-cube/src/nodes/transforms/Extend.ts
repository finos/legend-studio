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

import { UnaryNode } from '../../graph/QueryNode.js';
import { keepInputOrder, type RowOrder } from '../../inference/RowOrder.js';
import {
  ensureSchemas,
  validate,
  validateAllItems,
} from '../../inference/ValidationUtils.js';
import {
  ERR_TYPING,
  MESSAGE_ALREADY_IN_INPUT_SCHEMA,
  MESSAGE_CANNOT_BE_EMPTY,
  MESSAGE_EXPRESSION_NOT_A_LAMBDA,
  MESSAGE_EXPRESSION_NOT_TYPED,
  MESSAGE_EXPRESSIONS_NOT_TYPED,
  MESSAGE_NEW_COLUMN_NAME_EMPTY,
  MESSAGE_NEW_COLUMN_NAME_INVALID,
  MESSAGE_NEW_COLUMN_NAME_SAME_AS_OTHER,
  MESSAGE_NO_EXPRESSION,
  MESSAGE_NO_VALID_TYPE,
} from '../../messages/CubeMessages.js';
import { foldColumnName, isValidColumnName } from '../../schema/ColumnName.js';
import { Schema, SchemaColumn } from '../../schema/Schema.js';
import {
  type CubeType,
  isEnumType,
  isPrimitiveType,
} from '../../types/CubeType.js';
import {
  copyJson,
  hashText,
  isJsonObject,
  type JsonObject,
  stableJsonText,
} from '../../utils/Json.js';

/**
 * A column an Extend adds (PLAN §11.7): its name, its expression's text as
 * the user typed it, `x | $x.PRICE * $x.QTY`, and the engine's JSON for that
 * text, a lambda, without source information and with its number literals as
 * their digit strings, as Cube keeps literal values (PLAN §4.9); `undefined`
 * until the text is checked
 */
export interface ExtendColumn {
  readonly name: string;
  readonly code: string;
  readonly lambda: JsonObject | undefined;
}

/**
 * What the engine said the columns' types are, for one input schema and one
 * list of columns, told apart by their signature (`getExtendSignature`):
 * nothing yet, a type per column, or why it couldn't type them, with the
 * index of the column that failed when the engine named one.
 *
 * `upstream` is what the host that typed it gave the engine for the input,
 * digested: its relation and the model. Cube's schema can't tell everything
 * the engine sees (an Extend's column is nullable to Cube, never empty to the
 * engine after `toOne()`), so a host compares it and types again when it
 * differs (PLAN §11.7). Cube never reads it, and doesn't save it: a loaded
 * cube is typed again.
 */
export type ExtendTyping =
  | { readonly kind: 'unresolved' }
  | {
      readonly kind: 'typed';
      readonly signature: string;
      readonly types: readonly CubeType[];
      readonly upstream?: string | undefined;
    }
  | {
      readonly kind: 'failed';
      readonly signature: string;
      readonly message: string;
      readonly column?: number | undefined;
      readonly upstream?: string | undefined;
    };

export const UNTYPED: ExtendTyping = Object.freeze({ kind: 'unresolved' });

/**
 * The signature of a typing: a digest of the input's columns (name, type
 * and nullability) and of each new column's name and lambda. A typing is
 * current while the signature is the same; a column's name is in it, since
 * a later column may use it.
 */
export const getExtendSignature = (
  input: Schema,
  columns: readonly ExtendColumn[],
): string =>
  hashText(
    stableJsonText({
      input: input.columns.map((column) => [
        column.name,
        column.type.fullName,
        column.nullable,
      ]),
      columns: columns.map(({ name, lambda }) => [name, lambda ?? null]),
    }),
  );

/** Whether the JSON is a lambda of one parameter, as an expression must be (PLAN §11.7 Q2) */
export const isOneParameterLambda = (json: JsonObject): boolean =>
  json._type === 'lambda' &&
  Array.isArray(json.parameters) &&
  json.parameters.length === 1 &&
  Array.isArray(json.body) &&
  json.body.length > 0;

/** Whether a type can be a new column's: a primitive or an enumeration, never a type Cube doesn't know, such as Any */
const isColumnType = (type: CubeType): boolean =>
  isPrimitiveType(type) || isEnumType(type);

const freezeColumn = ({ name, code, lambda }: ExtendColumn): ExtendColumn =>
  Object.freeze({
    name,
    code,
    lambda: lambda === undefined ? undefined : copyJson(lambda),
  });

/**
 * Adds columns computed by expressions (spec §7.14, PLAN §11.7), each a
 * lambda of one row that may use the input's columns and the columns listed
 * before it. The engine types them, against the cube's model; until it has,
 * for this input and these expressions, the node waits (`ERR_TYPING`). Every
 * input column and row stays, in the input's order.
 */
export class Extend extends UnaryNode {
  static readonly TYPE = 'extend';

  readonly columns: readonly ExtendColumn[];
  readonly typing: ExtendTyping;

  /** By default, no column yet, and so nothing typed */
  constructor(
    id: string,
    columns: readonly ExtendColumn[] = [],
    typing: ExtendTyping = UNTYPED,
    rest?: JsonObject,
  ) {
    super(id, rest);
    const list: unknown = columns;
    if (
      !Array.isArray(list) ||
      !Array.from(list as unknown[]).every(
        (column) =>
          isJsonObject(column) &&
          typeof column.name === 'string' &&
          typeof column.code === 'string' &&
          (column.lambda === undefined || isJsonObject(column.lambda)),
      )
    ) {
      throw new Error(
        `An extend's columns must be a list of {name, code, lambda}, the lambda an object or left out`,
      );
    }
    this.columns = Object.freeze(columns.map(freezeColumn));
    this.typing = Object.freeze(
      typing.kind === 'typed'
        ? { ...typing, types: Object.freeze([...typing.types]) }
        : typing,
    );
  }

  get type(): string {
    return Extend.TYPE;
  }

  /** A new extend with the same id, and these columns; the typing is kept, and is current only if they type the same */
  withColumns(columns: readonly ExtendColumn[]): Extend {
    return new Extend(this.id, columns, this.typing, this.rest);
  }

  /** A new extend with the same id and columns, and this typing */
  withTyping(typing: ExtendTyping): Extend {
    return new Extend(this.id, this.columns, typing, this.rest);
  }

  /** The typing, if it is for this input schema and these columns; else nothing yet */
  currentTyping(input: Schema): ExtendTyping {
    return this.typing.kind !== 'unresolved' &&
      this.typing.signature === getExtendSignature(input, this.columns)
      ? this.typing
      : UNTYPED;
  }

  /**
   * Checks, in order: there are columns; then each column, every one
   * reported, stopping at its first problem: a name, valid, no input
   * column's and no earlier column's (compared as databases that ignore case
   * compare them), and an expression, a lambda of one row. Then the typing:
   * pending until the engine has typed these columns for this input
   * (`ERR_TYPING`), the engine's problem when it couldn't, then each type a
   * primitive or an enumeration.
   */
  validate(inputSchemas: readonly Schema[], errors?: string[]): boolean {
    // `ensureSchemas` has checked there is one schema per port
    const [schema] = ensureSchemas(inputSchemas, this.ports) as [Schema];
    return (
      validate(
        this.columns.length > 0,
        MESSAGE_CANNOT_BE_EMPTY('Columns'),
        errors,
      ) &&
      validateAllItems(this.getColumnProblems(schema), (problem) =>
        validate(problem === undefined, problem ?? '', errors),
      ) &&
      this.validateTyping(this.currentTyping(schema), errors)
    );
  }

  /**
   * Each column's first problem that needs no engine, by index, `undefined`
   * for a column without one: a name, valid, no input column's and no earlier
   * column's (compared as databases that ignore case compare them), and an
   * expression, a lambda of one row. The editor checks these before it asks
   * the engine to type the columns.
   */
  getColumnProblems(input: Schema): (string | undefined)[] {
    const inputNames = new Set(input.names().map(foldColumnName));
    const names = this.columns.map(({ name }) => foldColumnName(name));
    return this.columns.map(({ name, lambda }, index) => {
      const folded = names[index] ?? '';
      return name === ''
        ? MESSAGE_NEW_COLUMN_NAME_EMPTY
        : !isValidColumnName(name)
          ? MESSAGE_NEW_COLUMN_NAME_INVALID
          : inputNames.has(folded)
            ? MESSAGE_ALREADY_IN_INPUT_SCHEMA('Column', name)
            : names.slice(0, index).includes(folded)
              ? MESSAGE_NEW_COLUMN_NAME_SAME_AS_OTHER(name)
              : lambda === undefined
                ? MESSAGE_NO_EXPRESSION(name)
                : !isOneParameterLambda(lambda)
                  ? MESSAGE_EXPRESSION_NOT_A_LAMBDA(name)
                  : undefined;
    });
  }

  /**
   * Each column's problem with the type the engine gave it, by index: a
   * primitive or an enumeration, never a type Cube doesn't know, such as Any
   */
  getTypeProblems(types: readonly CubeType[]): (string | undefined)[] {
    return this.columns.map(({ name }, index) => {
      const type = types[index];
      return type !== undefined && isColumnType(type)
        ? undefined
        : MESSAGE_NO_VALID_TYPE(name);
    });
  }

  private validateTyping(typing: ExtendTyping, errors?: string[]): boolean {
    switch (typing.kind) {
      case 'unresolved':
        return validate(false, ERR_TYPING, errors);
      case 'failed': {
        const [firstLine] = typing.message.split('\n');
        const detail = firstLine?.trim() ?? '';
        const column =
          typing.column === undefined ? undefined : this.columns[typing.column];
        return validate(
          false,
          column
            ? MESSAGE_EXPRESSION_NOT_TYPED(column.name, detail)
            : MESSAGE_EXPRESSIONS_NOT_TYPED(detail),
          errors,
        );
      }
      default:
        return (
          validate(
            typing.types.length === this.columns.length,
            ERR_TYPING,
            errors,
          ) &&
          validateAllItems(this.getTypeProblems(typing.types), (problem) =>
            validate(problem === undefined, problem ?? '', errors),
          )
        );
    }
  }

  /**
   * The input's columns, then one per new column, in listed order, typed as
   * the engine typed it and nullable: an expression over an empty value is
   * empty in SQL, though the engine types it never empty after `toOne()`
   * (PLAN §11.7); `undefined` when invalid
   */
  override schematize(inputSchemas: readonly Schema[]): Schema | undefined {
    if (!this.validate(inputSchemas)) {
      return undefined;
    }
    const [schema] = inputSchemas as [Schema];
    const typing = this.currentTyping(schema);
    if (typing.kind !== 'typed') {
      throw new Error(`Extend "${this.id}" is valid, but not typed`);
    }
    return new Schema([
      ...schema.columns,
      ...this.columns.map(
        ({ name }, index) =>
          new SchemaColumn(name, typing.types[index] as CubeType, true),
      ),
    ]);
  }

  /** The input's order: every row is kept */
  override outputOrder(
    inputOrders: readonly (RowOrder | undefined)[],
  ): RowOrder | undefined {
    return keepInputOrder(inputOrders);
  }

  /** As the spec says: `Extend with "x", "y"` */
  describe(): string {
    return `Extend with ${this.columns.map(({ name }) => `"${name || '(blank)'}"`).join(', ')}`;
  }

  /** Without the names the user gave: `Extend with 2 columns` */
  override describeRedacted(): string {
    const count = this.columns.length;
    return `Extend with ${count} column${count === 1 ? '' : 's'}`;
  }
}
