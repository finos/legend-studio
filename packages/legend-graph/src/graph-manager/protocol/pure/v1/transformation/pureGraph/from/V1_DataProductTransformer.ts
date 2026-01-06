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

import { UnsupportedOperationError } from '@finos/legend-shared';
import {
  type AccessPoint,
  type DataProduct,
  type DataProductIcon,
  DataProductEmbeddedImageIcon,
  DataProductLibraryIcon,
  LakehouseAccessPoint,
  ModelAccessPointGroup,
  ExternalDataProductType,
  InternalDataProductType,
  UnknownAccessPoint,
  UnknownDataProductIcon,
  FunctionAccessPoint,
  PackageableElementSampleQuery,
  InLineSampleQuery,
} from '../../../../../../../graph/metamodel/pure/dataProduct/DataProduct.js';
import {
  type V1_AccessPoint,
  type V1_DataProductIcon,
  type V1_DataProductRegion,
  type V1_DeliveryFrequency,
  V1_AccessPointGroup,
  V1_DataProduct,
  V1_DataProductDiagram,
  V1_DataProductEmbeddedImageIcon,
  V1_DataProductLibraryIcon,
  V1_ElementScope,
  V1_Email,
  V1_LakehouseAccessPoint,
  V1_ModelAccessPointGroup,
  V1_SupportInfo,
  V1_UnknownAccessPoint,
  V1_UnknownDataProductIcon,
  V1_InternalDataProductType,
  V1_ExternalDataProductType,
  V1_FunctionAccessPoint,
  type V1_Expertise,
  V1_DataProductOperationalMetadata,
  V1_NativeModelAccess,
  V1_PackageableElementSampleQuery,
  V1_InLineSampleQuery,
  V1_NativeModelExecutionContext,
} from '../../../model/packageableElements/dataProduct/V1_DataProduct.js';
import { V1_initPackageableElement } from './V1_CoreTransformerHelper.js';
import { V1_transformRawLambda } from './V1_RawValueSpecificationTransformer.js';
import type { V1_GraphTransformerContext } from './V1_GraphTransformerContext.js';
import {
  V1_transformStereotype,
  V1_transformTaggedValue,
} from './V1_DomainTransformer.js';
import { V1_PackageableElementPointer } from '../../../model/packageableElements/V1_PackageableElement.js';
import { V1_transformEmbeddedData } from './V1_DataElementTransformer.js';
import { ConcreteFunctionDefinition } from '../../../../../../../graph/metamodel/pure/packageableElements/function/ConcreteFunctionDefinition.js';
import { generateFunctionPrettyName } from '../../../../../../../graph/helpers/PureLanguageHelper.js';

const transformAccessPoint = (
  ap: AccessPoint,
  context: V1_GraphTransformerContext,
): V1_AccessPoint => {
  if (ap instanceof LakehouseAccessPoint) {
    const lake = new V1_LakehouseAccessPoint();
    lake.id = ap.id;
    lake.func = V1_transformRawLambda(ap.func, context);
    lake.targetEnvironment = ap.targetEnvironment;
    lake.classification = ap.classification;
    lake.reproducible = ap.reproducible;
    lake.description = ap.description;
    lake.title = ap.title;
    return lake;
  } else if (ap instanceof FunctionAccessPoint) {
    const func = new V1_FunctionAccessPoint();
    func.id = ap.id;
    func.description = ap.description;
    func.title = func.title;
    func.query = V1_transformRawLambda(ap.query, context);
    return func;
  } else if (ap instanceof UnknownAccessPoint) {
    const un = new V1_UnknownAccessPoint();
    un.content = ap.content;
    un.id = ap.id;
    un.description = ap.title;
    un.title = ap.title;
    return un;
  }
  throw new UnsupportedOperationError(
    `Unable to transform data product access point`,
  );
};

