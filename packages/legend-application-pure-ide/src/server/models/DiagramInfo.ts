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
  ClassView,
  Diagram,
  GeneralizationView,
  Point,
  PropertyView,
  Rectangle,
  _relationshipView_simplifyPath,
} from '@finos/legend-extension-dsl-diagram/graph';
import {
  Class,
  CoreModel,
  DerivedProperty,
  ELEMENT_PATH_DELIMITER,
  Enumeration,
  GenericType,
  GenericTypeExplicitReference,
  Multiplicity,
  PackageableElementExplicitReference,
  Profile,
  Property,
  PropertyExplicitReference,
  PureModel,
  resolvePackagePathAndElementName,
  Stereotype,
  StereotypeExplicitReference,
  SystemModel,
  Tag,
  TaggedValue,
  TagExplicitReference,
  getOrCreatePackage,
  addElementToPackage,
  getTag,
  getStereotype,
  getOwnProperty,
  AggregationKind,
} from '@finos/legend-graph';
import {
  addUniqueEntry,
  guaranteeNonNullable,
  type PlainObject,
} from '@finos/legend-shared';
import {
  createModelSchema,
  primitive,
  object,
  list,
  optional,
  deserialize,
  custom,
  SKIP,
} from 'serializr';
import { SourceInformation } from './SourceInformation.js';

// ----------------------------------- Shared PURE serialization model ---------------------------------------
//
// We don't intend to build Pure graph from these serialization models, hence, we never really want to export them
// to use outside of this file; their sole purpose is to get the result from the diagram info endpoints
// to convert to Legend protocol model to use in Legend Studio diagram renderer

/**
 * Unfortunately, diagram analysis endpoint now return malformed source-information so we need to have this hacky
 * surgery before properly deserialize it.
 */
const TEMPORARY__diagramInfoSourceInformationSerializationSchema = custom(
  () => SKIP,
  (json: PlainObject): SourceInformation => {
    json.sourceId = json.source;
    return deserialize(SourceInformation, json);
  },
);

class PURE__Profile {
  package!: string;
  name!: string;
  tags: string[] = [];
  stereotypes: string[] = [];
}

createModelSchema(PURE__Profile, {
  name: primitive(),
  package: primitive(),
  stereotypes: list(primitive()),
  tags: list(primitive()),
});

class PURE__Steoreotype {
  profile!: string;
  value!: string;
}

createModelSchema(PURE__Steoreotype, {
  profile: primitive(),
  value: primitive(),
});

class PURE__Tag {
  profile!: string;
  value!: string;
}

createModelSchema(PURE__Tag, {
  profile: primitive(),
  value: primitive(),
});

class PURE__TaggedValue {
  tag!: PURE__Tag;
  value!: string;
}

createModelSchema(PURE__TaggedValue, {
  tag: object(PURE__Tag),
  value: primitive(),
});

class PURE__GenericType {
  rawType?: string;
  typeParameter?: string; // this will be specified when for generics case
  // typeArguments
}

createModelSchema(PURE__GenericType, {
  rawType: optional(primitive()),
  typeParameter: optional(primitive()),
});

class PURE__Property {
  name!: string;
  stereotypes: PURE__Steoreotype[] = [];
  taggedValues: PURE__TaggedValue[] = [];

  aggregation!: string;
  multiplicity!: string;
  // parameters // this is meant for qualified properties only
  genericType!: PURE__GenericType;
}

createModelSchema(PURE__Property, {
  aggregation: primitive(),
  genericType: object(PURE__GenericType),
  multiplicity: primitive(),
  name: primitive(),
  stereotypes: list(object(PURE__Steoreotype)),
  taggedValues: list(object(PURE__TaggedValue)),
});

class PURE__PackageableElementPointer {
  package!: string;
  name!: string;
  sourceInformation!: SourceInformation;
}

createModelSchema(PURE__PackageableElementPointer, {
  name: primitive(),
  package: primitive(),
  sourceInformation: TEMPORARY__diagramInfoSourceInformationSerializationSchema,
});

