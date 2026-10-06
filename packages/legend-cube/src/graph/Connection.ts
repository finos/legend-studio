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

/** A directed edge: the output of node `source` feeds the input port `port` of node `target` */
export class Connection {
  readonly source: string;
  readonly target: string;
  readonly port: string;

  constructor(source: string, target: string, port: string) {
    if (!source || !target || !port) {
      throw new Error(
        `Connection needs a source, a target and a port, but got (${source}, ${target}, ${port})`,
      );
    }
    this.source = source;
    this.target = target;
    this.port = port;
  }

  /** Partial match: an `undefined` argument matches anything */
  match(source?: string, target?: string, port?: string): boolean {
    return (
      (source === undefined || this.source === source) &&
      (target === undefined || this.target === target) &&
      (port === undefined || this.port === port)
    );
  }

  equals(other: Connection): boolean {
    return this.match(other.source, other.target, other.port);
  }

  toString(): string {
    return `${this.source} → ${this.target} (${this.port})`;
  }
}
