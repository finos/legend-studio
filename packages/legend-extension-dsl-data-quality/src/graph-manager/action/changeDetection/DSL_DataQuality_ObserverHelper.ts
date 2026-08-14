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
  type ObserverContext,
  observe_Abstract_PackageableElement,
  observe_Class,
  observe_FunctionTestData,
  observe_PackageableElementReference,
  observe_PropertyReference,
  observe_RawLambda,
  observe_TestAssertion,
  skipObserved,
  skipObservedWithContext,
} from '@finos/legend-graph';
import { computed, makeObservable, observable, override } from 'mobx';
import {
  type DataQualityClassValidationsConfiguration,
  type DataQualityServiceValidationConfiguration,
  type DataQualityRelationValidation,
  type DataQualityRelationValidationConfiguration,
  type DataQualityRelationQueryLambda,
  type DataQualityRelationComparisonConfiguration,
  type ReconStrategy,
  MD5HashStrategy,
  DataSpaceDataQualityExecutionContext,
  MappingAndRuntimeDataQualityExecutionContext,
} from '../../../graph/metamodel/pure/packageableElements/data-quality/DataQualityValidationConfiguration.js';
import { observe_DataSpace } from '@finos/legend-extension-dsl-data-space/graph';
import {
  type DataQualityRootGraphFetchTree,
  DataQualityPropertyGraphFetchTree,
} from '../../../graph/metamodel/pure/packageableElements/data-quality/DataQualityGraphFetchTree.js';
import {
  type DataQualityRelationComparisonTest,
  type DataQualityRelationComparisonTestData,
  type DataQualityRelationComparisonTestSuite,
  type DataQualityRelationValidationTest,
  type DataQualityRelationValidationTestData,
  type DataQualityRelationValidationTestSuite,
} from '../../../graph/metamodel/pure/packageableElements/data-quality/DataQualityTest.js';

export const observe_DataSpaceDataQualityExecutionContext = skipObserved(
  (
    metamodel: DataSpaceDataQualityExecutionContext,
  ): DataSpaceDataQualityExecutionContext => {
    makeObservable<DataSpaceDataQualityExecutionContext>(metamodel, {
      context: observable,
      dataSpace: observable,
    });
    observe_DataSpace(metamodel.dataSpace.value);
    return metamodel;
  },
);

export const observe_MappingAndRuntimeDataQualityExecutionContext =
  skipObserved(
    (
      metamodel: MappingAndRuntimeDataQualityExecutionContext,
    ): MappingAndRuntimeDataQualityExecutionContext => {
      makeObservable<MappingAndRuntimeDataQualityExecutionContext>(metamodel, {
        mapping: observable,
        runtime: observable,
      });
      observe_PackageableElementReference(metamodel.mapping);
      observe_PackageableElementReference(metamodel.runtime);
      return metamodel;
    },
  );

export const observe_DataQualityPropertyGraphFetchTree = skipObserved(
  (
    metamodel: DataQualityPropertyGraphFetchTree,
  ): DataQualityPropertyGraphFetchTree => {
    makeObservable<DataQualityPropertyGraphFetchTree>(metamodel, {
      constraints: observable,
      property: observable,
      subTrees: observable,
    });
    observe_PropertyReference(metamodel.property);
    metamodel.subTrees.forEach((subTree) => {
      if (subTree instanceof DataQualityPropertyGraphFetchTree) {
        observe_DataQualityPropertyGraphFetchTree(subTree);
      }
    });
    return metamodel;
  },
);

