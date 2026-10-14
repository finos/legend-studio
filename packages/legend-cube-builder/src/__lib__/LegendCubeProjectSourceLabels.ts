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
 * What the source dialog says on a host that reads one project's own
 * sources (`CubeHost.project`), e.g. Studio
 */
export const CUBE_PROJECT_SOURCE_LABEL = {
  RUNS_ON: (runtime: string): string => `Runs on ${runtime}`,
  READING_RUNTIME: "reading the project's lakehouse runtime",
  NO_INGEST_DEFINITIONS: 'The project has no ingest definitions.',
  NO_DATA_PRODUCTS: 'The project has no data products.',
} as const;
