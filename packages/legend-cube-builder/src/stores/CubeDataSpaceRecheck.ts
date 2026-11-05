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
  type DataSpaceSource,
  emitDataSpaceSource,
  type IR,
  lambda,
  type ModelContext,
  type Schema,
} from '@finos/legend-cube';
import {
  CubeEngineError,
  CubeEngineErrorKind,
  type CubeEngine,
  type NodeId,
} from '../graph-manager/CubeEngine.js';

/** The lambda that types a set data space source: `{| <its relation>}` */
export const buildCubeDataSpaceTypingLambda = (source: DataSpaceSource): IR =>
  lambda([], [emitDataSpaceSource(source)]);

/**
 * Types a cube's set data space sources with the engine (PLAN §11.25), in
 * one call: the columns of each one's relation, compiled against the cube's
 * project, which needs no mapping. One answer per source, failures included;
 * never rejects. An unset source has no relation, so none is sent.
 */
export const recheckCubeDataSpaceSources = async (
  engine: CubeEngine,
  model: ModelContext,
  sources: readonly DataSpaceSource[],
): Promise<Map<NodeId, Schema | CubeEngineError>> => {
  const set = sources.filter((source) => !source.isUnset());
  if (!set.length) {
    return new Map();
  }
  try {
    return await engine.typeLambdas(
      model,
      new Map(
        set.map((source) => [
          source.id,
          buildCubeDataSpaceTypingLambda(source),
        ]),
      ),
    );
  } catch (error) {
    const failure =
      error instanceof CubeEngineError
        ? error
        : new CubeEngineError(
            CubeEngineErrorKind.NETWORK,
            error instanceof Error ? error.message : String(error),
          );
    return new Map(set.map((source) => [source.id, failure]));
  }
};
