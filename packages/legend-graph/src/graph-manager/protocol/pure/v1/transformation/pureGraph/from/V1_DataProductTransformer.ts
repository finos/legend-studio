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
  LakehouseAccessPoint,
  UnknownAccessPoint,
  type DataProduct,
  LibraryIcon,
  EmbeddedImageIcon,
  ModelAccessPointGroup,
} from '../../../../../../../graph/metamodel/pure/dataProduct/DataProduct.js';
import {
  type V1_AccessPoint,
  V1_AccessPointGroup,
  V1_DataProduct,
  type V1_DeliveryFrequency,
  V1_Email,
  V1_EmbeddedImageIcon,
  V1_LakehouseAccessPoint,
  V1_LibraryIcon,
  V1_SupportInfo,
  V1_UnknownAccessPoint,
  type V1_DataProductRegion,
  V1_ModelAccessPointGroup,
  V1_DataProductRuntimeInfo,
  V1_ElementScope,
  V1_DataProductDiagram,
} from '../../../model/packageableElements/dataProduct/V1_DataProduct.js';
import { V1_initPackageableElement } from './V1_CoreTransformerHelper.js';
import { V1_transformRawLambda } from './V1_RawValueSpecificationTransformer.js';
import type { V1_GraphTransformerContext } from './V1_GraphTransformerContext.js';
import {
  V1_transformStereotype,
  V1_transformTaggedValue,
} from './V1_DomainTransformer.js';
import { V1_PackageableElementPointer } from '../../../model/packageableElements/V1_PackageableElement.js';

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
    return lake;
  } else if (ap instanceof UnknownAccessPoint) {
    const un = new V1_UnknownAccessPoint();
    un.content = ap.content;
    un.id = ap.id;
    return un;
  }
  throw new UnsupportedOperationError(
    `Unable to transform data product access point`,
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
  product.deliveryFrequency = element.deliveryFrequency as
    | V1_DeliveryFrequency
    | undefined;
  product.coverageRegions = element.coverageRegions as
    | V1_DataProductRegion[]
    | undefined;
  if (element.icon instanceof LibraryIcon) {
    const libIcon = new V1_LibraryIcon();
    libIcon.libraryId = element.icon.libraryId;
    libIcon.iconId = element.icon.iconId;
    product.icon = libIcon;
  } else if (element.icon instanceof EmbeddedImageIcon) {
    const embeddedIcon = new V1_EmbeddedImageIcon();
    embeddedIcon.imageUrl = element.icon.imageUrl;
    product.icon = embeddedIcon;
  }
  if (!element.supportInfo) {
    product.supportInfo = undefined;
  } else {
    const supportInfo = new V1_SupportInfo();
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
        modelGroup.defaultRuntime = metamodelGroup.defaultRuntime.id;
        modelGroup.compatibleRuntimes = metamodelGroup.compatibleRuntimes.map(
          (rInfo) => {
            const metamodelRuntime = new V1_DataProductRuntimeInfo();
            metamodelRuntime.runtime = new V1_PackageableElementPointer(
              undefined,
              rInfo.runtime.valueForSerialization ?? '',
            );
            metamodelRuntime.id = rInfo.id;
            metamodelRuntime.description = rInfo.description;
            return metamodelRuntime;
          },
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
