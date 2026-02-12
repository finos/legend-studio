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

import { describe, test, expect } from '@jest/globals';
import { unitTest } from '@finos/legend-shared/test';
import {
  ResolvedDataSpaceEntityWithOrigin,
  extractDataSpaceInfo,
} from '../DataSpaceInfo.js';
import { DepotEntityWithOrigin } from '@finos/legend-storage';
import {
  SNAPSHOT_VERSION_ALIAS,
  type StoredEntity,
} from '@finos/legend-server-depot';
import { DATA_SPACE_ELEMENT_CLASSIFIER_PATH } from '../../../graph-manager/protocol/pure/DSL_DataSpace_PureProtocolProcessorPlugin.js';

describe(unitTest('ResolvedDataSpaceEntityWithOrigin'), () => {
  test('should create with origin', () => {
    const origin = {
      groupId: 'com.example',
      artifactId: 'my-artifact',
      versionId: '1.0.0',
    };
    const dataSpace = new ResolvedDataSpaceEntityWithOrigin(
      origin,
      'My DataSpace',
      'MyDataSpace',
      'model::domain::MyDataSpace',
      'default',
    );

    expect(dataSpace.origin).toBe(origin);
    expect(dataSpace.title).toBe('My DataSpace');
    expect(dataSpace.name).toBe('MyDataSpace');
    expect(dataSpace.path).toBe('model::domain::MyDataSpace');
    expect(dataSpace.classifierPath).toBe(DATA_SPACE_ELEMENT_CLASSIFIER_PATH);
    expect(dataSpace.defaultExecutionContext).toBe('default');
  });

  test('should create without origin', () => {
    const dataSpace = new ResolvedDataSpaceEntityWithOrigin(
      undefined,
      'My DataSpace',
      'MyDataSpace',
      'model::domain::MyDataSpace',
      'default',
    );

    expect(dataSpace.origin).toBeUndefined();
    expect(dataSpace.title).toBe('My DataSpace');
    expect(dataSpace.name).toBe('MyDataSpace');
  });

  test('should extend DepotEntityWithOrigin', () => {
    const origin = {
      groupId: 'group',
      artifactId: 'artifact',
      versionId: 'version',
    };
    const dataSpace = new ResolvedDataSpaceEntityWithOrigin(
      origin,
      'Title',
      'Name',
      'path',
      'context',
    );

    expect(dataSpace).toBeInstanceOf(ResolvedDataSpaceEntityWithOrigin);
    expect(dataSpace).toBeInstanceOf(DepotEntityWithOrigin);
  });

  test('should handle undefined title and defaultExecutionContext', () => {
    const origin = {
      groupId: 'group',
      artifactId: 'artifact',
      versionId: 'version',
    };
    const dataSpace = new ResolvedDataSpaceEntityWithOrigin(
      origin,
      undefined,
      'Name',
      'path',
      undefined,
    );

    expect(dataSpace.title).toBeUndefined();
    expect(dataSpace.defaultExecutionContext).toBeUndefined();
  });

  test('should access origin properties through inheritance', () => {
    const origin = {
      groupId: 'com.example',
      artifactId: 'artifact',
      versionId: '2.0.0',
    };
    const dataSpace = new ResolvedDataSpaceEntityWithOrigin(
      origin,
      'Title',
      'Name',
      'path',
      'context',
    );

    expect(dataSpace.origin?.groupId).toBe('com.example');
    expect(dataSpace.origin?.artifactId).toBe('artifact');
    expect(dataSpace.origin?.versionId).toBe('2.0.0');
  });
});

