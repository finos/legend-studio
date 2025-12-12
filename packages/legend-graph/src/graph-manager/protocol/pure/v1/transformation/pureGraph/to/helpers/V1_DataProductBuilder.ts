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
  guaranteeNonNullable,
  isNonNullable,
  UnsupportedOperationError,
} from '@finos/legend-shared';
import {
  type AccessPoint,
  type DataProductElement,
  type DataProductIcon,
  AccessPointGroup,
  type DataProduct_DeliveryFrequency,
  type DataProduct_Region,
  DataProductElementScope,
  DataProductEmbeddedImageIcon,
  DataProductLibraryIcon,
  DataProductLink,
  DataProductOperationalMetadata,
  DataProductRuntimeInfo,
  Expertise,
  FunctionAccessPoint,
  LakehouseAccessPoint,
  ModelAccessPointGroup,
  UnknownAccessPoint,
  UnknownDataProductIcon,
} from '../../../../../../../../graph/metamodel/pure/dataProduct/DataProduct.js';
import {
  type V1_AccessPoint,
  type V1_AccessPointGroup,
  type V1_DataProductIcon,
  type V1_DataProductLink,
  V1_DataProductEmbeddedImageIcon,
  V1_DataProductLibraryIcon,
  type V1_Expertise,
  V1_FunctionAccessPoint,
  V1_LakehouseAccessPoint,
  V1_ModelAccessPointGroup,
  V1_UnknownAccessPoint,
  V1_UnknownDataProductIcon,
  type V1_DataProductOperationalMetadata,
} from '../../../../model/packageableElements/dataProduct/V1_DataProduct.js';
import type { V1_GraphBuilderContext } from '../V1_GraphBuilderContext.js';
import { V1_buildRawLambdaWithResolvedPaths } from './V1_ValueSpecificationPathResolver.js';
import {
  type PackageableElementReference,
  PackageableElementExplicitReference,
} from '../../../../../../../../graph/metamodel/pure/packageableElements/PackageableElementReference.js';
import { Package } from '../../../../../../../../graph/metamodel/pure/packageableElements/domain/Package.js';
import { Class } from '../../../../../../../../graph/metamodel/pure/packageableElements/domain/Class.js';
import { Enumeration } from '../../../../../../../../graph/metamodel/pure/packageableElements/domain/Enumeration.js';
import { Association } from '../../../../../../../../graph/metamodel/pure/packageableElements/domain/Association.js';

export const V1_buildDataProductLink = (
  link: V1_DataProductLink,
): DataProductLink => {
  return new DataProductLink(link.url, link.label);
};

export const V1_buildAccessPoint = (
  ap: V1_AccessPoint,
  context: V1_GraphBuilderContext,
): AccessPoint => {
  if (ap instanceof V1_LakehouseAccessPoint) {
    const lakeAccessPoint = new LakehouseAccessPoint(
      ap.id,
      ap.targetEnvironment,
      V1_buildRawLambdaWithResolvedPaths(
        ap.func.parameters,
        ap.func.body,
        context,
      ),
    );
    lakeAccessPoint.reproducible = ap.reproducible;
    lakeAccessPoint.classification = ap.classification;
    lakeAccessPoint.description = ap.description;
    lakeAccessPoint.title = ap.title;
    return lakeAccessPoint;
  } else if (ap instanceof V1_FunctionAccessPoint) {
    const functionAccessPoint = new FunctionAccessPoint(
      ap.id,
      V1_buildRawLambdaWithResolvedPaths(
        ap.query.parameters,
        ap.query.body,
        context,
      ),
    );
    functionAccessPoint.description = ap.description;
    functionAccessPoint.title = ap.title;
    return functionAccessPoint;
  } else if (ap instanceof V1_UnknownAccessPoint) {
    const unknown = new UnknownAccessPoint(ap.id);
    unknown.description = ap.description;
    unknown.title = ap.title;
    unknown.content = ap.content;
    return unknown;
  }
  throw new UnsupportedOperationError(
    `Unsupported data product access type ${ap}`,
  );
};

export const V1_buildDataProductIcon = (
  icon: V1_DataProductIcon,
): DataProductIcon => {
  if (icon instanceof V1_DataProductLibraryIcon) {
    return new DataProductLibraryIcon(icon.libraryId, icon.iconId);
  } else if (icon instanceof V1_DataProductEmbeddedImageIcon) {
    return new DataProductEmbeddedImageIcon(icon.imageUrl);
  } else if (icon instanceof V1_UnknownDataProductIcon) {
    return new UnknownDataProductIcon(icon.content);
  }
  throw new UnsupportedOperationError(
    `Unsupported data product icon type ${icon}`,
  );
};

export const V1_buildDataProductExpertise = (
  v1Expertise: V1_Expertise,
): Expertise => {
  const expertise = new Expertise();
  expertise.description = v1Expertise.description;
  expertise.expertIds = v1Expertise.expertIds;
  return expertise;
};

export const V1_buildDataProductOperationalMetadata = (
  operationalMetadata: V1_DataProductOperationalMetadata,
): DataProductOperationalMetadata => {
  const metamodelOperationalMetadata = new DataProductOperationalMetadata();
  metamodelOperationalMetadata.updateFrequency =
    operationalMetadata.updateFrequency as
      | DataProduct_DeliveryFrequency
      | undefined;
  metamodelOperationalMetadata.coverageRegions =
    operationalMetadata.coverageRegions as DataProduct_Region[] | undefined;
  return metamodelOperationalMetadata;
};

