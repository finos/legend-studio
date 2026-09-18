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
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface QueryableSourceInfo {}

export type LegendSourceInfo = QueryableSourceInfo & {
  sourceType: string;
};

export enum LegendSourceType {
  PROJECT_GAV = 'legend-source-project-gav',
  PROJECT_PROJECTID = 'legend-source-project-projectId',
}

export type LegendGAVSourceInfo = LegendSourceInfo & {
  sourceType: LegendSourceType.PROJECT_GAV;
  groupId: string;
  artifactId: string;
  versionId: string;
};

export type LegendProjectIdSourceInfo = LegendSourceInfo & {
  sourceType: LegendSourceType.PROJECT_PROJECTID;
  projectId: string;
  /**
   * Optional Maven-style coordinates the SDLC project publishes to (from
   * the project configuration). Populated when the graph has finished
   * initializing so that project-id viewer telemetry can be joined with
   * GAV-viewer telemetry.
   */
  groupId?: string | undefined;
  artifactId?: string | undefined;
  /**
   * Pinned version or revision the viewer is showing. Undefined when the
   * viewer is on project HEAD.
   */
  versionId?: string | undefined;
};
