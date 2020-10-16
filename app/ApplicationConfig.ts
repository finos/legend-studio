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

import { client } from 'API/NetworkClient';
import { assertNonNullable, IllegalStateError, guaranteeNonNullable } from 'Utilities/GeneralUtil';
import { executionClient } from 'API/ExecutionClient';
import { Log, LOG_EVENT } from 'Utilities/Logger';

interface DocumentationInfo {
  fullDocUrl: string;
  projectCreationDocUrl?: string;
}

interface AppFeatureConfig {
  BETA__demoMode: boolean;
  BETA__productionProjectsOnly: boolean;
  BETA__grammarImport: boolean;
}

enum APP_FEATURE {
  // BETA this flag will be removed when we open source and remove demo mode
  BETA__DEMO_MODE = 'beta__demo-mode',
  // BETA: this flag will potentially be removed when we partition the projects by SDLC instance
  // e.g. prototype projects only show up in UAT/QA realms, and PROD projects only shows up in PROD
  // this flag was created to disable prototype projects as the UAT/QA realm for SDLC is sometimes
  // rather unstable
  BETA__PRODUCTION_PROJECTS_ONLY = 'beta__production-projects-only',
  // BETA: grammar import using section index is currently not supported as we are still trying
  // to figure out how we want to store this element in SDLC
  BETA__GRAMMAR_IMPORT = 'beta__grammar-import',
}

interface ConfigurationResponse {
  realm: string;
  sdlcServer: string;
  execServer: string;
  tracerServer: string;
  documentation: DocumentationInfo;
  features: APP_FEATURE[],
}

interface VersionResponse {
  'git.build.time': string;
  'git.build.version': string;
  'git.commit.id': string;
}

/**
 * Shared global application configuration (singleton) created and initialized before anything else.
 * NOTE: unlike all other application states, the app config is immutable and only initialized once
 */
class ApplicationConfig {
  static instance: ApplicationConfig;
  readonly appName = 'studio';
  private configured = false;

  private _realm?: string;
  private _sdlcServerUrl?: string;
  private _executionServerUrl?: string;
  private _tracerServerUrl?: string;
  private _documentations?: DocumentationInfo;
  private _features?: AppFeatureConfig;
  private _appVersion?: string;
  private _appVersionBuildTime?: string;
  private _appVersionCommitId?: string;
  private _userId?: string;

  get realm(): string { return guaranteeNonNullable(this._realm, 'Application environment is not configured') }
  get sdlcServerUrl(): string { return guaranteeNonNullable(this._sdlcServerUrl, 'SDLC server URL is not configured') }
  get executionServerUrl(): string { return guaranteeNonNullable(this._executionServerUrl, 'Execution server URL is not configured') }
  get tracerServerUrl(): string { return guaranteeNonNullable(this._tracerServerUrl, 'Tracer server URL is not configured') }
  get documentations(): DocumentationInfo { return guaranteeNonNullable(this._documentations, 'Documentation info is not configured') }
  get features(): AppFeatureConfig { return guaranteeNonNullable(this._features, 'Application feature set is not configured') }
  get appVersion(): string { return guaranteeNonNullable(this._appVersion, 'Application version is not configured') }
  get appVersionBuildTime(): string { return guaranteeNonNullable(this._appVersionBuildTime, 'Application version build time is not configured') }
  get appVersionCommitId(): string { return guaranteeNonNullable(this._appVersionCommitId, 'Application version commit ID is not configured') }
  get userId(): string { return guaranteeNonNullable(this._userId, 'User ID is not configured') }

  async configure(): Promise<void> {
    if (this.configured) { throw new IllegalStateError('Configuration should only happen once') }
    // Configuration
    let configData;
    try {
      configData = await client.get<ConfigurationResponse>(`/${this.appName}/config.json`);
    } catch (error) {
      Log.error(LOG_EVENT.CONFIG_CONFIGURATION_FETCHING_PROBLEM, error);
    }
    assertNonNullable(configData, 'Configuration object is missing');
    this._realm = guaranteeNonNullable(configData.realm, 'Configration realm is missing');
    this._sdlcServerUrl = guaranteeNonNullable(configData.sdlcServer, 'Configuration SDLC server URL is missing');
    this._executionServerUrl = guaranteeNonNullable(configData.execServer, 'Configuration execution server URL is missing');
    this._tracerServerUrl = guaranteeNonNullable(configData.tracerServer, 'Configuration tracer server URL is missing');
    this._documentations = guaranteeNonNullable(configData.documentation, 'Configuration documentation info is missing');
    this._documentations.fullDocUrl = guaranteeNonNullable(configData.documentation.fullDocUrl, 'Configuration full documentation URL is missing');
    // Feature
    const featureSet = guaranteeNonNullable(configData.features, 'Configuration feature set info is missing');
    this._features = {
      BETA__demoMode: featureSet.includes(APP_FEATURE.BETA__DEMO_MODE),
      BETA__productionProjectsOnly: featureSet.includes(APP_FEATURE.BETA__PRODUCTION_PROJECTS_ONLY),
      BETA__grammarImport: featureSet.includes(APP_FEATURE.BETA__GRAMMAR_IMPORT),
    };
    const unknownFeatureFlags = featureSet.filter(flag => !Object.values(APP_FEATURE).includes(flag));
    if (unknownFeatureFlags.length) {
      Log.error(LOG_EVENT.CONFIG_UNKNOWN_FEATURE_FLAG_PROBLEM, `Configuration object contains unknown feature flags [${unknownFeatureFlags.join(', ')}]`);
    }
    try {
      this._userId = await client.get<string>(executionClient.currentUser(this.executionServerUrl));
    } catch (error) {
      Log.error(LOG_EVENT.CONFIG_USER_ID_FETCHING_PROBLEM, error);
    }
    assertNonNullable(this._userId, 'User ID data is missing');
    this.configured = true;
    // App Version
    let appVersionInfo;
    try {
      appVersionInfo = await client.get<VersionResponse>(`/${this.appName}/version.json`);
    } catch (error) {
      Log.error(LOG_EVENT.CONFIG_VERSION_INFO_FETCHING_PROBLEM, error);
    }
    assertNonNullable(appVersionInfo, 'Application version data is missing');
    this._appVersion = appVersionInfo['git.build.version'];
    this._appVersionBuildTime = appVersionInfo['git.build.time'];
    this._appVersionCommitId = appVersionInfo['git.commit.id'];
    Object.freeze(this); // make the config immutable
  }
}

ApplicationConfig.instance = new ApplicationConfig();
export const config = ApplicationConfig.instance;
