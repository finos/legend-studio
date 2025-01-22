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
  UnsupportedOperationError,
} from '@finos/legend-shared';
import { GRAPH_MANAGER_EVENT } from '../../../../../../../__lib__/GraphManagerEvent.js';
import type { PropertyMapping } from '../../../../../../../graph/metamodel/pure/packageableElements/mapping/PropertyMapping.js';
import { PurePropertyMapping } from '../../../../../../../graph/metamodel/pure/packageableElements/store/modelToModel/mapping/PurePropertyMapping.js';
import { RelationalPropertyMapping } from '../../../../../../../graph/metamodel/pure/packageableElements/store/relational/mapping/RelationalPropertyMapping.js';
import type { InstanceSetImplementation } from '../../../../../../../graph/metamodel/pure/packageableElements/mapping/InstanceSetImplementation.js';
import type { PropertyMappingsImplementation } from '../../../../../../../graph/metamodel/pure/packageableElements/mapping/PropertyMappingsImplementation.js';
import { EmbeddedFlatDataPropertyMapping } from '../../../../../../../graph/metamodel/pure/packageableElements/store/flatData/mapping/EmbeddedFlatDataPropertyMapping.js';
import { FlatDataPropertyMapping } from '../../../../../../../graph/metamodel/pure/packageableElements/store/flatData/mapping/FlatDataPropertyMapping.js';
import type { EnumerationMapping } from '../../../../../../../graph/metamodel/pure/packageableElements/mapping/EnumerationMapping.js';
import type { SetImplementation } from '../../../../../../../graph/metamodel/pure/packageableElements/mapping/SetImplementation.js';
import { Class } from '../../../../../../../graph/metamodel/pure/packageableElements/domain/Class.js';
import type { Association } from '../../../../../../../graph/metamodel/pure/packageableElements/domain/Association.js';
import type { TableAlias } from '../../../../../../../graph/metamodel/pure/packageableElements/store/relational/model/RelationalOperationElement.js';
import { InferableMappingElementIdExplicitValue } from '../../../../../../../graph/metamodel/pure/packageableElements/mapping/InferableMappingElementId.js';
import {
  type PackageableElementReference,
  PackageableElementImplicitReference,
} from '../../../../../../../graph/metamodel/pure/packageableElements/PackageableElementReference.js';
import {
  type PropertyReference,
  PropertyImplicitReference,
} from '../../../../../../../graph/metamodel/pure/packageableElements/domain/PropertyReference.js';
import { RootRelationalInstanceSetImplementation } from '../../../../../../../graph/metamodel/pure/packageableElements/store/relational/mapping/RootRelationalInstanceSetImplementation.js';
import { OtherwiseEmbeddedRelationalInstanceSetImplementation } from '../../../../../../../graph/metamodel/pure/packageableElements/store/relational/mapping/OtherwiseEmbeddedRelationalInstanceSetImplementation.js';
import { EmbeddedRelationalInstanceSetImplementation } from '../../../../../../../graph/metamodel/pure/packageableElements/store/relational/mapping/EmbeddedRelationalInstanceSetImplementation.js';
import { InlineEmbeddedRelationalInstanceSetImplementation } from '../../../../../../../graph/metamodel/pure/packageableElements/store/relational/mapping/InlineEmbeddedRelationalInstanceSetImplementation.js';
import { AssociationImplementation } from '../../../../../../../graph/metamodel/pure/packageableElements/mapping/AssociationImplementation.js';
import type { V1_GraphBuilderContext } from './V1_GraphBuilderContext.js';
import type {
  V1_PropertyMapping,
  V1_PropertyMappingVisitor,
} from '../../../model/packageableElements/mapping/V1_PropertyMapping.js';
import type { V1_PurePropertyMapping } from '../../../model/packageableElements/store/modelToModel/mapping/V1_PurePropertyMapping.js';
import type { V1_InlineEmbeddedPropertyMapping } from '../../../model/packageableElements/store/relational/mapping/V1_InlineEmbeddedPropertyMapping.js';
import type { V1_AggregationAwarePropertyMapping } from '../../../model/packageableElements/store/relational/mapping/aggregationAware/V1_AggregationAwarePropertyMapping.js';
import type { V1_RelationalPropertyMapping } from '../../../model/packageableElements/store/relational/mapping/V1_RelationalPropertyMapping.js';
import type { V1_EmbeddedFlatDataPropertyMapping } from '../../../model/packageableElements/store/flatData/mapping/V1_EmbeddedFlatDataPropertyMapping.js';
import type { V1_FlatDataPropertyMapping } from '../../../model/packageableElements/store/flatData/mapping/V1_FlatDataPropertyMapping.js';
import type { V1_OtherwiseEmbeddedRelationalPropertyMapping } from '../../../model/packageableElements/store/relational/mapping/V1_OtherwiseEmbeddedRelationalPropertyMapping.js';
import type { V1_EmbeddedRelationalPropertyMapping } from '../../../model/packageableElements/store/relational/mapping/V1_EmbeddedRelationalPropertyMapping.js';
import { V1_buildRelationalOperationElement } from './helpers/V1_DatabaseBuilderHelper.js';
import { V1_buildEmbeddedRelationalMappingProperty } from './helpers/V1_RelationalPropertyMappingBuilder.js';
import type { V1_XStorePropertyMapping } from '../../../model/packageableElements/mapping/xStore/V1_XStorePropertyMapping.js';
import { XStorePropertyMapping } from '../../../../../../../graph/metamodel/pure/packageableElements/mapping/xStore/XStorePropertyMapping.js';
import type { XStoreAssociationImplementation } from '../../../../../../../graph/metamodel/pure/packageableElements/mapping/xStore/XStoreAssociationImplementation.js';
import { Property } from '../../../../../../../graph/metamodel/pure/packageableElements/domain/Property.js';
import { MappingClass } from '../../../../../../../graph/metamodel/pure/packageableElements/mapping/MappingClass.js';
import { LocalMappingPropertyInfo } from '../../../../../../../graph/metamodel/pure/packageableElements/mapping/LocalMappingPropertyInfo.js';
import type { AggregationAwareSetImplementation } from '../../../../../../../graph/metamodel/pure/packageableElements/mapping/aggregationAware/AggregationAwareSetImplementation.js';
import { AggregationAwarePropertyMapping } from '../../../../../../../graph/metamodel/pure/packageableElements/mapping/aggregationAware/AggregationAwarePropertyMapping.js';
import { V1_buildRawLambdaWithResolvedPaths } from './helpers/V1_ValueSpecificationPathResolver.js';
import {
  V1_deserializeRelationalOperationElement,
  V1_serializeRelationalOperationElement,
} from '../../pureProtocol/serializationHelpers/V1_DatabaseSerializationHelper.js';
import { V1_transformRelationalOperationElement } from '../from/V1_DatabaseTransformer.js';
import { V1_GraphTransformerContextBuilder } from '../from/V1_GraphTransformerContext.js';
import {
  getAllEnumerationMappings,
  getAllIncludedMappings,
  getClassMappingById,
  getClassMappingsByClass,
} from '../../../../../../../graph/helpers/DSL_Mapping_Helper.js';
import { GraphBuilderError } from '../../../../../../../graph-manager/GraphManagerUtils.js';
import type { AbstractProperty } from '../../../../../../../graph/metamodel/pure/packageableElements/domain/AbstractProperty.js';
import { BindingTransformer } from '../../../../../../../graph/metamodel/pure/packageableElements/externalFormat/store/DSL_ExternalFormat_BindingTransformer.js';
import type { Mapping } from '../../../../../../../graph/metamodel/pure/packageableElements/mapping/Mapping.js';
import { V1_resolveBinding } from './V1_DSL_ExternalFormat_GraphBuilderHelper.js';
import { INTERNAL__UnresolvedSetImplementation } from '../../../../../../../graph/metamodel/pure/packageableElements/mapping/INTERNAL__UnresolvedSetImplementation.js';
import {
  getAssociatedPropertyClass,
  getOwnProperty,
  getClassProperty,
} from '../../../../../../../graph/helpers/DomainHelper.js';
import { SetImplementationImplicitReference } from '../../../../../../../graph/metamodel/pure/packageableElements/mapping/SetImplementationReference.js';
import type { DSL_Mapping_PureProtocolProcessorPlugin_Extension } from '../../../../extensions/DSL_Mapping_PureProtocolProcessorPlugin_Extension.js';
import { EnumerationMappingExplicitReference } from '../../../../../../../graph/metamodel/pure/packageableElements/mapping/EnumerationMappingReference.js';
import type { V1_FlatDataAssociationPropertyMapping } from '../../../model/packageableElements/store/flatData/mapping/V1_FlatDataAssociationPropertyMapping.js';
import { FlatDataAssociationPropertyMapping } from '../../../../../../../graph/metamodel/pure/packageableElements/store/flatData/mapping/FlatDataAssociationPropertyMapping.js';
import type { V1_INTERNAL__UnknownPropertyMapping } from '../../../model/packageableElements/mapping/V1_INTERNAL__UnknownPropertyMapping.js';
import { INTERNAL__UnknownPropertyMapping } from '../../../../../../../graph/metamodel/pure/packageableElements/mapping/INTERNAL__UnknownPropertyMapping.js';
import { INTERNAL__PseudoMapping } from '../../../../../../../graph/metamodel/pure/packageableElements/mapping/INTERNAL__PseudoMapping.js';
import type {
  V1_RelationFunctionPropertyMapping
} from '../../../model/packageableElements/mapping/V1_RelationFunctionPropertyMapping.js';
import {
  RelationFunctionPropertyMapping
} from '../../../../../../../graph/metamodel/pure/packageableElements/mapping/relationFunction/RelationFunctionPropertyMapping.js';
import { RelationColumn } from '../../../../../../../graph/metamodel/pure/packageableElements/relation/RelationType.js';

