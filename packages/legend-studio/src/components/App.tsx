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
import {
  Switch,
  Route,
  Redirect,
  useHistory,
  useRouteMatch,
} from 'react-router-dom';
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
import type { SDLCServerKeyRouteParams } from '../stores/Router';
import {
  generateSetupRoute,
  ROUTE_PATTERN,
  generateRoutePatternWithSDLCServerKey,
} from '../stores/Router';
import { ActionAlert } from './application/ActionAlert';
import { BlockingAlert } from './application/BlockingAlert';
import { AppHeader, BasicAppHeader } from './shared/AppHeader';
import { AppHeaderMenu } from './editor/header/AppHeaderMenu';
import { createMuiTheme, ThemeProvider } from '@material-ui/core/styles';
import type {
  ApplicationConfig,
  SDLCServerOption,
} from '../stores/ApplicationConfig';
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
       * NOTE: Make sure the first path in the url pattern is not a token which could make it the catch-all route.
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
          <Route
            exact={true}
            path={[
              ROUTE_PATTERN.VIEW,
              ROUTE_PATTERN.VIEW_BY_ENTITY,
              ROUTE_PATTERN.VIEW_BY_REVISION,
              ROUTE_PATTERN.VIEW_BY_VERSION,
              ROUTE_PATTERN.VIEW_BY_REVISION_ENTITY,
              ROUTE_PATTERN.VIEW_BY_VERSION_ENTITY,
            ]}
            component={Viewer}
          />
          <Route exact={true} path={ROUTE_PATTERN.REVIEW} component={Review} />
          <Route
            exact={true}
            strict={true}
            path={ROUTE_PATTERN.EDIT}
            component={Editor}
          />
          <Route exact={true} path={ROUTE_PATTERN.SETUP} component={Setup} />
          {extraApplicationPageRenderEntries.map((entry) => (
            <Route
              key={entry.urlPattern}
              exact={true}
              path={generateRoutePatternWithSDLCServerKey(entry.urlPattern)}
              component={entry.component as React.ComponentType<unknown>}
            />
          ))}
          <Redirect
            to={generateSetupRoute(
              applicationStore.config.sdlcServerKey,
              undefined,
            )}
          />
        </Switch>
      )}
    </div>
  );
});

export const AppConfigurationEditor = observer(
  (props: { config: ApplicationConfig }) => {
    const { config } = props;
    const history = useHistory() as unknown as History<State>;
    const sdlcServerOptions = config.sdlcServerOptions.map((option) => ({
      label: option.label,
      value: option,
    }));
    const onSDLCServerChange = (val: {
      label: string;
      value: SDLCServerOption;
    }): void => {
      config.setSDLCServerKey(val.value.key);
    };
    const currentSDLCServerOption = guaranteeNonNullable(
      sdlcServerOptions.find(
        (option) => option.value.key === config.sdlcServerKey,
      ),
    );

    const configure = (): void => {
      config.setConfigured(true);
      // go to the default URL after confiruing SDLC server
      history.push(generateSetupRoute(config.sdlcServerKey, undefined));
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
    const history = useHistory() as unknown as History<State>;
    const routeMatch = useRouteMatch<SDLCServerKeyRouteParams>(
      generateRoutePatternWithSDLCServerKey('/'),
    );
    const sdlcServerKey = config.sdlcServerOptions.find(
      (option) => option.key === routeMatch?.params.sdlcServerKey,
    )?.key;

    useEffect(() => {
      if (!config.isConfigured) {
        if (sdlcServerKey !== undefined) {
          config.setSDLCServerKey(sdlcServerKey);
          config.setConfigured(true);
        } else if (config.sdlcServerOptions.length === 1) {
          // when there is only one SDLC server and the sdlc server key provided is unrecognized,
          // auto-fix the URL
          history.push(
            generateSetupRoute(config.sdlcServerOptions[0].key, undefined),
          );
        } else {
          // set this by default for the app config editor
          config.setSDLCServerKey(config.sdlcServerOptions[0].key);
        }
      }
    }, [config, history, sdlcServerKey]);

    if (!config.isConfigured) {
      if (!config._sdlcServerKey) {
        return null;
      }
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
