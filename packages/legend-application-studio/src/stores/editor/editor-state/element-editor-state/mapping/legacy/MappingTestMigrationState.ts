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
  type DEPRECATED__MappingTest,
  type DEPRECATED__InputData,
  type Mapping,
  FlatDataInputData,
  MappingTestSuite,
  MappingTest,
  EqualToJson,
  StoreTestData,
  DEPRECATED__ObjectInputData,
  PackageableElementExplicitReference,
  ModelStore,
  ModelStoreData,
  ModelEmbeddedData,
  ExternalFormatData,
  ObjectInputType,
  DEPRECATED__ExpectedOutputMappingTestAssert,
  RelationalInputData,
} from '@finos/legend-graph';
import type { EditorStore } from '../../../../EditorStore.js';
import type { MappingEditorState } from '../MappingEditorState.js';
import {
  ContentType,
  guaranteeNonNullable,
  uniq,
  type GeneratorFn,
  guaranteeType,
  ActionState,
  assertErrorThrown,
} from '@finos/legend-shared';
import { action, computed, flow, makeObservable, observable } from 'mobx';
import {
  mapping_addDEPRECATEDTest,
  mapping_addTestSuite,
  mapping_deleteTest,
  mapping_deleteTestSuite,
} from '../../../../../graph-modifier/DSL_Mapping_GraphModifierHelper.js';

enum UNSUPPORTED_REASON {
  FLAT_DATA = 'FLAT_DATA',
  MULTI_INPUT_DATA = 'MULTI_INPUT_DATA',
  RELATIONAL = 'RELATIONAL',
}

class SupportedMigrationTestState {
  test: DEPRECATED__MappingTest;
  inputData: DEPRECATED__InputData;

  constructor(test: DEPRECATED__MappingTest, inputData: DEPRECATED__InputData) {
    this.test = test;
    this.inputData = inputData;
  }
}
export enum MIGRATE_PHASE {
  OVERVIEW = 'OVERVIEW',
  CONFIRM = 'CONFIRM',
}
export class MappingTestConfirmationState {
  editorStore: EditorStore;
  migrationState: MappingTestMigrationState;
  before: string | undefined;
  after: string | undefined;
  // diffs
  suitesToAdd: MappingTestSuite[];
  testsToDelete: DEPRECATED__MappingTest[];
  migrated = false;
  calculatingDiffs = ActionState.create();

  constructor(migrationState: MappingTestMigrationState) {
    makeObservable(this, {
      init: flow,
      migrate: action,
      reverse: action,
      before: observable,
      after: observable,
      suitesToAdd: observable,
      testsToDelete: observable,
    });
    this.migrationState = migrationState;
    this.editorStore = migrationState.editorStore;
    this.suitesToAdd = migrationState.migrate();
    this.testsToDelete = this.migrationState.migrateableTests;
    this.init();
  }

  *init(): GeneratorFn<void> {
    try {
      this.calculatingDiffs.inProgress();
      // before
      const beforeEntity =
        this.migrationState.editorStore.graphManagerState.graphManager.elementToEntity(
          this.migrationState.mapping,
        );
      this.migrate();
      // after
      const after =
        this.migrationState.editorStore.graphManagerState.graphManager.elementToEntity(
          this.migrationState.mapping,
        );
      const beforeP =
        this.editorStore.graphManagerState.graphManager.entitiesToPureCode([
          beforeEntity,
        ]);
      const afterP =
        this.editorStore.graphManagerState.graphManager.entitiesToPureCode([
          after,
        ]);
      const [beforeGrammar, afterGrammar] = (yield Promise.all([
        beforeP,
        afterP,
      ])) as [string, string];

      // done
      this.before = beforeGrammar;
      this.after = afterGrammar;
      this.reverse();
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.notificationService.notifyError(
        `Error calcuating mapping diffs: ${error.message}`,
      );
    } finally {
      this.calculatingDiffs.complete();
    }
  }

