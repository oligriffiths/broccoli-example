// Import broccoli modules
const funnel = require('broccoli-funnel');
const concat = require('broccoli-concat');
const mergeTrees = require('broccoli-merge-trees');
const babel = require('broccoli-babel-transpiler');
const watchify = require('broccoli-watchify');
const compileSass = require('broccoli-sass-source-maps');
const Livereload = require('broccoli-livereload')
const env = require('broccoli-env').getEnv();

// Set the config options
const srcDir = 'app';
const publicDir = 'public';
const srcJS = 'app.js';
const srcSCSS = 'app.scss';
const srcStylesDir = srcDir + '/styles';
const outputAssetsDir = 'assets';
const production = env === 'production';

// Compile scss files
let styles = compileSass([srcStylesDir], srcSCSS, outputAssetsDir + '/app.css', {
  sourceMap: !production,
  sourceMapEmbed: true,
  sourceMapContents: true,
});

// Transpile js files into "node" modules
let js = babel(srcDir);

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
let html = funnel(srcDir, {
  files   : ['index.html'],
  destDir : '/'
});

// Produce final tree
let tree = mergeTrees([html, styles, js]);

// Copy public folder
let pub = funnel(publicDir, {
  destDir: '/'
});

// Ensure app overwrites anything from public
tree = mergeTrees([pub, tree], { overwrite: true });

// Live reload files in dev
if (!production) {
  tree = new Livereload(tree, {
    target: 'index.html',
  });
}

module.exports = tree;