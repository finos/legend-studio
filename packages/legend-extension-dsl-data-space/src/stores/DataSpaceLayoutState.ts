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

import { NAVIGATION_ZONE_SEPARATOR } from '@finos/legend-application';
import { makeObservable, override } from 'mobx';
import { type DataSpaceViewerState } from './DataSpaceViewerState.js';
import { at, guaranteeNonNullable } from '@finos/legend-shared';
import {
  DATA_SPACE_VIEWER_ACTIVITY_MODE,
  extractActivityFromAnchor,
  generateAnchorForActivity,
  generateAnchorForDiagram,
} from './DataSpaceViewerNavigation.js';
import { BaseLayoutState } from '@finos/legend-extension-dsl-data-product';

export const DATA_SPACE_WIKI_PAGE_SECTIONS = [
  DATA_SPACE_VIEWER_ACTIVITY_MODE.DESCRIPTION,
  DATA_SPACE_VIEWER_ACTIVITY_MODE.DIAGRAM_VIEWER,
  DATA_SPACE_VIEWER_ACTIVITY_MODE.MODELS_DOCUMENTATION,
  DATA_SPACE_VIEWER_ACTIVITY_MODE.QUICK_START,
  DATA_SPACE_VIEWER_ACTIVITY_MODE.DATA_ACCESS,
];

const DATA_SPACE_WIKI_PAGE_ANCHORS = DATA_SPACE_WIKI_PAGE_SECTIONS.map(
  (activity) => generateAnchorForActivity(activity),
);

export class DataSpaceLayoutState extends BaseLayoutState {
  private dataSpaceViewerState!: DataSpaceViewerState;

  constructor() {
    super();
    makeObservable(this, {
      isWikiPageFullyRendered: override,
    });
  }

  setViewerState(dataSpaceViewerState: DataSpaceViewerState): void {
    this.dataSpaceViewerState = dataSpaceViewerState;
  }

  protected getValidAnchors(): string[] {
    return DATA_SPACE_WIKI_PAGE_ANCHORS;
  }

  protected get expectedGridCount(): number {
    return 0;
  }

  override get isWikiPageFullyRendered(): boolean {
    return (
      super.isWikiPageFullyRendered &&
      DATA_SPACE_WIKI_PAGE_SECTIONS.includes(
        this.dataSpaceViewerState.currentActivity,
      )
    );
  }

  protected override onWikiPageVisibleAnchorsSettled(): void {
    const anchor = at(this.wikiPageVisibleAnchors, 0);
    this.dataSpaceViewerState.syncZoneWithNavigation(anchor);
    const activity = anchor.split(NAVIGATION_ZONE_SEPARATOR)[0];
    if (activity) {
      this.dataSpaceViewerState.setCurrentActivity(
        extractActivityFromAnchor(activity) as DATA_SPACE_VIEWER_ACTIVITY_MODE,
      );
    }
  }

  override navigateWikiPageAnchor(): void {
    if (
      this.frame &&
      this.wikiPageNavigationCommand &&
      this.isWikiPageFullyRendered
    ) {
      const anchor = this.wikiPageNavigationCommand.anchor;
      const matchingWikiPageSection = this.wikiPageAnchorIndex.get(anchor);
      const anchorChunks = anchor.split(NAVIGATION_ZONE_SEPARATOR);
      if (matchingWikiPageSection) {
        this.frame.scrollTop =
          matchingWikiPageSection.offsetTop -
          (this.header?.getBoundingClientRect().height ?? 0);
      } else if (
        generateAnchorForActivity(
          DATA_SPACE_VIEWER_ACTIVITY_MODE.DIAGRAM_VIEWER,
        ) === anchorChunks[0]
      ) {
        this.frame.scrollTop =
          guaranteeNonNullable(
            this.wikiPageAnchorIndex.get(
              generateAnchorForActivity(
                DATA_SPACE_VIEWER_ACTIVITY_MODE.DIAGRAM_VIEWER,
              ),
            ),
          ).offsetTop - (this.header?.getBoundingClientRect().height ?? 0);
        const matchingDiagram =
          this.dataSpaceViewerState.dataSpaceAnalysisResult.diagrams.find(
            (diagram) => generateAnchorForDiagram(diagram) === anchor,
          );
        if (matchingDiagram) {
          this.dataSpaceViewerState.diagramViewerState.setCurrentDiagram(
            matchingDiagram,
          );
        }
      }

      this.setWikiPageAnchorToNavigate(undefined);
    }
  }
}
