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
} from '../server/models/Initialization.js';
import type { DirectoryNode } from '../server/models/DirectoryTree.js';
import type { ConceptNode } from '../server/models/ConceptTree.js';
import type {
  ExecutionActivity,
  ExecutionResult,
} from '../server/models/Execution.js';
import type { FileData } from './models/File.js';
import type {
  SearchResultCoordinate,
  SearchResultEntry,
} from '../server/models/SearchEntry.js';
import {
  type AbstractTestRunnerCheckResult,
  type TestRunnerCancelResult,
} from '../server/models/Test.js';
import {
  type Usage,
  type ConceptInfo,
  type PackageableElementUsage,
  FIND_USAGE_FUNCTION_PATH,
} from '../server/models/Usage.js';
import type { CommandResult } from '../server/models/Command.js';
import {
  guaranteeNonNullable,
  type NetworkClient,
  type PlainObject,
} from '@finos/legend-shared';
import type {
  DiagramClassInfo,
  DiagramInfo,
} from '../server/models/DiagramInfo.js';
import type {
  SourceModificationResult,
  UpdateSourceInput,
} from './models/Source.js';
import type { RenameConceptInput } from './models/RenameConcept.js';
import type {
  ChildPackageableElementInfo,
  MovePackageableElementsInput,
} from './models/MovePackageableElements.js';
import type {
  AttributeSuggestion,
  ClassSuggestion,
  ElementSuggestion,
  VariableSuggestion,
} from './models/Suggestion.js';
import { ROOT_PACKAGE_PATH } from '../stores/PureIDEConfig.js';

export class PureServerClient {
  private readonly networkClient: NetworkClient;

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
      `Pure server client has not been configured properly`,
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

  // ------------------------------------------- Search -------------------------------------------

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
    limit = 100,
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

  getTextSearchPreview = (
    coordinates: SearchResultCoordinate[],
  ): Promise<PlainObject<SearchResultCoordinate>[]> =>
    this.networkClient.post(
      `${this.baseUrl}/getTextSearchPreview`,
      coordinates,
    );

  // ------------------------------------------- Test -------------------------------------------

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

  cancelTestRunner = (testRunnerId: number): Promise<TestRunnerCancelResult> =>
    this.networkClient.get(
      `${this.baseUrl}/testRunnerCancel`,
      undefined,
      undefined,
      {
        sessionId: this.sessionId,
        testRunnerId,
      },
    );

  getPCTAdapters = async (): Promise<PlainObject<Usage>[]> => {
    const result = await this.networkClient.get(
      `${this.baseUrl}/execute`,
      undefined,
      undefined,
      {
        func: 'meta::pure::ide::testing::getPCTAdapters__Pair_MANY_',
      },
    );
    return (Array.isArray(result) ? result : [result]) as PlainObject<Usage>[];
  };

  // ------------------------------------------- Concept -------------------------------------------

  getConceptChildren = (path?: string): Promise<PlainObject<ConceptNode>[]> =>
    this.networkClient.get(`${this.baseUrl}/execute`, undefined, undefined, {
      func: 'meta::pure::ide::display_ide(String[1]):String[1]',
      param: path ? `'${path}'` : `'${ROOT_PACKAGE_PATH}'`,
      format: 'raw',
      mode: this.mode,
      sessionId: this.sessionId,
    });

  getConceptInfo = async (
    file: string,
    line: number,
    column: number,
  ): Promise<ConceptInfo> => {
    const result = await this.networkClient.get<
      ConceptInfo & { error: boolean; text: string }
    >(`${this.baseUrl}/getConceptInfo`, undefined, undefined, {
      file,
      line,
      column,
    });
    if (result.error) {
      throw new Error(result.text);
    }
    return result;
  };

  getUsages = async (
    func: string,
    param: string[],
  ): Promise<PlainObject<Usage>[]> => {
    const result = await this.networkClient.get(
      `${this.baseUrl}/execute`,
      undefined,
      undefined,
      {
        func,
        param,
      },
    );
    return (Array.isArray(result) ? result : [result]) as PlainObject<Usage>[];
  };

  renameConcept = (input: RenameConceptInput): Promise<void> =>
    this.networkClient.put(`${this.baseUrl}/renameConcept`, input);

