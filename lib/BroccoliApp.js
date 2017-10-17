const funnel = require('broccoli-funnel');
const concat = require('broccoli-concat');
const mergeTrees = require('broccoli-merge-trees');
const babel = require('broccoli-babel-transpiler');
const compileSass = require('broccoli-sass-source-maps');
const Livereload = require('broccoli-livereload');
const UnwatchedDir = require('broccoli-source').UnwatchedDir;
const Rollup = require('broccoli-rollup');

/**
 * A basic broccoli app configuration template.
 * This config will compile es6 js modules, sass files, vendor files & live reload
 */
class BroccoliApp
{
  /**
   * Object constructor
   * @param {Object} options Config options. See defaultOptions for details
   */
  constructor(options = {}) {
    /**
     * Default configuration values
     */
    const defaultOptions = {
      entry: 'index.html',          // Entry html file copied from `source.srcDir` to the output directory, false disables
      source: {
        srcDir: 'app',              // Source directory of the application, will be used to locate css and js files
        name: 'app',                // Source & Asset name used for the app .js and .css/.scss files unless overridden below
        destDir: 'assets',          // Compiled assets output directory
        styles: {                   // Set to false to disable style compilation
          srcDir: 'styles',         // Directory within source.srcDir that styles are located
          name: null,               // Source & Asset name override, defaults to source.name
          destDir: null,            // Asset output path
          preprocessor: 'scss',     // Style preprocessor option, scss or css
          sourceMap: null,          // Enables the sourcemap, if null, defaults to `devel` value
          sourceMapEmbed: true,     // Source map must be embedded for live reload to work
          sourceMapContents: true,  // Embeds source map within the generated css file
        },
        scripts: {
          srcDir: '',               // Directory within source.srcDir that scripts are located
          name: null,               // Source & Asset name override, defaults to source.name
          destDir: null,            // Asset output path, defaults to source.destDir
          sourceMap: null,          // Enables the sourcemap, if null, defaults to `devel` value
          browserify: true,         // Wraps the resulting 'node' module output in a browserifies output
        },                          // disable for node-only apps
      },

      public: 'public',             // Public folder path, merged verbatim with output path
      devel: false,                 // If true, source maps & live reloading are enabled

      // Vendor compilation takes static js and css files and concatenates them together into a single bundle each
      vendor: {                     // Set to false to disable vendor compilation
        srcDir: 'vendor',           // Source directory for vendor files
        name: 'vendor',             // Asset name override, defaults to source.name
        destDir: 'assets',          // Compiled vendor assets output directory
        styles: {
          name: null,               // Asset name override, defaults to vendor.name
          destDir: null,            // Asset output path, defaults to vendor.destDir
          sourceMap: null,          // Enables the sourcemap, if null, defaults to `devel` value
        },
        scripts: {
          name: 'vendor',           // Asset name override, defaults to vendor.name
          destDir: null,            // Asset output path, defaults to vendor.destDir
          sourceMap: null,          // Enables the sourcemap, if null, defaults to `devel` value
        },
      },
    };

    this.options = this._mergeDeep(defaultOptions, options);

    // Set some devel flags
    ['source', 'vendor'].forEach(name => {
      if (typeof this.options[name].styles.sourceMap === 'undefined') {
        this.options[name].styles.sourceMap = this.options.devel;
      }

      if (typeof this.options[name].scripts.sourceMap === 'undefined') {
        this.options[name].scripts.sourceMap = this.options.devel;
      }
    });
  }

  /**
   * Generates a broccoli tree from the configuration options passed in the constructor
   *
   * @returns {Broccoli.tree}
   */
  toTree() {

    let tree = this.appTree();

    // Merge public tree
    if (this.options.public) {
      // Ensure app overwrites anything from public
      tree = mergeTrees([this.publicTree(), tree], { overwrite: true });
    }

    // Live reload files
    if (this.options.devel) {
      tree = new Livereload(tree, {
        target: this.options.entry,
      });
    }

    // Merge vendor tree
    if (this.options.vendor) {
      tree = mergeTrees([tree, this.vendorTree()]);
    }

    return tree;
  }

  /**
   * Generates a broccoli tree for the main application
   *
   * @returns {Broccoli.tree}
   */
  appTree() {

    let tree = this.scriptsTree();

    // Add entry html file
    if (this.options.entry) {
      tree = mergeTrees([
        tree,
        this.htmlTree(),
      ]);
    }

    // Add styles
    if (this.options.source.styles) {
      tree = mergeTrees([tree, this.stylesTree()]);
    }

    return tree;
  }

  /**
   * Generates a broccoli tree for the entry html file
   *
   * @returns {Broccoli.tree}
   */
  htmlTree() {
    return funnel(this.options.source.srcDir, {
      files   : [this.options.entry],
      destDir : '/',
    });
  }

