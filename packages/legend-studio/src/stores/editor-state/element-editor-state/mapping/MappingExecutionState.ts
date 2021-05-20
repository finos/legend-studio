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

import type { MappingEditorState } from './MappingEditorState';
import type { EditorStore } from '../../../EditorStore';
import {
  observable,
  action,
  flow,
  computed,
  makeObservable,
  makeAutoObservable,
} from 'mobx';
import type { RawGraphFetchTreeData } from '../../../shared/RawGraphFetchTreeUtil';
import {
  guaranteeNonNullable,
  assertTrue,
  IllegalStateError,
  UnsupportedOperationError,
  uuid,
  tryToMinifyJSONString,
  toGrammarString,
  isValidJSONString,
  createUrlStringFromData,
  losslessStringify,
  getClass,
} from '@finos/legend-studio-shared';
import { CLIENT_VERSION } from '../../../../models/MetaModelConst';
import { CORE_LOG_EVENT } from '../../../../utils/Logger';
import { createMockDataForMappingElementSource } from '../../../shared/MockDataUtil';
import { MappingTest } from '../../../../models/metamodels/pure/model/packageableElements/mapping/MappingTest';
import { Class } from '../../../../models/metamodels/pure/model/packageableElements/domain/Class';
import {
  ObjectInputData,
  OBJECT_INPUT_TYPE,
} from '../../../../models/metamodels/pure/model/packageableElements/store/modelToModel/mapping/ObjectInputData';
import { ExpectedOutputMappingTestAssert } from '../../../../models/metamodels/pure/model/packageableElements/mapping/ExpectedOutputMappingTestAssert';
import type { RawLambda } from '../../../../models/metamodels/pure/model/rawValueSpecification/RawLambda';
import type { Runtime } from '../../../../models/metamodels/pure/model/packageableElements/runtime/Runtime';
import {
  IdentifiedConnection,
  EngineRuntime,
} from '../../../../models/metamodels/pure/model/packageableElements/runtime/Runtime';
import { JsonModelConnection } from '../../../../models/metamodels/pure/model/packageableElements/store/modelToModel/connection/JsonModelConnection';
import { FlatDataConnection } from '../../../../models/metamodels/pure/model/packageableElements/store/flatData/connection/FlatDataConnection';
import type { InputData } from '../../../../models/metamodels/pure/model/packageableElements/mapping/InputData';
import { FlatDataInputData } from '../../../../models/metamodels/pure/model/packageableElements/store/flatData/mapping/FlatDataInputData';
import type {
  MappingElementSource,
  Mapping,
} from '../../../../models/metamodels/pure/model/packageableElements/mapping/Mapping';
import { Service } from '../../../../models/metamodels/pure/model/packageableElements/service/Service';
import {
  SingleExecutionTest,
  TestContainer,
} from '../../../../models/metamodels/pure/model/packageableElements/service/ServiceTest';
import { PureSingleExecution } from '../../../../models/metamodels/pure/model/packageableElements/service/ServiceExecution';
import { RootFlatDataRecordType } from '../../../../models/metamodels/pure/model/packageableElements/store/flatData/model/FlatDataDataType';
import type { FlatData } from '../../../../models/metamodels/pure/model/packageableElements/store/flatData/model/FlatData';
import type { Connection } from '../../../../models/metamodels/pure/model/packageableElements/connection/Connection';
import { PackageableElementExplicitReference } from '../../../../models/metamodels/pure/model/packageableElements/PackageableElementReference';
import type { ExecutionResult } from '../../../../models/metamodels/pure/action/execution/ExecutionResult';
import { TAB_SIZE } from '../../../EditorConfig';

abstract class MappingExecutionQueryState {
  uuid = uuid();
  editorStore: EditorStore;
  abstract get isValid(): boolean;
  abstract get query(): RawLambda;

  constructor(editorStore: EditorStore) {
    this.editorStore = editorStore;
  }
}

export class MappingExecutionGraphFetchQueryState extends MappingExecutionQueryState {
  target?: Class;
  graphFetchTree?: RawGraphFetchTreeData;

  constructor(editorStore: EditorStore) {
    super(editorStore);

    makeObservable(this, {
      target: observable,
      graphFetchTree: observable,
      setTarget: action,
      setGraphFetchTree: action,
      isValid: computed,
    });
  }

