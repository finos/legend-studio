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
import type { SourceInformation } from '@finos/legend-graph';
import { ArrowCircleRightIcon } from '@finos/legend-art';
import { useEditorStore } from '../EditorStoreProvider.js';

const SuggestionItem = observer((props: { candidate: SourceInformation }) => {
  const { candidate } = props;
  const editorStore = useEditorStore();

  const goToCandidate = (): void => {
    editorStore.graphEditorMode.goToSource(candidate);
  };
  const useCandidate = (): void => {
    editorStore.setSelectedCandidate(candidate);
  };

  return (
    <div className="suggestions-panel__entry__content__item">
      <div
        className="suggestions-panel__entry__content__item__label__candidate"
        title="Add Suggested Import"
        onClick={useCandidate}
      >
        <div className="suggestions-panel__entry__content__item__label__candidate-name">
          {candidate.sourceId}
        </div>
        <div className="suggestions-panel__entry__content__item__label__candidate-location">
          {`[${candidate.startLine}:${candidate.startColumn}]`}
        </div>
      </div>
      <div className="suggestions-panel__entry__content__item__actions">
        <button
          className="suggestions-panel__entry__content__item__action"
          tabIndex={-1}
          title="Go to Candidate"
          onClick={goToCandidate}
        >
          <ArrowCircleRightIcon />
        </button>
      </div>
    </div>
  );
});

export const CodeFixSuggestionsPanel = observer(() => {
  const editorStore = useEditorStore();
  const codeFixSuggestion = editorStore.codeFixSuggestion;

  return (
    <div className="suggestions-panel__content">
      {codeFixSuggestion && !codeFixSuggestion.result.candidates.length && (
        <div className="suggestions-panel__content__header">{`No possible matches found for this problem`}</div>
      )}
      {codeFixSuggestion &&
        Boolean(codeFixSuggestion.result.candidates.length) && (
          <>
            <div className="suggestions-panel__content__header">
              {`Found possible matches for this problem. Click on result to import the necessary package`}
            </div>
            <div className="suggestions-panel__entry">
              {codeFixSuggestion.result.candidates.map((candidate) => (
                <SuggestionItem
                  key={candidate.sourceId}
                  candidate={candidate}
                />
              ))}
            </div>
          </>
        )}
    </div>
  );
});
