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
import {
  PackageableElement,
  type PackageableElementReference,
  type Mapping,
  type PackageableRuntime,
  type PackageableElementVisitor,
  type Class,
  type Enumeration,
  type Association,
} from '@finos/legend-graph';
import { DATA_SPACE_HASH_STRUCTURE } from '../../../../../DSL_DataSpace_HashUtils.js';
import type { Diagram } from '@finos/legend-extension-dsl-diagram';

export abstract class DataSpaceSupportInfo implements Hashable {
  documentationUrl?: string | undefined;

  abstract get hashCode(): string;
}

export class DataSpaceSupportEmail
  extends DataSpaceSupportInfo
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

export class DataSpaceSupportCombinedInfo
  extends DataSpaceSupportInfo
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

export class DataSpaceExecutionContext implements Hashable {
  name!: string;
  title?: string | undefined;
  description?: string | undefined;
  mapping!: PackageableElementReference<Mapping>;
  defaultRuntime!: PackageableElementReference<PackageableRuntime>;

  get hashCode(): string {
    return hashArray([
      DATA_SPACE_HASH_STRUCTURE.DATA_SPACE_EXECUTION_CONTEXT,
      this.name,
      this.title ?? '',
      this.description ?? '',
      this.mapping.valueForSerialization ?? '',
      this.defaultRuntime.valueForSerialization ?? '',
    ]);
  }
}

export class DataSpaceExecutable implements Hashable {
  title!: string;
  description?: string | undefined;
  executable!: PackageableElementReference<PackageableElement>;

  get hashCode(): string {
    return hashArray([
      DATA_SPACE_HASH_STRUCTURE.DATA_SPACE_EXECUTABLE,
      this.title,
      this.description ?? '',
      this.executable.valueForSerialization ?? '',
    ]);
  }
}

export class DataSpaceDiagram implements Hashable {
  title!: string;
  description?: string | undefined;
  diagram!: PackageableElementReference<Diagram>;

  get hashCode(): string {
    return hashArray([
      DATA_SPACE_HASH_STRUCTURE.DATA_SPACE_DIAGRAM,
      this.title,
      this.description ?? '',
      this.diagram.valueForSerialization ?? '',
    ]);
  }
}

export type DataSpaceElement = Class | Enumeration | Association;

export class DataSpace extends PackageableElement implements Hashable {
  title?: string | undefined;
  description?: string | undefined;
  executionContexts: DataSpaceExecutionContext[] = [];
  defaultExecutionContext!: DataSpaceExecutionContext;
  featuredDiagrams?: PackageableElementReference<Diagram>[] | undefined;
  elements?: PackageableElementReference<DataSpaceElement>[] | undefined;
  executables?: DataSpaceExecutable[] | undefined;
  diagrams?: DataSpaceDiagram[] | undefined;
  supportInfo?: DataSpaceSupportInfo | undefined;

  protected override get _elementHashCode(): string {
    return hashArray([
      DATA_SPACE_HASH_STRUCTURE.DATA_SPACE,
      hashArray(
        this.stereotypes.map((stereotype) => stereotype.pointerHashCode),
      ),
      hashArray(this.taggedValues),
      this.title ?? '',
      this.description ?? '',
      hashArray(this.executionContexts),
      this.defaultExecutionContext.name,
      hashArray(
        (this.featuredDiagrams ?? []).map(
          (diagram) => diagram.valueForSerialization ?? '',
        ),
      ),
      hashArray(
        (this.elements ?? []).map(
          (element) => element.valueForSerialization ?? '',
        ),
      ),
      hashArray(this.executables ?? []),
      hashArray(this.diagrams ?? []),
      this.supportInfo ?? '',
    ]);
  }

  accept_PackageableElementVisitor<T>(
    visitor: PackageableElementVisitor<T>,
  ): T {
    return visitor.visit_PackageableElement(this);
  }
}
