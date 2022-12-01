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
} from '../../../stores/models/SearchEntry.js';
import {
  FileCoordinate,
  trimPathLeadingSlash,
} from '../../../stores/models/PureFile.js';
import { flowResult } from 'mobx';
import {
  SearchResultState,
  UnmatchedFunctionExecutionResultState,
  UnmatchExecutionResultState,
  UsageResultState,
} from '../../../stores/SearchResultState.js';
import type {
  CandidateWithPackageImported,
  CandidateWithPackageNotImported,
} from '../../../stores/models/Execution.js';
import { getUsageConceptLabel } from '../../../stores/models/Usage.js';
import {
  ArrowCircleRightIcon,
  BlankPanelContent,
  FileAltIcon,
  PanelLoadingIndicator,
  PlusIcon,
  TimesIcon,
} from '@finos/legend-art';
import { useApplicationStore } from '@finos/legend-application';
import { useEditorStore } from '../EditorStoreProvider.js';

const SearchResultEntryDisplay = observer(
  (props: {
    searchState: SearchResultState;
    searchEntry: SearchResultEntry;
  }) => {
    const { searchState, searchEntry } = props;
    const editorStore = useEditorStore();
    const applicationStore = useApplicationStore();
    const goToResult =
      (coordinate: SearchResultCoordinate): (() => void) =>
      (): Promise<void> =>
        flowResult(
          editorStore.loadFile(
            searchEntry.sourceId,
            new FileCoordinate(
              searchEntry.sourceId,
              coordinate.startLine,
              coordinate.startColumn,
            ),
          ),
        ).catch(applicationStore.alertUnhandledError);
    const dismissResultForFile = (): void =>
      searchState.dismissSearchEntry(searchEntry);
    const dismissCoordinate =
      (coordinate: SearchResultCoordinate): (() => void) =>
      (): void => {
        searchEntry.dismissCoordinate(coordinate);
        if (!searchEntry.coordinates.length) {
          searchState.dismissSearchEntry(searchEntry);
        }
      };

    return (
      <div className="search-panel__entry">
        <div className="search-panel__entry__header">
          <div className="search-panel__entry__header__title">
            <div className="search-panel__entry__header__title__label">
              <FileAltIcon />
            </div>
            <div className="search-panel__entry__header__title__content">
              {trimPathLeadingSlash(searchEntry.sourceId)}
            </div>
          </div>
          <div className="search-panel__entry__header__actions">
            <div className="search-panel__entry__header__action search-panel__entry__header__action--with-counter">
              <div className="search-panel__entry__header__action__counter">
                {searchEntry.coordinates.length}
              </div>
            </div>
            <button
              className="search-panel__entry__header__action search-panel__entry__header__action--hidden"
              tabIndex={-1}
              title="Dismiss"
              onClick={dismissResultForFile}
            >
              <TimesIcon />
            </button>
          </div>
        </div>
        <div className="search-panel__entry__content">
          {searchEntry.coordinates.map((coordinate) => (
            <div
              key={coordinate.uuid}
              className="search-panel__entry__content__item"
            >
              <div
                className="search-panel__entry__content__item__label search-panel__entry__content__item__label--full"
                title="Go to Result"
                onClick={goToResult(coordinate)}
              >
                {`line: ${coordinate.startLine} - column: ${coordinate.startColumn}`}
              </div>
              <div className="search-panel__entry__content__item__actions">
                <button
                  className="search-panel__entry__content__item__action search-panel__entry__content__item__action--hidden"
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
      </div>
    );
  },
);

const SearchResultDisplay = observer(
  (props: { searchState: SearchResultState }) => {
    const { searchState } = props;
    const editorStore = useEditorStore();
    if (!searchState.searchEntries.length) {
      return (
        <BlankPanelContent>{`No occurrences found for '${editorStore.textSearchCommandState.text}'`}</BlankPanelContent>
      );
    }
    return (
      <div className="search-panel__content">
        <div className="search-panel__content__header">{`Showing ${searchState.numberOfResults} result(s) in ${searchState.numberOfFiles} files for '${editorStore.textSearchCommandState.text}'`}</div>
        {searchState.searchEntries.map((searchEntry) => (
          <SearchResultEntryDisplay
            key={searchEntry.uuid}
            searchState={searchState}
            searchEntry={searchEntry}
          />
        ))}
      </div>
    );
  },
);

const UsageResultDisplay = observer(
  (props: { usageState: UsageResultState }) => {
    const { usageState } = props;
    if (!usageState.searchEntries.length) {
      return (
        <BlankPanelContent>{`No usages found for ${getUsageConceptLabel(
          usageState.usageConcept,
        )}`}</BlankPanelContent>
      );
    }
    return (
      <div className="search-panel__content">
        <div className="search-panel__content__header">{`Showing ${
          usageState.numberOfResults
        } usages(s) in ${
          usageState.numberOfFiles
        } files for ${getUsageConceptLabel(usageState.usageConcept)}`}</div>
        {usageState.searchEntries.map((searchEntry) => (
          <SearchResultEntryDisplay
            key={searchEntry.uuid}
            searchState={usageState}
            searchEntry={searchEntry}
          />
        ))}
      </div>
    );
  },
);

const CandidateWithPackageImportedDisplay = observer(
  (props: { candidate: CandidateWithPackageImported }) => {
    const { candidate } = props;
    const editorStore = useEditorStore();
    const applicationStore = useApplicationStore();
    const goToResult = (): Promise<void> =>
      flowResult(
        editorStore.loadFile(
          candidate.sourceID,
          new FileCoordinate(
            candidate.sourceID,
            candidate.line,
            candidate.column,
          ),
        ),
      ).catch(applicationStore.alertUnhandledError);

    return (
      <div className="search-panel__entry__content__item">
        <div
          className="search-panel__entry__content__item__label__candidate"
          title="Go to Result"
          onClick={goToResult}
        >
          <div className="search-panel__entry__content__item__label__candidate-name">
            {candidate.foundName}
          </div>
          <div className="search-panel__entry__content__item__label__candidate-location">
            {`${trimPathLeadingSlash(candidate.sourceID)} [${candidate.line}:${
              candidate.column
            }]`}
          </div>
        </div>
        <div className="search-panel__entry__content__item__actions">
          <button
            className="search-panel__entry__content__item__action"
            tabIndex={-1}
            title="Go to Result"
            onClick={goToResult}
          >
            <ArrowCircleRightIcon />
          </button>
        </div>
      </div>
    );
  },
);

const CandidateWithPackageNotImportedDisplay = observer(
  (props: { candidate: CandidateWithPackageNotImported }) => {
    const { candidate } = props;
    const editorStore = useEditorStore();
    const applicationStore = useApplicationStore();
    const goToResult = (): Promise<void> =>
      flowResult(
        editorStore.loadFile(
          candidate.sourceID,
          new FileCoordinate(
            candidate.sourceID,
            candidate.line,
            candidate.column,
          ),
        ),
      ).catch(applicationStore.alertUnhandledError);
    const useCandidate = (): Promise<void> =>
      flowResult(
        editorStore.updateFileUsingSuggestionCandidate(candidate),
      ).catch(applicationStore.alertUnhandledError);

    return (
      <div className="search-panel__entry__content__item">
        <div
          className="search-panel__entry__content__item__label__candidate"
          title="Add Suggested Import"
          onClick={useCandidate}
        >
          <div className="search-panel__entry__content__item__label__candidate-name">
            {candidate.foundName}
          </div>
          <div className="search-panel__entry__content__item__label__candidate-location">
            {`${trimPathLeadingSlash(candidate.sourceID)} [${candidate.line}:${
              candidate.column
            }]`}
          </div>
        </div>
        <div className="search-panel__entry__content__item__actions">
          <button
            className="search-panel__entry__content__item__action"
            tabIndex={-1}
            title="Go to Result"
            onClick={goToResult}
          >
            <ArrowCircleRightIcon />
          </button>
        </div>
      </div>
    );
  },
);

const UnmatchedFunctionExecutionResultDisplay = observer(
  (props: { searchState: UnmatchedFunctionExecutionResultState }) => {
    const { searchState } = props;
    const result = searchState.result;

    return (
      <div className="search-panel__content">
        {!result.candidatesWithPackageImported.length && (
          <div className="search-panel__content__header">{`No functions, in packages already imported, match the function '${result.candidateName}'`}</div>
        )}
        {Boolean(result.candidatesWithPackageImported.length) && (
          <>
            <div className="search-panel__content__header">
              {`These functions, in packages already imported, would match the function '${result.candidateName}' if you changed the parameters`}
            </div>
            <div className="search-panel__entry">
              {result.candidatesWithPackageImported.map((candidate) => (
                <CandidateWithPackageImportedDisplay
                  key={candidate.uuid}
                  candidate={candidate}
                />
              ))}
            </div>
          </>
        )}
        {!result.candidatesWithPackageNotImported.length && (
          <div className="search-panel__content__header">{`No functions, in packages not imported, match the function '${result.candidateName}'`}</div>
        )}
        {Boolean(result.candidatesWithPackageNotImported.length) && (
          <>
            <div className="search-panel__content__header">
              {`These functions, in packages not imported, match the function '${result.candidateName}'. Click on result to import the necessary package`}
            </div>
            <div className="search-panel__entry">
              {result.candidatesWithPackageNotImported.map((candidate) => (
                <CandidateWithPackageNotImportedDisplay
                  key={candidate.uuid}
                  candidate={candidate}
                />
              ))}
            </div>
          </>
        )}
      </div>
    );
  },
);

const UnmatchExecutionResultDisplay = observer(
  (props: { searchState: UnmatchExecutionResultState }) => {
    const { searchState } = props;
    const result = searchState.result;

    return (
      <div className="search-panel__content">
        {!result.candidates.length && (
          <div className="search-panel__content__header">{`No possible matches found for '${result.candidateName}'`}</div>
        )}
        {Boolean(result.candidates.length) && (
          <>
            <div className="search-panel__content__header">
              {`Found possible matches for '${result.candidateName}'. Click on result to import the necessary package`}
            </div>
            <div className="search-panel__entry">
              {result.candidates.map((candidate) => (
                <CandidateWithPackageNotImportedDisplay
                  key={candidate.uuid}
                  candidate={candidate}
                />
              ))}
            </div>
          </>
        )}
      </div>
    );
  },
);

export const SearchPanel = observer(() => {
  const editorStore = useEditorStore();
  return (
    <div className="search-panel">
      <PanelLoadingIndicator
        isLoading={editorStore.textSearchCommandLoadingState.isInProgress}
      />
      {!editorStore.searchState && (
        <BlankPanelContent>
          <div className="auxiliary-panel__splash-screen">
            <div className="auxiliary-panel__splash-screen__content">
              <div className="auxiliary-panel__splash-screen__content__item">
                <div className="auxiliary-panel__splash-screen__content__item__label">
                  Search something
                </div>
                <div className="auxiliary-panel__splash-screen__content__item__hot-keys">
                  <div className="hotkey__key">Ctrl</div>
                  <div className="hotkey__plus">
                    <PlusIcon />
                  </div>
                  <div className="hotkey__key">Shift</div>
                  <div className="hotkey__plus">
                    <PlusIcon />
                  </div>
                  <div className="hotkey__key">F</div>
                </div>
              </div>
            </div>
          </div>
        </BlankPanelContent>
      )}
      {editorStore.searchState instanceof UsageResultState && (
        <UsageResultDisplay usageState={editorStore.searchState} />
      )}
      {editorStore.searchState instanceof SearchResultState && (
        <SearchResultDisplay searchState={editorStore.searchState} />
      )}
      {editorStore.searchState instanceof
        UnmatchedFunctionExecutionResultState && (
        <UnmatchedFunctionExecutionResultDisplay
          searchState={editorStore.searchState}
        />
      )}
      {editorStore.searchState instanceof UnmatchExecutionResultState && (
        <UnmatchExecutionResultDisplay searchState={editorStore.searchState} />
      )}
    </div>
  );
});
