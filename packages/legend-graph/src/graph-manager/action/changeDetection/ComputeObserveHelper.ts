/**
 * Copyright (c) 2026-present, Goldman Sachs
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

import { computed, makeObservable, observable, override } from 'mobx';
import {
  type AppDirComputeOwner,
  type Compute,
  type DatabricksTag,
  DatabricksComputeSpecification,
  SnowflakeComputeSpecification,
  UnknownComputeSpecification,
} from '../../../graph/metamodel/pure/compute/Compute.js';
import {
  observe_Abstract_PackageableElement,
  skipObserved,
} from './CoreObserverHelper.js';
import { observe_AppDirNode } from './DataProductObserveHelper.js';

const observe_AppDirComputeOwner = skipObserved(
  (metamodel: AppDirComputeOwner): AppDirComputeOwner => {
    makeObservable(metamodel, {
      production: observable,
      prodParallel: observable,
      hashCode: computed,
    });
    if (metamodel.production) {
      observe_AppDirNode(metamodel.production);
    }
    if (metamodel.prodParallel) {
      observe_AppDirNode(metamodel.prodParallel);
    }
    return metamodel;
  },
);

const observe_SnowflakeComputeSpecification = skipObserved(
  (metamodel: SnowflakeComputeSpecification): SnowflakeComputeSpecification => {
    makeObservable(metamodel, {
      warehouseType: observable,
      warehouseSize: observable,
      resourceConstraint: observable,
      maxClusterCount: observable,
      minClusterCount: observable,
      scalingPolicy: observable,
      autoSuspend: observable,
      autoResume: observable,
      resourceMonitor: observable,
      comment: observable,
      enableQueryAcceleration: observable,
      queryAccelerationMaxScaleFactor: observable,
      hashCode: computed,
    });
    return metamodel;
  },
);

const observe_DatabricksTag = skipObserved(
  (metamodel: DatabricksTag): DatabricksTag => {
    makeObservable(metamodel, {
      key: observable,
      value: observable,
      hashCode: computed,
    });
    return metamodel;
  },
);

const observe_DatabricksComputeSpecification = skipObserved(
  (
    metamodel: DatabricksComputeSpecification,
  ): DatabricksComputeSpecification => {
    makeObservable(metamodel, {
      clusterSize: observable,
      autoStopMins: observable,
      minNumClusters: observable,
      maxNumClusters: observable,
      enablePhoton: observable,
      spotInstancePolicy: observable,
      tags: observable,
      hashCode: computed,
    });
    metamodel.tags.forEach(observe_DatabricksTag);
    return metamodel;
  },
);

export const observe_Compute = skipObserved((metamodel: Compute): Compute => {
  observe_Abstract_PackageableElement(metamodel);

  makeObservable<Compute, '_elementHashCode'>(metamodel, {
    owner: observable,
    specification: observable,
    _elementHashCode: override,
  });

  observe_AppDirComputeOwner(metamodel.owner);
  if (metamodel.specification instanceof SnowflakeComputeSpecification) {
    observe_SnowflakeComputeSpecification(metamodel.specification);
  } else if (
    metamodel.specification instanceof DatabricksComputeSpecification
  ) {
    observe_DatabricksComputeSpecification(metamodel.specification);
  } else if (metamodel.specification instanceof UnknownComputeSpecification) {
    makeObservable(metamodel.specification, {
      content: observable,
      hashCode: computed,
    });
  }
  return metamodel;
});
