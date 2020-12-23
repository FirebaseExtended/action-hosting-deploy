# Firebase Hosting GitHub Action

## Usage

### Deploy to a new preview channel for every PR

Add a workflow (`.github/workflows/deploy-preview.yml`):

```yaml
name: Deploy to Preview Channel

on:
  pull_request:
    # Optionally configure to run only for specific files. For example:
    # paths:
    # - "website/**"

jobs:
  build_and_preview:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      # Add any build steps here. For example:
      # - run: npm ci && npm run build
      - uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: "${{ secrets.GITHUB_TOKEN }}"
          firebaseServiceAccount: "${{ secrets.FIREBASE_SERVICE_ACCOUNT }}"
          expires: 30d
          projectId: your-Firebase-project-ID
        env:
          FIREBASE_CLI_PREVIEWS: hostingchannels
```

### Deploy to your live channel on merge

Add a workflow (`.github/workflows/deploy-prod.yml`):

```yaml
name: Deploy to Live Channel

on:
  push:
    branches:
      - master
    # Optionally configure to run only for specific files. For example:
    # paths:
    # - "website/**"

jobs:
  build_and_preview:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      # Add any build steps here. For example:
      # - run: npm ci && npm run build
      - uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: "${{ secrets.GITHUB_TOKEN }}"
          firebaseServiceAccount: "${{ secrets.FIREBASE_SERVICE_ACCOUNT }}"
          expires: 30d
          projectId: your-Firebase-project-ID
          channelId: live
```

## Options

### `firebaseServiceAccount` _{string}_ (required)

This is a service account JSON key.

It's important to store this token as an
[encrypted secret](https://help.github.com/en/actions/configuring-and-managing-workflows/creating-and-storing-encrypted-secrets)
to prevent unintended access to your Firebase project. Set it in the "Secrets" area
of your repository settings and add it as `FIREBASE_SERVICE_ACCOUNT`:
`https://github.com/USERNAME/REPOSITORY/settings/secrets`.

### `repoToken` _{string}_

Adding `repoToken: "${{secrets.GITHUB_TOKEN}}"` lets the action comment on PRs
with the preview URL for the associated preview channel. You don't need to set
this secret yourself - GitHub sets it automatically.

If you omit this option, you'll need to find the preview URL in the action's
build log.

### `expires` _{string}_

The length of time the preview channel should remain active after the last deploy.
If left blank, the action uses the default expiry of 7 days.
The expiry date will reset to this value on every new deployment.

### `projectId` _{string}_

The Firebase project that contains the Hosting site to which you
want to deploy. If left blank, you need to check in a `.firebaserc`
file so that the Firebase CLI knows which Firebase project to use.

### `channelId` _{string}_

The ID of the channel to deploy to. If you leave this blank,
a preview channel and its ID will be auto-generated per branch or PR.
If you set it to **`live`**, the action deploys to the live channel of your default Hosting site.

You usually want to leave this blank so that each PR gets its own preview channel.
An exception might be that you always want to deploy a certain branch to a
long-lived preview channel (for example, you may want to deploy every commit
from your `next` branch to a `preprod` preview channel).

### `target` _{string}_

The target name of the Hosting site to deploy to. If you leave this blank,
the default target or all targets defined in the `.firebaserc` will be deployed to.

You usually want to leave this blank unless you have set up multiple sites in the Firebase Hosting UI
and are trying to target just one of those sites with this action.

Refer to the Hosting docs about [multiple sites](https://firebase.google.com/docs/hosting/multisites)
for more information about deploy targets.

### `entryPoint` _{string}_

The location of your [`firebase.json`](https://firebase.google.com/docs/cli#the_firebasejson_file)
file relative to the root of your repository. Defaults to `.` (the root of your repo).

## Outputs

Values emitted by this action that can be consumed by other actions later in your workflow

### `urls`

The url(s) deployed to

### `expire_time`

The time the deployed preview urls expire

### `details_url`

A single URL that was deployed to

## Status

![Status: Experimental](https://img.shields.io/badge/Status-Experimental-blue)

This repository is maintained by Googlers but is not a supported Firebase product. Issues here are answered by maintainers and other community members on GitHub on a best-effort basis.
