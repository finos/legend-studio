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

const globals = require('globals');
const eslint_plugin = require('@eslint/js');
const react_plugin = require('eslint-plugin-react');
const react_hooks_plugin = require('eslint-plugin-react-hooks');
const import_plugin = require('eslint-plugin-import');
const typescript_eslint_plugin = require('@typescript-eslint/eslint-plugin');
const typescript_eslint_parser = require('@typescript-eslint/parser');
const custom_plugin = require('./custom');

const OFF = 0;
const WARN = 1;
const ERROR = 2;

/**
 * Since we use `prettier`, we try to keep this config as close to `prettier`
 * standard as possible, especially in terms of spacing.
 */
const ES_RULES = {
  'array-bracket-spacing': [ERROR, 'never'],
  'arrow-body-style': OFF,
  'array-callback-return': ERROR,
  'arrow-parens': WARN,
  'arrow-spacing': WARN,
  'block-spacing': [WARN, 'always'],
  'brace-style': OFF, // this will be managed by `prettier`
  'comma-dangle': [ERROR, 'only-multiline'],
  'comma-spacing': [WARN, { before: false, after: true }],
  'comma-style': [ERROR, 'last'],
  'consistent-return': ERROR,
  'consistent-this': [ERROR, 'self'],
  'constructor-super': ERROR,
  curly: ERROR,
  'default-case': ERROR,
  'dot-location': [ERROR, 'property'],
  'dot-notation': [ERROR, { allowKeywords: true }],
  'eol-last': [WARN, 'always'],
  eqeqeq: ERROR,
  'func-call-spacing': OFF,
  'guard-for-in': ERROR,
  'jsx-quotes': ERROR,
  'key-spacing': WARN,
  'keyword-spacing': [WARN, { before: true, after: true }],
  'no-console': WARN,
  'no-const-assign': ERROR,
  'no-debugger': WARN,
  // NOTE: this rule is useful for us to enforce usage of inline type imports and exports
  // e.g. `import { type A, B } from ...` over `import type { A } from ...; import { B } from ...;`
  // We would not need to enable rule `import/no-duplicates` anymore
  // Also we could include the duplication detection to include exports using `includeExports` flag
  // See https://github.com/typescript-eslint/typescript-eslint/issues/4338
  'no-duplicate-imports': [WARN, { includeExports: true }],
  'no-fallthrough': ERROR,
  'no-global-assign': ERROR,
  'no-invalid-regexp': ERROR,
  'no-irregular-whitespace': ERROR,
  'no-magic-numbers': [OFF, { ignore: [-1, 0, 1], enforceConst: true }],
  'no-mixed-spaces-and-tabs': ERROR,
  'no-multi-assign': WARN,
  'no-multi-spaces': WARN,
  'no-multiple-empty-lines': [WARN, { max: 1 }],
  'no-process-env': ERROR,
  'no-process-exit': ERROR,
  'no-proto': ERROR,
  'no-prototype-builtins': ERROR,
  'no-redeclare': OFF,
  'no-regex-spaces': ERROR,
  'no-return-await': ERROR,
  'no-return-assign': ERROR,
  /**
   * This is a workaround as `import/no-relative-parent-imports` is not working properly with Typescript as of 2.20.1
   * See https://github.com/benmosher/eslint-plugin-import/issues/1644
   * See https://github.com/benmosher/eslint-plugin-import/issues/834
   * See https://github.com/benmosher/eslint-plugin-import/issues/669#issuecomment-316438608
   *
   * NOTE: This is a rule that we would like to turn on by default to avoid ugly relative import paths,
   * such as `../../../../something`, but due to problem with Typescript's not resolving these to absolute
   * paths while creating type declaration files, we decided to allow relative paths
   * See https://github.com/microsoft/TypeScript/issues/30952
   * See https://github.com/microsoft/TypeScript/issues/15479
   * See https://github.com/microsoft/TypeScript/issues/26722
   */
  // 'no-restricted-imports': [WARN, { patterns: ['../*'] }],
  'no-trailing-spaces': WARN,
  'no-unused-labels': WARN,
  'no-unsafe-finally': ERROR,
  'no-unsafe-negation': WARN,
  'no-unreachable': ERROR,
  'no-var': ERROR,
  'no-void': ERROR,
  'no-whitespace-before-property': ERROR,
  'object-curly-spacing': [WARN, 'always'],
  'prefer-arrow-callback': [ERROR, { allowNamedFunctions: true }],
  'prefer-const': WARN,
  'prefer-named-capture-group': WARN,
  'prefer-template': WARN,
  quotes: [WARN, 'single', { avoidEscape: true, allowTemplateLiterals: true }],
  'require-yield': OFF,
  semi: [WARN, 'always', { omitLastInOneLineBlock: true }],
  'semi-spacing': [WARN, { after: true, before: false }],
  'semi-style': WARN,
  'space-before-blocks': WARN,
  'space-before-function-paren': [
    WARN,
    { anonymous: 'always', named: 'never' },
  ],
  'space-in-parens': [WARN, 'never'],
  'space-infix-ops': WARN,
  'space-unary-ops': WARN,
  strict: ERROR,
  'switch-colon-spacing': WARN,
  'template-curly-spacing': WARN,
  'template-tag-spacing': WARN,
};

