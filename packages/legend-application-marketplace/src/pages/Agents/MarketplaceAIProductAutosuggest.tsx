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

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { observer } from 'mobx-react-lite';
import { SearchIcon, TimesIcon } from '@finos/legend-art';
import { debounce, noop } from '@finos/legend-shared';
import type { AutosuggestResult } from '@finos/legend-server-marketplace';
import { useLegendMarketplaceAIChatStore } from '../../application/providers/LegendMarketplaceAIChatStoreProvider.js';

const AUTOSUGGEST_DEBOUNCE_MS = 300;
const AUTOSUGGEST_LIMIT = 6;

export const MarketplaceAIProductAutosuggest = observer(
  (props: {
    onSelect: (result: AutosuggestResult) => void;
    placeholder?: string;
    className?: string;
    autoFocus?: boolean;
  }): React.ReactNode => {
    const {
      onSelect,
      placeholder = 'Search data products...',
      className,
      autoFocus,
    } = props;
    const store = useLegendMarketplaceAIChatStore();
    const [searchText, setSearchText] = useState('');
    const [results, setResults] = useState<AutosuggestResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const abortControllerRef = useRef<AbortController | undefined>(undefined);

    const fetchResults = useCallback(
      async (query: string, signal?: AbortSignal): Promise<void> => {
        if (!query.trim()) {
          setResults([]);
          setIsSearching(false);
          return;
        }
        setIsSearching(true);
        try {
          const response =
            await store.baseStore.marketplaceServerClient.getAutosuggestions(
              query,
              store.baseStore.envState.lakehouseEnvironment,
              AUTOSUGGEST_LIMIT,
              signal,
            );
          if (!signal?.aborted) {
            setResults(response.results);
            setIsSearching(false);
          }
        } catch {
          if (!signal?.aborted) {
            setResults([]);
            setIsSearching(false);
          }
        }
      },
      [store.baseStore],
    );

    const debouncedFetch = useMemo(
      () =>
        debounce((query: string) => {
          if (abortControllerRef.current) {
            abortControllerRef.current.abort();
          }
          const controller = new AbortController();
          abortControllerRef.current = controller;
          fetchResults(query, controller.signal).catch(noop());
        }, AUTOSUGGEST_DEBOUNCE_MS),
      [fetchResults],
    );

    const handleSearchChange = useCallback(
      (value: string): void => {
        setSearchText(value);
        debouncedFetch(value);
      },
      [debouncedFetch],
    );

    const handleSelectResult = useCallback(
      (result: AutosuggestResult): void => {
        onSelect(result);
        setSearchText('');
        setResults([]);
      },
      [onSelect],
    );

    useEffect(
      () => () => {
        debouncedFetch.cancel();
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
      },
      [debouncedFetch],
    );

    const rootClass = className
      ? `ai-product-autosuggest ${className}`
      : 'ai-product-autosuggest';

    return (
      <div className={rootClass}>
        <div className="ai-product-autosuggest__search">
          <SearchIcon />
          <input
            ref={inputRef}
            type="text"
            className="ai-product-autosuggest__input"
            placeholder={placeholder}
            autoFocus={autoFocus}
            value={searchText}
            onChange={(e): void => handleSearchChange(e.target.value)}
          />
          {searchText && (
            <button
              type="button"
              className="ai-product-autosuggest__clear"
              onClick={(): void => {
                setSearchText('');
                setResults([]);
                inputRef.current?.focus();
              }}
            >
              <TimesIcon />
            </button>
          )}
        </div>
        {(isSearching || results.length > 0 || searchText) && (
          <div className="ai-product-autosuggest__results">
            {isSearching && (
              <div className="ai-product-autosuggest__status">Searching...</div>
            )}
            {!isSearching && searchText && results.length === 0 && (
              <div className="ai-product-autosuggest__status">
                No products found
              </div>
            )}
            {!isSearching &&
              results.map((r) => (
                <button
                  key={`${r.dataProductDetails.groupId}:${r.dataProductDetails.artifactId}`}
                  type="button"
                  className="ai-product-autosuggest__item"
                  onClick={(): void => handleSelectResult(r)}
                >
                  <div className="ai-product-autosuggest__item-name">
                    {r.dataProductName}
                  </div>
                  {r.dataProductDescription && (
                    <div className="ai-product-autosuggest__item-desc">
                      {r.dataProductDescription}
                    </div>
                  )}
                </button>
              ))}
          </div>
        )}
      </div>
    );
  },
);
