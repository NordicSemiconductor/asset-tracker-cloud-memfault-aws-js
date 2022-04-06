# Memfault integration for AWS IoT

[![GitHub Actions](https://github.com/NordicSemiconductor/asset-tracker-cloud-memfault-aws-js/workflows/Test%20and%20Release/badge.svg)](https://github.com/NordicSemiconductor/asset-tracker-cloud-memfault-aws-js/actions)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)
[![Renovate](https://img.shields.io/badge/renovate-enabled-brightgreen.svg)](https://renovatebot.com)
[![Mergify Status](https://img.shields.io/endpoint.svg?url=https://gh.mergify.io/badges/NordicSemiconductor/asset-tracker-cloud-memfault-aws-js)](https://mergify.io)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg)](https://github.com/prettier/prettier/)
[![ESLint: TypeScript](https://img.shields.io/badge/ESLint-TypeScript-blue.svg)](https://github.com/typescript-eslint/typescript-eslint)

Memfault integration for AWS IoT developed using AWS CDK in
[TypeScript](https://www.typescriptlang.org/).

## Installation in your AWS account

### Setup

Provide your AWS credentials, for example using the `.envrc` (see
[the example](./envrc.example)).

Install `zip`.

Install the dependencies:

    npm ci

Optionally,
[enable `THING` events](https://docs.aws.amazon.com/iot/latest/developerguide/iot-events.html#iot-events-enable)
for your AWS IoT Hub to automatically sync your devices' `name` attribute with
the Memfault device `nickname` property.

### Deploy

    npx cdk deploy

## Configure memfault settings

You can retrieve the project settings from the settings page of the Memfault
dashboard of your organization.

    aws ssm put-parameter --type String --name /${STACK_NAME:-nrf-memfault}/thirdParty/memfault/projectKey --value <your memfault project key>
    aws ssm put-parameter --type String --name /${STACK_NAME:-nrf-memfault}/thirdParty/memfault/organization --value <your organization slug>
    aws ssm put-parameter --type String --name /${STACK_NAME:-nrf-memfault}/thirdParty/memfault/project --value <your project slug>

The organization auth token can be accessed and managed by Administrators at
Admin → Organization Auth Tokens in the Memfault UI.

    aws ssm put-parameter --type String --name /${STACK_NAME:-nrf-memfault}/thirdParty/memfault/authToken --value <your auth token>

## Configure stack settings

The topic devices use to publish memfault chunks can be configured through the
[CDK context variable](https://docs.aws.amazon.com/cdk/v2/guide/context.html)
`memfaultTopic`. It defaults to `+/memfault`.
