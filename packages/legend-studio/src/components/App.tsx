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

import { useEffect } from 'react';
import { Switch, Route, Redirect, useHistory } from 'react-router-dom';
import { Setup } from './setup/Setup';
import { Editor } from './editor/Editor';
import { Review } from './review/Review';
import { Viewer } from './viewer/Viewer';
import type { History, State } from 'history';
import {
  useApplicationStore,
  ApplicationStoreProvider,
} from '../stores/ApplicationStore';
import { NotificationSnackbar } from './shared/NotificationSnackbar';
import { observer } from 'mobx-react-lite';
import {
  CustomSelectorInput,
  PanelLoadingIndicator,
} from '@finos/legend-studio-components';
import { ROUTE_PATTERN } from '../stores/RouterConfig';
import { ActionAlert } from './application/ActionAlert';
import { BlockingAlert } from './application/BlockingAlert';
import { AppHeader, BasicAppHeader } from './shared/AppHeader';
import { AppHeaderMenu } from './editor/header/AppHeaderMenu';
import { createMuiTheme, ThemeProvider } from '@material-ui/core/styles';
import type { ApplicationConfig } from '../stores/ApplicationConfig';
import type { PluginManager } from '../application/PluginManager';
import { guaranteeNonNullable } from '@finos/legend-studio-shared';

/**
 * NOTE: this approach generally works well to control Material theme overriding
 * However, due to modularization and tree-shaking, it seems like if in `legend-studio`
 * core, if for example, `MuiList` is not used, the overriding does not take effect.
 *
 * As such, the b etter approach is to override the styles locally using `makeStyles` or `withStyles`
 * when we use Material UI components.
 *
 * TODO: Eventually, when we have componentize most of the apps, we can eliminate this usage
 * of Material UI Theme provider
 */
const materialTheme = createMuiTheme({
  props: {
    MuiButtonBase: {
      // disable button ripples
      disableRipple: true,
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
  // Overriding global theme, specific theme for each component can be customized at component level
  // See https://material-ui.com/customization/globals/
  overrides: {
    MuiTooltip: {
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
    MuiPaper: {
      root: {
        borderRadius: 0,
      },
      rounded: {
        borderRadius: 0,
      },
    },
    MuiDialog: {
      scrollPaper: {
        alignItems: 'flex-start',
      },
      paper: {
        margin: 0,
      },
      root: {
        marginTop: '4.8rem',
      },
    },
    MuiList: {
      padding: {
        paddingTop: 0,
        paddingBottom: 0,
      },
    },
  },
});

export const AppRoot = observer(() => {
  const applicationStore = useApplicationStore();
  const extraApplicationPageRenderEntries = applicationStore.pluginManager
    .getEditorPlugins()
    .flatMap((plugin) => plugin.getExtraApplicationPageRenderEntries?.() ?? [])
    .filter((entry) => {
      /**
       * NOTE: filter out page extra application page that will clash with `/:projectId`
       *
       * TODO: maybe there's a more sophisticated way to manage URL pattern conflicts, but this is sufficient for now.
       */
      if (entry.urlPattern.startsWith('/:')) {
        applicationStore.notifyIllegalState(
          `Can't render extra application page with URL pattern '${entry.urlPattern}' from plugins due to pattern conflicts.`,
        );
        return false;
      }
      return true;
    });

  useEffect(() => {
    applicationStore.init().catch(applicationStore.alertIllegalUnhandledError);
  }, [applicationStore]);

  return (
    <div className="app">
      <BlockingAlert />
      <ActionAlert />
      <NotificationSnackbar />
      {!applicationStore.isSDLCAuthorized && (
        <div className="app__page">
          <AppHeader>
            <AppHeaderMenu />
          </AppHeader>
          <PanelLoadingIndicator isLoading={true} />
          <div className="app__content" />
        </div>
      )}
      {applicationStore.isSDLCAuthorized && (
        <Switch>
          {extraApplicationPageRenderEntries.map((entry) => (
            <Route
              key={entry.urlPattern}
              exact={true}
              path={entry.urlPattern}
              component={entry.component as React.ComponentType<unknown>}
            />
          ))}
          <Route exact={true} path={ROUTE_PATTERN.VIEWER} component={Viewer} />
          <Route exact={true} path={ROUTE_PATTERN.REVIEW} component={Review} />
          <Route
            exact={true}
            strict={true}
            path={ROUTE_PATTERN.EDITOR}
            component={Editor}
          />
          <Route exact={true} path={ROUTE_PATTERN.SETUP} component={Setup} />
          <Redirect to="/" />
        </Switch>
      )}
    </div>
  );
});

export const AppConfigurationEditor = observer(
  (props: { config: ApplicationConfig }) => {
    const { config } = props;
    const sdlcServerOptions = config.sdlcServerOptions.map((option) => ({
      label: option.label,
      value: option.url,
    }));
    const onSDLCServerChange = (val: {
      label: string;
      value: string;
    }): void => {
      config.setSDLCServerUrl(val.value);
    };
    const currentSDLCServerOption = guaranteeNonNullable(
      sdlcServerOptions.find((option) => option.value === config.sdlcServerUrl),
    );

    const configure = (): void => {
      config.setConfigured(true);
    };

    return (
      <div className="app">
        <div className="app__page">
          <BasicAppHeader config={config} />
          <div className="app__content app__configuration-editor">
            <div className="app__configuration-editor__content">
              <div className="panel__content__form__section">
                <div className="panel__content__form__section__header__label">
                  SDLC Server
                </div>
                <CustomSelectorInput
                  options={sdlcServerOptions}
                  onChange={onSDLCServerChange}
                  value={currentSDLCServerOption}
                  darkMode={true}
                />
                <button
                  className="btn btn--dark u-pull-right app__configuration-editor__action"
                  onClick={configure}
                >
                  Configure
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  },
);

export const App = observer(
  (props: { config: ApplicationConfig; pluginManager: PluginManager }) => {
    const { config, pluginManager } = props;
    const history = (useHistory() as unknown) as History<State>;

    if (!config.isConfigured) {
      return (
        <ThemeProvider theme={materialTheme}>
          <AppConfigurationEditor config={config} />
        </ThemeProvider>
      );
    }
    return (
      <ApplicationStoreProvider
        config={config}
        history={history}
        pluginManager={pluginManager}
      >
        <ThemeProvider theme={materialTheme}>
          <AppRoot />
        </ThemeProvider>
      </ApplicationStoreProvider>
    );
  },
);
