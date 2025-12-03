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
  optionalCustomListWithSchema,
  SerializationFactory,
  usingModelSchema,
} from '@finos/legend-shared';
import { createModelSchema, optional, primitive } from 'serializr';

export class ProjectDetails {
  groupId!: string;
  artifactId!: string;
  version!: string;

  static readonly serialization = new SerializationFactory(
    createModelSchema(ProjectDetails, {
      groupId: primitive(),
      artifactId: primitive(),
      version: primitive(),
    }),
  );
}

export enum BuildPhaseStatus {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  SUCCESS = 'SUCCESS',
  FAIL = 'FAIL',
  SKIPPED = 'SKIPPED',
}

export enum LogType {
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

export class BuildLog {
  log!: string;
  logType: LogType | undefined;
  title: string | undefined;

  static readonly serialization = new SerializationFactory(
    createModelSchema(BuildLog, {
      log: primitive(),
      logType: optional(primitive()),
      title: optional(primitive()),
    }),
  );
}

export class BuildPhaseActionState {
  phase!: string;
  status!: BuildPhaseStatus;
  message: string | undefined;
  logs: BuildLog[] | undefined;

  static readonly serialization = new SerializationFactory(
    createModelSchema(BuildPhaseActionState, {
      phase: primitive(),
      status: primitive(),
      message: optional(primitive()),
      logs: optionalCustomListWithSchema(BuildLog.serialization.schema),
    }),
  );
}

export class DeployProjectResponse {
  projectDetails!: ProjectDetails;
  finalStatus!: BuildPhaseStatus;
  phaseStates: BuildPhaseActionState[] | undefined;

  static readonly serialization = new SerializationFactory(
    createModelSchema(DeployProjectResponse, {
      projectDetails: usingModelSchema(ProjectDetails.serialization.schema),
      finalStatus: primitive(),
      phaseStates: optionalCustomListWithSchema(
        BuildPhaseActionState.serialization.schema,
      ),
    }),
  );
}