class PURE__Class {
  package!: string;
  name!: string;
  sourceInformation!: SourceInformation;
  stereotypes: PURE__Steoreotype[] = [];
  taggedValues: PURE__TaggedValue[] = [];

  // typeParameters: string[] = [];
  generalizations: PURE__GenericType[] = [];
  properties: PURE__Property[] = [];
  qualifiedProperties: PURE__Property[] = [];
}

createModelSchema(PURE__Class, {
  generalizations: list(object(PURE__GenericType)),
  name: primitive(),
  package: primitive(),
  properties: list(object(PURE__Property)),
  qualifiedProperties: list(object(PURE__Property)),
  sourceInformation: TEMPORARY__diagramInfoSourceInformationSerializationSchema,
  stereotypes: list(object(PURE__Steoreotype)),
  taggedValues: list(object(PURE__TaggedValue)),
});

class PURE__Enumeration {
  package!: string;
  name!: string;
  // sourceInformation!: SourceInformation;

  enumValues: string[] = [];
}

createModelSchema(PURE__Enumeration, {
  name: primitive(),
  package: primitive(),
  enumValues: list(primitive()),
});

// -------------------------------------- Diagram -----------------------------------------

class PURE__Point {
  x!: number;
  y!: number;
}

createModelSchema(PURE__Point, {
  x: primitive(),
  y: primitive(),
});

class PURE__Rectangle {
  height!: number;
  width!: number;
}

createModelSchema(PURE__Rectangle, {
  height: primitive(),
  width: primitive(),
});

class PURE__Geometry {
  points: PURE__Point[] = [];
}

createModelSchema(PURE__Geometry, {
  points: list(object(PURE__Point)),
});

class PURE__GeneralizationView {
  id!: string;
  source!: string;
  target!: string;
  geometry!: PURE__Geometry;
}

createModelSchema(PURE__GeneralizationView, {
  geometry: object(PURE__Geometry),
  id: primitive(),
  source: primitive(),
  target: primitive(),
});

class PURE__PropertyViewPropertyPointer {
  name!: string;
  owningType!: string;
}

createModelSchema(PURE__PropertyViewPropertyPointer, {
  name: primitive(),
  owningType: primitive(),
});

class PURE__PropertyView {
  id!: string;
  source!: string;
  target!: string;
  property!: PURE__PropertyViewPropertyPointer;
  geometry!: PURE__Geometry;
}

createModelSchema(PURE__PropertyView, {
  geometry: object(PURE__Geometry),
  id: primitive(),
  property: object(PURE__PropertyViewPropertyPointer),
  source: primitive(),
  target: primitive(),
});

class PURE__TypeView {
  id!: string;
  type!: string;
  position!: PURE__Point;
  rectangleGeometry!: PURE__Rectangle;
}

createModelSchema(PURE__TypeView, {
  id: primitive(),
  position: object(PURE__Point),
  rectangleGeometry: object(PURE__Rectangle),
  type: primitive(),
});

class PURE__Diagram {
  package!: string;
  name!: string;
  stereotypes: PURE__Steoreotype[] = [];
  taggedValues: PURE__TaggedValue[] = [];

  // associationViews
  generalizationViews: PURE__GeneralizationView[] = [];
  propertyViews: PURE__PropertyView[] = [];
  typeViews: PURE__TypeView[] = [];
  sourceInformation!: SourceInformation;
}

createModelSchema(PURE__Diagram, {
  name: primitive(),
  generalizationViews: list(object(PURE__GeneralizationView)),
  package: primitive(),
  propertyViews: list(object(PURE__PropertyView)),
  sourceInformation: TEMPORARY__diagramInfoSourceInformationSerializationSchema,
  stereotypes: list(object(PURE__Steoreotype)),
  taggedValues: list(object(PURE__TaggedValue)),
  typeViews: list(object(PURE__TypeView)),
});

// ----------------------------------- Diagram Info ---------------------------------------

class DiagramDomainInfo {
  // associations // skip these for now as we don't support association views
  classes: PURE__Class[] = [];
  enumerations: PURE__Enumeration[] = [];
  profiles: PURE__Profile[] = [];
}

