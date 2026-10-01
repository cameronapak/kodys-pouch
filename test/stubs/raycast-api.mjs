export function getPreferenceValues() {
  return (
    globalThis.__KODY_TEST_PREFS__ ?? {
      username: "testuser",
      discoveryKodyId: "raycast-kodys-pouch",
      listPackagesWebhookUrl: "https://hooks.test/list-packages",
      getPackageWebhookUrl: "https://hooks.test/get-package",
      listCapabilitiesWebhookUrl: "https://hooks.test/list-capabilities",
      listSkillsWebhookUrl: "https://hooks.test/list-skills",
      getSkillWebhookUrl: "https://hooks.test/get-skill",
    }
  );
}