export const observe_DataQualityRootGraphFetchTree = skipObserved(
  (metamodel: DataQualityRootGraphFetchTree): DataQualityRootGraphFetchTree => {
    makeObservable<DataQualityRootGraphFetchTree>(metamodel, {
      class: observable,
      subTrees: observable,
      constraints: observable,
    });
    observe_Class(metamodel.class.value);
    metamodel.subTrees.forEach((subTree) => {
      if (subTree instanceof DataQualityPropertyGraphFetchTree) {
        observe_DataQualityPropertyGraphFetchTree(subTree);
      }
    });
    return metamodel;
  },
);
export const observe_DataQualityConstraintsConfiguration = skipObserved(
  (
    metamodel: DataQualityClassValidationsConfiguration,
  ): DataQualityClassValidationsConfiguration => {
    observe_Abstract_PackageableElement(metamodel);

    makeObservable<
      DataQualityClassValidationsConfiguration,
      '_elementHashCode'
    >(metamodel, {
      _elementHashCode: override,
      context: observable,
      filter: observable,
      dataQualityRootGraphFetchTree: observable,
    });
    if (metamodel.context instanceof DataSpaceDataQualityExecutionContext) {
      observe_DataSpaceDataQualityExecutionContext(metamodel.context);
    }
    if (
      metamodel.context instanceof MappingAndRuntimeDataQualityExecutionContext
    ) {
      observe_MappingAndRuntimeDataQualityExecutionContext(metamodel.context);
    }
    if (metamodel.filter) {
      observe_RawLambda(metamodel.filter);
    }
    if (metamodel.dataQualityRootGraphFetchTree) {
      observe_DataQualityRootGraphFetchTree(
        metamodel.dataQualityRootGraphFetchTree,
      );
    }
    return metamodel;
  },
);

export const observe_DataQualityServiceValidationConfiguration = skipObserved(
  (
    metamodel: DataQualityServiceValidationConfiguration,
  ): DataQualityServiceValidationConfiguration => {
    observe_Abstract_PackageableElement(metamodel);

    makeObservable<
      DataQualityServiceValidationConfiguration,
      '_elementHashCode'
    >(metamodel, {
      _elementHashCode: override,
      contextName: observable,
      serviceName: observable,
      dataQualityRootGraphFetchTree: observable,
    });
    return metamodel;
  },
);

export const observe_DataQualityRelationValidation = skipObserved(
  (metamodel: DataQualityRelationValidation): DataQualityRelationValidation => {
    makeObservable(metamodel, {
      name: observable,
      assertion: observable,
      description: observable,
      type: observable,
    });

    observe_RawLambda(metamodel.assertion);
    return metamodel;
  },
);

export const observe_DataQualityRelationQueryLambda = skipObserved(
  (metamodel: DataQualityRelationQueryLambda): DataQualityRelationQueryLambda =>
    makeObservable(metamodel, {
      body: observable.ref, // only observe the reference, the object itself is not observed
      parameters: observable,
      hashCode: computed,
    }),
);

export const observe_DataQualityRelationValidationTest = skipObserved(
  (
    metamodel: DataQualityRelationValidationTest,
  ): DataQualityRelationValidationTest => {
    makeObservable(metamodel, {
      id: observable,
      doc: observable,
      assertions: observable,
      hashCode: computed,
    });
    metamodel.assertions.forEach(observe_TestAssertion);
    return metamodel;
  },
);

export const observe_DataQualityRelationValidationTestData =
  skipObservedWithContext(
    (
      metamodel: DataQualityRelationValidationTestData,
      context: ObserverContext,
    ): DataQualityRelationValidationTestData => {
      makeObservable(metamodel, {
        testData: observable,
        hashCode: computed,
      });
      metamodel.testData.forEach((data) =>
        observe_FunctionTestData(data, context),
      );
      return metamodel;
    },
  );

export const observe_DataQualityRelationValidationTestSuite =
  skipObservedWithContext(
    (
      metamodel: DataQualityRelationValidationTestSuite,
      context: ObserverContext,
    ): DataQualityRelationValidationTestSuite => {
      makeObservable(metamodel, {
        id: observable,
        doc: observable,
        testData: observable,
        tests: observable,
        hashCode: computed,
      });
      if (metamodel.testData) {
        observe_DataQualityRelationValidationTestData(
          metamodel.testData,
          context,
        );
      }
      metamodel.tests.forEach((test) =>
        observe_DataQualityRelationValidationTest(test),
      );
      return metamodel;
    },
  );

