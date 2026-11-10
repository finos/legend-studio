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

import {
  ActionState,
  assertErrorThrown,
  guaranteeNonNullable,
  hashObject,
  hashValue,
  type GeneratorFn,
  type PlainObject,
} from '@finos/legend-shared';
import {
  AuthorizableProjectAction,
  EntityChangeType,
  ProjectConfiguration,
  ProjectStructureVersion,
  ProjectType,
  Review,
  UpdatePlatformConfigurationsCommand,
  UpdateProjectConfigurationCommand,
  Workspace,
  WorkspaceType,
} from '@finos/legend-server-sdlc';
import type { Entity } from '@finos/legend-storage';
import { action, computed, flow, makeObservable, observable } from 'mobx';
import { DepotGenerationSpecification } from './DepotGenerationSpecification.js';
import type {
  DepotDashboardStore,
  GenerationSpecificationEntityState,
} from './DepotDashboardStore.js';

export const DEPOT_DASHBOARD_FLATTEN_WORKSPACE_ID =
  'depot-dashboard-flatten-generation';

export enum DEPOT_FLATTEN_STEP {
  READ_MASTER = 'Read the generation specification on master',
  CREATE_WORKSPACE = 'Create a group workspace',
  UPDATE_PROJECT_STRUCTURE = 'Update to the latest project structure',
  REMOVE_PLATFORM_OVERRIDES = 'Remove platform version overrides',
  FLATTEN = 'Flatten the stages into one',
  CREATE_REVIEW = 'Create a review',
}

export enum DEPOT_FLATTEN_STEP_STATUS {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  DONE = 'DONE',
  SKIPPED = 'SKIPPED',
  FAILED = 'FAILED',
}

export class DepotFlattenStep {
  readonly step: DEPOT_FLATTEN_STEP;
  status = DEPOT_FLATTEN_STEP_STATUS.PENDING;
  message: string | undefined;

  constructor(step: DEPOT_FLATTEN_STEP) {
    this.step = step;
    makeObservable(this, {
      status: observable,
      message: observable,
      setStatus: action,
    });
  }

  setStatus(status: DEPOT_FLATTEN_STEP_STATUS, message?: string): void {
    this.status = status;
    this.message = message;
  }
}

// Stops the run after a step that failed
class DepotFlattenStepError extends Error {}

/**
 * What the specification generates, in order: two specifications with the
 * same stages and file generations compare equal however their content is
 * written (pointers or plain paths, key order).
 */
const hashGenerationSpecification = (
  specification: DepotGenerationSpecification,
): string =>
  hashObject({
    stages: specification.generationNodes.map((node) => node.elementPaths),
    fileGenerations: specification.fileGenerations,
  });

/**
 * Puts every generation element into the first stage, in stage order, and
 * drops the other stages. An element in more than one stage is kept once.
 * The rest of the content, and the first stage's id, are kept.
 */
export const flattenGenerationSpecificationContent = (
  content: PlainObject,
): { content: PlainObject; repeatedElementPaths: string[] } => {
  const elementPaths: string[] = [];
  const repeatedElementPaths: string[] = [];
  DepotGenerationSpecification.serialization
    .fromJson(content)
    .generationElementPaths.forEach((path) => {
      if (!elementPaths.includes(path)) {
        elementPaths.push(path);
      } else if (!repeatedElementPaths.includes(path)) {
        repeatedElementPaths.push(path);
      }
    });
  const nodes = Array.isArray(content.generationNodes)
    ? (content.generationNodes as PlainObject[])
    : [];
  const stage: PlainObject = { ...nodes[0] };
  delete stage.generationElement;
  delete stage.generationElements;
  // a single element is written in the singular form, as before parallel stages
  if (elementPaths.length === 1) {
    stage.generationElement = elementPaths[0];
  } else {
    stage.generationElements = elementPaths;
  }
  return {
    content: { ...content, generationNodes: [stage] },
    repeatedElementPaths,
  };
};

/**
 * Flattens a generation specification's stages on its project's master:
 * creates a group workspace, brings it to the latest project structure without
 * platform version overrides, flattens the specification, and opens a review.
 * Each change is its own commit; the review is left for people to approve.
 */