  setTarget = (target: Class | undefined): void => {
    this.target = target;
  };
  setGraphFetchTree = (
    graphFetchTree: RawGraphFetchTreeData | undefined,
  ): void => {
    this.graphFetchTree = graphFetchTree;
  };

  get isValid(): boolean {
    return Boolean(this.target);
  }

  get query(): RawLambda {
    const rootGraphFetchTree = guaranteeNonNullable(
      this.graphFetchTree?.root.graphFetchTreeNode,
    );
    return rootGraphFetchTree.isEmpty
      ? this.editorStore.graphState.graphManager.HACKY_createGetAllLambda(
          guaranteeNonNullable(this.target),
        )
      : this.editorStore.graphState.graphManager.HACKY_createGraphFetchLambda(
          rootGraphFetchTree,
          guaranteeNonNullable(this.target),
        );
  }
}

abstract class MappingExecutionRuntimeState {
  uuid = uuid();
  editorStore: EditorStore;
  mapping: Mapping;

  constructor(editorStore: EditorStore, mapping: Mapping) {
    this.editorStore = editorStore;
    this.mapping = mapping;
  }

  abstract get isValid(): boolean;
  abstract get runtime(): Runtime;
  abstract get inputData(): InputData;
}

export const createRuntimeForExecution = (
  mapping: Mapping,
  connection: Connection,
): Runtime => {
  const runtime = new EngineRuntime();
  runtime.addMapping(PackageableElementExplicitReference.create(mapping));
  runtime.addIdentifiedConnection(
    new IdentifiedConnection(
      runtime.generateIdentifiedConnectionId(),
      connection,
    ),
  );
  return runtime;
};

export class MappingExecutionEmptyRuntimeState extends MappingExecutionRuntimeState {
  get isValid(): boolean {
    return false;
  }
  get runtime(): Runtime {
    throw new IllegalStateError(
      'Mapping execution runtime information is not specified',
    );
  }
  get inputData(): InputData {
    throw new IllegalStateError(
      'Mapping execution runtime information is not specified',
    );
  }
}

export class MappingExecutionJsonModelConnectionRuntimeState extends MappingExecutionRuntimeState {
  sourceClass?: Class;
  testData = '{}';

  constructor(editorStore: EditorStore, mapping: Mapping) {
    super(editorStore, mapping);

    makeObservable(this, {
      sourceClass: observable,
      testData: observable,
      setSourceClass: action,
      setTestData: action,
      isValid: computed,
    });
  }

  setSourceClass = (sourceClass: Class | undefined): void => {
    this.sourceClass = sourceClass;
  };
  setTestData = (testData: string): void => {
    this.testData = testData;
  };

  get isValid(): boolean {
    return isValidJSONString(this.testData) && Boolean(this.sourceClass);
  }

  get runtime(): Runtime {
    assertTrue(
      isValidJSONString(this.testData),
      'Model-to-model mapping execution test data is not a valid JSON string',
    );
    const engineConfig = this.editorStore.graphState.graphManager.getEngineConfig();
    return createRuntimeForExecution(
      this.mapping,
      new JsonModelConnection(
        PackageableElementExplicitReference.create(
          this.editorStore.graphState.graph.modelStore,
        ),
        PackageableElementExplicitReference.create(
          guaranteeNonNullable(this.sourceClass),
        ),
        createUrlStringFromData(
          tryToMinifyJSONString(this.testData),
          JsonModelConnection.CONTENT_TYPE,
          engineConfig.useBase64ForAdhocConnectionDataUrls,
        ),
      ),
    );
  }

  get inputData(): InputData {
    return new ObjectInputData(
      PackageableElementExplicitReference.create(
        guaranteeNonNullable(this.sourceClass),
      ),
      OBJECT_INPUT_TYPE.JSON,
      tryToMinifyJSONString(this.testData),
    );
  }
}

export class MappingExecutionFlatDataConnectionRuntimeState extends MappingExecutionRuntimeState {
  sourceFlatData?: FlatData;
  testData = '';

  constructor(editorStore: EditorStore, mapping: Mapping) {
    super(editorStore, mapping);

    makeObservable(this, {
      sourceFlatData: observable,
      testData: observable,
      setSourceFlatData: action,
      setTestData: action,
      isValid: computed,
    });
  }

  setSourceFlatData = (sourceFlatData: FlatData | undefined): void => {
    this.sourceFlatData = sourceFlatData;
  };
  setTestData = (testData: string): void => {
    this.testData = testData;
  };

