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

import packageJson from '../../../package.json' assert { type: 'json' };
import {
  type QueryEditorActionConfiguration,
  LegendQueryApplicationPlugin,
  ExistingQueryEditorStore,
} from '@finos/legend-application-query';
import { ArrowCircleUpIcon } from '@finos/legend-art';
import { generateQueryProductionizerRoute } from '../../__lib__/studio/DSL_Service_LegendStudioNavigation.js';
import { StoreProjectData } from '@finos/legend-server-depot';
import { parseProjectIdentifier } from '@finos/legend-storage';
import { buildUrl } from '@finos/legend-shared';
import { ServiceRegisterAction } from './ServiceRegisterModal.js';

export class DSL_Service_LegendQueryApplicationPlugin extends LegendQueryApplicationPlugin {
  constructor() {
    super(packageJson.extensions.applicationQueryPlugin, packageJson.version);
  }

  override getExtraQueryEditorActionConfigurations(): QueryEditorActionConfiguration[] {
    return [
      {
        key: 'productionize-query',
        renderer: (editorStore, queryBuilderState) => {
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

          const proceed = (): void => {
            queryBuilderState.changeDetectionState.alertUnsavedChanges(() => {
              openQueryProductionizer().catch(
                editorStore.applicationStore.alertUnhandledError,
              );
            });
          };

          return (
            <button
              className="query-editor__header__action btn--dark"
              tabIndex={-1}
              onClick={proceed}
              disabled={!(editorStore instanceof ExistingQueryEditorStore)}
              title={
                !(editorStore instanceof ExistingQueryEditorStore)
                  ? 'Please save your query first before productionizing'
                  : 'Productionize query...'
              }
            >
              <ArrowCircleUpIcon className="query-editor__header__action__icon--productionize" />
              <div className="query-editor__header__action__label">
                Productionize Query
              </div>
            </button>
          );
        },
      },
      {
        key: 'register-service',
        renderer: (editorStore, queryBuilderState) => (
          <ServiceRegisterAction
            editorStore={editorStore}
            queryBuilderState={queryBuilderState}
          />
        ),
      },
    ];
  }
}
