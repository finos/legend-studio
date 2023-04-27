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
  NAVIGATION_ZONE_SEPARATOR,
  type GenericLegendApplicationStore,
  type NavigationZone,
} from '@finos/legend-application';
import { type ClassView } from '@finos/legend-extension-dsl-diagram/graph';
import {
  type DiagramRenderer,
  DIAGRAM_INTERACTION_MODE,
} from '@finos/legend-extension-dsl-diagram/application';
import type {
  BasicGraphManagerState,
  GraphData,
  PackageableRuntime,
} from '@finos/legend-graph';
import {
  getNonNullableEnry,
  getNullableEntry,
  getNullableFirstEntry,
  guaranteeNonNullable,
  isNonNullable,
} from '@finos/legend-shared';
import { action, computed, makeObservable, observable } from 'mobx';
import type {
  DataSpaceAnalysisResult,
  DataSpaceDiagramAnalysisResult,
  DataSpaceExecutableAnalysisResult,
  DataSpaceExecutionContextAnalysisResult,
} from '../graph-manager/action/analytics/DataSpaceAnalysis.js';
import {
  PURE_DATA_SPACE_INFO_PROFILE_PATH,
  PURE_DATA_SPACE_INFO_PROFILE_VERIFIED_STEREOTYPE,
} from '../graph-manager/DSL_DataSpace_PureGraphManagerPlugin.js';
import { DataSpaceViewerDataAccessState } from './DataSpaceViewerDataAccessState.js';
import { DataSpaceViewerModelsDocumentationState } from './DataSpaceModelsDocumentationState.js';

export enum DATA_SPACE_VIEWER_ACTIVITY_MODE {
  DESCRIPTION = 'description',
  DIAGRAM_VIEWER = 'diagram-viewer',
  MODELS_DOCUMENTATION = 'models-documentation',
  QUICK_START = 'quick-start',
  EXECUTION_CONTEXT = 'execution-context',
  DATA_ACCESS = 'data-access',

  DATA_STORES = 'data-stores', // TODO: with test-data, also let user call TDS query on top of these
  DATA_AVAILABILITY = 'data-availability',
  DATA_READINESS = 'data-readiness',
  DATA_COST = 'data-cost',
  DATA_GOVERNANCE = 'data-governance',
  INFO = 'info', // TODO: test coverage? (or maybe this should be done in elements/diagrams/data-quality section)
  SUPPORT = 'support',
}

const generateAnchorChunk = (text: string): string =>
  encodeURIComponent(
    text
      .trim()
      .toLowerCase() // anchor is case-insensitive
      .replace(/\s+/gu, '-'), // spaces will be replaced by hyphens
  );
export const generateAnchorForActivity = (activity: string): string =>
  generateAnchorChunk(activity);
export const extractActivityFromAnchor = (anchor: string): string =>
  decodeURIComponent(anchor);
export const generateAnchorForQuickStart = (
  quickStart: DataSpaceExecutableAnalysisResult,
): string =>
  [
    DATA_SPACE_VIEWER_ACTIVITY_MODE.QUICK_START,
    generateAnchorChunk(quickStart.title),
  ].join(NAVIGATION_ZONE_SEPARATOR);
export const generateAnchorForDiagram = (
  diagram: DataSpaceDiagramAnalysisResult,
): string =>
  [
    DATA_SPACE_VIEWER_ACTIVITY_MODE.DIAGRAM_VIEWER,
    generateAnchorChunk(diagram.title),
  ].join(NAVIGATION_ZONE_SEPARATOR);

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

type DataSpacePageNavigationCommand = {
  anchor: string;
};

class DataSpaceLayoutState {
  readonly dataSpaceViewerState: DataSpaceViewerState;

  currentNavigationZone = '';
  isExpandedModeEnabled = false;

  frame?: HTMLElement | undefined;
  header?: HTMLElement | undefined;
  isTopScrollerVisible = false;

  private wikiPageAnchorIndex = new Map<string, HTMLElement>();
  wikiPageNavigationCommand?: DataSpacePageNavigationCommand | undefined;
  private wikiPageVisibleAnchors: string[] = [];
  private wikiPageScrollIntersectionObserver?: IntersectionObserver | undefined;

  constructor(dataSpaceViewerState: DataSpaceViewerState) {
    makeObservable<
      DataSpaceLayoutState,
      | 'wikiPageAnchorIndex'
      | 'wikiPageVisibleAnchors'
      | 'updatePageVisibleAnchors'
    >(this, {
      currentNavigationZone: observable,
      isExpandedModeEnabled: observable,
      isTopScrollerVisible: observable,
      wikiPageAnchorIndex: observable,
      wikiPageVisibleAnchors: observable,
      frame: observable.ref,
      wikiPageNavigationCommand: observable.ref,
      isWikiPageFullyRendered: computed,
      registerWikiPageScrollObserver: action,
      setCurrentNavigationZone: action,
      enableExpandedMode: action,
      setFrame: action,
      setTopScrollerVisible: action,
      setWikiPageAnchor: action,
      unsetWikiPageAnchor: action,
      setWikiPageAnchorToNavigate: action,
      updatePageVisibleAnchors: action,
    });

    this.dataSpaceViewerState = dataSpaceViewerState;
  }

