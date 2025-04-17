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

import {
  createTheme,
  StyledEngineProvider,
  ThemeProvider,
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFnsV3/index.js';

const LegendCustomMUITheme = (enableTransitions?: boolean | undefined) =>
  createTheme({
    ...(!!enableTransitions
      ? {}
      : {
          transitions: {
            // disable all transition
            // NOTE: this is a catch-all way to remove all transitions
            // We technically don't need this because we can configure transition props for each component
            create: (): string => 'none',
          },
        }),
    components: {
      MuiButtonBase: {
        defaultProps: {
          disableRipple: true,
        },
      },
    },
  });

export const LegendStyleProvider: React.FC<{
  children: React.ReactNode;
  enableTransitions?: boolean | undefined;
}> = (props) => {
  const { children, enableTransitions } = props;

  return (
    // Make sure CSS for MUI generated by `emotion` are injected before our styling code
    // this ensures our styling code can override MUI styles
    // See https://mui.com/guides/interoperability/#css-injection-order-3
    <StyledEngineProvider injectFirst={true}>
      <ThemeProvider theme={LegendCustomMUITheme(enableTransitions)}>
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          {children}
        </LocalizationProvider>
      </ThemeProvider>
    </StyledEngineProvider>
  );
};
