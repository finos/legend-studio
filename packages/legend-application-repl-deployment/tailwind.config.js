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

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.tsx', '../legend-*/src/**/*.tsx'],
  theme: {
    fontSize: {
      '3xs': ['6px', '6px'],
      '2xs': ['7px', '7px'],
      xs: ['8px', '8px'],
      sm: ['10px', '12px'],
      base: ['12px', '16px'],
      lg: ['14px', '20px'],
      xl: ['16px', '24px'],
      '2xl': ['20px', '28px'],
      '3xl': ['24px', '32px'],
    },
    fontFamily: {
      sans: [
        'Roboto',
        'ui-sans-serif',
        'system-ui',
        'sans-serif',
        'Apple Color Emoji',
        'Segoe UI Emoji',
        'Segoe UI Symbol',
        'Noto Color Emoji',
      ],
      mono: [
        'ui-monospace',
        'Roboto Mono',
        'SFMono-Regular',
        'Menlo',
        'Monaco',
        'Consolas',
        'Liberation Mono',
        'Courier New',
        'monospace',
      ],
    },
  },
  // Expose Tailwind color as CSS variables
  // See https://gist.github.com/Merott/d2a19b32db07565e94f10d13d11a8574
  // TODO: the better solution is to use theme() and PostCSS
  // See https://gist.github.com/Merott/d2a19b32db07565e94f10d13d11a8574?permalink_comment_id=4729744#gistcomment-4729744
  plugins: [
    function ({ addBase, theme }) {
      function extractColorVars(colorObj, colorGroup = '') {
        return Object.keys(colorObj).reduce((vars, colorKey) => {
          const value = colorObj[colorKey];

          const newVars =
            typeof value === 'string'
              ? { [`--tw-color${colorGroup}-${colorKey}`]: value }
              : extractColorVars(value, `-${colorKey}`);

          return { ...vars, ...newVars };
        }, {});
      }

      addBase({
        ':root': extractColorVars(theme('colors')),
      });
    },
  ],
};
