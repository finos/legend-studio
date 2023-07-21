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

/**
 * Previously, these exports rely on ES module interop to expose `default` export
 * properly. But since we use `ESM` for Typescript resolution now, we lose this
 * so we have to workaround by importing these and re-export them from CJS
 *
 * TODO: remove these when the package properly work with Typescript's nodenext
 * module resolution
 *
 * @workaround ESM
 * See https://github.com/microsoft/TypeScript/issues/49298
 */
import Fuse from './CJS__Fuse.cjs';
import type { default as FuseType } from 'fuse.js';

export const FuzzySearchEngine = Fuse.Fuse.default;
// NOTE: due to the way we export the constructor of `FuzzySearchEngine`, when we run this with ESM
// we can remove this workaround once Fuse supports ESM
// See https://github.com/krisk/Fuse/pull/727
export const ESM__FuzzySearchEngine =
  Fuse.Fuse as unknown as typeof FuzzySearchEngine;
// eslint-disable-next-line @typescript-eslint/no-redeclare
export type FuzzySearchEngine<T> = FuseType.default<T>;
