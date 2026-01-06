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
  Expertise,
  FunctionAccessPoint,
  LakehouseAccessPoint,
  ModelAccessPointGroup,
  UnknownAccessPoint,
  UnknownDataProductIcon,
  NativeModelAccess,
  type SampleQuery,
  PackageableElementSampleQuery,
  InLineSampleQuery,
  DataProductDiagram,
  NativeModelExecutionContext,
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
  type V1_NativeModelAccess,
  type V1_SampleQuery,
  V1_UnknownAccessPoint,
  V1_UnknownDataProductIcon,
  type V1_DataProductOperationalMetadata,
  V1_PackageableElementSampleQuery,
  V1_InLineSampleQuery,
  type V1_NativeModelExecutionContext,
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
import { generateFunctionPrettyName } from '../../../../../../../../graph/helpers/PureLanguageHelper.js';

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
  if (elementGroup instanceof V1_ModelAccessPointGroup) {
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
    group.mapping = PackageableElementExplicitReference.create(
      context.graph.getMapping(elementGroup.mapping.path),
    );
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

export const V1_buildNativeModelExecutionContext = (
  nativeModelExecutionContext: V1_NativeModelExecutionContext,
  context: V1_GraphBuilderContext,
): NativeModelExecutionContext => {
  const metamodelNativeModelExecutionContext =
    new NativeModelExecutionContext();
  metamodelNativeModelExecutionContext.key = nativeModelExecutionContext.key;
  metamodelNativeModelExecutionContext.mapping =
    PackageableElementExplicitReference.create(
      context.graph.getMapping(nativeModelExecutionContext.mapping.path),
    );
  if (nativeModelExecutionContext.runtime) {
    metamodelNativeModelExecutionContext.runtime =
      PackageableElementExplicitReference.create(
        context.graph.getRuntime(nativeModelExecutionContext.runtime.path),
      );
  }
  return metamodelNativeModelExecutionContext;
};

export const V1_buildSampleQuery = (
  sampleQuery: V1_SampleQuery,
  defaultExecutionContext: string,
  context: V1_GraphBuilderContext,
): SampleQuery => {
  if (sampleQuery instanceof V1_PackageableElementSampleQuery) {
    const metamodelSampleQuery = new PackageableElementSampleQuery();
    metamodelSampleQuery.id = sampleQuery.id;
    metamodelSampleQuery.title = sampleQuery.title;
    metamodelSampleQuery.description = sampleQuery.description;
    metamodelSampleQuery.executionContextKey =
      sampleQuery.executionContextKey ?? defaultExecutionContext;
    try {
      metamodelSampleQuery.query = context.resolveElement(
        sampleQuery.query.path,
        false,
      );
    } catch {
      try {
        metamodelSampleQuery.query = PackageableElementExplicitReference.create(
          guaranteeNonNullable(
            context.graph.functions.find(
              (fn) =>
                generateFunctionPrettyName(fn, {
                  fullPath: true,
                  spacing: false,
                  notIncludeParamName: true,
                }) === sampleQuery.query.path.replaceAll(/\s*/gu, ''),
            ),
          ),
        );
      } catch {
        throw new UnsupportedOperationError(
          `Can't analyze data product executable with element in path: ${sampleQuery.query.path}`,
          sampleQuery,
        );
      }
    }

    return metamodelSampleQuery;
  } else if (sampleQuery instanceof V1_InLineSampleQuery) {
    const metamodelSampleQuery = new InLineSampleQuery();
    metamodelSampleQuery.id = sampleQuery.id;
    metamodelSampleQuery.title = sampleQuery.title;
    metamodelSampleQuery.description = sampleQuery.description;
    metamodelSampleQuery.executionContextKey =
      sampleQuery.executionContextKey ?? defaultExecutionContext;
    metamodelSampleQuery.query = V1_buildRawLambdaWithResolvedPaths(
      sampleQuery.query.parameters,
      sampleQuery.query.body,
      context,
    );
    return metamodelSampleQuery;
  }

  throw new UnsupportedOperationError(
    `Unsupported data product sample query type`,
  );
};

export const V1_buildNativeModelAccess = (
  nativeModelAccess: V1_NativeModelAccess,
  context: V1_GraphBuilderContext,
): NativeModelAccess => {
  const metamodelNativeModelAccess = new NativeModelAccess();
  metamodelNativeModelAccess.defaultExecutionContext =
    nativeModelAccess.defaultExecutionContext;
  metamodelNativeModelAccess.nativeModelExecutionContexts =
    nativeModelAccess.nativeModelExecutionContexts.map((executionContext) =>
      V1_buildNativeModelExecutionContext(executionContext, context),
    );
  if (nativeModelAccess.sampleQueries) {
    metamodelNativeModelAccess.sampleQueries =
      nativeModelAccess.sampleQueries.map((sampleQuery) =>
        V1_buildSampleQuery(
          sampleQuery,
          nativeModelAccess.defaultExecutionContext,
          context,
        ),
      );
  }
  if (!nativeModelAccess.diagrams) {
    metamodelNativeModelAccess.diagrams = [];
  } else {
    metamodelNativeModelAccess.diagrams = nativeModelAccess.diagrams.map(
      (diagram) => {
        const metadatamodelDiagram = new DataProductDiagram();
        metadatamodelDiagram.diagram = context.graph.getElement(
          diagram.diagram.path,
        );
        metadatamodelDiagram.title = diagram.title;
        metadatamodelDiagram.description = diagram.description;
        return metadatamodelDiagram;
      },
    );
  }
  if (nativeModelAccess.featuredElements) {
    metamodelNativeModelAccess.featuredElements =
      nativeModelAccess.featuredElements.map((pointer) => {
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

  return metamodelNativeModelAccess;
};
