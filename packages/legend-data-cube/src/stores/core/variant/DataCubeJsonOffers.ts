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
  type DataCubeJsonSample,
  type DataCubeJsonShape,
  describeDataCubeJsonShape,
  getDataCubeJsonScalarKind,
  getDataCubeJsonTopValues,
  isDataCubeJsonArrayShape,
  isDataCubeJsonObjectShape,
  isDataCubeJsonScalarShape,
} from './DataCubeJsonShape.js';
import {
  buildArrayOffers,
  buildOfferContext,
  buildJsonOffer,
  buildKeysOffer,
  buildValueOffer,
  getPureColumnAccess,
  getPureStringLiteral,
  type DataCubeJsonOffer,
} from './DataCubeJsonOfferBuilders.js';

export {
  getPureColumnAccess as _pureColumnAccess,
  getPureStringLiteral as _pureStringLiteral,
  type DataCubeJsonOffer,
};

export type DataCubeJsonField = {
  path: string[];
  description: string;
  presence: number;
  topValues: string[];
  offers: DataCubeJsonOffer[];
  children: DataCubeJsonField[];
};

function _offers(
  column: string,
  paths: string[],
  shape: DataCubeJsonShape,
): DataCubeJsonOffer[] {
  const offerContext = buildOfferContext(column, paths);
  const offers: DataCubeJsonOffer[] = [];
  const scalarKind = getDataCubeJsonScalarKind(shape);

  if (scalarKind && isDataCubeJsonScalarShape(shape)) {
    offers.push(buildValueOffer(offerContext, scalarKind));
  }
  if (
    paths.length > 0 &&
    (isDataCubeJsonObjectShape(shape) || isDataCubeJsonArrayShape(shape))
  ) {
    offers.push(buildJsonOffer(offerContext));
  }
  if (isDataCubeJsonObjectShape(shape)) {
    offers.push(buildKeysOffer(offerContext));
  }
  if (isDataCubeJsonArrayShape(shape)) {
    offers.push(...buildArrayOffers(offerContext, shape));
  }
  return offers;
}

export function getDataCubeJsonFields(
  column: string,
  sample: DataCubeJsonSample,
): DataCubeJsonField {
  const build = (
    shape: DataCubeJsonShape,
    path: string[],
    places: number,
  ): DataCubeJsonField => ({
    path,
    description: describeDataCubeJsonShape(shape),
    presence: Math.min(1, (shape.present - shape.nulls) / Math.max(1, places)),
    topValues: isDataCubeJsonScalarShape(shape)
      ? getDataCubeJsonTopValues(shape)
      : [],
    offers: _offers(column, path, shape),
    children: isDataCubeJsonObjectShape(shape)
      ? Array.from(shape.fields.entries())
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([key, field]) => build(field, [...path, key], shape.objects))
      : [],
  });
  return build(sample.shape, [], sample.rows);
}

export function filterDataCubeJsonFields(
  field: DataCubeJsonField | undefined,
  search: string,
): DataCubeJsonField | undefined {
  if (!field) {
    return undefined;
  }
  const text = search.trim().toLowerCase();
  if (!text) {
    return field;
  }
  const children = field.children
    .map((child) => filterDataCubeJsonFields(child, search))
    .filter((child): child is DataCubeJsonField => child !== undefined);
  return children.length > 0 ||
    (field.path.length > 0 && field.path.join('.').toLowerCase().includes(text))
    ? { ...field, children }
    : undefined;
}

export function getFreeDataCubeColumnName(
  name: string,
  takenNames: string[],
): string {
  if (!takenNames.includes(name)) {
    return name;
  }
  let index = 2;
  while (takenNames.includes(`${name}_${index}`)) {
    index += 1;
  }
  return `${name}_${index}`;
}
