const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', '.expo/*', 'android/*', 'ios/*', 'coverage/*'],
  },
  {
    rules: {
      /**
       * A loader hook has to enter its own loading state from an effect, and the
       * Expo template ships a `use-color-scheme.web.ts` that hydrates on mount.
       * Left as a warning so a brand-new one still gets noticed.
       */
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
]);
