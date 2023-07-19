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
  type GeneratorFn,
  ActionState,
  LogEvent,
  assertErrorThrown,
  guaranteeNonNullable,
} from '@finos/legend-shared';
import { action, flow, makeObservable, observable } from 'mobx';
import { LEGEND_STUDIO_APP_EVENT } from '../__lib__/LegendStudioEvent.js';
import {
  type Showcase,
  type ShowcaseMetadata,
  ShowcaseRegistryServerClient,
} from '@finos/legend-server-showcase';
import type { LegendStudioApplicationStore } from './LegendStudioBaseStore.js';
import {
  ApplicationExtensionState,
  type GenericLegendApplicationStore,
} from '@finos/legend-application';
import type { TreeData, TreeNodeData } from '@finos/legend-art';
import { DIRECTORY_PATH_DELIMITER } from '@finos/legend-graph';

export enum SHOWCASE_MANAGER_VIEW {
  EXPLORER = 'EXPLORER',
  SEARCH = 'SEARCH',
}

export class ShowcasesExplorerTreeNodeData implements TreeNodeData {
  isOpen?: boolean | undefined;
  id: string;
  label: string;
  parentId?: string | undefined;
  childrenIds: string[] = [];
  metadata?: ShowcaseMetadata | undefined;

  constructor(
    id: string,
    label: string,
    parentId: string | undefined,
    metadata?: ShowcaseMetadata | undefined,
  ) {
    this.id = id;
    this.label = label;
    this.parentId = parentId;
    this.metadata = metadata;
  }
}

const buildShowcasesExplorerTreeNode = (
  showcase: ShowcaseMetadata,
  path: string,
  parentId: string | undefined,
  nodes: Map<string, ShowcasesExplorerTreeNodeData>,
  rootIds: string[],
): ShowcasesExplorerTreeNodeData => {
  let node: ShowcasesExplorerTreeNodeData;
  const idx = path.indexOf(DIRECTORY_PATH_DELIMITER);
  if (idx === -1) {
    // showcase node
    node = new ShowcasesExplorerTreeNodeData(
      `${parentId ? `${parentId}${DIRECTORY_PATH_DELIMITER}` : ''}${path}`,
      path,
      parentId,
      showcase,
    );
  } else {
    // directory node
    const directoryName = path.substring(0, idx);
    const directoryNodeId = `${
      parentId ? `${parentId}${DIRECTORY_PATH_DELIMITER}` : ''
    }${directoryName}`;
    node =
      nodes.get(directoryNodeId) ??
      new ShowcasesExplorerTreeNodeData(
        directoryNodeId,
        directoryName,
        undefined,
        undefined,
      );
  }
  nodes.set(node.id, node);
  if (!parentId && !rootIds.includes(node.id)) {
    rootIds.push(node.id);
  }
  if (parentId) {
    const parentNode = nodes.get(parentId);
    if (parentNode) {
      if (!parentNode.childrenIds.includes(node.id)) {
        parentNode.childrenIds.push(node.id);
      }
    }
  }
  if (idx !== -1) {
    buildShowcasesExplorerTreeNode(
      showcase,
      path.substring(idx + 1),
      node.id,
      nodes,
      rootIds,
    );
  }
  return node;
};

const buildShowcasesExplorerTreeData = (
  showcases: ShowcaseMetadata[],
): TreeData<ShowcasesExplorerTreeNodeData> => {
  const rootIds: string[] = [];
  const nodes = new Map<string, ShowcasesExplorerTreeNodeData>();
  showcases.forEach((showcase) =>
    buildShowcasesExplorerTreeNode(
      showcase,
      showcase.path,
      undefined,
      nodes,
      rootIds,
    ),
  );
  return { rootIds, nodes };
};

export class ShowcaseManagerState extends ApplicationExtensionState {
  private static readonly IDENTIFIER = 'showcase-manager';

