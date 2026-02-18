/**
 * Copyright (c) 2020-present, Goldman Sachs
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

import { type JSX, useState, useMemo, useCallback, useEffect } from 'react';
import {
  Autocomplete,
  Box,
  CircularProgress,
  FormControlLabel,
  IconButton,
  InputAdornment,
  Menu,
  MenuItem,
  Switch,
  TextField,
  Typography,
  type TextFieldProps,
} from '@mui/material';
import { clsx, SearchIcon, TuneIcon } from '@finos/legend-art';
import { observer } from 'mobx-react-lite';
import { LegendMarketplaceInfoTooltip } from '../InfoTooltip/LegendMarketplaceInfoTooltip.js';
import { LegendMarketplaceTelemetryHelper } from '../../__lib__/LegendMarketplaceTelemetryHelper.js';
import { useLegendMarketplaceBaseStore } from '../../application/providers/LegendMarketplaceFrameworkProvider.js';
import {
  createDefaultSuggestions,
  createAutosuggestSuggestions,
  createSearchQuerySuggestion,
  createLoadingSuggestion,
  SearchSuggestionType,
  SEARCH_SUGGESTION_CONSTANTS,
  type SearchSuggestion,
} from '../../utils/SearchSuggestions.js';
import {
  debounce,
  type DebouncedFunc,
  assertErrorThrown,
  LogEvent,
} from '@finos/legend-shared';
import { APPLICATION_EVENT } from '@finos/legend-application';
import {
  generatePathForDataProductSearchResult,
  convertAutosuggestResultToSearchResult,
} from '../../utils/SearchUtils.js';

export interface Vendor {
  provider: string;
  description: string;
  type: string;
}

export const LegendMarketplaceSearchBar = observer(
  (props: {
    onSearch?: (query: string | undefined, useProducerSearch: boolean) => void;
    stateSearchQuery?: string | undefined;
    placeholder?: string;
    onChange?: (query: string) => void;
    className?: string | undefined;
    showSettings?: boolean;
    stateUseProducerSearch?: boolean | undefined;
    enableAutosuggest?: boolean;
  }): JSX.Element => {
    const {
      onSearch,
      stateSearchQuery,
      placeholder,
      onChange,
      className,
      showSettings,
      stateUseProducerSearch,
      enableAutosuggest = true,
    } = props;

    const legendMarketplaceBaseStore = useLegendMarketplaceBaseStore();
    const applicationStore = legendMarketplaceBaseStore.applicationStore;

    const [searchQuery, setSearchQuery] = useState<string>(
      stateSearchQuery ?? '',
    );
    const [useProducerSearch, setUseProducerSearch] = useState(
      stateUseProducerSearch ?? false,
    );
    const [searchMenuAnchorEl, setSearchMenuAnchorEl] =
      useState<HTMLElement | null>();
    const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
    const [loadingSuggestions, setLoadingSuggestions] = useState(false);
    const [isAutosuggestPopupOpen, setIsAutosuggestPopupOpen] = useState(false);

    const searchMenuOpen = Boolean(searchMenuAnchorEl);

    const defaultSuggestionsFromConfig =
      applicationStore.config.options.defaultSearchSuggestions;

    const fetchAutosuggestions = useCallback(
      async (query: string, signal?: AbortSignal): Promise<void> => {
        if (!enableAutosuggest) {
          return;
        }

        try {
          const response =
            await legendMarketplaceBaseStore.marketplaceServerClient.getAutosuggestions(
              query,
              legendMarketplaceBaseStore.envState.lakehouseEnvironment,
              SEARCH_SUGGESTION_CONSTANTS.AUTOSUGGEST_LIMIT,
              signal,
            );

          const autosuggestResults = response.results;
          const userQuerySuggestion = createSearchQuerySuggestion(query);

          if (autosuggestResults.length > 0) {
            setSuggestions([
              userQuerySuggestion,
              ...createAutosuggestSuggestions(autosuggestResults),
            ]);
          } else {
            setSuggestions([userQuerySuggestion]);
          }
        } catch (error) {
          assertErrorThrown(error);
          if (error.name === 'AbortError') {
            return;
          }
          applicationStore.logService.error(
            LogEvent.create(APPLICATION_EVENT.GENERIC_FAILURE),
            error,
          );
          const fallbackQuerySuggestion = createSearchQuerySuggestion(query);
          setSuggestions([fallbackQuerySuggestion]);
        } finally {
          if (!signal?.aborted) {
            setLoadingSuggestions(false);
          }
        }
      },
      [
        enableAutosuggest,
        legendMarketplaceBaseStore.marketplaceServerClient,
        legendMarketplaceBaseStore.envState.lakehouseEnvironment,
        applicationStore.logService,
      ],
    );

    const debouncedFetchAutosuggestions: DebouncedFunc<
      typeof fetchAutosuggestions
    > = useMemo(
      () =>
        debounce(
          fetchAutosuggestions,
          SEARCH_SUGGESTION_CONSTANTS.AUTOSUGGEST_DEBOUNCE_DELAY,
        ),
      [fetchAutosuggestions],
    );

    // Cleanup debounced function on unmount
    useEffect(() => {
      return () => {
        debouncedFetchAutosuggestions.cancel();
      };
    }, [debouncedFetchAutosuggestions]);

    // Ensure component's state is in sync with external state
    useEffect(() => {
      setSearchQuery(stateSearchQuery ?? '');
    }, [stateSearchQuery]);

    useEffect(() => {
      setUseProducerSearch(stateUseProducerSearch ?? false);
    }, [stateUseProducerSearch]);

    useEffect(() => {
      const abortController = new AbortController();

      if (isAutosuggestPopupOpen) {
        if (!searchQuery || searchQuery.trim().length === 0) {
          setSuggestions(
            createDefaultSuggestions(defaultSuggestionsFromConfig),
          );
          setLoadingSuggestions(false);
        } else {
          const userQuerySuggestion = createSearchQuerySuggestion(searchQuery);
          const loadingIndicator = createLoadingSuggestion();
          setSuggestions([userQuerySuggestion, loadingIndicator]);
          setLoadingSuggestions(true);

          // eslint-disable-next-line no-void
          void debouncedFetchAutosuggestions(
            searchQuery,
            abortController.signal,
          );
        }
      }

      return () => {
        abortController.abort();
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchQuery, isAutosuggestPopupOpen, debouncedFetchAutosuggestions]);
    const handleInputChange = (
      _event: React.SyntheticEvent,
      newInputValue: string,
    ): void => {
      setSearchQuery(newInputValue);
      onChange?.(newInputValue);
    };

    const handleSuggestionSelection = (
      _event: React.SyntheticEvent,
      selectedSuggestion: SearchSuggestion | string | null,
    ): void => {
      if (!selectedSuggestion) {
        return;
      }

      if (typeof selectedSuggestion === 'string') {
        setSearchQuery(selectedSuggestion);
        return;
      }

      if (selectedSuggestion.type === SearchSuggestionType.LOADING) {
        return;
      }

      const selectedQuery = selectedSuggestion.query;
      setSearchQuery(selectedQuery);

      if (
        selectedSuggestion.type === SearchSuggestionType.SEARCH_QUERY ||
        selectedSuggestion.type === SearchSuggestionType.DEFAULT
      ) {
        onSearch?.(selectedQuery, useProducerSearch);
        LegendMarketplaceTelemetryHelper.logEvent_SearchAutosuggestSelection(
          applicationStore.telemetryService,
          selectedQuery,
          selectedSuggestion.type,
        );
      } else {
        const autosuggestResult = selectedSuggestion.autosuggestResult;
        if (autosuggestResult) {
          const searchResult =
            convertAutosuggestResultToSearchResult(autosuggestResult);
          const dataProductViewerPath =
            generatePathForDataProductSearchResult(searchResult);

          if (dataProductViewerPath) {
            applicationStore.navigationService.navigator.visitAddress(
              applicationStore.navigationService.navigator.generateAddress(
                dataProductViewerPath,
              ),
            );
          }

          LegendMarketplaceTelemetryHelper.logEvent_SearchAutosuggestSelection(
            applicationStore.telemetryService,
            selectedQuery,
            selectedSuggestion.type,
          );
        }
      }
    };

    const handleSubmit = (event: React.FormEvent): void => {
      event.preventDefault();
      onSearch?.(searchQuery, useProducerSearch);
    };

    const getOptionLabel = (option: SearchSuggestion | string): string =>
      typeof option === 'string' ? option : option.query;

    const filterOptions = (options: SearchSuggestion[]): SearchSuggestion[] => {
      return options;
    };

    const getGroupLabel = (option: SearchSuggestion | string): string => {
      if (typeof option === 'string') {
        return '';
      }
      if (
        option.type === SearchSuggestionType.SEARCH_QUERY ||
        option.type === SearchSuggestionType.LOADING
      ) {
        return '';
      }
      return option.type === SearchSuggestionType.DEFAULT
        ? SEARCH_SUGGESTION_CONSTANTS.GROUP_HEADER_SUGGESTED_SEARCHES
        : SEARCH_SUGGESTION_CONSTANTS.GROUP_HEADER_DATA_PRODUCTS;
    };

    return (
      <form
        className={clsx('legend-marketplace__search-bar', className)}
        onSubmit={handleSubmit}
      >
        <Autocomplete
          freeSolo={true}
          fullWidth={true}
          open={enableAutosuggest ? isAutosuggestPopupOpen : false}
          onOpen={() => {
            if (enableAutosuggest) {
              setIsAutosuggestPopupOpen(true);
            }
          }}
          onClose={() => {
            setIsAutosuggestPopupOpen(false);
          }}
          value={null}
          inputValue={searchQuery}
          onInputChange={handleInputChange}
          onChange={handleSuggestionSelection}
          options={suggestions}
          filterOptions={filterOptions}
          getOptionLabel={getOptionLabel}
          groupBy={getGroupLabel}
          slotProps={{
            popper: {
              className: 'legend-marketplace__search-bar__dropdown',
              modifiers: [
                {
                  name: 'offset',
                  options: {
                    offset: [0, 4],
                  },
                },
                {
                  name: 'sameWidth',
                  enabled: true,
                  phase: 'beforeWrite',
                  requires: ['computeStyles'],
                  fn: ({ state }) => {
                    if (state.styles.popper) {
                      state.styles.popper.width = `${state.rects.reference.width}px`;
                    }
                  },
                  effect: ({ state }) => {
                    const referenceWidth = (
                      state.elements.reference as HTMLElement
                    ).offsetWidth;
                    state.elements.popper.style.width = `${referenceWidth}px`;
                  },
                },
              ],
              placement: 'bottom-start',
            },
          }}
          renderGroup={(params) => (
            <Box key={params.key}>
              {params.group ===
                SEARCH_SUGGESTION_CONSTANTS.GROUP_HEADER_DATA_PRODUCTS && (
                <div className="legend-marketplace__search-bar__section-divider" />
              )}
              {params.group && (
                <Typography className="legend-marketplace__search-bar__autocomplete-group-header">
                  {params.group}
                </Typography>
              )}
              {params.children}
            </Box>
          )}
          renderOption={(params, suggestionOption) => {
            if (typeof suggestionOption === 'string') {
              return (
                <Box component="li" {...params} key={suggestionOption}>
                  <Typography className="legend-marketplace__search-bar__autocomplete-option__text">
                    {suggestionOption}
                  </Typography>
                </Box>
              );
            }

            if (suggestionOption.type === SearchSuggestionType.SEARCH_QUERY) {
              return (
                <Box
                  component="li"
                  {...params}
                  key={suggestionOption.query}
                  className="legend-marketplace__search-bar__autocomplete-option"
                >
                  <div className="legend-marketplace__search-bar__autocomplete-option__search-query">
                    <SearchIcon className="legend-marketplace__search-bar__autocomplete-option__search-icon" />
                    <Typography className="legend-marketplace__search-bar__autocomplete-option__text">
                      {suggestionOption.query}
                    </Typography>
                  </div>
                </Box>
              );
            }

            if (suggestionOption.type === SearchSuggestionType.LOADING) {
              return (
                <Box
                  component="li"
                  {...params}
                  key={SEARCH_SUGGESTION_CONSTANTS.LOADING_KEY}
                  className="legend-marketplace__search-bar__autocomplete-option legend-marketplace__search-bar__autocomplete-option--loading"
                  style={{ cursor: 'default' }}
                >
                  <div className="legend-marketplace__search-bar__autocomplete-option__loading">
                    <CircularProgress
                      size={16}
                      sx={{ color: 'var(--marketplace-text-secondary)' }}
                    />
                    <Typography
                      className="legend-marketplace__search-bar__autocomplete-option__text"
                      sx={{ color: 'var(--marketplace-text-secondary)' }}
                    >
                      {suggestionOption.query}
                    </Typography>
                  </div>
                </Box>
              );
            }

            if (suggestionOption.type === SearchSuggestionType.DEFAULT) {
              return (
                <Box
                  component="li"
                  {...params}
                  key={suggestionOption.query}
                  className="legend-marketplace__search-bar__autocomplete-option"
                >
                  <Typography className="legend-marketplace__search-bar__autocomplete-option__text">
                    {suggestionOption.query}
                  </Typography>
                </Box>
              );
            }

            const autosuggestResult = suggestionOption.autosuggestResult;
            if (!autosuggestResult) {
              return null;
            }

            const dataProductName = autosuggestResult.dataProductName;
            const dataProductDescription =
              autosuggestResult.dataProductDescription;

            return (
              <Box
                component="li"
                {...params}
                key={dataProductName}
                className="legend-marketplace__search-bar__autocomplete-option"
              >
                <div className="legend-marketplace__search-bar__autocomplete-option__data-product">
                  <div className="legend-marketplace__search-bar__autocomplete-option__name">
                    {dataProductName}
                  </div>
                  {dataProductDescription && (
                    <div className="legend-marketplace__search-bar__autocomplete-option__description">
                      {dataProductDescription}
                    </div>
                  )}
                </div>
              </Box>
            );
          }}
          renderInput={(params) => (
            <TextField
              {...(params as TextFieldProps)}
              className="legend-marketplace__search-bar__text-field"
              placeholder={
                placeholder ?? SEARCH_SUGGESTION_CONSTANTS.DEFAULT_PLACEHOLDER
              }
              fullWidth={true}
              slotProps={{
                input: {
                  ...params.InputProps,
                  className: 'legend-marketplace__search-bar__input',
                  endAdornment: (
                    <>
                      {loadingSuggestions && (
                        <CircularProgress color="inherit" size={28} />
                      )}
                      {params.InputProps.endAdornment}
                      <InputAdornment position="end">
                        {showSettings && (
                          <IconButton
                            onClick={(event) =>
                              setSearchMenuAnchorEl(event.currentTarget)
                            }
                            title="Search settings"
                            className="legend-marketplace__search-bar__settings-icon"
                          >
                            <TuneIcon />
                          </IconButton>
                        )}
                        <IconButton
                          type="submit"
                          title="Search"
                          className="legend-marketplace__search-bar__search-icon"
                        >
                          <SearchIcon />
                        </IconButton>
                      </InputAdornment>
                    </>
                  ),
                },
              }}
            />
          )}
        />
        {showSettings && (
          <Menu
            anchorEl={searchMenuAnchorEl}
            open={searchMenuOpen}
            onClose={() => setSearchMenuAnchorEl(null)}
          >
            <MenuItem>
              <FormControlLabel
                control={
                  <Switch
                    checked={useProducerSearch}
                    onChange={(event) => {
                      setUseProducerSearch(event.target.checked);
                      LegendMarketplaceTelemetryHelper.logEvent_ToggleProducerSearch(
                        applicationStore.telemetryService,
                        event.target.checked,
                      );
                    }}
                  />
                }
                label={
                  <>
                    Producer Search{' '}
                    <LegendMarketplaceInfoTooltip title="Use this search if you have just created a data product and would like to immediately see it" />
                  </>
                }
              />
            </MenuItem>
          </Menu>
        )}
      </form>
    );
  },
);
