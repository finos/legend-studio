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
  type DataSpace,
  type DataSpaceExecutionContext,
  DataSpaceSupportEmail,
  DataSpaceSupportCombinedInfo,
  getQueryFromDataspaceExecutable,
} from '@finos/legend-extension-dsl-data-space/graph';
import {
  type GraphManagerState,
  type PackageableElementReference,
  type Mapping,
  DataProductRuntimeInfo,
  ModelAccessPointGroup,
  DataProduct,
  FunctionAccessPoint,
  InternalDataProductType,
  DataProductDiagram,
  DataProductElementScope,
  SupportInfo,
  DataProductLink,
  Email,
  observe_DataProduct,
  observe_DataProductRuntimeInfo,
  observe_ModelAccessPointGroup,
} from '@finos/legend-graph';
import { assertTrue, uniq, uuid } from '@finos/legend-shared';

export enum DATA_PRODUCT_SUPPORT_TYPE {
  DOCUMENTATION = 'Documentation',
  SUPPORT = 'Support',
  WEBSITE = 'Website',
  FAQ = 'FAQ',
}

const convertDataSpaceToDiagrams = (
  dataSpace: DataSpace,
): DataProductDiagram[] => {
  if (!dataSpace.diagrams) {
    return [];
  }
  return dataSpace.diagrams.map((dataSpaceDiagram) => {
    const dataProductDiagram = new DataProductDiagram();
    dataProductDiagram.title = dataSpaceDiagram.title;
    dataProductDiagram.description = dataSpaceDiagram.description;
    dataProductDiagram.diagram = dataSpaceDiagram.diagram.value;
    return dataProductDiagram;
  });
};

export const dataSpaceContainsOneMapping = (dataSpace: DataSpace): boolean => {
  return (
    uniq(
      dataSpace.executionContexts.map(
        (execContext) => execContext.mapping.value,
      ),
    ).length === 1
  );
};

const convertDataSpaceToMapping = (
  dataSpace: DataSpace,
): PackageableElementReference<Mapping> => {
  assertTrue(
    dataSpaceContainsOneMapping(dataSpace),
    'DataSpace contains more than one unique mapping',
  );

  return dataSpace.defaultExecutionContext.mapping;
};

const convertDataSpaceToFeaturedElements = (
  dataSpace: DataSpace,
): DataProductElementScope[] => {
  if (dataSpace.elements) {
    const featuredElements = dataSpace.elements.map((element) => {
      const scope = new DataProductElementScope();
      scope.element = element.element;
      scope.exclude = element.exclude;
      return scope;
    });
    return featuredElements;
  }
  return [];
};

const convertDataSpaceToFunctionAccessPoints = (
  dataSpace: DataSpace,
  graphManagerState: GraphManagerState,
): FunctionAccessPoint[] => {
  if (!dataSpace.executables) {
    return [];
  }
  return dataSpace.executables.flatMap((executable) => {
    const query = getQueryFromDataspaceExecutable(
      executable,
      graphManagerState,
    );
    if (query) {
      const functionAccessPoint = new FunctionAccessPoint(
        executable.id ?? uuid(),
        query,
      );
      functionAccessPoint.description = executable.description;
      return [functionAccessPoint];
    }
    return [];
  });
};

