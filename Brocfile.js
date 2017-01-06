// Import broccoli modules
var funnel = require('broccoli-funnel');
var concat = require('broccoli-concat');
var mergeTrees = require('broccoli-merge-trees');
var babel = require('broccoli-babel-transpiler');
var watchify = require('broccoli-watchify');
var env = require('broccoli-env').getEnv();

// Set the source directory
var srcDir = 'app';
var srcJS = 'app.js';
var srcCSS = 'app.css';
var production = env === 'production';

// Gather css files
var styles = concat(srcDir, {
  inputFiles : [srcCSS],
  outputFile : 'assets/app.css'
});

// Transpile js files into "node" modules
var js = babel(srcDir);

// Package JS modules so they work in the browser
js = watchify(js, {
  browserify: {
    entries: ['./' + srcJS],
    debug: env !== 'production',
  },
  outputFile: 'assets/app.js',
  cache: true,
});

// Copy the index.html file to the root out the output directory
var html = funnel(srcDir, {
  files   : ['index.html'],
  destDir : '/'
});

module.exports = mergeTrees([html, styles, js]);