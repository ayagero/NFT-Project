module.exports = function override(config) {
  config.module.rules = config.module.rules.map((rule) => {
    if (rule.loader && rule.loader.includes('source-map-loader')) {
      rule.exclude = /node_modules/;
    }
    return rule;
  });
  return config;
};