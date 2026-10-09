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
import { extractElementNameFromPath } from '@finos/legend-graph';
import { LATEST_VERSION_ALIAS } from '@finos/legend-server-depot';
import { isNonNullable } from '@finos/legend-shared';
import type { DataSpaceExecutableAnalysisResult } from '../graph-manager/action/analytics/DataSpaceAnalysis.js';
import type { DiagramAnalysisResult } from '@finos/legend-extension-dsl-diagram';

export enum DATA_SPACE_VIEWER_ACTIVITY_MODE {
  DESCRIPTION = 'description',
  DATASPACE_LAKEHOUSE_ACCESS = 'dataspace-lakehouse-access',
  DIAGRAM_VIEWER = 'diagram-viewer',
  MODELS_DOCUMENTATION = 'models-documentation',
  QUICK_START = 'quick-start',
  EXECUTION_CONTEXT = 'execution-context',
  DATA_ACCESS = 'data-access',
  RELATED_DATA_SPACES = 'related-data-spaces',

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
export const generateAnchorForQuickStart = (
  quickStart: DataSpaceExecutableAnalysisResult,
): string =>
  [
    DATA_SPACE_VIEWER_ACTIVITY_MODE.QUICK_START,
    generateAnchorChunk(quickStart.title),
  ].join(NAVIGATION_ZONE_SEPARATOR);
export const generateAnchorForDiagram = (
  diagram: DiagramAnalysisResult,
): string =>
  [
    DATA_SPACE_VIEWER_ACTIVITY_MODE.DIAGRAM_VIEWER,
    generateAnchorChunk(diagram.title),
  ].join(NAVIGATION_ZONE_SEPARATOR);

const RELATED_DATA_SPACE_GAV_COORDINATE_SEPARATOR = ':';
const RELATED_DATA_SPACE_GAV_PATH_SEPARATOR = '|';
const RELATED_DATA_SPACE_ENTRY_SEPARATOR = ',';

export type DataSpaceWikiRelatedDataSpace = {
  name: string;
  groupId: string;
  artifactId: string;
  versionId: string;
  path: string;
  isInvalid?: boolean | undefined;
};

export const encodeRelatedDataSpaceGAV = (entry: {
  groupId: string;
  artifactId: string;
  versionId: string;
  path: string;
}): string =>
  `${[entry.groupId, entry.artifactId, entry.versionId].join(
    RELATED_DATA_SPACE_GAV_COORDINATE_SEPARATOR,
  )}${RELATED_DATA_SPACE_GAV_PATH_SEPARATOR}${entry.path}`;

export const generateRelatedDataSpaceRedirectPath = (
  relatedDataSpace: DataSpaceWikiRelatedDataSpace,
): string =>
  `${relatedDataSpace.groupId}:${relatedDataSpace.artifactId}:${LATEST_VERSION_ALIAS}/${relatedDataSpace.path}`;

export const parseRelatedDataSpaceGAV = (
  value: string,
): DataSpaceWikiRelatedDataSpace | undefined => {
  const separatorIdx = value.indexOf(RELATED_DATA_SPACE_GAV_PATH_SEPARATOR);
  if (separatorIdx === -1) {
    return undefined;
  }
  const gavPart = value.slice(0, separatorIdx);
  const path = value.slice(separatorIdx + 1);
  const coordinates = gavPart.split(
    RELATED_DATA_SPACE_GAV_COORDINATE_SEPARATOR,
  );
  if (coordinates.length !== 3) {
    return undefined;
  }
  const [groupId, artifactId, versionId] = coordinates;
  if (!groupId || !artifactId || !versionId || !path) {
    return undefined;
  }
  return {
    name: extractElementNameFromPath(path),
    groupId,
    artifactId,
    versionId,
    path,
  };
};

export const splitRelatedDataSpaceEntries = (value: string): string[] =>
  value
    .split(RELATED_DATA_SPACE_ENTRY_SEPARATOR)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

export const parseRelatedDataSpaceGAVs = (
  value: string,
): DataSpaceWikiRelatedDataSpace[] =>
  splitRelatedDataSpaceEntries(value)
    .map((entry) => parseRelatedDataSpaceGAV(entry))
    .filter(isNonNullable);
