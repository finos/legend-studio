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

import { type DataCubeJsonNode, readDataCubeJson } from './DataCubeJson.js';

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/u;
const ISO_DATE_TIME_PATTERN =
  /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?$/u;
const WHOLE_NUMBER_PATTERN = /^-?\d+$/u;
const MAX_PURE_INTEGER = 9223372036854775807n;
const MAX_DISTINCT_SCALAR_VALUES = 50;

export enum DataCubeJsonScalarKind {
  INTEGER = 'integer',
  FLOAT = 'float',
  BOOLEAN = 'boolean',
  DATE = 'date',
  DATETIME = 'datetime',
  TEXT = 'text',
}

export const DATA_CUBE_JSON_SCALAR_PURE_TYPE: Record<
  DataCubeJsonScalarKind,
  string
> = {
  [DataCubeJsonScalarKind.INTEGER]: 'Integer',
  [DataCubeJsonScalarKind.FLOAT]: 'Float',
  [DataCubeJsonScalarKind.BOOLEAN]: 'Boolean',
  [DataCubeJsonScalarKind.DATE]: 'StrictDate',
  [DataCubeJsonScalarKind.DATETIME]: 'DateTime',
  [DataCubeJsonScalarKind.TEXT]: 'String',
};

function getNodeScalarKind(
  node: DataCubeJsonNode,
): DataCubeJsonScalarKind | undefined {
  switch (node.kind) {
    case 'number':
      return WHOLE_NUMBER_PATTERN.test(node.text)
        ? BigInt(node.text) <= MAX_PURE_INTEGER &&
          BigInt(node.text) >= -MAX_PURE_INTEGER
          ? DataCubeJsonScalarKind.INTEGER
          : DataCubeJsonScalarKind.TEXT
        : DataCubeJsonScalarKind.FLOAT;
    case 'boolean':
      return DataCubeJsonScalarKind.BOOLEAN;
    case 'string':
      return ISO_DATE_PATTERN.test(node.value)
        ? DataCubeJsonScalarKind.DATE
        : ISO_DATE_TIME_PATTERN.test(node.value)
          ? DataCubeJsonScalarKind.DATETIME
          : DataCubeJsonScalarKind.TEXT;
    default:
      return undefined;
  }
}

function getNodeScalarText(node: DataCubeJsonNode): string {
  switch (node.kind) {
    case 'number':
      return node.text;
    case 'string':
      return node.value;
    case 'boolean':
      return String(node.value);
    default:
      return '';
  }
}

export type DataCubeJsonShape = {
  present: number;
  nulls: number;
  readonly scalars: Map<DataCubeJsonScalarKind, number>;
  readonly values: Map<string, number>;
  objects: number;
  readonly fields: Map<string, DataCubeJsonShape>;
  arrays: number;
  element: DataCubeJsonShape | undefined;
  minLength: number;
  maxLength: number;
};

const buildEmptyShape = (): DataCubeJsonShape => ({
  present: 0,
  nulls: 0,
  scalars: new Map(),
  values: new Map(),
  objects: 0,
  fields: new Map(),
  arrays: 0,
  element: undefined,
  minLength: Infinity,
  maxLength: 0,
});

function observeNode(shape: DataCubeJsonShape, node: DataCubeJsonNode): void {
  shape.present += 1;
  if (node.kind === 'null') {
    shape.nulls += 1;
    return;
  }
  if (node.kind === 'object') {
    shape.objects += 1;
    node.entries.forEach(([key, value]) => {
      let field = shape.fields.get(key);
      if (!field) {
        field = buildEmptyShape();
        shape.fields.set(key, field);
      }
      observeNode(field, value);
    });
    return;
  }
  if (node.kind === 'array') {
    shape.arrays += 1;
    shape.minLength = Math.min(shape.minLength, node.items.length);
    shape.maxLength = Math.max(shape.maxLength, node.items.length);
    const element = shape.element ?? buildEmptyShape();
    shape.element = element;
    node.items.forEach((item) => observeNode(element, item));
    return;
  }
  const nodeScalarKind = getNodeScalarKind(node);
  if (nodeScalarKind) {
    shape.scalars.set(
      nodeScalarKind,
      (shape.scalars.get(nodeScalarKind) ?? 0) + 1,
    );
  }
  const nodeScalarText = getNodeScalarText(node);
  if (
    shape.values.has(nodeScalarText) ||
    shape.values.size < MAX_DISTINCT_SCALAR_VALUES
  ) {
    shape.values.set(
      nodeScalarText,
      (shape.values.get(nodeScalarText) ?? 0) + 1,
    );
  }
}

export type DataCubeJsonSample = {
  shape: DataCubeJsonShape;
  rows: number;
  complete: boolean;
};

export class DataCubeJsonShapeReader {
  private readonly shape = buildEmptyShape();
  private rows = 0;

  add(value: unknown): void {
    this.rows += 1;
    if (value === null || value === undefined) {
      return;
    }
    const node = readDataCubeJson(
      typeof value === 'string' ? value : JSON.stringify(value),
    );
    if (node) {
      observeNode(this.shape, node);
    }
  }

  result(complete: boolean): DataCubeJsonSample {
    return {
      shape: this.shape,
      rows: this.rows,
      complete,
    };
  }
}

export function getDataCubeJsonScalarKind(
  shape: DataCubeJsonShape,
): DataCubeJsonScalarKind | undefined {
  const kinds = Array.from(shape.scalars.keys());
  if (kinds.length <= 1) {
    return kinds[0];
  }
  return kinds.every(
    (kind) =>
      kind === DataCubeJsonScalarKind.INTEGER ||
      kind === DataCubeJsonScalarKind.FLOAT,
  )
    ? DataCubeJsonScalarKind.FLOAT
    : DataCubeJsonScalarKind.TEXT;
}

export function isDataCubeJsonScalarShape(shape: DataCubeJsonShape): boolean {
  return shape.objects === 0 && shape.arrays === 0 && shape.scalars.size > 0;
}

export function isDataCubeJsonObjectShape(shape: DataCubeJsonShape): boolean {
  return shape.objects > 0;
}

export function isDataCubeJsonArrayShape(shape: DataCubeJsonShape): boolean {
  return shape.arrays > 0;
}

export function getDataCubeJsonTopValues(shape: DataCubeJsonShape): string[] {
  return Array.from(shape.values.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 12)
    .map(([value]) => value);
}

export function describeDataCubeJsonShape(shape: DataCubeJsonShape): string {
  const parts: string[] = [];
  const scalarKind = getDataCubeJsonScalarKind(shape);
  if (scalarKind) {
    parts.push(scalarKind);
  }
  if (isDataCubeJsonObjectShape(shape)) {
    parts.push('object');
  }
  if (isDataCubeJsonArrayShape(shape)) {
    const element = shape.element;
    parts.push(
      `array of ${!element || element.present === element.nulls ? 'nothing' : describeDataCubeJsonShape(element)}`,
    );
  }
  return parts.length ? parts.join(' or ') : 'always null';
}
