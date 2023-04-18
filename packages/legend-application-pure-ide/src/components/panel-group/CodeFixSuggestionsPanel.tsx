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
import {
  FileCoordinate,
  trimPathLeadingSlash,
} from '../../server/models/File.js';
import { flowResult } from 'mobx';
import type {
  CandidateWithPackageImported,
  CandidateWithPackageNotImported,
} from '../../server/models/Execution.js';
import { ArrowCircleRightIcon } from '@finos/legend-art';
import { useApplicationStore } from '@finos/legend-application';
import { usePureIDEStore } from '../PureIDEStoreProvider.js';
import {
  UnknownSymbolCodeFixSuggestion,
  UnmatchedFunctionCodeFixSuggestion,
} from '../../stores/CodeFixSuggestion.js';

const CandidateWithPackageImportedDisplay = observer(
  (props: { candidate: CandidateWithPackageImported }) => {
    const { candidate } = props;
    const ideStore = usePureIDEStore();
    const applicationStore = useApplicationStore();
    const goToResult = (): void => {
      flowResult(
        ideStore.loadFile(
          candidate.sourceID,
          new FileCoordinate(
            candidate.sourceID,
            candidate.line,
            candidate.column,
          ),
        ),
      ).catch(applicationStore.alertUnhandledError);
    };

    return (
      <div className="suggestions-panel__entry__content__item">
        <div
          className="suggestions-panel__entry__content__item__label__candidate"
          title="Go to Result"
          onClick={goToResult}
        >
          <div className="suggestions-panel__entry__content__item__label__candidate-name">
            {candidate.foundName}
          </div>
          <div className="suggestions-panel__entry__content__item__label__candidate-location">
            {`${trimPathLeadingSlash(candidate.sourceID)} [${candidate.line}:${
              candidate.column
            }]`}
          </div>
        </div>
        <div className="suggestions-panel__entry__content__item__actions">
          <button
            className="suggestions-panel__entry__content__item__action"
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
    const ideStore = usePureIDEStore();
    const applicationStore = useApplicationStore();
    const goToResult = (): void => {
      flowResult(
        ideStore.loadFile(
          candidate.sourceID,
          new FileCoordinate(
            candidate.sourceID,
            candidate.line,
            candidate.column,
          ),
        ),
      ).catch(applicationStore.alertUnhandledError);
    };
    const useCandidate = (): void => {
      flowResult(ideStore.updateFileUsingSuggestionCandidate(candidate)).catch(
        applicationStore.alertUnhandledError,
      );
    };

    return (
      <div className="suggestions-panel__entry__content__item">
        <div
          className="suggestions-panel__entry__content__item__label__candidate"
          title="Add Suggested Import"
          onClick={useCandidate}
        >
          <div className="suggestions-panel__entry__content__item__label__candidate-name">
            {candidate.foundName}
          </div>
          <div className="suggestions-panel__entry__content__item__label__candidate-location">
            {`${trimPathLeadingSlash(candidate.sourceID)} [${candidate.line}:${
              candidate.column
            }]`}
          </div>
        </div>
        <div className="suggestions-panel__entry__content__item__actions">
          <button
            className="suggestions-panel__entry__content__item__action"
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
  (props: { suggestionState: UnmatchedFunctionCodeFixSuggestion }) => {
    const { suggestionState } = props;
    const result = suggestionState.result;

    return (
      <div className="suggestions-panel__content">
        {!result.candidatesWithPackageImported.length && (
          <div className="suggestions-panel__content__header">{`No functions, in packages already imported, match the function '${result.candidateName}'`}</div>
        )}
        {Boolean(result.candidatesWithPackageImported.length) && (
          <>
            <div className="suggestions-panel__content__header">
              {`These functions, in packages already imported, would match the function '${result.candidateName}' if you changed the parameters`}
            </div>
            <div className="suggestions-panel__entry">
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
          <div className="suggestions-panel__content__header">{`No functions, in packages not imported, match the function '${result.candidateName}'`}</div>
        )}
        {Boolean(result.candidatesWithPackageNotImported.length) && (
          <>
            <div className="suggestions-panel__content__header">
              {`These functions, in packages not imported, match the function '${result.candidateName}'. Click on result to import the necessary package`}
            </div>
            <div className="suggestions-panel__entry">
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
  (props: { suggestionState: UnknownSymbolCodeFixSuggestion }) => {
    const { suggestionState } = props;
    const result = suggestionState.result;

    return (
      <div className="suggestions-panel__content">
        {!result.candidates.length && (
          <div className="suggestions-panel__content__header">{`No possible matches found for '${result.candidateName}'`}</div>
        )}
        {Boolean(result.candidates.length) && (
          <>
            <div className="suggestions-panel__content__header">
              {`Found possible matches for '${result.candidateName}'. Click on result to import the necessary package`}
            </div>
            <div className="suggestions-panel__entry">
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

export const CodeFixSuggestionsPanel = observer(() => {
  const ideStore = usePureIDEStore();

  return (
    <div className="suggestions-panel">
      {ideStore.codeFixSuggestion instanceof
        UnmatchedFunctionCodeFixSuggestion && (
        <UnmatchedFunctionExecutionResultDisplay
          suggestionState={ideStore.codeFixSuggestion}
        />
      )}
      {ideStore.codeFixSuggestion instanceof UnknownSymbolCodeFixSuggestion && (
        <UnmatchExecutionResultDisplay
          suggestionState={ideStore.codeFixSuggestion}
        />
      )}
    </div>
  );
});
