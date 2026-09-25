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
import { type PlainObject } from '@finos/legend-shared';
import { unitTest } from '@finos/legend-shared/test';
import { V1_taggedValueModelSchema } from '../serializationHelpers/V1_CoreSerializationHelper.js';
import { V1_TaggedValue } from '../../../model/packageableElements/domain/V1_TaggedValue.js';
import { V1_TagPtr } from '../../../model/packageableElements/domain/V1_TagPtr.js';
import { V1_transformTaggedValue } from '../../pureGraph/from/V1_DomainTransformer.js';
import { TaggedValue } from '../../../../../../../graph/metamodel/pure/packageableElements/domain/TaggedValue.js';
import { Tag } from '../../../../../../../graph/metamodel/pure/packageableElements/domain/Tag.js';
import { TagExplicitReference } from '../../../../../../../graph/metamodel/pure/packageableElements/domain/TagReference.js';
import { Profile } from '../../../../../../../graph/metamodel/pure/packageableElements/domain/Profile.js';
import { observe_TaggedValue } from '../../../../../../action/changeDetection/DomainObserverHelper.js';

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
