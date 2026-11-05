/**
 * Copyright (c) 2026-present, Goldman Sachs
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

import { observer } from 'mobx-react-lite';
import {
  clsx,
  LibraryBooksIcon,
  CheckCircleIcon,
  CloudUploadIcon,
  ExclamationTriangleIcon,
  ExternalLinkIcon,
  FireIcon,
  HackerIcon,
  HammerIcon,
  PlusIcon,
  SearchIcon,
  TimesCircleIcon,
  UserIcon,
  UsersIcon,
} from '@finos/legend-art';
import { EntityChangeType, WorkspaceType } from '@finos/legend-server-sdlc';
import { useEditorStore } from '../EditorStoreProvider.js';
import { useLegendStudioApplicationStore } from '../../LegendStudioFrameworkProvider.js';
import {
  LEGEND_STUDIO_COMMAND_CONFIG,
  LEGEND_STUDIO_COMMAND_KEY,
} from '../../../__lib__/LegendStudioCommand.js';
import { LEGEND_STUDIO_DOCUMENTATION_KEY } from '../../../__lib__/LegendStudioDocumentation.js';
import { GraphCompilationOutcome } from '../../../stores/editor/EditorGraphState.js';
import { getElementIcon } from '../../ElementIconUtils.js';

const KEY_LABELS: Record<string, string> = {
  Control: 'Ctrl',
  Meta: '⌘',
  Shift: 'Shift',
  Alt: 'Alt',
  Backquote: '`',
};

/**
 * `Control+Shift+KeyN` → `['Ctrl', 'Shift', 'N']`
 */
const formatKeyCombination = (combination: string): string[] =>
  combination
    .split('+')
    .map(
      (key) =>
        KEY_LABELS[key] ??
        key
          .replace(/^Key(?<letter>[A-Z])$/u, '$<letter>')
          .replace(/^Digit/u, ''),
    );

const KeyCombination = (props: { keys: string[] }): React.ReactNode => (
  <span className="editor-landing__keys">
    {props.keys.map((key) => (
      <kbd key={key} className="editor-landing__key">
        {key}
      </kbd>
    ))}
  </span>
);

const ACTIONS: {
  command: LEGEND_STUDIO_COMMAND_KEY;
  title: string;
  description: string;
  icon: React.ReactNode;
}[] = [
  {
    command: LEGEND_STUDIO_COMMAND_KEY.SEARCH_ELEMENT,
    title: 'Open an element',
    description: 'Search the project and its dependencies',
    icon: <SearchIcon />,
  },
  {
    command: LEGEND_STUDIO_COMMAND_KEY.CREATE_ELEMENT,
    title: 'New element',
    description: 'A class, mapping, service, data product…',
    icon: <PlusIcon />,
  },
  {
    command: LEGEND_STUDIO_COMMAND_KEY.TOGGLE_TEXT_MODE,
    title: 'Text mode',
    description: 'Edit the whole project as Pure',
    icon: <HackerIcon />,
  },
  {
    command: LEGEND_STUDIO_COMMAND_KEY.COMPILE,
    title: 'Compile',
    description: 'Check the model for errors',
    icon: <HammerIcon />,
  },
  {
    command: LEGEND_STUDIO_COMMAND_KEY.GENERATE,
    title: 'Generate',
    description: 'Run model and file generations',
    icon: <FireIcon />,
  },
  {
    command: LEGEND_STUDIO_COMMAND_KEY.SYNC_WITH_WORKSPACE,
    title: 'Push changes',
    description: 'Save local changes to the workspace',
    icon: <CloudUploadIcon />,
  },
];

// shortcuts not covered by the actions above
const MORE_SHORTCUTS = [
  LEGEND_STUDIO_COMMAND_KEY.TOGGLE_PANEL_GROUP,
  LEGEND_STUDIO_COMMAND_KEY.TOGGLE_SIDEBAR_EXPLORER,
  LEGEND_STUDIO_COMMAND_KEY.TOGGLE_SIDEBAR_LOCAL_CHANGES,
  LEGEND_STUDIO_COMMAND_KEY.TOGGLE_MODEL_LOADER,
];

const CHANGE_LABELS: Record<string, string> = {
  [EntityChangeType.CREATE]: 'Added',
  [EntityChangeType.MODIFY]: 'Changed',
  [EntityChangeType.DELETE]: 'Deleted',
};

