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

import { lambda, needsDatabaseType } from '@finos/legend-cube';
import type { PlainObject } from '@finos/legend-shared';
import { flowResult } from 'mobx';
import { formatDisabledReasons } from '../__lib__/LegendCubeLabels.js';
import { serializeCubeLambdaForHost } from '../graph-manager/protocol/pure/CubeEngineBuilder.js';
import type { CubeEditorState } from './CubeEditorState.js';

/**
 * The query of the step that runs, as a lambda for a host to keep, e.g. as
 * a materialized view of a Studio ingest definition: written for the
 * database it runs on, as Execute writes it, but with no runtime and no row
 * limit, which whoever runs it adds. Fails when Execute can't run.
 */
export const buildCubeRunningStepLambda = async (
  editorState: CubeEditorState,
): Promise<PlainObject> => {
  const { execution, document, emitter } = editorState;
  const { query, context } = document;
  const captureId = query.selected;
  const runtime = context?.runtime;
  const model = context?.model;
  if (
    !execution.canExecute ||
    captureId === undefined ||
    runtime === undefined ||
    model === undefined
  ) {
    throw new Error(formatDisabledReasons(execution.disabledReasons));
  }
  let databaseType: string | undefined;
  if (needsDatabaseType(query, captureId)) {
    await flowResult(editorState.loadModelOutline(model));
    databaseType = editorState.getRunDatabaseType(
      query,
      captureId,
      model,
      runtime,
    );
  }
  return serializeCubeLambdaForHost(
    lambda(
      [],
      [emitter.emitRelation(captureId, { withRowOrder: true, databaseType })],
    ),
  );
};
