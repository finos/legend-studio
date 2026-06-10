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

import { PRIMITIVE_TYPE } from '@finos/legend-graph';
import type {
  LegendAIProductMetadata,
  TDSServiceSchema,
  TDSColumnSchema,
} from '../LegendAITypes.js';

const MAX_SUGGESTED_QUERIES = 8;

const STRING_TYPES = new Set<string>([PRIMITIVE_TYPE.STRING]);

const NUMERIC_TYPES = new Set<string>([
  PRIMITIVE_TYPE.NUMBER,
  PRIMITIVE_TYPE.INTEGER,
  PRIMITIVE_TYPE.FLOAT,
  PRIMITIVE_TYPE.DECIMAL,
]);

const DATE_TYPES = new Set<string>([
  PRIMITIVE_TYPE.DATE,
  PRIMITIVE_TYPE.STRICTDATE,
  PRIMITIVE_TYPE.DATETIME,
]);

export function isStringColumn(c: TDSColumnSchema): boolean {
  return STRING_TYPES.has(c.type ?? '') && !c.name.toLowerCase().includes('id');
}

export function isNumericColumn(c: TDSColumnSchema): boolean {
  return NUMERIC_TYPES.has(c.type ?? '');
}

export function isDateColumn(c: TDSColumnSchema): boolean {
  return (
    DATE_TYPES.has(c.type ?? '') ||
    c.name.toLowerCase().includes('date') ||
    c.name.toLowerCase().includes('time')
  );
}

function buildDataInsightSuggestions(
  primary: TDSServiceSchema,
  stringCol: TDSColumnSchema | undefined,
  numericCol: TDSColumnSchema | undefined,
): string[] {
  const result: string[] = [];
  if (stringCol) {
    result.push(
      `Show the distinct ${stringCol.name} values from ${primary.title}`,
    );
  }

  if (numericCol && !stringCol) {
    result.push(`What is the total ${numericCol.name} in ${primary.title}?`);
  }
  return result;
}

function buildMultiServiceSuggestion(services: TDSServiceSchema[]): string[] {
  if (services.length < 2) {
    return [];
  }
  return [`Show 10 records from ${services[1]?.title}`];
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

  const primary = services[0];
  if (!primary) {
    return [
      ...suggestions,
      'What access points are available and what columns do they have?',
    ];
  }

  const stringCol = primary.columns.find(isStringColumn);
  const numericCol = primary.columns.find(isNumericColumn);

  const multiSvcSuggestions = buildMultiServiceSuggestion(services);

  return [
    ...suggestions,
    `Show 10 records from ${primary.title}`,
    ...buildDataInsightSuggestions(primary, stringCol, numericCol),
    ...multiSvcSuggestions,
  ].slice(0, MAX_SUGGESTED_QUERIES);
}
