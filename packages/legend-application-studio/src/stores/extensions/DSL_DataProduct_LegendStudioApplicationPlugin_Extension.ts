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

// ── Response types ─────────────────────────────────────────────────────────────

export type DataProductMeta = {
  title: string;
  description: string;
  confidence: number;
};

export type AccessPointGroupMeta = {
  name: string;
  title: string;
  description: string;
  confidence: number;
};

export type AccessPointMeta = {
  group: string;
  name: string;
  title: string;
  description: string;
  confidence: number;
};

export type DataProductDocResponse = {
  data_product: DataProductMeta;
  access_point_groups: AccessPointGroupMeta[];
  access_points: AccessPointMeta[];
};

// ── Request type ───────────────────────────────────────────────────────────────

export type DataProductDocRequest = {
  /**
   * Raw Pure grammar text containing the data product definitions.
   */
  definitions: string;
  /**
   * Fully-qualified name of the data product (e.g. dataProduct::MY_PRODUCT).
   */
  data_product_name: string;
  /**
   * LLM model override (uses server default if omitted).
   */
  model?: string;
};

// ── Plugin extension interface ─────────────────────────────────────────────────

export interface DSL_DataProduct_LegendStudioApplicationPlugin_Extension
  extends DSL_LegendStudioApplicationPlugin_Extension {
  /**
   * Generate AI-suggested documentation for a data product
   * (title, description, access point groups, access points).
   */
  getExtraDataProductDocumentationAISuggester?(
    request: DataProductDocRequest,
    legendAIUrl: string,
  ): Promise<DataProductDocResponse>;
}
