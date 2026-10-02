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

import { test, expect, describe } from '@jest/globals';
import { deserialize, serialize } from 'serializr';
import { guaranteeType, type PlainObject } from '@finos/legend-shared';
import { unitTest } from '@finos/legend-shared/test';
import {
  TEST__GraphManagerPluginManager,
  TEST__buildGraphWithEntities,
  TEST__getTestGraphManagerState,
} from '../../../../../../__test-utils__/GraphManagerTestUtils.js';
import {
  V1_deserializeValueSpecification,
  V1_serializeValueSpecification,
} from '../serializationHelpers/V1_ValueSpecificationSerializer.js';
import {
  V1_deserializeRawValueSpecification,
  V1_serializeRawValueSpecification,
} from '../serializationHelpers/V1_RawValueSpecificationSerializationHelper.js';
import { V1_taggedValueModelSchema } from '../serializationHelpers/V1_CoreSerializationHelper.js';
import { V1_TaggedValue } from '../../../model/packageableElements/domain/V1_TaggedValue.js';
import { V1_TagPtr } from '../../../model/packageableElements/domain/V1_TagPtr.js';
import { V1_transformTaggedValue } from '../../pureGraph/from/V1_DomainTransformer.js';
import { RawPrimitiveInstanceValue } from '../../../../../../../graph/metamodel/pure/rawValueSpecification/RawPrimitiveInstanceValue.js';
import { TaggedValue } from '../../../../../../../graph/metamodel/pure/packageableElements/domain/TaggedValue.js';
import { Tag } from '../../../../../../../graph/metamodel/pure/packageableElements/domain/Tag.js';
import { TagExplicitReference } from '../../../../../../../graph/metamodel/pure/packageableElements/domain/TagReference.js';
import { Profile } from '../../../../../../../graph/metamodel/pure/packageableElements/domain/Profile.js';
import { observe_RawPrimitiveInstanceValue } from '../../../../../../action/changeDetection/RawValueSpecificationObserver.js';
import { observe_TaggedValue } from '../../../../../../action/changeDetection/DomainObserverHelper.js';

const pluginManager = new TEST__GraphManagerPluginManager();
pluginManager.install();

type TestCase = [string, PlainObject, PlainObject];

