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
import {
  PlusCircleIcon,
  SearchIcon,
  CheckIcon,
  TimesIcon,
} from '@finos/legend-art';
import type { LegendAIScopeItem } from '../LegendAITypes.js';

export const LegendAIScopeSelector = (props: {
  scopes: LegendAIScopeItem[];
  selectedScopes: LegendAIScopeItem[];
  onToggleScope: (scope: LegendAIScopeItem) => void;
  onRemoveScope: (scopeId: string) => void;
  hidePills?: boolean;
  hideSelector?: boolean;
}): React.ReactNode => {
  const {
    scopes,
    selectedScopes,
    onToggleScope,
    onRemoveScope,
    hidePills,
    hideSelector,
  } = props;
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const filteredScopes = useMemo(
    () =>
      searchText.trim()
        ? scopes.filter(
            (s) =>
              s.label.toLowerCase().includes(searchText.toLowerCase()) ||
              s.description?.toLowerCase().includes(searchText.toLowerCase()),
          )
        : scopes,
    [scopes, searchText],
  );

  const closeDropdown = useCallback((): void => {
    setDropdownOpen(false);
    setSearchText('');
    btnRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!dropdownOpen) {
      return undefined;
    }
    const handleClickOutside = (e: MouseEvent): void => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
        setSearchText('');
      }
    };
    const handleEscape = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        closeDropdown();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return (): void => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [dropdownOpen, closeDropdown]);

  useEffect(() => {
    if (dropdownOpen) {
      requestAnimationFrame(() => searchRef.current?.focus());
    }
  }, [dropdownOpen]);

  return (
    <>
      {!hidePills && selectedScopes.length > 0 && (
        <div className="legend-ai__scope-pills">
          {selectedScopes.map((scope) => (
            <span key={scope.id} className="legend-ai__scope-pill">
              <span className="legend-ai__scope-pill-label">{scope.label}</span>
              <button
                type="button"
                className="legend-ai__scope-pill-remove"
                aria-label={`Remove ${scope.label}`}
                onClick={(): void => onRemoveScope(scope.id)}
              >
                <TimesIcon />
              </button>
            </span>
          ))}
        </div>
      )}
      {!hideSelector && (
        <div className="legend-ai__scope-selector" ref={dropdownRef}>
          <button
            ref={btnRef}
            type="button"
            className="legend-ai__scope-btn"
            title="Add scope"
            aria-label="Add scope"
            aria-haspopup="true"
            aria-expanded={dropdownOpen}
            onClick={(): void => {
              if (dropdownOpen) {
                closeDropdown();
              } else {
                setDropdownOpen(true);
                setSearchText('');
              }
            }}
          >
            <PlusCircleIcon />
          </button>
          {dropdownOpen && (
            <div
              className="legend-ai__scope-dropdown"
              aria-multiselectable="true"
            >
              <div className="legend-ai__scope-dropdown-search">
                <SearchIcon />
                <input
                  ref={searchRef}
                  type="text"
                  className="legend-ai__scope-dropdown-search-input"
                  placeholder="Search scopes..."
                  value={searchText}
                  onChange={(e): void => setSearchText(e.target.value)}
                  onKeyDown={(e): void => {
                    if (e.key === 'Escape') {
                      e.stopPropagation();
                      closeDropdown();
                    }
                  }}
                />
              </div>
              <div className="legend-ai__scope-dropdown-list">
                {filteredScopes.length === 0 ? (
                  <div className="legend-ai__scope-dropdown-empty">
                    No matching scopes
                  </div>
                ) : (
                  filteredScopes.map((scope) => {
                    const isSelected = selectedScopes.some(
                      (s) => s.id === scope.id,
                    );
                    return (
                      <button
                        key={scope.id}
                        type="button"
                        aria-pressed={isSelected}
                        className={`legend-ai__scope-dropdown-item${isSelected ? 'legend-ai__scope-dropdown-item--selected' : ''}`}
                        onClick={(): void => {
                          onToggleScope(scope);
                          setDropdownOpen(false);
                          setSearchText('');
                        }}
                      >
                        <span className="legend-ai__scope-dropdown-item-check">
                          {isSelected && <CheckIcon />}
                        </span>
                        <span className="legend-ai__scope-dropdown-item-label">
                          {scope.label}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};
