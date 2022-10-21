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
  WarningOutlineIcon,
  clsx,
  PanelSection,
  Panel,
  ErrorIcon,
} from '@finos/legend-art';
import { useEditorStore } from '../EditorStoreProvider.js';
import type { CompilationWarning } from '@finos/legend-graph';

export const ProblemItem = observer(
  (props: {
    problem: CompilationWarning;
    textMode?: boolean;
    isError?: boolean;
    isStaleWarnings: boolean;
  }) => {
    const { problem, textMode, isError, isStaleWarnings } = props;

    return (
      <div className="auxiliary-panel__problem__label">
        <PanelListItem>
          {isError ? (
            <ErrorIcon className="panel__content__form__icon panel__content__form__icon--error" />
          ) : (
            <WarningOutlineIcon className="panel__content__form__icon panel__content__form__icon--warning" />
          )}
          <div
            className={clsx('auxiliary-panel__problem__label__message', {
              'auxiliary-panel__problem__label__message--stale':
                isStaleWarnings,
            })}
          >
            {`${problem.message} `}
          </div>
          {problem.sourceInformation && (
            <div
              className={clsx('auxiliary-panel__problem__label__source', {
                'auxiliary-panel__problem__label__source--stale':
                  isStaleWarnings,
              })}
            >
              {textMode &&
                `[Ln ${problem.sourceInformation.startLine}, Col ${problem.sourceInformation.startColumn}]`}
            </div>
          )}
        </PanelListItem>
      </div>
    );
  },
);

export const Problems = observer(() => {
  const editorStore = useEditorStore();
  const warnings = editorStore.graphState.warnings;
  const error = editorStore.graphState.error;

  let isStaleWarnings: boolean;
  if (editorStore.isInGrammarTextMode) {
    isStaleWarnings = editorStore.graphState.isStaleTextWarnings;
  } else {
    if (
      editorStore.graphState.mostRecentFormModeCompilationcurrentGraphHash ===
      undefined
    ) {
      isStaleWarnings = true;
    }
    isStaleWarnings =
      editorStore.graphState.mostRecentFormModeCompilationcurrentGraphHash !==
      editorStore.graphState.currentGraphHash;
  }

  const setProblemCursorPosition = (problem: CompilationWarning): void => {
    if (problem.sourceInformation) {
      editorStore.grammarTextEditorState.setForcedCursorPosition({
        lineNumber: problem.sourceInformation.startLine,
        column: problem.sourceInformation.startColumn,
      });
    }
  };

  return (
    <Panel>
      {error && <PanelSection> Error </PanelSection>}
      {error && !editorStore.isInGrammarTextMode && (
        <PanelList>
          <ProblemItem
            key={error.message}
            problem={error as CompilationWarning}
            isError={true}
            isStaleWarnings={false}
          />
        </PanelList>
      )}
      {error && editorStore.isInGrammarTextMode && (
        <PanelList>
          <button
            title={error.message}
            key={error.message}
            onClick={() =>
              setProblemCursorPosition(error as CompilationWarning)
            }
            className="auxiliary-panel__problem__btn"
          >
            <ProblemItem
              key={error.message}
              problem={error as CompilationWarning}
              isError={true}
              textMode={true}
              isStaleWarnings={false}
            />
          </button>
        </PanelList>
      )}
      <PanelSection>
        <div>
          {editorStore.graphState.warnings === undefined &&
            'Please compile (F9) to see possible problems'}
          {!editorStore.graphState.warnings ||
            (editorStore.graphState.warnings.length === 0 &&
              'No warnings detected')}
          {editorStore.graphState.warnings &&
            editorStore.graphState.warnings.length > 0 &&
            (isStaleWarnings
              ? 'Stale warnings - please compile (F9) to reload latest possible problems'
              : 'Warnings: ')}
        </div>
      </PanelSection>
      <PanelList>
        {warnings &&
          !editorStore.isInGrammarTextMode &&
          warnings.map((warning) => (
            <ProblemItem
              key={warning.message}
              problem={warning}
              isStaleWarnings={isStaleWarnings}
            />
          ))}
        {warnings &&
          editorStore.isInGrammarTextMode &&
          warnings.map((warning) => (
            <button
              title={warning.message}
              key={warning.message}
              onClick={() => setProblemCursorPosition(warning)}
              className="auxiliary-panel__problem__btn"
            >
              <ProblemItem
                key={warning.message}
                problem={warning}
                textMode={true}
                isStaleWarnings={isStaleWarnings}
              />
            </button>
          ))}
      </PanelList>
    </Panel>
  );
});
