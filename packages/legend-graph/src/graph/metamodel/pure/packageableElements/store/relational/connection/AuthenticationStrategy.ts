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

import { CORE_HASH_STRUCTURE } from '../../../../../../../graph/Core_HashUtils.js';
import { type Hashable, hashArray } from '@finos/legend-shared';

export abstract class AuthenticationStrategy implements Hashable {
  abstract get hashCode(): string;
}

export class DelegatedKerberosAuthenticationStrategy
  extends AuthenticationStrategy
  implements Hashable
{
  serverPrincipal?: string | undefined;

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
  get hashCode(): string {
    return hashArray([CORE_HASH_STRUCTURE.DEFAULT_H2_AUTHENTICATION_STRATEGY]);
  }
}

export class ApiTokenAuthenticationStrategy
  extends AuthenticationStrategy
  implements Hashable
{
  apiToken: string;

  constructor(apiToken: string) {
    super();
    this.apiToken = apiToken;
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.API_TOKEN_AUTHENTICATION_STRATEGY,
      this.apiToken,
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
    this.oauthKey = oauthKey;
    this.scopeName = scopeName;
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
    this.privateKeyVaultReference = privateKeyVaultReference;
    this.passPhraseVaultReference = passPhraseVaultReference;
    this.publicUserName = publicUserName;
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

export class GCPApplicationDefaultCredentialsAuthenticationStrategy
  extends AuthenticationStrategy
  implements Hashable
{
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
  serviceAccountEmail: string;
  additionalGcpScopes: string[] = [];

  constructor(serviceAccountEmail: string, additionalGcpScopes: string[] = []) {
    super();
    this.serviceAccountEmail = serviceAccountEmail;
    this.additionalGcpScopes = additionalGcpScopes;
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.GCP_WORKLOAD_IDENTITY_FEDERATION_AUTHENTICATION_STRATEGY,
      this.serviceAccountEmail,
      hashArray(this.additionalGcpScopes),
    ]);
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
    this.userNameVaultReference = userNameVaultReference;
    this.passwordVaultReference = passwordVaultReference;
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

export class MiddleTierUsernamePasswordAuthenticationStrategy
  extends AuthenticationStrategy
  implements Hashable
{
  vaultReference: string;

  constructor(vaultReference: string) {
    super();
    this.vaultReference = vaultReference;
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.MIDDLE_TIER_USERNAME_PASSWORD_AUTHENTICATION_STRATEGY,
      this.vaultReference,
    ]);
  }
}

export class TrinoDelegatedKerberosAuthenticationStrategy
  extends AuthenticationStrategy
  implements Hashable
{
  kerberosRemoteServiceName: string;
  kerberosUseCanonicalHostname: boolean;

  constructor(
    kerberosRemoteServiceName: string,
    kerberosUseCanonicalHostname: boolean,
  ) {
    super();
    this.kerberosRemoteServiceName = kerberosRemoteServiceName;
    this.kerberosUseCanonicalHostname = kerberosUseCanonicalHostname;
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.TRINO_DELEGATED_KERBEROS_AUTHENTICATION_STRATEGY,
      this.kerberosRemoteServiceName,
      this.kerberosUseCanonicalHostname.toString(),
    ]);
  }
}
