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

import type { DocumentationEntry } from '@finos/legend-shared';
import { makeObservable, observable, action } from 'mobx';
import { DocumentationPanel } from '../../components/core/DataCubeDocumentationPanel.js';
import type {
  DataCubeLayoutService,
  DisplayState,
} from './DataCubeLayoutService.js';
import type { DataCubeEngine } from '../core/DataCubeEngine.js';

export class DataCubeDocumentationService {
  private readonly _engine: DataCubeEngine;
  private readonly _layoutService: DataCubeLayoutService;

  readonly display: DisplayState;

  currentEntry?: DocumentationEntry | undefined;

  constructor(engine: DataCubeEngine, layoutService: DataCubeLayoutService) {
    makeObservable(this, {
      currentEntry: observable,
      setCurrentEntry: action,
    });

    this._engine = engine;
    this._layoutService = layoutService;
    this.display = this._layoutService.newDisplay(
      'Documentation',
      () => <DocumentationPanel />,
      {
        x: -50,
        y: -50,
        width: 400,
        height: 400,
        minWidth: 300,
        minHeight: 200,
        center: false,
      },
    );
  }

  getEntry(key: string) {
    return this._engine.getDocumentationEntry(key);
  }

  setCurrentEntry(entry: DocumentationEntry | undefined) {
    this.currentEntry = entry;
  }

  shouldDisplayDocumentationEntry(entry: DocumentationEntry) {
    return (
      /**
       * Since we're displaying the documentation entry, we want only user-friendly docs
       * and discard anything that doesn't come with a title, or does not have any content
       */
      Boolean(entry.title && (entry.text ?? entry.markdownText))
    );
  }
}