export const observe_DataQualityRelationComparisonTest = skipObserved(
  (
    metamodel: DataQualityRelationComparisonTest,
  ): DataQualityRelationComparisonTest => {
    makeObservable(metamodel, {
      id: observable,
      doc: observable,
      assertions: observable,
      hashCode: computed,
    });
    metamodel.assertions.forEach(observe_TestAssertion);
    return metamodel;
  },
);

export const observe_DataQualityRelationComparisonTestData =
  skipObservedWithContext(
    (
      metamodel: DataQualityRelationComparisonTestData,
      context: ObserverContext,
    ): DataQualityRelationComparisonTestData => {
      makeObservable(metamodel, {
        testData: observable,
        hashCode: computed,
      });
      metamodel.testData.forEach((data) =>
        observe_FunctionTestData(data, context),
      );
      return metamodel;
    },
  );

export const observe_DataQualityRelationComparisonTestSuite =
  skipObservedWithContext(
    (
      metamodel: DataQualityRelationComparisonTestSuite,
      context: ObserverContext,
    ): DataQualityRelationComparisonTestSuite => {
      makeObservable(metamodel, {
        id: observable,
        doc: observable,
        testData: observable,
        tests: observable,
        hashCode: computed,
      });
      if (metamodel.testData) {
        observe_DataQualityRelationComparisonTestData(
          metamodel.testData,
          context,
        );
      }
      metamodel.tests.forEach((test) =>
        observe_DataQualityRelationComparisonTest(test),
      );
      return metamodel;
    },
  );

export const observe_DataQualityRelationValidationConfiguration =
  skipObservedWithContext(
    (
      metamodel: DataQualityRelationValidationConfiguration,
      context: ObserverContext,
    ): DataQualityRelationValidationConfiguration => {
      observe_Abstract_PackageableElement(metamodel);

      makeObservable<
        DataQualityRelationValidationConfiguration,
        '_elementHashCode'
      >(metamodel, {
        _elementHashCode: override,
        query: observable,
        validations: observable,
        tests: observable,
      });
      metamodel.validations.forEach((value) =>
        observe_DataQualityRelationValidation(value),
      );
      observe_DataQualityRelationQueryLambda(metamodel.query);
      metamodel.tests.forEach((testSuite) =>
        observe_DataQualityRelationValidationTestSuite(testSuite, context),
      );
      return metamodel;
    },
  );

export const observe_ReconStrategy = skipObserved(
  (metamodel: ReconStrategy): ReconStrategy => {
    if (metamodel instanceof MD5HashStrategy) {
      return makeObservable(metamodel, {
        sourceHashColumn: observable,
        targetHashColumn: observable,
        aggregatedHash: observable,
        hashCode: computed,
      });
    }
    return metamodel;
  },
);

export const observe_DataQualityRelationComparisonConfiguration =
  skipObservedWithContext(
    (
      metamodel: DataQualityRelationComparisonConfiguration,
      context: ObserverContext,
    ): DataQualityRelationComparisonConfiguration => {
      observe_Abstract_PackageableElement(metamodel);
      makeObservable<
        DataQualityRelationComparisonConfiguration,
        '_elementHashCode'
      >(metamodel, {
        _elementHashCode: override,
        source: observable,
        target: observable,
        keys: observable,
        columnsToCompare: observable,
        strategy: observable,
        expectedMatch: observable,
        tests: observable,
      });
      observe_DataQualityRelationQueryLambda(metamodel.source);
      observe_DataQualityRelationQueryLambda(metamodel.target);
      observe_ReconStrategy(metamodel.strategy);
      metamodel.tests.forEach((testSuite) =>
        observe_DataQualityRelationComparisonTestSuite(testSuite, context),
      );
      return metamodel;
    },
  );
