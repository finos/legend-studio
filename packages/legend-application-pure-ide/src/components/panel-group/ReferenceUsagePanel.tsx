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

import { observer } from 'mobx-react-lite';
import type {
  SearchResultCoordinate,
  SearchResultEntry,
} from '../../server/models/SearchEntry.js';
import {
  FileCoordinate,
  trimPathLeadingSlash,
} from '../../server/models/File.js';
import { flowResult } from 'mobx';
import { getConceptInfoLabel } from '../../server/models/Usage.js';
import {
  BlankPanelContent,
  ChevronDownIcon,
  ChevronRightIcon,
  CloseIcon,
  CollapseTreeIcon,
  ExpandTreeIcon,
  FileAltIcon,
  PanelLoadingIndicator,
  PlusIcon,
  RefreshIcon,
  TimesIcon,
} from '@finos/legend-art';
import { useApplicationStore } from '@finos/legend-application';
import { usePureIDEStore } from '../PureIDEStoreProvider.js';
import type { ReferenceUsageResult } from '../../stores/ReferenceUsageResult.js';

const ReferenceUsageSearchResultEntryDisplay = observer(
  (props: {
    referenceUsageResult: ReferenceUsageResult;
    result: SearchResultEntry;
  }) => {
    const { referenceUsageResult, result } = props;
    const ideStore = usePureIDEStore();
    const applicationStore = useApplicationStore();
    const goToResult =
      (coordinate: SearchResultCoordinate): (() => void) =>
      (): Promise<void> =>
        flowResult(
          ideStore.loadFile(
            result.sourceId,
            new FileCoordinate(
              result.sourceId,
              coordinate.startLine,
              coordinate.startColumn,
            ),
          ),
        ).catch(applicationStore.alertUnhandledError);
    const dismissResultForFile = (): void =>
      referenceUsageResult.dismissSearchEntry(result);
    const dismissCoordinate =
      (coordinate: SearchResultCoordinate): (() => void) =>
      (): void => {
        result.dismissCoordinate(coordinate);
        if (!result.coordinates.length) {
          referenceUsageResult.dismissSearchEntry(result);
        }
      };

    return (
      <div className="references-panel__entry">
        <div
          className="references-panel__entry__header"
          onClick={() => result.setIsExpanded(!result.isExpanded)}
        >
          <div className="references-panel__entry__header__title">
            <div className="references-panel__entry__header__title__expander">
              {result.isExpanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
            </div>
            <div className="references-panel__entry__header__title__label">
              <FileAltIcon />
            </div>
            <div className="references-panel__entry__header__title__content">
              {trimPathLeadingSlash(result.sourceId)}
            </div>
          </div>
          <div className="references-panel__entry__header__actions">
            <div className="references-panel__entry__header__action references-panel__entry__header__action--with-counter">
              <div className="references-panel__entry__header__action__counter">
                {result.coordinates.length}
              </div>
            </div>
            <button
              className="references-panel__entry__header__action references-panel__entry__header__action--hidden"
              tabIndex={-1}
              title="Dismiss"
              onClick={dismissResultForFile}
            >
              <TimesIcon />
            </button>
          </div>
        </div>
        {result.isExpanded && (
          <div className="references-panel__entry__content">
            {result.coordinates.map((coordinate) => (
              <div
                key={coordinate.uuid}
                className="references-panel__entry__content__item"
              >
                <div
                  className="references-panel__entry__content__item__label references-panel__entry__content__item__label--full"
                  title={
                    coordinate.preview
                      ? `${
                          coordinate.preview.before
                        }${coordinate.preview.found.replaceAll(
                          /\n/g,
                          '\u21B5',
                        )}${coordinate.preview.after}`
                      : 'Go To Result'
                  }
                  onClick={goToResult(coordinate)}
                >
                  {coordinate.preview && (
                    <div className="references-panel__entry__content__item__label__content">
                      <div className="references-panel__entry__content__item__label__coordinates">
                        {`[${coordinate.startLine}:${coordinate.startColumn}]`}
                      </div>
                      <div className="references-panel__entry__content__item__label__preview">
                        <span className="references-panel__entry__content__item__label__preview__text">
                          {coordinate.preview.before}
                        </span>
                        <span className="references-panel__entry__content__item__label__preview__text references-panel__entry__content__item__label__preview__text--found">
                          {coordinate.preview.found.replaceAll(/\n/g, '\u21B5')}
                        </span>
                        <span className="references-panel__entry__content__item__label__preview__text">
                          {coordinate.preview.after}
                        </span>
                      </div>
                    </div>
                  )}
                  {!coordinate.preview && (
                    <>
                      {`line: ${coordinate.startLine} - column: ${coordinate.startColumn}`}
                    </>
                  )}
                </div>
                <div className="references-panel__entry__content__item__actions">
                  <button
                    className="references-panel__entry__content__item__action references-panel__entry__content__item__action--hidden"
                    tabIndex={-1}
                    title="Dismiss"
                    onClick={dismissCoordinate(coordinate)}
                  >
                    <TimesIcon />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  },
);

const UsageResultDisplay = observer(
  (props: { referenceUsageState: ReferenceUsageResult }) => {
    const { referenceUsageState } = props;
    const ideStore = usePureIDEStore();
    const applicationStore = useApplicationStore();
    const showExpandAction = referenceUsageState.searchEntries.some(
      (entry) => !entry.isExpanded,
    );
    const refresh = (): void => {
      flowResult(ideStore.findUsages(referenceUsageState.usageConcept)).catch(
        applicationStore.alertUnhandledError,
      );
    };
    const clear = (): void => ideStore.setReferenceUsageResult(undefined);
    const expandAll = (): void => {
      referenceUsageState.searchEntries.forEach((entry) =>
        entry.setIsExpanded(true),
      );
    };
    const collapseAll = (): void => {
      referenceUsageState.searchEntries.forEach((entry) =>
        entry.setIsExpanded(false),
      );
    };

    return (
      <div className="references-panel__content">
        <div className="references-panel__content__header">
          <div className="references-panel__content__header__title">
            {!referenceUsageState.searchEntries.length
              ? `No usages found for ${getConceptInfoLabel(
                  referenceUsageState.usageConcept,
                )}`
              : `${referenceUsageState.numberOfResults} usages(s) in ${
                  referenceUsageState.numberOfFiles
                } files for ${getConceptInfoLabel(
                  referenceUsageState.usageConcept,
                )}`}
          </div>
          <div className="references-panel__content__header__actions">
            <button
              className="references-panel__content__header__action"
              tabIndex={-1}
              title="Refresh"
              onClick={refresh}
            >
              <RefreshIcon />
            </button>
            <button
              className="references-panel__content__header__action"
              tabIndex={-1}
              title="Clear"
              onClick={clear}
            >
              <CloseIcon />
            </button>
            {!showExpandAction && (
              <button
                className="references-panel__content__header__action"
                tabIndex={-1}
                title="Collapse All"
                onClick={collapseAll}
              >
                <CollapseTreeIcon />
              </button>
            )}
            {showExpandAction && (
              <button
                className="references-panel__content__header__action"
                tabIndex={-1}
                title="Expand All"
                onClick={expandAll}
              >
                <ExpandTreeIcon />
              </button>
            )}
          </div>
        </div>
        <div className="references-panel__content__results">
          {referenceUsageState.searchEntries.map((searchEntry) => (
            <ReferenceUsageSearchResultEntryDisplay
              key={searchEntry.uuid}
              referenceUsageResult={referenceUsageState}
              result={searchEntry}
            />
          ))}
        </div>
      </div>
    );
  },
);

export const ReferenceUsagePanel = observer(() => {
  const ideStore = usePureIDEStore();

  return (
    <div className="references-panel">
      <PanelLoadingIndicator
        isLoading={ideStore.referenceUsageLoadState.isInProgress}
      />
      {!ideStore.referenceUsageResult && (
        <BlankPanelContent>
          <div className="panel-group__splash-screen">
            <div className="panel-group__splash-screen__content">
              <div className="panel-group__splash-screen__content__item">
                <div className="panel-group__splash-screen__content__item__label">
                  Find Concept References
                </div>
                <div className="panel-group__splash-screen__content__item__hot-keys">
                  <div className="hotkey__key">Alt</div>
                  <div className="hotkey__plus">
                    <PlusIcon />
                  </div>
                  <div className="hotkey__key">F7</div>
                </div>
              </div>
            </div>
          </div>
        </BlankPanelContent>
      )}
      {ideStore.referenceUsageResult && (
        <UsageResultDisplay
          referenceUsageState={ideStore.referenceUsageResult}
        />
      )}
    </div>
  );
});
