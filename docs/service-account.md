# Setting up the service account

This action requires a service account to authenticate with Firebase Hosting. The easiest way to set up the service account is to use the Firebase CLI with the `firebase init hosting:github` if that doesn't work for you, you can configure it manually.

## Manually configure the service account

### 1. Create a service account that the action will use to deploy to Hosting

1. Visit the [GCP Service Accounts page](https://console.cloud.google.com/iam-admin/serviceaccounts) and make sure the correct project (same name as your Firebase project) is selected in the top blue bar
1. Click the "+ CREATE SERVICE ACCOUNT" button
1. Give the service account a name, id, description. We recommend something like `github-action-<my repository name>`
1. At the "Grant this service account access to project" step, choose the following [roles](https://firebase.google.com/docs/projects/iam/roles-predefined-product) that the service account will need to deploy on your behalf:
   - **Firebase Authentication Admin** (Required to add preview URLs to Auth authorized domains)
     - `roles/firebaseauth.admin`
   - **Firebase Hosting Admin** (Required to deploy preview channels)
     - `roles/firebasehosting.admin`
   - **Cloud Run Viewer** (Required for projects that [use Hosting rewrites to Cloud Run or Cloud Functions](https://firebase.google.com/docs/hosting/serverless-overview))
     - `roles/run.viewer`
   - **API Keys Viewer** (Required for CLI deploys)
     - `roles/serviceusage.apiKeysViewer`
1. Finish the service account creation flow

### 2. Get that service account's key and add it to your repository as a secret

1. [Create and download](https://cloud.google.com/iam/docs/creating-managing-service-account-keys#creating_service_account_keys) the new service account's JSON key
1. Add that JSON key [as a secret in your GitHub repository](https://docs.github.com/en/free-pro-team@latest/actions/reference/encrypted-secrets#creating-encrypted-secrets-for-a-repository). We recommend a name like `FIREBASE_SERVICE_ACCOUNT_<PROJECT_ID>` (example: `FIREBASE_SERVICE_ACCOUNT_MY_COOL_APP`)

### 3. Add a workflow yaml file to your repository

1. Add a yml file as described [here](../README.md#deploy-to-a-new-preview-channel-for-every-pr). Be sure to reference your new secret for the `firebaseServiceAccount` option.
