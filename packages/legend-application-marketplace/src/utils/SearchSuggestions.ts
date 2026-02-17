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

import type { AutosuggestResult } from '@finos/legend-server-marketplace';

export enum SearchSuggestionType {
  DEFAULT = 'default',
  AUTOSUGGEST = 'autosuggest',
  SEARCH_QUERY = 'search-query',
  LOADING = 'loading',
}

export const SEARCH_SUGGESTION_CONSTANTS = {
  LOADING_MESSAGE: 'Loading suggestions...',
  GROUP_HEADER_SUGGESTED_SEARCHES: 'Suggested Searches',
  GROUP_HEADER_DATA_PRODUCTS: 'Data Products',
  DEFAULT_PLACEHOLDER: 'Search',
  LOADING_KEY: 'loading',
  AUTOSUGGEST_LIMIT: 5,
  AUTOSUGGEST_DEBOUNCE_DELAY: 300,
} as const;

export interface SearchSuggestion {
  type: SearchSuggestionType;
  query: string;
  autosuggestResult?: AutosuggestResult | undefined;
}

export function createDefaultSuggestions(
  defaultSuggestionQueries: string[] | undefined,
): SearchSuggestion[] {
  if (!defaultSuggestionQueries || defaultSuggestionQueries.length === 0) {
    return [];
  }
  return defaultSuggestionQueries.map((queryText) => ({
    type: SearchSuggestionType.DEFAULT,
    query: queryText,
  }));
}

export function createAutosuggestSuggestions(
  autosuggestResults: AutosuggestResult[],
): SearchSuggestion[] {
  return autosuggestResults.map((autosuggestResult) => ({
    type: SearchSuggestionType.AUTOSUGGEST,
    query: autosuggestResult.dataProductName,
    autosuggestResult: autosuggestResult,
  }));
}

export function createSearchQuerySuggestion(
  userQuery: string,
): SearchSuggestion {
  return {
    type: SearchSuggestionType.SEARCH_QUERY,
    query: userQuery,
  };
}

export function createLoadingSuggestion(): SearchSuggestion {
  return {
    type: SearchSuggestionType.LOADING,
    query: SEARCH_SUGGESTION_CONSTANTS.LOADING_MESSAGE,
  };
}
