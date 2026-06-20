module.exports = {
  extends: ['./node_modules/@hanzoteam/platform-rig/profiles/node/eslint.config.json'],
  parserOptions: {
    tsconfigRootDir: __dirname,
    project: './tsconfig.json'
  }
}
