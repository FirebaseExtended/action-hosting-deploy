import { exec } from "@actions/exec";

const FIREBASE_CLI_NPM_PACKAGE =
  "https://storage.googleapis.com/fir-tools-builds/manual/firebase-tools-8.7.0-channels.tgz";

export async function installFirebaseCLI() {
  // Install Firebase CLI
  await exec("npm", [
    "install",
    "--no-save",
    "--no-package-lock",
    FIREBASE_CLI_NPM_PACKAGE,
  ]);
  const firebase = "./node_modules/.bin/firebase";

  // Log the CLI version to double check that it installed correctly
  // and is available
  await exec(firebase, ["--version"]);

  return firebase;
}