  /**
   * Generates a broccoli tree for the application styles
   * @returns {Broccoli.tree}
   */
  stylesTree() {

    if (this.options.source.styles.preprocessor === 'scss') {
      return this.scssTree();
    }

    return this.cssTree();
  }

  /**
   * Generates a broccoli tree for application css files
   *
   * @returns {Broccoli.tree}
   */
  cssTree() {
    const sourceDir = this.options.source.srcDir + '/' + this.options.source.styles.srcDir;
    const name = this.options.source.styles.name || this.options.source.name;
    const outputDir = this.options.source.styles.destDir || this.options.source.destDir;

    return concat(sourceDir, {
      inputFiles : [name + '.css'],
      outputFile : outputDir + '/' + name + '.css'
    });
  }

  /**
   * Generates a broccoli tree for application scss files
   *
   * @returns {Broccoli.tree}
   */
  scssTree() {
    const sourceDir = this.options.source.srcDir + '/' + this.options.source.styles.srcDir;
    const name = this.options.source.styles.name || this.options.source.name;
    const outputDir = this.options.source.styles.destDir || this.options.source.destDir;
    const options = {
      sourceMap: this.options.source.styles.sourceMap,
      sourceMapEmbed: this.options.source.styles.sourceMapEmbed,
      sourceMapContents: this.options.source.styles.sourceMapContents,
    };

    // Compile scss files
    return compileSass(
      [sourceDir],
      name + '.scss',
      outputDir + '/' + name + '.css',
      options
    );
  }

  /**
   * Generates a broccoli tree for application scripts
   *
   * @returns {Broccoli.tree}
   */
  scriptsTree() {
    const sourceDir = this.options.source.srcDir + '/' + this.options.source.scripts.srcDir;
    const name = this.options.source.scripts.name || this.options.source.name;
    const outputDir = this.options.source.scripts.destDir || this.options.source.destDir;

    let js = funnel(sourceDir, {
      include: ['**/*.js'],
    });

    // Rollup rollup
    js = new Rollup(js, {
      inputFiles: ['**/*.js'],
      rollup: {
        entry: 'app.js',
        dest: outputDir + '/' + name + '.js',
        sourceMap: 'inline'
      }
    });

    // Transpile js files into ES5
    js = babel(js, {
      sourceMaps: 'inline',
    });

    // If we're not browserifying the output, return as-is
    if (!this.options.source.scripts.browserify) {
      return js;
    }

    return js;
  }

  /**
   * Generates a broccoli tree for the public folder, this is merged directly with the output folder
   *
   * @returns {Broccoli.tree}
   */
  publicTree() {
    return funnel(this.options.public, {
      destDir: '/',
    });
  }

  /**
   * Generates a broccoli tree for vendor js and css files
   *
   * @returns {Broccoli.tree}
   */
  vendorTree() {
    // Compile vendor jss and css
    let vendor = new UnwatchedDir(this.options.vendor.srcDir);
    let vendorJS = funnel(vendor, {
      include: ['**/*.js'],
    });

    let vendorCSS = funnel(vendor, {
      include: ['**/*.css'],
    });

    const assetsDir = this.options.vendor.destDir;
    const assetsName = this.options.vendor.name;

    // Concat trees into single file
    vendorJS = concat(vendorJS, {
      outputFile: (this.options.vendor.scripts.destDir || assetsDir) + '/' + (this.options.vendor.scripts.name || assetsName) + '.js',
      header: ";(function() {",
      inputFiles: ['**/*.js'],
      footer: "}());",
      sourceMapConfig: {
        enabled: this.options.vendor.scripts.sourceMap,
      },
      allowNone: true,
    });

    vendorCSS = concat(vendorCSS, {
      outputFile: (this.options.vendor.scripts.destDir || assetsDir) + '/' + (this.options.vendor.styles.name || assetsName) + '.css',
      footer: "\n",
      inputFiles: ['**/*.css'],
      sourceMapConfig: { enabled: true },
      allowNone: true,
    });

    // Merge vendor trees
    return mergeTrees([vendorJS, vendorCSS]);
  }

  /**
   * Deep merge two objects, used for config merging
   *
   * @param target
   * @param source
   * @private
   */
  _mergeDeep(target, source) {
    const isObject = function(item) {
      return (item && typeof item === 'object' && !Array.isArray(item) && item !== null);
    };

    if (isObject(target) && isObject(source)) {
      for (const key in source) {
        if (isObject(source[key])) {
          if (!target[key]) Object.assign(target, { [key]: {} });
          this._mergeDeep(target[key], source[key]);
        } else {
          Object.assign(target, { [key]: source[key] });
        }
      }
    }
    return target;
  }
}

module.exports = BroccoliApp;