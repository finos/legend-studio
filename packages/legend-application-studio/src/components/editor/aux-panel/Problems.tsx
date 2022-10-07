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
  PanelContent,
} from '@finos/legend-art';
import { useEditorStore } from '../EditorStoreProvider.js';
import type { EngineWarning } from '@finos/legend-graph';

export const WarningItemInGrammarTextMode = observer(
  (props: { warning: EngineWarning }) => {
    const { warning } = props;
    const editorStore = useEditorStore();

    const setWarning = (): void => {
      editorStore.grammarTextEditorState.setWarning(warning);
    };

    return (
      <button
        title={warning.message}
        onClick={setWarning}
        className="auxiliary-panel__warning__btn"
      >
        <PanelListItem>
          <WarningOutlineIcon className="panel__content__form__icon panel__content__form__icon--warning" />{' '}
          <div className="auxiliary-panel__warning__label--message">
            {`${warning.message} `}
          </div>
          {warning.sourceInformation && (
            <div className="auxiliary-panel__warning__label--source">
              {`[Ln ${warning.sourceInformation.startLine}, Col ${warning.sourceInformation.startColumn}, ]`}
            </div>
          )}
        </PanelListItem>
      </button>
    );
  },
);

export const WarningItemInFormMode = observer(
  (props: { warning: EngineWarning }) => {
    const { warning } = props;
    return (
      <div className="auxiliary-panel__warning__label">
        <PanelListItem>
          <WarningOutlineIcon className="panel__content__form__icon panel__content__form__icon--warning" />{' '}
          <div className="auxiliary-panel__warning__label--message">
            {`${warning.message} `}
          </div>
        </PanelListItem>
      </div>
    );
  },
);

export const Problems = observer(() => {
  const editorStore = useEditorStore();
  const warnings = editorStore.grammarTextEditorState.warnings;

  return (
    <div className="console-panel">
      <div className="console-panel__content">
        <PanelContent className="auxiliary-panel__warning__list__item">
          <PanelList>
            {warnings &&
              !editorStore.isInGrammarTextMode &&
              warnings.map((warning) => (
                <WarningItemInFormMode
                  key={warning.message}
                  warning={warning}
                />
              ))}
            {warnings &&
              editorStore.isInGrammarTextMode &&
              warnings.map((warning) => (
                <WarningItemInGrammarTextMode
                  key={warning.message}
                  warning={warning}
                />
              ))}
          </PanelList>
        </PanelContent>
      </div>
    </div>
  );
});
