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
  PRECISE_PRIMITIVE_TYPE,
  PRIMITIVE_TYPE,
  extractElementNameFromPath,
} from '@finos/legend-graph';
import {
  type LegendAIProductMetadata,
  type TDSServiceSchema,
  type TDSColumnSchema,
  TDSServiceSourceType,
} from '../LegendAITypes.js';

const MAX_SUGGESTED_QUERIES = 8;

const STRING_TYPE_NAMES: ReadonlySet<string> = new Set([
  PRIMITIVE_TYPE.STRING,
  extractElementNameFromPath(PRECISE_PRIMITIVE_TYPE.VARCHAR),
]);

const NUMERIC_TYPE_NAMES: ReadonlySet<string> = new Set([
  PRIMITIVE_TYPE.NUMBER,
  PRIMITIVE_TYPE.INTEGER,
  PRIMITIVE_TYPE.FLOAT,
  PRIMITIVE_TYPE.DECIMAL,
  extractElementNameFromPath(PRECISE_PRIMITIVE_TYPE.INT),
  extractElementNameFromPath(PRECISE_PRIMITIVE_TYPE.TINY_INT),
  extractElementNameFromPath(PRECISE_PRIMITIVE_TYPE.U_TINY_INT),
  extractElementNameFromPath(PRECISE_PRIMITIVE_TYPE.SMALL_INT),
  extractElementNameFromPath(PRECISE_PRIMITIVE_TYPE.U_SMALL_INT),
  extractElementNameFromPath(PRECISE_PRIMITIVE_TYPE.U_INT),
  extractElementNameFromPath(PRECISE_PRIMITIVE_TYPE.BIG_INT),
  extractElementNameFromPath(PRECISE_PRIMITIVE_TYPE.U_BIG_INT),
  extractElementNameFromPath(PRECISE_PRIMITIVE_TYPE.FLOAT),
  extractElementNameFromPath(PRECISE_PRIMITIVE_TYPE.DOUBLE),
  extractElementNameFromPath(PRECISE_PRIMITIVE_TYPE.DECIMAL),
  extractElementNameFromPath(PRECISE_PRIMITIVE_TYPE.NUMERIC),
]);

const DATE_TYPE_NAMES: ReadonlySet<string> = new Set([
  PRIMITIVE_TYPE.DATE,
  PRIMITIVE_TYPE.STRICTDATE,
  PRIMITIVE_TYPE.DATETIME,
  extractElementNameFromPath(PRECISE_PRIMITIVE_TYPE.STRICTDATE),
  extractElementNameFromPath(PRECISE_PRIMITIVE_TYPE.DATETIME),
  extractElementNameFromPath(PRECISE_PRIMITIVE_TYPE.TIMESTAMP),
]);

const ID_COLUMN_PATTERN =
  /(?:id|key|code|number|guid|kerberos|isin|cusip|account)$/i;
const CATEGORY_COLUMN_PATTERN =
  /(?:type|name|region|division|department|unit|status|country|city|title|class|category|group|subdivision|organization|currency|location|sector|calendar|holiday|flag)/i;
const INFRASTRUCTURE_COLUMN_PATTERN =
  /^lake_|^__lake|^vlf|^batch|_ap_lh_migration/i;
const AP_DATE_NAME_PATTERN = /(?:date|dt|time)$/i;

export function isStringColumn(c: TDSColumnSchema): boolean {
  return (
    STRING_TYPE_NAMES.has(c.type ?? '') && !c.name.toLowerCase().includes('id')
  );
}

export function isNumericColumn(c: TDSColumnSchema): boolean {
  return NUMERIC_TYPE_NAMES.has(c.type ?? '');
}

export function isDateColumn(c: TDSColumnSchema): boolean {
  return (
    DATE_TYPE_NAMES.has(c.type ?? '') ||
    c.name.toLowerCase().includes('date') ||
    c.name.toLowerCase().includes('time')
  );
}

