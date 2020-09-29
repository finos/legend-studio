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

const OFF = 0;
const WARN = 1;
const ERROR = 2;

const ES_RULES = {
  'array-bracket-spacing': [ERROR, 'never'],
  'arrow-body-style': [WARN, 'as-needed'],
  'array-callback-return': ERROR,
  'arrow-parens': [WARN, 'as-needed'],
  'arrow-spacing': WARN,
  'block-spacing': [WARN, 'always'],
  'brace-style': [WARN, '1tbs', { allowSingleLine: true }],
  'comma-dangle': [ERROR, 'only-multiline'],
  'comma-spacing': [WARN, { before: false, after: true }],
  'comma-style': [ERROR, 'last'],
  'consistent-return': ERROR,
  'consistent-this': [ERROR, 'self'],
  'constructor-super': ERROR,
  'curly': ERROR,
  'default-case': ERROR,
  'dot-location': [ERROR, 'property'],
  'dot-notation': [ERROR, { allowKeywords: true }],
  'eol-last': [WARN, 'always'],
  'eqeqeq': ERROR,
  'func-call-spacing': ERROR,
  'guard-for-in': ERROR,
  'jsx-quotes': ERROR,
  'key-spacing': WARN,
  'keyword-spacing': [WARN, { before: true, after: true }],
  'no-console': WARN,
  'no-const-assign': ERROR,
  'no-debugger': WARN,
  'no-duplicate-imports': ERROR,
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
  'no-redeclare': ERROR,
  'no-regex-spaces': ERROR,
  'no-return-assign': ERROR,
  // This is a workaround as `import/no-relative-parent-imports` is not working properly with Typescript as of 2.20.1
  // See https://github.com/benmosher/eslint-plugin-import/issues/1644
  // See https://github.com/benmosher/eslint-plugin-import/issues/834
  // See https://github.com/benmosher/eslint-plugin-import/issues/669#issuecomment-316438608
  'no-restricted-imports': [WARN, { patterns: ['../*'] }],
  'no-trailing-spaces': WARN,
  'no-unused-labels': WARN,
  'no-unsafe-finally': ERROR,
  'no-unsafe-negation': WARN,
  'no-unreachable': ERROR,
  'no-var': ERROR,
  'no-void': ERROR,
  'no-whitespace-before-property': ERROR,
  'object-curly-spacing': [WARN, 'always'],
  'prefer-arrow-callback': ERROR,
  'prefer-const': WARN,
  'prefer-named-capture-group': WARN,
  'prefer-template': WARN,
  'quotes': [WARN, 'single', { allowTemplateLiterals: true }],
  'require-yield': OFF,
  'semi': [WARN, 'always', { omitLastInOneLineBlock: true }],
  'semi-spacing': [WARN, { after: true, before: false }],
  'semi-style': WARN,
  'space-before-blocks': WARN,
  'space-before-function-paren': [WARN, { anonymous: 'always', named: 'never' }],
  'space-in-parens': [WARN, 'never'],
  'space-infix-ops': WARN,
  'space-unary-ops': WARN,
  'strict': ERROR,
  'switch-colon-spacing': WARN,
  'template-curly-spacing': WARN,
  'template-tag-spacing': WARN
};

const IMPORT_RULES = {
  'import/no-unresolved': OFF,
  'import/named': OFF,
  'import/namespace': OFF,
  'import/default': OFF,
  'import/export': OFF,
  'import/no-default-export': WARN,
};