createModelSchema(DiagramDomainInfo, {
  // associations
  classes: list(object(PURE__Class)),
  enumerations: list(object(PURE__Enumeration)),
  profiles: list(object(PURE__Profile)),
});

export class DiagramInfo {
  name!: string;
  diagram!: PURE__Diagram;
  domainInfo?: DiagramDomainInfo;
}

createModelSchema(DiagramInfo, {
  diagram: object(PURE__Diagram),
  name: primitive(),
  domainInfo: optional(object(DiagramDomainInfo)),
});

export class DiagramClassInfo {
  // associations
  class!: PURE__Class;
  enumerations: PURE__Enumeration[] = [];
  profiles: PURE__Profile[] = [];
  specializations: PURE__PackageableElementPointer[] = [];
}

createModelSchema(DiagramClassInfo, {
  // associations
  class: object(PURE__Class),
  enumerations: list(object(PURE__Enumeration)),
  profiles: list(object(PURE__Profile)),
  specializations: list(object(PURE__PackageableElementPointer)),
});

// ----------------------------------------- Serializer --------------------------------------------

/**
 * Serialize the diagram in Studio to Pure grammar for M2 DSL Diagram
 * so we can persist it.
 */
export const serializeDiagram = (diagram: Diagram): string => {
  const typeViews = diagram.classViews.map(
    (cv) =>
      `    TypeView ${cv.id}(\n` +
      `        type=${cv.class.value.path},\n` +
      `        position=(${cv.position.x.toFixed(5)}, ${cv.position.y.toFixed(
        5,
      )}),\n` +
      `        width=${cv.rectangle.width.toFixed(5)},\n` +
      `        height=${cv.rectangle.height.toFixed(5)},\n` +
      `        stereotypesVisible=true,\n` +
      `        attributesVisible=true,\n` +
      `        attributeStereotypesVisible=true,\n` +
      `        attributeTypesVisible=true,\n` +
      `        color=#FFFFCC,\n` +
      `        lineWidth=1.0)`,
  );

  const generalizationViews = diagram.generalizationViews.map(
    (gv, idx) =>
      // NOTE: the relationship views in Diagram protocols don't have an ID
      `    GeneralizationView gview_${idx}(\n` +
      `        source=${gv.from.classView.value.id},\n` +
      `        target=${gv.to.classView.value.id},\n` +
      `        points=[${gv
        .buildFullPath()
        .map((pos) => `(${pos.x.toFixed(5)},${pos.y.toFixed(5)})`)
        .join(',')}],\n` +
      `        label='',\n` +
      `        color=#000000,\n` +
      `        lineWidth=-1.0,\n` +
      `        lineStyle=SIMPLE)`,
  );

  const propertyViews = diagram.propertyViews.map(
    (pv, idx) =>
      `    PropertyView pview_${idx}(\n` +
      `        property=${pv.property.value._OWNER.path}.${pv.property.value.name},\n` +
      `        source=${pv.from.classView.value.id},\n` +
      `        target=${pv.to.classView.value.id},\n` +
      `        points=[${pv
        .buildFullPath()
        .map((pos) => `(${pos.x.toFixed(5)},${pos.y.toFixed(5)})`)
        .join(',')}],\n` +
      `        label='',\n` +
      `        propertyPosition=(0.0,0.0),\n` +
      `        multiplicityPosition=(0.0,0.0),\n` +
      `        color=#000000,\n` +
      `        lineWidth=-1.0,\n` +
      `        stereotypesVisible=true,\n` +
      `        nameVisible=true,\n` +
      `        lineStyle=SIMPLE)`,
  );

  return (
    `Diagram ${diagram.path}(width=0.0, height=0.0)\n` +
    `{\n` +
    `${[...typeViews, ...generalizationViews, ...propertyViews].join(
      '\n\n',
    )}\n` +
    `}`
  );
};

// ------------------------------ Graph builder (for diagram renderer) ----------------------------------

export interface DiagramClassMetadata {
  isStubbed: boolean;
  sourceInformation: SourceInformation | undefined;
}