describe(unitTest('extractDataSpaceInfo'), () => {
  test('should extract DataSpace info from StoredEntity with all properties', () => {
    const storedEntity: StoredEntity = {
      groupId: 'com.example.group',
      artifactId: 'my-artifact',
      versionId: '1.0.0',
      entity: {
        path: 'model::domain::MyDataSpace',
        classifierPath: 'meta::pure::metamodel::dataSpace::DataSpace',
        content: {
          _type: 'dataSpace',
          name: 'MyDataSpace',
          package: 'model::domain',
          title: 'My DataSpace Title',
          defaultExecutionContext: 'Production',
        },
      },
    };

    const result = extractDataSpaceInfo(storedEntity, false);

    expect(result).toBeInstanceOf(ResolvedDataSpaceEntityWithOrigin);
    expect(result.origin?.groupId).toBe('com.example.group');
    expect(result.origin?.artifactId).toBe('my-artifact');
    expect(result.origin?.versionId).toBe('1.0.0');
    expect(result.title).toBe('My DataSpace Title');
    expect(result.name).toBe('MyDataSpace');
    expect(result.path).toBe('model::domain::MyDataSpace');
    expect(result.classifierPath).toBe(
      'meta::pure::metamodel::dataSpace::DataSpace',
    );
    expect(result.defaultExecutionContext).toBe('Production');
  });

  test('should use SNAPSHOT_VERSION_ALIAS when isSnapshot is true', () => {
    const storedEntity: StoredEntity = {
      groupId: 'com.example',
      artifactId: 'artifact',
      versionId: '1.0.0',
      entity: {
        path: 'model::MyDataSpace',
        classifierPath: 'meta::pure::metamodel::dataSpace::DataSpace',
        content: {
          _type: 'dataSpace',
          name: 'MyDataSpace',
          title: 'Title',
          defaultExecutionContext: 'default',
        },
      },
    };

    const result = extractDataSpaceInfo(storedEntity, true);

    expect(result.origin?.versionId).toBe(SNAPSHOT_VERSION_ALIAS);
  });

  test('should use actual versionId when isSnapshot is false', () => {
    const storedEntity: StoredEntity = {
      groupId: 'com.example',
      artifactId: 'artifact',
      versionId: '2.3.4',
      entity: {
        path: 'model::MyDataSpace',
        classifierPath: 'meta::pure::metamodel::dataSpace::DataSpace',
        content: {
          _type: 'dataSpace',
          name: 'MyDataSpace',
          title: 'Title',
          defaultExecutionContext: 'default',
        },
      },
    };

    const result = extractDataSpaceInfo(storedEntity, false);

    expect(result.origin?.versionId).toBe('2.3.4');
  });

  test('should handle missing title (non-string)', () => {
    const storedEntity: StoredEntity = {
      groupId: 'com.example',
      artifactId: 'artifact',
      versionId: '1.0.0',
      entity: {
        path: 'model::MyDataSpace',
        classifierPath: 'meta::pure::metamodel::dataSpace::DataSpace',
        content: {
          _type: 'dataSpace',
          name: 'MyDataSpace',
          defaultExecutionContext: 'default',
        },
      },
    };

    const result = extractDataSpaceInfo(storedEntity, false);

    expect(result.title).toBeUndefined();
  });

  test('should handle missing defaultExecutionContext (non-string)', () => {
    const storedEntity: StoredEntity = {
      groupId: 'com.example',
      artifactId: 'artifact',
      versionId: '1.0.0',
      entity: {
        path: 'model::MyDataSpace',
        classifierPath: 'meta::pure::metamodel::dataSpace::DataSpace',
        content: {
          _type: 'dataSpace',
          name: 'MyDataSpace',
          title: 'Title',
        },
      },
    };

    const result = extractDataSpaceInfo(storedEntity, false);

    expect(result.defaultExecutionContext).toBeUndefined();
  });

  test('should extract entity name from path', () => {
    const storedEntity: StoredEntity = {
      groupId: 'com.example',
      artifactId: 'artifact',
      versionId: '1.0.0',
      entity: {
        path: 'model::complex::nested::path::EntityName',
        classifierPath: 'meta::pure::metamodel::dataSpace::DataSpace',
        content: {
          _type: 'dataSpace',
          title: 'Title',
          defaultExecutionContext: 'default',
        },
      },
    };

    const result = extractDataSpaceInfo(storedEntity, false);

    expect(result.name).toBe('EntityName');
    expect(result.path).toBe('model::complex::nested::path::EntityName');
  });

  test('should handle numeric values for title and defaultExecutionContext', () => {
    const storedEntity: StoredEntity = {
      groupId: 'com.example',
      artifactId: 'artifact',
      versionId: '1.0.0',
      entity: {
        path: 'model::MyDataSpace',
        classifierPath: 'meta::pure::metamodel::dataSpace::DataSpace',
        content: {
          _type: 'dataSpace',
          name: 'MyDataSpace',
          title: 123, // non-string
          defaultExecutionContext: 456, // non-string
        },
      },
    };

    const result = extractDataSpaceInfo(storedEntity, false);

    expect(result.title).toBeUndefined();
    expect(result.defaultExecutionContext).toBeUndefined();
  });

  test('should preserve classifierPath from stored entity', () => {
    const storedEntity: StoredEntity = {
      groupId: 'com.example',
      artifactId: 'artifact',
      versionId: '1.0.0',
      entity: {
        path: 'model::MyDataSpace',
        classifierPath: 'meta::pure::metamodel::dataSpace::DataSpace',
        content: {
          _type: 'dataSpace',
          name: 'MyDataSpace',
          title: 'Title',
          defaultExecutionContext: 'default',
        },
      },
    };

    const result = extractDataSpaceInfo(storedEntity, false);

    expect(result.classifierPath).toBe(
      'meta::pure::metamodel::dataSpace::DataSpace',
    );
  });
});
