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

import { DataCubeColumnKind } from '../DataCubeQueryEngine.js';
import { guaranteeNonNullable } from '@finos/legend-shared';
import {
  DATA_CUBE_JSON_SCALAR_PURE_TYPE,
  DataCubeJsonScalarKind,
  type DataCubeJsonShape,
  getDataCubeJsonScalarKind,
  getDataCubeJsonTopValues,
  isDataCubeJsonScalarShape,
} from './DataCubeJsonShape.js';

const VARIANT_TYPE = 'Variant';
const IDENTIFIER_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/u;
const CONTAINS_OFFER_COUNT = 8;

export type DataCubeJsonOffer = {
  key: string;
  label: string;
  name: string;
  type: string;
  kind: DataCubeColumnKind;
  code: string;
};

/**
 * Shared inputs every offer builder derives its label/name/code from, computed
 * once per field via `buildOfferContext` so each builder takes a single context instead
 * of repeating the same positional arguments.
 */
export type DataCubeJsonOfferContext = {
  names: string[];
  column: string;
  paths: string[];
  array: string;
  elements: string;
};

export function getPureStringLiteral(text: string): string {
  return `'${text.replace(/\\/gu, '\\\\').replace(/'/gu, "\\'")}'`;
}

export function getPureColumnAccess(name: string): string {
  return IDENTIFIER_PATTERN.test(name)
    ? `$x.${name}`
    : `$x.${getPureStringLiteral(name)}`;
}

export function buildColumnName(parts: string[]): string {
  return (
    parts
      .join('_')
      .replace(/[^A-Za-z0-9_]+/gu, '_')
      .replace(/_+/gu, '_')
      .replace(/^_|_$/gu, '') || 'value'
  );
}

export function getScalarColumnKind(
  scalarKind: DataCubeJsonScalarKind | undefined,
) {
  return scalarKind === DataCubeJsonScalarKind.FLOAT
    ? DataCubeColumnKind.MEASURE
    : DataCubeColumnKind.DIMENSION;
}

export function getPureLiteral(
  scalarKind: DataCubeJsonScalarKind,
  text: string,
): string | undefined {
  if (
    scalarKind === DataCubeJsonScalarKind.INTEGER ||
    scalarKind === DataCubeJsonScalarKind.FLOAT
  ) {
    if (!/^-?\d+(?:\.\d+)?$/u.test(text)) {
      return undefined;
    }
    return scalarKind === DataCubeJsonScalarKind.FLOAT && !text.includes('.')
      ? `${text}.0`
      : text;
  }
  return scalarKind === DataCubeJsonScalarKind.BOOLEAN
    ? String(text === 'true')
    : getPureStringLiteral(text);
}

export const buildOfferContext = (
  column: string,
  paths: string[],
): DataCubeJsonOfferContext => {
  const array = paths.reduce(
    (expression, key) => `${expression}->get(${getPureStringLiteral(key)})`,
    getPureColumnAccess(column),
  );
  return {
    names: [column, ...paths],
    column,
    paths,
    array,
    elements: `${array}->toMany(@${VARIANT_TYPE})`,
  };
};

const STATIC_OFFERS = {
  json: {
    key: 'json',
    label: 'as JSON',
    type: VARIANT_TYPE,
    kind: DataCubeColumnKind.DIMENSION,
  },
  keys: {
    key: 'keys',
    label: 'its keys, as text',
    type: 'String',
    kind: DataCubeColumnKind.DIMENSION,
  },
  count: {
    key: 'count',
    label: 'number of elements',
    type: 'Integer',
    kind: DataCubeColumnKind.MEASURE,
  },
  list: {
    key: 'list',
    label: 'all values, as text',
    type: 'String',
    kind: DataCubeColumnKind.DIMENSION,
  },
  first: {
    key: 'first',
    label: 'first element, as JSON',
    type: VARIANT_TYPE,
    kind: DataCubeColumnKind.DIMENSION,
  },
};

// ---- offer builders ----------------------------------------------------------------

export const buildJsonOffer = (
  offerContext: DataCubeJsonOfferContext,
): DataCubeJsonOffer => ({
  ...STATIC_OFFERS.json,
  name: buildColumnName(offerContext.names),
  code: `x|${offerContext.array}`,
});

export const buildKeysOffer = (
  offerContext: DataCubeJsonOfferContext,
): DataCubeJsonOffer => ({
  ...STATIC_OFFERS.keys,
  name: buildColumnName([...offerContext.names, 'keys']),
  code: `x|${offerContext.array}->to(@Map<String, ${VARIANT_TYPE}>)->toOne()->keys()->joinStrings(', ')`,
});

export const buildCountOffer = (
  offerContext: DataCubeJsonOfferContext,
): DataCubeJsonOffer => ({
  ...STATIC_OFFERS.count,
  name: buildColumnName([...offerContext.names, 'count']),
  code: `x|${offerContext.elements}->size()`,
});

