export function isLocalDevelopmentAuthEnabled(environment: NodeJS.ProcessEnv = process.env) {
  return environment.NODE_ENV === "development" && environment.LOCAL_AUTH_ENABLED === "true";
}
