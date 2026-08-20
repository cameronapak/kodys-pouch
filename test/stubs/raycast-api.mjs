export function getPreferenceValues() {
  return (
    globalThis.__KODY_TEST_PREFS__ ?? {
      baseUrl: "https://kody.codes",
      username: "testuser",
      token: "test-token",
      discoveryKodyId: "raycast-kodys-pouch",
    }
  );
}
