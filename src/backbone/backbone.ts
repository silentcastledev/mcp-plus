import { ClaudeConfig, Loader } from "../claude-config/claude-config.ts";
import { computed } from "@preact/signals-core";

const claudeConfigLoading = new Loader(() => ClaudeConfig.load()).load();
const claudeConfig = computed<null | ClaudeConfig>(() => {
  if (claudeConfigLoading.value.k === "success") {
    return claudeConfigLoading.value.value;
  } else {
    return null;
  }
});

export const BACKBONE = {
  configLoading: claudeConfigLoading,
  get claudeConfig() {
    return claudeConfig.value;
  },
};

export function useConfig(): ClaudeConfig {
  const config = BACKBONE.claudeConfig;
  if (!config) {
    throw new Error(`Cannot use Claude config`);
  }
  return config;
}
