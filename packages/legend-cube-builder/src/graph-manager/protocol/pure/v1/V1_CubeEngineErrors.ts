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

import { NetworkClientError, type PlainObject } from '@finos/legend-shared';
import {
  CubeEngineError,
  CubeEngineErrorKind,
  type NodeId,
} from '../../../CubeEngine.js';
import { V1_parseCubeSourceId } from './V1_CubeLambdaSerializer.js';

// Engine errors → `CubeEngineError`s on canvas nodes (PLAN §8.7). A compile
// error echoes the stamp of the innermost failing protocol node, so it goes on
// that node; plan-time, database and network errors carry no stamp, so they
// go on the node being typed or run.

const COMPILATION_ERROR_TYPES = new Set(['COMPILATION', 'PARSER']);

/** The engine's error payload: `{message, errorType?, sourceInformation?, trace?}` */
const readPayload = (
  payload: unknown,
): { message: string; errorType?: string; sourceId?: string } | undefined => {
  if (!payload || typeof payload !== 'object') {
    return undefined;
  }
  const { message, errorType, sourceInformation } = payload as PlainObject;
  if (typeof message !== 'string' || !message.trim()) {
    return undefined;
  }
  const sourceId =
    sourceInformation && typeof sourceInformation === 'object'
      ? (sourceInformation as PlainObject).sourceId
      : undefined;
  return {
    message,
    ...(typeof errorType === 'string' ? { errorType } : {}),
    ...(typeof sourceId === 'string' ? { sourceId } : {}),
  };
};

/**
 * The error of an engine payload (a failed call's, or a batch key's), placed
 * on the stamped node, or else on the fallback node. Its Java trace is dropped.
 */
export const V1_buildCubeEngineError = (
  payload: unknown,
  fallbackNodeId: NodeId | undefined,
  kind: CubeEngineErrorKind,
): CubeEngineError | undefined => {
  const read = readPayload(payload);
  if (!read) {
    return undefined;
  }
  const origin = V1_parseCubeSourceId(read.sourceId);
  return new CubeEngineError(
    read.errorType && COMPILATION_ERROR_TYPES.has(read.errorType)
      ? CubeEngineErrorKind.COMPILE
      : kind,
    read.message,
    origin?.nodeId ?? fallbackNodeId,
    origin?.role,
  );
};

/**
 * The error of a failed engine call: the engine's own message when it sent
 * one, else a network error
 */
export const V1_toCubeEngineError = (
  error: unknown,
  fallbackNodeId: NodeId | undefined,
  kind: CubeEngineErrorKind,
): CubeEngineError => {
  if (error instanceof CubeEngineError) {
    return error.nodeId !== undefined || fallbackNodeId === undefined
      ? error
      : new CubeEngineError(error.kind, error.detail, fallbackNodeId);
  }
  if (error instanceof NetworkClientError) {
    const fromPayload = V1_buildCubeEngineError(
      error.payload,
      fallbackNodeId,
      kind,
    );
    if (fromPayload) {
      return fromPayload;
    }
  }
  return new CubeEngineError(
    CubeEngineErrorKind.NETWORK,
    error instanceof Error && error.message
      ? error.message
      : `The engine couldn't be reached`,
    fallbackNodeId,
  );
};
