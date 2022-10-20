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

import { useApplicationStore } from '@finos/legend-application';
import {
  type SelectComponent,
  BoltIcon,
  clsx,
  BlankPanelContent,
  TimesCircleIcon,
  PanelLoadingIndicator,
  CustomSelectorInput,
  SearchIcon,
  Dialog,
  TimesIcon,
  ArrowRightIcon,
} from '@finos/legend-art';
import { generateGAVCoordinates } from '@finos/legend-storage';
import { debounce } from '@finos/legend-shared';
import { flowResult } from 'mobx';
import { observer } from 'mobx-react-lite';
import { useEffect, useMemo, useRef, useState } from 'react';
import { DataSpaceViewer } from '../DataSpaceViewer.js';
import type { DataSpaceInfo } from '../../stores/query/DataSpaceInfo.js';
import type { DataSpaceAdvancedSearchState } from '../../stores/query/DataSpaceAdvancedSearchState.js';

type DataSpaceOption = { label: string; value: DataSpaceInfo };
const buildDataSpaceOption = (value: DataSpaceInfo): DataSpaceOption => ({
  label: value.title ?? value.name,
  value,
});

export const DataSpaceAdvancedSearchModal = observer(
  (props: {
    searchState: DataSpaceAdvancedSearchState;
    onClose: () => void;
  }) => {
    const { searchState, onClose } = props;
    const applicationStore = useApplicationStore();
    const dataSpaceSearchRef = useRef<SelectComponent>(null);
    const [searchText, setSearchText] = useState('');
    const handleEnter = (): void => dataSpaceSearchRef.current?.focus();
    const proceedToCreateQuery = (): void => {
      flowResult(searchState.proceedToCreateQuery()).catch(
        applicationStore.alertUnhandledError,
      );
    };

    const toggleGetSnapshot = (): void => {
      searchState.setToGetSnapShot(!searchState.toGetSnapShot);
      flowResult(searchState.loadDataSpaces(searchText)).catch(
        applicationStore.alertUnhandledError,
      );
    };

    // data space
    const dataSpaceOptions = searchState.dataSpaces.map(buildDataSpaceOption);
    const selectedDataSpaceOption = searchState.currentDataSpace
      ? buildDataSpaceOption(searchState.currentDataSpace)
      : null;
    const onDataSpaceOptionChange = (option: DataSpaceOption | null): void => {
      searchState.setCurrentDataSpace(option?.value);
      searchState.setDataSpaceViewerState(undefined);
    };
    const formatDataSpaceOptionLabel = (
      option: DataSpaceOption,
    ): React.ReactNode => (
      <div
        className="data-space-advanced-search__dialog__option"
        title={`${option.label} - ${
          option.value.path
        } - ${generateGAVCoordinates(
          option.value.groupId,
          option.value.artifactId,
          option.value.versionId,
        )}`}
      >
        <div className="data-space-advanced-search__dialog__option__label">
          {option.label}
        </div>
        <div className="data-space-advanced-search__dialog__option__path">
          {option.value.path}
        </div>
        <div className="data-space-advanced-search__dialog__option__gav">
          {generateGAVCoordinates(
            option.value.groupId,
            option.value.artifactId,
            option.value.versionId,
          )}
        </div>
      </div>
    );

    // search text
    const debouncedLoadDataSpaces = useMemo(
      () =>
        debounce((input: string): void => {
          flowResult(searchState.loadDataSpaces(input)).catch(
            applicationStore.alertUnhandledError,
          );
        }, 500),
      [applicationStore, searchState],
    );
    const onSearchTextChange = (value: string): void => {
      if (value !== searchText) {
        setSearchText(value);
        debouncedLoadDataSpaces.cancel();
        debouncedLoadDataSpaces(value);
      }
    };

    useEffect(() => {
      searchState.loadDataSpaces('');
      flowResult(searchState.loadDataSpaces('')).catch(
        applicationStore.alertUnhandledError,
      );
    }, [searchState, applicationStore]);

    useEffect(() => {
      if (searchState.currentDataSpace) {
        flowResult(
          searchState.loadDataSpace(searchState.currentDataSpace),
        ).catch(applicationStore.alertUnhandledError);
      }
    }, [searchState, applicationStore, searchState.currentDataSpace]);

    return (
      <Dialog
        open={true}
        onClose={onClose}
        classes={{
          root: 'editor-modal__root-container',
          container: 'editor-modal__container',
          paper:
            'editor-modal__content data-space-advanced-search__dialog__container__content',
        }}
        TransitionProps={{
          onEnter: handleEnter,
        }}
      >
        <div className="modal modal--dark editor-modal data-space-advanced-search__dialog">
          <div className="data-space-advanced-search__dialog__header modal__header">
            <div className="modal__title">Search for data space</div>
            <div className="modal__header__actions">
              <button
                className="modal__header__action"
                title="Close"
                onClick={onClose}
              >
                <TimesIcon />
              </button>
            </div>
          </div>
          <div className="data-space-advanced-search__dialog__content">
            <div className="data-space-advanced-search__dialog__input">
              <div className="data-space-advanced-search__dialog__input__icon">
                <SearchIcon />
              </div>
              <CustomSelectorInput
                ref={dataSpaceSearchRef}
                className="data-space-advanced-search__dialog__input__selector"
                options={dataSpaceOptions}
                isLoading={searchState.loadDataSpacesState.isInProgress}
                onInputChange={onSearchTextChange}
                inputValue={searchText}
                onChange={onDataSpaceOptionChange}
                value={selectedDataSpaceOption}
                placeholder="Search for data space by name..."
                isClearable={true}
                escapeClearsValue={true}
                darkMode={true}
                formatOptionLabel={formatDataSpaceOptionLabel}
              />
              <button
                className={clsx(
                  'data-space-advanced-search__dialog__input__use-snapshot-btn',
                  {
                    'data-space-advanced-search__dialog__input__use-snapshot-btn--active':
                      searchState.toGetSnapShot,
                  },
                )}
                tabIndex={-1}
                title={`[${
                  searchState.toGetSnapShot ? 'on' : 'off'
                }] Toggle show data spaces from snapshot releases instead of latest releases`}
                onClick={toggleGetSnapshot}
              >
                <BoltIcon />
              </button>
              <button
                className="data-space-advanced-search__dialog__input__proceed-btn"
                tabIndex={-1}
                title="Proceed to create query"
                onClick={proceedToCreateQuery}
              >
                <ArrowRightIcon />
              </button>
            </div>
            <div className="data-space-advanced-search__dialog__view">
              <PanelLoadingIndicator
                isLoading={searchState.loadDataSpaceState.isInProgress}
              />
              {searchState.dataSpaceViewerState && (
                <DataSpaceViewer
                  dataSpaceViewerState={searchState.dataSpaceViewerState}
                />
              )}
              {!searchState.dataSpaceViewerState && (
                <>
                  {searchState.loadDataSpaceState.isInProgress && (
                    <BlankPanelContent>
                      {searchState.loadDataSpaceState.message}
                    </BlankPanelContent>
                  )}
                  {searchState.loadDataSpaceState.hasFailed && (
                    <BlankPanelContent>
                      <div className="data-space-advanced-search__dialog__view--failed">
                        <div className="data-space-advanced-search__dialog__view--failed__icon">
                          <TimesCircleIcon />
                        </div>
                        <div className="data-space-advanced-search__dialog__view--failed__text">
                          Can&apos;t load data space
                        </div>
                      </div>
                    </BlankPanelContent>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </Dialog>
    );
  },
);
