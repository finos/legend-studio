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
  type DataProductIcon,
  type Email,
  type LakehouseAccessPoint,
  DataProductLink,
  observe_AccessPoint,
  observe_Email,
  observe_SupportInfo,
  observer_DataProductLink,
  SupportInfo,
  type ModelAccessPointGroup,
  type DataProductRuntimeInfo,
  type PackageableElementReference,
  type Mapping,
  type DataProductDiagram,
  type DataProductElementScope,
  observe_APG,
  type DataProductType,
  type ExternalDataProductType,
  observe_Expertise,
  type Expertise,
} from '@finos/legend-graph';
import { addUniqueEntry, deleteEntry, swapEntry } from '@finos/legend-shared';
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

export const accessPoint_setClassification = action(
  (accessPoint: LakehouseAccessPoint, classification: string | undefined) => {
    accessPoint.classification = classification;
  },
);

export const accessPoint_setReproducible = action(
  (accessPoint: LakehouseAccessPoint, reproducible: boolean | undefined) => {
    accessPoint.reproducible = reproducible;
  },
);

export const accessPoint_setDescription = action(
  (accessPoint: AccessPoint, description: string | undefined) => {
    accessPoint.description = description;
  },
);

export const accessPoint_setTitle = action(
  (accessPoint: AccessPoint, title: string | undefined) => {
    accessPoint.title = title;
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

export const accessPointGroup_setTitle = action(
  (group: AccessPointGroup, title: string | undefined) => {
    group.title = title;
  },
);

export const modelAccessPointGroup_setDefaultRuntime = action(
  (group: ModelAccessPointGroup, runtime: DataProductRuntimeInfo) => {
    group.defaultRuntime = runtime;
  },
);

export const modelAccessPointGroup_setMapping = action(
  (
    group: ModelAccessPointGroup,
    mapping: PackageableElementReference<Mapping>,
  ) => {
    group.mapping = mapping;
  },
);

export const modelAccessPointGroup_addCompatibleRuntime = action(
  (group: ModelAccessPointGroup, runtime: DataProductRuntimeInfo) => {
    addUniqueEntry(group.compatibleRuntimes, runtime);
  },
);

export const modelAccessPointGroup_removeCompatibleRuntime = action(
  (group: ModelAccessPointGroup, runtime: DataProductRuntimeInfo): void => {
    deleteEntry(group.compatibleRuntimes, runtime);
  },
);

export const modelAccessPointGroup_addElement = action(
  (group: ModelAccessPointGroup, element: DataProductElementScope): void => {
    addUniqueEntry(group.featuredElements, element);
  },
);

export const modelAccessPointGroup_removeElement = action(
  (group: ModelAccessPointGroup, element: DataProductElementScope): void => {
    deleteEntry(group.featuredElements, element);
  },
);

export const modelAccessPointGroup_setElementExclude = action(
  (element: DataProductElementScope, exclude: boolean): void => {
    element.exclude = exclude;
  },
);

export const modelAccessPointGroup_addDiagram = action(
  (group: ModelAccessPointGroup, diagram: DataProductDiagram): void => {
    addUniqueEntry(group.diagrams, diagram);
  },
);

export const modelAccessPointGroup_removeDiagram = action(
  (group: ModelAccessPointGroup, diagram: DataProductDiagram): void => {
    deleteEntry(group.diagrams, diagram);
  },
);

export const dataProductDiagram_setTitle = action(
  (diagram: DataProductDiagram, title: string): void => {
    diagram.title = title;
  },
);

export const dataProductDiagram_setDescription = action(
  (diagram: DataProductDiagram, desc: string | undefined): void => {
    diagram.description = desc;
  },
);

export const runtimeInfo_setId = action(
  (runtimeInfo: DataProductRuntimeInfo, id: string): void => {
    runtimeInfo.id = id;
  },
);

export const runtimeInfo_setDescription = action(
  (runtimeInfo: DataProductRuntimeInfo, desc: string | undefined): void => {
    runtimeInfo.description = desc;
  },
);

export const accessPointGroup_swapAccessPoints = action(
  (
    group: AccessPointGroup,
    sourceAp: AccessPoint,
    targetAp: AccessPoint,
  ): void => {
    swapEntry(group.accessPoints, sourceAp, targetAp);
  },
);

export const dataProduct_addAccessPointGroup = action(
  (product: DataProduct, accessPointGroup: AccessPointGroup) => {
    const observedApg = observe_APG(accessPointGroup);
    addUniqueEntry(product.accessPointGroups, observedApg);
  },
);

export const dataProduct_deleteAccessPointGroup = action(
  (product: DataProduct, accessPointGroup: AccessPointGroup) => {
    deleteEntry(product.accessPointGroups, accessPointGroup);
  },
);

export const dataProduct_addExpertise = action(
  (product: DataProduct, expertise: Expertise) => {
    const observedExpertise = observe_Expertise(expertise);
    if (!product.expertise) {
      product.expertise = [observedExpertise];
    } else {
      addUniqueEntry(product.expertise, observedExpertise);
    }
  },
);

export const dataProduct_deleteExpertise = action(
  (product: DataProduct, expertise: Expertise) => {
    if (product.expertise) {
      deleteEntry(product.expertise, expertise);
    }
  },
);

export const expertise_setDescription = action(
  (expertise: Expertise, desc: string) => {
    expertise.description = desc;
  },
);

export const expertise_addId = action((expertise: Expertise, id: string) => {
  if (expertise.expertIds) {
    addUniqueEntry(expertise.expertIds, id);
  } else {
    expertise.expertIds = [id];
  }
});

export const expertise_deleteId = action((expertise: Expertise, id: string) => {
  if (expertise.expertIds) {
    deleteEntry(expertise.expertIds, id);
  }
});

export const dataProduct_swapAccessPointGroups = action(
  (
    product: DataProduct,
    sourceGroup: AccessPointGroup,
    targetGroup: AccessPointGroup,
  ): void => {
    swapEntry(product.accessPointGroups, sourceGroup, targetGroup);
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

export const dataProduct_setType = action(
  (product: DataProduct, type: DataProductType) => {
    product.type = type;
  },
);

export const externalType_setLinkURL = action(
  (external: ExternalDataProductType, url: string) => {
    external.link.url = url;
  },
);

export const externalType_setLinkLabel = action(
  (external: ExternalDataProductType, label: string | undefined) => {
    external.link.label = label;
  },
);

export const dataProduct_setIcon = action(
  (product: DataProduct, icon: DataProductIcon | undefined) => {
    product.icon = icon;
  },
);

export const dataProduct_setSupportInfoIfAbsent = action(
  (product: DataProduct) => {
    if (!product.supportInfo) {
      product.supportInfo = observe_SupportInfo(new SupportInfo());
    }
  },
);

export const supportInfo_setLinkLabel = action(
  (link: DataProductLink, label: string | undefined) => {
    link.label = label;
  },
);

export const supportInfo_setDocumentationUrl = action(
  (supportInfo: SupportInfo, documentationUrl: string) => {
    if (!supportInfo.documentation) {
      supportInfo.documentation = observer_DataProductLink(
        new DataProductLink(documentationUrl),
      );
    } else {
      supportInfo.documentation.url = documentationUrl;
    }
  },
);

export const supportInfo_setWebsite = action(
  (supportInfo: SupportInfo, website: string) => {
    if (!supportInfo.website) {
      supportInfo.website = observer_DataProductLink(
        new DataProductLink(website),
      );
    } else {
      supportInfo.website.url = website;
    }
  },
);

export const supportInfo_setFaqUrl = action(
  (supportInfo: SupportInfo, faqUrl: string) => {
    if (!supportInfo.faqUrl) {
      supportInfo.faqUrl = observer_DataProductLink(
        new DataProductLink(faqUrl),
      );
    } else {
      supportInfo.faqUrl.url = faqUrl;
    }
  },
);

export const supportInfo_setSupportUrl = action(
  (supportInfo: SupportInfo, supportUrl: string) => {
    if (!supportInfo.supportUrl) {
      supportInfo.supportUrl = observer_DataProductLink(
        new DataProductLink(supportUrl),
      );
    } else {
      supportInfo.supportUrl.url = supportUrl;
    }
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
