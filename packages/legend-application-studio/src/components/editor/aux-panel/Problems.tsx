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
  PanelList,
  PanelListItem,
  clsx,
  Panel,
  ErrorIcon,
  WarningIcon,
} from '@finos/legend-art';
import { useEditorStore } from '../EditorStoreProvider.js';
import type { Problem } from '../../../stores/EditorGraphState.js';
import { CompilationWarning, EngineError } from '@finos/legend-graph';

const ProblemItem = observer((props: { problem: Problem }) => {
  const { problem } = props;
  const editorStore = useEditorStore();
  const grammarModeManagerState = editorStore.grammarModeManagerState;
  const isStale = editorStore.graphState.areProblemsStale;
  const goToSource = (): void => {
    // NOTE: in text mode, we allow click to go to position even when the problems might already be stale
    if (editorStore.isInGrammarTextMode && problem.sourceInformation) {
      if (grammarModeManagerState.isInDefaultTextMode) {
        grammarModeManagerState.grammarTextEditorState.setForcedCursorPosition({
          lineNumber: problem.sourceInformation.startLine,
          column: problem.sourceInformation.startColumn,
        });
      } else {
        grammarModeManagerState.openGrammarTextEditor(
          problem.sourceInformation,
        );
      }
    }
  };

  return (
    <PanelListItem>
      <button
        className={clsx([
          'auxiliary-panel__problem',
          {
            'auxiliary-panel__problem--stale': isStale,
          },
        ])}
        title={problem.message}
        onClick={goToSource}
      >
        {problem instanceof EngineError && (
          <ErrorIcon className="auxiliary-panel__problem__icon auxiliary-panel__problem__icon--error" />
        )}
        {problem instanceof CompilationWarning && (
          <WarningIcon className="auxiliary-panel__problem__icon auxiliary-panel__problem__icon--warning" />
        )}
        <div className="auxiliary-panel__problem__message">
          {problem.message}
        </div>
        {problem.sourceInformation && (
          <div className="auxiliary-panel__problem__source">
            {editorStore.isInGrammarTextMode &&
              `[${
                editorStore.grammarModeManagerState.isInDefaultTextMode
                  ? ''
                  : `File ${problem.sourceInformation.elementPath}, `
              }Ln ${problem.sourceInformation.startLine}, Col ${
                problem.sourceInformation.startColumn
              }]`}
          </div>
        )}
      </button>
    </PanelListItem>
  );
});

export const Problems = observer(() => {
  const editorStore = useEditorStore();
  const problems = editorStore.graphState.problems;
  const isStale = editorStore.graphState.areProblemsStale;

  return (
    <Panel>
      {isStale && (
        <div className="auxiliary-panel__problems__stale-warning">
          The following result might be stale - please run compilation (F9) to
          check for the latest problems
        </div>
      )}
      {problems.length === 0 && (
        <div className="auxiliary-panel__problems__placeholder">
          No problems have been detected in the workspace.
        </div>
      )}
      {problems.length !== 0 && (
        <PanelList>
          {problems.map((problem) => (
            <ProblemItem key={problem.uuid} problem={problem} />
          ))}
        </PanelList>
      )}
    </Panel>
  );
});