  get isValid(): boolean {
    return Boolean(this.sourceFlatData);
  }
  get runtime(): Runtime {
    const engineConfig = this.editorStore.graphState.graphManager.getEngineConfig();
    return createRuntimeForExecution(
      this.mapping,
      new FlatDataConnection(
        PackageableElementExplicitReference.create(
          guaranteeNonNullable(this.sourceFlatData),
        ),
        createUrlStringFromData(
          this.testData,
          FlatDataConnection.CONTENT_TYPE,
          engineConfig.useBase64ForAdhocConnectionDataUrls,
        ),
      ),
    );
  }
  get inputData(): InputData {
    return new FlatDataInputData(
      PackageableElementExplicitReference.create(
        guaranteeNonNullable(this.sourceFlatData),
      ),
      this.testData,
    );
  }
}

export class MappingExecutionState {
  editorStore: EditorStore;
  mappingEditorState: MappingEditorState;
  isExecuting = false;
  isGeneratingPlan = false;
  queryState: MappingExecutionQueryState;
  runtimeState: MappingExecutionRuntimeState;
  executionPlan?: object;
  executionResultText?: string; // NOTE: stored as lessless JSON text
  showServicePathModal = false;

  constructor(
    editorStore: EditorStore,
    mappingEditorState: MappingEditorState,
  ) {
    makeAutoObservable(this, {
      editorStore: false,
      mappingEditorState: false,
      executionPlan: observable.ref,
      setQueryState: action,
      setRuntimeState: action,
      setExecutionResultText: action,
      setExecutionPlan: action,
      setShowServicePathModal: action,
      setRuntimeStateBasedOnSource: action,
      reset: action,
    });

    this.editorStore = editorStore;
    this.mappingEditorState = mappingEditorState;
    this.queryState = new MappingExecutionGraphFetchQueryState(editorStore);
    this.runtimeState = new MappingExecutionEmptyRuntimeState(
      editorStore,
      mappingEditorState.mapping,
    );
  }

  setQueryState = (queryState: MappingExecutionQueryState): void => {
    this.queryState = queryState;
  };
  setRuntimeState = (runtimeState: MappingExecutionRuntimeState): void => {
    this.runtimeState = runtimeState;
  };
  setExecutionResultText = (executionResult: string | undefined): void => {
    this.executionResultText = executionResult;
  };
  setExecutionPlan = (executionPlan: object | undefined): void => {
    this.executionPlan = executionPlan;
  };
  setShowServicePathModal = (showModal: boolean): void => {
    this.showServicePathModal = showModal;
  };

  reset(): void {
    this.queryState = new MappingExecutionGraphFetchQueryState(
      this.editorStore,
    );
    this.runtimeState = new MappingExecutionEmptyRuntimeState(
      this.editorStore,
      this.mappingEditorState.mapping,
    );
    this.setExecutionResultText(undefined);
  }

  setRuntimeStateBasedOnSource(
    source: MappingElementSource | undefined,
    populateWithMockData: boolean,
  ): void {
    if (source instanceof Class) {
      const newRuntimeState = new MappingExecutionJsonModelConnectionRuntimeState(
        this.editorStore,
        this.mappingEditorState.mapping,
      );
      if (populateWithMockData) {
        newRuntimeState.setSourceClass(source);
        newRuntimeState.setTestData(
          createMockDataForMappingElementSource(source),
        );
      }
      this.setRuntimeState(newRuntimeState);
    } else if (source instanceof RootFlatDataRecordType) {
      const newRuntimeState = new MappingExecutionFlatDataConnectionRuntimeState(
        this.editorStore,
        this.mappingEditorState.mapping,
      );
      if (populateWithMockData) {
        newRuntimeState.setSourceFlatData(source.owner.owner);
        newRuntimeState.setTestData(
          createMockDataForMappingElementSource(source),
        );
      }
      this.setRuntimeState(newRuntimeState);
    } else if (source === undefined) {
      this.setRuntimeState(
        new MappingExecutionEmptyRuntimeState(
          this.editorStore,
          this.mappingEditorState.mapping,
        ),
      );
    } else {
      this.editorStore.applicationStore.notifyWarning(
        `Can't build runtime for unsupported source of type '${
          getClass(source).name
        }'`,
      );
    }
  }

