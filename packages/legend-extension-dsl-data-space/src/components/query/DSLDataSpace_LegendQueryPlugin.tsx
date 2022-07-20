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

import packageJson from '../../../package.json';
import {
  LegendQueryPlugin,
  type QueryEditorStore,
  type QueryEditorHeaderLabeler,
  type QuerySetupOptionRendererConfiguration,
  type QuerySetupRenderer,
  type QuerySetupState,
  type QuerySetupStore,
} from '@finos/legend-query';
import { SquareIcon } from '@finos/legend-art';
import { DataSpaceQuerySetupState } from '../../stores/query/DataSpaceQuerySetupState.js';
import { DataspaceQuerySetup } from './DataSpaceQuerySetup.js';
import type { ApplicationPageEntry } from '@finos/legend-application';
import { DATA_SPACE_QUERY_EDITOR_ROUTE_PATTERN } from '../../stores/query/DSLDataSpace_LegendQueryRouter.js';
import { DataSpaceQueryEditor } from './DataSpaceQueryEditor.js';
import { DataSpaceQueryEditorStore } from '../../stores/query/DataSpaceQueryEditorStore.js';
import { extractElementNameFromPath } from '@finos/legend-graph';

export class DSLDataSpace_LegendQueryPlugin extends LegendQueryPlugin {
  constructor() {
    super(packageJson.extensions.queryPlugin, packageJson.version);
  }

  override getExtraApplicationPageEntries(): ApplicationPageEntry[] {
    return [
      // data space query editor
      {
        key: 'data-space-query-editor-application-page',
        urlPatterns: [DATA_SPACE_QUERY_EDITOR_ROUTE_PATTERN],
        renderer: DataSpaceQueryEditor,
      },
    ];
  }

  override getExtraQuerySetupOptionRendererConfigurations(): QuerySetupOptionRendererConfiguration[] {
    return [
      {
        key: 'data-space-query-option',
        renderer: (
          setupStore: QuerySetupStore,
        ): React.ReactNode | undefined => {
          const createQuery = (): void =>
            setupStore.setSetupState(new DataSpaceQuerySetupState(setupStore));
          return (
            <button
              className="query-setup__landing-page__option query-setup__landing-page__option--data-space"
              onClick={createQuery}
            >
              <div className="query-setup__landing-page__option__icon">
                <SquareIcon className="query-setup__landing-page__icon--data-space" />
              </div>
              <div className="query-setup__landing-page__option__label">
                Create query from data space
              </div>
            </button>
          );
        },
      },
    ];
  }

  override getExtraQuerySetupRenderers(): QuerySetupRenderer[] {
    return [
      (querySetupState: QuerySetupState): React.ReactNode | undefined => {
        if (querySetupState instanceof DataSpaceQuerySetupState) {
          return <DataspaceQuerySetup querySetupState={querySetupState} />;
        }
        return undefined;
      },
    ];
  }

  override getExtraQueryEditorHeaderLabelers(): QueryEditorHeaderLabeler[] {
    return [
      (editorStore: QueryEditorStore): React.ReactNode | undefined => {
        if (editorStore instanceof DataSpaceQueryEditorStore) {
          return (
            <div className="query-editor__header__label">
              <SquareIcon className="query-editor__header__label__icon icon--data-space" />
              {extractElementNameFromPath(editorStore.dataSpacePath)}
              <div className="query-editor__header__label__tag">
                {editorStore.executionContext}
              </div>
            </div>
          );
        }
        return undefined;
      },
    ];
  }
}
