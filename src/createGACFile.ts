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
import { writeSync, existsSync } from "fs";

// creates file with GAC info if parameter is not already a path to a file
// NOTE: no validation of the credential information is performed
export async function createGacFile(gacInfo: string) {
  try {
    if (existsSync(gacInfo)) {
      return gacInfo;
    }
  } catch (e) {
    console.warn(
      "unexpected error while validing GAC info. Interpreting provided info as credentials data."
    );
  }
  const tmpFile = fileSync({ postfix: ".json" });
  writeSync(tmpFile.fd, gacInfo);
  return tmpFile.name;
}
