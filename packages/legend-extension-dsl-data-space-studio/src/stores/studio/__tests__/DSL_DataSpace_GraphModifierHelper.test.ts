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

import { describe, test, expect } from '@jest/globals';
import { unitTest } from '@finos/legend-shared/test';
import {
  Class,
  DataProduct,
  Mapping,
  PackageableElementExplicitReference,
} from '@finos/legend-graph';
import {
  DataSpace,
  DataSpaceElementPointer,
  DataSpaceExecutionContext,
  DataSpaceMappingProvider,
  DataSpacePackageableElementExecutable,
  DataSpaceSupportCombinedInfo,
} from '@finos/legend-extension-dsl-data-space/graph';
import {
  dataSpace_combined_deleteEmail,
  dataSpace_combined_setSupportUrl,
  dataSpace_removeElement,
  dataSpace_removeExecutable,
  dataSpace_removeExecutionContext,
  dataSpace_setExecutionContextMapping,
  dataSpace_setExecutionContextMappingProvider,
} from '../DSL_DataSpace_GraphModifierHelper.js';

const createElementPointer = (path: string): DataSpaceElementPointer => {
  const pointer = new DataSpaceElementPointer();
  pointer.element = PackageableElementExplicitReference.create(new Class(path));
  return pointer;
};

const createExecutable = (
  title: string,
): DataSpacePackageableElementExecutable => {
  const executable = new DataSpacePackageableElementExecutable();
  executable.title = title;
  executable.executable = PackageableElementExplicitReference.create(
    new Class(title),
  );
  return executable;
};

const createExecutionContext = (name: string): DataSpaceExecutionContext => {
  const context = new DataSpaceExecutionContext();
  context.name = name;
  return context;
};

const createMappingProvider = (): DataSpaceMappingProvider => {
  const provider = new DataSpaceMappingProvider();
  provider.element = PackageableElementExplicitReference.create(
    new DataProduct('MyDataProduct'),
  );
  provider.keys = ['group'];
  return provider;
};

describe('removing from a data space list', () => {
  test(
    unitTest(
      'Removing an element that is no longer in the list leaves the others',
    ),
    () => {
      const dataSpace = new DataSpace('MyDataSpace');
      const model = createElementPointer('model');
      const target = createElementPointer('target');
      dataSpace.elements = [model, target];

      dataSpace_removeElement(dataSpace, model);
      expect(dataSpace.elements).toEqual([target]);

      // a second click on the same row before the list redraws
      dataSpace_removeElement(dataSpace, model);
      expect(dataSpace.elements).toEqual([target]);
    },
  );

  test(
    unitTest(
      'Removing an executable that is no longer in the list leaves the others',
    ),
    () => {
      const dataSpace = new DataSpace('MyDataSpace');
      const first = createExecutable('first');
      const second = createExecutable('second');
      dataSpace.executables = [first, second];

      dataSpace_removeExecutable(dataSpace, first);
      dataSpace_removeExecutable(dataSpace, first);
      expect(dataSpace.executables).toEqual([second]);
    },
  );

  test(
    unitTest(
      'Removing an execution context that is no longer in the list leaves the others',
    ),
    () => {
      const dataSpace = new DataSpace('MyDataSpace');
      const first = createExecutionContext('first');
      const second = createExecutionContext('second');
      dataSpace.executionContexts = [first, second];
      dataSpace.defaultExecutionContext = second;

      dataSpace_removeExecutionContext(dataSpace, first);
      dataSpace_removeExecutionContext(dataSpace, first);
      expect(dataSpace.executionContexts).toEqual([second]);
      expect(dataSpace.defaultExecutionContext).toBe(second);
    },
  );

  test(
    unitTest(
      'Removing an email that is no longer in the list leaves the others',
    ),
    () => {
      const supportInfo = new DataSpaceSupportCombinedInfo();
      supportInfo.emails = ['a@example.org', 'b@example.org'];

      dataSpace_combined_deleteEmail(supportInfo, 'a@example.org');
      dataSpace_combined_deleteEmail(supportInfo, 'a@example.org');
      expect(supportInfo.emails).toEqual(['b@example.org']);
    },
  );
});

test(unitTest('Set the support URL of combined support info'), () => {
  const supportInfo = new DataSpaceSupportCombinedInfo();
  dataSpace_combined_setSupportUrl(supportInfo, 'https://example.org/support');
  expect(supportInfo.supportUrl).toBe('https://example.org/support');
});

describe('mapping source of an execution context', () => {
  test(unitTest('Setting a mapping drops the mapping provider'), () => {
    const context = createExecutionContext('context');
    context.mappingProvider = createMappingProvider();

    dataSpace_setExecutionContextMapping(
      context,
      PackageableElementExplicitReference.create(new Mapping('MyMapping')),
    );
    expect(context.mapping?.value.name).toBe('MyMapping');
    expect(context.mappingProvider).toBeUndefined();
  });

  test(unitTest('Setting a mapping provider drops the mapping'), () => {
    const context = createExecutionContext('context');
    context.mapping = PackageableElementExplicitReference.create(
      new Mapping('MyMapping'),
    );

    dataSpace_setExecutionContextMappingProvider(
      context,
      createMappingProvider(),
    );
    expect(context.mappingProvider?.keys).toEqual(['group']);
    expect(context.mapping).toBeUndefined();
  });

  test(unitTest('Clearing one mapping source keeps the other'), () => {
    const context = createExecutionContext('context');
    const mapping = PackageableElementExplicitReference.create(
      new Mapping('MyMapping'),
    );
    context.mapping = mapping;
    context.mappingProvider = createMappingProvider();

    dataSpace_setExecutionContextMappingProvider(context, undefined);
    expect(context.mappingProvider).toBeUndefined();
    expect(context.mapping).toBe(mapping);

    context.mappingProvider = createMappingProvider();
    dataSpace_setExecutionContextMapping(context, undefined);
    expect(context.mapping).toBeUndefined();
    expect(context.mappingProvider).toBeDefined();
  });
});
