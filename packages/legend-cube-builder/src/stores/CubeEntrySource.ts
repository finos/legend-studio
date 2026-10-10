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
import { assertErrorThrown, type GeneratorFn } from '@finos/legend-shared';
import {
  action,
  flow,
  flowResult,
  makeObservable,
  observable,
  when,
} from 'mobx';
import {
  CUBE_DEFAULT_CONSUMER_WAREHOUSE,
  CubeDataProductEnvironmentType,
} from '../graph-manager/CubeDataProduct.js';
import type { CubeDataProductCandidate } from '../graph-manager/CubeDataProductCatalog.js';
import { CubeEngineError } from '../graph-manager/CubeEngine.js';
import type { CubeEditorState } from './CubeEditorState.js';
import type { CubeDataProductTabError } from './source-picker/CubeDataProductTabState.js';

/**
 * A source a link from another screen asks the page to start with (spec
 * §17.15, QUESTIONS.md U9): its kind and its id. Only data product access
 * points can be named by ids alone (PLAN §11.6).
 */
export interface CubeEntrySource {
  readonly sourceType: string;
  readonly sourceId: string;
}

/** Where a data product access point's link points, read from its id */
export interface CubeAccessPointEntry {
  readonly environmentType: CubeDataProductEnvironmentType;
  readonly dataProductId: string;
  readonly deploymentId: string;
  readonly accessPointGroup: string;
  readonly accessPoint: string;
}

/** Why a linked source couldn't be added: a line, with the rest on demand */
export interface CubeEntrySourceError {
  readonly message: string;
  readonly detail?: string | undefined;
}

/** A failure carrying the source dialog's error as it is */
class CubeEntrySourceFailure extends Error {
  readonly error: CubeEntrySourceError;

  constructor(error: CubeEntrySourceError) {
    super(error.message);
    this.error = error;
  }
}

const toEntrySourceError = (error: unknown): CubeEntrySourceError => {
  if (error instanceof CubeEntrySourceFailure) {
    return error.error;
  }
  if (error instanceof CubeEngineError) {
    return {
      message: error.firstLine,
      detail: error.detail !== error.firstLine ? error.detail : undefined,
    };
  }
  assertErrorThrown(error);
  return { message: error.message };
};

/** The banner's title over the reason a linked source couldn't be added (spec §17.13) */
export const CUBE_ENTRY_SOURCE_ERROR_TITLE = 'Error resolving source!';

export const CUBE_ENTRY_SOURCE_MESSAGE = {
  UNSUPPORTED_TYPE: (sourceType: string): string =>
    `A link can't name a source of type "${sourceType}": only data product access points.`,
  BAD_ID: (sourceId: string): string =>
    `"${sourceId}" doesn't name an access point: it takes <class>/<data product id>/<deployment id>/<access point group>/<access point>.`,
  NO_CATALOG: 'This page has no data products to open.',
  NOT_NEW: 'A link opens a source on a new cube only.',
  INTERRUPTED: 'Opening the linked source was interrupted; open it again.',
  NOT_FOUND: (dataProductId: string, deploymentId: string): string =>
    `No data product "${dataProductId}" is deployed as "${deploymentId}".`,
  NO_ACCESS_POINT: (group: string, accessPoint: string): string =>
    `The data product has no access point "${accessPoint}" in group "${group}".`,
};

/**
 * The id a link gives a data product access point: its deployment class,
 * the data product's id, its deployment id, the access point group and the
 * access point, each URI-encoded, joined by '/'
 */
export const formatCubeAccessPointEntryId = (
  entry: CubeAccessPointEntry,
): string =>
  [
    entry.environmentType,
    entry.dataProductId,
    entry.deploymentId,
    entry.accessPointGroup,
    entry.accessPoint,
  ]
    .map(encodeURIComponent)
    .join('/');

/** The access point a link's id names, or undefined when it names none */
export const parseCubeAccessPointEntryId = (
  sourceId: string,
): CubeAccessPointEntry | undefined => {
  const parts = sourceId.split('/');
  if (parts.length !== 5) {
    return undefined;
  }
  let decoded: string[];
  try {
    decoded = parts.map(decodeURIComponent);
  } catch {
    return undefined;
  }
  const [environmentType, dataProductId, deploymentId, group, accessPoint] =
    decoded as [string, string, string, string, string];
  if (
    !Object.values(CubeDataProductEnvironmentType).includes(
      environmentType as CubeDataProductEnvironmentType,
    ) ||
    decoded.some((part) => part.trim().length === 0)
  ) {
    return undefined;
  }
  return {
    environmentType: environmentType as CubeDataProductEnvironmentType,
    dataProductId,
    deploymentId,
    accessPointGroup: group,
    accessPoint,
  };
};

