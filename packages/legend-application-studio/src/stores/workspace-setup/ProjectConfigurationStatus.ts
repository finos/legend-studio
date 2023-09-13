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

import type { GenericLegendApplicationStore } from '@finos/legend-application';
import {
  ProjectConfigurationStatusReport,
  Review,
  type SDLCServerClient,
} from '@finos/legend-server-sdlc';
import { guaranteeNonNullable } from '@finos/legend-shared';

export class ProjectConfigurationStatus {
  projectId!: string;
  isConfigured = false;
  reviewUrl?: string | undefined;
  seenReview = false;
}

export const fetchProjectConfigurationStatus = async (
  projectId: string,
  patchReleaseVersionId: string | undefined,
  applicationStore: GenericLegendApplicationStore,
  sdlcServerClient: SDLCServerClient,
): Promise<ProjectConfigurationStatus> => {
  const status = ProjectConfigurationStatusReport.serialization.fromJson(
    await sdlcServerClient.projectConfigurationStatus(projectId),
  );
  const result = new ProjectConfigurationStatus();
  result.projectId = projectId;
  result.isConfigured = status.projectConfigured;
  if (status.reviewIds.length) {
    try {
      const review = Review.serialization.fromJson(
        await sdlcServerClient.getReview(
          projectId,
          patchReleaseVersionId,
          guaranteeNonNullable(status.reviewIds[0]),
        ),
      );
      result.reviewUrl = review.webURL;
    } catch {
      // do nothing
    }
  }
  if (!status.projectConfigured) {
    applicationStore.notificationService.notifyWarning(
      `Project is not configured: please check and commit the project setup review`,
    );
  }
  return result;
};
