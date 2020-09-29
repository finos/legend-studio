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

/**
 * Avoid using `@action.bound` for class method as it doesn't work well with inheritance/extend
 * This causes calling parent method instead of the sub class method with the same name when both
 * are decorated with `@action.bound` and the worst part is `mobx` does not warn about this
 * See https://github.com/mobxjs/mobx/issues/1864
 * See https://github.com/mobxjs/mobx/issues/379
 */
module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      recommended: false,
    }
  },
  create(context) {
    return {
      Decorator(node) {
        if (node.expression
          && node.expression.object && node.expression.object.name === 'action'
          && node.expression.property && node.expression.property.name === 'bound'
        ) {
          context.report({
            node: node,
            message: 'Avoid usage of mobx\'s @action.bound',
          });
        }
      }
    };
  }
};
