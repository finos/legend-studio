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
  DataSpaceSupportEmail,
  DataSpaceSupportCombinedInfo,
  DataSpacePackageableElementExecutable,
  DataSpaceExecutableTemplate,
} from '@finos/legend-extension-dsl-data-space/graph';
import {
  DataProduct,
  InternalDataProductType,
  DataProductDiagram,
  DataProductElementScope,
  SupportInfo,
  DataProductLink,
  Email,
  observe_DataProduct,
  type SampleQuery,
  InLineSampleQuery,
  NativeModelAccess,
  NativeModelExecutionContext,
  PackageableElementSampleQuery,
} from '@finos/legend-graph';
import {
  guaranteeNonNullable,
  UnsupportedOperationError,
} from '@finos/legend-shared';

export enum DATA_PRODUCT_SUPPORT_TYPE {
  DOCUMENTATION = 'Documentation',
  SUPPORT = 'Support',
  WEBSITE = 'Website',
  FAQ = 'FAQ',
}

export const DATA_PRODUCT_DEFAULT_TITLE =
  'DataProduct Auto Generated title: Please update';
export const DATA_PRODUCT_DEFAULT_DESCRIPTION_PREFIX =
  'Migrated using studio converter from dataspace: ';
export const DATA_PRODUCT_NATIVE_MODEL_ACCESS_SAMPLE_QUERY_ID_PREFIX =
  'DATA_PRODUCT_NATIVE_MODEL_ACCESS_SAMPLE_QUERY_ID';

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

const convertDataSpaceExecutablesToSampleQueries = (
  dataSpace: DataSpace,
): SampleQuery[] => {
  if (!dataSpace.executables) {
    return [];
  }

  let idCounter = 0;

  return dataSpace.executables.map((executable) => {
    let sampleQuery: SampleQuery;
    if (executable instanceof DataSpacePackageableElementExecutable) {
      const packageableElementSampleQuery = new PackageableElementSampleQuery();
      packageableElementSampleQuery.query = executable.executable;
      sampleQuery = packageableElementSampleQuery;
    } else if (executable instanceof DataSpaceExecutableTemplate) {
      const inLineSampleQuery = new InLineSampleQuery();
      inLineSampleQuery.query = executable.query;
      sampleQuery = inLineSampleQuery;
    } else {
      throw new UnsupportedOperationError(
        `Can't convert to DataProduct nativeModelAccess sample query: Unsupported DataSpace executable`,
      );
    }
    sampleQuery.description = executable.description;
    sampleQuery.executionContextKey =
      executable.executionContextKey ?? dataSpace.defaultExecutionContext.name;
    sampleQuery.title = executable.title;
    if (executable.id) {
      sampleQuery.id = executable.id;
    } else {
      sampleQuery.id = `${DATA_PRODUCT_NATIVE_MODEL_ACCESS_SAMPLE_QUERY_ID_PREFIX}_${idCounter}`;
      idCounter++;
    }
    return sampleQuery;
  });
};

const convertDataSpaceExecutionContextsToNativeModelExecutionContexts = (
  dataSpace: DataSpace,
): NativeModelExecutionContext[] => {
  return dataSpace.executionContexts.map((context) => {
    const nativeModelExecutionContext = new NativeModelExecutionContext();
    nativeModelExecutionContext.key = context.name;
    nativeModelExecutionContext.mapping = context.mapping;
    nativeModelExecutionContext.runtime = context.defaultRuntime;
    return nativeModelExecutionContext;
  });
};

const convertDataSpaceToNativeModelAccess = (
  dataSpace: DataSpace,
): NativeModelAccess => {
  const nativeModelAccess = new NativeModelAccess();

  nativeModelAccess.featuredElements =
    convertDataSpaceToFeaturedElements(dataSpace);
  nativeModelAccess.diagrams = convertDataSpaceToDiagrams(dataSpace);
  nativeModelAccess.nativeModelExecutionContexts =
    convertDataSpaceExecutionContextsToNativeModelExecutionContexts(dataSpace);
  nativeModelAccess.defaultExecutionContext = guaranteeNonNullable(
    nativeModelAccess.nativeModelExecutionContexts.find(
      (e) => e.key === dataSpace.defaultExecutionContext.name,
    ),
    'unable to find resolve default execution context',
  );
  nativeModelAccess.sampleQueries =
    convertDataSpaceExecutablesToSampleQueries(dataSpace);
  return nativeModelAccess;
};

export const convertDataSpaceToDataProduct = (
  dataSpace: DataSpace,
): DataProduct => {
  const name = dataSpace.name.replace(/dataspace/i, 'DataProduct');
  const dataProduct = new DataProduct(name);
  dataProduct.stereotypes = [...dataSpace.stereotypes];
  dataProduct.taggedValues = [...dataSpace.taggedValues];

  dataProduct.title = dataSpace.title ?? DATA_PRODUCT_DEFAULT_TITLE;
  dataProduct.description =
    dataSpace.description ??
    `${DATA_PRODUCT_DEFAULT_DESCRIPTION_PREFIX}${dataSpace.path}`;
  dataProduct.nativeModelAccess =
    convertDataSpaceToNativeModelAccess(dataSpace);
  dataProduct.supportInfo = convertDataSpaceToSupportInfo(dataSpace);
  dataProduct.type = new InternalDataProductType();

  return observe_DataProduct(dataProduct);
};
