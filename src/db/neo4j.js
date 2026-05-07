import neo4j from "neo4j-driver";
import { appConfig } from "../config.js";

const auth = appConfig.neo4j.authDisabled
  ? neo4j.auth.none()
  : neo4j.auth.basic(appConfig.neo4j.username, appConfig.neo4j.password);

export const driver = neo4j.driver(appConfig.neo4j.uri, auth, {
  disableLosslessIntegers: true
});

export function getSession() {
  return driver.session({
    database: appConfig.neo4j.database
  });
}

export async function verifyConnection() {
  await driver.verifyConnectivity();
}

export async function closeDriver() {
  await driver.close();
}
