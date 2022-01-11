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

import { createTheme } from '@mui/material/styles';

/**
 * NOTE: this approach generally works well to control Material theme overriding
 * However, due to modularization and tree-shaking, it seems like if in `legend-studio`
 * core, if for example, `MuiList` is not used, the overriding does not take effect.
 *
 * TODO: Eventually, when we have componentize most of the apps, we can eliminate this usage
 * of MUI Theme provider. Also now that we have upgraded to MUI (v5) we should investigate
 * how we can get rid of this.
 */
export const LegendMaterialUITheme = createTheme({
  components: {
    MuiButtonBase: {
      defaultProps: {
        // disable button ripples
        disableRipple: true,
      },
    },
    MuiDialog: {
      defaultProps: {
        // disable max-width constraint on all dialogs
        maxWidth: false,
      },
      styleOverrides: {
        root: {
          marginTop: '4.8rem',
        },
        scrollPaper: {
          alignItems: 'flex-start',
        },
        paper: {
          margin: 0,
        },
      },
    },
    MuiList: {
      styleOverrides: {
        padding: {
          paddingTop: 0,
          paddingBottom: 0,
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          background: 'var(--color-dark-grey-100)',
          color: 'var(--color-light-grey-100)',
          fontSize: '1.2rem',
          maxWidth: 'inherit',
        },
        tooltipPlacementTop: {
          margin: '0.5rem 0',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 0,
        },
        rounded: {
          borderRadius: 0,
        },
      },
    },
  },
  transitions: {
    // So we have `transition: none;` everywhere
    create: (): string => 'none',
  },
  typography: {
    fontFamily: 'Roboto',
    fontSize: 10,
    htmlFontSize: 10,
  },
});
