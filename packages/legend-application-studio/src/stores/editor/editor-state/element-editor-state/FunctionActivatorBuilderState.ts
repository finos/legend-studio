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

import { action, makeObservable, observable } from 'mobx';
import type { FunctionEditorState } from './FunctionEditorState.js';
import type { FunctionActivatorConfiguration } from '@finos/legend-graph';
import { ProtocolValueBuilderState } from './ProtocolValueBuilderState.js';
import type { PlainObject } from '@finos/legend-shared';

export class FunctionActivatorBuilderState {
  readonly functionEditorState: FunctionEditorState;

  currentActivatorConfiguration?: FunctionActivatorConfiguration | undefined;
  functionActivatorProtocolValueBuilderState?:
    | ProtocolValueBuilderState
    | undefined;

  constructor(functionEditorState: FunctionEditorState) {
    makeObservable(this, {
      currentActivatorConfiguration: observable,
      functionActivatorProtocolValueBuilderState: observable,
      setCurrentActivatorConfiguration: action,
    });

    this.functionEditorState = functionEditorState;
  }

  setCurrentActivatorConfiguration(
    val: FunctionActivatorConfiguration | undefined,
  ): void {
    this.currentActivatorConfiguration = val;
    if (val) {
      this.functionActivatorProtocolValueBuilderState =
        new ProtocolValueBuilderState(val.configurationType, {
          graph: val.graph,
          initialValue: undefined,
          excludedPaths: [
            'meta::protocols::pure::vX_X_X::metamodel::functionActivator::FunctionActivator.function',
            'meta::protocols::pure::vX_X_X::metamodel::PackageableElement.sourceInformation',
            'meta::protocols::pure::vX_X_X::metamodel::PackageableElement.package',
            'meta::protocols::pure::vX_X_X::metamodel::PackageableElement.name',
            'meta::protocols::pure::vX_X_X::metamodel::PackageableElement._type',
          ],
          onValueChange: (value: PlainObject) => {
            // TODO-PR
            console.log(value);
          },
          decorateValue: (value: PlainObject): PlainObject => {
            value._type = val.packageableElementJSONType;
            value.package =
              this.functionEditorState.functionElement.package?.path;
            value.function = this.functionEditorState.functionElement.path;
            return value;
          },
        });
    } else {
      this.functionActivatorProtocolValueBuilderState = undefined;
    }
  }
}
