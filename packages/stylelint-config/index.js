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

module.exports = {
  plugins: ['stylelint-scss'],
  // NOTE: we can also use `stylelint` with `styled-components` or `emotion`
  // using `stylelint-processor-styled-components` and `stylelint-config-styled-components`
  // Refer to `material-ui` for their setup of `.stylelintrc.js` and `package.json`
  // See https://github.com/mui-org/material-ui/blob/next/package.json
  extends: ['stylelint-config-standard'],
  customSyntax: 'postcss-scss',
  rules: {
    // Since we use Sass, some @ rules like @include, @use, are not native to CSS
    // so we can disable this rule
    'at-rule-no-unknown': null,
    // NOTE: this is a fair rule to enable by default, but with the way we're
    // organizing our stylesheet right now in Sass files, it takes some work
    // to test and clean up this to enable this rule
    // See https://stylelint.io/user-guide/rules/no-descending-specificity
    'no-descending-specificity': null,
    // We don't really care about these naming conventions or stylistic rules
    'at-rule-empty-line-before': null,
    'selector-class-pattern': null,
    'custom-property-pattern': null,
    'keyframes-name-pattern': null,
    'declaration-block-no-redundant-longhand-properties': null,
  },
};
