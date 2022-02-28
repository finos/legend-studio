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
  LogEvent,
  assertNonNullable,
  assertNonEmptyString,
  guaranteeType,
  guaranteeNonNullable,
  returnUndefOnError,
} from '@finos/legend-shared';
import { GRAPH_MANAGER_LOG_EVENT } from '../../../../../../../graphManager/GraphManagerLogEvent';
import type { PropertyMapping } from '../../../../../../metamodels/pure/packageableElements/mapping/PropertyMapping';
import { PurePropertyMapping } from '../../../../../../metamodels/pure/packageableElements/store/modelToModel/mapping/PurePropertyMapping';
import { RelationalPropertyMapping } from '../../../../../../metamodels/pure/packageableElements/store/relational/mapping/RelationalPropertyMapping';
import type { InstanceSetImplementation } from '../../../../../../metamodels/pure/packageableElements/mapping/InstanceSetImplementation';
import type { PropertyMappingsImplementation } from '../../../../../../metamodels/pure/packageableElements/mapping/PropertyMappingsImplementation';
import { EmbeddedFlatDataPropertyMapping } from '../../../../../../metamodels/pure/packageableElements/store/flatData/mapping/EmbeddedFlatDataPropertyMapping';
import { FlatDataPropertyMapping } from '../../../../../../metamodels/pure/packageableElements/store/flatData/mapping/FlatDataPropertyMapping';
import type { EnumerationMapping } from '../../../../../../metamodels/pure/packageableElements/mapping/EnumerationMapping';
import {
  TEMPORARY__UnresolvedSetImplementation,
  type SetImplementation,
} from '../../../../../../metamodels/pure/packageableElements/mapping/SetImplementation';
import { Class } from '../../../../../../metamodels/pure/packageableElements/domain/Class';
import type { Association } from '../../../../../../metamodels/pure/packageableElements/domain/Association';
import type { TableAlias } from '../../../../../../metamodels/pure/packageableElements/store/relational/model/RelationalOperationElement';
import { InferableMappingElementIdExplicitValue } from '../../../../../../metamodels/pure/packageableElements/mapping/InferableMappingElementId';
import {
  type PackageableElementReference,
  PackageableElementImplicitReference,
} from '../../../../../../metamodels/pure/packageableElements/PackageableElementReference';
import {
  type PropertyReference,
  PropertyImplicitReference,
} from '../../../../../../metamodels/pure/packageableElements/domain/PropertyReference';
import { RootRelationalInstanceSetImplementation } from '../../../../../../metamodels/pure/packageableElements/store/relational/mapping/RootRelationalInstanceSetImplementation';
import { OtherwiseEmbeddedRelationalInstanceSetImplementation } from '../../../../../../metamodels/pure/packageableElements/store/relational/mapping/OtherwiseEmbeddedRelationalInstanceSetImplementation';
import { EmbeddedRelationalInstanceSetImplementation } from '../../../../../../metamodels/pure/packageableElements/store/relational/mapping/EmbeddedRelationalInstanceSetImplementation';
import { InlineEmbeddedRelationalInstanceSetImplementation } from '../../../../../../metamodels/pure/packageableElements/store/relational/mapping/InlineEmbeddedRelationalInstanceSetImplementation';
import { AssociationImplementation } from '../../../../../../metamodels/pure/packageableElements/mapping/AssociationImplementation';
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
import { V1_buildRelationalOperationElement } from '../../../transformation/pureGraph/to/helpers/V1_DatabaseBuilderHelper';
import { V1_buildEmbeddedRelationalMappingProperty } from '../../../transformation/pureGraph/to/helpers/V1_RelationalPropertyMappingBuilder';
import type { V1_XStorePropertyMapping } from '../../../model/packageableElements/mapping/xStore/V1_XStorePropertyMapping';
import { XStorePropertyMapping } from '../../../../../../metamodels/pure/packageableElements/mapping/xStore/XStorePropertyMapping';
import type { XStoreAssociationImplementation } from '../../../../../../metamodels/pure/packageableElements/mapping/xStore/XStoreAssociationImplementation';
import { Property } from '../../../../../../metamodels/pure/packageableElements/domain/Property';
import { MappingClass } from '../../../../../../metamodels/pure/packageableElements/mapping/MappingClass';
import { LocalMappingPropertyInfo } from '../../../../../../metamodels/pure/packageableElements/mapping/LocalMappingPropertyInfo';
import type { AggregationAwareSetImplementation } from '../../../../../../metamodels/pure/packageableElements/mapping/aggregationAware/AggregationAwareSetImplementation';
import { AggregationAwarePropertyMapping } from '../../../../../../metamodels/pure/packageableElements/mapping/aggregationAware/AggregationAwarePropertyMapping';
import { V1_resolvePathsInRawLambda } from './helpers/V1_ValueSpecificationPathResolver';
import {
  V1_deserializeRelationalOperationElement,
  V1_serializeRelationalOperationElement,
} from '../../pureProtocol/serializationHelpers/V1_DatabaseSerializationHelper';
import { V1_transformRelationalOperationElement } from '../from/V1_DatabaseTransformer';
import { V1_GraphTransformerContextBuilder } from '../from/V1_GraphTransformerContext';
import {
  getAllEnumerationMappings,
  getClassMappingById,
  getClassMappingsByClass,
} from '../../../../../../../helpers/MappingHelper';
import { GraphBuilderError } from '../../../../../../../graphManager/GraphManagerUtils';
import type { AbstractProperty } from '../../../../../../metamodels/pure/packageableElements/domain/AbstractProperty';
import type { Mapping } from '../../../../../../metamodels/pure/packageableElements/mapping/Mapping';

