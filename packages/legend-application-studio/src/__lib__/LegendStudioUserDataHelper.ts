import type { UserDataService } from '@finos/legend-application';
import {
  type PlainObject,
  SerializationFactory,
  returnUndefOnError,
  usingModelSchema,
} from '@finos/legend-shared';
import { WorkspaceType } from '@finos/legend-server-sdlc';
import { createModelSchema, list, primitive } from 'serializr';

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
export enum LEGEND_STUDIO_USER_DATA_KEY {
  GLOBAL_TEST_RUNNER_SHOW_DEPENDENCIES = 'studio-editor.global-test-runner-showDependencyPanel',
  // Per-user theme preference for the database editor. Scoped to this one
  // editor since the wider Studio app is dark-mode-only today — the rest of
  // the app does not honor this value.
  // TODO: when Studio adopts app-wide theming via `LayoutService` (the
  // mechanism Query already uses with setting key
  // `application.layout.colorTheme`), retire this key and have the database
  // editor inherit `applicationStore.layoutService.currentColorTheme`
  // instead. Migration is mechanical: delete this key + the helper getters,
  // drop the toggle button in the tab header, and retarget the SCSS
  // `.database-editor--light` block at the framework's color-theme tokens.
  DATABASE_EDITOR_THEME = 'studio-editor.database-editor.theme',
  // Recently-opened projects and (non-patch) workspaces shown on the
  // workspace setup screen to speed up re-opening common work.
  WORKSPACE_SETUP_RECENTS = 'studio-editor.workspace-setup.recents',
}

// --- Workspace setup recents -------------------------------------------------

const WORKSPACE_SETUP_RECENTS_VERSION = 1;
const MAX_RECENT_PROJECTS = 10;
const MAX_RECENT_WORKSPACES = 20;

export class RecentProjectEntry {
  projectId!: string;
  name!: string;
  lastOpenedAt!: number;

  static readonly serialization = new SerializationFactory(
    createModelSchema(RecentProjectEntry, {
      lastOpenedAt: primitive(),
      name: primitive(),
      projectId: primitive(),
    }),
  );
}

export class RecentWorkspaceEntry {
  projectId!: string;
  workspaceId!: string;
  workspaceType!: WorkspaceType;
  lastOpenedAt!: number;

  static readonly serialization = new SerializationFactory(
    createModelSchema(RecentWorkspaceEntry, {
      lastOpenedAt: primitive(),
      projectId: primitive(),
      workspaceId: primitive(),
      // WorkspaceType is a string enum; stored/loaded as a plain string and
      // validated when the entry is consumed.
      workspaceType: primitive(),
    }),
  );
}

export class WorkspaceSetupRecents {
  version: number = WORKSPACE_SETUP_RECENTS_VERSION;
  projects: RecentProjectEntry[] = [];
  workspaces: RecentWorkspaceEntry[] = [];

  static readonly serialization = new SerializationFactory(
    createModelSchema(WorkspaceSetupRecents, {
      projects: list(usingModelSchema(RecentProjectEntry.serialization.schema)),
      version: primitive(),
      workspaces: list(
        usingModelSchema(RecentWorkspaceEntry.serialization.schema),
      ),
    }),
  );
}

const isValidWorkspaceType = (v: unknown): v is WorkspaceType =>
  v === WorkspaceType.USER || v === WorkspaceType.GROUP;

const emptyRecents = (): WorkspaceSetupRecents => new WorkspaceSetupRecents();

const readRecents = (service: UserDataService): WorkspaceSetupRecents => {
  const raw = returnUndefOnError(() =>
    service.getObjectValue(LEGEND_STUDIO_USER_DATA_KEY.WORKSPACE_SETUP_RECENTS),
  );
  if (!raw) {
    return emptyRecents();
  }
  const parsed = returnUndefOnError(() =>
    WorkspaceSetupRecents.serialization.fromJson(
      raw as PlainObject<WorkspaceSetupRecents>,
    ),
  );
  if (!parsed) {
    return emptyRecents();
  }
  // Defensive post-checks: drop entries with invalid enum values and enforce
  // the LRU caps in case the persisted blob was tampered with.
  parsed.workspaces = parsed.workspaces
    .filter((w) => isValidWorkspaceType(w.workspaceType))
    .slice(0, MAX_RECENT_WORKSPACES);
  parsed.projects = parsed.projects.slice(0, MAX_RECENT_PROJECTS);
  return parsed;
};

