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

import type {
  ConceptActivity,
  InitializationResult,
  InitializationActivity,
} from './models/Initialization.js';
import type { DirectoryNode } from './models/DirectoryTree.js';
import type { ConceptNode } from './models/ConceptTree.js';
import type { ExecutionActivity, ExecutionResult } from './models/Execution.js';
import type { FileData } from './models/PureFile.js';
import type { SearchResultEntry } from './models/SearchEntry.js';
import type {
  AbstractTestRunnerCheckResult,
  TestRunnerCancelResult,
} from './models/Test.js';
import type { Usage, UsageConcept } from './models/Usage.js';
import type { CommandResult } from './models/Command.js';
import {
  guaranteeNonNullable,
  type NetworkClient,
  type PlainObject,
} from '@finos/legend-shared';
import type { DiagramClassInfo, DiagramInfo } from './models/DiagramInfo.js';

export class PureClient {
  private networkClient: NetworkClient;

  // Pure IDE info
  userId = 'localuser';
  sessionId = `${this.userId}@${Date.now()}@abcd`; // dummy session ID
  compilerMode?: string | undefined;
  mode?: string | undefined;

  constructor(networkClient: NetworkClient) {
    this.networkClient = networkClient;
  }

  get baseUrl(): string {
    return guaranteeNonNullable(
      this.networkClient.baseUrl,
      `Pure client has not been configured properly`,
    );
  }

  initialize = (
    requestCache: boolean,
  ): Promise<PlainObject<InitializationResult>> =>
    this.networkClient.get(`${this.baseUrl}/initialize`, undefined, undefined, {
      requestCache,
      // checkFileConflict
      sessionId: this.sessionId,
      mode: this.mode,
      fastCompile: this.compilerMode,
    });

  getInitializationActivity = (): Promise<
    PlainObject<InitializationActivity>
  > =>
    this.networkClient.get(
      `${this.baseUrl}/initializationActivity`,
      undefined,
      undefined,
      {
        sessionId: this.sessionId,
      },
    );

  getFile = (path: string): Promise<PlainObject<File>> =>
    this.networkClient.get(
      `${this.baseUrl}/fileAsJson/${path}`,
      undefined,
      undefined,
      {
        sessionId: this.sessionId,
        mode: this.mode,
        fastCompile: this.compilerMode,
      },
    );

  getDirectoryChildren = (
    path?: string,
  ): Promise<PlainObject<DirectoryNode>[]> =>
    this.networkClient.get(`${this.baseUrl}/dir`, undefined, undefined, {
      parameters: path ?? '/',
      mode: this.mode,
      sessionId: this.sessionId,
    });

  getConceptChildren = (path?: string): Promise<PlainObject<ConceptNode>[]> =>
    this.networkClient.get(`${this.baseUrl}/execute`, undefined, undefined, {
      func: 'meta::pure::ide::display_ide(String[1]):String[1]',
      param: path ? `'${path}'` : "'::'",
      format: 'raw',
      mode: this.mode,
      sessionId: this.sessionId,
    });

  getConceptActivity = (): Promise<PlainObject<ConceptActivity>> =>
    this.networkClient.get(
      `${this.baseUrl}/conceptsActivity`,
      undefined,
      undefined,
      {
        sessionId: this.sessionId,
      },
    );

  execute = (
    openFiles: PlainObject<FileData>[],
    url: string,
    extraParams?: Record<PropertyKey, unknown>,
  ): Promise<PlainObject<ExecutionResult>> =>
    this.networkClient.post(
      `${this.baseUrl}/${url}`,
      {
        extraParams,
        openFiles,
      },
      undefined,
      undefined,
      {
        sessionId: this.sessionId,
        mode: this.mode,
        fastCompile: this.compilerMode,
      },
    );

  getExecutionActivity = (): Promise<PlainObject<ExecutionActivity>> =>
    this.networkClient.get(
      `${this.baseUrl}/executionActivity`,
      undefined,
      undefined,
      {
        sessionId: this.sessionId,
      },
    );

  findFiles = (searchText: string, isRegExp: boolean): Promise<string[]> =>
    this.networkClient.get(
      `${this.baseUrl}/findPureFiles`,
      undefined,
      undefined,
      {
        file: searchText,
        regex: isRegExp,
      },
    );

  searchText = (
    searchText: string,
    isCaseSensitive: boolean,
    isRegExp: boolean,
    limit = 2000,
  ): Promise<PlainObject<SearchResultEntry>[]> =>
    this.networkClient.get(
      `${this.baseUrl}/findInSources`,
      undefined,
      undefined,
      {
        string: searchText,
        caseSensitive: isCaseSensitive,
        regex: isRegExp,
        limit,
      },
    );

  checkTestRunner = (
    testRunnerId: number,
  ): Promise<PlainObject<AbstractTestRunnerCheckResult>> =>
    this.networkClient.get(
      `${this.baseUrl}/testRunnerCheck`,
      undefined,
      undefined,
      {
        sessionId: this.sessionId,
        testRunnerId,
      },
    );

  cancelTestRunner = (
    testRunnerId: number,
  ): Promise<PlainObject<TestRunnerCancelResult>> =>
    this.networkClient.get(
      `${this.baseUrl}/testRunnerCancel`,
      undefined,
      undefined,
      {
        sessionId: this.sessionId,
        testRunnerId,
      },
    );

  getConceptPath = (
    file: string,
    line: number,
    column: number,
  ): Promise<PlainObject<UsageConcept>> =>
    this.networkClient.get(
      `${this.baseUrl}/getConceptPath`,
      undefined,
      undefined,
      {
        file,
        line,
        column,
      },
    );

  getUsages = (func: string, param: string[]): Promise<PlainObject<Usage>[]> =>
    this.networkClient.get(`${this.baseUrl}/execute`, undefined, undefined, {
      func,
      param,
    });

  createFile = (path: string): Promise<PlainObject<CommandResult>> =>
    this.networkClient.get(
      `${this.baseUrl}/newFile/${path}`,
      undefined,
      undefined,
      {
        sessionId: this.sessionId,
        mode: this.mode,
        fastCompile: this.compilerMode,
      },
    );

  createFolder = (path: string): Promise<PlainObject<CommandResult>> =>
    this.networkClient.get(
      `${this.baseUrl}/newFolder/${path}`,
      undefined,
      undefined,
      {
        sessionId: this.sessionId,
        mode: this.mode,
        fastCompile: this.compilerMode,
      },
    );

  deleteDirectoryOrFile = (path: string): Promise<PlainObject<CommandResult>> =>
    this.networkClient.get(
      `${this.baseUrl}/deleteFile/${path}`,
      undefined,
      undefined,
      {
        sessionId: this.sessionId,
      },
    );

  getDiagramInfo = async (
    diagramPath: string,
  ): Promise<PlainObject<DiagramInfo>> =>
    JSON.parse(
      await this.networkClient.get(
        `${this.baseUrl}/execute`,
        undefined,
        undefined,
        {
          func: 'meta::pure::ide::diagram::getDiagramInfo_String_1__String_1_',
          param: [`'${diagramPath}'`],
        },
      ),
    );

  getDiagramClassInfo = async (
    classPath: string,
  ): Promise<PlainObject<DiagramClassInfo>> =>
    JSON.parse(
      await this.networkClient.get(
        `${this.baseUrl}/execute`,
        undefined,
        undefined,
        {
          func: 'meta::pure::ide::diagram::getDiagramClassInfo_String_1__String_1_',
          param: [`'${classPath}'`],
        },
      ),
    );
}
