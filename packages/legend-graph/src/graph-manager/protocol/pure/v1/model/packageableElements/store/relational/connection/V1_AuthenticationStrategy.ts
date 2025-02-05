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

import { CORE_HASH_STRUCTURE } from '../../../../../../../../../graph/Core_HashUtils.js';
import { type Hashable, hashArray } from '@finos/legend-shared';

export abstract class V1_AuthenticationStrategy implements Hashable {
  abstract get hashCode(): string;
}

export class V1_DelegatedKerberosAuthenticationStrategy
  extends V1_AuthenticationStrategy
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

export class V1_DefaultH2AuthenticationStrategy
  extends V1_AuthenticationStrategy
  implements Hashable
{
  get hashCode(): string {
    return hashArray([CORE_HASH_STRUCTURE.DEFAULT_H2_AUTHENTICATION_STRATEGY]);
  }
}

export class V1_TestAuthenticationStrategy
  extends V1_DefaultH2AuthenticationStrategy
  implements Hashable
{
  override get hashCode(): string {
    return hashArray([CORE_HASH_STRUCTURE.TEST_AUTHENTICATION_STRATEGY]);
  }
}

export class V1_OAuthAuthenticationStrategy
  extends V1_AuthenticationStrategy
  implements Hashable
{
  oauthKey!: string;
  scopeName!: string;

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.OAUTH_AUTHENTICATION_STRATEGY,
      this.oauthKey,
      this.scopeName,
    ]);
  }
}

export class V1_ApiTokenAuthenticationStrategy
  extends V1_AuthenticationStrategy
  implements Hashable
{
  apiToken!: string;

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.API_TOKEN_AUTHENTICATION_STRATEGY,
      this.apiToken,
    ]);
  }
}

export class V1_SnowflakePublicAuthenticationStrategy
  extends V1_AuthenticationStrategy
  implements Hashable
{
  privateKeyVaultReference!: string;
  passPhraseVaultReference!: string;
  publicUserName!: string;

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.SNOWFLAKE_PUBLIC_AUTHENTICATION_STRATEGY,
      this.privateKeyVaultReference,
      this.passPhraseVaultReference,
      this.publicUserName,
    ]);
  }
}

export class V1_GCPApplicationDefaultCredentialsAuthenticationStrategy
  extends V1_AuthenticationStrategy
  implements Hashable
{
  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.GCP_APPLICATION_DEFAULT_CREDENTIALS_AUTHENTICATION_STRATEGY,
    ]);
  }
}

export class V1_GCPWorkloadIdentityFederationAuthenticationStrategy
  extends V1_AuthenticationStrategy
  implements Hashable
{
  serviceAccountEmail!: string;
  additionalGcpScopes: string[] = [];

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.GCP_WORKLOAD_IDENTITY_FEDERATION_AUTHENTICATION_STRATEGY,
      this.serviceAccountEmail,
      hashArray(this.additionalGcpScopes),
    ]);
  }
}

export class V1_UsernamePasswordAuthenticationStrategy
  extends V1_AuthenticationStrategy
  implements Hashable
{
  baseVaultReference?: string | undefined;
  userNameVaultReference!: string;
  passwordVaultReference!: string;

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.USERNAME_PASSWORD_AUTHENTICATION_STRATEGY,
      this.baseVaultReference?.toString() ?? '',
      this.userNameVaultReference,
      this.passwordVaultReference,
    ]);
  }
}

export class V1_MiddleTierUsernamePasswordAuthenticationStrategy
  extends V1_AuthenticationStrategy
  implements Hashable
{
  vaultReference!: string;

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.MIDDLE_TIER_USERNAME_PASSWORD_AUTHENTICATION_STRATEGY,
      this.vaultReference,
    ]);
  }
}

export class V1_TrinoDelegatedKerberosAuthenticationStrategy
  extends V1_AuthenticationStrategy
  implements Hashable
{
  kerberosRemoteServiceName!: string;
  kerberosUseCanonicalHostname!: boolean;

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.TRINO_DELEGATED_KERBEROS_AUTHENTICATION_STRATEGY,
      this.kerberosRemoteServiceName,
      this.kerberosUseCanonicalHostname.toString(),
    ]);
  }
}
