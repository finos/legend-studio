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

import {
  LegendQueryApplicationPlugin,
  QuerySetupActionTag,
  type QuerySetupActionConfiguration,
} from '../stores/LegendQueryApplicationPlugin.js';
import packageJson from '../../package.json';
import {
  CloneServiceQuerySetupState,
  CreateMappingQuerySetupState,
  EditExistingQuerySetupState,
  LoadProjectServiceQuerySetupState,
  QueryProductionizationSetupState,
  UpdateExistingServiceQuerySetupState,
  type QuerySetupStore,
} from '../stores/QuerySetupStore.js';
import {
  ArrowCirceUpIcon,
  BrainIcon,
  DroidIcon,
  ManageSearchIcon,
  PlusIcon,
  RobotIcon,
} from '@finos/legend-art';

export class Core_LegendQueryApplicationPlugin extends LegendQueryApplicationPlugin {
  static NAME = packageJson.extensions.applicationQueryPlugin;

  constructor() {
    super(Core_LegendQueryApplicationPlugin.NAME, packageJson.version);
  }

  override getExtraQuerySetupActionConfigurations(): QuerySetupActionConfiguration[] {
    return [
      {
        key: 'open-existing-query',
        isAdvanced: false,
        isCreateAction: false,
        action: async (setupStore: QuerySetupStore) => {
          setupStore.setSetupState(new EditExistingQuerySetupState(setupStore));
        },
        label: 'Open an existing query',
        className: 'query-setup__landing-page__action--existing-query',
        icon: (
          <ManageSearchIcon className="query-setup__landing-page__icon--search" />
        ),
      },
      {
        key: 'create-query-from-taxonomy',
        isAdvanced: false,
        isCreateAction: true,
        action: async (setupStore: QuerySetupStore) => {
          setupStore.applicationStore.navigator.goToAddress(
            setupStore.applicationStore.config.taxonomyUrl,
          );
        },
        label: 'Create query from taxonomy',
        className: 'query-setup__landing-page__action--taxonomy-query',
        icon: <BrainIcon />,
      },
      {
        key: 'create-mapping-query',
        isAdvanced: true,
        isCreateAction: true,
        action: async (setupStore: QuerySetupStore) => {
          setupStore.setSetupState(
            new CreateMappingQuerySetupState(setupStore),
          );
        },
        label: 'Create new query on a mapping',
        className: 'query-setup__landing-page__action--create-mapping-query',
        icon: <PlusIcon />,
      },
      {
        key: 'clone-service-query',
        isAdvanced: true,
        isCreateAction: true,
        action: async (setupStore: QuerySetupStore) => {
          setupStore.setSetupState(new CloneServiceQuerySetupState(setupStore));
        },
        label: 'Clone an existing service query',
        className: 'query-setup__landing-page__action--service-query',
        icon: <RobotIcon />,
      },
      // sdlc
      {
        key: 'update-existing-service-query',
        isAdvanced: false,
        isCreateAction: false,
        tag: QuerySetupActionTag.SDLC,
        action: async (setupStore: QuerySetupStore) => {
          setupStore.setSetupState(
            new UpdateExistingServiceQuerySetupState(setupStore),
          );
        },
        label: 'Update an existing service query',
        className: 'query-setup__landing-page__action--service-query',
        icon: <DroidIcon />,
      },
      {
        key: 'open-project-service-query',
        isAdvanced: true,
        isCreateAction: false,
        tag: QuerySetupActionTag.SDLC,
        action: async (setupStore: QuerySetupStore) => {
          setupStore.setSetupState(
            new LoadProjectServiceQuerySetupState(setupStore),
          );
        },
        label: 'Open service query from a project',
        className: 'query-setup__landing-page__action--service-query',
        icon: <DroidIcon />,
      },
      {
        key: 'productionize-query',
        isAdvanced: false,
        isCreateAction: true,
        tag: QuerySetupActionTag.SDLC,
        action: async (setupStore: QuerySetupStore) => {
          setupStore.setSetupState(
            new QueryProductionizationSetupState(setupStore),
          );
        },
        label: 'Productionize an existing query',
        className: 'query-setup__landing-page__action--productionize-query',
        icon: <ArrowCirceUpIcon />,
      },
    ];
  }
}