  migrate(): void {
    // add
    this.suitesToAdd.forEach((suite) =>
      mapping_addTestSuite(
        this.migrationState.mapping,
        suite,
        this.editorStore.changeDetectionState.observerContext,
      ),
    );
    // delete
    this.testsToDelete.forEach((test) =>
      mapping_deleteTest(this.migrationState.mapping, test),
    );
    this.migrated = true;
  }

  reverse(): void {
    // add
    this.suitesToAdd.forEach((suite) =>
      mapping_deleteTestSuite(this.migrationState.mapping, suite),
    );
    // delete
    this.testsToDelete.forEach((test) =>
      mapping_addDEPRECATEDTest(
        this.migrationState.mapping,
        test,
        this.editorStore.changeDetectionState.observerContext,
      ),
    );
    this.migrated = false;
  }
}

export class MappingTestMigrationState {
  readonly editorStore: EditorStore;
  readonly mappingEditorState: MappingEditorState;
  unsupported: Map<UNSUPPORTED_REASON, DEPRECATED__MappingTest[]>;
  queryToSuiteMap: Map<string, SupportedMigrationTestState[]>;
  suitesAdded: MappingTestSuite[] | undefined;

  // phases
  steps: [MIGRATE_PHASE, MIGRATE_PHASE] = [
    MIGRATE_PHASE.OVERVIEW,
    MIGRATE_PHASE.CONFIRM,
  ];
  currentStep: MIGRATE_PHASE = MIGRATE_PHASE.OVERVIEW;
  confirmationState: MappingTestConfirmationState | undefined;

  constructor(
    editorStore: EditorStore,
    mappingEditorState: MappingEditorState,
    unsupported: Map<UNSUPPORTED_REASON, DEPRECATED__MappingTest[]>,
    supported: Map<string, SupportedMigrationTestState[]>,
  ) {
    makeObservable(this, {
      suitesAdded: observable,
      currentStep: observable,
      confirmationState: observable,
      handleNext: action,
      activeStep: computed,
      disableBack: computed,
      disableNext: computed,
      handleBack: action,
    });
    this.editorStore = editorStore;
    this.mappingEditorState = mappingEditorState;
    this.unsupported = unsupported;
    this.queryToSuiteMap = supported;
  }

  get activeStep(): number {
    return this.steps.findIndex((e) => e === this.currentStep);
  }

  get disableBack(): boolean {
    if (this.currentStep === MIGRATE_PHASE.OVERVIEW) {
      return true;
    }
    return false;
  }

  get disableNext(): boolean {
    return !this.migrateableTests.length;
  }

  get nextText(): string {
    if (this.currentStep === MIGRATE_PHASE.CONFIRM) {
      return 'Confirm';
    }

    return 'Next';
  }

  handleBack(): void {
    if (this.currentStep === MIGRATE_PHASE.CONFIRM) {
      this.confirmationState?.reverse();
      this.confirmationState = undefined;
      this.currentStep = MIGRATE_PHASE.OVERVIEW;
    }
  }

  handleNext(): void {
    if (this.currentStep === MIGRATE_PHASE.OVERVIEW) {
      this.confirmationState = new MappingTestConfirmationState(this);
      this.currentStep = MIGRATE_PHASE.CONFIRM;
    } else {
      this.confirmationState?.migrate();
      this.mappingEditorState.closeMigrationTool();
      this.mappingEditorState.DEPRECATED_mappingTestStates =
        this.mappingEditorState.buildLegacyTestsStates();
    }
  }

