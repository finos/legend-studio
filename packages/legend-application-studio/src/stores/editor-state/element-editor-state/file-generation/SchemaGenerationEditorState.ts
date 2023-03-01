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

import { action, observable, makeObservable } from 'mobx';
import type { EditorStore } from '../../../EditorStore.js';
import { ElementEditorState } from '../ElementEditorState.js';
import {
  type GeneratorFn,
  ActionState,
  assertType,
  guaranteeType,
} from '@finos/legend-shared';
import {
  type PackageableElement,
  SchemaGenerationSpecification,
  ELEMENT_PATH_DELIMITER,
  DIRECTORY_PATH_DELIMITER,
} from '@finos/legend-graph';
import { GeneratedFileStructureState } from '../../FileGenerationState.js';
import { GENERATION_FILE_ROOT_NAME } from '../../../shared/FileSystemTreeUtils.js';

export class SchemaGeneratedFileStructureState extends GeneratedFileStructureState {
  element: SchemaGenerationSpecification;

  constructor(
    element: SchemaGenerationSpecification,
    editorStore: EditorStore,
  ) {
    super(GENERATION_FILE_ROOT_NAME, editorStore);
    this.element = element;
  }

  get rootFolder(): string {
    return this.element.path.replaceAll(
      ELEMENT_PATH_DELIMITER,
      DIRECTORY_PATH_DELIMITER,
    );
  }
  get generationParentId(): string | undefined {
    throw this.element.path;
  }

  resetGenerator(): void {
    throw new Error('Method not implemented.');
  }
  generate(): GeneratorFn<void> {
    throw new Error('Method not implemented.');
  }
}

export class SchemaGenerationEditorState extends ElementEditorState {
  generatingActionState = ActionState.create();
  schemaGenerationFileStructureState:
    | SchemaGeneratedFileStructureState
    | undefined;

  constructor(editorStore: EditorStore, element: PackageableElement) {
    super(editorStore, element);

    makeObservable(this, {
      generatingActionState: observable,
      reprocess: action,
      schemaGenerationFileStructureState: observable,
    });

    assertType(
      element,
      SchemaGenerationSpecification,
      'Element inside file generation editor state should be a file generation',
    );
  }

  get schemaGeneration(): SchemaGenerationSpecification {
    return guaranteeType(
      this.element,
      SchemaGenerationSpecification,
      'Element file generation editor state must be a file generation',
    );
  }

  reprocess(
    newElement: SchemaGenerationSpecification,
    editorStore: EditorStore,
  ): SchemaGenerationEditorState {
    return new SchemaGenerationEditorState(editorStore, newElement);
  }
}
