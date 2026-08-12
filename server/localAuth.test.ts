import { describe, expect, it } from "vitest";
import { isLocalDevelopmentAuthEnabled } from "./localAuth";

describe("modo de autenticação local", () => {
  it("só permite o administrador local em ambiente de desenvolvimento configurado", () => {
    expect(isLocalDevelopmentAuthEnabled({ NODE_ENV: "development", LOCAL_AUTH_ENABLED: "true" })).toBe(true);
    expect(isLocalDevelopmentAuthEnabled({ NODE_ENV: "production", LOCAL_AUTH_ENABLED: "true" })).toBe(false);
    expect(isLocalDevelopmentAuthEnabled({ NODE_ENV: "development", LOCAL_AUTH_ENABLED: "false" })).toBe(false);
  });
});