  setCurrentNavigationZone(val: string): void {
    this.currentNavigationZone = val;
  }

  get isWikiPageFullyRendered(): boolean {
    return (
      Boolean(this.frame) &&
      DATA_SPACE_WIKI_PAGE_SECTIONS.includes(
        this.dataSpaceViewerState.currentActivity,
      ) &&
      DATA_SPACE_WIKI_PAGE_ANCHORS.every((anchor) =>
        this.wikiPageAnchorIndex.has(anchor),
      ) &&
      Array.from(this.wikiPageAnchorIndex.values()).every(isNonNullable)
    );
  }

  registerWikiPageScrollObserver(): void {
    if (this.frame && this.isWikiPageFullyRendered) {
      const wikiPageIntersectionObserver = new IntersectionObserver(
        (entries, observer) => {
          const anchorsWithVisibilityChanged = entries
            .map((entry) => {
              for (const [key, element] of this.wikiPageAnchorIndex.entries()) {
                if (element === entry.target) {
                  return { key, isIntersecting: entry.isIntersecting };
                }
              }
              return undefined;
            })
            .filter(isNonNullable);
          anchorsWithVisibilityChanged.forEach((entry) => {
            this.updatePageVisibleAnchors(entry.key, entry.isIntersecting);
          });
          // NOTE: sync scroll with menu/address is quite a delicate piece of work
          // as it interferes with programatic scroll operations we do elsewhere.
          // This is particularly bad when we do a programatic `smooth` scroll, which
          // mimic user scrolling behavior and would tangle up with this observer
          // Since currently, there's no good mechanism to detect scroll end event, and as such,
          // there is no good way to temporarily disable this logic while doing the programmatic
          // smooth scroll as such, we avoid supporting programatic smooth scrolling for now
          // See https://github.com/w3c/csswg-drafts/issues/3744
          // See https://developer.mozilla.org/en-US/docs/Web/API/Document/scrollend_event
          if (
            // if current navigation zone is not set, do not update zone
            this.currentNavigationZone === '' ||
            // if there is no visible anchors, do not update zone
            !this.wikiPageVisibleAnchors.length ||
            // if some of the current visible anchors match or is parent section of the current
            // navigation zone, do not update zone
            this.wikiPageVisibleAnchors.some(
              (visibleAnchor) =>
                this.currentNavigationZone === visibleAnchor ||
                this.currentNavigationZone.startsWith(
                  `${visibleAnchor}${NAVIGATION_ZONE_SEPARATOR}`,
                ),
            )
          ) {
            return;
          }
          const anchor = getNonNullableEnry(this.wikiPageVisibleAnchors, 0);
          this.dataSpaceViewerState.syncZoneWithNavigation(anchor);
          const anchorChunks = anchor.split(NAVIGATION_ZONE_SEPARATOR);
          const activity = getNullableFirstEntry(anchorChunks);
          if (activity) {
            this.dataSpaceViewerState.setCurrentActivity(
              extractActivityFromAnchor(
                activity,
              ) as DATA_SPACE_VIEWER_ACTIVITY_MODE,
            );
          }
        },
        {
          root: this.frame,
          threshold: 0.5,
        },
      );
      Array.from(this.wikiPageAnchorIndex.values()).forEach((el) =>
        wikiPageIntersectionObserver.observe(el),
      );
      this.wikiPageScrollIntersectionObserver = wikiPageIntersectionObserver;
    }
  }

  unregisterWikiPageScrollObserver(): void {
    this.wikiPageScrollIntersectionObserver?.disconnect();
    this.wikiPageScrollIntersectionObserver = undefined;
    this.wikiPageVisibleAnchors = [];
  }

  private updatePageVisibleAnchors(
    changedAnchor: string,
    isIntersecting: boolean,
  ): void {
    if (isIntersecting) {
      const anchors = this.wikiPageVisibleAnchors.filter(
        (anchor) => changedAnchor !== anchor,
      );
      // NOTE: the newly visible anchors should be the furthest one in
      // the direction of scroll
      anchors.push(changedAnchor);
      this.wikiPageVisibleAnchors = anchors;
    } else {
      this.wikiPageVisibleAnchors = this.wikiPageVisibleAnchors.filter(
        (anchor) => changedAnchor !== anchor,
      );
    }
  }

