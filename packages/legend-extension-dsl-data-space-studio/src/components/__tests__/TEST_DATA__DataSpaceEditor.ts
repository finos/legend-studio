/**
 * Copyright (c) 2026-present, Goldman Sachs
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

// The advanced data space test case (`DSL_DataSpace-advanced.pure` in legend-manual-tests): one execution
// context, a service and a template query executable, two diagrams, four elements (two excluded) and
// combined support info with a support URL
export const TEST_DATA__DataSpaceEditor = [
  {
    path: 'model::DummyClass',
    classifierPath: 'meta::pure::metamodel::type::Class',
    content: {
      _type: 'class',
      constraints: [],
      name: 'DummyClass',
      originalMilestonedProperties: [],
      package: 'model',
      properties: [],
      qualifiedProperties: [],
      stereotypes: [],
      superTypes: [],
      taggedValues: [],
    },
  },
  {
    path: 'domain::DummyDomain',
    classifierPath: 'meta::pure::metamodel::type::Class',
    content: {
      _type: 'class',
      constraints: [],
      name: 'DummyDomain',
      originalMilestonedProperties: [],
      package: 'domain',
      properties: [],
      qualifiedProperties: [],
      stereotypes: [],
      superTypes: [],
      taggedValues: [],
    },
  },
  {
    path: 'model::DummyEnum',
    classifierPath: 'meta::pure::metamodel::type::Enumeration',
    content: {
      _type: 'Enumeration',
      name: 'DummyEnum',
      package: 'model',
      stereotypes: [],
      taggedValues: [],
      values: [],
    },
  },
  {
    path: 'model::target::_DummyEnum',
    classifierPath: 'meta::pure::metamodel::type::Enumeration',
    content: {
      _type: 'Enumeration',
      name: '_DummyEnum',
      package: 'model::target',
      stereotypes: [],
      taggedValues: [],
      values: [],
    },
  },
  {
    path: 'model::DummyMapping',
    classifierPath: 'meta::pure::mapping::Mapping',
    content: {
      _type: 'mapping',
      associationMappings: [],
      classMappings: [],
      enumerationMappings: [],
      includedMappings: [],
      name: 'DummyMapping',
      package: 'model',
      tests: [],
    },
  },
  {
    path: 'model::DummyRuntime',
    classifierPath: 'meta::pure::runtime::PackageableRuntime',
    content: {
      _type: 'runtime',
      name: 'DummyRuntime',
      package: 'model',
      runtimeValue: {
        _type: 'engineRuntime',
        connectionStores: [],
        connections: [],
        mappings: [
          {
            path: 'model::DummyMapping',
            type: 'MAPPING',
          },
        ],
      },
    },
  },
  {
    path: 'model::DummyDiagram',
    classifierPath: 'meta::pure::metamodel::diagram::Diagram',
    content: {
      _type: 'diagram',
      classViews: [],
      generalizationViews: [],
      name: 'DummyDiagram',
      package: 'model',
      propertyViews: [],
    },
  },
  {
    path: 'model::MyService',
    classifierPath: 'meta::legend::service::metamodel::Service',
    content: {
      _type: 'service',
      autoActivateUpdates: true,
      documentation: '',
      execution: {
        _type: 'pureSingleExecution',
        func: {
          _type: 'lambda',
          body: [
            {
              _type: 'string',
              value: '',
            },
          ],
          parameters: [],
        },
        mapping: 'model::DummyMapping',
        runtime: {
          _type: 'runtimePointer',
          runtime: 'model::DummyRuntime',
        },
      },
      name: 'MyService',
      owners: [],
      package: 'model',
      pattern: '/somePattern',
      postValidations: [],
      stereotypes: [],
      taggedValues: [],
      testSuites: [],
    },
  },
  {
    path: 'model::dataSpace',
    classifierPath: 'meta::pure::metamodel::dataSpace::DataSpace',
    content: {
      _type: 'dataSpace',
      defaultExecutionContext: 'Context 1',
      description: 'some description',
      diagrams: [
        {
          description: 'some information about the diagram',
          diagram: {
            path: 'model::DummyDiagram',
          },
          title: 'Diag 1',
        },
        {
          diagram: {
            path: 'model::DummyDiagram',
          },
          title: 'Diag 2',
        },
      ],
      elements: [
        {
          path: 'model',
        },
        {
          path: 'domain::DummyDomain',
        },
        {
          exclude: true,
          path: 'model::DummyClass',
        },
        {
          exclude: true,
          path: 'model::target',
        },
      ],
      executables: [
        {
          _type: 'dataSpacePackageableElementExecutable',
          description: 'some information about the executable',
          executable: {
            path: 'model::MyService',
          },
          title: 'Exec 1',
        },
        {
          _type: 'dataSpaceTemplateExecutable',
          executionContextKey: 'Context 1',
          id: 'template_id',
          query: {
            _type: 'lambda',
            body: [
              {
                _type: 'string',
                value: '',
              },
            ],
            parameters: [],
          },
          title: 'this is template',
        },
      ],
      executionContexts: [
        {
          defaultRuntime: {
            path: 'model::DummyRuntime',
            type: 'RUNTIME',
          },
          description: 'some information about the context',
          mapping: {
            path: 'model::DummyMapping',
            type: 'MAPPING',
          },
          name: 'Context 1',
          title: 'Context 1 Title',
        },
      ],
      name: 'dataSpace',
      package: 'model',
      stereotypes: [
        {
          profile: 'meta::pure::profiles::typemodifiers',
          value: 'abstract',
        },
      ],
      supportInfo: {
        _type: 'combined',
        documentationUrl: 'https://example.org',
        emails: ['someEmail@test.org', 'someEmail2@test.org'],
        faqUrl: 'https://example.org/faq',
        supportUrl: 'https://example.org/support',
        website: 'https://example.org/website',
      },
      taggedValues: [
        {
          tag: {
            profile: 'doc',
            value: 'doc',
          },
          value: 'bla',
        },
      ],
      title: 'Untitled',
    },
  },
];
