import {
  observe_Abstract_PackageableElement,
  observe_Class,
  observe_PackageableElementReference,
  observe_PropertyReference,
  observe_RawLambda,
  skipObserved,
} from '@finos/legend-graph';
import { makeObservable, observable, override } from 'mobx';
import {
  type DataQualityClassValidationsConfiguration,
  type DataQualityServiceValidationConfiguration,
  DataSpaceDataQualityExecutionContext,
  MappingAndRuntimeDataQualityExecutionContext,
} from '../../../graph/metamodel/pure/packageableElements/data-quality/DataQualityValidationConfiguration.js';
import { observe_DataSpace } from '@finos/legend-extension-dsl-data-space/graph';
import {
  type DataQualityRootGraphFetchTree,
  DataQualityPropertyGraphFetchTree,
} from '../../../graph/metamodel/pure/packageableElements/data-quality/DataQualityGraphFetchTree.js';

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
