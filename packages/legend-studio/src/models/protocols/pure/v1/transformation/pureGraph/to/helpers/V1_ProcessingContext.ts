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

import { Stack } from '@finos/legend-studio-shared';
import type { ValueSpecification } from '../../../../../../../metamodels/pure/model/valueSpecification/ValueSpecification';

export class V1_ProcessingContext {
  inferredVariableList: Map<string, ValueSpecification>[] = [];
  tags = new Stack<string>();

  constructor(firstTag: string) {
    this.tags.push(firstTag);
  }

  push(s: string): V1_ProcessingContext {
    this.tags.push(s);
    return this;
  }

  pop(): V1_ProcessingContext {
    this.tags.pop();
    return this;
  }

  peek(): string | undefined {
    return this.tags.peek();
  }

  getStack(): Stack<string> {
    return this.tags;
  }

  getLastInferredVariableList(): Map<string, ValueSpecification> {
    return this.inferredVariableList[this.inferredVariableList.length - 1];
  }

  addInferredVariables(name: string, variable: ValueSpecification): void {
    if (!this.inferredVariableList.length) {
      this.addVariableToNewLevel(name, variable);
    } else {
      this.getLastInferredVariableList().set(name, variable);
    }
  }

  flushVariable(name: string): void {
    this.getLastInferredVariableList().delete(name);
  }

  removeLastVariableLevel(): void {
    this.inferredVariableList.pop();
  }

  addVariableLevel(): void {
    const map = new Map<string, ValueSpecification>();
    this.inferredVariableList.push(map);
  }

  getInferredVariable(name: string): ValueSpecification | undefined {
    return this.inferredVariableList
      .slice()
      .reverse()
      .find((e) => e.get(name))
      ?.get(name);
  }

  private addVariableToNewLevel(
    name: string,
    variable: ValueSpecification,
  ): void {
    const map = new Map<string, ValueSpecification>();
    map.set(name, variable);
    this.inferredVariableList.push(map);
  }

  clone(): V1_ProcessingContext {
    const ctx = new V1_ProcessingContext('');
    ctx.tags = this.tags.clone();
    ctx.inferredVariableList = this.inferredVariableList.map((varMap) => {
      const newVarMap = new Map<string, ValueSpecification>();
      varMap.forEach((valueSpec, key) => {
        newVarMap.set(key, valueSpec);
      });
      return newVarMap;
    });
    return ctx;
  }
}
