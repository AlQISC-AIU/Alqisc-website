import { defineConfig } from "vitest/config";

// Security rules tests. They need the Firebase emulators, so run them through
// `npm run test:rules`, which starts the emulators around this config.
export default defineConfig({
    test: {
        environment: "node",
        include: ["tests/rules/**/*.test.ts"],
        fileParallelism: false,
        testTimeout: 20_000,
        hookTimeout: 30_000,
    },
});
