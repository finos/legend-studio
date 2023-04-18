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
import type { QuerySetupLandingPageStore } from '../stores/QuerySetupStore.js';
import {
  ArrowCircleUpIcon,
  BrainIcon,
  DroidIcon,
  ManageSearchIcon,
  PlusIcon,
  RobotIcon,
} from '@finos/legend-art';
import {
  generateCloneServiceQuerySetupRoute,
  generateCreateMappingQuerySetupRoute,
  generateEditExistingQuerySetupRoute,
  generateLoadProjectServiceQuerySetup,
  generateQueryProductionizerSetupRoute,
  generateUpdateExistingServiceQuerySetup,
  LEGEND_QUERY_ROUTE_PATTERN,
} from '../__lib__/LegendQueryNavigation.js';
import {
  type ApplicationPageEntry,
  type LegendApplicationSetup,
} from '@finos/legend-application';
import { CloneQueryServiceSetup } from './CloneQueryServiceSetup.js';
import { QueryProductionizerSetup } from './QueryProductionizerSetup.js';
import { UpdateExistingServiceQuerySetup } from './UpdateExistingServiceQuerySetup.js';
import { LoadProjectServiceQuerySetup } from './LoadProjectServiceQuerySetup.js';
import {
  configureCodeEditorComponent,
  setupPureLanguageService,
} from '@finos/legend-lego/code-editor';

export class Core_LegendQueryApplicationPlugin extends LegendQueryApplicationPlugin {
  static NAME = packageJson.extensions.applicationQueryPlugin;

  constructor() {
    super(Core_LegendQueryApplicationPlugin.NAME, packageJson.version);
  }

  override getExtraApplicationSetups(): LegendApplicationSetup[] {
    return [
      async (applicationStore) => {
        await configureCodeEditorComponent(applicationStore);
        setupPureLanguageService({});
      },
    ];
  }

  override getExtraApplicationPageEntries(): ApplicationPageEntry[] {
    return [
      {
        key: 'clone-service-query-setup-application-page',
        addressPatterns: [LEGEND_QUERY_ROUTE_PATTERN.CLONE_SERVICE_QUERY_SETUP],
        renderer: CloneQueryServiceSetup,
      },
      {
        key: 'query-productionizer-setup-application-page',
        addressPatterns: [
          LEGEND_QUERY_ROUTE_PATTERN.QUERY_PRODUCTIONIZER_SETUP,
        ],
        renderer: QueryProductionizerSetup,
      },
      {
        key: 'update-existing-service-query-setup-application-page',
        addressPatterns: [
          LEGEND_QUERY_ROUTE_PATTERN.UPDATE_EXISTING_SERVICE_QUERY_SETUP,
        ],
        renderer: UpdateExistingServiceQuerySetup,
      },
      {
        key: 'load-project-service-query-setup-application-page',
        addressPatterns: [
          LEGEND_QUERY_ROUTE_PATTERN.LOAD_PROJECT_SERVICE_QUERY_SETUP,
        ],
        renderer: LoadProjectServiceQuerySetup,
      },
    ];
  }

  override getExtraQuerySetupActionConfigurations(): QuerySetupActionConfiguration[] {
    return [
      {
        key: 'open-existing-query',
        isAdvanced: false,
        isCreateAction: false,
        action: async (setupStore: QuerySetupLandingPageStore) => {
          setupStore.applicationStore.navigationService.navigator.goToLocation(
            generateEditExistingQuerySetupRoute(),
          );
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
        action: async (setupStore: QuerySetupLandingPageStore) => {
          setupStore.applicationStore.navigationService.navigator.goToAddress(
            setupStore.applicationStore.config.taxonomyApplicationUrl,
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
        action: async (setupStore: QuerySetupLandingPageStore) => {
          setupStore.applicationStore.navigationService.navigator.goToLocation(
            generateCreateMappingQuerySetupRoute(),
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
        action: async (setupStore: QuerySetupLandingPageStore) => {
          setupStore.applicationStore.navigationService.navigator.goToLocation(
            generateCloneServiceQuerySetupRoute(),
          );
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
        tag: QuerySetupActionTag.PRODUCTIONIZATION,
        action: async (setupStore: QuerySetupLandingPageStore) => {
          setupStore.applicationStore.navigationService.navigator.goToLocation(
            generateUpdateExistingServiceQuerySetup(),
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
        tag: QuerySetupActionTag.PRODUCTIONIZATION,
        action: async (setupStore: QuerySetupLandingPageStore) => {
          setupStore.applicationStore.navigationService.navigator.goToLocation(
            generateLoadProjectServiceQuerySetup(),
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
        tag: QuerySetupActionTag.PRODUCTIONIZATION,
        action: async (setupStore: QuerySetupLandingPageStore) => {
          setupStore.applicationStore.navigationService.navigator.goToLocation(
            generateQueryProductionizerSetupRoute(),
          );
        },
        label: 'Productionize an existing query',
        className: 'query-setup__landing-page__action--productionize-query',
        icon: <ArrowCircleUpIcon />,
      },
    ];
  }
}