const writeRecents = (
  service: UserDataService,
  recents: WorkspaceSetupRecents,
): void => {
  service.persistValue(
    LEGEND_STUDIO_USER_DATA_KEY.WORKSPACE_SETUP_RECENTS,
    WorkspaceSetupRecents.serialization.toJson(recents),
  );
};

export class LegendStudioUserDataHelper {
  static globalTestRunner_getShowDependencyPanel(
    service: UserDataService,
  ): boolean | undefined {
    return returnUndefOnError(() =>
      service.getBooleanValue(
        LEGEND_STUDIO_USER_DATA_KEY.GLOBAL_TEST_RUNNER_SHOW_DEPENDENCIES,
      ),
    );
  }

  static globalTestRunner_setShowDependencyPanel(
    service: UserDataService,
    val: boolean,
  ): void {
    service.persistValue(
      LEGEND_STUDIO_USER_DATA_KEY.GLOBAL_TEST_RUNNER_SHOW_DEPENDENCIES,
      val,
    );
  }

  static databaseEditor_getTheme(
    service: UserDataService,
  ): 'dark' | 'light' | undefined {
    const val = returnUndefOnError(() =>
      service.getStringValue(LEGEND_STUDIO_USER_DATA_KEY.DATABASE_EDITOR_THEME),
    );
    return val === 'light' || val === 'dark' ? val : undefined;
  }

  static databaseEditor_setTheme(
    service: UserDataService,
    val: 'dark' | 'light',
  ): void {
    service.persistValue(
      LEGEND_STUDIO_USER_DATA_KEY.DATABASE_EDITOR_THEME,
      val,
    );
  }

  // --- Workspace setup recents ---------------------------------------------

  static workspaceSetup_getRecentProjects(
    service: UserDataService,
  ): RecentProjectEntry[] {
    return readRecents(service).projects;
  }

  static workspaceSetup_getRecentWorkspaces(
    service: UserDataService,
  ): RecentWorkspaceEntry[] {
    return readRecents(service).workspaces;
  }

  static workspaceSetup_recordRecentProject(
    service: UserDataService,
    entry: { projectId: string; name: string },
  ): RecentProjectEntry[] {
    const recents = readRecents(service);
    const next = new RecentProjectEntry();
    next.projectId = entry.projectId;
    next.name = entry.name;
    next.lastOpenedAt = Date.now();
    recents.projects = [
      next,
      ...recents.projects.filter((p) => p.projectId !== entry.projectId),
    ].slice(0, MAX_RECENT_PROJECTS);
    writeRecents(service, recents);
    return recents.projects;
  }

  static workspaceSetup_recordRecentWorkspace(
    service: UserDataService,
    entry: {
      projectId: string;
      workspaceId: string;
      workspaceType: WorkspaceType;
    },
  ): RecentWorkspaceEntry[] {
    const recents = readRecents(service);
    const next = new RecentWorkspaceEntry();
    next.projectId = entry.projectId;
    next.workspaceId = entry.workspaceId;
    next.workspaceType = entry.workspaceType;
    next.lastOpenedAt = Date.now();
    recents.workspaces = [
      next,
      ...recents.workspaces.filter(
        (w) =>
          !(
            w.projectId === entry.projectId &&
            w.workspaceId === entry.workspaceId &&
            w.workspaceType === entry.workspaceType
          ),
      ),
    ].slice(0, MAX_RECENT_WORKSPACES);
    writeRecents(service, recents);
    return recents.workspaces;
  }

  static workspaceSetup_removeRecentProject(
    service: UserDataService,
    projectId: string,
  ): WorkspaceSetupRecents {
    const recents = readRecents(service);
    recents.projects = recents.projects.filter(
      (p) => p.projectId !== projectId,
    );
    recents.workspaces = recents.workspaces.filter(
      (w) => w.projectId !== projectId,
    );
    writeRecents(service, recents);
    return recents;
  }

  static workspaceSetup_removeRecentWorkspace(
    service: UserDataService,
    entry: {
      projectId: string;
      workspaceId: string;
      workspaceType: WorkspaceType;
    },
  ): RecentWorkspaceEntry[] {
    const recents = readRecents(service);
    recents.workspaces = recents.workspaces.filter(
      (w) =>
        !(
          w.projectId === entry.projectId &&
          w.workspaceId === entry.workspaceId &&
          w.workspaceType === entry.workspaceType
        ),
    );
    writeRecents(service, recents);
    return recents.workspaces;
  }

  static workspaceSetup_clearRecents(service: UserDataService): void {
    writeRecents(service, emptyRecents());
  }
}
