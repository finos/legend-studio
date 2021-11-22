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

import type { EditorStore } from '../EditorStore';
import { EditorState } from './EditorState';
import { observable, makeObservable, computed } from 'mobx';
import type { GenerationFile } from '../shared/FileGenerationTreeUtil';
import { EDITOR_LANGUAGE, TAB_SIZE } from '@finos/legend-application';
import { returnUndefOnError } from '@finos/legend-shared';

export const getTextContent = (
  content: string,
  format: string | undefined,
): string => {
  switch (format?.toLowerCase()) {
    case EDITOR_LANGUAGE.JSON:
      return (
        returnUndefOnError(() =>
          JSON.stringify(JSON.parse(content), undefined, TAB_SIZE),
        ) ?? content
      );
    default:
      return content;
  }
};

export const getEditorLanguageFromFormat = (
  format?: string,
): EDITOR_LANGUAGE => {
  switch (format?.toLowerCase()) {
    case EDITOR_LANGUAGE.JAVA:
      return EDITOR_LANGUAGE.JAVA;
    case EDITOR_LANGUAGE.JSON:
      return EDITOR_LANGUAGE.JSON;
    default:
      return EDITOR_LANGUAGE.TEXT;
  }
};

export class FileGenerationViewerState extends EditorState {
  generatedFile: GenerationFile;

  constructor(editorStore: EditorStore, generatedFile: GenerationFile) {
    super(editorStore);

    makeObservable(this, {
      generatedFile: observable,
      headerName: computed,
    });

    this.generatedFile = generatedFile;
  }

  get headerName(): string {
    return this.generatedFile.name;
  }
}
