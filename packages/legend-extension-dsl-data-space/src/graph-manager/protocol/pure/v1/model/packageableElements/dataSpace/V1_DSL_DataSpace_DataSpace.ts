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

import { hashArray, type Hashable } from '@finos/legend-shared';
import { DATA_SPACE_HASH_STRUCTURE } from '../../../../../../../graph/DSL_DataSpace_HashUtils.js';
import {
  type V1_RawLambda,
  type V1_PackageableElementPointer,
  type V1_PackageableElementVisitor,
  type V1_StereotypePtr,
  type V1_TaggedValue,
  V1_PackageableElement,
  type V1_DataElementReference,
} from '@finos/legend-graph';

export class V1_DataSpaceExecutionContext implements Hashable {
  name!: string;
  title?: string | undefined;
  description?: string | undefined;
  mapping!: V1_PackageableElementPointer;
  defaultRuntime!: V1_PackageableElementPointer;
  testData: V1_DataElementReference | undefined;

  get hashCode(): string {
    return hashArray([
      DATA_SPACE_HASH_STRUCTURE.DATA_SPACE_EXECUTION_CONTEXT,
      this.name,
      this.title ?? '',
      this.description ?? '',
      this.mapping.path,
      this.defaultRuntime.path,
      this.testData ?? '',
    ]);
  }
}

export class V1_DataSpaceElementPointer implements Hashable {
  path!: string;
  exclude?: boolean | undefined;

  get hashCode(): string {
    return hashArray([
      DATA_SPACE_HASH_STRUCTURE.DATA_SPACE_ELEMENT_POINTER,
      this.path,
      this.exclude ?? '',
    ]);
  }
}

export abstract class V1_DataSpaceExecutable implements Hashable {
  id?: string;
  executionContextKey?: string | undefined;
  title!: string;
  description?: string | undefined;

  get hashCode(): string {
    return hashArray([
      DATA_SPACE_HASH_STRUCTURE.DATA_SPACE_EXECUTABLE,
      this.id,
      this.title,
      this.description ?? '',
      this.executionContextKey ?? '',
    ]);
  }
}

export class V1_DataSpacePackageableElementExecutable
  extends V1_DataSpaceExecutable
  implements Hashable
{
  executable!: V1_PackageableElementPointer;

  override get hashCode(): string {
    return hashArray([
      DATA_SPACE_HASH_STRUCTURE.DATA_SPACE_PACKAGEABLE_ELEMENT_EXECUTABLE,
      this.id,
      this.title,
      this.description ?? '',
      this.executionContextKey ?? '',
      this.executable.path,
    ]);
  }
}

export class V1_DataSpaceTemplateExecutable
  extends V1_DataSpaceExecutable
  implements Hashable
{
  query!: V1_RawLambda;

  override get hashCode(): string {
    return hashArray([
      DATA_SPACE_HASH_STRUCTURE.DATA_SPACE_TEMPLATE_EXECUTABLE,
      this.id,
      this.title,
      this.description ?? '',
      this.query,
      this.executionContextKey ?? '',
    ]);
  }
}

export class V1_DataSpaceDiagram implements Hashable {
  title!: string;
  description?: string | undefined;
  diagram!: V1_PackageableElementPointer;

  get hashCode(): string {
    return hashArray([
      DATA_SPACE_HASH_STRUCTURE.DATA_SPACE_DIAGRAM,
      this.title,
      this.description ?? '',
      this.diagram.path,
    ]);
  }
}

export abstract class V1_DataSpaceSupportInfo implements Hashable {
  documentationUrl?: string | undefined;

  abstract get hashCode(): string;
}

export class V1_DataSpaceSupportEmail
  extends V1_DataSpaceSupportInfo
  implements Hashable
{
  address!: string;

  get hashCode(): string {
    return hashArray([
      DATA_SPACE_HASH_STRUCTURE.DATA_SPACE_SUPPORT_EMAIL,
      this.documentationUrl ?? '',
      this.address,
    ]);
  }
}

export class V1_DataSpaceSupportCombinedInfo
  extends V1_DataSpaceSupportInfo
  implements Hashable
{
  emails?: string[] | undefined;
  website?: string | undefined;
  faqUrl?: string | undefined;
  supportUrl?: string | undefined;

  get hashCode(): string {
    return hashArray([
      DATA_SPACE_HASH_STRUCTURE.DATA_SPACE_SUPPORT_COMBINED_INFO,
      this.documentationUrl ?? '',
      hashArray(this.emails ?? []),
      this.website ?? '',
      this.faqUrl ?? '',
      this.supportUrl ?? '',
    ]);
  }
}

export class V1_DataSpace extends V1_PackageableElement implements Hashable {
  stereotypes: V1_StereotypePtr[] = [];
  taggedValues: V1_TaggedValue[] = [];
  title?: string | undefined;
  description?: string | undefined;
  executionContexts!: V1_DataSpaceExecutionContext[];
  defaultExecutionContext!: string;
  elements?: V1_DataSpaceElementPointer[] | undefined;
  executables?: V1_DataSpaceExecutable[] | undefined;
  diagrams?: V1_DataSpaceDiagram[] | undefined;
  supportInfo?: V1_DataSpaceSupportInfo | undefined;

  override get hashCode(): string {
    return hashArray([
      DATA_SPACE_HASH_STRUCTURE.DATA_SPACE,
      hashArray(this.stereotypes),
      hashArray(this.taggedValues),
      this.title ?? '',
      this.description ?? '',
      hashArray(this.executionContexts),
      this.defaultExecutionContext,
      hashArray(this.elements ?? []),
      hashArray(this.executables ?? []),
      hashArray(this.diagrams ?? []),
      this.supportInfo ?? '',
    ]);
  }

  accept_PackageableElementVisitor<T>(
    visitor: V1_PackageableElementVisitor<T>,
  ): T {
    return visitor.visit_PackageableElement(this);
  }
}