const transformDataProductIcon = (
  icon: DataProductIcon,
): V1_DataProductIcon => {
  if (icon instanceof DataProductLibraryIcon) {
    const dataProductLibraryIcon = new V1_DataProductLibraryIcon();
    dataProductLibraryIcon.libraryId = icon.libraryId;
    dataProductLibraryIcon.iconId = icon.iconId;
    return dataProductLibraryIcon;
  } else if (icon instanceof DataProductEmbeddedImageIcon) {
    const dataProductEmbeddedImageIcon = new V1_DataProductEmbeddedImageIcon();
    dataProductEmbeddedImageIcon.imageUrl = icon.imageUrl;
    return dataProductEmbeddedImageIcon;
  } else if (icon instanceof UnknownDataProductIcon) {
    const unknownDataProductIcon = new V1_UnknownDataProductIcon();
    unknownDataProductIcon.content = icon.content;
    return unknownDataProductIcon;
  }
  throw new UnsupportedOperationError(
    `Can't transform data product icon type: ${icon}`,
  );
};

export const V1_transformDataProduct = (
  element: DataProduct,
  context: V1_GraphTransformerContext,
): V1_DataProduct => {
  const product = new V1_DataProduct();
  V1_initPackageableElement(product, element);
  product.description = element.description;
  product.title = element.title;
  product.sampleValues = element.sampleValues?.map((data) =>
    V1_transformEmbeddedData(data, context),
  );
  if (element.type instanceof InternalDataProductType) {
    product.type = new V1_InternalDataProductType();
  } else if (element.type instanceof ExternalDataProductType) {
    const dataProductType = new V1_ExternalDataProductType();
    dataProductType.link = element.type.link;
    product.type = dataProductType;
  }

  if (element.nativeModelAccess) {
    const nativeModelAccess = new V1_NativeModelAccess();
    const metamodelNativeModelAccess = element.nativeModelAccess;
    if (metamodelNativeModelAccess.diagrams.length === 0) {
      nativeModelAccess.diagrams = undefined;
    } else {
      nativeModelAccess.diagrams = metamodelNativeModelAccess.diagrams.map(
        (diagram) => {
          const v1Diagram = new V1_DataProductDiagram();
          v1Diagram.title = diagram.title;
          v1Diagram.description = diagram.description;
          v1Diagram.diagram = new V1_PackageableElementPointer(
            undefined,
            diagram.diagram.path,
          );
          return v1Diagram;
        },
      );
    }
    nativeModelAccess.defaultExecutionContext =
      metamodelNativeModelAccess.defaultExecutionContext;
    nativeModelAccess.nativeModelExecutionContexts =
      metamodelNativeModelAccess.nativeModelExecutionContexts.map(
        (executionContext) => {
          const v1ExecutionContext = new V1_NativeModelExecutionContext();
          v1ExecutionContext.key = executionContext.key;
          v1ExecutionContext.mapping = new V1_PackageableElementPointer(
            undefined,
            executionContext.mapping.valueForSerialization ?? '',
          );
          if (executionContext.runtime) {
            v1ExecutionContext.runtime = new V1_PackageableElementPointer(
              undefined,
              executionContext.runtime.valueForSerialization ?? '',
            );
          }
          return v1ExecutionContext;
        },
      );
    nativeModelAccess.featuredElements =
      metamodelNativeModelAccess.featuredElements.map((metatamodelScope) => {
        const scope = new V1_ElementScope();
        scope.exclude = metatamodelScope.exclude;
        scope.element = new V1_PackageableElementPointer(
          undefined,
          metatamodelScope.element.valueForSerialization ?? '',
        );
        return scope;
      });
    nativeModelAccess.sampleQueries =
      metamodelNativeModelAccess.sampleQueries.map((metamodelSampleQuery) => {
        if (metamodelSampleQuery instanceof PackageableElementSampleQuery) {
          const sampleQuery = new V1_PackageableElementSampleQuery();
          sampleQuery.id = metamodelSampleQuery.id;
          sampleQuery.title = metamodelSampleQuery.title;
          sampleQuery.description = metamodelSampleQuery.description;
          sampleQuery.executionContextKey =
            metamodelSampleQuery.executionContextKey;
          if (
            metamodelSampleQuery.query.value instanceof
            ConcreteFunctionDefinition
          ) {
            sampleQuery.query = new V1_PackageableElementPointer(
              undefined,
              generateFunctionPrettyName(metamodelSampleQuery.query.value, {
                fullPath: true,
                spacing: false,
                notIncludeParamName: true,
              }),
            );
          } else {
            sampleQuery.query = new V1_PackageableElementPointer(
              undefined,
              metamodelSampleQuery.query.valueForSerialization ?? '',
            );
          }
          return sampleQuery;
        } else if (metamodelSampleQuery instanceof InLineSampleQuery) {
          const sampleQuery = new V1_InLineSampleQuery();
          sampleQuery.id = metamodelSampleQuery.id;
          sampleQuery.title = metamodelSampleQuery.title;
          sampleQuery.description = metamodelSampleQuery.description;
          sampleQuery.executionContextKey =
            metamodelSampleQuery.executionContextKey;
          sampleQuery.query = V1_transformRawLambda(
            metamodelSampleQuery.query,
            context,
          );
          return sampleQuery;
        }
        throw new UnsupportedOperationError(
          `Unable to transform data product sample query`,
        );
      });
    product.nativeModelAccess = nativeModelAccess;
  }

  if (!element.icon) {
    product.icon = undefined;
  } else {
    product.icon = transformDataProductIcon(element.icon);
  }

  if (!element.operationalMetadata) {
    product.operationalMetadata = undefined;
  } else {
    const operationalMetadata = new V1_DataProductOperationalMetadata();
    operationalMetadata.updateFrequency = element.operationalMetadata
      .updateFrequency as V1_DeliveryFrequency | undefined;
    operationalMetadata.coverageRegions = element.operationalMetadata
      .coverageRegions as V1_DataProductRegion[] | undefined;
    product.operationalMetadata = operationalMetadata;
  }

  if (!element.supportInfo) {
    product.supportInfo = undefined;
  } else {
    const supportInfo = new V1_SupportInfo();
    supportInfo.expertise = element.supportInfo.expertise as
      | V1_Expertise[]
      | undefined;
    supportInfo.documentation = element.supportInfo.documentation;
    supportInfo.website = element.supportInfo.website;
    supportInfo.faqUrl = element.supportInfo.faqUrl;
    supportInfo.supportUrl = element.supportInfo.supportUrl;
    supportInfo.emails = element.supportInfo.emails.map((metamodelEmail) => {
      const email = new V1_Email();
      email.title = metamodelEmail.title;
      email.address = metamodelEmail.address;
      return email;
    });
    product.supportInfo = supportInfo;
  }

  product.accessPointGroups = element.accessPointGroups.map(
    (metamodelGroup) => {
      if (metamodelGroup instanceof ModelAccessPointGroup) {
        const modelGroup = new V1_ModelAccessPointGroup();
        modelGroup.id = metamodelGroup.id;
        modelGroup.title = metamodelGroup.title;
        modelGroup.description = metamodelGroup.description;
        modelGroup.stereotypes = metamodelGroup.stereotypes.map(
          V1_transformStereotype,
        );
        modelGroup.accessPoints = metamodelGroup.accessPoints.map((ap) =>
          transformAccessPoint(ap, context),
        );
        modelGroup.mapping = new V1_PackageableElementPointer(
          undefined,
          metamodelGroup.mapping.valueForSerialization ?? '',
        );

        modelGroup.featuredElements = metamodelGroup.featuredElements.map(
          (pointer) => {
            const scope = new V1_ElementScope();
            scope.exclude = pointer.exclude;
            scope.element = new V1_PackageableElementPointer(
              undefined,
              pointer.element.valueForSerialization ?? '',
            );
            return scope;
          },
        );

        modelGroup.diagrams = metamodelGroup.diagrams.map((diagram) => {
          const v1Diagram = new V1_DataProductDiagram();
          v1Diagram.title = diagram.title;
          v1Diagram.description = diagram.description;
          v1Diagram.diagram = new V1_PackageableElementPointer(
            undefined,
            diagram.diagram.path,
          );
          return v1Diagram;
        });

        return modelGroup;
      }
      const group = new V1_AccessPointGroup();
      group.id = metamodelGroup.id;
      group.title = metamodelGroup.title;
      group.description = metamodelGroup.description;
      group.stereotypes = metamodelGroup.stereotypes.map(
        V1_transformStereotype,
      );
      group.accessPoints = metamodelGroup.accessPoints.map((ap) =>
        transformAccessPoint(ap, context),
      );
      return group;
    },
  );

  product.stereotypes = element.stereotypes.map(V1_transformStereotype);
  product.taggedValues = element.taggedValues.map((taggedValue) =>
    V1_transformTaggedValue(taggedValue),
  );

  return product;
};
