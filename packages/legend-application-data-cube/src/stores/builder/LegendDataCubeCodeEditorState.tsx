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
  _lambda,
  DataCubeCodeEditorState,
  type DataCubeEngine,
} from '@finos/legend-data-cube';
import { type V1_Lambda } from '@finos/legend-graph';
import { assertErrorThrown } from '@finos/legend-shared';
import { action, makeObservable, observable } from 'mobx';

export class LegendDataCubeCodeEditorState extends DataCubeCodeEditorState {
  alertHandler: (error: Error) => void;

  constructor(engine: DataCubeEngine, alertHandler: (error: Error) => void) {
    super(engine);
    makeObservable(this, {
      code: observable,

      editor: observable.ref,
      setEditor: action,

      codeError: observable.ref,
      clearError: action,

      returnType: observable,
      setReturnType: action,
    });

    this.alertHandler = alertHandler;
    this.engine = engine;
  }

  async getReturnType(): Promise<string | boolean | undefined> {
    await this.engine.parseValueSpecification(this.code, false);
    return undefined;
  }

  queryLambda = (): V1_Lambda => {
    this.engine
      .parseValueSpecification(this.code)
      .then((lambda) => {
        return lambda;
      })
      .catch((error) => {
        assertErrorThrown(error);
      });
    return _lambda([], []);
  };
}
