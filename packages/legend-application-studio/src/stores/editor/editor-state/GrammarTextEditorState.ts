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

import type { EditorStore } from '../EditorStore.js';
import { action, computed, makeObservable, observable } from 'mobx';
import { hashValue } from '@finos/legend-shared';
import type { SourceInformation } from '@finos/legend-graph';
import { LEGEND_STUDIO_SETTING_KEY } from '../../../__lib__/LegendStudioSetting.js';
import type { CodeEditorPosition } from '@finos/legend-code-editor';

export class GrammarTextEditorState {
  readonly editorStore: EditorStore;

  sourceInformationIndex = new Map<string, SourceInformation>();
  graphGrammarText = '';
  wrapText: boolean;

  forcedCursorPosition?: CodeEditorPosition | undefined;

  constructor(editorStore: EditorStore) {
    makeObservable(this, {
      graphGrammarText: observable,
      wrapText: observable,
      forcedCursorPosition: observable,
      setGraphGrammarText: action,
      setWrapText: action,
      setForcedCursorPosition: action,
      wordWrapOtion: computed,
    });

    this.editorStore = editorStore;
    this.wrapText =
      this.editorStore.applicationStore.settingService.getBooleanValue(
        LEGEND_STUDIO_SETTING_KEY.EDITOR_WRAP_TEXT,
      ) ?? false;
  }

  get currentTextGraphHash(): string {
    return hashValue(this.graphGrammarText);
  }

  get wordWrapOtion(): 'on' | 'off' {
    return this.wrapText ? 'on' : 'off';
  }

  setGraphGrammarText(code: string): void {
    this.graphGrammarText = code;
  }

  setWrapText(val: boolean): void {
    this.wrapText = val;
  }

  setForcedCursorPosition(position: CodeEditorPosition | undefined): void {
    this.forcedCursorPosition = position;
  }

  setSourceInformationIndex(val: Map<string, SourceInformation>): void {
    this.sourceInformationIndex = val;
  }
}