function buildDataInsightSuggestions(
  svc: TDSServiceSchema,
  stringCol: TDSColumnSchema | undefined,
  numericCol: TDSColumnSchema | undefined,
): string[] {
  const result: string[] = [];
  const dateCol = svc.columns.find(isDateColumn);
  const allStringCols = svc.columns.filter(isStringColumn);
  const allNumericCols = svc.columns.filter(isNumericColumn);

  // Aggregation: top-N grouped by a category dimension
  if (numericCol && stringCol) {
    result.push(
      `What are the top 10 ${stringCol.name} values by total ${numericCol.name} in ${svc.title}?`,
    );
  }

  // Distribution / breakdown by category
  if (stringCol) {
    result.push(
      `Show the distribution of records by ${stringCol.name} in ${svc.title}`,
    );
  }

  // Date-filtered query
  if (dateCol && numericCol) {
    result.push(
      `Show ${numericCol.name} trends from the last 30 days in ${svc.title}`,
    );
  } else if (dateCol) {
    result.push(`Show the most recent 10 records from ${svc.title}`);
  }

  // Sample-value filter: use an actual sample value for concrete suggestions
  if (stringCol?.sampleValues) {
    const firstSample = stringCol.sampleValues.split(',')[0]?.trim();
    if (firstSample && firstSample.length > 0) {
      result.push(
        `Show 10 records from ${svc.title} where ${stringCol.name} is ${firstSample}`,
      );
    }
  }

  // Count distinct for a secondary grouping column
  const secondaryString = allStringCols[1];
  if (secondaryString) {
    result.push(`Count records by ${secondaryString.name} in ${svc.title}`);
  }

  // Sum / average for a secondary numeric
  const secondaryNumeric = allNumericCols[1];
  if (secondaryNumeric && stringCol) {
    result.push(
      `What is the average ${secondaryNumeric.name} by ${stringCol.name} in ${svc.title}?`,
    );
  }

  // Null analysis for nullable columns
  const nullableCol = svc.columns.find(
    (c) => c.nullable === true && isStringColumn(c),
  );
  if (nullableCol) {
    result.push(
      `How many records have missing ${nullableCol.name} in ${svc.title}?`,
    );
  }

  return result;
}

function isAPCategoryColumn(c: TDSColumnSchema): boolean {
  return (
    STRING_TYPE_NAMES.has(c.type ?? '') &&
    !ID_COLUMN_PATTERN.test(c.name) &&
    !INFRASTRUCTURE_COLUMN_PATTERN.test(c.name) &&
    CATEGORY_COLUMN_PATTERN.test(c.name)
  );
}

function isAPNumericColumn(c: TDSColumnSchema): boolean {
  return NUMERIC_TYPE_NAMES.has(c.type ?? '');
}

function isAPDateColumn(c: TDSColumnSchema): boolean {
  return DATE_TYPE_NAMES.has(c.type ?? '') || AP_DATE_NAME_PATTERN.test(c.name);
}

function isAPTextColumn(c: TDSColumnSchema): boolean {
  return (
    STRING_TYPE_NAMES.has(c.type ?? '') &&
    !ID_COLUMN_PATTERN.test(c.name) &&
    !INFRASTRUCTURE_COLUMN_PATTERN.test(c.name)
  );
}

// ─── Access-Point Suggested Queries ─────────────────────────────────────────

function buildCategoryRichSuggestions(
  primary: TDSServiceSchema,
  groupCol: TDSColumnSchema,
  filterCol: TDSColumnSchema | undefined,
  numericCols: TDSColumnSchema[],
  categoryCols: TDSColumnSchema[],
): string[] {
  const s: string[] = [
    `How many records are in each ${groupCol.name} in ${primary.title}? Show top 10 by count`,
  ];
  if (filterCol) {
    s.push(
      `Which ${filterCol.name} values in ${primary.title} have more than 50 records?`,
    );
  }
  if (numericCols[0]) {
    s.push(
      `What percentage of records in ${primary.title} belong to each ${groupCol.name}?`,
    );
  } else {
    const secondGroupCol = categoryCols.find((c) => c !== groupCol);
    if (secondGroupCol) {
      s.push(
        `Show the count by ${groupCol.name} and ${secondGroupCol.name} in ${primary.title}`,
      );
    }
  }
  return s;
}

function buildNumericHeavySuggestions(
  primary: TDSServiceSchema,
  textCols: TDSColumnSchema[],
  numericCols: TDSColumnSchema[],
): string[] {
  const textCol = textCols[0];
  const numCol = numericCols[0];
  if (!textCol || !numCol) {
    return [];
  }
  const s = [
    `What are the top 10 ${textCol.name} values by total ${numCol.name} in ${primary.title}?`,
  ];
  if (numericCols[1]) {
    s.push(
      `Show the average ${numericCols[1].name} by ${textCol.name} in ${primary.title}`,
    );
  }
  return s;
}

function buildDateCentricSuggestions(
  primary: TDSServiceSchema,
  dateCols: TDSColumnSchema[],
  textCols: TDSColumnSchema[],
  categoryCols: TDSColumnSchema[],
): string[] {
  const dateCol = dateCols[0];
  if (!dateCol) {
    return [];
  }
  const textCol = textCols[0] ?? categoryCols[0];
  if (textCol) {
    return [
      `Show records from ${primary.title} for the current month by ${dateCol.name}`,
    ];
  }
  return [
    `Show the 20 most recent records from ${primary.title} by ${dateCol.name}`,
  ];
}

