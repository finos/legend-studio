import {
  PackageableElement,
  PackageableElementVisitor,
} from '@finos/legend-graph';
import type { Hashable } from '@finos/legend-shared';

export class PersistencePipe extends PackageableElement implements Hashable {
  documentation!: string;
  owners: string[] = [];
  trigger!: Trigger;

  accept_PackageableElementVisitor<T>(
    visitor: PackageableElementVisitor<T>,
  ): T {
    return visitor.visit_PackageableElement(this);
  }
}

export abstract class Trigger implements Hashable {
  private readonly _$nominalTypeBrand!: 'Trigger';

  abstract get hashCode(): string;
}
