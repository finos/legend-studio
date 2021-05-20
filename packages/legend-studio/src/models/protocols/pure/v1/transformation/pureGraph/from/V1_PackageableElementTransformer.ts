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
  getClass,
  UnsupportedOperationError,
} from '@finos/legend-studio-shared';
import type {
  PackageableElement,
  PackageableElementVisitor,
} from '../../../../../../metamodels/pure/model/packageableElements/PackageableElement';
import type { Profile } from '../../../../../../metamodels/pure/model/packageableElements/domain/Profile';
import type { Enumeration } from '../../../../../../metamodels/pure/model/packageableElements/domain/Enumeration';
import type { Measure } from '../../../../../../metamodels/pure/model/packageableElements/domain/Measure';
import type { Class } from '../../../../../../metamodels/pure/model/packageableElements/domain/Class';
import type { Association } from '../../../../../../metamodels/pure/model/packageableElements/domain/Association';
import type { ConcreteFunctionDefinition } from '../../../../../../metamodels/pure/model/packageableElements/domain/ConcreteFunctionDefinition';
import type { FlatData } from '../../../../../../metamodels/pure/model/packageableElements/store/flatData/model/FlatData';
import type { Database } from '../../../../../../metamodels/pure/model/packageableElements/store/relational/model/Database';
import type { ServiceStore } from '../../../../../../metamodels/pure/model/packageableElements/store/relational/model/ServiceStore';
import type { Mapping } from '../../../../../../metamodels/pure/model/packageableElements/mapping/Mapping';
import type { Service } from '../../../../../../metamodels/pure/model/packageableElements/service/Service';
import type { Diagram } from '../../../../../../metamodels/pure/model/packageableElements/diagram/Diagram';
import type { PackageableRuntime } from '../../../../../../metamodels/pure/model/packageableElements/runtime/PackageableRuntime';
import type { PackageableConnection } from '../../../../../../metamodels/pure/model/packageableElements/connection/PackageableConnection';
import type { FileGenerationSpecification } from '../../../../../../metamodels/pure/model/packageableElements/fileGeneration/FileGenerationSpecification';
import type { GenerationSpecification } from '../../../../../../metamodels/pure/model/packageableElements/generationSpecification/GenerationSpecification';
import type { Package } from '../../../../../../metamodels/pure/model/packageableElements/domain/Package';
import type { PrimitiveType } from '../../../../../../metamodels/pure/model/packageableElements/domain/PrimitiveType';
import type { SectionIndex } from '../../../../../../metamodels/pure/model/packageableElements/section/SectionIndex';
import type { V1_PackageableElement } from '../../../model/packageableElements/V1_PackageableElement';
import {
  V1_transformAssociation,
  V1_transformClass,
  V1_transformEnumeration,
  V1_transformFunction,
  V1_transformMeasure,
  V1_transformProfile,
} from './V1_DomainTransformer';
import { V1_transformSectionIndex } from './V1_SectionIndexTransformer';
import {
  V1_transformFileGeneration,
  V1_transformGenerationSpecification,
} from './V1_GenerationSpecificationTransformer';
import { V1_transformFlatData } from './V1_FlatDataTransformer';
import { V1_transformServiceStore } from './V1_ServiceStoreTransformer';
import { V1_transformDatabase } from './V1_DatabaseTransformer';
import { V1_transformMapping } from './V1_MappingTransformer';
import { V1_transformService } from './V1_ServiceTransformer';
import { V1_transformDiagram } from './V1_DiagramTransformer';
import { V1_transformPackageableRuntime } from './V1_RuntimeTransformer';
import { V1_transformPackageableConnection } from './V1_ConnectionTransformer';
import type {
  V1_ElementTransformer,
  PureProtocolProcessorPlugin,
} from '../../../../PureProtocolProcessorPlugin';

/**
 * NOTE: During serialization, we try our best to have the props within each schema ordered the same way
 * as in the backend (which is in alphabetical order). This helps reduce noises when showing JSON diffs.
 */
export class V1_PackageableElementTransformer
  implements PackageableElementVisitor<V1_PackageableElement>
{
  plugins: PureProtocolProcessorPlugin[] = [];
  extraElementTransformers: V1_ElementTransformer[] = [];

  constructor(plugins: PureProtocolProcessorPlugin[]) {
    this.plugins = plugins;
    this.extraElementTransformers = plugins.flatMap(
      (plugin) => plugin.V1_getExtraElementTransformers?.() ?? [],
    );
  }

  visit_PackageableElement(element: PackageableElement): V1_PackageableElement {
    for (const transformer of this.extraElementTransformers) {
      const elementProtocol = transformer(element);
      if (elementProtocol) {
        return elementProtocol;
      }
    }
    throw new UnsupportedOperationError(
      `Can't transform element '${element.path}' of type '${
        getClass(element).name
      }' to protocol. No compatible transformer available from plugins.`,
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
    return V1_transformMeasure(element);
  }

  visit_Class(element: Class): V1_PackageableElement {
    return V1_transformClass(element);
  }

  visit_Association(element: Association): V1_PackageableElement {
    return V1_transformAssociation(element);
  }

  visit_ConcreteFunctionDefinition(
    element: ConcreteFunctionDefinition,
  ): V1_PackageableElement {
    return V1_transformFunction(element);
  }

  visit_FlatData(element: FlatData): V1_PackageableElement {
    return V1_transformFlatData(element);
  }

  visit_Database(element: Database): V1_PackageableElement {
    return V1_transformDatabase(element, this.plugins);
  }

  visit_ServiceStore(element: ServiceStore): V1_PackageableElement {
    return V1_transformServiceStore(element);
  }

  visit_Mapping(element: Mapping): V1_PackageableElement {
    return V1_transformMapping(element);
  }

  visit_Service(element: Service): V1_PackageableElement {
    return V1_transformService(element, this.plugins);
  }

  visit_Diagram(element: Diagram): V1_PackageableElement {
    return V1_transformDiagram(element);
  }

  visit_PackageableRuntime(element: PackageableRuntime): V1_PackageableElement {
    return V1_transformPackageableRuntime(element, this.plugins);
  }

  visit_PackageableConnection(
    element: PackageableConnection,
  ): V1_PackageableElement {
    return V1_transformPackageableConnection(element, this.plugins);
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
}
