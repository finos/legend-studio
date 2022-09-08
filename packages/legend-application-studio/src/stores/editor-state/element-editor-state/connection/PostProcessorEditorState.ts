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

import {
  type Mapper,
  type PostProcessor,
  type SchemaNameMapper,
  TableNameMapper,
} from '@finos/legend-graph';
import { makeObservable, observable, action } from 'mobx';
import type { RelationalDatabaseConnectionValueState } from './ConnectionEditorState.js';

export class PostProcessorEditorState {
  postProcessor: PostProcessor | undefined;
  connectionValueState: RelationalDatabaseConnectionValueState;
  selectedMapper: Mapper | undefined;
  selectedSchema: SchemaNameMapper | undefined;

  constructor(
    postProcessor: PostProcessor,
    connectionValueState: RelationalDatabaseConnectionValueState,
  ) {
    makeObservable(this, {
      postProcessor: observable,
      connectionValueState: observable,
      selectedMapper: observable,
      selectedSchema: observable,
      setSelectedMapper: action,
      setSelectedSchema: action,
      setSelectedPostProcessor: action,
    });

    this.postProcessor = postProcessor;
    this.connectionValueState = connectionValueState;
  }

  setSelectedPostProcessor = (val: PostProcessor | undefined): void => {
    this.postProcessor = val;
    this.setSelectedMapper(undefined);
    this.setSelectedSchema(undefined);
  };

  setSelectedSchema = (val: SchemaNameMapper | undefined): void => {
    this.selectedSchema = val;
  };

  setSelectedMapper = (val: Mapper | undefined): void => {
    this.selectedMapper = val;
    if (!(this.selectedMapper instanceof TableNameMapper)) {
      this.setSelectedSchema(undefined);
    }
  };
}