  enableExpandedMode(val: boolean): void {
    this.isExpandedModeEnabled = val;
  }

  setFrame(val: HTMLElement | undefined): void {
    this.frame = val;
  }

  setTopScrollerVisible(val: boolean): void {
    this.isTopScrollerVisible = val;
  }

  setWikiPageAnchor(anchorKey: string, element: HTMLElement): void {
    // do not allow overriding existing anchor
    if (!this.wikiPageAnchorIndex.has(anchorKey)) {
      this.wikiPageAnchorIndex.set(anchorKey, element);
    }
  }

  unsetWikiPageAnchor(anchorKey: string): void {
    this.wikiPageAnchorIndex.delete(anchorKey);
  }

  setWikiPageAnchorToNavigate(
    val: DataSpacePageNavigationCommand | undefined,
  ): void {
    this.wikiPageNavigationCommand = val;
  }

  navigateWikiPageAnchor(): void {
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
        getNullableFirstEntry(anchorChunks) ===
        generateAnchorForActivity(
          DATA_SPACE_VIEWER_ACTIVITY_MODE.DIAGRAM_VIEWER,
        )
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
          this.dataSpaceViewerState.setCurrentDiagram(matchingDiagram);
        }
      }

      this.setWikiPageAnchorToNavigate(undefined);
    }
  }
}

export class DataSpaceViewerState {
  readonly applicationStore: GenericLegendApplicationStore;
  readonly graphManagerState: BasicGraphManagerState;
  readonly layoutState: DataSpaceLayoutState;

  readonly dataSpaceAnalysisResult: DataSpaceAnalysisResult;
  readonly groupId: string;
  readonly artifactId: string;
  readonly versionId: string;
  readonly retriveGraphData: () => GraphData;
  readonly viewProject: (
    groupId: string,
    artifactId: string,
    versionId: string,
    entityPath: string | undefined,
  ) => void;
  readonly viewSDLCProject: (
    groupId: string,
    artifactId: string,
    entityPath: string | undefined,
  ) => Promise<void>;
  readonly onDiagramClassDoubleClick: (classView: ClassView) => void;
  readonly onZoneChange?:
    | ((zone: NavigationZone | undefined) => void)
    | undefined;
  readonly openServiceQuery?: ((servicePath: string) => void) | undefined;

  readonly modelsDocumentationState: DataSpaceViewerModelsDocumentationState;

  // TODO: change this so it holds the data access state for each execution context
  readonly dataAccessState: DataSpaceViewerDataAccessState;
  // TODO: have a state similar to dataAccessState for each executables

  _renderer?: DiagramRenderer | undefined;
  currentActivity = DATA_SPACE_VIEWER_ACTIVITY_MODE.DESCRIPTION;
  currentDiagram?: DataSpaceDiagramAnalysisResult | undefined;
  currentExecutionContext: DataSpaceExecutionContextAnalysisResult;
  currentRuntime: PackageableRuntime;

  TEMPORARY__enableExperimentalFeatures = false;

  constructor(
    applicationStore: GenericLegendApplicationStore,
    graphManagerState: BasicGraphManagerState,
    groupId: string,
    artifactId: string,
    versionId: string,
    dataSpaceAnalysisResult: DataSpaceAnalysisResult,
    actions: {
      retriveGraphData: () => GraphData;
      viewProject: (
        groupId: string,
        artifactId: string,
        versionId: string,
        entityPath: string | undefined,
      ) => void;
      viewSDLCProject: (
        groupId: string,
        artifactId: string,
        entityPath: string | undefined,
      ) => Promise<void>;
      onDiagramClassDoubleClick: (classView: ClassView) => void;
      onZoneChange?: ((zone: NavigationZone | undefined) => void) | undefined;
      openServiceQuery?: ((servicePath: string) => void) | undefined;
    },
    options?: {
      TEMPORARY__enableExperimentalFeatures?: boolean | undefined;
    },
  ) {
    makeObservable(this, {
      _renderer: observable,
      currentDiagram: observable,
      currentActivity: observable,
      currentExecutionContext: observable,
      currentRuntime: observable,
      isVerified: computed,
      diagramRenderer: computed,
      setDiagramRenderer: action,
      setCurrentDiagram: action,
      setCurrentActivity: action,
      setCurrentExecutionContext: action,
      setCurrentRuntime: action,
    });

    this.applicationStore = applicationStore;
    this.graphManagerState = graphManagerState;
    this.layoutState = new DataSpaceLayoutState(this);

    this.dataSpaceAnalysisResult = dataSpaceAnalysisResult;
    this.groupId = groupId;
    this.artifactId = artifactId;
    this.versionId = versionId;
    this.currentExecutionContext =
      dataSpaceAnalysisResult.defaultExecutionContext;
    this.currentRuntime = this.currentExecutionContext.defaultRuntime;
    this.currentDiagram = getNullableFirstEntry(
      this.dataSpaceAnalysisResult.diagrams,
    );
    this.retriveGraphData = actions.retriveGraphData;
    this.viewProject = actions.viewProject;
    this.viewSDLCProject = actions.viewSDLCProject;
    this.onDiagramClassDoubleClick = actions.onDiagramClassDoubleClick;
    this.onZoneChange = actions.onZoneChange;
    this.openServiceQuery = actions.openServiceQuery;

    this.dataAccessState = new DataSpaceViewerDataAccessState(this);
    this.modelsDocumentationState = new DataSpaceViewerModelsDocumentationState(
      this,
    );

    this.TEMPORARY__enableExperimentalFeatures = Boolean(
      options?.TEMPORARY__enableExperimentalFeatures,
    );
  }

