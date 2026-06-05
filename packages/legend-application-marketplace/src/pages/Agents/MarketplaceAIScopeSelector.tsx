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

import { useState, useRef, useEffect, useCallback } from 'react';
import { observer } from 'mobx-react-lite';
import { PlusIcon, DatabaseIcon } from '@finos/legend-art';
import type { AutosuggestResult } from '@finos/legend-server-marketplace';
import { useLegendMarketplaceAIChatStore } from '../../application/providers/LegendMarketplaceAIChatStoreProvider.js';
import { MarketplaceAIProductAutosuggest } from './MarketplaceAIProductAutosuggest.js';

const MAX_SCOPE_PRODUCTS = 3;

export const MarketplaceAIScopeSelector = observer(() => {
  const store = useLegendMarketplaceAIChatStore();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent): void => {
      if (
        dropdownRef.current &&
        e.target instanceof Node &&
        !dropdownRef.current.contains(e.target)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleSelectProduct = useCallback(
    (result: AutosuggestResult): void => {
      store.addScopeProduct(result);
      setIsOpen(false);
    },
    [store],
  );

  return (
    <div className="ai-scope-selector" ref={dropdownRef}>
      {store.scopeProducts.length < MAX_SCOPE_PRODUCTS && (
        <button
          type="button"
          className="ai-scope-selector__trigger"
          title="Scope to a data product"
          aria-label="Scope to a data product"
          onClick={(): void => setIsOpen(true)}
        >
          <PlusIcon />
        </button>
      )}

      {isOpen && (
        <div className="ai-scope-selector__dropdown">
          <div className="ai-scope-selector__dropdown-header">
            <DatabaseIcon />
            <span>Select Data Product</span>
          </div>
          <MarketplaceAIProductAutosuggest
            onSelect={handleSelectProduct}
            className="ai-scope-selector__autosuggest"
            autoFocus={true}
          />
        </div>
      )}
    </div>
  );
});
