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
} from '../../../../../../../graph/metamodel/pure/dataProduct/DataProduct.js';
import {
  type V1_AccessPoint,
  V1_AccessPointGroup,
  V1_DataProduct,
  V1_Email,
  V1_LakehouseAccessPoint,
  V1_SupportInfo,
  V1_UnknownAccessPoint,
} from '../../../model/packageableElements/dataProduct/V1_DataProduct.js';
import { V1_initPackageableElement } from './V1_CoreTransformerHelper.js';
import { V1_transformRawLambda } from './V1_RawValueSpecificationTransformer.js';
import type { V1_GraphTransformerContext } from './V1_GraphTransformerContext.js';
import { V1_transformStereotype } from './V1_DomainTransformer.js';

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
  if (!element.supportInfo) {
    product.supportInfo = undefined;
  } else {
    const supportInfo = new V1_SupportInfo();
    supportInfo.documentationUrl = element.supportInfo.documentationUrl;
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

  return product;
};
