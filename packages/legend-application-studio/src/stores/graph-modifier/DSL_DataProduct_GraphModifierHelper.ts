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
  type AccessPoint,
  type AccessPointGroup,
  type DataProduct,
  type Email,
  observe_AccessPoint,
  observe_AccessPointGroup,
  observe_SupportInfo,
  observe_Email,
  SupportInfo,
} from '@finos/legend-graph';
import { addUniqueEntry, deleteEntry } from '@finos/legend-shared';

import { action } from 'mobx';

export const dataProduct_deleteAccessPoint = action(
  (group: AccessPointGroup, accessPoint: AccessPoint) => {
    deleteEntry(group.accessPoints, accessPoint);
  },
);

export const dataProduct_addAccessPoint = action(
  (group: AccessPointGroup, accessPoint: AccessPoint) => {
    addUniqueEntry(group.accessPoints, observe_AccessPoint(accessPoint));
  },
);

export const accessPointGroup_setDescription = action(
  (group: AccessPointGroup, description: string) => {
    group.description = description;
  },
);

export const accessPointGroup_setName = action(
  (group: AccessPointGroup, name: string) => {
    group.id = name;
  },
);

export const dataProduct_addAccessPointGroup = action(
  (product: DataProduct, accessPointGroup: AccessPointGroup) => {
    addUniqueEntry(
      product.accessPointGroups,
      observe_AccessPointGroup(accessPointGroup),
    );
  },
);

export const dataProduct_deleteAccessPointGroup = action(
  (product: DataProduct, accessPointGroup: AccessPointGroup) => {
    deleteEntry(product.accessPointGroups, accessPointGroup);
  },
);

export const dataProduct_setTitle = action(
  (product: DataProduct, title: string) => {
    product.title = title;
  },
);

export const dataProduct_setDescription = action(
  (product: DataProduct, description: string) => {
    product.description = description;
  },
);

export const dataProduct_setSupportInfoIfAbsent = action(
  (product: DataProduct) => {
    if (!product.supportInfo) {
      product.supportInfo = observe_SupportInfo(new SupportInfo());
    }
  },
);

export const supportInfo_setDocumentationUrl = action(
  (supportInfo: SupportInfo, documentationUrl: string) => {
    supportInfo.documentationUrl = documentationUrl;
  },
);

export const supportInfo_setWebsite = action(
  (supportInfo: SupportInfo, website: string) => {
    supportInfo.website = website;
  },
);

export const supportInfo_setFaqUrl = action(
  (supportInfo: SupportInfo, faqUrl: string) => {
    supportInfo.faqUrl = faqUrl;
  },
);

export const supportInfo_setSupportUrl = action(
  (supportInfo: SupportInfo, supportUrl: string) => {
    supportInfo.supportUrl = supportUrl;
  },
);

export const supportInfo_addEmail = action(
  (supportInfo: SupportInfo, email: Email) => {
    addUniqueEntry(supportInfo.emails, observe_Email(email));
  },
);

export const supportInfo_deleteEmail = action(
  (supportInfo: SupportInfo, email: Email): void => {
    const index = supportInfo.emails.indexOf(email);
    if (index !== -1) {
      supportInfo.emails.splice(index, 1);
    }
  },
);
