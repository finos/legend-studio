/**
 * Copyright 2020 Goldman Sachs
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
  UnsupportedOperationError,
  assertNonNullable,
  assertNonEmptyString,
  guaranteeType,
  guaranteeNonNullable,
} from '@finos/legend-studio-shared';
import { CORE_LOG_EVENT } from '../../../../../../../utils/Logger';
import { GraphError } from '../../../../../../MetaModelUtility';
import type { PropertyMapping } from '../../../../../../metamodels/pure/model/packageableElements/mapping/PropertyMapping';
import { PurePropertyMapping } from '../../../../../../metamodels/pure/model/packageableElements/store/modelToModel/mapping/PurePropertyMapping';
import { RelationalPropertyMapping } from '../../../../../../metamodels/pure/model/packageableElements/store/relational/mapping/RelationalPropertyMapping';
import type { InstanceSetImplementation } from '../../../../../../metamodels/pure/model/packageableElements/mapping/InstanceSetImplementation';
import type { PropertyMappingsImplementation } from '../../../../../../metamodels/pure/model/packageableElements/mapping/PropertyMappingsImplementation';
import { EmbeddedFlatDataPropertyMapping } from '../../../../../../metamodels/pure/model/packageableElements/store/flatData/mapping/EmbeddedFlatDataPropertyMapping';
import { FlatDataPropertyMapping } from '../../../../../../metamodels/pure/model/packageableElements/store/flatData/mapping/FlatDataPropertyMapping';
import type { EnumerationMapping } from '../../../../../../metamodels/pure/model/packageableElements/mapping/EnumerationMapping';
import type { SetImplementation } from '../../../../../../metamodels/pure/model/packageableElements/mapping/SetImplementation';
import { RawLambda } from '../../../../../../metamodels/pure/model/rawValueSpecification/RawLambda';
import { Class } from '../../../../../../metamodels/pure/model/packageableElements/domain/Class';
import type { Association } from '../../../../../../metamodels/pure/model/packageableElements/domain/Association';
import type { TableAlias } from '../../../../../../metamodels/pure/model/packageableElements/store/relational/model/RelationalOperationElement';
import { InferableMappingElementIdExplicitValue } from '../../../../../../metamodels/pure/model/packageableElements/mapping/InferableMappingElementId';
import type { PackageableElementReference } from '../../../../../../metamodels/pure/model/packageableElements/PackageableElementReference';
import { PackageableElementExplicitReference } from '../../../../../../metamodels/pure/model/packageableElements/PackageableElementReference';
import { PropertyExplicitReference } from '../../../../../../metamodels/pure/model/packageableElements/domain/PropertyReference';
import { RootRelationalInstanceSetImplementation } from '../../../../../../metamodels/pure/model/packageableElements/store/relational/mapping/RootRelationalInstanceSetImplementation';
import { OtherwiseEmbeddedRelationalInstanceSetImplementation } from '../../../../../../metamodels/pure/model/packageableElements/store/relational/mapping/OtherwiseEmbeddedRelationalInstanceSetImplementation';
import { EmbeddedRelationalInstanceSetImplementation } from '../../../../../../metamodels/pure/model/packageableElements/store/relational/mapping/EmbeddedRelationalInstanceSetImplementation';
import { InlineEmbeddedRelationalInstanceSetImplementation } from '../../../../../../metamodels/pure/model/packageableElements/store/relational/mapping/InlineEmbeddedRelationalInstanceSetImplementation';
import { AssociationImplementation } from '../../../../../../metamodels/pure/model/packageableElements/mapping/AssociationImplementation';
import type { V1_GraphBuilderContext } from '../../../transformation/pureGraph/to/V1_GraphBuilderContext';
import type {
  V1_PropertyMapping,
  V1_PropertyMappingVisitor,
} from '../../../model/packageableElements/mapping/V1_PropertyMapping';
import type { V1_PurePropertyMapping } from '../../../model/packageableElements/store/modelToModel/mapping/V1_PurePropertyMapping';
import type { V1_InlineEmbeddedPropertyMapping } from '../../../model/packageableElements/store/relational/mapping/V1_InlineEmbeddedPropertyMapping';
import type { V1_AggregationAwarePropertyMapping } from '../../../model/packageableElements/store/relational/mapping/aggregationAware/V1_AggregationAwarePropertyMapping';
import type { V1_RelationalPropertyMapping } from '../../../model/packageableElements/store/relational/mapping/V1_RelationalPropertyMapping';
import type { V1_EmbeddedFlatDataPropertyMapping } from '../../../model/packageableElements/store/flatData/mapping/V1_EmbeddedFlatDataPropertyMapping';
import type { V1_FlatDataPropertyMapping } from '../../../model/packageableElements/store/flatData/mapping/V1_FlatDataPropertyMapping';
import type { V1_OtherwiseEmbeddedRelationalPropertyMapping } from '../../../model/packageableElements/store/relational/mapping/V1_OtherwiseEmbeddedRelationalPropertyMapping';
import type { V1_EmbeddedRelationalPropertyMapping } from '../../../model/packageableElements/store/relational/mapping/V1_EmbeddedRelationalPropertyMapping';
import { V1_processRelationalOperationElement } from '../../../transformation/pureGraph/to/helpers/V1_DatabaseBuilderHelper';
import { V1_processEmbeddedRelationalMappingProperties } from '../../../transformation/pureGraph/to/helpers/V1_RelationalPropertyMappingBuilder';

const resolveRelationalPropertyMappingSource = (
  immediateParent: PropertyMappingsImplementation,
  value: V1_PropertyMapping,
  topParent: InstanceSetImplementation | undefined,
): SetImplementation | undefined => {
  if (immediateParent instanceof AssociationImplementation) {
    if (value.source) {
      return immediateParent.parent.getClassMapping(value.source);
    }
    const property = immediateParent.association.value.getProperty(
      value.property.property,
    );
    const _class = immediateParent.association.value.getPropertyAssociatedClass(
      property,
    );
    const setImpls = immediateParent.parent.classMappingsByClass(_class);
    return setImpls.find((r) => r.root.value) ?? setImpls[0];
  }
  return topParent;
};

export class V1_ProtocolToMetaModelPropertyMappingVisitor
  implements V1_PropertyMappingVisitor<PropertyMapping> {
  private context: V1_GraphBuilderContext;
  private immediateParent: PropertyMappingsImplementation; // either root instance set implementation or the immediate embedded parent property mapping (needed for processing embedded property mapping)
  private topParent: InstanceSetImplementation | undefined;
  private allEnumerationMappings: EnumerationMapping[] = [];
  private tableAliasMap: Map<string, TableAlias>;

  constructor(
    context: V1_GraphBuilderContext,
    immediateParent: PropertyMappingsImplementation,
    topParent: InstanceSetImplementation | undefined,
    allEnumerationMappings: EnumerationMapping[],
    tabliaAliasMap?: Map<string, TableAlias>,
  ) {
    this.context = context;
    this.immediateParent = immediateParent;
    this.topParent = topParent;
    this.allEnumerationMappings = allEnumerationMappings;
    this.tableAliasMap = tabliaAliasMap ?? new Map<string, TableAlias>();
  }

  visit_PurePropertyMapping(
    propertyMapping: V1_PurePropertyMapping,
  ): PropertyMapping {
    assertNonNullable(
      propertyMapping.property,
      'Model-to-model property mapping property is missing',
    );
    assertNonEmptyString(
      propertyMapping.property.class,
      'Model-to-model property mapping property class is missing',
    );
    assertNonEmptyString(
      propertyMapping.property.property,
      'Model-to-model property mapping property name is missing',
    );
    assertNonNullable(
      propertyMapping.transform,
      'Model-to-model property mapping transform lambda is missing',
    );
    // NOTE: mapping for derived property is not supported
    const property = this.context.resolveProperty(propertyMapping.property);
    const propertyType = property.value.genericType.value.rawType;
    let targetSetImplementation: SetImplementation | undefined;
    const topParent = guaranteeNonNullable(this.topParent);
    if (propertyType instanceof Class) {
      if (propertyMapping.target) {
        targetSetImplementation = topParent.parent.getClassMapping(
          propertyMapping.target,
        );
      } else {
        /* @MARKER: ACTION ANALYTICS */
        // NOTE: if no there is one non-root class mapping, auto-nominate that as the target set implementation
        const setImplementation = topParent.parent.classMappingsByClass(
          guaranteeType(propertyType, Class),
        )[0];
        targetSetImplementation = guaranteeNonNullable(
          setImplementation,
          `Can't find any class mapping for class '${propertyType.path}' in mapping '${topParent.parent.path}'`,
        );
      }
    }
    const purePropertyMapping = new PurePropertyMapping(
      topParent,
      property,
      new RawLambda([], propertyMapping.transform.body),
      topParent,
      targetSetImplementation,
      propertyMapping.explodeProperty,
    );
    if (propertyMapping.enumMappingId) {
      const enumerationMapping = this.allEnumerationMappings.find(
        (em) => em.id.value === propertyMapping.enumMappingId,
      );
      if (!enumerationMapping) {
        // TODO: Since we don't support includedMappings, this will throw errors, but right now we can just make it undefined.
        this.context.logger.debug(
          CORE_LOG_EVENT.GRAPH_PROBLEM,
          `Can't find enumeration mapping with ID '${propertyMapping.enumMappingId}' in mapping '${topParent.parent.path}' (perhaps because we haven't supported included mappings)`,
        );
      }
      purePropertyMapping.transformer = enumerationMapping;
    }
    return purePropertyMapping;
  }

  visit_FlatDataPropertyMapping(
    propertyMapping: V1_FlatDataPropertyMapping,
  ): PropertyMapping {
    assertNonNullable(
      propertyMapping.property,
      'Flat-data property mapping property is missing',
    );
    assertNonEmptyString(
      propertyMapping.property.property,
      'Flat-data property mapping property name is missing',
    );
    assertNonNullable(
      propertyMapping.transform,
      'Flat-data property mapping transform lambda is missing',
    );
    // NOTE: there are cases that property pointer class might be missing, such as when we transform grammar to JSON
    // since we do not do look up, due to nesting structure introudced by embedded mappings, we might not have the class information
    // as such, here we have to resolve the class being mapped depending on where the property mapping is in the class mapping
    let propertyOwnerClass: Class;
    if (propertyMapping.property.class) {
      propertyOwnerClass = this.context.resolveClass(
        propertyMapping.property.class,
      ).value;
    } else if (
      this.immediateParent instanceof EmbeddedFlatDataPropertyMapping
    ) {
      propertyOwnerClass = this.immediateParent.class.value;
    } else {
      throw new GraphError(
        `Can't find property owner class for property '${propertyMapping.property.property}'`,
      );
    }
    // NOTE: mapping for derived property is not supported
    const property = propertyOwnerClass.getProperty(
      propertyMapping.property.property,
    );
    const sourceSetImplementation = guaranteeNonNullable(
      this.immediateParent instanceof EmbeddedFlatDataPropertyMapping
        ? this.immediateParent
        : this.topParent,
    );
    // target
    let targetSetImplementation: SetImplementation | undefined;
    const propertyType = property.genericType.value.rawType;
    if (propertyType instanceof Class && propertyMapping.target) {
      targetSetImplementation = this.topParent?.parent.getClassMapping(
        propertyMapping.target,
      );
    }
    const flatDataPropertyMapping = new FlatDataPropertyMapping(
      this.immediateParent,
      PropertyExplicitReference.create(property),
      new RawLambda([], propertyMapping.transform.body),
      sourceSetImplementation,
      targetSetImplementation,
    );
    if (propertyMapping.enumMappingId) {
      const enumerationMapping = this.allEnumerationMappings.find(
        (em) => em.id.value === propertyMapping.enumMappingId,
      );
      if (!enumerationMapping) {
        // TODO: Since we don't support includedMappings, this will throw errors, but right now we can just make it undefined.
        this.context.logger.debug(
          CORE_LOG_EVENT.GRAPH_PROBLEM,
          `Can't find enumeration mapping with ID '${propertyMapping.enumMappingId}' in mapping '${this.topParent?.parent.path} (perhaps because we haven't supported included mappings)`,
        );
      }
      flatDataPropertyMapping.transformer = enumerationMapping;
    }
    return flatDataPropertyMapping;
  }

  visit_EmbeddedFlatDataPropertyMapping(
    propertyMapping: V1_EmbeddedFlatDataPropertyMapping,
  ): PropertyMapping {
    assertNonNullable(
      propertyMapping.property,
      'Flat-data property mapping property is missing',
    );
    assertNonEmptyString(
      propertyMapping.property.property,
      'Flat-data property mapping property name is missing',
    );
    // NOTE: there are cases that property pointer class might be missing, such as when we transform grammar to JSON
    // since we do not do look up, due to nesting structure introudced by embedded mappings, we might not have the class information
    // as such, here we have to resolve the class being mapped depending on where the property mapping is in the class mapping
    let propertyOwnerClass: Class;
    if (propertyMapping.property.class) {
      propertyOwnerClass = this.context.resolveClass(
        propertyMapping.property.class,
      ).value;
    } else if (
      this.immediateParent instanceof EmbeddedFlatDataPropertyMapping
    ) {
      propertyOwnerClass = this.immediateParent.class.value;
    } else {
      throw new GraphError(
        `Can't find property owner class for property '${propertyMapping.property.property}'`,
      );
    }
    const property = propertyOwnerClass.getProperty(
      propertyMapping.property.property,
    );
    let _class: PackageableElementReference<Class>;
    if (propertyMapping.class) {
      _class = this.context.resolveClass(propertyMapping.class);
    } else {
      const propertyType = property.genericType.value.rawType;
      const complexClass = guaranteeType(
        propertyType,
        Class,
        'Only complex classes can be the target of an embedded property mapping',
      );
      _class = PackageableElementExplicitReference.create(complexClass);
    }
    const sourceSetImplementation = guaranteeNonNullable(
      this.immediateParent instanceof EmbeddedFlatDataPropertyMapping
        ? this.immediateParent
        : this.topParent,
    );
    const embeddedPropertyMapping = new EmbeddedFlatDataPropertyMapping(
      this.immediateParent,
      PropertyExplicitReference.create(property),
      guaranteeNonNullable(this.topParent),
      sourceSetImplementation,
      _class,
      InferableMappingElementIdExplicitValue.create(
        `${sourceSetImplementation.id.value}.${property.name}`,
        '',
      ),
      undefined,
    );
    embeddedPropertyMapping.targetSetImplementation = embeddedPropertyMapping;
    embeddedPropertyMapping.propertyMappings = propertyMapping.propertyMappings.map(
      (propertyMapping) =>
        propertyMapping.accept_PropertyMappingVisitor(
          new V1_ProtocolToMetaModelPropertyMappingVisitor(
            this.context,
            embeddedPropertyMapping,
            this.topParent,
            this.allEnumerationMappings,
          ),
        ),
    );
    return embeddedPropertyMapping;
  }

  visit_RelationalPropertyMapping(
    propertyMapping: V1_RelationalPropertyMapping,
  ): PropertyMapping {
    assertNonNullable(
      propertyMapping.property,
      'Relational property mapping property is missing',
    );
    assertNonEmptyString(
      propertyMapping.property.property,
      'Relational property mapping property name is missing',
    );
    assertNonNullable(
      propertyMapping.relationalOperation,
      'Relational property mapping operation is missing',
    );
    if (propertyMapping.localMappingProperty) {
      throw new UnsupportedOperationError(
        'Local mapping property is not supported',
      );
    }
    // NOTE: mapping for derived property is not supported
    let propertyOwner: Class | Association;
    if (this.immediateParent instanceof AssociationImplementation) {
      propertyOwner = this.immediateParent.association.value;
    } else if (propertyMapping.property.class) {
      propertyOwner = this.context.resolveClass(propertyMapping.property.class)
        .value;
    } else if (
      this.immediateParent instanceof
      EmbeddedRelationalInstanceSetImplementation
    ) {
      propertyOwner = this.immediateParent.class.value;
    } else {
      throw new GraphError(
        `Can't find property owner class for property '${propertyMapping.property.property}'`,
      );
    }
    // NOTE: mapping for derived property is not supported
    const property = propertyOwner.getProperty(
      propertyMapping.property.property,
    );
    const operation = V1_processRelationalOperationElement(
      propertyMapping.relationalOperation,
      this.context,
      this.tableAliasMap,
      [],
    );
    // since we are not doing embedded property mappings yet, the target must have already been added to the mapping
    const propertyType = property.genericType.value.rawType;
    let targetSetImplementation: SetImplementation | undefined;
    if (propertyType instanceof Class) {
      let parentMapping = this.topParent?.parent;
      if (
        !parentMapping &&
        this.immediateParent instanceof AssociationImplementation
      ) {
        parentMapping = this.immediateParent.parent;
      }
      if (propertyMapping.target) {
        targetSetImplementation = parentMapping?.getClassMapping(
          propertyMapping.target,
        );
      } else {
        targetSetImplementation = parentMapping?.classMappingsByClass(
          guaranteeType(propertyType, Class),
        )[0];
      }
    }
    const sourceSetImplementation = guaranteeNonNullable(
      resolveRelationalPropertyMappingSource(
        this.immediateParent,
        propertyMapping,
        this.topParent,
      ),
    );
    const relationalPropertyMapping = new RelationalPropertyMapping(
      this.topParent ?? this.immediateParent,
      PropertyExplicitReference.create(property),
      operation,
      sourceSetImplementation,
      targetSetImplementation,
    );
    if (propertyMapping.enumMappingId) {
      const enumerationMapping = this.allEnumerationMappings.find(
        (enumerationMapping) =>
          enumerationMapping.id.value === propertyMapping.enumMappingId,
      );
      if (!enumerationMapping) {
        // TODO: Since we don't support includedMappings, this will throw errors, but right now we can just make it undefined.
        this.context.logger.debug(
          CORE_LOG_EVENT.GRAPH_PROBLEM,
          `Can't find enumeration mapping with ID '${propertyMapping.enumMappingId}' in mapping '${this.topParent?.parent.path}' (perhaps because we haven't supported included mappings)`,
        );
      }
      relationalPropertyMapping.transformer = enumerationMapping;
    }
    return relationalPropertyMapping;
  }

  visit_InlineEmbeddedPropertyMapping(
    propertyMapping: V1_InlineEmbeddedPropertyMapping,
  ): PropertyMapping {
    assertNonNullable(
      propertyMapping.property,
      'Embedded Relational property mapping property is missing',
    );
    assertNonEmptyString(
      propertyMapping.property.property,
      'Embedded property mapping property name is missing',
    );
    let propertyOwnerClass: Class;
    if (propertyMapping.property.class) {
      propertyOwnerClass = this.context.resolveClass(
        propertyMapping.property.class,
      ).value;
    } else if (
      this.immediateParent instanceof RootRelationalInstanceSetImplementation ||
      this.immediateParent instanceof
        EmbeddedRelationalInstanceSetImplementation
    ) {
      propertyOwnerClass = this.immediateParent.class.value;
    } else {
      throw new GraphError(
        `Can't find property owner class for property '${propertyMapping.property.property}'`,
      );
    }
    const property = propertyOwnerClass.getProperty(
      propertyMapping.property.property,
    );
    const propertyType = property.genericType.value.rawType;
    const complexClass = guaranteeType(
      propertyType,
      Class,
      'Only complex classes can be the target of an embedded property mapping',
    );
    const _class = PackageableElementExplicitReference.create(complexClass);
    const id = `${this.immediateParent.id}_${property.name}`;
    const topParent = guaranteeNonNullable(this.topParent);
    const sourceSetImplementation =
      this.immediateParent instanceof RootRelationalInstanceSetImplementation
        ? this.immediateParent
        : topParent;
    const inline = new InlineEmbeddedRelationalInstanceSetImplementation(
      this.immediateParent,
      PropertyExplicitReference.create(property),
      guaranteeType(this.topParent, RootRelationalInstanceSetImplementation),
      sourceSetImplementation,
      _class,
      InferableMappingElementIdExplicitValue.create(id, ''),
    );
    inline.inlineSetImplementation = topParent.parent.getClassMapping(
      propertyMapping.setImplementationId,
    );
    return inline;
  }

  visit_EmbeddedRelationalPropertyMapping(
    propertyMapping: V1_EmbeddedRelationalPropertyMapping,
  ): PropertyMapping {
    assertNonNullable(
      propertyMapping.property,
      'Embedded Relational property mapping property is missing',
    );
    assertNonEmptyString(
      propertyMapping.property.property,
      'Embedded property mapping property name is missing',
    );
    const properties = V1_processEmbeddedRelationalMappingProperties(
      propertyMapping,
      this.immediateParent,
      guaranteeNonNullable(this.topParent),
      this.context,
    );
    const embedded = new EmbeddedRelationalInstanceSetImplementation(
      this.immediateParent,
      PropertyExplicitReference.create(properties.property),
      guaranteeType(this.topParent, RootRelationalInstanceSetImplementation),
      properties.sourceSetImplementation,
      properties._class,
      InferableMappingElementIdExplicitValue.create(
        `${properties.id.value}`,
        '',
      ),
    );
    embedded.primaryKey = propertyMapping.classMapping.primaryKey.map((key) =>
      V1_processRelationalOperationElement(
        key,
        this.context,
        this.tableAliasMap,
        [],
      ),
    );
    embedded.propertyMappings = propertyMapping.classMapping.propertyMappings.map(
      (propertyMapping) =>
        propertyMapping.accept_PropertyMappingVisitor(
          new V1_ProtocolToMetaModelPropertyMappingVisitor(
            this.context,
            embedded,
            this.topParent,
            this.topParent?.parent.enumerationMappings ?? [],
            this.tableAliasMap,
          ),
        ),
    ) as RelationalPropertyMapping[];
    return embedded;
  }

  visit_OtherwiseEmbeddedRelationalPropertyMapping(
    propertyMapping: V1_OtherwiseEmbeddedRelationalPropertyMapping,
  ): PropertyMapping {
    assertNonNullable(
      propertyMapping.property,
      'Otherwise Embedded Relational property mapping property is missing',
    );
    assertNonEmptyString(
      propertyMapping.property.property,
      'Otherwise Embedded property mapping property name is missing',
    );
    const properties = V1_processEmbeddedRelationalMappingProperties(
      propertyMapping,
      this.immediateParent,
      guaranteeNonNullable(this.topParent),
      this.context,
    );
    const otherwiseEmbedded = new OtherwiseEmbeddedRelationalInstanceSetImplementation(
      this.immediateParent,
      PropertyExplicitReference.create(properties.property),
      guaranteeType(this.topParent, RootRelationalInstanceSetImplementation),
      properties.sourceSetImplementation,
      properties._class,
      InferableMappingElementIdExplicitValue.create(
        `${properties.id.value}`,
        '',
      ),
    );
    otherwiseEmbedded.primaryKey = propertyMapping.classMapping.primaryKey.map(
      (key) =>
        V1_processRelationalOperationElement(
          key,
          this.context,
          this.tableAliasMap,
          [],
        ),
    );
    otherwiseEmbedded.propertyMappings = propertyMapping.classMapping.propertyMappings.map(
      (propertyMapping) =>
        propertyMapping.accept_PropertyMappingVisitor(
          new V1_ProtocolToMetaModelPropertyMappingVisitor(
            this.context,
            otherwiseEmbedded,
            this.topParent,
            this.topParent?.parent.enumerationMappings ?? [],
            this.tableAliasMap,
          ),
        ),
    ) as RelationalPropertyMapping[];
    otherwiseEmbedded.otherwisePropertyMapping = guaranteeType(
      propertyMapping.otherwisePropertyMapping.accept_PropertyMappingVisitor(
        new V1_ProtocolToMetaModelPropertyMappingVisitor(
          this.context,
          otherwiseEmbedded,
          this.topParent,
          this.topParent?.parent.enumerationMappings ?? [],
          this.tableAliasMap,
        ),
      ),
      RelationalPropertyMapping,
    );
    return otherwiseEmbedded;
  }

  visit_AggregationAwarePropertyMapping(
    propertyMapping: V1_AggregationAwarePropertyMapping,
  ): PropertyMapping {
    throw new UnsupportedOperationError();
  }
}
