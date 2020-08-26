import { fileSync } from "tmp";
import { writeSync } from "fs";

// Set up Google Application Credentials for use by the Firebase CLI
// https://cloud.google.com/docs/authentication/production#finding_credentials_automatically
export async function createGacFile(googleApplicationCredentials: string) {
  const tmpFile = fileSync({ postfix: ".json" });

  writeSync(tmpFile.fd, googleApplicationCredentials);

  return tmpFile.name;
}
