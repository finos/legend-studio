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

/**
 * Why Cube can't read a lambda into a cube (Import Pure, PLAN §11.18): a
 * construct it has no IR or no step for, or a source the host can't bind.
 * Nothing is imported in part, so the message names the first problem found,
 * in words the person importing can act on.
 */
export class CubeLambdaReadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CubeLambdaReadError';
  }
}
