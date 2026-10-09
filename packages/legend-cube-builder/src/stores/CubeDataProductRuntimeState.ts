/**
 * Copyright (c) 2026-present, Goldman Sachs
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

import { DataProductAccessPointSource } from '@finos/legend-cube';
import {
  isExecutionEntitlementError,
  isExecutionWarehouseError,
} from '@finos/legend-graph';
import { action, computed, makeObservable, observable } from 'mobx';
import { getCubeRequestAccessLabel } from '../__lib__/LegendCubeDataProductLabels.js';
import {
  type CubeDataProductProject,
  getCubeDataProductProject,
  getEffectiveCubeWarehouse,
  isCubeSnapshotVersion,
  withCubeDataProductWarehouse,
} from '../graph-manager/CubeDataProduct.js';
import type { CubeEngineError } from '../graph-manager/CubeEngine.js';
import {
  getCubeRememberedWarehouse,
  rememberCubeWarehouse,
} from './CubeDataProductWarehouse.js';
import type { CubeEditorState } from './CubeEditorState.js';

/** What a failed run on a data product cube lacked (PLAN §6.8) */
export enum CubeDataProductRunErrorKind {
  /** the warehouse it ran on: another one may work */
  WAREHOUSE = 'warehouse',
  /** access to the data: the marketplace takes requests */
  ENTITLEMENT = 'entitlement',
}

/**
 * What a run's error says it lacked, as Legend Query reads it: the
 * warehouse first, since a message about both is about the warehouse, then
 * access to the data; none for any other error. Read from the whole detail,
 * since the database's words may follow its first line
 */
export const classifyCubeDataProductRunError = (
  error: CubeEngineError,
): CubeDataProductRunErrorKind | undefined =>
  isExecutionWarehouseError(error.detail)
    ? CubeDataProductRunErrorKind.WAREHOUSE
    : isExecutionEntitlementError(error.detail)
      ? CubeDataProductRunErrorKind.ENTITLEMENT
      : undefined;

/** A marketplace page where the viewer can ask for access */
export interface CubeAccessRequestLink {
  readonly key: string;
  readonly label: string;
  readonly url: string;
}

/**
 * Where a data product cube runs (PLAN §6.8, DP-2): its deployment class
 * and the warehouse, shown as it is sent. Editing the warehouse changes the
 * cube's model, as one undo step, and remembers the warehouse for the
 * viewer's next cubes; it calls no engine and re-types no source.
 */
export class CubeDataProductRuntimeState {
  readonly editorState: CubeEditorState;
  /**
   * Counts Cube's own writes of the remembered warehouse: user data isn't
   * observable, so reading it through this lets the page show a new one
   */
  private rememberedChanges = 0;

  constructor(editorState: CubeEditorState) {
    makeObservable<CubeDataProductRuntimeState, 'rememberedChanges'>(this, {
      rememberedChanges: observable,
      project: computed,
      isSnapshot: computed,
      canEditWarehouse: computed,
      runErrorKind: computed,
      accessRequestLinks: computed,
      remember: action,
      setWarehouse: action,
    });
    this.editorState = editorState;
  }

  /** The warehouse the viewer last picked, read afresh: another page may have changed it */
  get rememberedWarehouse(): string | undefined {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    this.rememberedChanges;
    return getCubeRememberedWarehouse(
      this.editorState.host.applicationStore.userDataService,
    );
  }

  /** The cube's data product project; none on a cube of tables, or one Cube can't run */
  get project(): CubeDataProductProject | undefined {
    const model = this.editorState.document.context?.model;
    return model ? getCubeDataProductProject(model) : undefined;
  }

  /** The warehouse the next run uses, as the engine picks it, from user data read at run time */
  get effectiveWarehouse(): string | undefined {
    const { project } = this;
    return project
      ? getEffectiveCubeWarehouse(project, this.rememberedWarehouse)
      : undefined;
  }

  get isSnapshot(): boolean {
    return this.project ? isCubeSnapshotVersion(this.project.versionId) : false;
  }

  get canEditWarehouse(): boolean {
    return !this.editorState.readOnly && this.project !== undefined;
  }

  /** What the last run's error says it lacked; none on a cube of tables */
  get runErrorKind(): CubeDataProductRunErrorKind | undefined {
    const { error } = this.editorState.execution;
    return this.project && error
      ? classifyCubeDataProductRunError(error)
      : undefined;
  }

  /**
   * After a run refused for lack of access, where to ask for it: one link
   * per access point group the failed node reads, each opening that group in
   * the marketplace; none when the host has no marketplace
   */
  get accessRequestLinks(): readonly CubeAccessRequestLink[] {
    const { project } = this;
    const { error } = this.editorState.execution;
    const catalog = this.editorState.host.dataProductCatalog;
    const { query } = this.editorState.document;
    const failed = error?.nodeId ?? query.selected;
    if (
      this.runErrorKind !== CubeDataProductRunErrorKind.ENTITLEMENT ||
      !project ||
      !catalog ||
      failed === undefined
    ) {
      return [];
    }
    const groups = new Map<string, DataProductAccessPointSource>();
    query.nodes.forEach((node) => {
      if (
        node instanceof DataProductAccessPointSource &&
        (node.id === failed || query.isUpstreamOf(node.id, failed))
      ) {
        groups.set(
          JSON.stringify([
            node.dataProductId,
            node.deploymentId,
            node.accessPointGroup,
          ]),
          node,
        );
      }
    });
    const several = groups.size > 1;
    return [...groups].flatMap(([key, node]) => {
      const url = catalog.getMarketplaceLink({
        dataProductId: node.dataProductId,
        deploymentId: node.deploymentId,
        environmentType: project.environmentType,
        accessPointGroup: node.accessPointGroup,
      });
      return url
        ? [
            {
              key,
              label: several
                ? getCubeRequestAccessLabel(
                    node.accessPointGroup,
                    node.dataProductName,
                  )
                : getCubeRequestAccessLabel(undefined, undefined),
              url,
            },
          ]
        : [];
    });
  }

  /** Remembers the warehouse for the viewer's next cubes */
  remember(warehouse: string): void {
    rememberCubeWarehouse(
      this.editorState.host.applicationStore.userDataService,
      warehouse,
    );
    this.rememberedChanges++;
  }

  /**
   * Runs the cube on another warehouse; gives whether it changed. An empty
   * name, the warehouse already used, or a cube that can't be edited changes
   * nothing
   */
  setWarehouse(text: string): boolean {
    const warehouse = text.trim();
    const { context } = this.editorState.document;
    if (
      !this.canEditWarehouse ||
      !context ||
      !warehouse.length ||
      warehouse === this.effectiveWarehouse
    ) {
      return false;
    }
    this.editorState.applyDocument(
      this.editorState.document.withContext({
        ...context,
        model: withCubeDataProductWarehouse(context.model, warehouse),
      }),
    );
    this.remember(warehouse);
    return true;
  }
}