  movePackageableElements = (
    inputs: MovePackageableElementsInput[],
  ): Promise<void> =>
    this.networkClient.put(`${this.baseUrl}/movePackageableElements`, inputs);

  getPackageableElementsUsage = async (
    paths: string[],
  ): Promise<PlainObject<PackageableElementUsage>[]> => {
    const result = await this.networkClient.get(
      `${this.baseUrl}/execute`,
      undefined,
      undefined,
      {
        func: FIND_USAGE_FUNCTION_PATH.MULTIPLE_PATHS,
        param: [`'${paths.join(',')}'`],
      },
    );
    return (Array.isArray(result) ? result : [result]) as PlainObject<Usage>[];
  };

  getChildPackageableElements = async (
    packagePath: string,
  ): Promise<ChildPackageableElementInfo[]> => {
    const result = await this.networkClient.get(
      `${this.baseUrl}/execute`,
      undefined,
      undefined,
      {
        func: 'meta::pure::ide::getChildPackageableElements_String_1__String_MANY_',
        param: [`'${packagePath}'`],
      },
    );
    return (Array.isArray(result) ? result : [result]).map((child) =>
      JSON.parse(child),
    );
  };

  // ------------------------------------------- IO / File Management -------------------------------------------

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

  updateSource = (
    updateInputs: UpdateSourceInput[],
  ): Promise<PlainObject<SourceModificationResult>> =>
    this.networkClient.put(`${this.baseUrl}/updateSource`, updateInputs);

  createFile = (path: string): Promise<PlainObject<CommandResult>> =>
    this.networkClient.post(
      `${this.baseUrl}/newFile/${path}`,
      undefined,
      undefined,
      undefined,
      {
        sessionId: this.sessionId,
        mode: this.mode,
        fastCompile: this.compilerMode,
      },
    );

  createFolder = (path: string): Promise<PlainObject<CommandResult>> =>
    this.networkClient.post(
      `${this.baseUrl}/newFolder/${path}`,
      undefined,
      undefined,
      undefined,
      {
        sessionId: this.sessionId,
        mode: this.mode,
        fastCompile: this.compilerMode,
      },
    );

  renameFile = (
    oldPath: string,
    newPath: string,
  ): Promise<PlainObject<CommandResult>> =>
    this.networkClient.put(
      `${this.baseUrl}/renameFile`,
      {
        oldPath,
        newPath,
      },
      undefined,
    );

  deleteDirectoryOrFile = (path: string): Promise<PlainObject<CommandResult>> =>
    this.networkClient.delete(
      `${this.baseUrl}/deleteFile/${path}`,
      undefined,
      undefined,
      undefined,
      {
        sessionId: this.sessionId,
      },
    );

  // ------------------------------------------- Diagram -------------------------------------------

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

  // ------------------------------------------- Suggestion -------------------------------------------

  getSuggestionsForIncompletePath = (
    currentPackagePath: string,
    types: string[],
  ): Promise<PlainObject<ElementSuggestion>[]> =>
    this.networkClient.post(`${this.baseUrl}/suggestion/incompletePath`, {
      path: currentPackagePath,
      types,
    });

  getSuggestionsForIdentifier = (
    importPaths: string[],
    types: string[],
  ): Promise<PlainObject<ElementSuggestion>[]> =>
    this.networkClient.post(`${this.baseUrl}/suggestion/identifier`, {
      importPaths,
      types,
    });

  getSuggestionsForAttribute = (
    importPaths: string[],
    path: string,
  ): Promise<PlainObject<AttributeSuggestion>[]> =>
    this.networkClient.post(`${this.baseUrl}/suggestion/attribute`, {
      importPaths,
      path,
    });

  getSuggestionsForClass = (
    importPaths: string[],
  ): Promise<PlainObject<ClassSuggestion>[]> =>
    this.networkClient.post(`${this.baseUrl}/suggestion/class`, {
      importPaths,
    });

  getSuggestionsForVariable = (
    sourceId: string,
    line: number,
    column: number,
  ): Promise<PlainObject<VariableSuggestion>[]> =>
    this.networkClient.post(`${this.baseUrl}/suggestion/variable`, {
      sourceId,
      line,
      column,
    });
}