const getOrCreateClass = (
  path: string,
  graph: PureModel,
  diagramClasses: Map<string, DiagramClassMetadata>,
  sourceInformation: SourceInformation | undefined,
): Class => {
  const existingClass = graph.getOwnNullableClass(path);
  if (!existingClass) {
    const [_package, name] = resolvePackagePathAndElementName(path);
    const _class = new Class(name);
    addElementToPackage(
      getOrCreatePackage(graph.root, _package, true, new Map()),
      _class,
    );
    graph.setOwnType(path, _class);
    diagramClasses.set(path, {
      isStubbed: true,
      sourceInformation,
    });
    return _class;
  }
  return existingClass;
};

const parseMultiplicty = (text: string): Multiplicity => {
  if (text === '*') {
    return new Multiplicity(0, undefined);
  } else {
    const parts = text.split('..');
    if (parts.length === 1) {
      return new Multiplicity(
        parseInt(guaranteeNonNullable(parts[0]), 10),
        parseInt(guaranteeNonNullable(parts[0]), 10),
      );
    } else if (parts.length === 2) {
      return new Multiplicity(
        parseInt(guaranteeNonNullable(parts[0]), 10),
        parts[1] === '*'
          ? undefined
          : parseInt(guaranteeNonNullable(parts[1]), 10),
      );
    }
    throw new Error(`Can't parse multiplicity value '${text}'`);
  }
};

const buildClass = (
  _class: Class,
  classData: PURE__Class,
  graph: PureModel,
  diagramClasses: Map<string, DiagramClassMetadata>,
): void => {
  classData.taggedValues.forEach((taggedValueData) => {
    addUniqueEntry(
      _class.taggedValues,
      new TaggedValue(
        TagExplicitReference.create(
          getTag(
            graph.getProfile(taggedValueData.tag.profile),
            taggedValueData.tag.value,
          ),
        ),
        taggedValueData.value,
      ),
    );
  });
  classData.stereotypes.forEach((stereotypeData) => {
    addUniqueEntry(
      _class.stereotypes,
      StereotypeExplicitReference.create(
        getStereotype(
          graph.getProfile(stereotypeData.profile),
          stereotypeData.value,
        ),
      ),
    );
  });
  classData.generalizations
    .filter((superTypeData) => Boolean(superTypeData.rawType))
    .forEach((superTypeData) => {
      const superClass = getOrCreateClass(
        guaranteeNonNullable(superTypeData.rawType),
        graph,
        diagramClasses,
        undefined,
      );
      addUniqueEntry(
        _class.generalizations,
        GenericTypeExplicitReference.create(new GenericType(superClass)),
      );
      addUniqueEntry(superClass._subclasses, _class);
    });
  classData.properties
    .filter((propertyData) => Boolean(propertyData.genericType.rawType))
    .forEach((propertyData) => {
      const newProperty = new Property(
        propertyData.name,
        parseMultiplicty(propertyData.multiplicity),
        GenericTypeExplicitReference.create(
          new GenericType(
            graph.getOwnNullableEnumeration(
              guaranteeNonNullable(propertyData.genericType.rawType),
            ) ??
              getOrCreateClass(
                guaranteeNonNullable(propertyData.genericType.rawType),
                graph,
                diagramClasses,
                undefined,
              ),
          ),
        ),
        _class,
      );
      newProperty.aggregation =
        propertyData.aggregation === 'Composite'
          ? AggregationKind.COMPOSITE
          : propertyData.aggregation === 'Shared'
            ? AggregationKind.SHARED
            : undefined;
      addUniqueEntry(_class.properties, newProperty);
    });
  classData.qualifiedProperties
    .filter((propertyData) => propertyData.genericType.rawType)
    .forEach((propertyData) => {
      addUniqueEntry(
        _class.derivedProperties,
        new DerivedProperty(
          propertyData.name,
          parseMultiplicty(propertyData.multiplicity),
          GenericTypeExplicitReference.create(
            new GenericType(
              graph.getOwnNullableEnumeration(
                guaranteeNonNullable(propertyData.genericType.rawType),
              ) ??
                getOrCreateClass(
                  guaranteeNonNullable(propertyData.genericType.rawType),
                  graph,
                  diagramClasses,
                  undefined,
                ),
            ),
          ),
          _class,
        ),
      );
    });
};

