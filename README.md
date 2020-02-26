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
      - uses: developit/firebase-hosting-preview-action@v1
        with:
          repo-token: "${{ secrets.GITHUB_TOKEN }}"
          firebase-token: "${{ secrets.FIREBASE_TOKEN }}"
          use-web-tld: true
```

## Options

### `firebase-token` _{string}_ (required)

This is a deploy key you need to generate using the Firebase CLI locally, so that the action can publish your project.

It's important to store this token as an [encrypted secret](https://help.github.com/en/actions/configuring-and-managing-workflows/creating-and-storing-encrypted-secrets)
to prevent unintended access your Firebase project. Here's how:

<blockquote>
<table><tbody><tr><td>

**Generating and safely adding the token:**

First, generate a token by running `firebase login:ci` and copying the code it generates.

Then, go to the "Secrets" area of your repository settings and add it as `FIREBASE_TOKEN`:

`https://github.com/USERNAME/REPOSITORY/settings/secrets`

</td><td>
<img width="240" src="https://user-images.githubusercontent.com/105127/75371305-8223a680-5894-11ea-88ae-9528c67bd406.png">
</td></tr></tbody></table>
</blockquote>


### `repo-token` _{string}_

Adding `repo-token: "${{secrets.GITHUB_TOKEN}}"` lets the action comment on PRs with the link to the deploy preview.
If you omit this option, you'll need to find the preview URL in the action's build log.

### `build-script` _{string}_

Many projects need to be built before deployment. The action will run the script you provide here before it deploys anything to Firebase.

By default, it will try to build your project using `npm run build`.


### `use-web-tld` _{boolean}_

By default, deploy preview URLs will link are `PROJECT-HASH.firebaseapp.com`. Pass `use-web-tld: true` to instead use `.web.app`.
The URLs are interchangeable, this option only controls which one the action links to.
