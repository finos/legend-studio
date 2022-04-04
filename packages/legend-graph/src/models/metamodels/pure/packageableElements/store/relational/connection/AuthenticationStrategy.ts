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
import { observable, computed, makeObservable } from 'mobx';

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
    });
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

export class ApiTokenAuthenticationStrategy
  extends AuthenticationStrategy
  implements Hashable
{
  apiToken: string;

  constructor(apiToken: string) {
    super();

    makeObservable(this, {
      apiToken: observable,
      hashCode: computed,
    });

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

    makeObservable(this, {
      oauthKey: observable,
      scopeName: observable,
      hashCode: computed,
    });
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

    makeObservable(this, {
      privateKeyVaultReference: observable,
      passPhraseVaultReference: observable,
      publicUserName: observable,
      hashCode: computed,
    });

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
    });

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
