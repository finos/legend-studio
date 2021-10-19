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
import type {
  QueryPluginManager,
  QuerySetupOptionRendererConfiguration,
  QuerySetupRenderer,
  QuerySetupState,
  QuerySetupStore,
} from '@finos/legend-query';
import { QueryPlugin } from '@finos/legend-query';
import { SquareIcon } from '@finos/legend-art';
import { DataSpaceQuerySetupState } from '../../stores/query/DataSpaceQuerySetupState';
import { DataspaceQuerySetup } from './DataSpaceQuerySetup';

export class DSLDataSpace_QueryPlugin extends QueryPlugin {
  constructor() {
    super(packageJson.extensions.queryPlugin, packageJson.version);
  }

  install(pluginManager: QueryPluginManager): void {
    pluginManager.registerQueryPlugin(this);
  }

  override getExtraQuerySetupOptionRendererConfigurations(): QuerySetupOptionRendererConfiguration[] {
    return [
      {
        key: 'data-space-query-option',
        renderer: (
          setupStore: QuerySetupStore,
        ): React.ReactNode | undefined => {
          const createQuery = (): void =>
            setupStore.setSetupState(
              new DataSpaceQuerySetupState(setupStore.queryStore),
            );
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
}
