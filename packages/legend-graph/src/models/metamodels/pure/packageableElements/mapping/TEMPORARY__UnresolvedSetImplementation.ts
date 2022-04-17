import { Class } from '../domain/Class';
import { PackageableElementExplicitReference } from '../PackageableElementReference';
import { InferableMappingElementIdExplicitValue } from './InferableMappingElementId';
import { InferableMappingElementRootExplicitValue } from './InferableMappingElementRoot';
import type { Mapping } from './Mapping';
import {
  SetImplementation,
  type SetImplementationVisitor,
} from './SetImplementation';

/* @MARKER: RELAXED GRAPH CHECK - See https://github.com/finos/legend-studio/issues/941 */
/**
 * When set implementation cannot be resolved by ID,
 * we try to avoid failing graph building for now
 * instead, we will leave this loose end unresolved.
 *
 * NOTE: this is just a temporary solutions until we make this a hard-fail post migration.
 *
 * See https://github.com/finos/legend-studio/issues/880
 * See https://github.com/finos/legend-studio/issues/941
 */
export class TEMPORARY__UnresolvedSetImplementation extends SetImplementation {
  constructor(id: string, parent: Mapping) {
    super(
      InferableMappingElementIdExplicitValue.create(id, ''),
      parent,
      PackageableElementExplicitReference.create(new Class('')),
      InferableMappingElementRootExplicitValue.create(false),
    );
  }

  accept_SetImplementationVisitor<T>(visitor: SetImplementationVisitor<T>): T {
    return visitor.visit_TEMPORARY__UnresolvedSetImplementation(this);
  }
}
