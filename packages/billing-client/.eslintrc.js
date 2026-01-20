module.exports = {
  extends: ['./node_modules/@hanzo/platform-rig/profiles/default/eslint.config.json'],
  parserOptions: {
    tsconfigRootDir: __dirname,
    project: './tsconfig.json'
  }
}
