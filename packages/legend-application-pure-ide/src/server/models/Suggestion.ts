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

import { createModelSchema, list, optional, primitive } from 'serializr';

export class ElementSuggestion {
  pureType!: string;
  pureId!: string;
  pureName!: string;
  text!: string;
  requiredClassProperties: string[] = [];
}

createModelSchema(ElementSuggestion, {
  pureType: primitive(),
  pureId: primitive(),
  pureName: primitive(),
  text: primitive(),
  requiredClassProperties: optional(list(primitive())),
});

export class AttributeSuggestion {
  pureType!: string;
  pureName!: string;
  owner!: string;
  ownerPureType!: string;
}

createModelSchema(AttributeSuggestion, {
  pureType: primitive(),
  pureName: primitive(),
  owner: primitive(),
  ownerPureType: primitive(),
});

export class ClassSuggestion {
  pureId!: string;
  pureName!: string;
  requiredClassProperties: string[] = [];
}

createModelSchema(ClassSuggestion, {
  pureId: primitive(),
  pureName: primitive(),
  requiredClassProperties: optional(list(primitive())),
});

export class VariableSuggestion {
  name!: string;
}

createModelSchema(VariableSuggestion, {
  name: primitive(),
});
