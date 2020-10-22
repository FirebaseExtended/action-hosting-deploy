# How to Contribute

We'd love to accept your patches and contributions to this project. There are
just a few small guidelines you need to follow.

## Contributor License Agreement

Contributions to this project must be accompanied by a Contributor License
Agreement (CLA). You (or your employer) retain the copyright to your
contribution; this simply gives us permission to use and redistribute your
contributions as part of the project. Head over to
<https://cla.developers.google.com/> to see your current agreements on file or
to sign a new one.

You generally only need to submit a CLA once, so if you've already submitted one
(even if it was for a different project), you probably don't need to do it
again.

## Code reviews

All submissions, including submissions by project members, require review. We
use GitHub pull requests for this purpose. Consult
[GitHub Help](https://help.github.com/articles/about-pull-requests/) for more
information on using pull requests.

## Community Guidelines

This project follows
[Google's Open Source Community Guidelines](https://opensource.google/conduct/).

## Development guide

### Get set up

1. [Clone](https://help.github.com/en/github/creating-cloning-and-archiving-repositories/cloning-a-repository) this repository (or a [fork](https://help.github.com/en/github/getting-started-with-github/fork-a-repo#propose-changes-to-someone-elses-project)).
1. At the project root, install all modules by running `npm install`.

### Creating a Pull Request

> Note: You must build from source and check in any changes to the contents of the `bin` directory.

1. Before creating a pull request, run the following commands to lint, build, and test your changes:

   ```shell
   # run the linter
   npm run format:check

   # rebuild source
   npm run build

   # run unit tests
   npm run test
   ```

1. If you've forked the repo and want to watch the action run, add secrets to your forked repo that match the secrets specified in [one of the workflow files](https://github.com/FirebaseExtended/action-hosting-deploy/tree/main/.github/workflows) you want to test, and trigger the workflow in your forked repo (for example, by creating a pr or pushing to the `main` branch)
1. Once you're confident in your changes, create a pull request against the firebaseextended/action-hosting-deploy repo.

## Publishing a new version

A repo owner can publish a new version of the action by following the instructions [in the GitHub docs](https://docs.github.com/en/free-pro-team@latest/actions/creating-actions/publishing-actions-in-github-marketplace#publishing-an-action). Manual releases should follow the convention of our existing releases, like [`v0.4-alpha`](https://github.com/FirebaseExtended/action-hosting-deploy/releases/tag/v0.4-alpha).

The current major version is `v0`. We move this tag up to the latest release using the method [recommended by GitHub](https://github.com/actions/toolkit/blob/master/docs/action-versioning.md#user-content-recommendations:~:text=Make%20the%20new%20release%20available%20to%20those%20binding%20to%20the%20major%20version%20tag).

It is important to note that [firebase-tools references `v0`](https://github.com/firebase/firebase-tools/blob/a1fd2ee6ab2f7b4ac7de021226781f5a8f913e18/src/init/features/hosting/github.ts#L32), so any change in the major version should have a linked firebase-tools PR.
