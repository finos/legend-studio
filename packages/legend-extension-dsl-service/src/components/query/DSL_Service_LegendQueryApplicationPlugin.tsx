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
  type ExistingQueryEditorActionRendererConfiguration,
  LegendQueryApplicationPlugin,
} from '@finos/legend-application-query';
import { ArrowCirceUpIcon } from '@finos/legend-art';
import { generateQueryProductionizerRoute } from '../../stores/studio/DSL_Service_LegendStudioRouter.js';
import { ProjectData } from '@finos/legend-server-depot';
import { parseProjectIdentifier } from '@finos/legend-storage';
import { buildUrl } from '@finos/legend-shared';
import { ServiceRegisterAction } from '../studio/ServiceRegisterModal.js';

export class DSL_Service_LegendQueryApplicationPlugin extends LegendQueryApplicationPlugin {
  constructor() {
    super(packageJson.extensions.applicationQueryPlugin, packageJson.version);
  }

  override getExtraExistingQueryActionRendererConfiguration(): ExistingQueryEditorActionRendererConfiguration[] {
    return [
      {
        key: 'productionize-query',
        renderer: (editorStore, queryBuilderState) => {
          const openQueryProductionizer = async (): Promise<void> => {
            // fetch project data
            const project = ProjectData.serialization.fromJson(
              await editorStore.depotServerClient.getProject(
                editorStore.query.groupId,
                editorStore.query.artifactId,
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
              editorStore.applicationStore.navigator.goToAddress(
                buildUrl([
                  editorStore.applicationStore.config.studioUrl,
                  generateQueryProductionizerRoute(editorStore.query.id),
                ]),
                { ignoreBlocking: true },
              );
            } else {
              editorStore.applicationStore.notifyWarning(
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
              title="Productionize query..."
            >
              <ArrowCirceUpIcon />
            </button>
          );
        },
      },
      {
        key: 'register-service',
        renderer: (editorStore, queryBuilderState) => (
          <ServiceRegisterAction editorStore={editorStore} />
        ),
      },
    ];
  }
}
