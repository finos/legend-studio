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

/**
 * Prettier is an __opinionated__ way to format code.
 * As they put it `By far the biggest reason for adopting Prettier is to stop all the ongoing debates over styles.`
 * To comply with this spirit, we did 2 things:
 *  1. Limit customization we do to Prettier config.
 *  2. Set lint rules that comply with Prettier rule set and option philosophy.
 *
 * See https://prettier.io/docs/en/why-prettier.html
 * See https://prettier.io/docs/en/option-philosophy.html
 *
 * Not everyone likes Prettier, and one of the hardest thing to get used to when migrating to Prettier
 * is the `print-width` option. As mentioned before, we use the `default`. However, we understand that
 * there are places that where `Prettier` line-breaking behavior might actually make the code less clear.
 * For example when we want a series of one-liner function which should be grouped together:
 *
 * ```
 *  func1() { if (...) { doSomething1() } else { doOtherwise1() } }
 *  func2() { if (...) { doSomething2() } else { doOtherwise2() } }
 *  func3() { if (...) { doSomething3() } else { doOtherwise3() } }
 *  func4() { if (...) { doSomething4() } else { doOtherwise4() } }
 * ```
 *
 * For these cases, we can use `ignore` syntax for Prettier
 * See https://prettier.io/docs/en/options.html#print-width
 *
 * NOTE: the biggest limitation of prettier so far is that it does not have a mature `ignore` support.
 * We are waiting for `prettier-ignore-start/end` syntax to be supported.
 * See https://github.com/prettier/prettier/issues/5287
 */
export default {
  plugins: ['prettier-plugin-tailwindcss'],
  singleQuote: true,
  trailingComma: 'all',
};