  static build(
    editorStore: EditorStore,
    mappingEditorState: MappingEditorState,
  ): MappingTestMigrationState {
    const unsupportedTests = new Map<
      UNSUPPORTED_REASON,
      DEPRECATED__MappingTest[]
    >();
    const supported = new Map<string, SupportedMigrationTestState[]>();
    mappingEditorState.mapping.test.forEach((test) => {
      let testUnsupportedReason: UNSUPPORTED_REASON | undefined = undefined;
      const nullableInputData = test.inputData[0];
      if (test.inputData.length !== 1 || !nullableInputData) {
        testUnsupportedReason = UNSUPPORTED_REASON.MULTI_INPUT_DATA;
      } else if (nullableInputData instanceof FlatDataInputData) {
        testUnsupportedReason = UNSUPPORTED_REASON.FLAT_DATA;
      } else if (nullableInputData instanceof RelationalInputData) {
        testUnsupportedReason = UNSUPPORTED_REASON.FLAT_DATA;
      }
      if (testUnsupportedReason) {
        const unsupportedTest =
          unsupportedTests.get(testUnsupportedReason) ?? [];
        unsupportedTest.push(test);
        unsupportedTests.set(testUnsupportedReason, unsupportedTest);
        return;
      }
      const inputData = guaranteeNonNullable(nullableInputData);
      const testQuery = test.query;
      // we will use hash code to see if the same query exists
      const suites = supported.get(testQuery.hashCode) ?? [];
      suites.push(new SupportedMigrationTestState(test, inputData));
      supported.set(testQuery.hashCode, suites);
    });

    return new MappingTestMigrationState(
      editorStore,
      mappingEditorState,
      unsupportedTests,
      supported,
    );
  }

  migrate(): MappingTestSuite[] {
    const suites: MappingTestSuite[] = [];
    this.suiteValuesToMigrate.forEach((testsWithQuery) => {
      if (!testsWithQuery.length) {
        return;
      }
      const test = guaranteeNonNullable(testsWithQuery[0]);
      const query = test.test.query;
      const suite = new MappingTestSuite();
      suite.func = query;
      testsWithQuery.forEach((legacyTestState) => {
        const legacyTest = legacyTestState.test;
        const legacyAssertion = guaranteeType(
          legacyTest.assert,
          DEPRECATED__ExpectedOutputMappingTestAssert,
        );
        const mappingTest = new MappingTest();
        const assertion = new EqualToJson();
        mappingTest.id = legacyTest.name;
        assertion.id = legacyTest.name;
        mappingTest.assertions = [assertion];
        assertion.parentTest = mappingTest;
        assertion.expected = new ExternalFormatData();
        assertion.expected.contentType = ContentType.APPLICATION_JSON;
        assertion.expected.data = legacyAssertion.expectedOutput;
        const inputData = legacyTestState.inputData;
        const storeTestData = new StoreTestData();
        if (inputData instanceof DEPRECATED__ObjectInputData) {
          storeTestData.store = PackageableElementExplicitReference.create(
            ModelStore.INSTANCE,
          );
          const modelStoreData = new ModelStoreData();
          const modelEmbeddedData = new ModelEmbeddedData();
          modelEmbeddedData.model = PackageableElementExplicitReference.create(
            inputData.sourceClass.value,
          );
          const externalFormatData = new ExternalFormatData();
          if (inputData.inputType === ObjectInputType.XML) {
            externalFormatData.contentType = ContentType.APPLICATION_XML;
          } else {
            externalFormatData.contentType = ContentType.APPLICATION_JSON;
          }
          externalFormatData.data = inputData.data;
          modelEmbeddedData.data = externalFormatData;
          modelStoreData.modelData = [modelEmbeddedData];
          storeTestData.data = modelStoreData;
        } else if (inputData instanceof RelationalInputData) {
          storeTestData.store = PackageableElementExplicitReference.create(
            inputData.database.value,
          );
        }
        mappingTest.storeTestData = [storeTestData];
        mappingTest.__parent = suite;
        suite.tests.push(mappingTest);
      });
      // calculate ID
      let id = 'suite';
      if (suite.tests.length === 1) {
        id = `${guaranteeNonNullable(suite.tests[0]).id}_${id}`;
      } else {
        id = `suite_${suites.length}`;
      }
      suite.id = id;
      suites.push(suite);
    });
    return suites;
  }

  get suiteValuesToMigrate(): SupportedMigrationTestState[][] {
    return Array.from(this.queryToSuiteMap.values());
  }

  get unSupportedTestsToMigrate(): DEPRECATED__MappingTest[] {
    return uniq(Array.from(this.unsupported.values()).flat());
  }

  get mapping(): Mapping {
    return this.mappingEditorState.mapping;
  }

  get migrateableTests(): DEPRECATED__MappingTest[] {
    return this.mapping.test.filter(
      (t) => !this.unSupportedTestsToMigrate.includes(t),
    );
  }
}