const cases: TestCase[] = [
  [
    'Legacy format of CString',
    {
      _type: 'string',
      multiplicity: {
        lowerBound: 1,
        upperBound: 1,
      },
      values: ['hallo'],
    },
    {
      _type: 'string',
      value: 'hallo',
    },
  ],
  [
    'Legacy format of multi-line CString',
    {
      _type: 'string',
      multiLine: true,
      multiplicity: {
        lowerBound: 1,
        upperBound: 1,
      },
      values: ['line one\nline two'],
    },
    {
      _type: 'string',
      multiLine: true,
      value: 'line one\nline two',
    },
  ],
  [
    'Multi-line CString',
    {
      _type: 'string',
      multiLine: true,
      value: 'line one\nline two',
    },
    {
      _type: 'string',
      multiLine: true,
      value: 'line one\nline two',
    },
  ],
  [
    'Single-line CString does not emit the multi-line flag',
    {
      _type: 'string',
      multiLine: false,
      value: 'hallo',
    },
    {
      _type: 'string',
      value: 'hallo',
    },
  ],
  [
    'Empty CString with multiplicity of one is converted to an empty string',
    {
      _type: 'string',
      multiplicity: {
        lowerBound: 0,
        upperBound: 1,
      },
      values: [],
    },
    {
      _type: 'string',
      value: '',
    },
  ],
  [
    'Legacy format of CBoolean',
    {
      _type: 'boolean',
      multiplicity: {
        lowerBound: 1,
        upperBound: 1,
      },
      values: [true],
    },
    {
      _type: 'boolean',
      value: true,
    },
  ],
  [
    'Legacy format of CDecimal',
    {
      _type: 'decimal',
      multiplicity: {
        lowerBound: 1,
        upperBound: 1,
      },
      values: [123.1],
    },
    {
      _type: 'decimal',
      value: 123.1,
    },
  ],
  [
    'Legacy format of CFloat',
    {
      _type: 'float',
      multiplicity: {
        lowerBound: 1,
        upperBound: 1,
      },
      values: [123.1],
    },
    {
      _type: 'float',
      value: 123.1,
    },
  ],
  [
    'Legacy format of CInteger',
    {
      _type: 'integer',
      multiplicity: {
        lowerBound: 1,
        upperBound: 1,
      },
      values: [1],
    },
    {
      _type: 'integer',
      value: 1,
    },
  ],
  [
    'Legacy format of CDateTime',
    {
      _type: 'dateTime',
      multiplicity: {
        lowerBound: 1,
        upperBound: 1,
      },
      values: ['2022-01-26'],
    },
    {
      _type: 'dateTime',
      value: '2022-01-26',
    },
  ],
  [
    'Legacy format of CStrictDate',
    {
      _type: 'strictDate',
      multiplicity: {
        lowerBound: 1,
        upperBound: 1,
      },
      values: ['2022-01-26'],
    },
    {
      _type: 'strictDate',
      value: '2022-01-26',
    },
  ],
  [
    'Legacy format of CStrictTime',
    {
      _type: 'strictTime',
      multiplicity: {
        lowerBound: 1,
        upperBound: 1,
      },
      values: ['22:00:00'],
    },
    {
      _type: 'strictTime',
      value: '22:00:00',
    },
  ],
  [
    'Legacy format of CLatestDate',
    {
      _type: 'latestDate',
    },
    {
      _type: 'latestDate',
    },
  ],
  [
    'Legacy format of CLatestDate',
    {
      _type: 'latestDate',
    },
    {
      _type: 'latestDate',
    },
  ],
  [
    'Legacy format of graph fetch tree',
    {
      _type: 'rootGraphFetchTree',
      class: 'demo::other::NPerson',
      subTrees: [
        {
          _type: 'propertyGraphFetchTree',
          parameters: [],
          property: 'fullName',
          subTrees: [],
          subTypeTrees: [],
        },
      ],
      subTypeTrees: [],
    },
    {
      _type: 'classInstance',
      multiplicity: {
        lowerBound: 1,
        upperBound: 1,
      },
      type: 'rootGraphFetchTree',
      value: {
        _type: 'rootGraphFetchTree',
        class: 'demo::other::NPerson',
        subTrees: [
          {
            _type: 'propertyGraphFetchTree',
            parameters: [],
            property: 'fullName',
            subTrees: [],
            subTypeTrees: [],
          },
        ],
        subTypeTrees: [],
      },
    },
  ],
  [
    'Auto conversion for primitive instance value without value to collection',
    {
      _type: 'string',
      values: [],
    },
    {
      _type: 'collection',
      multiplicity: {
        lowerBound: 0,
        upperBound: 0,
      },
      values: [],
    },
  ],
  [
    'Hacked-class used in @cast expression',
    {
      _type: 'hackedClass',
      fullPath: 'Integer',
    },
    {
      _type: 'genericTypeInstance',
      genericType: {
        rawType: {
          _type: 'packageableType',
          fullPath: 'Integer',
        },
      },
    },
  ],
];

describe(
  unitTest('Value specification backward-compatible serialization'),
  () => {
    test.each(cases)(
      '%s',
      async (
        testName: TestCase[0],
        before: TestCase[2],
        after: TestCase[2],
      ) => {
        const json = V1_serializeValueSpecification(
          V1_deserializeValueSpecification(
            before,
            pluginManager.getPureProtocolProcessorPlugins(),
          ),
          pluginManager.getPureProtocolProcessorPlugins(),
        );
        expect(json).toEqual(after);
        // do an additional roundtrip
        expect(after).toEqual(
          V1_serializeValueSpecification(
            V1_deserializeValueSpecification(
              after,
              pluginManager.getPureProtocolProcessorPlugins(),
            ),
            pluginManager.getPureProtocolProcessorPlugins(),
          ),
        );
      },
    );
  },
);

const rawCases: TestCase[] = [
  [
    'Multi-line raw CString',
    {
      _type: 'string',
      multiLine: true,
      value: 'line one\nline two',
    },
    {
      _type: 'string',
      multiLine: true,
      value: 'line one\nline two',
    },
  ],
  [
    // engine omits this flag from the wire when it is `false`, we must do the same
    'Single-line raw CString does not emit the multi-line flag',
    {
      _type: 'string',
      multiLine: false,
      value: 'hallo',
    },
    {
      _type: 'string',
      value: 'hallo',
    },
  ],
  [
    'Legacy format of multi-line raw CString',
    {
      _type: 'string',
      multiLine: true,
      values: ['line one\nline two'],
    },
    {
      _type: 'string',
      multiLine: true,
      value: 'line one\nline two',
    },
  ],
];

