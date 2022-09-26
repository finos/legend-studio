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
  DEFAULT_TYPEAHEAD_SEARCH_MINIMUM_SEARCH_LENGTH,
  DEFAULT_TYPEAHEAD_SEARCH_LIMIT,
} from '@finos/legend-application';
import {
  Project,
  ProjectConfigurationStatus,
  Review,
  type SDLCServerClient,
} from '@finos/legend-server-sdlc';
import {
  ActionState,
  assertErrorThrown,
  type GeneratorFn,
  guaranteeNonNullable,
  type PlainObject,
} from '@finos/legend-shared';
import { action, flow, makeObservable, observable } from 'mobx';
import type { LegendStudioApplicationStore } from '../LegendStudioBaseStore.js';

export abstract class ProjectSetupStore {
  applicationStore: LegendStudioApplicationStore;
  sdlcServerClient: SDLCServerClient;

  projects: Project[] = [];
  currentProject?: Project | undefined;
  currentProjectConfigurationStatus?: ProjectConfigurationStatus | undefined;
  currentProjectConfigurationReviewUrl?: string | undefined;
  loadProjectsState = ActionState.create();

  constructor(
    applicationStore: LegendStudioApplicationStore,
    sdlcServerClient: SDLCServerClient,
  ) {
    makeObservable(this, {
      projects: observable,
      currentProject: observable,
      currentProjectConfigurationStatus: observable,
      currentProjectConfigurationReviewUrl: observable,
      setCurrentProjectConfigurationStatus: action,
      setCurrentProjectConfigurationReviewUrl: action,
      resetCurrentProjectConfigurationStatus: action,
      loadProjects: flow,
      fetchCurrentProjectConfigurationStatus: flow,
      fetchCurrentProjectConfigurationReviewUrl: flow,
    });

    this.applicationStore = applicationStore;
    this.sdlcServerClient = sdlcServerClient;
  }

  *loadProjects(searchText: string): GeneratorFn<void> {
    const isValidSearchString =
      searchText.length >= DEFAULT_TYPEAHEAD_SEARCH_MINIMUM_SEARCH_LENGTH;
    this.loadProjectsState.inProgress();
    try {
      this.projects = (
        (yield this.sdlcServerClient.getProjects(
          undefined,
          isValidSearchString ? searchText : undefined,
          undefined,
          DEFAULT_TYPEAHEAD_SEARCH_LIMIT,
        )) as PlainObject<Project>[]
      ).map((v) => Project.serialization.fromJson(v));
      this.loadProjectsState.pass();
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.notifyError(error);
      this.loadProjectsState.fail();
    }
  }

  setCurrentProjectConfigurationStatus(
    val: ProjectConfigurationStatus | undefined,
  ): void {
    this.currentProjectConfigurationStatus = val;
  }

  setCurrentProjectConfigurationReviewUrl(val: string | undefined): void {
    this.currentProjectConfigurationReviewUrl = val;
  }

  resetCurrentProjectConfigurationStatus(): void {
    this.currentProjectConfigurationStatus = new ProjectConfigurationStatus();
    this.setCurrentProjectConfigurationReviewUrl(undefined);
  }

  *fetchCurrentProjectConfigurationStatus(): GeneratorFn<void> {
    if (this.currentProject) {
      this.setCurrentProjectConfigurationStatus(
        ProjectConfigurationStatus.serialization.fromJson(
          (yield this.sdlcServerClient.projectConfigurationStatus(
            this.currentProject.projectId,
          )) as PlainObject<ProjectConfigurationStatus>,
        ),
      );
      if (this.currentProjectConfigurationStatus?.projectConfigured === false) {
        this.applicationStore.notifyIllegalState(
          'Current project is not configured',
        );
        this.fetchCurrentProjectConfigurationReviewUrl();
      }
    } else {
      this.resetCurrentProjectConfigurationStatus();
    }
  }

  *fetchCurrentProjectConfigurationReviewUrl(): GeneratorFn<void> {
    if (
      this.currentProject &&
      !this.currentProjectConfigurationStatus?.projectConfigured &&
      this.currentProjectConfigurationStatus?.reviewIds.length
    ) {
      const projectConfigurationReviewObj =
        (yield this.sdlcServerClient.getReview(
          this.currentProject.projectId,
          guaranteeNonNullable(
            this.currentProjectConfigurationStatus.reviewIds[0],
          ),
        )) as PlainObject<Review>;
      const projectConfigurationReview = Review.serialization.fromJson(
        projectConfigurationReviewObj,
      );
      this.setCurrentProjectConfigurationReviewUrl(
        projectConfigurationReview.webURL,
      );
    } else {
      this.setCurrentProjectConfigurationReviewUrl(undefined);
    }
  }
}
