/**
 * Copyright 2020 Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

export const testProject = {
  projectId: 'UAT-2689',
  description: 'sdlcTesting',
  tags: [],
  projectType: 'PROTOTYPE',
  name: 'TEST_SDLC'
};

export const testWorkspace = {
  projectId: 'UAT-2689',
  userId: 'testuser',
  workspaceId: 'UsedForEntitiesTest'
};

export const currentTestRevision = {
  authoredAt: 1572981425,
  committedAt: 1572981425,
  committerName: 'testuser',
  authorName: 'testuser',
  message: 'syncing with workspace from Studio [potentially affected 1 entity]',
  id: '70549de5bb154b022c0f3e1fb58dfd2d18c8026e'
};

export const testProjectConfig = {
  projectStructureVersion: { 'version': 6, 'extensionVersion': 1 },
  projectId: 'UAT-3502',
  projectType: 'PROTOTYPE',
  groupId: 'com.test',
  artifactId: 'string',
  projectDependencies: [],
  metamodelDependencies: [],
};

export const testLatestProjectStructureVersion = { 'version': 6, 'extensionVersion': 3 };

export const availableSchemaGenerations = [
  {
    'label': 'Avro',
    'properties': [
      {
        'defaultValue': 'true',
        'description': 'Adds namespace derived from package to Avro schema.',
        'name': 'includeNamespace',
        'required': false,
        'type': 'BOOLEAN'
      },
      {
        'defaultValue': 'true',
        'description': 'Includes properties from super types.',
        'name': 'includeSuperTypes',
        'required': false,
        'type': 'BOOLEAN'
      },
      {
        'defaultValue': 'true',
        'description': 'Includes properties from associations.',
        'name': 'includeAssociations',
        'required': false,
        'type': 'BOOLEAN'
      },
      {
        'defaultValue': 'false',
        'description': 'Includes generated milestoning properties.',
        'name': 'includeGeneratedMilestoning',
        'required': false,
        'type': 'BOOLEAN'
      },
      {
        'defaultValue': 'timestamp-micros',
        'description': 'Timestamp logical type. Default is timestamp-micros. Possible values: timestamp-millis, timestamp-micros, or any other registered types.',
        'name': 'timestampLogicalType',
        'required': false,
        'type': 'STRING'
      },
      {
        'defaultValue': '[]',
        'description': 'Generates properties from specified profile tags.',
        'items': { 'enums': [], 'types': ['STRING'] },
        'name': 'propertyProfile',
        'required': false,
        'type': 'ARRAY'
      },
      {
        'defaultValue': '{}',
        'description': 'Override namespace in generated schema.',
        'items': { 'enums': [], 'types': ['STRING', 'STRING'] },
        'name': 'namespaceOverride',
        'required': false,
        'type': 'MAP'
      }
    ],
    'type': 'avro'
  },
  { 'label': 'Rosetta', 'properties': [], 'type': 'cdm' },
  { 'label': 'JSON Schema', 'properties': [], 'type': 'jsonSchema' },
  { 'label': 'Protobuf', 'properties': [], 'type': 'protobuf' }
];

export const availableCodeGenerations = [
  {
    'label': 'Java',
    'properties': [
      {
        'defaultValue': 'meta::java::codeGeneration::ClassType.CONCRETE',
        'description': 'Generate Class or Interface',
        'items': {
          'enums': [
            'meta::java::codeGeneration::ClassType.INTERFACE',
            'meta::java::codeGeneration::ClassType.CONCRETE'
          ],
          'types': ['STRING']
        },
        'name': 'generationType',
        'required': true,
        'type': 'ENUM'
      },
      {
        'defaultValue': 'false',
        'description': 'Jackson annotations',
        'name': 'jsonAnnotations',
        'required': false,
        'type': 'BOOLEAN'
      },
      {
        'defaultValue': 'false',
        'description': 'Immutables Annotations for Immutables framework',
        'name': 'immutableAnnotations',
        'required': false,
        'type': 'BOOLEAN'
      },
      {
        'defaultValue': 'false',
        'description': 'Use jdkOnly collections in immutables generated style',
        'name': 'jdkOnlyImmutables',
        'required': false,
        'type': 'BOOLEAN'
      },
      {
        'defaultValue': 'false',
        'description': 'Generate Immutable classes',
        'name': 'immutable',
        'required': false,
        'type': 'BOOLEAN'
      },
      {
        'defaultValue': 'false',
        'description': 'Use java primitives i.e. int vs Integer',
        'name': 'useJavaPrimitives',
        'required': false,
        'type': 'BOOLEAN'
      },
      {
        'defaultValue': 'false',
        'description': 'Returns Optional<Property> for fields which are not required',
        'name': 'optionals',
        'required': false,
        'type': 'BOOLEAN'
      },
      {
        'defaultValue': 'false',
        'description': 'Replace all occurences of projected classes with said projection',
        'name': 'globalProjection',
        'required': false,
        'type': 'BOOLEAN'
      },
      {
        'defaultValue': 'false',
        'description': 'include subpackages',
        'name': 'recursive',
        'required': false,
        'type': 'BOOLEAN'
      },
      {
        'defaultValue': 'false',
        'description': 'include svn comment with the @Generated tag',
        'name': 'includeSvnInfo',
        'required': false,
        'type': 'BOOLEAN'
      },
      {
        'defaultValue': 'false',
        'description': 'Generates dynamic java beans -> http://www.cowtowncoder.com/blog/archives/2011/07/entry_458.html',
        'name': 'dynamicBeans',
        'required': false,
        'type': 'BOOLEAN'
      },
      {
        'defaultValue': 'false',
        'description': 'Include version hash in package name',
        'name': 'includeVersionHash',
        'required': false,
        'type': 'BOOLEAN'
      },
      {
        'defaultValue': 'null',
        'description': 'Include constant with the model version meta-data tag',
        'name': 'modelVersion',
        'required': false,
        'type': 'STRING'
      },
      {
        'defaultValue': 'false',
        'description': 'Include javax annotations(@Min, @Max, @Size, @NotNull, @Valid) on class properties',
        'name': 'javaxAnnotations',
        'required': false,
        'type': 'BOOLEAN'
      },
      {
        'defaultValue': 'false',
        'description': 'Include _UNKNOWN enum values for all enums',
        'name': 'includeUnknownEnumValue',
        'required': false,
        'type': 'BOOLEAN'
      },
      {
        'defaultValue': 'false',
        'description': 'Include immutables multiplicity checks.  Currently the Immutables framework does not support javaxAnnotations - https://github.com/immutables/immutables/issues/475',
        'name': 'includeMultiplicityCheckOnImmutables',
        'required': false,
        'type': 'BOOLEAN'
      },
      {
        'defaultValue': '[]',
        'description': 'Fully qualified path to a class which contains properties indicating which classes should be tagged with the supplied modelVersion',
        'items': { 'enums': [], 'types': ['STRING'] },
        'name': 'modelVersionClassFilter',
        'required': false,
        'type': 'ARRAY'
      }
    ],
    'type': 'java'
  }
];

export const availableSchemaImports = [
  {
    'label': 'JSON Schema',
    'type': 'jsonSchema'
  },
  {
    'label': 'XSD',
    'type': 'Xsd'
  }
];

export const availableCodeImports = [
  {
    'label': 'Java',
    'type': 'java'
  },
  {
    'label': 'Slang',
    'type': 'slang'
  }
];
