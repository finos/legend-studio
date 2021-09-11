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

const configureResizablePanelComponents = (): void => {
  /**
   * The following block is needed to inject `react-reflex` styling during development
   * as HMR makes stylesheet loaded after layout calculation, throwing off `react-reflex`
   * See https://github.com/leefsmp/Re-Flex/issues/27#issuecomment-718949629
   */
  // eslint-disable-next-line no-process-env
  if (process.env.NODE_ENV === 'development') {
    const stylesheet = document.createElement('style');
    stylesheet.innerHTML = `
        /* For development, this needs to be injected before stylesheet, else \`react-reflex\` panel dimension calculation will be off */
        .reflex-container { height: 100%; width: 100%; }
        /* NOTE: we have to leave the min dimension as \`0.1rem\` to avoid re-calculation bugs due to HMR style injection order */
        .reflex-container.horizontal { flex-direction: column; min-height: 0.1rem; }
        .reflex-container.vertical { flex-direction: row; min-width: 0.1rem; }
        .reflex-container > .reflex-element { height: 100%; width: 100%; }
      `;
    document.head.prepend(stylesheet);
  }
};

export const configureComponents = (): void => {
  configureResizablePanelComponents();
};
