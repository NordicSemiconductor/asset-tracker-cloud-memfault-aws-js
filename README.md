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

Provide your AWS credentials, for example using the `.envrc` (see
[the example](./envrc.example)).

    npm ci
    npx cdk deploy

Optionally, enable `THING` events for your AWS IoT Hub to automatically sync
your devices' `name` attribute with the Memfault device `nickname` property.