/* @MARKER: RELAXED GRAPH CHECK - See https://github.com/finos/legend-studio/issues/880 */
const TEMPORARY__getClassMappingByIdOrReturnUnresolved = (
  mapping: Mapping,
  id: string,
): SetImplementation =>
  returnUndefOnError(() => getClassMappingById(mapping, id)) ??
  new TEMPORARY__UnresolvedSetImplementation(id, mapping);

const resolveRelationalPropertyMappingSource = (
  immediateParent: PropertyMappingsImplementation,
  value: V1_PropertyMapping,
  topParent: InstanceSetImplementation | undefined,
): SetImplementation | undefined => {
  if (immediateParent instanceof AssociationImplementation) {
    if (value.source) {
      return TEMPORARY__getClassMappingByIdOrReturnUnresolved(
        immediateParent.parent,
        value.source,
      );
    }
    const property = immediateParent.association.value.getProperty(
      value.property.property,
    );
    const _class =
      immediateParent.association.value.getPropertyAssociatedClass(property);
    const setImpls = getClassMappingsByClass(immediateParent.parent, _class);
    return setImpls.find((r) => r.root.value) ?? setImpls[0];
  }
  return topParent;
};

export class V1_ProtocolToMetaModelPropertyMappingBuilder
  implements V1_PropertyMappingVisitor<PropertyMapping>
{
  private context: V1_GraphBuilderContext;
  private immediateParent: PropertyMappingsImplementation; // either root instance set implementation or the immediate embedded parent property mapping (needed for processing embedded property mapping)
  private topParent: InstanceSetImplementation | undefined;
  private allEnumerationMappings: EnumerationMapping[] = [];
  private tableAliasMap: Map<string, TableAlias>;
  private allClassMappings: SetImplementation[];
  private xStoreParent?: XStoreAssociationImplementation | undefined;
  private aggregationAwareParent?:
    | AggregationAwareSetImplementation
    | undefined;

  constructor(
    context: V1_GraphBuilderContext,
    immediateParent: PropertyMappingsImplementation,
    topParent: InstanceSetImplementation | undefined,
    allEnumerationMappings: EnumerationMapping[],
    tableAliasMap?: Map<string, TableAlias>,
    allClassMappings?: SetImplementation[],
    xStoreParent?: XStoreAssociationImplementation,
    aggregationAwareParent?: AggregationAwareSetImplementation,
  ) {
    this.context = context;
    this.immediateParent = immediateParent;
    this.topParent = topParent;
    this.allEnumerationMappings = allEnumerationMappings;
    this.tableAliasMap = tableAliasMap ?? new Map<string, TableAlias>();
    this.allClassMappings = allClassMappings ?? [];
    this.xStoreParent = xStoreParent;
    this.aggregationAwareParent = aggregationAwareParent;
  }

  visit_PurePropertyMapping(protocol: V1_PurePropertyMapping): PropertyMapping {
    assertNonNullable(
      protocol.property,
      `Pure instance property mapping 'property' field is missing`,
    );
    assertNonEmptyString(
      protocol.property.property,
      `Pure instance property mapping 'property.property' field is missing or empty`,
    );
    assertNonNullable(
      protocol.transform,
      `Pure instance property mapping 'transform' field is missing`,
    );
    // NOTE: mapping for derived property is not supported
    let property: PropertyReference;
    let localMapping: LocalMappingPropertyInfo | undefined;
    if (protocol.localMappingProperty) {
      const localMappingProperty = protocol.localMappingProperty;
      const mappingClass = new MappingClass(
        `${this.topParent?.parent.path}_${this.topParent?.id}${protocol.property.property}`,
      );
      const _multiplicity = this.context.graph.getMultiplicity(
        localMappingProperty.multiplicity.lowerBound,
        localMappingProperty.multiplicity.upperBound,
      );
      const _property = new Property(
        protocol.property.property,
        _multiplicity,
        this.context.resolveGenericType(localMappingProperty.type),
        mappingClass,
      );
      property = PropertyImplicitReference.create(
        PackageableElementImplicitReference.create(
          mappingClass,
          protocol.property.class,
        ),
        _property,
      );
      localMapping = new LocalMappingPropertyInfo();
      localMapping.localMappingProperty = true;
      localMapping.localMappingPropertyMultiplicity = _multiplicity;
      localMapping.localMappingPropertyType = this.context.resolveType(
        localMappingProperty.type,
      ).value;
    } else {
      assertNonEmptyString(
        protocol.property.class,
        `Pure instance property mapping 'property.class' field is missing or empty`,
      );
      property = this.context.resolveProperty(protocol.property);
    }
    const propertyType = property.value.genericType.value.rawType;
    let targetSetImplementation: SetImplementation | undefined;
    const topParent = guaranteeNonNullable(this.topParent);
    if (propertyType instanceof Class) {
      if (protocol.target) {
        targetSetImplementation =
          TEMPORARY__getClassMappingByIdOrReturnUnresolved(
            topParent.parent,
            protocol.target,
          );
      } else {
        /* @MARKER: ACTION ANALYTICS */
        // NOTE: if no there is one non-root class mapping, auto-nominate that as the target set implementation
        const setImplementation = getClassMappingsByClass(
          topParent.parent,
          guaranteeType(propertyType, Class),
        )[0];
        targetSetImplementation = guaranteeNonNullable(
          setImplementation,
          `Can't find any class mapping for class '${propertyType.path}' in mapping '${topParent.parent.path}'`,
        );
      }
    }
    const sourceSetImplementation = protocol.source
      ? TEMPORARY__getClassMappingByIdOrReturnUnresolved(
          topParent.parent,
          protocol.source,
        )
      : undefined;
    const purePropertyMapping = new PurePropertyMapping(
      topParent,
      property,
      V1_resolvePathsInRawLambda(this.context, [], protocol.transform.body),
      sourceSetImplementation ?? topParent,
      targetSetImplementation,
      protocol.explodeProperty,
    );
    if (protocol.enumMappingId) {
      const enumerationMapping = this.allEnumerationMappings.find(
        (em) => em.id.value === protocol.enumMappingId,
      );
      if (!enumerationMapping) {
        // TODO: Since we don't support includedMappings, this will throw errors, but right now we can just make it undefined.
        this.context.log.debug(
          LogEvent.create(GRAPH_MANAGER_LOG_EVENT.GRAPH_BUILDER_FAILURE),
          `Can't find enumeration mapping with ID '${protocol.enumMappingId}' in mapping '${topParent.parent.path}' (perhaps because we haven't supported included mappings)`,
        );
      }
      purePropertyMapping.transformer = enumerationMapping;
    }
    purePropertyMapping.localMappingProperty = localMapping;
    return purePropertyMapping;
  }

  visit_FlatDataPropertyMapping(
    protocol: V1_FlatDataPropertyMapping,
  ): PropertyMapping {
    assertNonNullable(
      protocol.property,
      `Flat-data property mapping 'property' field is missing`,
    );
    assertNonEmptyString(
      protocol.property.property,
      `Flat-data property mapping 'property.property' field is missing or empty`,
    );
    assertNonNullable(
      protocol.transform,
      `Flat-data property mapping 'transform' field is missing`,
    );
    // NOTE: there are cases that property pointer class might be missing, such as when we transform grammar to JSON
    // since we do not do look up, due to nesting structure introudced by embedded mappings, we might not have the class information
    // as such, here we have to resolve the class being mapped depending on where the property mapping is in the class mapping
    let propertyOwnerClass: Class;
    if (protocol.property.class) {
      propertyOwnerClass = this.context.resolveClass(
        protocol.property.class,
      ).value;
    } else if (
      this.immediateParent instanceof EmbeddedFlatDataPropertyMapping
    ) {
      propertyOwnerClass = this.immediateParent.class.value;
    } else {
      throw new GraphBuilderError(
        `Can't find property owner class for property '${protocol.property.property}'`,
      );
    }
    // NOTE: mapping for derived property is not supported
    const property = propertyOwnerClass.getProperty(protocol.property.property);
    const sourceSetImplementation = guaranteeNonNullable(
      this.immediateParent instanceof EmbeddedFlatDataPropertyMapping
        ? this.immediateParent
        : this.topParent,
    );
    // target
    let targetSetImplementation: SetImplementation | undefined;
    const propertyType = property.genericType.value.rawType;
    if (propertyType instanceof Class && protocol.target) {
      targetSetImplementation = this.topParent
        ? TEMPORARY__getClassMappingByIdOrReturnUnresolved(
            this.topParent.parent,
            protocol.target,
          )
        : undefined;
    }
    const flatDataPropertyMapping = new FlatDataPropertyMapping(
      this.immediateParent,
      PropertyImplicitReference.create(
        PackageableElementImplicitReference.create(
          propertyOwnerClass,
          protocol.property.class ?? '',
        ),
        property,
      ),
      V1_resolvePathsInRawLambda(this.context, [], protocol.transform.body),
      sourceSetImplementation,
      targetSetImplementation,
    );
    if (protocol.enumMappingId) {
      const enumerationMapping = this.allEnumerationMappings.find(
        (em) => em.id.value === protocol.enumMappingId,
      );
      if (!enumerationMapping) {
        // TODO: Since we don't support includedMappings, this will throw errors, but right now we can just make it undefined.
        this.context.log.debug(
          LogEvent.create(GRAPH_MANAGER_LOG_EVENT.GRAPH_BUILDER_FAILURE),
          `Can't find enumeration mapping with ID '${protocol.enumMappingId}' in mapping '${this.topParent?.parent.path} (perhaps because we haven't supported included mappings)`,
        );
      }
      flatDataPropertyMapping.transformer = enumerationMapping;
    }
    return flatDataPropertyMapping;
  }

  visit_EmbeddedFlatDataPropertyMapping(
    protocol: V1_EmbeddedFlatDataPropertyMapping,
  ): PropertyMapping {
    assertNonNullable(
      protocol.property,
      `Embedded flat-data property mapping 'property' field is missing`,
    );
    assertNonEmptyString(
      protocol.property.property,
      `Embedded flat-data property mapping property 'property.property' field is missing or empty`,
    );
    // NOTE: there are cases that property pointer class might be missing, such as when we transform grammar to JSON
    // since we do not do look up, due to nesting structure introudced by embedded mappings, we might not have the class information
    // as such, here we have to resolve the class being mapped depending on where the property mapping is in the class mapping
    let propertyOwnerClass: Class;
    if (protocol.property.class) {
      propertyOwnerClass = this.context.resolveClass(
        protocol.property.class,
      ).value;
    } else if (
      this.immediateParent instanceof EmbeddedFlatDataPropertyMapping
    ) {
      propertyOwnerClass = this.immediateParent.class.value;
    } else {
      throw new GraphBuilderError(
        `Can't find property owner class for property '${protocol.property.property}'`,
      );
    }
    const property = propertyOwnerClass.getProperty(protocol.property.property);
    let _class: PackageableElementReference<Class>;
    if (protocol.class) {
      _class = this.context.resolveClass(protocol.class);
    } else {
      const propertyType = property.genericType.value.rawType;
      const complexClass = guaranteeType(
        propertyType,
        Class,
        'Only complex classes can be the target of an embedded property mapping',
      );
      _class = PackageableElementImplicitReference.create(complexClass, '');
    }
    const sourceSetImplementation = guaranteeNonNullable(
      this.immediateParent instanceof EmbeddedFlatDataPropertyMapping
        ? this.immediateParent
        : this.topParent,
    );
    const embeddedPropertyMapping = new EmbeddedFlatDataPropertyMapping(
      this.immediateParent,
      PropertyImplicitReference.create(
        PackageableElementImplicitReference.create(
          propertyOwnerClass,
          protocol.property.class ?? '',
        ),
        property,
      ),
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
    embeddedPropertyMapping.propertyMappings = protocol.propertyMappings.map(
      (propertyMapping) =>
        propertyMapping.accept_PropertyMappingVisitor(
          new V1_ProtocolToMetaModelPropertyMappingBuilder(
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
    protocol: V1_RelationalPropertyMapping,
  ): PropertyMapping {
    assertNonNullable(
      protocol.property,
      `Relational property mapping 'property' field is missing`,
    );
    assertNonEmptyString(
      protocol.property.property,
      `Relational property mapping 'property.property' field is missing or empty`,
    );
    assertNonNullable(
      protocol.relationalOperation,
      `Relational property mapping 'relationalOperation' field is missing`,
    );
    // NOTE: mapping for derived property is not supported
    let propertyOwner: Class | Association;
    let property: AbstractProperty;
    let localMapping: LocalMappingPropertyInfo | undefined;
    if (protocol.localMappingProperty) {
      const localMappingProperty = protocol.localMappingProperty;
      const mappingClass = new MappingClass(
        `${this.topParent?.parent.path}_${this.topParent?.id}${protocol.property.property}`,
      );
      const _multiplicity = this.context.graph.getMultiplicity(
        localMappingProperty.multiplicity.lowerBound,
        localMappingProperty.multiplicity.upperBound,
      );
      const _property = new Property(
        protocol.property.property,
        _multiplicity,
        this.context.resolveGenericType(localMappingProperty.type),
        mappingClass,
      );
      property = PropertyImplicitReference.create(
        PackageableElementImplicitReference.create(
          mappingClass,
          protocol.property.class,
        ),
        _property,
      ).value;
      localMapping = new LocalMappingPropertyInfo();
      localMapping.localMappingProperty = true;
      localMapping.localMappingPropertyMultiplicity = _multiplicity;
      localMapping.localMappingPropertyType = this.context.resolveType(
        localMappingProperty.type,
      ).value;
      propertyOwner = property.owner;
    } else {
      if (this.immediateParent instanceof AssociationImplementation) {
        propertyOwner = this.immediateParent.association.value;
      } else if (protocol.property.class) {
        propertyOwner = this.context.resolveClass(
          protocol.property.class,
        ).value;
      } else if (
        this.immediateParent instanceof
        EmbeddedRelationalInstanceSetImplementation
      ) {
        propertyOwner = this.immediateParent.class.value;
      } else {
        throw new GraphBuilderError(
          `Can't find property owner class for property '${protocol.property.property}'`,
        );
      }
      property = propertyOwner.getProperty(protocol.property.property);
    }
    // NOTE: mapping for derived property is not supported
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
      if (protocol.target) {
        targetSetImplementation = parentMapping
          ? TEMPORARY__getClassMappingByIdOrReturnUnresolved(
              parentMapping,
              protocol.target,
            )
          : undefined;
      } else {
        targetSetImplementation = parentMapping
          ? getClassMappingsByClass(
              parentMapping,
              guaranteeType(propertyType, Class),
            )[0]
          : undefined;
      }
    }
    const sourceSetImplementation = guaranteeNonNullable(
      resolveRelationalPropertyMappingSource(
        this.immediateParent,
        protocol,
        this.topParent,
      ),
    );
    const relationalPropertyMapping = new RelationalPropertyMapping(
      this.topParent ?? this.immediateParent,
      PropertyImplicitReference.create(
        PackageableElementImplicitReference.create(
          propertyOwner,
          protocol.property.class ?? '',
        ),
        property,
      ),
      sourceSetImplementation,
      targetSetImplementation,
    );
    // NOTE: we only need to use the raw form of the operation for the editor
    // but we need to process it anyway so we can:
    // 1. do analytics on table alias map
    // 2. and to resolve paths (similar to lambda).
    // As such, we will need to do a full round-trip processing for the operation
    // See https://github.com/finos/legend-studio/pull/173
    try {
      relationalPropertyMapping.relationalOperation =
        V1_serializeRelationalOperationElement(
          V1_transformRelationalOperationElement(
            V1_buildRelationalOperationElement(
              V1_deserializeRelationalOperationElement(
                protocol.relationalOperation,
              ),
              this.context,
              this.tableAliasMap,
              [],
            ),
            new V1_GraphTransformerContextBuilder(
              this.context.extensions.plugins,
            ).build(),
            {
              // NOTE: here we will always resolve paths found in the operation to full
              // since right now we still delete the section index, which will cause
              // these paths to be potentially become corrupted.
              TEMPORARY__resolveToFullPath: true,
            },
          ),
        );
    } catch {
      relationalPropertyMapping.relationalOperation =
        protocol.relationalOperation;
    }
    if (protocol.enumMappingId) {
      const enumerationMapping = this.allEnumerationMappings.find(
        (em) => em.id.value === protocol.enumMappingId,
      );
      if (!enumerationMapping) {
        // TODO: Since we don't support includedMappings, this will throw errors, but right now we can just make it undefined.
        this.context.log.debug(
          LogEvent.create(GRAPH_MANAGER_LOG_EVENT.GRAPH_BUILDER_FAILURE),
          `Can't find enumeration mapping with ID '${protocol.enumMappingId}' in mapping '${this.topParent?.parent.path}' (perhaps because we haven't supported included mappings)`,
        );
      }
      relationalPropertyMapping.transformer = enumerationMapping;
    }
    relationalPropertyMapping.localMappingProperty = localMapping;
    return relationalPropertyMapping;
  }

  visit_InlineEmbeddedPropertyMapping(
    protocol: V1_InlineEmbeddedPropertyMapping,
  ): PropertyMapping {
    assertNonNullable(
      protocol.property,
      `Inline embedded property mapping 'property' field is missing`,
    );
    assertNonEmptyString(
      protocol.property.property,
      `Inline embedded property mapping 'property.property' field is missing or empty`,
    );
    let propertyOwnerClass: Class;
    if (protocol.property.class) {
      propertyOwnerClass = this.context.resolveClass(
        protocol.property.class,
      ).value;
    } else if (
      this.immediateParent instanceof RootRelationalInstanceSetImplementation ||
      this.immediateParent instanceof
        EmbeddedRelationalInstanceSetImplementation
    ) {
      propertyOwnerClass = this.immediateParent.class.value;
    } else {
      throw new GraphBuilderError(
        `Can't find property owner class for property '${protocol.property.property}'`,
      );
    }
    const property = propertyOwnerClass.getProperty(protocol.property.property);
    const propertyType = property.genericType.value.rawType;
    const complexClass = guaranteeType(
      propertyType,
      Class,
      'Only complex classes can be the target of an embedded property mapping',
    );
    const _class = PackageableElementImplicitReference.create(
      complexClass,
      protocol.property.class ?? '',
    );
    const id = `${this.immediateParent.id.value}_${property.name}`;
    const topParent = guaranteeNonNullable(this.topParent);
    const sourceSetImplementation =
      this.immediateParent instanceof RootRelationalInstanceSetImplementation
        ? this.immediateParent
        : topParent;
    const inline = new InlineEmbeddedRelationalInstanceSetImplementation(
      this.immediateParent,
      PropertyImplicitReference.create(
        PackageableElementImplicitReference.create(
          propertyOwnerClass,
          protocol.property.class ?? '',
        ),
        property,
      ),
      guaranteeType(this.topParent, RootRelationalInstanceSetImplementation),
      sourceSetImplementation,
      _class,
      InferableMappingElementIdExplicitValue.create(id, ''),
    );
    inline.inlineSetImplementation =
      TEMPORARY__getClassMappingByIdOrReturnUnresolved(
        topParent.parent,
        protocol.setImplementationId,
      );
    return inline;
  }

  visit_EmbeddedRelationalPropertyMapping(
    protocol: V1_EmbeddedRelationalPropertyMapping,
  ): PropertyMapping {
    assertNonNullable(
      protocol.property,
      `Embedded relational property mapping 'property' field is missing`,
    );
    assertNonEmptyString(
      protocol.property.property,
      `Embedded relational property mapping 'property.property' field is missing or empty`,
    );
    const property = V1_buildEmbeddedRelationalMappingProperty(
      protocol,
      this.immediateParent,
      guaranteeNonNullable(this.topParent),
      this.context,
    );
    const embedded = new EmbeddedRelationalInstanceSetImplementation(
      this.immediateParent,
      PropertyImplicitReference.create(
        PackageableElementImplicitReference.create(
          property.propertyOwnerClass,
          protocol.property.class ?? '',
        ),
        property.property,
      ),
      guaranteeType(this.topParent, RootRelationalInstanceSetImplementation),
      property.sourceSetImplementation,
      property._class,
      InferableMappingElementIdExplicitValue.create(`${property.id.value}`, ''),
    );
    embedded.primaryKey = protocol.classMapping.primaryKey.map((key) =>
      V1_buildRelationalOperationElement(
        key,
        this.context,
        this.tableAliasMap,
        [],
      ),
    );
    embedded.propertyMappings = protocol.classMapping.propertyMappings.map(
      (propertyMapping) =>
        propertyMapping.accept_PropertyMappingVisitor(
          new V1_ProtocolToMetaModelPropertyMappingBuilder(
            this.context,
            embedded,
            this.topParent,
            this.topParent?.parent
              ? getAllEnumerationMappings(this.topParent.parent)
              : [],
            this.tableAliasMap,
          ),
        ),
    ) as RelationalPropertyMapping[];
    return embedded;
  }

  visit_OtherwiseEmbeddedRelationalPropertyMapping(
    protocol: V1_OtherwiseEmbeddedRelationalPropertyMapping,
  ): PropertyMapping {
    assertNonNullable(
      protocol.property,
      `Otherwise embedded relational property mapping 'property' field is missing`,
    );
    assertNonEmptyString(
      protocol.property.property,
      `Otherwise embedded relational property mapping 'property.property' field is missing or empty`,
    );
    const property = V1_buildEmbeddedRelationalMappingProperty(
      protocol,
      this.immediateParent,
      guaranteeNonNullable(this.topParent),
      this.context,
    );
    const otherwiseEmbedded =
      new OtherwiseEmbeddedRelationalInstanceSetImplementation(
        this.immediateParent,
        PropertyImplicitReference.create(
          PackageableElementImplicitReference.create(
            property.propertyOwnerClass,
            protocol.property.class ?? '',
          ),
          property.property,
        ),
        guaranteeType(this.topParent, RootRelationalInstanceSetImplementation),
        property.sourceSetImplementation,
        property._class,
        InferableMappingElementIdExplicitValue.create(
          `${property.id.value}`,
          '',
        ),
      );
    otherwiseEmbedded.primaryKey = protocol.classMapping.primaryKey.map((key) =>
      V1_buildRelationalOperationElement(
        key,
        this.context,
        this.tableAliasMap,
        [],
      ),
    );
    otherwiseEmbedded.propertyMappings =
      protocol.classMapping.propertyMappings.map((propertyMapping) =>
        propertyMapping.accept_PropertyMappingVisitor(
          new V1_ProtocolToMetaModelPropertyMappingBuilder(
            this.context,
            otherwiseEmbedded,
            this.topParent,
            this.topParent?.parent
              ? getAllEnumerationMappings(this.topParent.parent)
              : [],
            this.tableAliasMap,
          ),
        ),
      ) as RelationalPropertyMapping[];
    otherwiseEmbedded.otherwisePropertyMapping = guaranteeType(
      protocol.otherwisePropertyMapping.accept_PropertyMappingVisitor(
        new V1_ProtocolToMetaModelPropertyMappingBuilder(
          this.context,
          otherwiseEmbedded,
          this.topParent,
          this.topParent?.parent
            ? getAllEnumerationMappings(this.topParent.parent)
            : [],
          this.tableAliasMap,
        ),
      ),
      RelationalPropertyMapping,
    );
    return otherwiseEmbedded;
  }

  visit_XStorePropertyMapping(
    protocol: V1_XStorePropertyMapping,
  ): PropertyMapping {
    assertNonNullable(
      protocol.property,
      `XStore property mapping 'property' field is missing`,
    );
    assertNonEmptyString(
      protocol.property.class,
      `XStore property mapping 'property.class' field is missing or empty`,
    );
    assertNonEmptyString(
      protocol.property.property,
      `XStore property mapping 'property.property' field is missing or empty`,
    );
    assertNonNullable(
      protocol.crossExpression,
      `XStore property mapping 'crossExpression' field is missing`,
    );

    const xStoreParent = guaranteeNonNullable(
      this.xStoreParent,
      `XStore property 'xStoreParent' field is missing`,
    );
    const _association = xStoreParent.association.value;
    const property = _association.getProperty(protocol.property.property);
    const sourceSetImplementation = this.allClassMappings.find(
      (c) => c.id.value === protocol.source,
    );
    const targetSetImplementation = this.allClassMappings.find(
      (c) => c.id.value === protocol.target,
    );
    const xStorePropertyMapping = new XStorePropertyMapping(
      xStoreParent,
      PropertyImplicitReference.create(
        PackageableElementImplicitReference.create(
          _association,
          protocol.property.class,
        ),
        property,
      ),
      guaranteeNonNullable(sourceSetImplementation),
      targetSetImplementation,
    );
    xStorePropertyMapping.crossExpression = V1_resolvePathsInRawLambda(
      this.context,
      protocol.crossExpression.parameters,
      protocol.crossExpression.body,
    );
    return xStorePropertyMapping;
  }

  visit_AggregationAwarePropertyMapping(
    protocol: V1_AggregationAwarePropertyMapping,
  ): PropertyMapping {
    assertNonNullable(
      protocol.property,
      `Aggregation-aware property mapping 'property' field is missing`,
    );
    assertNonEmptyString(
      protocol.property.class,
      `Aggregation-aware property mapping 'property.class' field is missing or empty`,
    );
    assertNonEmptyString(
      protocol.property.property,
      `Aggregation-aware property mapping 'property.property' field is missing or empty`,
    );
    const aggregationAwareParent = guaranteeNonNullable(
      this.aggregationAwareParent,
      `Aggregation-aware property 'aggregationAwareParent' field is missing`,
    );

    const propertyMapping =
      aggregationAwareParent.mainSetImplementation.propertyMappings.find(
        (p) => p.property.value.name === protocol.property.property,
      );

    const property: PropertyReference =
      propertyMapping?.property ??
      this.context.resolveProperty(protocol.property);

    const sourceSetImplementation = this.allClassMappings.find(
      (c) => c.id.value === protocol.source,
    );
    const targetSetImplementation = this.allClassMappings.find(
      (c) => c.id.value === protocol.target,
    );

    const aggregationAwarePropertyMapping = new AggregationAwarePropertyMapping(
      this.topParent ?? this.immediateParent,
      property,
      guaranteeNonNullable(sourceSetImplementation),
      targetSetImplementation,
    );

    if (
      protocol.localMappingProperty &&
      propertyMapping?.localMappingProperty
    ) {
      aggregationAwarePropertyMapping.localMappingProperty =
        guaranteeNonNullable(propertyMapping.localMappingProperty);
    }
    return aggregationAwarePropertyMapping;
  }
}