  readonly applicationStore: LegendStudioApplicationStore;
  readonly initState = ActionState.create();
  readonly fetchShowcaseState = ActionState.create();

  private readonly showcaseServerClient?: ShowcaseRegistryServerClient;

  showcases: ShowcaseMetadata[] = [];
  currentShowcase?: Showcase | undefined;

  currentView = SHOWCASE_MANAGER_VIEW.EXPLORER;
  explorerTreeData?: TreeData<ShowcasesExplorerTreeNodeData> | undefined;

  constructor(applicationStore: LegendStudioApplicationStore) {
    super();

    makeObservable(this, {
      showcases: observable,
      currentShowcase: observable,
      currentView: observable,
      explorerTreeData: observable.ref,
      initialize: flow,
      setCurrentView: action,
      closeShowcase: action,
      openShowcase: flow,
      setExplorerTreeData: action,
    });

    this.applicationStore = applicationStore;

    if (this.applicationStore.config.showcaseServerUrl) {
      this.showcaseServerClient = new ShowcaseRegistryServerClient({
        baseUrl: this.applicationStore.config.showcaseServerUrl,
      });
    }
  }

  override get INTERNAL__identifierKey(): string {
    return ShowcaseManagerState.IDENTIFIER;
  }

  static retrieveNullableState(
    applicationStore: GenericLegendApplicationStore,
  ): ShowcaseManagerState | undefined {
    return applicationStore.extensionStates.find((extensionState) => {
      if (
        /**
         * In development mode, when we make changes in certain areas like utils or base states, the following `instanceof`
         * check will fail as if there were multiple copies of the classes with the same name, this could be caused by either
         * React `fast-refresh` or `webpack HMR`; we didn't have time to really do a thorough debug here, as such,
         * we will just do a simple key check to match the right state to bypass the problem for development mode.
         */
        // eslint-disable-next-line no-process-env
        process.env.NODE_ENV === 'development'
      ) {
        return (
          extensionState.INTERNAL__identifierKey ===
          ShowcaseManagerState.IDENTIFIER
        );
      }
      return extensionState instanceof ShowcaseManagerState;
    }) as ShowcaseManagerState;
  }

  static retrieveState(
    applicationStore: GenericLegendApplicationStore,
  ): ShowcaseManagerState {
    return guaranteeNonNullable(
      ShowcaseManagerState.retrieveNullableState(applicationStore),
      `Can't find showcase manager state: make sure it is added as an editor extension state`,
    );
  }

  get isEnabled(): boolean {
    return Boolean(this.showcaseServerClient);
  }

  private get client(): ShowcaseRegistryServerClient {
    return guaranteeNonNullable(
      this.showcaseServerClient,
      `Showcase registry server client is not configured`,
    );
  }

  setCurrentView(val: SHOWCASE_MANAGER_VIEW): void {
    this.currentView = val;
  }

  *openShowcase(metadata: ShowcaseMetadata): GeneratorFn<void> {
    this.fetchShowcaseState.inProgress();

    try {
      this.currentShowcase = (yield this.client.getShowcase(
        metadata.path,
      )) as Showcase;

      this.fetchShowcaseState.pass();
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.logService.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.SHOWCASE_MANAGER_FAILURE),
        error,
      );
      this.fetchShowcaseState.fail();
    }
  }

  closeShowcase(): void {
    this.currentShowcase = undefined;
  }

  setExplorerTreeData(val: TreeData<ShowcasesExplorerTreeNodeData>): void {
    this.explorerTreeData = val;
  }

  *initialize(): GeneratorFn<void> {
    if (!this.isEnabled || this.initState.isInProgress) {
      return;
    }
    this.initState.inProgress();

    try {
      this.showcases = (yield this.client.getShowcases()) as Showcase[];
      this.explorerTreeData = buildShowcasesExplorerTreeData(this.showcases);

      this.initState.pass();
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.logService.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.SHOWCASE_MANAGER_FAILURE),
        error,
      );
      this.initState.fail();
    }
  }
}
