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

import type { DSL_LegendStudioApplicationPlugin_Extension } from '../LegendStudioApplicationPlugin.js';

// ── Response types ────────────────────────────────────────────────────────────

export type DataSpaceExecutionContextMeta = {
  /**
   * The execution context's original name, unchanged.
   */
  name: string;
  description: string;
};

export type DataSpaceDiagramMeta = {
  /**
   * The diagram's original path reference, unchanged.
   */
  diagram: string;
  title: string;
  description: string;
};

export type DataSpaceExecutableMeta = {
  /**
   * The executable's original id, unchanged (may be absent for executables
   * declared without an id).
   */
  id: unknown;
  title: string;
  description: string;
};

export type DataSpaceDocResponse = {
  title: string;
  description: string;
  /**
   * Omitted (rather than empty) when the data space has none.
   */
  executionContexts?: DataSpaceExecutionContextMeta[] | undefined;
  diagrams?: DataSpaceDiagramMeta[] | undefined;
  executables?: DataSpaceExecutableMeta[] | undefined;
};

// ── Request type ──────────────────────────────────────────────────────────────

export type DataSpaceDocRequest = {
  /**
   * Raw Pure grammar text containing the data space definitions.
   */
  definitions: string;
  /**
   * Fully-qualified name of the data space (e.g. dataSpace::MY_SPACE).
   */
  data_space_name: string;
  /**
   * When false (the server default) existing meaningful titles and
   * descriptions are preserved and only empty or placeholder values are
   * filled. When true every slot is regenerated.
   */
  overwrite?: boolean;
  /**
   * LLM model override (uses server default if omitted).
   */
  model?: string;
};

// ── Plugin extension interface ────────────────────────────────────────────────

export interface DSL_DataSpace_LegendStudioApplicationPlugin_Extension
  extends DSL_LegendStudioApplicationPlugin_Extension {
  /**
   * Generate AI-suggested documentation for a data space (title, description,
   * and the titles/descriptions of its execution contexts, diagrams and
   * executables).
   */
  getExtraDataSpaceDocumentationAISuggester?(
    request: DataSpaceDocRequest,
    legendAIUrl: string,
  ): Promise<DataSpaceDocResponse>;
}
