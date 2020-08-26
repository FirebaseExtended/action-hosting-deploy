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

import { fileSync } from "tmp";
import { writeSync } from "fs";

// Set up Google Application Credentials for use by the Firebase CLI
// https://cloud.google.com/docs/authentication/production#finding_credentials_automatically
export async function createGacFile(googleApplicationCredentials: string) {
  const tmpFile = fileSync({ postfix: ".json" });

  writeSync(tmpFile.fd, googleApplicationCredentials);

  return tmpFile.name;
}