export const buildListOffer = (
  offerContext: DataCubeJsonOfferContext,
): DataCubeJsonOffer => ({
  ...STATIC_OFFERS.list,
  name: buildColumnName([...offerContext.names, 'list']),
  code: `x|${offerContext.elements}->map(e|$e->to(@String))->joinStrings(', ')`,
});

export const buildValueOffer = (
  offerContext: DataCubeJsonOfferContext,
  scalarKind: DataCubeJsonScalarKind,
): DataCubeJsonOffer => {
  const type = DATA_CUBE_JSON_SCALAR_PURE_TYPE[scalarKind];
  return {
    key: 'value',
    label: `as ${type}`,
    name: buildColumnName(
      offerContext.paths.length
        ? offerContext.names
        : [...offerContext.names, 'value'],
    ),
    type,
    kind: getScalarColumnKind(scalarKind),
    code: `x|${offerContext.array}->to(@${type})`,
  };
};

export const buildContainsOffer = (
  offerContext: DataCubeJsonOfferContext,
  type: string,
  value: string,
  literal: string,
): DataCubeJsonOffer => ({
  key: `contains:${value}`,
  label: `contains ${value}`,
  name: buildColumnName([...offerContext.names, 'has', value]),
  type: 'Boolean',
  kind: DataCubeColumnKind.DIMENSION,
  code: `x|${offerContext.elements}->map(e|$e->to(@${type}))->contains(${literal})`,
});

export const buildFirstElementOffer = (
  offerContext: DataCubeJsonOfferContext,
): DataCubeJsonOffer => ({
  ...STATIC_OFFERS.first,
  name: buildColumnName([...offerContext.names, 'first']),
  code: `x|${offerContext.array}->get(0)`,
});

export const buildFirstElementFieldOffer = (
  offerContext: DataCubeJsonOfferContext,
  key: string,
  fieldKind: DataCubeJsonScalarKind,
): DataCubeJsonOffer => {
  const type = DATA_CUBE_JSON_SCALAR_PURE_TYPE[fieldKind];
  return {
    key: `first:${key}`,
    label: `first element's ${key}`,
    name: buildColumnName([...offerContext.names, 'first', key]),
    type,
    kind: getScalarColumnKind(fieldKind),
    code: `x|${offerContext.array}->get(0)->get(${getPureStringLiteral(key)})->to(@${type})`,
  };
};

export const buildTotalOffer = (
  offerContext: DataCubeJsonOfferContext,
  key: string,
  type: string,
): DataCubeJsonOffer => ({
  key: `total:${key}`,
  label: `total of ${key}`,
  name: buildColumnName([...offerContext.names, key, 'total']),
  type,
  kind: DataCubeColumnKind.MEASURE,
  code: `x|${offerContext.elements}->map(e|$e->get(${getPureStringLiteral(key)})->to(@${type}))->sum()`,
});

// ---- array offers ------------------------------------------------------------------

export function buildArrayOffers(
  offerContext: DataCubeJsonOfferContext,
  shape: DataCubeJsonShape,
): DataCubeJsonOffer[] {
  const offers: DataCubeJsonOffer[] = [buildCountOffer(offerContext)];
  const element = shape.element;
  if (!element) {
    return offers;
  }
  if (isDataCubeJsonScalarShape(element)) {
    const elementKind = guaranteeNonNullable(
      getDataCubeJsonScalarKind(element),
    );
    offers.push(buildListOffer(offerContext));
    if (
      elementKind !== DataCubeJsonScalarKind.DATE &&
      elementKind !== DataCubeJsonScalarKind.DATETIME
    ) {
      const type = DATA_CUBE_JSON_SCALAR_PURE_TYPE[elementKind];
      getDataCubeJsonTopValues(element)
        .slice(0, CONTAINS_OFFER_COUNT)
        .forEach((value) => {
          const literal = getPureLiteral(elementKind, value);
          if (literal !== undefined) {
            offers.push(buildContainsOffer(offerContext, type, value, literal));
          }
        });
    }
  }
  if (element.objects > 0) {
    offers.push(buildFirstElementOffer(offerContext));
    Array.from(element.fields.entries())
      .filter(([, field]) => isDataCubeJsonScalarShape(field))
      .sort((a, b) => a[0].localeCompare(b[0]))
      .forEach(([key, field]) => {
        const fieldKind = guaranteeNonNullable(
          getDataCubeJsonScalarKind(field),
        );
        offers.push(buildFirstElementFieldOffer(offerContext, key, fieldKind));
        if (
          fieldKind === DataCubeJsonScalarKind.INTEGER ||
          fieldKind === DataCubeJsonScalarKind.FLOAT
        ) {
          const type = DATA_CUBE_JSON_SCALAR_PURE_TYPE[fieldKind];
          offers.push(buildTotalOffer(offerContext, key, type));
        }
      });
  }
  return offers;
}
