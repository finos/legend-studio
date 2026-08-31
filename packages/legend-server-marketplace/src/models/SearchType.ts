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
 * The search path used by a marketplace search endpoint.
 *
 * `HYBRID` combines lexical and vector similarity and is the default for
 * DataSpaces; `FULL_TEXT` is the lightweight lexical-only path used by the
 * Lakehouse Access (Data Product) experience.
 */
export enum SearchType {
  HYBRID = 'hybrid',
  SEMANTIC = 'semantic',
  FULL_TEXT = 'full_text',
}
