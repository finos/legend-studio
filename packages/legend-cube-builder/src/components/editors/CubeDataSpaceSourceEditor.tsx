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

import { PanelLoadingIndicator } from '@finos/legend-art';
import { guaranteeType } from '@finos/legend-shared';
import { observer } from 'mobx-react-lite';
import {
  CUBE_DATA_SPACE_EDITOR_HINT,
  CUBE_DATA_SPACE_MESSAGE,
} from '../../__lib__/LegendCubeDataSpaceLabels.js';
import { LEGEND_CUBE_TEST_ID } from '../../__lib__/LegendCubeTesting.js';
import { CubeDataSpaceDraft } from '../../stores/editors/CubeDataSpaceDraft.js';
import type { CubeNodeEditorProps } from './CubeNodeEditorRegistry.js';

/**
 * A data space source's editor (PLAN §11.25): the host's query builder on
 * its data space, filling the panel's body, with its data space, execution
 * context and entity, its explorer, columns and filter. What else a query
 * does, Cube's own steps do after the source, as the line above it says.
 */
export const CubeDataSpaceSourceEditor = observer(
  (props: CubeNodeEditorProps) => {
    const { editorState, draft } = props;
    const { session, openError } = guaranteeType(draft, CubeDataSpaceDraft);
    const { dataSpaceEditor } = editorState.host;
    return (
      <div className="flex h-full min-h-0 flex-col gap-1">
        <div className="shrink-0 text-sm text-[var(--color-text-secondary)]">
          {CUBE_DATA_SPACE_EDITOR_HINT}
        </div>
        <div
          className="relative min-h-0 flex-1"
          data-testid={LEGEND_CUBE_TEST_ID.DATA_SPACE_EDITOR}
        >
          {!session || !dataSpaceEditor ? (
            <div
              className="text-base text-[var(--color-status-error)]"
              role="alert"
            >
              {openError}
            </div>
          ) : session.loadError !== undefined ? (
            <div
              className="whitespace-pre-wrap text-base text-[var(--color-status-error)]"
              role="alert"
            >
              {session.loadError}
            </div>
          ) : session.isLoading ? (
            <>
              <PanelLoadingIndicator isLoading={true} />
              <div
                className="py-4 text-center text-base text-[var(--color-text-secondary)]"
                role="status"
              >
                {CUBE_DATA_SPACE_MESSAGE.LOADING}
              </div>
            </>
          ) : (
            dataSpaceEditor.renderSession(session)
          )}
        </div>
      </div>
    );
  },
);
