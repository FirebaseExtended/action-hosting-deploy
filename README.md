# Firebase Hosting Preview: GitHub Action

A GitHub action that builds and deploys preview versions of your PRs and links to them.

<img width="529" src="https://i.imgur.com/Mj3C2eg.png">


## Usage:

Add a workflow (`.github/workflows/deploy-preview.yml`):

```yaml
name: Deploy Preview

on: [pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      # - run: npm run build
      - uses: ./
        with:
          repo-token: '${{ secrets.GITHUB_TOKEN }}'
          firebase-service-account: '${{ secrets.FIREBASE_SERVICE_ACCOUNT }}'
          channel-ttl: 30d
        env:
          # temporary until preview channels are in public beta
          FIREBASE_CLI_PREVIEWS: hostingchannels
```

## Options

### `firebase-service-account` _{string}_ (required)

This is a service account JSON key that you can get from the [Firebase Console](https://firebase.google.com/project/_/settings/serviceaccounts/adminsdk) (or eventually via the proposed [`firebase hosting:channel:createworkflow`](https://github.com/FirebasePrivate/firebase-tools/pull/564) command).

It's important to store this token as an [encrypted secret](https://help.github.com/en/actions/configuring-and-managing-workflows/creating-and-storing-encrypted-secrets)
to prevent unintended access your Firebase project. Set it in the "Secrets" area of your repository settings and add it as `FIREBASE_SERVICE_ACCOUNT`: `https://github.com/USERNAME/REPOSITORY/settings/secrets`

### `repo-token` _{string}_

Adding `repo-token: "${{secrets.GITHUB_TOKEN}}"` lets the action comment on PRs with the link to the deploy preview. You don't need to set this secret yourself - github will set it automatically.

If you omit this option, you'll need to find the preview URL in the action's build log.

### `channel-ttl` _{string}_

The length of time the channel should live. Default is 7 days.