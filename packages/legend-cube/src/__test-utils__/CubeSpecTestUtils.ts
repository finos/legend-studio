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

import type { CubeDocument } from '../graph/CubeDocument.js';

// runtime keys (`key` on nodes and rules) are left out; maps become entry
// lists and big integers (in type ranges) strings
const replacer = (name: string, value: unknown): unknown =>
  name === 'key'
    ? undefined
    : value instanceof Map
      ? [...(value as Map<unknown, unknown>).entries()]
      : typeof value === 'bigint'
        ? value.toString()
        : value;

/**
 * A plain description of everything a document holds, for deep-equality
 * checks: node fields (settings, rest, resolution, filter tree, saved JSON),
 * connections as a sorted set, and the document's other parts. Runtime keys
 * are left out, since every decode assigns new ones.
 */
export const describeDocument = (document: CubeDocument): unknown =>
  JSON.parse(
    JSON.stringify(
      {
        name: document.name,
        context: document.context,
        selected: document.query.selected,
        nodes: document.query.nodes.map((node) => ({
          ...node,
          type: node.type,
          ports: node.ports,
        })),
        connections: document.query.connections
          .map(
            (connection) =>
              `${connection.source} -> ${connection.target}.${connection.port}`,
          )
          .sort(),
        queryRest: document.queryRest,
        meta: document.meta,
        rest: document.rest,
      },
      replacer,
    ),
  );