const TEMPORARY__resolveSetImplementationByID = (
  mapping: Mapping,
  id: string,
  context: V1_GraphBuilderContext,
): SetImplementation => {
  const classMapping = returnUndefOnError(() =>
    getClassMappingById(mapping, id),
  );
  const isMappingWithUnknownMappingIncludes = getAllIncludedMappings(
    mapping,
  ).includes(INTERNAL__PseudoMapping.INSTANCE);

  if (!classMapping) {
    const message = `Can't find class mapping with ID '${id}' in mapping '${mapping.path}'`;
    /**
     * If the mapping has unknown mapping includes, this kind of problems
     * might be due to the fact that the class mapping is not reachable due to the system
     * not knowing how to analyze the unknown mapping include, as such, we will not throw
     * errors, otherwise, we should in strict-mode
     *
     * See https://github.com/finos/legend-studio/issues/880
     * See https://github.com/finos/legend-studio/issues/941
     *
     * @discrepancy graph-building
     */
    if (context.options?.strict && !isMappingWithUnknownMappingIncludes) {
      throw new GraphBuilderError(message);
    }
    context.logService.warn(LogEvent.create(message));
    return new INTERNAL__UnresolvedSetImplementation(id, mapping);
  }

  return classMapping;
};

const resolvePropertyMappingSourceImplementation = (
  immediateParent: PropertyMappingsImplementation,
  value: V1_PropertyMapping,
  topParent: InstanceSetImplementation | undefined,
  context: V1_GraphBuilderContext,
): SetImplementation | undefined => {
  if (immediateParent instanceof AssociationImplementation) {
    if (value.source) {
      return TEMPORARY__resolveSetImplementationByID(
        immediateParent._PARENT,
        value.source,
        context,
      );
    }
    const property = getOwnProperty(
      immediateParent.association.value,
      value.property.property,
    );
    const _class = getAssociatedPropertyClass(
      immediateParent.association.value,
      property,
    );
    const setImpls = getClassMappingsByClass(immediateParent._PARENT, _class);
    return setImpls.find((r) => r.root.value) ?? setImpls[0];
  }
  return topParent;
};

