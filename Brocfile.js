// Import broccoli modules
var funnel = require('broccoli-funnel');
var concat = require('broccoli-concat');
var mergeTrees = require('broccoli-merge-trees');
var babel = require('broccoli-babel-transpiler');
var watchify = require('broccoli-watchify');
var compileSass = require('broccoli-sass-source-maps');
var env = require('broccoli-env').getEnv();

// Set the config options
var srcDir = 'app';
var srcJS = 'app.js';
var srcSCSS = 'app.scss';
var srcStylesDir = srcDir + '/styles';
var outputAssetsDir = 'assets';
var production = env === 'production';

// Compile scss files
var styles = compileSass([srcStylesDir], srcSCSS, outputAssetsDir + '/app.css', {
  sourceMap: !production,
  sourceMapContents: true,
});

// Transpile js files into "node" modules
var js = babel(srcDir);

// Package JS modules so they work in the browser
js = watchify(js, {
  browserify: {
    entries: ['./' + srcJS],
    debug: !production,
  },
  outputFile: outputAssetsDir + '/app.js',
  cache: true,
});

// Copy the index.html file to the root out the output directory
var html = funnel(srcDir, {
  files   : ['index.html'],
  destDir : '/'
});

module.exports = mergeTrees([html, styles, js]);