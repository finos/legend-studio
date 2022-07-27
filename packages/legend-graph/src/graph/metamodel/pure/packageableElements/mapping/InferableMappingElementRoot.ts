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

import { InferableValue } from '../../InferableValue.js';

export abstract class InferableMappingElementRoot extends InferableValue<
  boolean,
  boolean
> {}

export class InferableMappingElementRootExplicitValue extends InferableMappingElementRoot {
  private constructor(value: boolean) {
    super(value);
  }

  static create(value: boolean): InferableMappingElementRootExplicitValue {
    return new InferableMappingElementRootExplicitValue(value);
  }

  get valueForSerialization(): boolean {
    return this.value;
  }
}

export class InferableMappingElementRootImplicitValue extends InferableMappingElementRoot {
  private input!: boolean;

  private constructor(value: boolean, input: boolean) {
    super(value);
    this.input = input;
  }

  static create(
    value: boolean,
    input: boolean,
  ): InferableMappingElementRootImplicitValue {
    return new InferableMappingElementRootImplicitValue(value, input);
  }

  get valueForSerialization(): boolean {
    return this.input;
  }
}