export class V1_PropertyMappingBuilder
  implements V1_PropertyMappingVisitor<PropertyMapping>
{
  private context: V1_GraphBuilderContext;
  private immediateParent: PropertyMappingsImplementation; // either root instance set implementation or the immediate embedded parent property mapping (needed for processing embedded property mapping)
  private topParent: InstanceSetImplementation | undefined;
  private allEnumerationMappings: EnumerationMapping[] = [];
  private tableAliasIndex: Map<string, TableAlias>;
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
    this.tableAliasIndex = tableAliasMap ?? new Map<string, TableAlias>();
    this.allClassMappings = allClassMappings ?? [];
    this.xStoreParent = xStoreParent;
    this.aggregationAwareParent = aggregationAwareParent;
  }

  visit_PropertyMapping(propertyMapping: V1_PropertyMapping): PropertyMapping {
    const extraPropertyMappingBuilders =
      this.context.extensions.plugins.flatMap(
        (plugin) =>
          (
            plugin as DSL_Mapping_PureProtocolProcessorPlugin_Extension
          ).V1_getExtraPropertyMappingBuilders?.() ?? [],
      );
    for (const builder of extraPropertyMappingBuilders) {
      const extraPropertyMapping = builder(propertyMapping, this.context);
      if (extraPropertyMapping) {
        return extraPropertyMapping;
      }
    }
    throw new UnsupportedOperationError(
      `Can't build property mapping: no compatible builder available from plugins`,
      propertyMapping,
    );
  }

  visit_INTERNAL__UnknownPropertyMapping(
    propertyMapping: V1_INTERNAL__UnknownPropertyMapping,
  ): PropertyMapping {
    const metamodel = new INTERNAL__UnknownPropertyMapping();
    metamodel.content = propertyMapping.content;
    return metamodel;
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
        `${this.topParent?._PARENT.path}_${this.topParent?.id}${protocol.property.property}`,
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
      );
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
        targetSetImplementation = TEMPORARY__resolveSetImplementationByID(
          topParent._PARENT,
          protocol.target,
          this.context,
        );
      } else {
        // NOTE: if no there is one non-root class mapping, auto-nominate that as the target set implementation
        targetSetImplementation = getClassMappingsByClass(
          topParent._PARENT,
          guaranteeType(propertyType, Class),
        )[0];
      }
    }
    const sourceSetImplementation = protocol.source
      ? TEMPORARY__resolveSetImplementationByID(
          topParent._PARENT,
          protocol.source,
          this.context,
        )
      : undefined;
    const purePropertyMapping = new PurePropertyMapping(
      topParent,
      property,
      V1_buildRawLambdaWithResolvedPaths(
        [],
        protocol.transform.body,
        this.context,
      ),
      SetImplementationImplicitReference.create(
        sourceSetImplementation ?? topParent,
        protocol.source,
      ),
      targetSetImplementation
        ? SetImplementationImplicitReference.create(
            targetSetImplementation,
            protocol.target,
          )
        : undefined,
      protocol.explodeProperty,
    );
    if (protocol.enumMappingId) {
      const enumerationMapping = this.allEnumerationMappings.find(
        (em) => em.id.value === protocol.enumMappingId,
      );
      if (!enumerationMapping) {
        // TODO: Since we don't support includedMappings, this will throw errors, but right now we can just make it undefined.
        this.context.logService.debug(
          LogEvent.create(GRAPH_MANAGER_EVENT.GRAPH_BUILDER_FAILURE),
          `Can't find enumeration mapping with ID '${protocol.enumMappingId}' in mapping '${topParent._PARENT.path}' (perhaps because we haven't supported included mappings)`,
        );
      }
      purePropertyMapping.transformer = enumerationMapping
        ? EnumerationMappingExplicitReference.create(enumerationMapping)
        : undefined;
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
    const property = getClassProperty(
      propertyOwnerClass,
      protocol.property.property,
    );
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
        ? TEMPORARY__resolveSetImplementationByID(
            this.topParent._PARENT,
            protocol.target,
            this.context,
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
      V1_buildRawLambdaWithResolvedPaths(
        [],
        protocol.transform.body,
        this.context,
      ),
      SetImplementationImplicitReference.create(
        sourceSetImplementation,
        protocol.source,
      ),
      targetSetImplementation
        ? SetImplementationImplicitReference.create(
            targetSetImplementation,
            protocol.target,
          )
        : undefined,
    );
    if (protocol.enumMappingId) {
      const enumerationMapping = this.allEnumerationMappings.find(
        (em) => em.id.value === protocol.enumMappingId,
      );
      if (!enumerationMapping) {
        // TODO: Since we don't support includedMappings, this will throw errors, but right now we can just make it undefined.
        this.context.logService.debug(
          LogEvent.create(GRAPH_MANAGER_EVENT.GRAPH_BUILDER_FAILURE),
          `Can't find enumeration mapping with ID '${protocol.enumMappingId}' in mapping '${this.topParent?._PARENT.path} (perhaps because we haven't supported included mappings)`,
        );
      }
      flatDataPropertyMapping.transformer = enumerationMapping
        ? EnumerationMappingExplicitReference.create(enumerationMapping)
        : undefined;
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
    const property = getClassProperty(
      propertyOwnerClass,
      protocol.property.property,
    );
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
      SetImplementationImplicitReference.create(
        sourceSetImplementation,
        protocol.source,
      ),
      _class,
      InferableMappingElementIdExplicitValue.create(
        `${sourceSetImplementation.id.value}.${property.name}`,
        '',
      ),
      undefined,
    );
    embeddedPropertyMapping.targetSetImplementation = protocol.target
      ? SetImplementationImplicitReference.create(
          embeddedPropertyMapping,
          protocol.target,
        )
      : undefined;
    embeddedPropertyMapping.propertyMappings = protocol.propertyMappings.map(
      (propertyMapping) =>
        propertyMapping.accept_PropertyMappingVisitor(
          new V1_PropertyMappingBuilder(
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
        `${this.topParent?._PARENT.path}_${this.topParent?.id}${protocol.property.property}`,
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
      );
      propertyOwner = property._OWNER;
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
        propertyOwner =
          this.immediateParent._OWNER instanceof
            EmbeddedRelationalInstanceSetImplementation &&
          this.immediateParent.property.value.name ===
            protocol.property.property
            ? this.immediateParent.property.ownerReference.value
            : this.immediateParent.class.value;
      } else {
        throw new GraphBuilderError(
          `Can't find property owner class for property '${protocol.property.property}'`,
        );
      }
      property =
        propertyOwner instanceof Class
          ? getClassProperty(propertyOwner, protocol.property.property)
          : getOwnProperty(propertyOwner, protocol.property.property);
    }
    // NOTE: mapping for derived property is not supported
    // since we are not doing embedded property mappings yet, the target must have already been added to the mapping
    const propertyType = property.genericType.value.rawType;
    let targetSetImplementation: SetImplementation | undefined;
    if (propertyType instanceof Class) {
      let parentMapping = this.topParent?._PARENT;
      if (
        !parentMapping &&
        this.immediateParent instanceof AssociationImplementation
      ) {
        parentMapping = this.immediateParent._PARENT;
      }
      if (protocol.target) {
        targetSetImplementation = parentMapping
          ? TEMPORARY__resolveSetImplementationByID(
              parentMapping,
              protocol.target,
              this.context,
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
      resolvePropertyMappingSourceImplementation(
        this.immediateParent,
        protocol,
        this.topParent,
        this.context,
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
      SetImplementationImplicitReference.create(
        sourceSetImplementation,
        protocol.source,
      ),
      targetSetImplementation
        ? SetImplementationImplicitReference.create(
            targetSetImplementation,
            protocol.target,
          )
        : undefined,
    );
    if (protocol.bindingTransformer?.binding) {
      const bindingTransformer = new BindingTransformer();
      const binding = V1_resolveBinding(
        protocol.bindingTransformer.binding,
        this.context,
      );
      bindingTransformer.binding = binding;
      relationalPropertyMapping.bindingTransformer = bindingTransformer;
    }
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
              this.tableAliasIndex,
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
        this.context.logService.debug(
          LogEvent.create(GRAPH_MANAGER_EVENT.GRAPH_BUILDER_FAILURE),
          `Can't find enumeration mapping with ID '${protocol.enumMappingId}' in mapping '${this.topParent?._PARENT.path}' (perhaps because we haven't supported included mappings)`,
        );
      }
      relationalPropertyMapping.transformer = enumerationMapping
        ? EnumerationMappingExplicitReference.create(enumerationMapping)
        : undefined;
    }
    relationalPropertyMapping.localMappingProperty = localMapping;
    return relationalPropertyMapping;
  }

  visit_FlatDataAssociationPropertyMapping(
    protocol: V1_FlatDataAssociationPropertyMapping,
  ): PropertyMapping {
    assertNonNullable(
      protocol.property,
      `FlatData property mapping 'property' field is missing`,
    );
    assertNonEmptyString(
      protocol.property.property,
      `FlatData property mapping 'property.property' field is missing or empty`,
    );
    assertNonNullable(
      protocol.flatData,
      `FlatData property mapping 'flatdata' field is missing`,
    );
    assertNonNullable(
      protocol.sectionName,
      `FlatData property mapping 'sectionName' field is missing`,
    );
    // NOTE: mapping for derived property is not supported
    let propertyOwner: Association;
    if (this.immediateParent instanceof AssociationImplementation) {
      propertyOwner = this.immediateParent.association.value;
    } else {
      throw new GraphBuilderError(
        `Can't find property owner class for property '${protocol.property.property}'`,
      );
    }
    const property = getOwnProperty(propertyOwner, protocol.property.property);

    // NOTE: mapping for derived property is not supported
    // since we are not doing embedded property mappings yet, the target must have already been added to the mapping
    const propertyType = property.genericType.value.rawType;
    let targetSetImplementation: SetImplementation | undefined;
    if (propertyType instanceof Class) {
      const parentMapping = this.immediateParent._PARENT;

      if (protocol.target) {
        targetSetImplementation = TEMPORARY__resolveSetImplementationByID(
          parentMapping,
          protocol.target,
          this.context,
        );
      } else {
        targetSetImplementation = getClassMappingsByClass(
          parentMapping,
          guaranteeType(propertyType, Class),
        )[0];
      }
    }
    const sourceSetImplementation = guaranteeNonNullable(
      resolvePropertyMappingSourceImplementation(
        this.immediateParent,
        protocol,
        this.topParent,
        this.context,
      ),
    );
    const flatDataAssociationPropertyMapping =
      new FlatDataAssociationPropertyMapping(
        this.topParent ?? this.immediateParent,
        PropertyImplicitReference.create(
          PackageableElementImplicitReference.create(
            propertyOwner,
            protocol.property.class ?? '',
          ),
          property,
        ),
        SetImplementationImplicitReference.create(
          sourceSetImplementation,
          protocol.source,
        ),
        targetSetImplementation
          ? SetImplementationImplicitReference.create(
              targetSetImplementation,
              protocol.target,
            )
          : undefined,
      );
    flatDataAssociationPropertyMapping.flatData = protocol.flatData;
    flatDataAssociationPropertyMapping.sectionName = protocol.sectionName;
    return flatDataAssociationPropertyMapping;
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
    const property = getClassProperty(
      propertyOwnerClass,
      protocol.property.property,
    );
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
      SetImplementationImplicitReference.create(
        sourceSetImplementation,
        protocol.source,
      ),
      _class,
      InferableMappingElementIdExplicitValue.create(id, ''),
      undefined,
    );
    inline.inlineSetImplementation = TEMPORARY__resolveSetImplementationByID(
      topParent._PARENT,
      protocol.setImplementationId,
      this.context,
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
      SetImplementationImplicitReference.create(
        property.sourceSetImplementation,
        protocol.source,
      ),
      property._class,
      InferableMappingElementIdExplicitValue.create(`${property.id.value}`, ''),
      undefined,
    );
    embedded.primaryKey = protocol.classMapping.primaryKey.map((key) =>
      V1_buildRelationalOperationElement(
        key,
        this.context,
        this.tableAliasIndex,
        [],
      ),
    );
    embedded.propertyMappings = protocol.classMapping.propertyMappings.map(
      (propertyMapping) =>
        propertyMapping.accept_PropertyMappingVisitor(
          new V1_PropertyMappingBuilder(
            this.context,
            embedded,
            this.topParent,
            this.topParent?._PARENT
              ? getAllEnumerationMappings(this.topParent._PARENT)
              : [],
            this.tableAliasIndex,
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
        SetImplementationImplicitReference.create(
          property.sourceSetImplementation,
          protocol.source,
        ),
        property._class,
        InferableMappingElementIdExplicitValue.create(
          `${property.id.value}`,
          '',
        ),
        undefined,
      );
    otherwiseEmbedded.primaryKey = protocol.classMapping.primaryKey.map((key) =>
      V1_buildRelationalOperationElement(
        key,
        this.context,
        this.tableAliasIndex,
        [],
      ),
    );
    otherwiseEmbedded.propertyMappings =
      protocol.classMapping.propertyMappings.map((propertyMapping) =>
        propertyMapping.accept_PropertyMappingVisitor(
          new V1_PropertyMappingBuilder(
            this.context,
            otherwiseEmbedded,
            this.topParent,
            this.topParent?._PARENT
              ? getAllEnumerationMappings(this.topParent._PARENT)
              : [],
            this.tableAliasIndex,
          ),
        ),
      ) as RelationalPropertyMapping[];
    otherwiseEmbedded.otherwisePropertyMapping = guaranteeType(
      protocol.otherwisePropertyMapping.accept_PropertyMappingVisitor(
        new V1_PropertyMappingBuilder(
          this.context,
          otherwiseEmbedded,
          this.topParent,
          this.topParent?._PARENT
            ? getAllEnumerationMappings(this.topParent._PARENT)
            : [],
          this.tableAliasIndex,
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
    const property = getOwnProperty(_association, protocol.property.property);
    const sourceSetImplementation = guaranteeNonNullable(
      resolvePropertyMappingSourceImplementation(
        this.immediateParent,
        protocol,
        this.topParent,
        this.context,
      ),
    );
    let targetSetImplementation: SetImplementation | undefined;
    const propertyType = property.genericType.value.rawType;
    if (propertyType instanceof Class) {
      const parentMapping = this.immediateParent._PARENT;
      if (protocol.target) {
        targetSetImplementation = TEMPORARY__resolveSetImplementationByID(
          parentMapping,
          protocol.target,
          this.context,
        );
      } else {
        targetSetImplementation = getClassMappingsByClass(
          parentMapping,
          guaranteeType(propertyType, Class),
        )[0];
      }
    }
    const xStorePropertyMapping = new XStorePropertyMapping(
      xStoreParent,
      PropertyImplicitReference.create(
        PackageableElementImplicitReference.create(
          _association,
          protocol.property.class,
        ),
        property,
      ),
      SetImplementationImplicitReference.create(
        sourceSetImplementation,
        protocol.source,
      ),
      targetSetImplementation
        ? SetImplementationImplicitReference.create(
            targetSetImplementation,
            protocol.target,
          )
        : undefined,
    );
    xStorePropertyMapping.crossExpression = V1_buildRawLambdaWithResolvedPaths(
      protocol.crossExpression.parameters,
      protocol.crossExpression.body,
      this.context,
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

    const sourceSetImplementation = guaranteeNonNullable(
      resolvePropertyMappingSourceImplementation(
        this.immediateParent,
        protocol,
        this.topParent,
        this.context,
      ),
    );
    let targetSetImplementation: SetImplementation | undefined;
    const propertyType = property.value.genericType.value.rawType;
    if (propertyType instanceof Class) {
      const parentMapping = this.immediateParent._PARENT;

      if (protocol.target) {
        targetSetImplementation = TEMPORARY__resolveSetImplementationByID(
          parentMapping,
          protocol.target,
          this.context,
        );
      } else {
        targetSetImplementation = getClassMappingsByClass(
          parentMapping,
          guaranteeType(propertyType, Class),
        )[0];
      }
    }

    const aggregationAwarePropertyMapping = new AggregationAwarePropertyMapping(
      this.topParent ?? this.immediateParent,
      property,
      SetImplementationImplicitReference.create(
        guaranteeNonNullable(sourceSetImplementation),
        protocol.source,
      ),
      targetSetImplementation
        ? SetImplementationImplicitReference.create(
            targetSetImplementation,
            protocol.target,
          )
        : undefined,
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

  visit_RelationFunctionPropertyMapping(protocol: V1_RelationFunctionPropertyMapping): PropertyMapping {
    assertNonNullable(
        protocol.property,
        `Relation Function property mapping 'property' field is missing`,
    );
    assertNonEmptyString(
        protocol.property.property,
        `Relation Function property mapping 'property.property' field is missing or empty`,
    );
    let propertyOwner: Class | Association;
    let property: AbstractProperty;
    let localMapping: LocalMappingPropertyInfo | undefined;
    if (protocol.localMappingProperty) {
      const localMappingProperty = protocol.localMappingProperty;
      const mappingClass = new MappingClass(
          `${this.topParent?._PARENT.path}_${this.topParent?.id}${protocol.property.property}`,
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
      );
      propertyOwner = property._OWNER;
    } else {
       if (protocol.property.class) {
        propertyOwner = this.context.resolveClass(
            protocol.property.class,
        ).value;
      } else {
        throw new GraphBuilderError(
            `Can't find property owner class for property '${protocol.property.property}'`,
        );
      }
      property =
          propertyOwner instanceof Class
              ? getClassProperty(propertyOwner, protocol.property.property)
              : getOwnProperty(propertyOwner, protocol.property.property);
    }

    const sourceSetImplementation = guaranteeNonNullable(
        resolvePropertyMappingSourceImplementation(
            this.immediateParent,
            protocol,
            this.topParent,
            this.context,
        ),
    );
    const propertyType = property.genericType.value.rawType;
    const propertyMapping = new RelationFunctionPropertyMapping(
        this.topParent ?? this.immediateParent,
        PropertyImplicitReference.create(
            PackageableElementImplicitReference.create(
                propertyOwner,
                protocol.property.class ?? '',
            ),
            property,
        ),
        SetImplementationImplicitReference.create(
            sourceSetImplementation,
            protocol.source,
        ),
        undefined,
        new RelationColumn(protocol.column, propertyType)
    );
    propertyMapping.localMappingProperty = localMapping;
    return propertyMapping;
  }
}