export class DepotGenerationSpecificationFlattenState {
  readonly store: DepotDashboardStore;
  readonly entityState: GenerationSpecificationEntityState;
  readonly projectId: string;
  readonly steps = Object.values(DEPOT_FLATTEN_STEP).map(
    (step) => new DepotFlattenStep(step),
  );
  readonly preparingState = ActionState.create();
  readonly runningState = ActionState.create();

  masterContent: PlainObject | undefined;
  masterSpecification: DepotGenerationSpecification | undefined;
  matchesDepotVersion: boolean | undefined;
  workspace: Workspace | undefined;
  review: Review | undefined;
  // what the workspace changed, for the review description
  private projectStructureChange: string | undefined;
  private removedPlatformOverrides: string[] = [];
  private repeatedElementPaths: string[] = [];

  constructor(
    store: DepotDashboardStore,
    entityState: GenerationSpecificationEntityState,
  ) {
    this.store = store;
    this.entityState = entityState;
    this.projectId = guaranteeNonNullable(
      entityState.projectId,
      `The project of ${entityState.summary.path} is not known`,
    );
    makeObservable<
      DepotGenerationSpecificationFlattenState,
      'setWorkspace' | 'setReview'
    >(this, {
      masterContent: observable,
      masterSpecification: observable,
      matchesDepotVersion: observable,
      workspace: observable,
      review: observable,
      canStart: computed,
      canClose: computed,
      canSubmitReview: computed,
      setWorkspace: action,
      setReview: action,
      prepare: flow,
      run: flow,
    });
  }

  get path(): string {
    return this.entityState.summary.path;
  }

  get canStart(): boolean {
    return (
      this.preparingState.hasSucceeded &&
      this.runningState.isInInitialState &&
      (this.masterSpecification?.stageCount ?? 0) > 1
    );
  }

  get canClose(): boolean {
    return !this.runningState.isInProgress;
  }

  get canSubmitReview(): boolean {
    return Boolean(
      this.entityState.projectAccess?.actions.includes(
        AuthorizableProjectAction.SUBMIT_REVIEW,
      ),
    );
  }

  getStep(step: DEPOT_FLATTEN_STEP): DepotFlattenStep {
    return guaranteeNonNullable(
      this.steps.find((flattenStep) => flattenStep.step === step),
    );
  }

  private get sdlcServerClient(): NonNullable<
    DepotDashboardStore['sdlcServerClient']
  > {
    return guaranteeNonNullable(
      this.store.sdlcServerClient,
      `SDLC is not available`,
    );
  }

  /** Reads the specification on master and compares it with the row's */
  *prepare(): GeneratorFn<void> {
    const step = this.getStep(DEPOT_FLATTEN_STEP.READ_MASTER);
    try {
      this.preparingState.inProgress();
      step.setStatus(DEPOT_FLATTEN_STEP_STATUS.RUNNING);
      const entity = (yield this.sdlcServerClient.getEntity(
        this.projectId,
        undefined,
        this.path,
      )) as PlainObject<Entity>;
      const content = guaranteeNonNullable(
        entity.content as PlainObject | undefined,
        `${this.path} has no content on master`,
      );
      const masterSpecification =
        DepotGenerationSpecification.serialization.fromJson(content);
      this.masterContent = content;
      this.masterSpecification = masterSpecification;
      const depotSpecification = this.entityState.generationSpecification;
      this.matchesDepotVersion =
        depotSpecification !== undefined &&
        hashGenerationSpecification(depotSpecification) ===
          hashGenerationSpecification(masterSpecification);
      const version = this.entityState.summary.versionId;
      const comparison = this.matchesDepotVersion
        ? `Master matches ${version}`
        : `Master differs from ${version}; the flatten uses master's copy`;
      const stageCount = masterSpecification.stageCount;
      step.setStatus(
        DEPOT_FLATTEN_STEP_STATUS.DONE,
        stageCount > 1
          ? `${comparison}. ${stageCount} stages, ${masterSpecification.generationElementPaths.length} generation elements.`
          : `${comparison}. Master has ${stageCount === 1 ? 'one stage' : 'no stages'}: nothing to flatten.`,
      );
      this.preparingState.complete();
    } catch (error) {
      assertErrorThrown(error);
      step.setStatus(DEPOT_FLATTEN_STEP_STATUS.FAILED, error.message);
      this.preparingState.fail();
    }
  }