const convertDataSpaceToSupportInfo = (
  dataSpace: DataSpace,
): SupportInfo | undefined => {
  if (!dataSpace.supportInfo) {
    return undefined;
  }

  const supportInfo = new SupportInfo();

  if (dataSpace.supportInfo.documentationUrl) {
    supportInfo.documentation = new DataProductLink(
      dataSpace.supportInfo.documentationUrl,
      DATA_PRODUCT_SUPPORT_TYPE.DOCUMENTATION,
    );
  }

  if (dataSpace.supportInfo instanceof DataSpaceSupportEmail) {
    supportInfo.emails = [
      new Email(
        dataSpace.supportInfo.address,
        DATA_PRODUCT_SUPPORT_TYPE.SUPPORT,
      ),
    ];
  } else if (dataSpace.supportInfo instanceof DataSpaceSupportCombinedInfo) {
    if (dataSpace.supportInfo.emails) {
      supportInfo.emails = dataSpace.supportInfo.emails.map(
        (email) => new Email(email, DATA_PRODUCT_SUPPORT_TYPE.SUPPORT),
      );
    }

    if (dataSpace.supportInfo.website) {
      supportInfo.website = new DataProductLink(
        dataSpace.supportInfo.website,
        DATA_PRODUCT_SUPPORT_TYPE.WEBSITE,
      );
    }

    if (dataSpace.supportInfo.faqUrl) {
      supportInfo.faqUrl = new DataProductLink(
        dataSpace.supportInfo.faqUrl,
        DATA_PRODUCT_SUPPORT_TYPE.FAQ,
      );
    }

    if (dataSpace.supportInfo.supportUrl) {
      supportInfo.supportUrl = new DataProductLink(
        dataSpace.supportInfo.supportUrl,
        DATA_PRODUCT_SUPPORT_TYPE.SUPPORT,
      );
    }
  }

  return supportInfo;
};

const convertExecutionContextToRuntime = (
  executionContext: DataSpaceExecutionContext,
): DataProductRuntimeInfo => {
  const dataProductRuntime = new DataProductRuntimeInfo();
  dataProductRuntime.id = executionContext.name;
  dataProductRuntime.runtime = executionContext.defaultRuntime;
  observe_DataProductRuntimeInfo(dataProductRuntime);
  return dataProductRuntime;
};

const convertDataSpaceToModelAccessPointGroup = (
  dataSpace: DataSpace,
  graphManagerState: GraphManagerState,
): ModelAccessPointGroup[] => {
  const modelAccessPointGroup = new ModelAccessPointGroup();
  const dataSpaceDefaultExecutionContext = dataSpace.defaultExecutionContext;

  modelAccessPointGroup.id = dataSpaceDefaultExecutionContext.name;
  modelAccessPointGroup.description =
    dataSpaceDefaultExecutionContext.description;
  modelAccessPointGroup.accessPoints = convertDataSpaceToFunctionAccessPoints(
    dataSpace,
    graphManagerState,
  );
  modelAccessPointGroup.mapping = convertDataSpaceToMapping(dataSpace);
  modelAccessPointGroup.defaultRuntime = convertExecutionContextToRuntime(
    dataSpace.defaultExecutionContext,
  );
  modelAccessPointGroup.featuredElements =
    convertDataSpaceToFeaturedElements(dataSpace);

  const seenRuntimePaths = new Set<string>();
  modelAccessPointGroup.compatibleRuntimes = dataSpace.executionContexts
    .filter((executionContext) => {
      const runtimePath = executionContext.defaultRuntime.value.path;
      if (runtimePath && !seenRuntimePaths.has(runtimePath)) {
        seenRuntimePaths.add(runtimePath);
        return true;
      }
      return false;
    })
    .map((executionContext) =>
      convertExecutionContextToRuntime(executionContext),
    );

  modelAccessPointGroup.diagrams = convertDataSpaceToDiagrams(dataSpace);
  const observeModelAccessPointGroup = observe_ModelAccessPointGroup(
    modelAccessPointGroup,
  );
  return [observeModelAccessPointGroup];
};

export const convertDataSpaceToDataProduct = (
  dataSpace: DataSpace,
  graphManagerState: GraphManagerState,
): DataProduct => {
  const name = dataSpace.name.replace(/dataspace/i, 'DataProduct');
  const dataProduct = new DataProduct(name);
  dataProduct.package = dataSpace.package;
  dataProduct.stereotypes = [...dataSpace.stereotypes];
  dataProduct.taggedValues = [...dataSpace.taggedValues];

  dataProduct.title = dataSpace.title;
  dataProduct.description = dataSpace.description;
  dataProduct.accessPointGroups = convertDataSpaceToModelAccessPointGroup(
    dataSpace,
    graphManagerState,
  );
  dataProduct.supportInfo = convertDataSpaceToSupportInfo(dataSpace);
  dataProduct.type = new InternalDataProductType();

  return observe_DataProduct(dataProduct);
};
