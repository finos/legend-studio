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

import type { PostDeploymentAction } from '@finos/legend-graph';
import { makeObservable, observable } from 'mobx';

export abstract class PostDeploymentActionEditorState {
  postDeploymentAction: PostDeploymentAction | undefined;

  constructor(postDeploymentAction: PostDeploymentAction | undefined) {
    makeObservable(this, {
      postDeploymentAction: observable,
    });
    this.postDeploymentAction = postDeploymentAction;
  }

  abstract setDeploymentActionState(
    val: PostDeploymentAction | undefined,
  ): void;
}
