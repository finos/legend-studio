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

import { fromElementPathToMappingElementId } from '../../../../../graph/MetaModelUtils.js';
import { InferableValue } from '../../InferableValue.js';

export abstract class InferableMappingElementIdValue extends InferableValue<
  string,
  string | undefined
> {
  protected defaultValue!: string;

  constructor(value: string, defaultValue: string) {
    super(value);
    this.defaultValue = defaultValue;
  }

  get isDefault(): boolean {
    return this.defaultValue === this.value;
  }
}

export class InferableMappingElementIdExplicitValue extends InferableMappingElementIdValue {
  static create(
    value: string,
    targetPath: string,
  ): InferableMappingElementIdExplicitValue {
    return new InferableMappingElementIdExplicitValue(
      value,
      fromElementPathToMappingElementId(targetPath),
    );
  }

  get valueForSerialization(): string | undefined {
    // if the current value is the default value, we will use `undefined`
    // instead of using the default value to reduce the size of the protocol
    if (this.isDefault) {
      return undefined;
    }
    return this.value;
  }
}

export class InferableMappingElementIdImplicitValue extends InferableMappingElementIdValue {
  private input?: string | undefined;

  constructor(value: string, defaultValue: string, input: string | undefined) {
    super(value, defaultValue);
    this.input = input;
  }

  static create(
    value: string,
    targetPath: string,
    input: string | undefined,
  ): InferableMappingElementIdImplicitValue {
    return new InferableMappingElementIdImplicitValue(
      value,
      fromElementPathToMappingElementId(targetPath),
      input,
    );
  }

  get valueForSerialization(): string | undefined {
    // inferred and the current value is the same as the input
    if (this.value === this.input) {
      return this.input;
    }
    // inferred and the current value is the default value, we will use `undefined`
    // as the inference turns `undefined` into default value
    if (this.isDefault) {
      return undefined;
    }
    return this.value;
  }
}
