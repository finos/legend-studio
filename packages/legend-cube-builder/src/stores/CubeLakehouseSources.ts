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

import {
  IngestDatasetSource,
  type ModelContext,
  type QueryRule,
} from '@finos/legend-cube';
import { CUBE_DATA_PRODUCT_ENVIRONMENT_LABELS } from '../__lib__/LegendCubeDataProductLabels.js';
import { CUBE_INGEST_JOIN_MESSAGE } from '../__lib__/LegendCubeIngestLabels.js';
import { getCubeDataProductProject } from '../graph-manager/CubeDataProduct.js';
import { parseCubeIngestUrn } from '../graph-manager/CubeIngest.js';

// Data products and ingest data sets in one cube (PLAN §11.29): they mix
// when they are one project's, in one Mode. A cube that reads both is a data
// product cube; its ingest data sets must be its project's, deployed to its
// Mode, which the engine adapter checks again before any call

/**
 * The rule the editor adds over a data product cube's query on a host that
 * lists a data product's project's definitions: each ingest data set is the
 * project's, deployed from SDLC to the cube's Mode, else invalid, saying
 * why. None for another cube
 */
export const buildCubeIngestJoinRule = (
  model: ModelContext | undefined,
): QueryRule | undefined => {
  const project = model ? getCubeDataProductProject(model) : undefined;
  if (!project) {
    return undefined;
  }
  return (query) => {
    const errors = new Map<string, string[]>();
    query.nodes.forEach((node) => {
      if (!(node instanceof IngestDatasetSource)) {
        return;
      }
      const urn = parseCubeIngestUrn(node.ingestDefinitionUrn);
      const problem = !urn
        ? CUBE_INGEST_JOIN_MESSAGE.NOT_SDLC(node.ingestDefinition)
        : urn.groupId !== project.groupId ||
            urn.artifactId !== project.artifactId
          ? CUBE_INGEST_JOIN_MESSAGE.OTHER_PROJECT(
              node.ingestDefinition,
              `${project.groupId}:${project.artifactId}`,
            )
          : urn.environmentType !== project.environmentType
            ? CUBE_INGEST_JOIN_MESSAGE.OTHER_MODE(
                node.ingestDefinition,
                CUBE_DATA_PRODUCT_ENVIRONMENT_LABELS[project.environmentType],
              )
            : undefined;
      if (problem) {
        errors.set(node.id, [problem]);
      }
    });
    return errors;
  };
};
