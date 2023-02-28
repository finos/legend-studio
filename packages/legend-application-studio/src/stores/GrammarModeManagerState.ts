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

import type {
  PackageableElement,
  SourceInformation,
  TextCompilationResult,
} from '@finos/legend-graph';
import { type GeneratorFn, guaranteeNonNullable } from '@finos/legend-shared';
import type { Entity } from '@finos/legend-storage';
import { action, flow, flowResult, makeObservable, observable } from 'mobx';
import { getCodeSnippet } from '../components/editor/edit-panel/GrammarTextEditor.js';
import {
  GrammarTextEditorState,
  getRegexStringForElement,
} from './editor-state/GrammarTextEditorState.js';
import type { EditorStore } from './EditorStore.js';
import {
  SearchResultSourceInformation,
  GrammarModeSearchState,
} from './GrammarModeSearchState.js';

export class GrammarModeManagerState {
  readonly editorStore: EditorStore;

  isInDefaultTextMode = true;
  grammarTextEditorState: GrammarTextEditorState;
  currentGrammarElements: Map<string, string> = new Map<string, string>();
  grammarModeSearchState: GrammarModeSearchState;

  constructor(editorStore: EditorStore) {
    makeObservable(this, {
      currentGrammarElements: observable,
      isInDefaultTextMode: observable,
      grammarModeSearchState: observable,
      setCurrentGrammarElements: action,
      setIsInDefaultTextMode: action,
      openGrammarTextEditor: action,
      setGraphGrammar: flow,
      setGraphGrammarFromEntites: flow,
      compileText: flow,
    });

    this.editorStore = editorStore;
    this.grammarModeSearchState = new GrammarModeSearchState(this.editorStore);
    this.grammarTextEditorState = new GrammarTextEditorState(this.editorStore);
  }

  setIsInDefaultTextMode(val: boolean): void {
    this.isInDefaultTextMode = val;
  }

  setCurrentGrammarElements(val: Map<string, string>): void {
    this.currentGrammarElements = val;
  }

  getCurrentGrammarModeGraphHash(): string | Map<string, string> {
    if (this.isInDefaultTextMode) {
      return this.grammarTextEditorState.currentTextGraphHash;
    } else {
      const hashIndexes = new Map<string, string>();
      this.editorStore.tabManagerState.tabs.forEach((state) => {
        if (state instanceof GrammarTextEditorState) {
          hashIndexes.set(
            guaranteeNonNullable(state.element).path,
            state.currentTextGraphHash,
          );
        }
      });
      return hashIndexes;
    }
  }

  createGrammarElementState(
    element: PackageableElement,
  ): GrammarTextEditorState | undefined {
    const grammarText = this.currentGrammarElements.get(element.path);
    if (grammarText) {
      const grammarEditorState = new GrammarTextEditorState(this.editorStore);
      grammarEditorState.setGraphGrammarText(grammarText);
      grammarEditorState.setElement(element);
      return grammarEditorState;
    } else {
      const grammarEditorState = new GrammarTextEditorState(this.editorStore);
      const grammar = getCodeSnippet(this.editorStore, element);
      grammarEditorState.setGraphGrammarText(grammar);
      grammarEditorState.setElement(element);
      this.currentGrammarElements.set(element.path, grammar);
      return grammarEditorState;
    }
  }

  openGrammarTextEditor(
    sourceInformation: SearchResultSourceInformation | SourceInformation,
    path?: string,
  ): void {
    let element;
    const elementPath =
      sourceInformation instanceof SearchResultSourceInformation
        ? path
        : sourceInformation.elementPath;
    if (elementPath) {
      element =
        this.editorStore.graphManagerState.graph.getOwnNullableElement(
          elementPath,
        );
    }
    if (element) {
      this.editorStore.tabManagerState.openElementEditor(element);
      if (
        this.editorStore.tabManagerState.currentTab instanceof
        GrammarTextEditorState
      ) {
        this.editorStore.tabManagerState.currentTab.setForcedCursorPosition({
          lineNumber: sourceInformation.startLine,
          column: sourceInformation.startColumn,
        });
      }
    }
  }

  *setGraphGrammarFromEntites(entities: Entity[]): GeneratorFn<void> {
    if (this.isInDefaultTextMode) {
      const editorGrammar =
        (yield this.editorStore.graphManagerState.graphManager.entitiesToPureCode(
          entities,
        )) as string;
      yield flowResult(
        this.grammarTextEditorState.setGraphGrammarText(editorGrammar),
      );
    } else {
      const editorGrammar =
        (yield this.editorStore.graphManagerState.graphManager.entitiesToPureCodeWithElements(
          entities,
        )) as Map<string, string>;
      yield flowResult(this.setCurrentGrammarElements(editorGrammar));
    }
  }

  *setGraphGrammar(): GeneratorFn<void> {
    if (this.isInDefaultTextMode) {
      const graphGrammar =
        (yield this.editorStore.graphManagerState.graphManager.graphToPureCode(
          this.editorStore.graphManagerState.graph,
        )) as string;
      yield flowResult(
        this.grammarTextEditorState.setGraphGrammarText(graphGrammar),
      );
    } else {
      this.setCurrentGrammarElements(
        (yield this.editorStore.graphManagerState.graphManager.graphToPureCodeWithElements(
          this.editorStore.graphManagerState.graph,
        )) as Map<string, string>,
      );
    }
  }

  *compileText(options?: {
    onError?: () => void;
  }): GeneratorFn<TextCompilationResult> {
    const compilationResult = this.isInDefaultTextMode
      ? ((yield this.editorStore.graphManagerState.graphManager.compileText(
          this.grammarTextEditorState.graphGrammarText,
          this.editorStore.graphManagerState.graph,
          options,
        )) as TextCompilationResult)
      : ((yield this.editorStore.graphManagerState.graphManager.compileTextWithElements(
          this.currentGrammarElements,
          this.editorStore.graphManagerState.graph,
          options,
        )) as TextCompilationResult);
    return compilationResult;
  }

  async computeEntitiesFromCurrentGrammar(): Promise<Entity[]> {
    let entities = [];
    if (this.isInDefaultTextMode) {
      entities =
        await this.editorStore.graphManagerState.graphManager.pureCodeToEntities(
          this.grammarTextEditorState.graphGrammarText,
        );
    } else {
      entities =
        await this.editorStore.graphManagerState.graphManager.pureCodeWithElementsToEntities(
          this.currentGrammarElements,
        );
    }
    return entities;
  }
}