  *run(): GeneratorFn<void> {
    if (!this.canStart) {
      return;
    }
    this.runningState.inProgress();
    try {
      yield this.runStep(DEPOT_FLATTEN_STEP.CREATE_WORKSPACE, () =>
        this.createWorkspace(),
      );
      yield this.runStep(DEPOT_FLATTEN_STEP.UPDATE_PROJECT_STRUCTURE, () =>
        this.updateProjectStructure(),
      );
      yield this.runStep(DEPOT_FLATTEN_STEP.REMOVE_PLATFORM_OVERRIDES, () =>
        this.removePlatformOverrides(),
      );
      yield this.runStep(DEPOT_FLATTEN_STEP.FLATTEN, () => this.flatten());
      yield this.runStep(DEPOT_FLATTEN_STEP.CREATE_REVIEW, () =>
        this.createReview(),
      );
      this.runningState.complete();
    } catch (error) {
      assertErrorThrown(error);
      this.runningState.fail();
      if (!(error instanceof DepotFlattenStepError)) {
        this.store.applicationStore.notificationService.notifyError(error);
      }
    }
  }

  /**
   * Runs one step: its result says what it did, or why it was skipped when
   * `skipped` is set.
   */
  private async runStep(
    stepName: DEPOT_FLATTEN_STEP,
    perform: () => Promise<{ message: string; skipped?: boolean }>,
  ): Promise<void> {
    const step = this.getStep(stepName);
    step.setStatus(DEPOT_FLATTEN_STEP_STATUS.RUNNING);
    try {
      const result = await perform();
      step.setStatus(
        result.skipped
          ? DEPOT_FLATTEN_STEP_STATUS.SKIPPED
          : DEPOT_FLATTEN_STEP_STATUS.DONE,
        result.message,
      );
    } catch (error) {
      assertErrorThrown(error);
      step.setStatus(DEPOT_FLATTEN_STEP_STATUS.FAILED, error.message);
      throw new DepotFlattenStepError(error.message);
    }
  }

  private async createWorkspace(): Promise<{ message: string }> {
    const takenIds = (
      await this.sdlcServerClient.getGroupWorkspaces(this.projectId)
    ).map(
      (workspace) => Workspace.serialization.fromJson(workspace).workspaceId,
    );
    let workspaceId = DEPOT_DASHBOARD_FLATTEN_WORKSPACE_ID;
    while (takenIds.includes(workspaceId)) {
      workspaceId = `${DEPOT_DASHBOARD_FLATTEN_WORKSPACE_ID}-${hashValue(
        `${this.path}:${Date.now()}:${takenIds.length}`,
      ).slice(0, 8)}`;
    }
    // the response is read into a Workspace: its type, and so every later
    // call's address, comes from it
    const workspace = Workspace.serialization.fromJson(
      await this.sdlcServerClient.createWorkspace(
        this.projectId,
        undefined,
        workspaceId,
        WorkspaceType.GROUP,
      ),
    );
    this.setWorkspace(workspace);
    return { message: workspace.workspaceId };
  }

  private async getWorkspaceConfiguration(): Promise<ProjectConfiguration> {
    return ProjectConfiguration.serialization.fromJson(
      await this.sdlcServerClient.getConfiguration(
        this.projectId,
        this.guaranteedWorkspace,
      ),
    );
  }

  private buildConfigurationCommand(
    configuration: ProjectConfiguration,
    projectStructureVersion: ProjectStructureVersion,
    message: string,
  ): UpdateProjectConfigurationCommand {
    const command = new UpdateProjectConfigurationCommand(
      configuration.groupId,
      configuration.artifactId,
      projectStructureVersion,
      message,
    );
    command.projectDependenciesToAdd = [];
    command.projectDependenciesToRemove = [];
    return command;
  }

  private async updateProjectStructure(): Promise<{
    message: string;
    skipped?: boolean;
  }> {
    const configuration = await this.getWorkspaceConfiguration();
    const latest = ProjectStructureVersion.serialization.fromJson(
      await this.sdlcServerClient.getLatestProjectStructureVersion(),
    );
    // as Studio does: an embedded project has no extension version
    const isEmbedded = configuration.projectType === ProjectType.EMBEDDED;
    const target = new ProjectStructureVersion();
    target.version = latest.version;
    target.extensionVersion = isEmbedded ? undefined : latest.extensionVersion;
    const current = configuration.projectStructureVersion;
    if (
      current.version === target.version &&
      (isEmbedded || current.extensionVersion === target.extensionVersion)
    ) {
      return {
        message: `Already on the latest, ${current.fullVersion}`,
        skipped: true,
      };
    }
    await this.sdlcServerClient.updateConfiguration(
      this.projectId,
      this.guaranteedWorkspace,
      UpdateProjectConfigurationCommand.serialization.toJson(
        this.buildConfigurationCommand(
          configuration,
          target,
          'Depot dashboard: update to the latest project structure',
        ),
      ),
    );
    this.projectStructureChange = `${current.fullVersion} to ${target.fullVersion}`;
    return { message: this.projectStructureChange };
  }

