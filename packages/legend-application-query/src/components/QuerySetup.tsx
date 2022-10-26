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
  clsx,
  PanelLoadingIndicator,
  QuestionCircleIcon,
  CogIcon,
  MoreHorizontalIcon,
  DropdownMenu,
  PencilIcon,
  ChevronDownThinIcon,
  CircleIcon,
  MenuContent,
  MenuContentItem,
  MenuContentItemIcon,
  MenuContentItemLabel,
  CheckIcon,
  MenuContentDivider,
} from '@finos/legend-art';
import {
  getQueryParameters,
  guaranteeNonNullable,
  sanitizeURL,
} from '@finos/legend-shared';
import { observer, useLocalObservable } from 'mobx-react-lite';
import React, { createContext, useContext, useEffect } from 'react';
import {
  LEGEND_QUERY_SETUP_QUERY_PARAM_TOKEN,
  type QuerySetupQueryParams,
} from '../stores/LegendQueryRouter.js';
import {
  QuerySetupLandingPageStore,
  type BaseQuerySetupStore,
} from '../stores/QuerySetupStore.js';
import type { ProjectData } from '@finos/legend-server-depot';
import { useApplicationStore } from '@finos/legend-application';
import { useLegendQueryApplicationStore } from './LegendQueryBaseStoreProvider.js';
import type { QuerySetupActionConfiguration } from '../stores/LegendQueryApplicationPlugin.js';

export type ProjectOption = { label: string; value: ProjectData };
export const buildProjectOption = (project: ProjectData): ProjectOption => ({
  label: `${project.groupId}.${project.artifactId}`,
  value: project,
});

export type VersionOption = { label: string; value: string };
export const buildVersionOption = (version: string): VersionOption => ({
  label: version,
  value: version,
});

const QuerySetupLandingPageStoreContext = createContext<
  QuerySetupLandingPageStore | undefined
>(undefined);

const QuerySetupLandingPageStoreProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const applicationStore = useLegendQueryApplicationStore();
  const store = useLocalObservable(
    () => new QuerySetupLandingPageStore(applicationStore),
  );
  return (
    <QuerySetupLandingPageStoreContext.Provider value={store}>
      {children}
    </QuerySetupLandingPageStoreContext.Provider>
  );
};

export const useQuerySetupLandingPageStore = (): QuerySetupLandingPageStore =>
  guaranteeNonNullable(
    useContext(QuerySetupLandingPageStoreContext),
    `Can't find query setup landing page store in context`,
  );

export const withQuerySetupLandingPageStore = (
  WrappedComponent: React.FC,
): React.FC =>
  function WithQuerySetupLandingPageStore() {
    return (
      <QuerySetupLandingPageStoreProvider>
        <WrappedComponent />
      </QuerySetupLandingPageStoreProvider>
    );
  };

const QuerySetupAction = observer(
  (props: { action: QuerySetupActionConfiguration }) => {
    const { action } = props;
    const setupStore = useQuerySetupLandingPageStore();
    const applicationStore = useApplicationStore();
    const onClick = (): void => {
      action.action(setupStore).catch(applicationStore.alertUnhandledError);
    };

    if (!setupStore.showAdvancedActions && action.isAdvanced) {
      return null;
    }
    return (
      <button
        className={clsx('query-setup__landing-page__action', action.className, {
          'query-setup__landing-page__action--advanced': action.isAdvanced,
        })}
        tabIndex={-1}
        onClick={onClick}
      >
        <div className="query-setup__landing-page__action__icon">
          {action.icon}
        </div>
        <div className="query-setup__landing-page__action__label">
          {action.label}
        </div>
      </button>
    );
  },
);

