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

import { CORE_HASH_STRUCTURE } from '../../../../../../../MetaModelConst';
import { type Hashable, hashArray } from '@finos/legend-shared';
import { observable, computed, makeObservable, action } from 'mobx';

export abstract class AuthenticationStrategy implements Hashable {
  private readonly _$nominalTypeBrand!: 'AuthenticationStrategy';

  abstract get hashCode(): string;
}

export class DelegatedKerberosAuthenticationStrategy
  extends AuthenticationStrategy
  implements Hashable
{
  serverPrincipal?: string | undefined;
  constructor() {
    super();

    makeObservable(this, {
      hashCode: computed,
      setServerPrincipal: action,
    });
  }

  setServerPrincipal(val?: string): void {
    this.serverPrincipal = val;
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.DELEGRATED_KEREBEROS_AUTHENTICATION_STRATEGY,
      this.serverPrincipal?.toString() ?? '',
    ]);
  }
}

export class DefaultH2AuthenticationStrategy
  extends AuthenticationStrategy
  implements Hashable
{
  constructor() {
    super();

    makeObservable(this, {
      hashCode: computed,
    });
  }

  get hashCode(): string {
    return hashArray([CORE_HASH_STRUCTURE.DEFAULT_H2_AUTHENTICATION_STRATEGY]);
  }
}

export class TestDatabaseAuthenticationStrategy
  extends DefaultH2AuthenticationStrategy
  implements Hashable
{
  constructor() {
    super();

    makeObservable(this, {
      hashCode: computed,
    });
  }

  override get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.TEST_DATABASE_AUTHENTICATION_STRATEGY,
    ]);
  }
}

export class OAuthAuthenticationStrategy
  extends AuthenticationStrategy
  implements Hashable
{
  oauthKey: string;
  scopeName: string;

  constructor(oauthKey: string, scopeName: string) {
    super();

    makeObservable(this, {
      oauthKey: observable,
      scopeName: observable,
      hashCode: computed,
      setOauthKey: action,
      setScopeName: action,
    });
    this.oauthKey = oauthKey;
    this.scopeName = scopeName;
  }

  setOauthKey(val: string): void {
    this.oauthKey = val;
  }

  setScopeName(val: string): void {
    this.scopeName = val;
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.OAUTH_AUTHENTICATION_STRATEGY,
      this.oauthKey,
      this.scopeName,
    ]);
  }
}

export class SnowflakePublicAuthenticationStrategy
  extends AuthenticationStrategy
  implements Hashable
{
  privateKeyVaultReference: string;
  passPhraseVaultReference: string;
  publicUserName: string;

  constructor(
    privateKeyVaultReference: string,
    passPhraseVaultReference: string,
    publicUserName: string,
  ) {
    super();

    makeObservable(this, {
      privateKeyVaultReference: observable,
      passPhraseVaultReference: observable,
      publicUserName: observable,
      setPrivateKeyVaultReference: action,
      setPassPhraseVaultReference: action,
      setPublicUserName: action,
      hashCode: computed,
    });

    this.privateKeyVaultReference = privateKeyVaultReference;
    this.passPhraseVaultReference = passPhraseVaultReference;
    this.publicUserName = publicUserName;
  }

  setPrivateKeyVaultReference(val: string): void {
    this.privateKeyVaultReference = val;
  }

  setPassPhraseVaultReference(val: string): void {
    this.passPhraseVaultReference = val;
  }

  setPublicUserName(val: string): void {
    this.publicUserName = val;
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.SNOWFLAKE_PUBLIC_AUTHENTICATION_STRATEGY,
      this.privateKeyVaultReference,
      this.passPhraseVaultReference,
      this.publicUserName,
    ]);
  }
}

export class UserPasswordAuthenticationStrategy
  extends AuthenticationStrategy
  implements Hashable
{
  userName: string;
  passwordVaultReference: string;

  constructor(userName: string, passwordVaultReference: string) {
    super();

    makeObservable(this, {
      userName: observable,
      passwordVaultReference: observable,
      setUserName: action,
      setPasswordVaultReference: action,
      hashCode: computed,
    });

    this.userName = userName;
    this.passwordVaultReference = passwordVaultReference;
  }

  setUserName(val: string): void {
    this.userName = val;
  }

  setPasswordVaultReference(val: string): void {
    this.passwordVaultReference = val;
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.USER_PASSWORD_AUTHENTICATION_STRATEGY,
      this.userName,
      this.passwordVaultReference,
    ]);
  }
}