describe(unitTest('Raw value specification serialization'), () => {
  test.each(rawCases)(
    '%s',
    (testName: TestCase[0], before: TestCase[1], after: TestCase[2]) => {
      expect(
        V1_serializeRawValueSpecification(
          V1_deserializeRawValueSpecification(before),
        ),
      ).toEqual(after);
      // do an additional roundtrip
      expect(
        V1_serializeRawValueSpecification(
          V1_deserializeRawValueSpecification(after),
        ),
      ).toEqual(after);
    },
  );

  test('Multi-line flag survives the metamodel roundtrip', async () => {
    const graphManagerState = TEST__getTestGraphManagerState();
    await TEST__buildGraphWithEntities(graphManagerState, []);
    const json = {
      _type: 'string',
      multiLine: true,
      value: 'line one\nline two',
    };

    const metamodel = guaranteeType(
      graphManagerState.graphManager.buildRawValueSpecification(
        json,
        graphManagerState.graph,
      ),
      RawPrimitiveInstanceValue,
    );
    expect(metamodel.value).toBe('line one\nline two');
    expect(metamodel.multiLine).toBe(true);

    expect(
      graphManagerState.graphManager.serializeRawValueSpecification(metamodel),
    ).toEqual(json);

    // the flag must be observable, else change detection would not pick up a toggle
    observe_RawPrimitiveInstanceValue(metamodel);
    metamodel.multiLine = false;
    expect(
      graphManagerState.graphManager.serializeRawValueSpecification(metamodel),
    ).toEqual({ _type: 'string', value: 'line one\nline two' });
  });
});

const TEST__buildTaggedValue = (
  value: string,
  multiLine: boolean,
): V1_TaggedValue => {
  const taggedValue = new V1_TaggedValue();
  taggedValue.tag = new V1_TagPtr();
  taggedValue.tag.profile = 'meta::pure::profiles::doc';
  taggedValue.tag.value = 'doc';
  taggedValue.value = value;
  taggedValue.multiLine = multiLine;
  return taggedValue;
};

const TEST__buildTaggedValueJSON = (value: unknown): PlainObject => ({
  tag: { profile: 'meta::pure::profiles::doc', value: 'doc' },
  value,
});

describe(unitTest('Tagged value backward-compatible serialization'), () => {
  test('Legacy plain string value deserializes', () => {
    const taggedValue = deserialize(
      V1_taggedValueModelSchema,
      TEST__buildTaggedValueJSON('a doc'),
    );
    expect(taggedValue.value).toBe('a doc');
    expect(taggedValue.multiLine).toBe(false);
  });

  test('Legacy plain string value with newlines deserializes as single-line', () => {
    const taggedValue = deserialize(
      V1_taggedValueModelSchema,
      TEST__buildTaggedValueJSON('line one\nline two'),
    );
    expect(taggedValue.value).toBe('line one\nline two');
    expect(taggedValue.multiLine).toBe(false);
  });

  test('Object value deserializes', () => {
    const taggedValue = deserialize(
      V1_taggedValueModelSchema,
      TEST__buildTaggedValueJSON({
        _type: 'string',
        multiLine: true,
        value: 'line one\nline two',
      }),
    );
    expect(taggedValue.value).toBe('line one\nline two');
    expect(taggedValue.multiLine).toBe(true);
  });

  test('Object value without the flag deserializes as single-line', () => {
    const taggedValue = deserialize(
      V1_taggedValueModelSchema,
      TEST__buildTaggedValueJSON({ _type: 'string', value: 'a doc' }),
    );
    expect(taggedValue.value).toBe('a doc');
    expect(taggedValue.multiLine).toBe(false);
  });

  test('Single-line value serializes to the legacy shape', () => {
    expect(
      serialize(
        V1_taggedValueModelSchema,
        TEST__buildTaggedValue('a doc', false),
      ),
    ).toEqual(TEST__buildTaggedValueJSON('a doc'));
  });

  test('Multi-line value serializes to an object', () => {
    expect(
      serialize(
        V1_taggedValueModelSchema,
        TEST__buildTaggedValue('line one\nline two', true),
      ),
    ).toEqual(
      TEST__buildTaggedValueJSON({
        _type: 'string',
        multiLine: true,
        value: 'line one\nline two',
      }),
    );
  });

  test('Both shapes roundtrip', () => {
    [
      TEST__buildTaggedValue('a doc', false),
      TEST__buildTaggedValue('line one\nline two', true),
    ].forEach((original) => {
      const reread = deserialize(
        V1_taggedValueModelSchema,
        serialize(V1_taggedValueModelSchema, original),
      );
      expect(reread.value).toBe(original.value);
      expect(reread.multiLine).toBe(original.multiLine);
    });
  });

  test('Toggling the multi-line flag changes the hash', () => {
    const profile = new Profile('doc');
    const tag = new Tag(profile, 'doc');
    const taggedValue = observe_TaggedValue(
      new TaggedValue(TagExplicitReference.create(tag), 'a doc'),
    );
    const hash = taggedValue.hashCode;

    taggedValue.multiLine = true;

    expect(taggedValue.hashCode).not.toBe(hash);
    expect(V1_transformTaggedValue(taggedValue).hashCode).toBe(
      taggedValue.hashCode,
    );
  });
});