  private async removePlatformOverrides(): Promise<{
    message: string;
    skipped?: boolean;
  }> {
    // read again: the structure may have just changed
    const configuration = await this.getWorkspaceConfiguration();
    const overrides = configuration.platformConfigurations ?? [];
    if (!overrides.length) {
      return { message: 'None to remove', skipped: true };
    }
    const command = this.buildConfigurationCommand(
      configuration,
      configuration.projectStructureVersion,
      'Depot dashboard: remove platform version overrides',
    );
    command.platformConfigurations = new UpdatePlatformConfigurationsCommand(
      undefined,
    );
    await this.sdlcServerClient.updateConfiguration(
      this.projectId,
      this.guaranteedWorkspace,
      UpdateProjectConfigurationCommand.serialization.toJson(command),
    );
    this.removedPlatformOverrides = overrides.map(
      (override) => `${override.name} ${override.version}`,
    );
    return { message: this.removedPlatformOverrides.join(', ') };
  }

  private async flatten(): Promise<{ message: string }> {
    // the workspace's copy, which is master's
    const entity = await this.sdlcServerClient.getEntity(
      this.projectId,
      this.guaranteedWorkspace,
      this.path,
    );
    const { content, repeatedElementPaths } =
      flattenGenerationSpecificationContent(
        guaranteeNonNullable(entity.content as PlainObject | undefined),
      );
    await this.sdlcServerClient.performEntityChanges(
      this.projectId,
      this.guaranteedWorkspace,
      {
        message: `Depot dashboard: flatten the stages of ${this.path}`,
        entityChanges: [
          {
            type: EntityChangeType.MODIFY,
            entityPath: this.path,
            classifierPath: entity.classifierPath as string,
            content,
          },
        ],
      },
    );
    this.repeatedElementPaths = repeatedElementPaths;
    const elementCount =
      DepotGenerationSpecification.serialization.fromJson(content)
        .generationElementPaths.length;
    return {
      message: `${this.masterSpecification?.stageCount} stages into one, with ${elementCount} generation elements`,
    };
  }

  get reviewDescription(): string {
    const lines = [
      `Flattens the stages of \`${this.path}\` into one stage, from the Depot dashboard.`,
      '',
      `> [!WARNING]`,
      `> All generation elements of one stage are generated against the same model. Before merging, check that no generation element uses what an element of an earlier stage generated: it would no longer see that output.`,
    ];
    const changes = [
      this.projectStructureChange
        ? `- Project structure updated from ${this.projectStructureChange}.`
        : undefined,
      this.removedPlatformOverrides.length
        ? `- Platform version overrides removed: ${this.removedPlatformOverrides.join(', ')}.`
        : undefined,
      this.repeatedElementPaths.length
        ? `- In more than one stage, now kept once: ${this.repeatedElementPaths
            .map((path) => `\`${path}\``)
            .join(', ')}.`
        : undefined,
    ].filter((change): change is string => change !== undefined);
    if (changes.length) {
      lines.push('', 'Also in this review:', ...changes);
    }
    return lines.join('\n');
  }

  private async createReview(): Promise<{ message: string }> {
    const workspace = this.guaranteedWorkspace;
    const review = Review.serialization.fromJson(
      await this.sdlcServerClient.createReview(this.projectId, undefined, {
        workspaceId: workspace.workspaceId,
        workspaceType: workspace.workspaceType,
        title: `Flatten the generation stages of ${this.path}`,
        description: this.reviewDescription,
      }),
    );
    this.setReview(review);
    return { message: review.title };
  }

  private get guaranteedWorkspace(): Workspace {
    return guaranteeNonNullable(this.workspace, `No workspace created yet`);
  }

  private setWorkspace(workspace: Workspace): void {
    this.workspace = workspace;
  }

  private setReview(review: Review): void {
    this.review = review;
  }
}
