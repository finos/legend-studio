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

import { NAVIGATION_ZONE_SEPARATOR } from '@finos/legend-application';
import type { V1_DataProduct } from '@finos/legend-graph';

export enum DATA_PRODUCT_VIEWER_ACTIVITY_MODE {
  DESCRIPTION = 'description',
  DIAGRAM_VIEWER = 'diagram-viewer',
  MODELS_DOCUMENTATION = 'models-documentation',
  QUICK_START = 'quick-start',
  EXECUTION_CONTEXT = 'execution-context',
  DATA_ACCESS = 'data-access',
  /// -----------
  DATA_STORES = 'data-stores', // TODO: with test-data, also let user call TDS query on top of these
  DATA_AVAILABILITY = 'data-availability',
  DATA_READINESS = 'data-readiness',
  DATA_COST = 'data-cost',
  DATA_GOVERNANCE = 'data-governance',
  INFO = 'info', // TODO: test coverage? (or maybe this should be done in elements/diagrams/data-quality section)
  SUPPORT = 'support',
}

const generateAnchorChunk = (text: string): string =>
  encodeURIComponent(
    text
      .trim()
      .toLowerCase() // anchor is case-insensitive
      .replace(/\s+/gu, '-'), // spaces will be replaced by hyphens
  );
export const generateAnchorForActivity = (activity: string): string =>
  generateAnchorChunk(activity);
export const extractActivityFromAnchor = (anchor: string): string =>
  decodeURIComponent(anchor);
export const generateAnchorForQuickStart = (product: V1_DataProduct): string =>
  [
    DATA_PRODUCT_VIEWER_ACTIVITY_MODE.QUICK_START,
    generateAnchorChunk(product.title ?? product.name),
  ].join(NAVIGATION_ZONE_SEPARATOR);
