constraints_min_version(1).

% This file is written in Prolog
% It contains rules that the project must respect.
% In order to see them in action, run `yarn constraints source`

% Enforce that a workspace MUST depend on the same version of a dependency as the one used by the other workspaces
gen_enforced_dependency(WorkspaceCwd, DependencyIdent, DependencyRange2, DependencyType) :-
  % Iterate over all dependencies from all workspaces
    workspace_has_dependency(WorkspaceCwd, DependencyIdent, DependencyRange, DependencyType),
  % Iterate over similarly-named dependencies from all workspaces (again)
    workspace_has_dependency(OtherWorkspaceCwd, DependencyIdent, DependencyRange2, DependencyType2),
  % Ignore peer dependencies
    DependencyType \= 'peerDependencies',
    DependencyType2 \= 'peerDependencies'.

% Prevent workspaces from depending on outdated versions of available workspaces
gen_enforced_dependency(WorkspaceCwd, DependencyIdent, WorkspaceRange, DependencyType) :-
  % Iterate over all dependencies from all workspaces
    workspace_has_dependency(WorkspaceCwd, DependencyIdent, DependencyRange, DependencyType),
  % Only consider those that target something that could be a workspace
    workspace_ident(DependencyCwd, DependencyIdent),
  % Obtain the version from the dependency
    workspace_field(DependencyCwd, 'version', DependencyVersion),
  % Discard the workspaces that don't declare a version field
    atom(DependencyVersion),
  % Only proceed if the dependency isn't satisfied by a workspace
    \+ project_workspaces_by_descriptor(DependencyIdent, DependencyRange, DependencyCwd),
  % Derive the expected range from the version
    (
      DependencyType \= 'peerDependencies' ->
        atom_concat('workspace:^', DependencyVersion, WorkspaceRange)
      ;
        atom_concat('^', DependencyVersion, WorkspaceRange)
    ).

% Enforce that all workspaces must depend on other workspaces using `workspace:*` in devDependencies
gen_enforced_dependency(WorkspaceCwd, DependencyIdent, 'workspace:*', 'devDependencies') :-
  workspace_has_dependency(WorkspaceCwd, DependencyIdent, _, 'devDependencies'),
  % Only consider those that target something that could be a workspace
  workspace_ident(DependencyCwd, DependencyIdent).

% Enforce that all workspaces must depend on other workspaces using `workspace:*` in dependencies
gen_enforced_dependency(WorkspaceCwd, DependencyIdent, 'workspace:*', 'dependencies') :-
  workspace_has_dependency(WorkspaceCwd, DependencyIdent, _, 'dependencies'),
  % Only consider those that target something that could be a workspace
  workspace_ident(DependencyCwd, DependencyIdent).

% Enforce that only private workspaces can have non-dev private dependencies on other workspaces
gen_enforced_field(WorkspaceCwd, 'private', WorkspacePrivate) :-
    workspace(WorkspaceCwd),
    workspace_has_dependency(WorkspaceCwd, DependencyIdent, DependencyRange, DependencyType),
  % Only consider those that target something that could be a workspace
    workspace_ident(DependencyCwd, DependencyIdent),
    workspace_field(DependencyCwd, 'private', DependencyPrivate),
    DependencyType == 'dependencies',
    (
      DependencyPrivate == 'true' -> WorkspacePrivate = 'true'
    ).

% Required to display information in NPM properly
gen_enforced_field(WorkspaceCwd, 'license', 'Apache-2.0') :-
  workspace(WorkspaceCwd),
  % Skip private workspaces
    \+ workspace_field_test(WorkspaceCwd, 'private', 'true').
gen_enforced_field(WorkspaceCwd, 'repository.type', 'git') :-
  workspace(WorkspaceCwd),
  % Skip private workspaces
    \+ workspace_field_test(WorkspaceCwd, 'private', 'true').
gen_enforced_field(WorkspaceCwd, 'bugs.url', 'https://github.com/finos/legend-studio/issues') :-
  workspace(WorkspaceCwd),
  % Skip private workspaces
    \+ workspace_field_test(WorkspaceCwd, 'private', 'true').
gen_enforced_field(WorkspaceCwd, 'repository.url', 'https://github.com/finos/legend-studio.git') :-
  workspace(WorkspaceCwd),
  % Skip private workspaces
    \+ workspace_field_test(WorkspaceCwd, 'private', 'true').
gen_enforced_field(WorkspaceCwd, 'repository.directory', WorkspaceCwd) :-
  workspace(WorkspaceCwd),
  % Skip private workspaces
    \+ workspace_field_test(WorkspaceCwd, 'private', 'true').
gen_enforced_field(WorkspaceCwd, 'homepage', HomepageUrl) :-
  workspace(WorkspaceCwd),
  atom_concat('https://github.com/finos/legend-studio/tree/master/', WorkspaceCwd, HomepageUrl),
  % Skip private workspaces
    \+ workspace_field_test(WorkspaceCwd, 'private', 'true').

% Make sure all packages that can be published must specify a script and a directory to stage/prepare publish content
gen_enforced_field(WorkspaceCwd, 'publishConfig.directory', 'build/publishContent') :-
  workspace(WorkspaceCwd),
  % Skip private workspaces
    \+ workspace_field_test(WorkspaceCwd, 'private', 'true').
gen_enforced_field(WorkspaceCwd, 'scripts.publish:prepare', 'node ../../scripts/release/preparePublishContent.js') :-
  workspace(WorkspaceCwd),
  % Skip private workspaces
    \+ workspace_field_test(WorkspaceCwd, 'private', 'true').