  promoteToTest = flow(function* (this: MappingExecutionState) {
    try {
      const query = this.queryState.query;
      if (
        this.queryState.isValid &&
        this.runtimeState.isValid &&
        this.executionResultText
      ) {
        const inputData = this.runtimeState.inputData;
        const assert = new ExpectedOutputMappingTestAssert(
          toGrammarString(this.executionResultText),
        );
        const mappingTest = new MappingTest(
          this.mappingEditorState.mapping.generateTestName(),
          query,
          [inputData],
          assert,
        );
        yield this.mappingEditorState.addTest(mappingTest);
        this.reset();
      }
    } catch (error: unknown) {
      this.editorStore.applicationStore.logger.error(
        CORE_LOG_EVENT.EXECUTION_PROBLEM,
        error,
      );
      this.editorStore.applicationStore.notifyError(error);
    }
  });

  promoteToService = flow(function* (
    this: MappingExecutionState,
    packageName: string,
    serviceName: string,
  ) {
    try {
      const query = this.queryState.query;
      if (
        this.queryState.isValid &&
        this.runtimeState.isValid &&
        this.executionResultText
      ) {
        if (
          this.runtimeState instanceof
          MappingExecutionJsonModelConnectionRuntimeState
        ) {
          const service = new Service(serviceName);
          service.initNewService();
          const pureSingleExecution = new PureSingleExecution(
            query,
            service,
            PackageableElementExplicitReference.create(
              this.mappingEditorState.mapping,
            ),
            this.runtimeState.runtime,
          );
          service.setExecution(pureSingleExecution);
          const singleExecutionTest = new SingleExecutionTest(
            service,
            tryToMinifyJSONString(this.runtimeState.testData),
          );
          const testContainer = new TestContainer(
            this.editorStore.graphState.graphManager.HACKY_createAssertLambda(
              this.executionResultText,
            ),
            singleExecutionTest,
          );
          singleExecutionTest.asserts.push(testContainer);
          const servicePackage = this.editorStore.graphState.graph.getOrCreatePackageWithPackageName(
            packageName,
          );
          service.test = singleExecutionTest;
          servicePackage.addElement(service);
          this.editorStore.graphState.graph.addElement(service);
          this.editorStore.openElement(service);
        } else {
          throw new UnsupportedOperationError();
        }
      }
    } catch (error: unknown) {
      this.editorStore.applicationStore.logger.error(
        CORE_LOG_EVENT.EXECUTION_PROBLEM,
        error,
      );
      this.editorStore.applicationStore.notifyError(error);
    }
  });

  executeMapping = flow(function* (this: MappingExecutionState) {
    try {
      const query = this.queryState.query;
      const runtime = this.runtimeState.runtime;
      if (
        this.queryState.isValid &&
        this.runtimeState.isValid &&
        !this.isExecuting
      ) {
        this.isExecuting = true;
        const result = ((yield this.editorStore.graphState.graphManager.executeMapping(
          this.editorStore.graphState.graph,
          this.mappingEditorState.mapping,
          query,
          runtime,
          CLIENT_VERSION.VX_X_X,
          true,
        )) as unknown) as ExecutionResult;
        this.setExecutionResultText(
          losslessStringify(result.values, undefined, TAB_SIZE),
        );
      }
    } catch (error: unknown) {
      this.editorStore.applicationStore.logger.error(
        CORE_LOG_EVENT.EXECUTION_PROBLEM,
        error,
      );
      this.editorStore.applicationStore.notifyError(error);
    } finally {
      this.isExecuting = false;
    }
  });

  generatePlan = flow(function* (this: MappingExecutionState) {
    try {
      const query = this.queryState.query;
      const runtime = this.runtimeState.runtime;
      if (
        this.queryState.isValid &&
        this.runtimeState.isValid &&
        !this.isGeneratingPlan
      ) {
        this.isGeneratingPlan = true;
        const plan = ((yield this.editorStore.graphState.graphManager.generateExecutionPlan(
          this.editorStore.graphState.graph,
          this.mappingEditorState.mapping,
          query,
          runtime,
          CLIENT_VERSION.VX_X_X,
        )) as unknown) as object;
        this.setExecutionPlan(plan);
      }
    } catch (error: unknown) {
      this.editorStore.applicationStore.logger.error(
        CORE_LOG_EVENT.EXECUTION_PROBLEM,
        error,
      );
      this.editorStore.applicationStore.notifyError(error);
    } finally {
      this.isGeneratingPlan = false;
    }
  });
}
