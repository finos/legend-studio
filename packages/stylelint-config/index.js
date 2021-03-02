/**
 * Copyright 2020 Goldman Sachs
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
  extends: ['stylelint-config-standard', 'stylelint-config-prettier'],
  rules: {
    // Since we don't use Sass instead of pure CSS, we can override the
    // `at-rule-no-unknown` rules like this, otherwise we need to create
    // separate configs for each extension.
    // See https://github.com/stylelint/stylelint/issues/3128
    // See https://github.com/kristerkari/stylelint-scss/issues/196
    'at-rule-no-unknown': null,
    'scss/at-rule-no-unknown': true,
    // NOTE: this is a fair rule to enable by default, but with the way we're
    // organizing our stylesheet right now in Sass files, it takes some work
    // to test and clean up this to enable this rule
    // See https://stylelint.io/user-guide/rules/no-descending-specificity
    'no-descending-specificity': null,
  },
};
