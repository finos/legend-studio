/**
 * Copyright (c) 2026-present, Goldman Sachs
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
  type EnteredValue,
  FunctionSource,
  getLiteralText,
  type QueryNode,
} from '@finos/legend-cube';
import { action, computed, makeObservable, observable } from 'mobx';
import { readCubeFunctionValue } from '../source-picker/CubeInlineModelTabState.js';
import { CubeNodeDraft } from './CubeNodeDraft.js';

const textOf = (value: EnteredValue): string =>
  value === undefined
    ? ''
    : value.kind === 'invalid'
      ? value.text
      : getLiteralText(value);

const isSameValue = (left: EnteredValue, right: EnteredValue): boolean =>
  JSON.stringify(left) === JSON.stringify(right);

/**
 * The draft of a function source (PLAN §6.5): the text of each parameter's
 * value, as typed. A value is read against its parameter's type, and text
 * that isn't one is kept as an invalid value, which the source reports.
 */
export class CubeFunctionDraft extends CubeNodeDraft<FunctionSource> {
  valueTexts: string[];

  constructor(original: FunctionSource) {
    super(original);
    makeObservable(this, {
      valueTexts: observable.ref,
      values: computed,
      setValueText: action,
    });
    this.valueTexts = original.values.map(textOf);
  }

  /** The value each text gives, against its parameter's type: none for empty text */
  get values(): readonly EnteredValue[] {
    return this.original.parameters.map((parameter, index) =>
      readCubeFunctionValue(this.valueTexts[index] ?? '', parameter),
    );
  }

  setValueText(index: number, text: string): void {
    const texts = [...this.valueTexts];
    texts[index] = text;
    this.valueTexts = texts;
  }

  /** The original while every value is the one it holds */
  build(): FunctionSource {
    const { original, values } = this;
    return values.every((value, index) =>
      isSameValue(value, original.values[index]),
    )
      ? original
      : original.withValues(values);
  }

  /** Goes on when the engine types the function again in the background: its values are the same */
  override follow(node: QueryNode): boolean {
    if (
      node instanceof FunctionSource &&
      node.signature === this.original.signature &&
      node.values.every((value, index) =>
        isSameValue(value, this.original.values[index]),
      )
    ) {
      this.original = node;
      return true;
    }
    return false;
  }
}
