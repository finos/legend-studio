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
  ArrowRightIcon,
  clsx,
  BlankPanelContent,
  TimesCircleIcon,
  PanelLoadingIndicator,
  ArrowLeftIcon,
  CustomSelectorInput,
  SearchIcon,
} from '@finos/legend-art';
import { useQuerySetupStore } from '@finos/legend-application-query';
import { generateGAVCoordinates } from '@finos/legend-storage';
import { debounce } from '@finos/legend-shared';
import { flowResult } from 'mobx';
import { observer } from 'mobx-react-lite';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { DataSpaceQuerySetupState } from '../../stores/query/DataSpaceQuerySetupState.js';
import { DataSpaceViewer } from '../DataSpaceViewer.js';
import type { DataSpaceInfo } from '../../stores/query/DataSpaceInfo.js';

type DataSpaceOption = { label: string; value: DataSpaceInfo };
const buildDataSpaceOption = (value: DataSpaceInfo): DataSpaceOption => ({
  label: value.title ?? value.name,
  value,
});

export const DataspaceQuerySetup = observer(
  (props: { querySetupState: DataSpaceQuerySetupState }) => {
    const { querySetupState } = props;
    const applicationStore = useApplicationStore();
    const setupStore = useQuerySetupStore();
    const dataSpaceSearchRef = useRef<SelectComponent>(null);
    const [searchText, setSearchText] = useState('');

    const toggleGetSnapshot = (): void => {
      querySetupState.setToGetSnapShot(!querySetupState.toGetSnapShot);
      flowResult(querySetupState.loadDataSpaces(searchText)).catch(
        applicationStore.alertUnhandledError,
      );
    };

    const next = (): void => {
      if (querySetupState.dataSpaceViewerState) {
        flowResult(querySetupState.proceedToCreateQuery()).catch(
          applicationStore.alertUnhandledError,
        );
      }
    };
    const canProceed = querySetupState.dataSpaceViewerState;

    const back = (): void => {
      setupStore.setSetupState(undefined);
    };

    // data space
    const dataSpaceOptions =
      querySetupState.dataSpaces.map(buildDataSpaceOption);
    const selectedDataSpaceOption = querySetupState.currentDataSpace
      ? buildDataSpaceOption(querySetupState.currentDataSpace)
      : null;
    const onDataSpaceOptionChange = (option: DataSpaceOption | null): void => {
      querySetupState.setCurrentDataSpace(option?.value);
      querySetupState.setDataSpaceViewerState(undefined);
    };
    const formatDataSpaceOptionLabel = (
      option: DataSpaceOption,
    ): React.ReactNode => (
      <div
        className="query-setup__data-space__option"
        title={`${option.label} - ${
          option.value.path
        } - ${generateGAVCoordinates(
          option.value.groupId,
          option.value.artifactId,
          option.value.versionId,
        )}`}
      >
        <div className="query-setup__data-space__option__label">
          {option.label}
        </div>
        <div className="query-setup__data-space__option__path">
          {option.value.path}
        </div>
        <div className="query-setup__data-space__option__gav">
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
          flowResult(querySetupState.loadDataSpaces(input)).catch(
            applicationStore.alertUnhandledError,
          );
        }, 500),
      [applicationStore, querySetupState],
    );
    const onSearchTextChange = (value: string): void => {
      if (value !== searchText) {
        setSearchText(value);
        debouncedLoadDataSpaces.cancel();
        debouncedLoadDataSpaces(value);
      }
    };

    useEffect(() => {
      flowResult(querySetupState.loadDataSpaces('')).catch(
        applicationStore.alertUnhandledError,
      );
    }, [querySetupState, applicationStore]);

    useEffect(() => {
      if (querySetupState.currentDataSpace) {
        flowResult(
          querySetupState.loadDataSpace(querySetupState.currentDataSpace),
        ).catch(applicationStore.alertUnhandledError);
      }
    }, [querySetupState, applicationStore, querySetupState.currentDataSpace]);

    useEffect(() => {
      dataSpaceSearchRef.current?.focus();
    }, []);

    return (
      <div className="query-setup__wizard query-setup__data-space">
        <div className="query-setup__wizard__header query-setup__data-space__header">
          <button
            className="query-setup__wizard__header__btn"
            onClick={back}
            title="Back to Main Menu"
          >
            <ArrowLeftIcon />
          </button>
          <div className="query-setup__wizard__header__title">
            Creating query from data space...
          </div>
          <button
            className={clsx('query-setup__wizard__header__btn', {
              'query-setup__wizard__header__btn--ready': canProceed,
            })}
            onClick={next}
            disabled={!canProceed}
            title="Create a new query"
          >
            <ArrowRightIcon />
          </button>
        </div>
        <div className="query-setup__wizard__content">
          <div className="query-setup__wizard__group query-setup__wizard__group--inline query-setup__data-space__input-group">
            <div className="query-setup__wizard__group__title">
              <SearchIcon />
            </div>
            <CustomSelectorInput
              ref={dataSpaceSearchRef}
              className="query-setup__wizard__selector"
              options={dataSpaceOptions}
              isLoading={querySetupState.loadDataSpacesState.isInProgress}
              onInputChange={onSearchTextChange}
              inputValue={searchText}
              onChange={onDataSpaceOptionChange}
              value={selectedDataSpaceOption}
              placeholder="Search for data space..."
              isClearable={true}
              escapeClearsValue={true}
              darkMode={true}
              formatOptionLabel={formatDataSpaceOptionLabel}
            />
            <button
              className={clsx('query-setup__data-space__use-snapshot-btn', {
                'query-setup__data-space__use-snapshot-btn--active':
                  querySetupState.toGetSnapShot,
              })}
              tabIndex={-1}
              title={`[${
                querySetupState.toGetSnapShot ? 'on' : 'off'
              }] Toggle show data spaces from snapshot releases instead of latest releases`}
              onClick={toggleGetSnapshot}
            >
              <BoltIcon />
            </button>
          </div>
          <div className="query-setup__data-space__view">
            <PanelLoadingIndicator
              isLoading={querySetupState.loadDataSpaceState.isInProgress}
            />
            {querySetupState.dataSpaceViewerState && (
              <DataSpaceViewer
                dataSpaceViewerState={querySetupState.dataSpaceViewerState}
              />
            )}
            {!querySetupState.dataSpaceViewerState && (
              <>
                {querySetupState.loadDataSpaceState.isInProgress && (
                  <BlankPanelContent>
                    {querySetupState.loadDataSpaceState.message}
                  </BlankPanelContent>
                )}
                {querySetupState.loadDataSpaceState.hasFailed && (
                  <BlankPanelContent>
                    <div className="query-setup__data-space__view--failed">
                      <div className="query-setup__data-space__view--failed__icon">
                        <TimesCircleIcon />
                      </div>
                      <div className="query-setup__data-space__view--failed__text">
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
    );
  },
);