const MAX_CHANGES_SHOWN = 6;

type LearnLink = {
  title: string;
  description: string;
  shortcut?: string[] | undefined;
  external?: boolean | undefined;
  onClick: () => void;
};

/**
 * What the editor shows with no tab open: the workspace at a glance, the actions people reach for
 * (each one clickable, with its configured shortcut), the elements changed in this workspace, and
 * where to learn more.
 */
export const EditorLandingPage = observer(() => {
  const editorStore = useEditorStore();
  const applicationStore = useLegendStudioApplicationStore();
  const graphState = editorStore.graphState;
  const changeDetection = editorStore.changeDetectionState;
  const shortcutOf = (command: string): string[] | undefined => {
    const combination =
      applicationStore.keyboardShortcutsService.commandKeyMap.get(command)?.[0];
    return combination ? formatKeyCombination(combination) : undefined;
  };
  const run = (command: string): void => {
    applicationStore.commandService.runCommand(command);
  };
  const isBusy = graphState.isApplicationUpdateOperationIsRunning;

  // the workspace at a glance
  const project = editorStore.sdlcState.currentProject;
  const workspace = editorStore.sdlcState.currentWorkspace;
  const elementCount =
    editorStore.graphManagerState.graph.allOwnElements.length;
  const changes = changeDetection.workspaceLocalLatestRevisionState.changes;
  const areChangesLoading = !changeDetection.initState.hasSucceeded;
  const compileSummary =
    graphState.mostRecentCompilationOutcome === GraphCompilationOutcome.FAILED
      ? { kind: 'failed', text: 'Last compile failed' }
      : graphState.mostRecentCompilationOutcome ===
          GraphCompilationOutcome.SUCCEEDED
        ? graphState.areProblemsStale
          ? { kind: 'stale', text: 'Changed since the last compile' }
          : graphState.warnings.length
            ? { kind: 'warnings', text: 'Compiled with warnings' }
            : { kind: 'ok', text: 'Compiled, up to date' }
        : undefined;

  // where to learn more: only the entries this deployment has
  const docUrl = applicationStore.documentationService.url;
  const ruleEngagement = applicationStore.documentationService.getDocEntry(
    LEGEND_STUDIO_DOCUMENTATION_KEY.APPLICATION_RULE_ENGAGEMENT,
  );
  const learnLinks: LearnLink[] = [
    {
      title: 'Showcases',
      description: 'Sample projects and code to reuse',
      shortcut: shortcutOf(LEGEND_STUDIO_COMMAND_KEY.OPEN_SHOWCASES),
      onClick: (): void => run(LEGEND_STUDIO_COMMAND_KEY.OPEN_SHOWCASES),
    },
  ];
  if (docUrl) {
    learnLinks.push({
      title: 'Documentation',
      description: 'Guides and reference for Studio',
      external: true,
      onClick: (): void =>
        applicationStore.navigationService.navigator.visitAddress(docUrl),
    });
  }
  const ruleEngagementUrl = ruleEngagement?.url;
  if (ruleEngagementUrl) {
    learnLinks.push({
      title: ruleEngagement.title ?? 'Rule engagement',
      description: 'How to engage on modeling rules',
      external: true,
      onClick: (): void =>
        applicationStore.navigationService.navigator.visitAddress(
          ruleEngagementUrl,
        ),
    });
  }

  return (
    <div className="editor-landing">
      <div className="editor-landing__content">
        <header className="editor-landing__header">
          <div className="editor-landing__header__title">
            {project?.name ?? 'Workspace'}
          </div>
          <div className="editor-landing__header__meta">
            {workspace && (
              <span className="editor-landing__workspace">
                {workspace.workspaceType === WorkspaceType.GROUP ? (
                  <UsersIcon />
                ) : (
                  <UserIcon />
                )}
                {workspace.workspaceId}
              </span>
            )}
            <span>{elementCount} elements</span>
            <span>
              {areChangesLoading
                ? 'Looking for local changes…'
                : changes.length
                  ? `${changes.length} unpushed ${changes.length === 1 ? 'change' : 'changes'}`
                  : 'No local changes'}
            </span>
            {compileSummary && (
              <span
                className={clsx(
                  'editor-landing__compile',
                  `editor-landing__compile--${compileSummary.kind}`,
                )}
              >
                {compileSummary.kind === 'failed' ? (
                  <TimesCircleIcon />
                ) : compileSummary.kind === 'ok' ? (
                  <CheckCircleIcon />
                ) : (
                  <ExclamationTriangleIcon />
                )}
                {compileSummary.text}
              </span>
            )}
          </div>
        </header>

        <section className="editor-landing__section">
          <h2 className="editor-landing__section__title">Start</h2>
          <div className="editor-landing__actions">
            {ACTIONS.map((action) => {
              const shortcut = shortcutOf(action.command);
              return (
                <button
                  key={action.command}
                  className="editor-landing__action"
                  disabled={isBusy || editorStore.isInViewerMode}
                  onClick={(): void => run(action.command)}
                  title={
                    LEGEND_STUDIO_COMMAND_CONFIG[action.command]?.title ??
                    action.title
                  }
                >
                  <span className="editor-landing__action__icon">
                    {action.icon}
                  </span>
                  <span className="editor-landing__action__text">
                    <span className="editor-landing__action__head">
                      <span className="editor-landing__action__title">
                        {action.title}
                      </span>
                      {shortcut && <KeyCombination keys={shortcut} />}
                    </span>
                    <span className="editor-landing__action__description">
                      {action.description}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <div className="editor-landing__columns">
          <section className="editor-landing__section">
            <h2 className="editor-landing__section__title">
              Changed in this workspace
            </h2>
            {areChangesLoading ? (
              <div className="editor-landing__empty">
                Looking for local changes…
              </div>
            ) : changes.length ? (
              <ul className="editor-landing__changes">
                {changes.slice(0, MAX_CHANGES_SHOWN).map((change) => {
                  const path = change.newPath ?? change.oldPath ?? '';
                  const element =
                    editorStore.graphManagerState.graph.getNullableElement(
                      path,
                    );
                  return (
                    <li key={path}>
                      <button
                        className="editor-landing__change"
                        disabled={!element}
                        onClick={(): void => {
                          if (element) {
                            editorStore.graphEditorMode.openElement(element);
                          }
                        }}
                        title={path}
                      >
                        {element ? getElementIcon(element, editorStore) : null}
                        <span className="editor-landing__change__path">
                          {path}
                        </span>
                        <span
                          className={clsx(
                            'editor-landing__change__type',
                            `editor-landing__change__type--${change.entityChangeType.toLowerCase()}`,
                          )}
                        >
                          {CHANGE_LABELS[change.entityChangeType] ??
                            change.entityChangeType}
                        </span>
                      </button>
                    </li>
                  );
                })}
                {changes.length > MAX_CHANGES_SHOWN && (
                  <li className="editor-landing__more">
                    and {changes.length - MAX_CHANGES_SHOWN} more in Local
                    Changes
                  </li>
                )}
              </ul>
            ) : (
              <div className="editor-landing__empty">
                Nothing changed yet. Elements you add or edit show up here until
                you push them.
              </div>
            )}
          </section>

          <section className="editor-landing__section">
            <h2 className="editor-landing__section__title">Learn</h2>
            <div className="editor-landing__links">
              {learnLinks.map((link) => (
                <button
                  key={link.title}
                  className="editor-landing__link"
                  onClick={link.onClick}
                >
                  <LibraryBooksIcon />
                  <span className="editor-landing__action__text">
                    <span className="editor-landing__action__title">
                      {link.title}
                      {link.external && <ExternalLinkIcon />}
                    </span>
                    <span className="editor-landing__action__description">
                      {link.description}
                    </span>
                  </span>
                  {link.shortcut && <KeyCombination keys={link.shortcut} />}
                </button>
              ))}
            </div>
            <h2 className="editor-landing__section__title editor-landing__section__title--small">
              More shortcuts
            </h2>
            <ul className="editor-landing__shortcuts">
              {MORE_SHORTCUTS.map((command) => {
                const shortcut = shortcutOf(command);
                return (
                  shortcut && (
                    <li key={command} className="editor-landing__shortcut">
                      <span>
                        {LEGEND_STUDIO_COMMAND_CONFIG[command]?.title}
                      </span>
                      <KeyCombination keys={shortcut} />
                    </li>
                  )
                );
              })}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
});
