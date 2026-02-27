# Studio Docker Compose Dev Setup

This guide describes how to run the Legend backend services using Docker Compose from the `legend-docker` installers for local Studio development.

## 0. Checkout Legend Docker

The Docker Compose configuration resides in the [legend](https://github.com/finos/legend) repository. You need to check this out into a `.legend-docker` directory at the root of the `legend-studio` project if it is not already present.

Run this from the `legend-studio` root:

```powershell
git clone https://github.com/finos/legend.git .legend-docker
```

## 1. Initial Setup

1. **Navigate to the installers directory**:
   ```powershell
   cd .legend-docker/installers/docker-compose
   ```
2. **Configure Environment**:
   Modify the `.legend-docker/installers/docker-compose/.env` file .
   a. Ensure you have the correct image versions and names:
   - **Engine**: Use `ENGINE_IMAGE_NAME=finos/legend-engine-server-http-server` and `ENGINE_IMAGE_VERSION=snapshot` (or a stable tag like `4.113.0`).
   - **SDLC**: Use `SDLC_IMAGE_VERSION=snapshot` (or `0.195.0`).
   - **GitLab**: Configure `GITLAB_APP_ID` and `GITLAB_APP_SECRET`.

## 2. Authentication (First-time / Session Expired)

Legend SDLC uses GitLab for OAuth. If you receive a **403 "Authorization required"** error when accessing APIs or Legend Studio:

1. **Visit the authorization endpoint in your browser**:
   [http://localhost:6100/api/auth/authorize](http://localhost:6100/api/auth/authorize)
2. **Authorize the application**: You will be redirected to GitLab. Log in if necessary and click **Authorize**.
3. **Return to Studio**: Once redirected back to a "Success" message or the SDLC API, you can refresh Legend Studio (usually at `http://localhost:9000/studio`).

## 3. Running Services

### Start everything (Studio Profile)

To bring up all backend services required for Legend Studio:

```powershell
docker compose --profile studio up -d
```

### Start specific profiles for local Studio development

If you are running Legend Studio locally (via `yarn dev`) and only need the backend services (like Engine and SDLC):

```powershell
docker compose --profile engine --profile sdlc up -d
```

### Refreshing Images

To pull the latest versions of the images before starting:

```powershell
docker compose --profile studio pull
docker compose --profile studio up -d --force-recreate
```

## 3. Advanced Usage

### Running from a different directory

You can specify the path to the compose file using the `-f` flag:

```powershell
docker compose -f .legend-docker/installers/docker-compose/docker-compose.yml --profile studio up -d
```

### Starting minimum services

You can use one or more profiles to start the subset of services needed. e.g. for Local Studio development:

```powershell
docker compose -f .legend-docker/installers/docker-compose/docker-compose.yml --profile engine --profile sdlc up -d
```

### Stopping Services

To stop and remove the containers, networks, and images defined in the compose file:

```powershell
docker compose -f .legend-docker/installers/docker-compose/docker-compose.yml down
```

> [!NOTE]
> If you run from a different directory, relative paths in the compose file will resolve relative to the compose file location. You can use `--project-directory` to change this behavior.
