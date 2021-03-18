module.exports = {
  addons: ['@storybook/addon-essentials'],
  webpackFinal: async (config, { configType }) => {
    const tsRule = config.module.rules.find(rule => String(rule.test).includes('ts'));
    const path = require('path');

    config.module.rules.push({
      ...tsRule,
      test: /themeable\.ts$/,
      use: [...tsRule.use, path.resolve(__dirname, `tailwind.${configType.toLowerCase()}.js`)],
    });

    config.resolve.alias['@foxy.io/sdk/core'] = '@foxy.io/sdk/dist/esm/core';
    config.resolve.alias['@foxy.io/sdk/customer'] = '@foxy.io/sdk/dist/esm/customer';
    config.resolve.alias['@foxy.io/sdk/integration'] = '@foxy.io/sdk/dist/esm/integration';

    return config;
  },
};