function buildCrossAPSuggestions(
  primary: TDSServiceSchema,
  secondary: TDSServiceSchema,
  currentCount: number,
): string[] {
  const primaryColNames = new Set(
    primary.columns.map((c) => c.name.toLowerCase()),
  );
  const s: string[] = [];
  const uniqueCol = secondary.columns.find(
    (c) =>
      !primaryColNames.has(c.name.toLowerCase()) &&
      !INFRASTRUCTURE_COLUMN_PATTERN.test(c.name) &&
      (isAPCategoryColumn(c) || isAPTextColumn(c)),
  );
  if (uniqueCol) {
    s.push(
      `For each record in ${primary.title}, get their ${uniqueCol.name} from ${secondary.title}`,
    );
  }
  const sharedCat =
    secondary.columns.find(isAPCategoryColumn) ??
    secondary.columns.find(isAPTextColumn);
  if (
    sharedCat &&
    primaryColNames.has(sharedCat.name.toLowerCase()) &&
    currentCount + s.length < MAX_SUGGESTED_QUERIES
  ) {
    s.push(
      `Compare the count of records by ${sharedCat.name} between ${primary.title} and ${secondary.title}`,
    );
  }
  return s;
}

function buildAccessPointSuggestions(
  accessPoints: TDSServiceSchema[],
  metadata: LegendAIProductMetadata,
): string[] {
  const suggestions: string[] = [
    `What data does ${metadata.name} offer and how can I use it?`,
  ];
  const primary = accessPoints[0];
  if (!primary) {
    return suggestions;
  }
  const categoryCols = primary.columns.filter(isAPCategoryColumn);
  const numericCols = primary.columns.filter(isAPNumericColumn);
  const dateCols = primary.columns.filter(isAPDateColumn);
  const textCols = primary.columns.filter(isAPTextColumn);
  const groupCol =
    categoryCols.find((c) => /division|region|calendar|sector/i.test(c.name)) ??
    categoryCols[0];
  const filterCol = categoryCols.find(
    (c) =>
      c !== groupCol &&
      /department|type|title|status|unit|holiday|flag|class|currency/i.test(
        c.name,
      ),
  );

  if (groupCol) {
    suggestions.push(
      ...buildCategoryRichSuggestions(
        primary,
        groupCol,
        filterCol,
        numericCols,
        categoryCols,
      ),
    );
  } else if (numericCols.length > 0 && textCols.length > 0) {
    suggestions.push(
      ...buildNumericHeavySuggestions(primary, textCols, numericCols),
    );
  } else if (dateCols.length > 0) {
    suggestions.push(
      ...buildDateCentricSuggestions(primary, dateCols, textCols, categoryCols),
    );
  } else if (textCols.length > 0) {
    const col = textCols[0];
    if (col) {
      suggestions.push(
        `Show all distinct ${col.name} values in ${primary.title}`,
      );
    }
  } else {
    suggestions.push(`Show 10 records from ${primary.title}`);
  }

  const dateCol0 = dateCols[0];
  if (dateCol0 && groupCol && suggestions.length < 5) {
    suggestions.push(
      `Show the count of records by ${groupCol.name} for each ${dateCol0.name} in ${primary.title}`,
    );
  }

  const secondary = accessPoints[1];
  if (secondary) {
    suggestions.push(
      ...buildCrossAPSuggestions(primary, secondary, suggestions.length),
    );
  }

  return suggestions.slice(0, MAX_SUGGESTED_QUERIES);
}

function buildCrossServiceSuggestions(services: TDSServiceSchema[]): string[] {
  if (services.length < 2) {
    return [];
  }
  const result: string[] = [];
  for (let i = 1; i < Math.min(services.length, 3); i++) {
    const svc = services[i];
    if (!svc) {
      continue;
    }
    const numCol = svc.columns.find(isNumericColumn);
    const strCol = svc.columns.find(isStringColumn);
    if (numCol && strCol) {
      result.push(
        `What are the top 5 ${strCol.name} values by ${numCol.name} in ${svc.title}?`,
      );
    } else if (strCol) {
      result.push(`Show the breakdown by ${strCol.name} in ${svc.title}`);
    } else {
      result.push(`Show 10 records from ${svc.title}`);
    }
  }
  return result;
}

export function buildSuggestedQueries(
  services: TDSServiceSchema[],
  metadata: LegendAIProductMetadata,
): string[] {
  const suggestions: string[] = [
    `What data does ${metadata.name} offer and how can I use it?`,
  ];

  if (services.length === 0) {
    return [
      ...suggestions,
      'What access points are available?',
      'Describe the data model and key entities',
    ];
  }

  const allAccessPoints = services.every(
    (s) => s.sourceType === TDSServiceSourceType.ACCESS_POINT,
  );
  if (allAccessPoints) {
    return buildAccessPointSuggestions(services, metadata);
  }

  const primary = services[0];
  if (!primary) {
    return [
      ...suggestions,
      'What access points are available and what columns do they have?',
    ];
  }

  const stringCol = primary.columns.find(isStringColumn);
  const numericCol = primary.columns.find(isNumericColumn);

  return [
    ...suggestions,
    `Show 10 records from ${primary.title}`,
    ...buildDataInsightSuggestions(primary, stringCol, numericCol),
    ...buildCrossServiceSuggestions(services),
  ].slice(0, MAX_SUGGESTED_QUERIES);
}