export const V1_buildAccessPointGroup = (
  elementGroup: V1_AccessPointGroup,
  context: V1_GraphBuilderContext,
): AccessPointGroup => {
  console.log('🏗️ V1_buildAccessPointGroup called');
  console.log('   - elementGroup type:', elementGroup.constructor.name);
  console.log('   - elementGroup id:', elementGroup.id);
  console.log('this is elementGroup:', elementGroup);
  console.log('Context: ', context);
  if (elementGroup instanceof V1_ModelAccessPointGroup) {
    console.log('✅ This is a V1_ModelAccessPointGroup');
    console.log(
      '   - compatibleRuntimes count:',
      elementGroup.compatibleRuntimes?.length ?? 0,
    );
    console.log('   - mapping path:', elementGroup.mapping?.path);
    const group = new ModelAccessPointGroup();
    group.id = elementGroup.id;
    group.title = elementGroup.title;
    group.description = elementGroup.description;
    group.accessPoints = elementGroup.accessPoints.map((ep) =>
      V1_buildAccessPoint(ep, context),
    );
    group.stereotypes = elementGroup.stereotypes
      .map((stereotype) => context.resolveStereotype(stereotype))
      .filter(isNonNullable);
    console.log('🗺️ About to get mapping:', elementGroup.mapping.path);
    group.mapping = PackageableElementExplicitReference.create(
      context.graph.getMapping(elementGroup.mapping.path),
    );
    console.log('✅ Got mapping, now processing compatibleRuntimes...');
    group.compatibleRuntimes = (elementGroup.compatibleRuntimes ?? []).map(
      (rInfo) => {
        console.log('🔍 Processing runtime info:', {
          id: rInfo.id,
          path: rInfo.runtime.path,
          description: rInfo.description,
        });
        console.log(
          '📦 Available runtimes in graph:',
          context.graph.ownRuntimes.map((r) => ({
            path: r.path,
            hasRuntimeValue: !!r.runtimeValue,
            runtimeValueType: r.runtimeValue?.constructor.name,
          })),
        );

        const metamodelRuntime = new DataProductRuntimeInfo();
        try {
          console.log(
            '🔎 DataProduct looking for runtime:',
            rInfo.runtime.path,
          );
          console.log('   - In graph:', context.graph.constructor.name);
          console.log(
            '   - Total runtimes in graph:',
            context.graph.ownRuntimes.length,
          );
          console.log(
            '   - Runtime paths:',
            context.graph.ownRuntimes.map((r) => r.path),
          );
          const runtimeElement = context.graph.getRuntime(rInfo.runtime.path);
          console.log('✅ Found runtime:', runtimeElement.path);
          console.log('   - Has runtimeValue?', !!runtimeElement.runtimeValue);
          console.log(
            '   - RuntimeValue type:',
            runtimeElement.runtimeValue?.constructor.name,
          );
          if (!runtimeElement.runtimeValue) {
            console.error(
              '⚠️  WARNING: Runtime exists but runtimeValue is undefined!',
            );
            console.error(
              '   This means DataProducts are being built before runtimes are fully built.',
            );
          }
          metamodelRuntime.runtime =
            PackageableElementExplicitReference.create(runtimeElement);
        } catch (error) {
          console.error('❌ Failed to find runtime:', rInfo.runtime.path);
          console.error('   Error:', error);
          throw error;
        }
        metamodelRuntime.id = rInfo.id;
        metamodelRuntime.description = rInfo.description;
        return metamodelRuntime;
      },
    );
    console.log('compatible runtimes: ', group.compatibleRuntimes);
    console.log('default runtime: ', elementGroup.defaultRuntime);
    if (elementGroup.defaultRuntime) {
      group.defaultRuntime = group.compatibleRuntimes.find(
        (e) => e.id === elementGroup.defaultRuntime,
      );
      if (!group.defaultRuntime) {
        console.warn(
          `default runtime ${elementGroup.defaultRuntime} not found in data product, but continuing anyway`,
        );
      }
    }
    if (elementGroup.featuredElements) {
      group.featuredElements = elementGroup.featuredElements.map((pointer) => {
        const elementReference = context.resolveElement(
          pointer.element.path,
          true,
        );
        if (
          elementReference.value instanceof Package ||
          elementReference.value instanceof Class ||
          elementReference.value instanceof Enumeration ||
          elementReference.value instanceof Association
        ) {
          const elementPointer = new DataProductElementScope();
          elementPointer.element =
            elementReference as unknown as PackageableElementReference<DataProductElement>;
          elementPointer.exclude = pointer.exclude;
          return elementPointer;
        }
        throw new UnsupportedOperationError(
          `Can't find data product element (only allow packages, classes, enumerations, and associations) '${pointer.element.path}'`,
        );
      });
    }
    return group;
  } else {
    const group = new AccessPointGroup();
    group.id = elementGroup.id;
    group.title = elementGroup.title;
    group.description = elementGroup.description;
    group.accessPoints = elementGroup.accessPoints.map((ep) =>
      V1_buildAccessPoint(ep, context),
    );
    group.stereotypes = elementGroup.stereotypes
      .map((stereotype) => context.resolveStereotype(stereotype))
      .filter(isNonNullable);
    return group;
  }
};