const TYPESCRIPT_RULES = {
  '@typescript-eslint/ban-types': [WARN,
    {
      // the default config disallows the use of 'object' and `Function` (which happen to be one of our element type) so we have to customize it
      // See https://github.com/typescript-eslint/typescript-eslint/blob/master/packages/eslint-plugin/docs/rules/ban-types.md
      types: {
        String: { message: `Use 'string' instead`, fixWith: 'string' },
        Boolean: { message: `Use 'boolean' instead`, fixWith: 'boolean' },
        Number: { message: `Use 'number' instead`, fixWith: 'number' },
        Symbol: { message: `Use 'symbol' instead`, fixWith: 'symbol' },
        Object: { message: `Use 'object' instead`, fixWith: 'object' }
      },
      extendDefaults: false,
    }
  ],
  '@typescript-eslint/camelcase': OFF,
  '@typescript-eslint/class-name-casing': OFF,
  '@typescript-eslint/explicit-function-return-type': [WARN, { allowTypedFunctionExpressions: true }],
  '@typescript-eslint/explicit-member-accessibility': OFF,
  '@typescript-eslint/no-inferrable-types': [WARN, { ignoreParameters: true }],
  '@typescript-eslint/no-var-requires': OFF,
  '@typescript-eslint/no-unused-vars': [WARN, { args: 'none', ignoreRestSiblings: true }],
  // NOTE: since functions are hoisted in ES6, it is then advisable to enable this rule so that we can have functions that depend on each other and not causing
  // circular module dependency. It is also said to be safe to use
  // See https://github.com/typescript-eslint/typescript-eslint/blob/master/packages/eslint-plugin/docs/rules/no-use-before-define.md#options
  '@typescript-eslint/no-extra-semi': WARN,
  '@typescript-eslint/no-use-before-define': [ERROR, { functions: false }],
  '@typescript-eslint/no-useless-constructor': WARN,
  '@typescript-eslint/type-annotation-spacing': WARN,
  // indentation rule is not recommended to turn on by default as it
  '@typescript-eslint/indent': [WARN, 2, {
    'SwitchCase': 1,
    'FunctionDeclaration': { parameters: 'first' },
    'FunctionExpression': { parameters: 'first' },
    'ignoredNodes': ['JSXAttribute', 'JSXSpreadAttribute']
  }],
};

const REACT_RULES = {
  'react-hooks/rules-of-hooks': ERROR,
  'react-hooks/exhaustive-deps': WARN,
  'react/jsx-boolean-value': [ERROR, 'always'],
  'react/jsx-fragments': [WARN, 'syntax'],
  // using index as key often cause bug when we do form view so we have to be careful
  // NOTE: to handle this, we will use object UUID (UUID when we create an object) to make sure the key is unique
  'react/jsx-key': ERROR,
  'react/jsx-no-target-blank': ERROR,
  'react/no-array-index-key': WARN,
  'react/no-deprecated': ERROR,
  'react/no-direct-mutation-state': ERROR,
  'react/no-unescaped-entities': ERROR,
  // we use Typescript so PropTypes can go
  'react/prop-types': OFF,
  // here are a few rules we follow to make VS Code auto format work better with eslint
  'react/jsx-tag-spacing': [WARN, { beforeSelfClosing: 'always' }],
  'react/jsx-curly-spacing': [WARN, { when: 'never', allowMultiline: true }],
};

// NOTE: these are custom rules which can be found in ./dev/eslint_rules
const CUSTOM_RULES = {
  // Sort model import in order of [other, metamodel, protocol]
  'sort-model-imports': WARN,
  // Enforce usage of module alias for import
  'prefer-module-alias': WARN,
  // Enforce usage of MM_ prefixed alias for metamodel import used in protocol model definitions
  'prefer-metamodel-import-alias': WARN,
  // Disallow importing protocol models from outside of protocol directory and across diferent versions
  'restrict-protocol-imports': ERROR,
  // Avoid using mobx's @action.bound, since it does not support inheritance properly which can cause
  // really weird and hard to trace bugs
  'avoid-mobx-action-bound-usage': WARN,
  // Disallow importing metamodels in protocol model definitions
  'no-metamodel-dependency-in-protocol-models': ERROR,
  // Disallow forbidden dependencies between sub-modules in the codebase
  'enforce-module-hierarchy': ERROR,
};

module.exports = {
  root: true, // prevent ESLint to look further up in directory tree to resolve for parent configs
  parser: '@typescript-eslint/parser',
  env: {
    browser: true,
    node: true,
    es6: true,
    amd: true,
    jest: true
  },
  overrides: [
    {
      files: ['**.js'],
      parser: 'babel-eslint',
      rules: {
        '@typescript-eslint/explicit-function-return-type': OFF,
      }
    },
    // relax linting rules for development scripts
    {
      files: ['./dev/scripts/**.js'],
      parser: 'babel-eslint',
      rules: {
        'no-console': OFF,
        'no-process-env': OFF,
        'no-process-exit': OFF,
      }
    }
  ],
  plugins: [
    'react-hooks'
  ],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:import/errors', // See https://github.com/benmosher/eslint-plugin-import/blob/master/config/errors.js
    'plugin:import/typescript' // See https://github.com/benmosher/eslint-plugin-import/blob/master/config/typescript.js
  ],
  settings: {
    react: {
      version: 'detect',
    }
  },
  rules: { ...ES_RULES, ...TYPESCRIPT_RULES, ...IMPORT_RULES, ...REACT_RULES, ...CUSTOM_RULES }
};
