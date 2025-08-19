import { readFileSync } from "fs";

export function getProjectIdByAlias(alias: string): string {
    try {
        const firebaserc = JSON.parse(readFileSync(".firebaserc", { encoding: 'utf-8' }));
        return firebaserc.projects[alias];
    } catch (e) {
        return undefined;
    }
}
