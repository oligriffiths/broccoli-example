const env = require('broccoli-env').getEnv();

const BroccoliApp = require('./lib/BroccoliApp');

// Setup broccoli app
const app = new BroccoliApp({
  devel: !env || env === 'dev',
});

module.exports = app.toTree();
