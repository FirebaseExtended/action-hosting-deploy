# Firebase Hosting Preview: GitHub Action

A GitHub action that builds and deploys preview versions of your PRs and links
to them.

<img width="529" src="https://i.imgur.com/Mj3C2eg.png">

## Usage:

Add a workflow (`.github/workflows/deploy-preview.yml`):

```yaml
name: Deploy Preview

on: [pull_request]

jobs:
  build_and_preview:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      # - run: npm run build
      - uses: ./
        with:
          repoToken: '${{ secrets.GITHUB_TOKEN }}'
          firebaseServiceAccount: '${{ secrets.FIREBASE_SERVICE_ACCOUNT }}'
          expires: 30d
          projectId: jeff-test-6993
        env:
          # temporary until preview channels are in public beta
          FIREBASE_CLI_PREVIEWS: hostingchannels
```

## Options

### `firebaseServiceAccount` _{string}_ (required)

This is a service account JSON key that you can get from the
[Firebase Console](https://firebase.google.com/project/_/settings/serviceaccounts/adminsdk)
(or eventually via the proposed
[`firebase hosting:channel:createworkflow`](https://github.com/FirebasePrivate/firebase-tools/pull/564)
command).

It's important to store this token as an
[encrypted secret](https://help.github.com/en/actions/configuring-and-managing-workflows/creating-and-storing-encrypted-secrets)
to prevent unintended access your Firebase project. Set it in the "Secrets" area
of your repository settings and add it as `FIREBASE_SERVICE_ACCOUNT`:
`https://github.com/USERNAME/REPOSITORY/settings/secrets`

### `repoToken` _{string}_

Adding `repoToken: "${{secrets.GITHUB_TOKEN}}"` lets the action comment on PRs
with the link to the deploy preview. You don't need to set this secret
yourself - github will set it automatically.

If you omit this option, you'll need to find the preview URL in the action's
build log.

### `expires` _{string}_

The length of time the channel should live. Default is 7 days.

### `projectId` _{string}_

The project to deploy to. If you leave this blank, be sure to check in a
`.firebaserc` file so the CLI knows what project to deploy to.

### `channelId` _{string}_

The channel to deploy to. If you don't set it, a new channel will be created
per-PR or per-branch.

You usually want to leave this blank so that each PR gets its own channel,
unless you know you want to deploy a certain branch to a long-lived channel (for
example, you may want to deploy every commit from your `next` branch to a
`preprod` channel)
