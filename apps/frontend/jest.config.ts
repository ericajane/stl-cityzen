export default {
  displayName: 'frontend',
  preset: 'jest-preset-angular',
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
  // lodash-es (used by ng2-charts) ships ESM; Jest must transform it
  transformIgnorePatterns: ['node_modules/(?!(lodash-es|.*\\.mjs$|@angular/common/locales/.*\\.js$))'],
  moduleNameMapper: {
    '^@org/types$': '<rootDir>/../../libs/shared/types/src/index.ts',
  },
  coverageDirectory: '../../coverage/apps/frontend',
  collectCoverageFrom: [
    'src/app/**/*.ts',
    '!src/app/**/*.module.ts',
    '!src/main.ts',
  ],
};