const IMPORT_RULES = {
  // Turn off rules as per recommendation of typescript-eslint
  // See https://typescript-eslint.io/linting/troubleshooting/performance-troubleshooting
  'import/no-unresolved': OFF,
  'import/named': OFF,
  'import/namespace': OFF,
  'import/default': OFF,
  'import/export': OFF,
  'import/no-named-as-default': OFF,
  'import/no-named-as-default-member': OFF,
  'import/no-deprecated': OFF,
  'import/no-unused-modules': OFF,
  'import/no-cycle': OFF,
  'import/extensions': OFF, // we don't need this since TS already covered this check
  'import/newline-after-import': [WARN, { count: 1 }],
  'import/no-default-export': WARN,
};

const TYPESCRIPT_RULES = {
  '@typescript-eslint/consistent-type-imports': WARN,
  '@typescript-eslint/no-inferrable-types': [WARN, { ignoreParameters: true }],
  '@typescript-eslint/no-redeclare': [ERROR, { ignoreDeclarationMerge: true }],
  '@typescript-eslint/no-var-requires': OFF,
  '@typescript-eslint/no-unused-vars': [
    WARN,
    { args: 'none', ignoreRestSiblings: true },
  ],

  // NOTE: the following rules are stylistic only
  '@typescript-eslint/no-shadow': WARN,
  // NOTE: since functions are hoisted in ES6, it is then advisable to enable this rule so that we can have functions that depend on each other and not causing
  // circular module dependency. It is also said to be safe to use
  // See https://github.com/typescript-eslint/typescript-eslint/blob/master/packages/eslint-plugin/docs/rules/no-use-before-define.md#options
  '@typescript-eslint/no-use-before-define': [ERROR, { functions: false }],
  '@typescript-eslint/no-useless-constructor': WARN,
};

const REACT_RULES = {
  'react-hooks/rules-of-hooks': ERROR,
  'react-hooks/exhaustive-deps': WARN,
  'react/jsx-boolean-value': [ERROR, 'always'],
  'react/jsx-fragments': [WARN, 'syntax'],
  'react/react-in-jsx-scope': OFF, // turn off as we use React@17 new JSX transform
  // using index as key often cause bug when we do form view so we have to be careful
  // NOTE: to handle this, we will use object UUID (UUID when we create an object) to make sure the key is unique
  'react/jsx-key': ERROR,
  'react/jsx-no-target-blank': ERROR,
  'react/no-array-index-key': WARN,
  'react/no-deprecated': ERROR,
  'react/no-direct-mutation-state': ERROR,
  'react/no-unescaped-entities': ERROR,
  // we use Typescript interface instead of `prop-types`
  'react/prop-types': OFF,
  // here are a few rules we follow to make `vscode` auto format work better with eslint
  'react/jsx-tag-spacing': [WARN, { beforeSelfClosing: 'always' }],
  'react/jsx-curly-spacing': [WARN, { when: 'never', allowMultiline: true }],
};

const LEGEND_RULES = {
  '@finos/legend/enforce-module-import-hierarchy': ERROR,
  '@finos/legend/enforce-protocol-export-prefix': ERROR,
  '@finos/legend/enforce-protocol-file-prefix': ERROR,
  '@finos/legend/no-cross-protocol-version-import': ERROR,
  '@finos/legend/no-cross-workspace-non-export-usage': ERROR,
  '@finos/legend/no-cross-workspace-source-usage': ERROR,
  '@finos/legend/no-same-workspace-absolute-import': ERROR,
  '@finos/legend/no-same-workspace-index-import': ERROR,
};

/** @type {import('eslint').Linter.Config} */
const config = {
  files: ['**/*.{ts,tsx,cts}'],
  languageOptions: {
    parser: typescript_eslint_parser,
    globals: {
      ...globals.browser,
      ...globals.node,
      ...globals.es6,
      ...globals.amd,
      ...globals.jest,
    },
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
  plugins: {
    eslint: eslint_plugin,
    '@typescript-eslint': typescript_eslint_plugin,
    react: react_plugin,
    'react-hooks': react_hooks_plugin,
    import: import_plugin,
    '@finos/legend': custom_plugin,
  },
  rules: {
    ...ES_RULES,
    ...typescript_eslint_plugin.configs['eslint-recommended'].rules,
    ...typescript_eslint_plugin.configs.recommended.rules,
    ...TYPESCRIPT_RULES,
    ...react_plugin.configs.flat.recommended.rules,
    ...react_plugin.configs.flat['jsx-runtime'].rules,
    ...REACT_RULES,
    ...import_plugin.flatConfigs.errors.rules,
    ...import_plugin.flatConfigs.typescript.rules,
    ...IMPORT_RULES,
    ...LEGEND_RULES,
  },
};

module.exports = {
  config,
};