const QuerySetupActionGroupConfigMenu = observer(() => {
  const setupStore = useQuerySetupLandingPageStore();
  const toggleShowAdvancedActions = (): void =>
    setupStore.setShowAdvancedActions(!setupStore.showAdvancedActions);
  const toggleShowAllGroups = (): void =>
    setupStore.setShowAllGroups(!setupStore.showAllGroups);
  const reset = (): void => setupStore.resetConfig();

  return (
    <MenuContent className="query-setup__landing-page__config-menu">
      <MenuContentItem onClick={toggleShowAdvancedActions}>
        <MenuContentItemIcon>
          {setupStore.showAdvancedActions ? <CheckIcon /> : null}
        </MenuContentItemIcon>
        <MenuContentItemLabel>Show advanced actions</MenuContentItemLabel>
      </MenuContentItem>
      <MenuContentItem onClick={toggleShowAllGroups}>
        <MenuContentItemIcon>
          {setupStore.showAllGroups ? <CheckIcon /> : null}
        </MenuContentItemIcon>
        <MenuContentItemLabel>Show all action groups</MenuContentItemLabel>
      </MenuContentItem>
      <MenuContentDivider />
      <MenuContentItem disabled={true}>Focus on action group:</MenuContentItem>
      <MenuContentItem onClick={() => setupStore.setTagToFocus(undefined)}>
        <MenuContentItemIcon>
          {!setupStore.tagToFocus ? <CheckIcon /> : null}
        </MenuContentItemIcon>
        <MenuContentItemLabel>(none)</MenuContentItemLabel>
      </MenuContentItem>
      {setupStore.tags.map((groupKey) => (
        <MenuContentItem
          key={groupKey}
          onClick={() => setupStore.setTagToFocus(groupKey)}
        >
          <MenuContentItemIcon>
            {setupStore.tagToFocus === groupKey ? <CheckIcon /> : null}
          </MenuContentItemIcon>
          <MenuContentItemLabel>{groupKey}</MenuContentItemLabel>
        </MenuContentItem>
      ))}
      <MenuContentDivider />
      <MenuContentItem onClick={reset} disabled={!setupStore.isCustomized}>
        Reset
      </MenuContentItem>
    </MenuContent>
  );
});

