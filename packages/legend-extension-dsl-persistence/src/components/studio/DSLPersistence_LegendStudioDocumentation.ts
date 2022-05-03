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

export enum DSL_PERSISTENCE_LEGEND_STUDIO_DOCUMENTATION_KEY {
  GRAMMAR_PARSER = 'dsl-persistence__grammar-parser',
  GRAMMAR_PERSISTENCE_ELEMENT = 'dsl-persistence__grammar-persistence-element',
}

export const DSL_PERSISTENCE_DOCUMENTATION_ENTRIES = {
  [DSL_PERSISTENCE_LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_PARSER]: {
    markdownpersistence: {
      value: `A DSL concerning with the specifications of how data can be persisted`,
    },
  },
  [DSL_PERSISTENCE_LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_PERSISTENCE_ELEMENT]:
    {
      markdownpersistence: {
        value: `A persistence element can be used to specify a data pipeline`,
      },
    },
};
