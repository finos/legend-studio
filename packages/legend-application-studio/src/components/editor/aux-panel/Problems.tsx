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
} from '@finos/legend-art';
import { useEditorStore } from '../EditorStoreProvider.js';
import type { EngineWarning } from '@finos/legend-graph';

export const WarningItem = observer(
  (props: {
    warning: EngineWarning;
    textMode?: boolean;
    isStaleWarnings: boolean;
  }) => {
    const { warning, textMode, isStaleWarnings } = props;

    return (
      <div className="auxiliary-panel__warning__label">
        <PanelListItem>
          <WarningOutlineIcon className="panel__content__form__icon panel__content__form__icon--warning" />{' '}
          <div
            className={clsx('auxiliary-panel__warning__label__message', {
              'auxiliary-panel__warning__label__message--stale':
                isStaleWarnings,
            })}
          >
            {`${warning.message} `}
          </div>
          {warning.sourceInformation && (
            <div
              className={clsx('auxiliary-panel__warning__label__source', {
                'auxiliary-panel__warning__label__source--stale':
                  isStaleWarnings,
              })}
            >
              {textMode &&
                `[Ln ${warning.sourceInformation.startLine}, Col ${warning.sourceInformation.startColumn}]`}
            </div>
          )}
        </PanelListItem>
      </div>
    );
  },
);

export const Problems = observer(() => {
  const editorStore = useEditorStore();
  const warnings = editorStore.grammarTextEditorState.warnings;

  const isStaleWarnings = editorStore.graphState.isStaleWarnings;

  const setWarning = (warning: EngineWarning): void => {
    editorStore.grammarTextEditorState.setWarning(warning);
  };

  return (
    <Panel className="console-panel">
      <PanelSection>
        <div>
          {editorStore.grammarTextEditorState.warnings === undefined &&
            'Please compile (F9) to see possible problems'}
          {!editorStore.grammarTextEditorState.warnings ||
            (editorStore.grammarTextEditorState.warnings.length === 0 &&
              'No warnings detected')}
          {editorStore.grammarTextEditorState.warnings &&
            editorStore.grammarTextEditorState.warnings.length > 0 &&
            (isStaleWarnings
              ? 'Stale warnings - please compile (F9) to reload latest possible problems'
              : 'Warnings: ')}
        </div>
      </PanelSection>
      <PanelList>
        {warnings &&
          !editorStore.isInGrammarTextMode &&
          warnings.map((warning) => (
            <WarningItem
              key={warning.message}
              warning={warning}
              isStaleWarnings={isStaleWarnings}
            />
          ))}
        {warnings &&
          editorStore.isInGrammarTextMode &&
          warnings.map((warning) => (
            <button
              title={warning.message}
              key={warning.message}
              onClick={() => setWarning(warning)}
              className="auxiliary-panel__warning__btn"
            >
              <WarningItem
                key={warning.message}
                warning={warning}
                textMode={true}
                isStaleWarnings={isStaleWarnings}
              />
            </button>
          ))}
      </PanelList>
    </Panel>
  );
});
