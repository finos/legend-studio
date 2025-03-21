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

import packageJson from '../../../package.json' with { type: 'json' };
import {
  LegendQueryApplicationPlugin,
  ExistingQueryEditorStore,
  QueryBuilderActionConfig_QueryApplication,
} from '@finos/legend-application-query';
import { ArrowCircleUpIcon, RocketIcon } from '@finos/legend-art';
import { generateQueryProductionizerRoute } from '../../__lib__/studio/DSL_Service_LegendStudioNavigation.js';
import { StoreProjectData } from '@finos/legend-server-depot';
import { parseProjectIdentifier } from '@finos/legend-storage';
import { buildUrl } from '@finos/legend-shared';
import { ServiceRegisterModal } from './ServiceRegisterModal.js';
import type { QueryBuilderMenuActionConfiguration } from '@finos/legend-query-builder';

export class DSL_Service_LegendQueryApplicationPlugin extends LegendQueryApplicationPlugin {
  constructor() {
    super(packageJson.extensions.applicationQueryPlugin, packageJson.version);
  }

  getExtraQueryBuilderExportMenuActionConfigurations?(): QueryBuilderMenuActionConfiguration[] {
    return [
      {
        key: 'export-as-productionized-query',
        title: 'Productionize query...',
        label: 'Productionized Query',
        disableFunc: (queryBuilderState): boolean => {
          if (
            queryBuilderState.workflowState.actionConfig instanceof
            QueryBuilderActionConfig_QueryApplication
          ) {
            const editorStore =
              queryBuilderState.workflowState.actionConfig.editorStore;
            return !(editorStore instanceof ExistingQueryEditorStore);
          }
          return true;
        },
        onClick: (queryBuilderState): void => {
          if (
            queryBuilderState.workflowState.actionConfig instanceof
            QueryBuilderActionConfig_QueryApplication
          ) {
            const editorStore =
              queryBuilderState.workflowState.actionConfig.editorStore;
            const openQueryProductionizer = async (): Promise<void> => {
              if (!(editorStore instanceof ExistingQueryEditorStore)) {
                return;
              }
              // fetch project data
              const project = StoreProjectData.serialization.fromJson(
                await editorStore.depotServerClient.getProject(
                  editorStore.lightQuery.groupId,
                  editorStore.lightQuery.artifactId,
                ),
              );

              // find the matching SDLC instance
              const projectIDPrefix = parseProjectIdentifier(
                project.projectId,
              ).prefix;
              const matchingSDLCEntry =
                editorStore.applicationStore.config.studioInstances.find(
                  (entry) => entry.sdlcProjectIDPrefix === projectIDPrefix,
                );
              if (matchingSDLCEntry) {
                editorStore.applicationStore.navigationService.navigator.goToAddress(
                  buildUrl([
                    editorStore.applicationStore.config.studioApplicationUrl,
                    generateQueryProductionizerRoute(editorStore.lightQuery.id),
                  ]),
                  { ignoreBlocking: true },
                );
              } else {
                editorStore.applicationStore.notificationService.notifyWarning(
                  `Can't find the corresponding SDLC instance to productionize the query`,
                );
              }
            };

            queryBuilderState.changeDetectionState.alertUnsavedChanges(() => {
              openQueryProductionizer().catch(
                editorStore.applicationStore.alertUnhandledError,
              );
            });
          }
        },
        icon: <ArrowCircleUpIcon />,
      },
      {
        key: 'export-as-dev-service',
        title: 'Register query as service',
        label: 'DEV Service',
        onClick: (queryBuilderState): void => {
          if (
            queryBuilderState.workflowState.actionConfig instanceof
            QueryBuilderActionConfig_QueryApplication
          ) {
            const editorStore =
              queryBuilderState.workflowState.actionConfig.editorStore;
            editorStore.setShowRegisterServiceModal(true);
          }
        },
        icon: <RocketIcon />,
        renderExtraComponent: (
          queryBuilderState,
        ): React.ReactNode | undefined => {
          if (
            queryBuilderState.workflowState.actionConfig instanceof
            QueryBuilderActionConfig_QueryApplication
          ) {
            const editorStore =
              queryBuilderState.workflowState.actionConfig.editorStore;
            return (
              <>
                {editorStore.showRegisterServiceModal && (
                  <ServiceRegisterModal
                    editorStore={editorStore}
                    onClose={(): void =>
                      editorStore.setShowRegisterServiceModal(false)
                    }
                    queryBuilderState={queryBuilderState}
                  />
                )}
              </>
            );
          }
          return undefined;
        },
      },
    ];
  }
}
