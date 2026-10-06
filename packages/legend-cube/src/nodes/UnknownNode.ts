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

import { QueryNode } from '../graph/QueryNode.js';
import { ensureSchemas } from '../inference/ValidationUtils.js';
import type { Schema } from '../schema/Schema.js';

/**
 * A node of a type this version of Cube doesn't know, e.g. from a query saved
 * by a newer version. It can be shown, inspected and edited around, but never
 * validated or executed.
 *
 * It gets one synthetic input port per input it had (`in0`, `in1`, ...), so
 * its edges are real connections: the graph rules, healing on removal and
 * layout all apply to them. Since what its ports mean is unknown, it never
 * accepts new inputs.
 */
export class UnknownNode extends QueryNode {
  static readonly TYPE = 'unknown';

  private readonly inputPorts: readonly string[];

  constructor(id: string, inputCount: number) {
    super(id);
    if (!Number.isSafeInteger(inputCount) || inputCount < 0) {
      throw new Error(
        `An unknown node needs a non-negative whole number of inputs, but got ${inputCount}`,
      );
    }
    this.inputPorts = Object.freeze(
      Array.from({ length: inputCount }, (_, index) => `in${index}`),
    );
  }

  get type(): string {
    return UnknownNode.TYPE;
  }

  get ports(): readonly string[] {
    return this.inputPorts;
  }

  override get acceptsNewInputs(): boolean {
    return false;
  }

  /** Never valid: what the node does is unknown. It gives no reason, so it shows the generic error. */
  validate(inputSchemas: readonly Schema[], errors?: string[]): boolean {
    ensureSchemas(inputSchemas, this.ports);
    return false;
  }

  schematize(inputSchemas: readonly Schema[]): Schema | undefined {
    ensureSchemas(inputSchemas, this.ports);
    return undefined;
  }

  describe(): string {
    return `Unknown Transform "${this.id}"`;
  }
}
