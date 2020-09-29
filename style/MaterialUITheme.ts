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

import { createMuiTheme } from '@material-ui/core';

export const materialUiTheme = createMuiTheme({
  props: {
    MuiButtonBase: {
      // No more ripple
      disableRipple: true,
    },
  },
  transitions: {
    // So we have `transition: none;` everywhere
    create: (): string => 'none'
  },
  typography: {
    fontFamily: 'Roboto',
    fontSize: 10,
    htmlFontSize: 10,
  },
  // Overriding global theme, specific theme for each component can be customized at component level
  // See https://material-ui.com/customization/globals/
  overrides: {
    MuiTooltip: {
      tooltip: {
        background: 'var(--color-dark-grey-100)',
        color: 'var(--color-light-grey-100)',
        fontSize: '1.2rem',
        maxWidth: 'inherit'
      },
      tooltipPlacementTop: {
        margin: '0.5rem 0',
      },
    },
    MuiPaper: {
      root: {
        borderRadius: 0,
      },
      rounded: {
        borderRadius: 0,
      }
    },
    MuiDialog: {
      scrollPaper: {
        alignItems: 'flex-start'
      },
      paper: {
        margin: 0
      },
      root: {
        marginTop: '4.8rem'
      }
    },
    MuiList: {
      padding: {
        paddingTop: 0,
        paddingBottom: 0,
      }
    }
  }
});
