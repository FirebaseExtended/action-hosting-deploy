/**
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { exec } from "@actions/exec";

const FIREBASE_CLI_NPM_PACKAGE = "firebase-tools";

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
  await exec("npx firebase", ["--version"]);

  return firebase;
}