/**
 * Since the diagram renderer uses Studio metamodel, here we build
 * Studio metamodel graph and diagram from the Pure IDE diagram info
 * to make use of the renderer.
 */
export const buildGraphFromDiagramInfo = (
  diagramInfo: DiagramInfo,
): [Diagram, PureModel, Map<string, DiagramClassMetadata>] => {
  const graph = new PureModel(new CoreModel([]), new SystemModel([]), []);
  const diagramClasses = new Map<string, DiagramClassMetadata>();

  // domain
  if (diagramInfo.domainInfo) {
    const domain = diagramInfo.domainInfo;
    // first pass: add all the listed types and do really basic processing
    domain.classes.forEach((classData) => {
      const _class = new Class(classData.name);
      addElementToPackage(
        getOrCreatePackage(graph.root, classData.package, true, new Map()),
        _class,
      );
      graph.setOwnType(_class.path, _class);
      diagramClasses.set(_class.path, {
        sourceInformation: classData.sourceInformation,
        isStubbed: false,
      });
    });
    domain.profiles.forEach((profileData) => {
      const profile = new Profile(profileData.name);
      addElementToPackage(
        getOrCreatePackage(graph.root, profileData.package, true, new Map()),
        profile,
      );
      graph.setOwnProfile(profile.path, profile);
      profileData.tags.forEach((value) =>
        addUniqueEntry(profile.p_tags, new Tag(profile, value)),
      );
      profileData.stereotypes.forEach((value) =>
        addUniqueEntry(profile.p_stereotypes, new Stereotype(profile, value)),
      );
    });
    domain.enumerations.forEach((enumerationData) => {
      const enumeration = new Enumeration(enumerationData.name);
      addElementToPackage(
        getOrCreatePackage(
          graph.root,
          enumerationData.package,
          true,
          new Map(),
        ),
        enumeration,
      );
      graph.setOwnType(enumeration.path, enumeration);
      // NOTE: there is no need to pocess enumeration enum values since diagram does not need them
    });
    // second pass
    domain.classes.forEach((classData) => {
      const fullPath = `${classData.package}${
        classData.package === '' ? '' : ELEMENT_PATH_DELIMITER
      }${classData.name}`;
      const _class = graph.getClass(fullPath);
      buildClass(_class, classData, graph, diagramClasses);
    });
  }

  // diagram
  const diagramData = diagramInfo.diagram;
  const diagram = new Diagram(diagramData.name);
  addElementToPackage(
    getOrCreatePackage(graph.root, diagramData.package, true, new Map()),
    diagram,
  );

  diagramData.typeViews.forEach((typeViewData) => {
    const classView = new ClassView(
      diagram,
      typeViewData.id,
      PackageableElementExplicitReference.create(
        graph.getClass(typeViewData.type),
      ),
    );
    classView.position = new Point(
      typeViewData.position.x,
      typeViewData.position.y,
    );
    classView.rectangle = new Rectangle(
      typeViewData.rectangleGeometry.width,
      typeViewData.rectangleGeometry.height,
    );
    addUniqueEntry(diagram.classViews, classView);
  });

  diagramData.propertyViews.forEach((propertyViewData) => {
    const propertyView = new PropertyView(
      diagram,
      PropertyExplicitReference.create(
        getOwnProperty(
          graph.getClass(propertyViewData.property.owningType),
          propertyViewData.property.name,
        ),
      ),
      guaranteeNonNullable(
        diagram.classViews.find((cv) => cv.id === propertyViewData.source),
      ),
      guaranteeNonNullable(
        diagram.classViews.find((cv) => cv.id === propertyViewData.target),
      ),
    );
    propertyView.path = propertyViewData.geometry.points.map(
      (pointData) => new Point(pointData.x, pointData.y),
    );

    _relationshipView_simplifyPath(propertyView); // transform the line because we store only 2 end points that are inside points and we will calculate the offset
    addUniqueEntry(diagram.propertyViews, propertyView);
  });

  diagramData.generalizationViews.forEach((generationViewData) => {
    const generalizationView = new GeneralizationView(
      diagram,
      guaranteeNonNullable(
        diagram.classViews.find((cv) => cv.id === generationViewData.source),
      ),
      guaranteeNonNullable(
        diagram.classViews.find((cv) => cv.id === generationViewData.target),
      ),
    );
    generalizationView.path = generationViewData.geometry.points.map(
      (pointData) => new Point(pointData.x, pointData.y),
    );
    _relationshipView_simplifyPath(generalizationView); // transform the line because we store only 2 end points that are inside points and we will calculate the offset
    addUniqueEntry(diagram.generalizationViews, generalizationView);
  });

  return [diagram, graph, diagramClasses];
};

