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
  /** The Ingest tab on a data product cube, whose mode it keeps (PLAN §11.29) */
  JOINS_DATA_PRODUCTS: (mode: string): string =>
    `The cube's data products run in ${mode}: its ingest data sets run there too.`,
  /** The Data Product tab on an ingest cube, whose mode it keeps (PLAN §11.29) */
  JOINS_INGEST: (mode: string): string =>
    `The cube's ingest data sets run in ${mode}: its data products run there too.`,
} as const;
