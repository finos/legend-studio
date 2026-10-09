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

import type { IR } from '@finos/legend-cube';
import type { PlainObject } from '@finos/legend-shared';
import {
  CUBE_DATA_PRODUCT_RUNTIME_PATH,
  type CubeDataProductProject,
} from '../../../CubeDataProduct.js';

// The models a data product cube's engine calls run on (PLAN §6.8), built for
// each call and never saved: the project at its saved version, and for a run
// a lakehouse runtime at Cube's fixed path, whose environment and warehouse
// are resolved for the viewer

const splitPath = (path: string): { package: string; name: string } => {
  const index = path.lastIndexOf('::');
  return { package: path.slice(0, index), name: path.slice(index + 2) };
};

/** The project at the version its data products were deployed from: never a moving alias */
const pointerOf = (project: CubeDataProductProject): PlainObject => ({
  _type: 'pointer',
  sdlcInfo: {
    _type: 'alloy',
    baseVersion: 'latest',
    version: project.versionId,
    packageableElementPointers: [],
    groupId: project.groupId,
    artifactId: project.artifactId,
  },
});

/** Whether a lambda reads a data product's access point, anywhere in it */
export const V1_hasCubeDataProductAccessor = (ir: IR): boolean => {
  const visit = (value: unknown): boolean => {
    if (Array.isArray(value)) {
      return value.some(visit);
    }
    if (!value || typeof value !== 'object') {
      return false;
    }
    const node = value as PlainObject;
    if (node.k === 'dataProductAccessor') {
      return true;
    }
    return node.k !== 'raw' && Object.values(node).some(visit);
  };
  return visit(ir);
};

/** The model typing runs on: the project alone, with no runtime */
export const V1_buildCubeDataProductTypingContext = (
  project: CubeDataProductProject,
): PlainObject => pointerOf(project);

/**
 * The model a run runs on: the project, then a model holding only the
 * lakehouse runtime at Cube's fixed path, with the viewer's environment and
 * the warehouse, always given
 */
export const V1_buildCubeDataProductExecutionContext = (
  project: CubeDataProductProject,
  environment: string,
  warehouse: string,
): PlainObject => ({
  _type: 'combination',
  contexts: [
    pointerOf(project),
    {
      _type: 'data',
      elements: [
        {
          _type: 'runtime',
          ...splitPath(CUBE_DATA_PRODUCT_RUNTIME_PATH),
          runtimeValue: {
            _type: 'LakehouseRuntime',
            connectionStores: [],
            connections: [],
            mappings: [],
            environment,
            warehouse,
          },
        },
      ],
    },
  ],
});