export const addClassToGraph = (
  diagramClassInfo: DiagramClassInfo,
  graph: PureModel,
  diagramClasses: Map<string, DiagramClassMetadata>,
): Class => {
  // profiles
  diagramClassInfo.profiles.forEach((profileData) => {
    const profilePath = `${profileData.package}${
      profileData.package === '' ? '' : ELEMENT_PATH_DELIMITER
    }${profileData.name}`;
    if (!graph.getOwnNullableProfile(profilePath)) {
      const profile = new Profile(profileData.name);
      addElementToPackage(
        getOrCreatePackage(graph.root, profileData.package, true, new Map()),
        profile,
      );
      graph.setOwnProfile(profile.path, profile);
      profileData.tags.forEach((value) =>
        addUniqueEntry(profile.p_tags, new Tag(profile, value)),
      );
      profileData.stereotypes.forEach((value) =>
        addUniqueEntry(profile.p_stereotypes, new Stereotype(profile, value)),
      );
    }
  });

  // enumerations
  diagramClassInfo.enumerations.forEach((enumerationData) => {
    const enumerationPath = `${enumerationData.package}${
      enumerationData.package === '' ? '' : ELEMENT_PATH_DELIMITER
    }${enumerationData.name}`;
    if (!graph.getOwnNullableEnumeration(enumerationPath)) {
      const enumeration = new Enumeration(enumerationData.name);
      addElementToPackage(
        getOrCreatePackage(
          graph.root,
          enumerationData.package,
          true,
          new Map(),
        ),
        enumeration,
      );
      graph.setOwnType(enumeration.path, enumeration);
      // NOTE: there is no need to pocess enumeration enum values since diagram does not need them
    }
  });

  const classData = diagramClassInfo.class;
  const classPath = `${classData.package}${
    classData.package === '' ? '' : ELEMENT_PATH_DELIMITER
  }${classData.name}`;
  let _class = graph.getOwnNullableClass(classPath);
  if (!_class) {
    _class = new Class(classData.name);
    addElementToPackage(
      getOrCreatePackage(graph.root, classData.package, true, new Map()),
      _class,
    );
    graph.setOwnType(_class.path, _class);
  }
  const isCurrentlyStubbed = diagramClasses.get(_class.path)?.isStubbed ?? true;
  diagramClasses.set(_class.path, {
    sourceInformation: classData.sourceInformation,
    isStubbed: false,
  });
  diagramClassInfo.specializations.forEach((subTypePointer) => {
    const currentClass = guaranteeNonNullable(_class);
    const subClass = getOrCreateClass(
      guaranteeNonNullable(
        `${subTypePointer.package}${
          subTypePointer.package === '' ? '' : ELEMENT_PATH_DELIMITER
        }${subTypePointer.name}`,
      ),
      graph,
      diagramClasses,
      subTypePointer.sourceInformation,
    );
    addUniqueEntry(currentClass._subclasses, subClass);
    if (
      !subClass.generalizations
        .map((generalization) => generalization.value.rawType)
        .includes(currentClass)
    ) {
      addUniqueEntry(
        subClass.generalizations,
        GenericTypeExplicitReference.create(new GenericType(currentClass)),
      );
    }
  });
  if (isCurrentlyStubbed) {
    buildClass(_class, classData, graph, diagramClasses);
  }
  return _class;
};
