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

import type { DataSpaceViewerState } from '../stores/DataSpaceViewerState.js';
import { observer } from 'mobx-react-lite';
import { DataSpaceQuickStart } from './DataSpaceQuickStart.js';
import { DataSpaceDataAccess } from './DataSpaceDataAccess.js';
import { DataSpaceDescription } from './DataSpaceDescription.js';
import { useEffect } from 'react';
import { ModelsDocumentation } from '@finos/legend-lego/model-documentation';
import { DiagramViewer } from '@finos/legend-extension-dsl-diagram';
import {
  generateAnchorForActivity,
  generateAnchorForDiagram,
} from '../stores/DataSpaceViewerNavigation.js';

export const DataSpaceWiki = observer(
  (props: { dataSpaceViewerState: DataSpaceViewerState }) => {
    const { dataSpaceViewerState } = props;

    useEffect(() => {
      if (
        dataSpaceViewerState.layoutState.wikiPageNavigationCommand &&
        dataSpaceViewerState.layoutState.isWikiPageFullyRendered
      ) {
        dataSpaceViewerState.layoutState.navigateWikiPageAnchor();
      }
    }, [
      dataSpaceViewerState,
      dataSpaceViewerState.layoutState.wikiPageNavigationCommand,
      dataSpaceViewerState.layoutState.isWikiPageFullyRendered,
    ]);

    useEffect(() => {
      if (dataSpaceViewerState.layoutState.isWikiPageFullyRendered) {
        dataSpaceViewerState.layoutState.registerWikiPageScrollObserver();
      }
      return () =>
        dataSpaceViewerState.layoutState.unregisterWikiPageScrollObserver();
    }, [
      dataSpaceViewerState,
      dataSpaceViewerState.layoutState.isWikiPageFullyRendered,
    ]);

    return (
      <div className="data-space__viewer__wiki">
        <DataSpaceDescription dataSpaceViewerState={dataSpaceViewerState} />
        <DiagramViewer
          applicationStore={dataSpaceViewerState.applicationStore}
          diagramViewerState={dataSpaceViewerState.diagramViewerState}
          actions={{
            onQueryClass: dataSpaceViewerState.queryClass,
            onViewClassDocumentation: (classPath) =>
              dataSpaceViewerState.modelsDocumentationState.viewClassDocumentation(
                classPath,
              ),
            hasClassDocumentation: (classPath) =>
              dataSpaceViewerState.modelsDocumentationState.hasClassDocumentation(
                classPath,
              ),
            onSyncZoneWithNavigation: (diagram) => {
              dataSpaceViewerState.syncZoneWithNavigation(
                generateAnchorForDiagram(diagram),
              );
            },
            onGenerateAnchorForActivity: (activity) => {
              return generateAnchorForActivity(activity);
            },
            onChangeZone: (zone, force) => {
              dataSpaceViewerState.changeZone(zone, force);
            },
            onSetWikiPageAnchor: (anchorKey: string, element: HTMLElement) => {
              dataSpaceViewerState.layoutState.setWikiPageAnchor(
                anchorKey,
                element,
              );
            },
            onUnsetWikiPageAnchor: (anchorKey: string) => {
              dataSpaceViewerState.layoutState.unsetWikiPageAnchor(anchorKey);
            },
          }}
        />
        <ModelsDocumentation
          modelsDocumentationState={
            dataSpaceViewerState.modelsDocumentationState
          }
          applicationStore={dataSpaceViewerState.applicationStore}
        />
        <DataSpaceQuickStart dataSpaceViewerState={dataSpaceViewerState} />
        <DataSpaceDataAccess dataSpaceViewerState={dataSpaceViewerState} />
      </div>
    );
  },
);
