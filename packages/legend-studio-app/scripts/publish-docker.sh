#!/bin/bash

LIGHT_BLUE='\033[1;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# NOTE: this script requires `jq` to process JSON

# NOTE: This scripts use Docker Hub V2 API. The limitation of using the `v2` API is that it is paginated,
# so we cannot get more than 10 results unlike using `v1` which gives us all tags.
# But `v1` is being deprecated and its results are not sorted, so if we do comparison, we will need to
# sort by time or interpret using `semver` which is not ideal.
# So we use `v2` API assuming that the ONLY time we release to Docker is through using this script; with
# that assumption, it's relatively safe to just check the top 10 tags.

echo "\n${LIGHT_BLUE}"
echo "###################################################################"
echo "#            ATTEMPTING TO PUBLISHING TO DOCKER HUB               #"
echo "###################################################################"
echo "${NC}\n"

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
DOCKER_IMAGE_VERSION=$(cat $DIR/../package.json | jq .version | jq -r)
DOCKER_IMAGE_NAME="finos/legend-studio"
TEMP_IMAGE_NAME="finos/legend-engine-server" # TO BE DELETED

# Check the current latest tag for the Docker image, if there are any, check if the current version is already
# the latest, if so, do nothing
DOCKER_IMAGE_TAGS=$(curl --silent https://registry.hub.docker.com/v2/repositories/$DOCKER_IMAGE_NAME/tags | jq .results)
DOCKER_IMAGE_TAG_SIZE=$(echo $DOCKER_IMAGE_TAGS | jq length)

for (( i=0; i<$DOCKER_IMAGE_TAG_SIZE; i++ ))
do
  _TAG=$(echo $DOCKER_IMAGE_TAGS | jq .[$i] | jq .name | jq -r)
  if [[ $_TAG == "latest" ]];
    then
      continue
  elif [[ $_TAG == $DOCKER_IMAGE_VERSION ]];
    then
      echo "${YELLOW}Image $DOCKER_IMAGE_NAME:$DOCKER_IMAGE_VERSION already exists. Aborting...${NC}"
      exit 0
  fi
done
echo "${LIGHT_BLUE}Image $DOCKER_IMAGE_NAME:$DOCKER_IMAGE_VERSION has not been published. Proceeding...${NC}"

# Check if the image `legend-shared-server` is on the latest version. If not, throw error.
SERVER_IMAGE_NAME="finos/legend-shared-server"
ESCAPED_SERVER_IMAGE_NAME=$(echo $SERVER_IMAGE_NAME | sed 's/\//\\\//g')
SERVER_IMAGE_VERSION=$(cat $DIR/../Dockerfile | grep "^FROM $SERVER_IMAGE_NAME:\(.*\)$" | sed -e "s/FROM $ESCAPED_SERVER_IMAGE_NAME://")
SERVER_IMAGE_TAGS=$(curl --silent https://registry.hub.docker.com/v2/repositories/$SERVER_IMAGE_NAME/tags | jq .results)
SERVER_IMAGE_TAG_SIZE=$(echo $SERVER_IMAGE_TAGS | jq length)

for (( i=0; i<$SERVER_IMAGE_TAG_SIZE; i++ ))
do
  _TAG=$(echo $SERVER_IMAGE_TAGS | jq .[$i] | jq .name | jq -r)
  if [[ $_TAG == "latest" ]];
    then
      continue
  elif [[ $_TAG == $SERVER_IMAGE_VERSION ]];
    then
      echo "${LIGHT_BLUE}Server image $DOCKER_IMAGE_NAME:$DOCKER_IMAGE_VERSION is already up-to-date exists. Proceeding...${NC}"
      break
  else
    echo "${RED}Server image $SERVER_IMAGE_NAME:$SERVER_IMAGE_VERSION is not up-to-date. Please update to the latest $SERVER_IMAGE_NAME:$_TAG. Aborting...${NC}"
    exit 1
  fi
done

# Login to Docker Hub
docker login --username $DOCKER_USERNAME --password $DOCKER_PASSWORD

# Build Docker image
docker build -t $DOCKER_IMAGE_NAME:$DOCKER_IMAGE_VERSION $DIR/../

# Push Docker image
docker push $DOCKER_IMAGE_NAME:$DOCKER_IMAGE_VERSION

echo "\n${GREEN}Successfully published image $DOCKER_IMAGE_NAME:$DOCKER_IMAGE_VERSION to Docker Hub! ${NC}"
