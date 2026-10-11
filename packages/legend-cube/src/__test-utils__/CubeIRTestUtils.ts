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

import type { IR } from '../ir/CubeIR.js';
import { printIR } from '../ir/IRPrinter.js';

/** The IR nodes inside a node, in the order they are printed */
const children = (node: IR): (IR | undefined)[] => {
  switch (node.k) {
    case 'func':
      return [...node.params];
    case 'property':
      return [node.receiver];
    case 'lambda':
      return [...node.body];
    case 'collection':
      return [...node.values];
    case 'colSpec':
      return [node.fn1, node.fn2];
    case 'colSpecArray':
      return [...node.specs];
    case 'let':
      return [node.value];
    default:
      return [];
  }
};

/** A short name for an IR node that can carry an origin */
const label = (node: IR): string | undefined => {
  switch (node.k) {
    case 'func':
      return node.name;
    case 'let':
      return `let ${node.name}`;
    case 'lambdaJson':
      return 'lambda';
    case 'property':
      return `.${node.name}`;
    case 'literal':
    case 'enumValue':
    case 'storeAccessor':
    case 'dataProductAccessor':
    case 'ingestAccessor':
      return printIR(node);
    default:
      return undefined;
  }
};

/**
 * Every IR node that can carry an origin (func, property, literal, enumValue
 * and the accessors), in tree order, as `<label>@<nodeId>:<role>`, or
 * `<label>@-` without one; e.g. `filter@filter101:filter`, `.CITY@filter101:column`,
 * `'France'@filter101:value`. Tests compare the whole list, so each site's
 * role is pinned.
 */
export const listOrigins = (ir: IR): string[] => {
  const found: string[] = [];
  const visit = (node: IR | undefined): void => {
    if (!node) {
      return;
    }
    const name = label(node);
    if (name !== undefined) {
      const origin = 'origin' in node ? node.origin : undefined;
      found.push(`${name}@${origin ? `${origin.nodeId}:${origin.role}` : '-'}`);
    }
    children(node).forEach(visit);
  };
  visit(ir);
  return found;
};

/** The IR without any origin */
export const stripOrigins = (ir: IR): IR =>
  JSON.parse(
    JSON.stringify(ir, (key, value: unknown) =>
      key === 'origin' ? undefined : value,
    ),
  ) as IR;
