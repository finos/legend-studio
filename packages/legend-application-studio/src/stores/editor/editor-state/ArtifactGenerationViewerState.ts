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
import { EditorState } from './EditorState.js';
import { observable, makeObservable, computed } from 'mobx';
import { returnUndefOnError } from '@finos/legend-shared';
import { DEFAULT_TAB_SIZE } from '@finos/legend-application';
import { CODE_EDITOR_LANGUAGE } from '@finos/legend-code-editor';
import type { FileSystem_File } from '../utils/FileSystemTreeUtils.js';

export const getTextContent = (
  content: string,
  format: string | undefined,
): string => {
  switch (format?.toLowerCase()) {
    case CODE_EDITOR_LANGUAGE.JSON:
      return (
        returnUndefOnError(() =>
          JSON.stringify(JSON.parse(content), undefined, DEFAULT_TAB_SIZE),
        ) ?? content
      );
    default:
      return content;
  }
};

export const getEditorLanguageForFormat = (
  format?: string,
): CODE_EDITOR_LANGUAGE => {
  switch (format?.toLowerCase()) {
    case CODE_EDITOR_LANGUAGE.JAVA:
      return CODE_EDITOR_LANGUAGE.JAVA;
    case CODE_EDITOR_LANGUAGE.JSON:
      return CODE_EDITOR_LANGUAGE.JSON;
    default:
      return CODE_EDITOR_LANGUAGE.TEXT;
  }
};

export class ArtifactGenerationViewerState extends EditorState {
  artifact: FileSystem_File;

  constructor(editorStore: EditorStore, file: FileSystem_File) {
    super(editorStore);

    makeObservable(this, {
      artifact: observable,
      label: computed,
      generatedFilePath: computed,
    });

    this.artifact = file;
  }

  get label(): string {
    return this.artifact.name;
  }

  override match(tab: EditorState): boolean {
    return (
      tab instanceof ArtifactGenerationViewerState &&
      tab.artifact === this.artifact
    );
  }

  get generatedFilePath(): string {
    return this.artifact.path;
  }
}