export class GCPApplicationDefaultCredentialsAuthenticationStrategy
  extends AuthenticationStrategy
  implements Hashable
{
  constructor() {
    super();

    makeObservable(this, {
      hashCode: computed,
    });
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.GCP_APPLICATION_DEFAULT_CREDENTIALS_AUTHENTICATION_STRATEGY,
    ]);
  }
}

export class GCPWorkloadIdentityFederationAuthenticationStrategy
  extends AuthenticationStrategy
  implements Hashable
{
  workloadProjectNumber: string;
  serviceAccountEmail: string;
  gcpScope: string;
  workloadPoolId: string;
  workloadProviderId: string;
  discoveryUrl: string;
  clientId: string;

  constructor(
    workloadProjectNumber: string,
    serviceAccountEmail: string,
    gcpScope: string,
    workloadPoolId: string,
    workloadProviderId: string,
    discoveryUrl: string,
    clientId: string,
  ) {
    super();

    makeObservable(this, {
      hashCode: computed,
      workloadProjectNumber: observable,
      serviceAccountEmail: observable,
      gcpScope: observable,
      workloadPoolId: observable,
      workloadProviderId: observable,
      discoveryUrl: observable,
      clientId: observable,
      setWorkloadProjectNumber: action,
      setServiceAccountEmail: action,
      setGcpScope: action,
      setWorkloadPoolId: action,
      setWorkloadProviderId: action,
      setDiscoveryUrl: action,
      setClientId: action,
    });

    this.workloadProjectNumber = workloadProjectNumber;
    this.serviceAccountEmail = serviceAccountEmail;
    this.gcpScope = gcpScope;
    this.workloadPoolId = workloadPoolId;
    this.workloadProviderId = workloadProviderId;
    this.discoveryUrl = discoveryUrl;
    this.clientId = clientId;
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.GCP_WORKLOAD_IDENTITY_FEDERATION_AUTHENTICATION_STRATEGY,
      this.workloadProjectNumber,
      this.serviceAccountEmail,
      this.gcpScope,
      this.workloadPoolId,
      this.workloadProviderId,
      this.discoveryUrl,
      this.clientId,
    ]);
  }

  setWorkloadProjectNumber(val: string): void {
    this.workloadProjectNumber = val;
  }

  setServiceAccountEmail(val: string): void {
    this.serviceAccountEmail = val;
  }

  setGcpScope(val: string): void {
    this.gcpScope = val;
  }

  setWorkloadPoolId(val: string): void {
    this.workloadPoolId = val;
  }

  setWorkloadProviderId(val: string): void {
    this.workloadProviderId = val;
  }

  setDiscoveryUrl(val: string): void {
    this.discoveryUrl = val;
  }

  setClientId(val: string): void {
    this.clientId = val;
  }
}

export class UsernamePasswordAuthenticationStrategy
  extends AuthenticationStrategy
  implements Hashable
{
  baseVaultReference?: string | undefined;
  userNameVaultReference: string;
  passwordVaultReference: string;

  constructor(userNameVaultReference: string, passwordVaultReference: string) {
    super();

    makeObservable(this, {
      hashCode: computed,
      userNameVaultReference: observable,
      passwordVaultReference: observable,
      baseVaultReference: observable,
      setBaseVaultReference: action,
      setPasswordVaultReference: action,
      setUserNameVaultReference: action,
    });

    this.userNameVaultReference = userNameVaultReference;
    this.passwordVaultReference = passwordVaultReference;
  }

  setBaseVaultReference(val: string | undefined): void {
    this.baseVaultReference = val;
  }

  setUserNameVaultReference(val: string): void {
    this.userNameVaultReference = val;
  }

  setPasswordVaultReference(val: string): void {
    this.passwordVaultReference = val;
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.USERNAME_PASSWORD_AUTHENTICATION_STRATEGY,
      this.baseVaultReference?.toString() ?? '',
      this.userNameVaultReference,
      this.passwordVaultReference,
    ]);
  }
}