  get diagramRenderer(): DiagramRenderer {
    return guaranteeNonNullable(
      this._renderer,
      `Diagram renderer must be initialized (this is likely caused by calling this method at the wrong place)`,
    );
  }

  get isDiagramRendererInitialized(): boolean {
    return Boolean(this._renderer);
  }

  // NOTE: we have tried to use React to control the cursor and
  // could not overcome the jank/lag problem, so we settle with CSS-based approach
  // See https://css-tricks.com/using-css-cursors/
  // See https://developer.mozilla.org/en-US/docs/Web/CSS/cursor
  get diagramCursorClass(): string {
    if (!this.isDiagramRendererInitialized) {
      return '';
    }
    if (this.diagramRenderer.middleClick || this.diagramRenderer.rightClick) {
      return 'diagram-editor__cursor--grabbing';
    }
    switch (this.diagramRenderer.interactionMode) {
      case DIAGRAM_INTERACTION_MODE.LAYOUT: {
        if (this.diagramRenderer.mouseOverClassView) {
          return 'diagram-editor__cursor--pointer';
        }
        return '';
      }
      default:
        return '';
    }
  }

  get isVerified(): boolean {
    return Boolean(
      this.dataSpaceAnalysisResult.stereotypes.find(
        (stereotype) =>
          stereotype.profile === PURE_DATA_SPACE_INFO_PROFILE_PATH &&
          stereotype.value === PURE_DATA_SPACE_INFO_PROFILE_VERIFIED_STEREOTYPE,
      ),
    );
  }

  setDiagramRenderer(val: DiagramRenderer): void {
    this._renderer = val;
  }

  setCurrentDiagram(val: DataSpaceDiagramAnalysisResult): void {
    this.currentDiagram = val;
  }

  setCurrentActivity(val: DATA_SPACE_VIEWER_ACTIVITY_MODE): void {
    this.currentActivity = val;
  }

  setCurrentExecutionContext(
    val: DataSpaceExecutionContextAnalysisResult,
  ): void {
    this.currentExecutionContext = val;
    this.currentRuntime = val.defaultRuntime;
  }

  setCurrentRuntime(val: PackageableRuntime): void {
    this.currentRuntime = val;
  }

  setupDiagramRenderer(): void {
    this.diagramRenderer.setIsReadOnly(true);
    this.diagramRenderer.setEnableLayoutAutoAdjustment(true);
    this.diagramRenderer.onClassViewDoubleClick = (
      classView: ClassView,
    ): void => this.onDiagramClassDoubleClick(classView);
  }

  syncZoneWithNavigation(zone: NavigationZone): void {
    this.layoutState.setCurrentNavigationZone(zone);
    this.onZoneChange?.(zone);
  }

  changeZone(zone: NavigationZone, force = false): void {
    if (force) {
      this.layoutState.setCurrentNavigationZone('');
    }
    if (zone !== this.layoutState.currentNavigationZone) {
      const zoneChunks = zone.split(NAVIGATION_ZONE_SEPARATOR);
      const activityChunk = getNullableEntry(zoneChunks, 0);
      const matchingActivity = Object.values(
        DATA_SPACE_VIEWER_ACTIVITY_MODE,
      ).find(
        (activity) => generateAnchorForActivity(activity) === activityChunk,
      );
      if (activityChunk && matchingActivity) {
        if (DATA_SPACE_WIKI_PAGE_SECTIONS.includes(matchingActivity)) {
          this.layoutState.setWikiPageAnchorToNavigate({
            anchor: zone,
          });
        }
        this.setCurrentActivity(matchingActivity);
        this.onZoneChange?.(zone);
        this.layoutState.setCurrentNavigationZone(zone);
      } else {
        this.setCurrentActivity(DATA_SPACE_VIEWER_ACTIVITY_MODE.DESCRIPTION);
        this.layoutState.setCurrentNavigationZone('');
      }
    }
  }
}
