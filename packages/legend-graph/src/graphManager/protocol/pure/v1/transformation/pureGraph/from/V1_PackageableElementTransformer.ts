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
  assertErrorThrown,
  UnsupportedOperationError,
} from '@finos/legend-shared';
import type {
  PackageableElement,
  PackageableElementVisitor,
} from '../../../../../../../graph/metamodel/pure/packageableElements/PackageableElement.js';
import type { Profile } from '../../../../../../../graph/metamodel/pure/packageableElements/domain/Profile.js';
import type { Enumeration } from '../../../../../../../graph/metamodel/pure/packageableElements/domain/Enumeration.js';
import type { Measure } from '../../../../../../../graph/metamodel/pure/packageableElements/domain/Measure.js';
import type { Class } from '../../../../../../../graph/metamodel/pure/packageableElements/domain/Class.js';
import type { Association } from '../../../../../../../graph/metamodel/pure/packageableElements/domain/Association.js';
import type { ConcreteFunctionDefinition } from '../../../../../../../graph/metamodel/pure/packageableElements/domain/ConcreteFunctionDefinition.js';
import type { FlatData } from '../../../../../../../graph/metamodel/pure/packageableElements/store/flatData/model/FlatData.js';
import type { Database } from '../../../../../../../graph/metamodel/pure/packageableElements/store/relational/model/Database.js';
import type { Mapping } from '../../../../../../../graph/metamodel/pure/packageableElements/mapping/Mapping.js';
import type { Service } from '../../../../../../../graph/metamodel/pure/packageableElements/service/Service.js';
import type { PackageableRuntime } from '../../../../../../../graph/metamodel/pure/packageableElements/runtime/PackageableRuntime.js';
import type { PackageableConnection } from '../../../../../../../graph/metamodel/pure/packageableElements/connection/PackageableConnection.js';
import type { FileGenerationSpecification } from '../../../../../../../graph/metamodel/pure/packageableElements/fileGeneration/FileGenerationSpecification.js';
import type { GenerationSpecification } from '../../../../../../../graph/metamodel/pure/packageableElements/generationSpecification/GenerationSpecification.js';
import type { Package } from '../../../../../../../graph/metamodel/pure/packageableElements/domain/Package.js';
import type { PrimitiveType } from '../../../../../../../graph/metamodel/pure/packageableElements/domain/PrimitiveType.js';
import type { SectionIndex } from '../../../../../../../graph/metamodel/pure/packageableElements/section/SectionIndex.js';
import type { V1_PackageableElement } from '../../../model/packageableElements/V1_PackageableElement.js';
import {
  V1_transformAssociation,
  V1_transformClass,
  V1_transformEnumeration,
  V1_transformFunction,
  V1_transformMeasure,
  V1_transformProfile,
} from './V1_DomainTransformer.js';
import { V1_transformSectionIndex } from './V1_SectionIndexTransformer.js';
import {
  V1_transformFileGeneration,
  V1_transformGenerationSpecification,
} from './V1_GenerationSpecificationTransformer.js';
import { V1_transformFlatData } from './V1_FlatDataTransformer.js';
import { V1_transformDatabase } from './V1_DatabaseTransformer.js';
import { V1_transformMapping } from './V1_MappingTransformer.js';
import { V1_transformService } from './V1_ServiceTransformer.js';
import { V1_transformPackageableRuntime } from './V1_RuntimeTransformer.js';
import { V1_transformPackageableConnection } from './V1_ConnectionTransformer.js';
import type {
  V1_ElementTransformer,
  PureProtocolProcessorPlugin,
} from '../../../../PureProtocolProcessorPlugin.js';
import type { V1_GraphTransformerContext } from './V1_GraphTransformerContext.js';
import type { DataElement } from '../../../../../../../graph/metamodel/pure/packageableElements/data/DataElement.js';
import { V1_transformDataElement } from './V1_DataElementTransformer.js';

class V1_PackageableElementTransformer
  implements PackageableElementVisitor<V1_PackageableElement>
{
  context: V1_GraphTransformerContext;
  extraElementTransformers: V1_ElementTransformer[] = [];

  constructor(
    plugins: PureProtocolProcessorPlugin[],
    context: V1_GraphTransformerContext,
  ) {
    this.extraElementTransformers = plugins.flatMap(
      (plugin) => plugin.V1_getExtraElementTransformers?.() ?? [],
    );
    this.context = context;
  }

  visit_PackageableElement(element: PackageableElement): V1_PackageableElement {
    for (const transformer of this.extraElementTransformers) {
      const elementProtocol = transformer(element, this.context);
      if (elementProtocol) {
        return elementProtocol;
      }
    }
    throw new UnsupportedOperationError(
      `Can't transform element '${element.path}': no compatible transformer available from plugins`,
      element,
    );
  }

  visit_Package(element: Package): V1_PackageableElement {
    throw new UnsupportedOperationError();
  }

  visit_SectionIndex(element: SectionIndex): V1_PackageableElement {
    return V1_transformSectionIndex(element);
  }

  visit_PrimitiveType(element: PrimitiveType): V1_PackageableElement {
    throw new UnsupportedOperationError();
  }

  visit_Profile(element: Profile): V1_PackageableElement {
    return V1_transformProfile(element);
  }

  visit_Enumeration(element: Enumeration): V1_PackageableElement {
    return V1_transformEnumeration(element);
  }

  visit_Measure(element: Measure): V1_PackageableElement {
    return V1_transformMeasure(element, this.context);
  }

  visit_Class(element: Class): V1_PackageableElement {
    return V1_transformClass(element, this.context);
  }

  visit_Association(element: Association): V1_PackageableElement {
    return V1_transformAssociation(element, this.context);
  }

  visit_ConcreteFunctionDefinition(
    element: ConcreteFunctionDefinition,
  ): V1_PackageableElement {
    return V1_transformFunction(element, this.context);
  }

  visit_FlatData(element: FlatData): V1_PackageableElement {
    return V1_transformFlatData(element);
  }

  visit_Database(element: Database): V1_PackageableElement {
    return V1_transformDatabase(element, this.context);
  }

  visit_Mapping(element: Mapping): V1_PackageableElement {
    return V1_transformMapping(element, this.context);
  }

  visit_Service(element: Service): V1_PackageableElement {
    return V1_transformService(element, this.context);
  }

  visit_PackageableRuntime(element: PackageableRuntime): V1_PackageableElement {
    return V1_transformPackageableRuntime(element, this.context);
  }

  visit_PackageableConnection(
    element: PackageableConnection,
  ): V1_PackageableElement {
    return V1_transformPackageableConnection(element, this.context);
  }

  visit_FileGenerationSpecification(
    element: FileGenerationSpecification,
  ): V1_PackageableElement {
    return V1_transformFileGeneration(element);
  }

  visit_GenerationSpecification(
    element: GenerationSpecification,
  ): V1_PackageableElement {
    return V1_transformGenerationSpecification(element);
  }

  visit_DataElement(element: DataElement): V1_PackageableElement {
    return V1_transformDataElement(element, this.context);
  }
}

export const V1_transformPackageableElement = (
  element: PackageableElement,
  plugins: PureProtocolProcessorPlugin[],
  context: V1_GraphTransformerContext,
): V1_PackageableElement => {
  try {
    return element.accept_PackageableElementVisitor(
      new V1_PackageableElementTransformer(plugins, context),
    );
  } catch (error) {
    assertErrorThrown(error);
    // TODO?: should we wrap this in GraphTransformerError?
    error.message = `Can't transform element '${element.path}': ${error.message}`;
    throw error;
  }
};
