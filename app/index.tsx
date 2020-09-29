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

import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter, useHistory } from 'react-router-dom';
import { MuiThemeProvider } from '@material-ui/core';
import { materialUiTheme } from 'Style/MaterialUITheme';
import 'Style/CssLoader';
import { configure as hotkeysConfigure } from 'react-hotkeys';
import { configure as mobxConfigure } from 'mobx';
import { Root } from 'Components/Root';
import { config } from 'ApplicationConfig';
import { editor as monacoEditorAPI, languages as monacoLanguagesAPI } from 'monaco-editor';
import { configuration, language, theme } from 'Utilities/LanguageUtil';
import { ApplicationStoreProvider } from 'Stores/ApplicationStore';
import { client } from 'API/NetworkClient';
import { tracerClient } from 'API/TracerClient';
import { sdlcClient } from 'API/SdlcClient';
import { executionClient } from 'API/ExecutionClient';
import { EDITOR_THEME, EDITOR_LANGUAGE } from 'Stores/EditorConfig';

// Register Pure as a language in `monaco-editor`
monacoEditorAPI.defineTheme(EDITOR_THEME.STUDIO, theme);
monacoLanguagesAPI.register({ id: EDITOR_LANGUAGE.PURE });
monacoLanguagesAPI.setLanguageConfiguration(EDITOR_LANGUAGE.PURE, configuration);
monacoLanguagesAPI.setMonarchTokensProvider(EDITOR_LANGUAGE.PURE, language);

// NOTE: Without observer batching the React doesn't guarantee the order component rendering in some cases
// so we configure batching for Mobx to avoid these random surprises
// See https://github.com/mobxjs/mobx-react-lite/#observer-batching
mobxConfigure({
  // Force state modification to be done via actions
  // See https://github.com/mobxjs/mobx/blob/gh-pages/docs/refguide/api.md#enforceactions
  enforceActions: 'observed',
});

hotkeysConfigure({
  // By default, `react-hotkeys` will avoid capturing keys from input tags like <input>, <textarea>, <select>
  // We want to listen to hotkey from every where in the app so we disable that
  // See https://github.com/greena13/react-hotkeys#ignoring-events
  ignoreTags: [],
});

const root = ((): Element => {
  let rootEl = document.getElementsByTagName('root').length ? document.getElementsByTagName('root')[0] : undefined;
  if (!rootEl) {
    rootEl = document.createElement('root');
    document.body.appendChild(rootEl);
  }
  return rootEl;
})();

config.configure()
  .then(() => {
    tracerClient.initialize(config.tracerServerUrl, config.userId, config.realm);
    sdlcClient.initialize(config.sdlcServerUrl);
    executionClient.initialize(config.executionServerUrl);
    client.configure(sdlcClient.authenticationUrl());
    ReactDOM.render((
      // TODO: would be great if we can have <React.StrictMode> here but since Mobx React is not ready for
      // concurrency yet, we would have to wait until @next become official
      // See https://github.com/mobxjs/mobx-react-lite/issues/53
      <BrowserRouter basename={`/${config.appName}`}>
        <App />
      </BrowserRouter>
    ), root);
  })
  .catch(error => {
    throw error;
  });

const App: React.FC = () => {
  const history = useHistory();
  return (
    <ApplicationStoreProvider history={history}>
      <MuiThemeProvider theme={materialUiTheme}>
        <Root />
      </MuiThemeProvider>
    </ApplicationStoreProvider>
  );
};
