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

import { assertUnreachable } from '../utils/AssertionUtils.js';
import type { LiteralValue } from '../values/LiteralValue.js';
import type { IR } from './CubeIR.js';

export interface IRPrintOptions {
  /** Print every literal as `?`, for logs: literals are values users typed */
  readonly redactLiterals?: boolean;
}

const INFIX_OPERATORS: Readonly<Record<string, string>> = Object.freeze({
  equal: '==',
  greaterThan: '>',
  greaterThanEqual: '>=',
  lessThan: '<',
  lessThanEqual: '<=',
  and: '&&',
  or: '||',
});

const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/u;

/** A name as Pure writes it: as is when it is an identifier, else single-quoted */
const printName = (name: string): string =>
  IDENTIFIER.test(name)
    ? name
    : `'${name.replaceAll('\\', '\\\\').replaceAll("'", "\\'")}'`;

const printString = (value: string): string =>
  `'${value.replaceAll('\\', '\\\\').replaceAll("'", "\\'")}'`;

// Pure reads `1e3` as an element name, so a number with an exponent needs a
// decimal point (`1.0e3`); a float needs one anyway to read as a float
const withDecimalPoint = (text: string): string => {
  const [mantissa = '', exponent] = text.split(/(?=[eE])/u);
  return `${mantissa.includes('.') ? mantissa : `${mantissa}.0`}${exponent ?? ''}`;
};

const printLiteral = (value: LiteralValue): string => {
  switch (value.kind) {
    case 'string':
      return printString(value.value);
    case 'boolean':
      return String(value.value);
    case 'integer':
      return value.value;
    case 'float':
      return withDecimalPoint(value.value);
    case 'decimal':
      return `${/[.eE]/u.test(value.value) ? withDecimalPoint(value.value) : value.value}D`;
    case 'strictDate':
    case 'dateTime':
      return `%${value.value}`;
    case 'enum':
      return value.value;
    default:
      return assertUnreachable(value);
  }
};

const isInfix = (ir: IR): boolean =>
  ir.k === 'func' &&
  ir.params.length === 2 &&
  INFIX_OPERATORS[ir.name] !== undefined;

const isNot = (ir: IR): boolean =>
  ir.k === 'func' && ir.name === 'not' && ir.params.length === 1;

// `-3` reads as `minus(3)`, so a negative number is parenthesized before `->`
const isNegativeNumber = (ir: IR): boolean =>
  ir.k === 'literal' &&
  (ir.value.kind === 'integer' ||
    ir.value.kind === 'float' ||
    ir.value.kind === 'decimal') &&
  ir.value.value.startsWith('-');

/**
 * Renders IR as Pure-like text, for golden tests and debugging; it is never
 * sent to the engine. Operators are infix with every operand that is itself
 * an operator in parentheses, `!` always takes parentheses, and everything
 * else is an arrow call on its first parameter, so the text has no precedence
 * traps. Store accessor segments are printed as stored: a quoted dotted name
 * (`"a.b"`) does not read back as one segment, which is why Cube sends JSON.
 */
export const printIR = (ir: IR, options: IRPrintOptions = {}): string => {
  const print = (node: IR): string => printIR(node, options);
  // an operand of an operator, or the receiver of an arrow call
  const operand = (node: IR): string =>
    isInfix(node) || isNot(node) || isNegativeNumber(node)
      ? `(${print(node)})`
      : print(node);
  // a lambda as a column function: `x | body`
  const bareLambda = (node: IR): string =>
    node.k === 'lambda'
      ? `${node.params.join(', ')} | ${node.body.map(print).join('; ')}`
      : print(node);
  const colSpecBody = (node: IR): string =>
    node.k === 'colSpec'
      ? `${printName(node.name)}${node.fn1 ? `: ${bareLambda(node.fn1)}` : ''}${node.fn2 ? ` : ${bareLambda(node.fn2)}` : ''}`
      : print(node);

  switch (ir.k) {
    case 'func': {
      const [receiver, ...rest] = ir.params;
      const infix = INFIX_OPERATORS[ir.name];
      if (infix && ir.params.length === 2 && receiver && rest[0]) {
        return `${operand(receiver)} ${infix} ${operand(rest[0])}`;
      }
      if (isNot(ir) && receiver) {
        return `!(${print(receiver)})`;
      }
      return receiver
        ? `${operand(receiver)}->${ir.name}(${rest.map(print).join(', ')})`
        : `${ir.name}()`;
    }
    case 'property':
      return `${operand(ir.receiver)}.${printName(ir.name)}`;
    case 'var':
      return `$${ir.name}`;
    case 'lambda':
      return ir.params.length
        ? `{${bareLambda(ir)}}`
        : `{| ${ir.body.map(print).join('; ')}}`;
    case 'literal':
      return options.redactLiterals ? '?' : printLiteral(ir.value);
    case 'collection':
      return `[${ir.values.map(print).join(', ')}]`;
    case 'colSpec':
      return `~${colSpecBody(ir)}`;
    case 'colSpecArray':
      return `~[${ir.specs.map(colSpecBody).join(', ')}]`;
    case 'storeAccessor':
      return `#>{${ir.path.join('.')}}#`;
    case 'elementPtr':
      return ir.path;
    case 'genericType':
      return `@${ir.path}${ir.params?.length ? `(${ir.params.join(', ')})` : ''}`;
    case 'enumValue':
      return `${ir.enumPath}.${ir.value}`;
    case 'let':
      return `let ${ir.name} = ${print(ir.value)}`;
    case 'block':
      return `{${ir.statements.map(print).join('; ')}}`;
    case 'raw':
      return `<raw ${JSON.stringify(ir.json)}>`;
    default:
      return assertUnreachable(ir);
  }
};
