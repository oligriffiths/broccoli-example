// Import broccoli modules
const funnel = require('broccoli-funnel');
const concat = require('broccoli-concat');
const mergeTrees = require('broccoli-merge-trees');
const babel = require('broccoli-babel-transpiler');
const watchify = require('broccoli-watchify');
const compileSass = require('broccoli-sass-source-maps');
const Livereload = require('broccoli-livereload');
const wiredep = require('wiredep');
const UnwatchedDir = require('broccoli-source').UnwatchedDir;
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
  sourceMapEmbed: true, // source map must be embedded for live reload to work
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
  destDir : '/',
});

// Produce final tree
let tree = mergeTrees([html, styles, js]);

// Copy public folder
let pub = funnel(publicDir, {
  destDir: '/',
});

// Ensure app overwrites anything from public
tree = mergeTrees([pub, tree], { overwrite: true });

// Live reload files in dev
if (!production) {
  tree = new Livereload(tree, {
    target: 'index.html',
  });
}

// Compile vendor jss and css
let vendor = new UnwatchedDir('vendor');
let vendorJS = funnel(vendor, {
  include: ['**/*.js'],
});

let vendorCSS = funnel(vendor, {
  include: ['**/*.css'],
});

// Compile bower packages
let bowerPackages;
try {
  bowerPackages = wiredep();
} catch (e) {}

if (bowerPackages) {
  let bowerJS = bowerPackages.js ? bowerPackages.js.map(file => {
    return file.replace(process.cwd() + '/bower_components/', '');
  }) : [];

  let bowerCSS = bowerPackages.css ? bowerPackages.css.map(file => {
    return file.replace(process.cwd() + '/bower_components/', '');
  }) : [];

  // Gather bower files, ensure they're unwatched
  let bower = new UnwatchedDir('bower_components');
  bowerJS = funnel(bower, {
    files: bowerJS,
  });

  bowerCSS = funnel(bower, {
    files: bowerCSS,
  });

  // Merge css and js trees
  vendorJS = mergeTrees([vendorJS, bowerJS]);
  vendorCSS = mergeTrees([vendorCSS, bowerCSS]);
}

// Concat trees into single file
vendorJS = concat(vendorJS, {
  outputFile: outputAssetsDir + '/vendor.js',
  header: ";(function() {",
  inputFiles: ['**/*.js'],
  footer: "}());",
  sourceMapConfig: { enabled: true },
  allowNone: true,
});

vendorCSS = concat(vendorCSS, {
  outputFile: outputAssetsDir + '/vendor.css',
  footer: "\n",
  inputFiles: ['**/*.css'],
  sourceMapConfig: { enabled: true },
  allowNone: true,
});

// Merge vendor trees
vendor = mergeTrees([vendorJS, vendorCSS]);

// Merge vendor tree into main tree
tree = mergeTrees([tree, vendor]);

module.exports = tree;