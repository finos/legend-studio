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
  PostProcessor,
  Mapper,
  MapperPostProcessor,
} from '@finos/legend-graph';
import { makeObservable, observable, action } from 'mobx';
import type { RelationalDatabaseConnectionValueState } from './ConnectionEditorState.js';

export abstract class PostProcessorEditorState {
  postProcessor: PostProcessor | undefined;
  connectionValueState: RelationalDatabaseConnectionValueState;

  constructor(
    postProcessor: PostProcessor | undefined,
    connectionValueState: RelationalDatabaseConnectionValueState,
  ) {
    makeObservable(this, {
      postProcessor: observable,
      connectionValueState: observable,
    });

    this.postProcessor = postProcessor;
    this.connectionValueState = connectionValueState;
  }

  abstract setPostProcessorState(val: PostProcessor | undefined): void;
}

export class MapperPostProcessorEditorState extends PostProcessorEditorState {
  selectedMapper: Mapper | undefined;

  constructor(
    postProcessor: MapperPostProcessor | undefined,
    connectionValueState: RelationalDatabaseConnectionValueState,
  ) {
    super(postProcessor, connectionValueState);

    makeObservable(this, {
      selectedMapper: observable,
      setSelectedMapper: action,
      setPostProcessorState: action,
    });

    this.postProcessor = postProcessor;
    this.connectionValueState = connectionValueState;
  }

  setPostProcessorState = (val: PostProcessor | undefined): void => {
    this.postProcessor = val;

    this.setSelectedMapper(undefined);
  };

  setSelectedMapper = (val: Mapper | undefined): void => {
    this.selectedMapper = val;
  };
}
