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

import type { CubeContext } from '@finos/legend-cube';
import { assertErrorThrown, type GeneratorFn } from '@finos/legend-shared';
import {
  action,
  computed,
  flow,
  flowResult,
  makeObservable,
  observable,
  override,
} from 'mobx';
import {
  createCubeProjectModel,
  getCubeProjectCoordinates,
  isCubeProjectModel,
} from '../../graph-manager/CubeProject.js';
import type { CubeProjectSummary } from '../../graph-manager/CubeProjectCatalog.js';
import type { CubeEditorState } from '../CubeEditorState.js';
import { CubeInlineModelTabState } from './CubeInlineModelTabState.js';
import { CubeSourcePickerTabKey } from './CubeSourcePickerTab.js';

/** A project as the tab keys it: `group:artifact` */
export const getCubeProjectKey = (project: CubeProjectSummary): string =>
  `${project.groupId}:${project.artifactId}`;

const toMessage = (error: unknown): string => {
  assertErrorThrown(error);
  return error.message;
};

/**
 * The source dialog's Project tab (PLAN §6.3): a published project in the
 * host's depot, one of its released versions (the newest picked), then, as
 * in the Model tab, one of the project's own Databases, a runtime keyed by
 * it, a schema and a table. The first table saves the project at that
 * version as the cube's model; every later table comes from it.
 */
export class CubeProjectTabState extends CubeInlineModelTabState {
  override readonly key = CubeSourcePickerTabKey.PROJECT;
  override readonly label = 'Project';

  projects: readonly CubeProjectSummary[] | undefined;
  isLoadingProjects = false;
  projectKey: string | undefined;
  versions: readonly string[] | undefined;
  isLoadingVersions = false;
  versionId: string | undefined;
  /** Why the projects or versions couldn't be listed */
  listError: string | undefined;

  constructor(editorState: CubeEditorState) {
    super(editorState);
    makeObservable(this, {
      projects: observable.ref,
      isLoadingProjects: observable,
      projectKey: observable,
      versions: observable.ref,
      isLoadingVersions: observable,
      versionId: observable,
      listError: observable,
      isBusy: override,
      fixedProjectKey: computed,
      open: override,
      loadProjects: flow,
      selectProject: flow,
      selectVersion: action,
    });
  }

  override get isAvailable(): boolean {
    return this.editorState.host.projectCatalog !== undefined;
  }

  override get isBusy(): boolean {
    return this.isLoadingProjects || this.isLoadingVersions || super.isBusy;
  }

  /** A cube on a project model is this tab's, whether or not Cube can run it */
  override ownsContext(context: CubeContext): boolean {
    return isCubeProjectModel(context.model);
  }

  /** The cube's project, fixed by its first table */
  get fixedProjectKey(): string | undefined {
    const model = this.fixedContext?.model;
    const project = model ? getCubeProjectCoordinates(model) : undefined;
    return project ? getCubeProjectKey(project) : undefined;
  }

  /**
   * When the dialog opens on the tab: on the cube's project and version, else
   * on the project picked last, listing the projects the first time (and
   * again after a failure)
   */
  override open(): void {
    this.error = undefined;
    const fixedModel = this.fixedContext?.model;
    if (fixedModel) {
      const project = getCubeProjectCoordinates(fixedModel);
      if (project) {
        this.projectKey = getCubeProjectKey(project);
        this.versions = [project.versionId];
        this.versionId = project.versionId;
      }
      if (fixedModel !== this.model || !this.outline) {
        flowResult(this.selectModel(fixedModel)).catch(
          this.editorState.host.applicationStore.alertUnhandledError,
        );
      }
      return;
    }
    if (this.projects === undefined && !this.isLoadingProjects) {
      flowResult(this.loadProjects()).catch(
        this.editorState.host.applicationStore.alertUnhandledError,
      );
    }
  }

  /** Lists the depot's projects; a single one is picked */
  *loadProjects(): GeneratorFn<void> {
    const catalog = this.editorState.host.projectCatalog;
    if (!catalog) {
      return;
    }
    this.isLoadingProjects = true;
    this.listError = undefined;
    try {
      this.projects = (yield catalog.listProjects()) as CubeProjectSummary[];
      const [onlyProject, ...otherProjects] = this.projects;
      if (onlyProject && !otherProjects.length) {
        yield flowResult(this.selectProject(getCubeProjectKey(onlyProject)));
      }
    } catch (error) {
      this.listError = `Can't list the depot's projects: ${toMessage(error)}`;
    } finally {
      this.isLoadingProjects = false;
    }
  }

  /** Picks a project and lists its released versions, picking the newest */
  *selectProject(key: string | undefined): GeneratorFn<void> {
    const catalog = this.editorState.host.projectCatalog;
    this.projectKey = key;
    this.versions = undefined;
    this.versionId = undefined;
    this.model = undefined;
    this.outline = undefined;
    this.error = undefined;
    this.listError = undefined;
    this.resetFrom('database');
    const project = this.projects?.find(
      (candidate) => getCubeProjectKey(candidate) === key,
    );
    if (!catalog || !project) {
      return;
    }
    this.isLoadingVersions = true;
    try {
      const versions = (yield catalog.listVersions(project)) as string[];
      if (this.projectKey !== key) {
        return;
      }
      this.versions = versions;
      if (!versions.length) {
        this.listError = `${key} has no released version`;
        return;
      }
      this.selectVersion(versions[0]);
    } catch (error) {
      if (this.projectKey === key) {
        this.listError = `Can't list the versions of ${key}: ${toMessage(error)}`;
      }
    } finally {
      if (this.projectKey === key) {
        this.isLoadingVersions = false;
      }
    }
  }

  /** Picks a version and loads its Databases and runtimes */
  selectVersion(versionId: string | undefined): void {
    this.versionId = versionId;
    const project = this.projects?.find(
      (candidate) => getCubeProjectKey(candidate) === this.projectKey,
    );
    if (!project || versionId === undefined) {
      this.model = undefined;
      this.outline = undefined;
      this.resetFrom('database');
      return;
    }
    flowResult(
      this.selectModel(
        createCubeProjectModel({
          groupId: project.groupId,
          artifactId: project.artifactId,
          versionId,
        }),
      ),
    ).catch(this.editorState.host.applicationStore.alertUnhandledError);
  }
}