/**
 * Starts the page with the source a link names (spec §17.15, U9): resolved
 * alone, as the cube's first and selected node, with no dialog or editor
 * opened and nothing run. A source that can't be added leaves the cube
 * empty and says why in a banner. A data product access point is added as
 * its tab adds one, on the viewer's remembered warehouse.
 */
export class CubeEntrySourceState {
  readonly editorState: CubeEditorState;
  isOpening = false;
  /** Why the linked source couldn't be added, until dismissed */
  error: CubeEntrySourceError | undefined;

  constructor(editorState: CubeEditorState) {
    makeObservable(this, {
      isOpening: observable,
      error: observable.ref,
      open: flow,
      dismissError: action,
    });
    this.editorState = editorState;
  }

  /** The cube is still new: empty, editable and on no model */
  private isNewCube(): boolean {
    const { document, readOnly } = this.editorState;
    return !readOnly && !document.context && document.query.isEmpty;
  }

  *open(entry: CubeEntrySource): GeneratorFn<void> {
    if (this.isOpening) {
      return;
    }
    this.isOpening = true;
    this.error = undefined;
    const tab = this.editorState.sourcePicker.dataProductTab;
    let picked = false;
    try {
      if (!this.isNewCube()) {
        throw new Error(CUBE_ENTRY_SOURCE_MESSAGE.NOT_NEW);
      }
      if (entry.sourceType !== DataProductAccessPointSource.TYPE) {
        throw new Error(
          CUBE_ENTRY_SOURCE_MESSAGE.UNSUPPORTED_TYPE(entry.sourceType),
        );
      }
      const location = parseCubeAccessPointEntryId(entry.sourceId);
      if (!location) {
        throw new Error(CUBE_ENTRY_SOURCE_MESSAGE.BAD_ID(entry.sourceId));
      }
      const { catalog } = tab;
      if (!catalog) {
        throw new Error(CUBE_ENTRY_SOURCE_MESSAGE.NO_CATALOG);
      }
      const candidates = (yield catalog.search({
        text: location.dataProductId,
        environmentType: location.environmentType,
      })) as readonly CubeDataProductCandidate[];
      const candidate = candidates.find(
        (found) =>
          found.id === location.dataProductId &&
          found.deploymentId === location.deploymentId,
      );
      if (!candidate) {
        throw new Error(
          CUBE_ENTRY_SOURCE_MESSAGE.NOT_FOUND(
            location.dataProductId,
            location.deploymentId,
          ),
        );
      }
      // the tab adds it, as a pick in the dialog would
      tab.selectCandidate(candidate);
      picked = true;
      yield when(() => !tab.isDescribing);
      if (tab.error) {
        throw new CubeEntrySourceFailure(tab.error);
      }
      if (!tab.description || tab.candidate !== candidate) {
        // e.g. the source dialog was opened meanwhile, and closed, or another
        // product picked in it
        throw new Error(CUBE_ENTRY_SOURCE_MESSAGE.INTERRUPTED);
      }
      tab.selectAccessPoint(location.accessPointGroup, location.accessPoint);
      if (!tab.accessPoint) {
        throw new Error(
          CUBE_ENTRY_SOURCE_MESSAGE.NO_ACCESS_POINT(
            location.accessPointGroup,
            location.accessPoint,
          ),
        );
      }
      if (tab.accessPoint.disabledReason !== undefined) {
        throw new Error(tab.accessPoint.disabledReason);
      }
      // the user may have added a source while the product was read
      if (!this.isNewCube()) {
        throw new Error(CUBE_ENTRY_SOURCE_MESSAGE.NOT_NEW);
      }
      tab.setWarehouse(
        this.editorState.dataProductRuntime.rememberedWarehouse ??
          CUBE_DEFAULT_CONSUMER_WAREHOUSE,
      );
      const added = (yield flowResult(tab.confirm())) as boolean;
      if (!added) {
        // the confirm may have set it since it was read above
        const confirmError = tab.error as CubeDataProductTabError | undefined;
        throw confirmError
          ? new CubeEntrySourceFailure(confirmError)
          : new Error(CUBE_ENTRY_SOURCE_MESSAGE.INTERRUPTED);
      }
    } catch (error) {
      this.error = toEntrySourceError(error);
      if (picked) {
        // the dialog's tab opens clean, not on the link's product
        tab.selectCandidate(undefined);
      }
    } finally {
      this.isOpening = false;
    }
  }

  dismissError(): void {
    this.error = undefined;
  }
}