const QuerySetupActionGroup = observer(
  (props: { tag?: string | undefined }) => {
    const { tag } = props;
    const setupStore = useQuerySetupLandingPageStore();
    const actions = setupStore.actions.filter((action) => action.tag === tag);
    const createActions = actions.filter((action) => action.isCreateAction);
    const editActions = actions.filter((action) => !action.isCreateAction);
    const showAdvancedActions = (): void =>
      setupStore.setShowAdvancedActions(true);

    return (
      <div
        className={clsx('query-setup__landing-page__action-group', {
          'query-setup__landing-page__action-group--with-tag': Boolean(tag),
        })}
      >
        {tag && (
          <div className="query-setup__landing-page__action-group__tag">
            {tag}
          </div>
        )}
        <div className="query-setup__landing-page__action-group__header">
          {(!tag || setupStore.tagToFocus === tag) && (
            <DropdownMenu
              className="query-setup__landing-page__action-group__config"
              title="Show settings..."
              content={<QuerySetupActionGroupConfigMenu />}
              menuProps={{
                anchorOrigin: { vertical: 'bottom', horizontal: 'left' },
                transformOrigin: { vertical: 'top', horizontal: 'left' },
              }}
            >
              <CogIcon />
              {setupStore.isCustomized && (
                <div className="query-setup__landing-page__action-group__config__status">
                  <CircleIcon />
                </div>
              )}
            </DropdownMenu>
          )}
        </div>
        <div className="query-setup__landing-page__action-group__body">
          <div className="query-setup__landing-page__action-group__body__column">
            {editActions.map((action) => (
              <QuerySetupAction key={action.key} action={action} />
            ))}
          </div>
          <div className="query-setup__landing-page__action-group__body__column">
            {createActions.map((action) => (
              <QuerySetupAction key={action.key} action={action} />
            ))}
          </div>
        </div>
        <div className="query-setup__landing-page__action-group__footer">
          <div className="query-setup__landing-page__action-group__footer__content">
            {!setupStore.showAdvancedActions && (
              <button
                className="query-setup__landing-page__action-group__footer__btn"
                onClick={showAdvancedActions}
                tabIndex={-1}
                title="Show advanced actions"
              >
                <MoreHorizontalIcon />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  },
);

export const QuerySetupLandingPage = withQuerySetupLandingPageStore(
  observer(() => {
    const setupStore = useQuerySetupLandingPageStore();
    const applicationStore = useLegendQueryApplicationStore();
    const params = getQueryParameters<QuerySetupQueryParams>(
      sanitizeURL(applicationStore.navigator.getCurrentAddress()),
      true,
    );
    const showAdvancedActions =
      params[LEGEND_QUERY_SETUP_QUERY_PARAM_TOKEN.SHOW_ADVANCED_ACTIONS];
    const showAllGroups =
      params[LEGEND_QUERY_SETUP_QUERY_PARAM_TOKEN.SHOW_ALL_GROUPS];
    const tagToFocus = params[LEGEND_QUERY_SETUP_QUERY_PARAM_TOKEN.TAG];
    const goToStudio = (): void =>
      applicationStore.navigator.visitAddress(
        applicationStore.config.studioUrl,
      );
    const showAllActionGroup = (): void => setupStore.setShowAllGroups(true);

    useEffect(() => {
      setupStore.initialize(showAdvancedActions, showAllGroups, tagToFocus);
    }, [setupStore, showAdvancedActions, showAllGroups, tagToFocus]);

    return (
      <div className="query-setup">
        <div className="query-setup__landing-page">
          {setupStore.initState.hasCompleted && (
            <>
              <div className="query-setup__landing-page__title">
                What do you want to do today
                <QuestionCircleIcon
                  className="query-setup__landing-page__title__question-mark"
                  title="Choose one of the option below to start"
                />
              </div>
              <div className="query-setup__landing-page__actions">
                {setupStore.tagToFocus && (
                  <QuerySetupActionGroup tag={setupStore.tagToFocus} />
                )}
                {!setupStore.tagToFocus && (
                  <>
                    <QuerySetupActionGroup />
                    {setupStore.showAllGroups && (
                      <>
                        {setupStore.tags.map((tag) => (
                          <QuerySetupActionGroup key={tag} tag={tag} />
                        ))}
                        <div className="query-setup__landing-page__action-group query-setup__landing-page__action-group--studio">
                          <div className="query-setup__landing-page__action-group__tag">
                            Developer Workstation
                          </div>
                          <div className="query-setup__landing-page__action-group__header" />
                          <div className="query-setup__landing-page__action-group__body">
                            <button
                              className="query-setup__landing-page__action query-setup__landing-page__action--studio"
                              onClick={goToStudio}
                              tabIndex={-1}
                            >
                              <div className="query-setup__landing-page__action__icon">
                                <PencilIcon />
                              </div>
                              <div className="query-setup__landing-page__action__label">
                                Open Legend Studio
                              </div>
                            </button>
                          </div>
                          <div className="query-setup__landing-page__action-group__footer" />
                        </div>
                      </>
                    )}
                    {!setupStore.showAllGroups && (
                      <div className="query-setup__landing-page__footer">
                        <button
                          className="query-setup__landing-page__footer__more-btn"
                          onClick={showAllActionGroup}
                          tabIndex={-1}
                          title="Show all action groups"
                        >
                          <ChevronDownThinIcon />
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    );
  }),
);

export const BaseQuerySetupStoreContext = createContext<
  BaseQuerySetupStore | undefined
>(undefined);

export const useBaseQuerySetupStore = (): BaseQuerySetupStore =>
  guaranteeNonNullable(
    useContext(BaseQuerySetupStoreContext),
    `Can't find base query setup store in context`,
  );

export const BaseQuerySetup = observer(
  (props: { children: React.ReactNode }) => {
    const { children } = props;
    const setupStore = useBaseQuerySetupStore();

    useEffect(() => {
      setupStore.initialize();
    }, [setupStore]);

    return (
      <>
        <PanelLoadingIndicator isLoading={setupStore.initState.isInProgress} />
        {setupStore.initState.hasCompleted && (
          <div className="query-setup">{children}</div>
        )}
      </>
    );
  },
);
