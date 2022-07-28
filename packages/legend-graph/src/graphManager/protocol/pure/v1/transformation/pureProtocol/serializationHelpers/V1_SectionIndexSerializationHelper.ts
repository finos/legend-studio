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
  type PlainObject,
  usingConstantValueSchema,
} from '@finos/legend-shared';
import {
  createModelSchema,
  list,
  custom,
  SKIP,
  deserialize,
  primitive,
  serialize,
} from 'serializr';
import {
  type V1_Section,
  V1_ImportAwareCodeSection,
  V1_DefaultCodeSection,
} from '../../../model/packageableElements/section/V1_Section.js';
import { V1_SectionIndex } from '../../../model/packageableElements/section/V1_SectionIndex.js';

export const V1_SECTION_INDEX_ELEMENT_PROTOCOL_TYPE = 'sectionIndex';

enum V1_SectionType {
  IMPORT_AWARE = 'importAware',
  DEFAULT = 'default',
}

export const V1_importAwareModelSchema = createModelSchema(
  V1_ImportAwareCodeSection,
  {
    _type: usingConstantValueSchema(V1_SectionType.IMPORT_AWARE),
    elements: list(primitive()),
    imports: list(primitive()),
    parserName: primitive(),
  },
);

export const V1_defaultCodeModelSchema = createModelSchema(
  V1_DefaultCodeSection,
  {
    _type: usingConstantValueSchema(V1_SectionType.DEFAULT),
    elements: list(primitive()),
    parserName: primitive(),
  },
);

const V1_serializeCodeSection = (
  protocol: V1_Section,
): PlainObject<V1_Section> | typeof SKIP => {
  if (protocol instanceof V1_ImportAwareCodeSection) {
    return serialize(V1_importAwareModelSchema, protocol);
  } else if (protocol instanceof V1_DefaultCodeSection) {
    return serialize(V1_defaultCodeModelSchema, protocol);
  }
  return SKIP;
};

const V1_deserializeCodeSection = (
  json: PlainObject<V1_Section>,
): V1_Section | typeof SKIP => {
  switch (json._type) {
    case V1_SectionType.IMPORT_AWARE:
      return deserialize(V1_importAwareModelSchema, json);
    case V1_SectionType.DEFAULT:
      return deserialize(V1_defaultCodeModelSchema, json);
    default:
      return SKIP;
  }
};

export const V1_sectionIndexModelSchema = createModelSchema(V1_SectionIndex, {
  _type: usingConstantValueSchema(V1_SECTION_INDEX_ELEMENT_PROTOCOL_TYPE),
  name: primitive(),
  package: custom(
    () => '__internal__',
    () => '__internal__',
  ),
  sections: list(
    custom(
      (val) => V1_serializeCodeSection(val),
      (val) => V1_deserializeCodeSection(val),
    ),
  ),
});
