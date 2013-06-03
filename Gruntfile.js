'use strict';
var markdown = require('marked');
var semver = require('semver');
var BUILD_DIR = process.cwd() + '/build';
var GEMFURY_TOKEN = require('config').token;

module.exports = function (grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    changelog: {
      options: {
        dest: 'CHANGELOG.md',
        versionFile: 'package.json'
      }
    },
    release: {
      options: {
        commitMessage: '<%= version %>',
        tagName: 'v<%= version %>',
        bump: false, // we have our own bump
        file: 'package.json'
      }
    },
    stage: {
      options: {
        files: ['CHANGELOG.md']
      }
    },
    clean: {
      'create-build-dir': ['build']
    },
    compress: {
      'tar': {
        options: {
          mode: 'tgz',
          archive: 'build/generator-my-forked-angular.tgz'
        },
        files: {
          '.' : ['**/*', '!node_modules/**/*', '!build/**/*']
        }
      }
    }
  });

  grunt.registerTask('bump', 'bump manifest version', function (type) {
    var options = this.options({
      file: grunt.config('pkgFile') || 'package.json'
    });

    function setup(file, type) {
      var pkg = grunt.file.readJSON(file);
      var newVersion = pkg.version = semver.inc(pkg.version, type || 'patch');
      return {
        file: file,
        pkg: pkg,
        newVersion: newVersion
      };
    }

    var config = setup(options.file, type);
    grunt.file.write(config.file, JSON.stringify(config.pkg, null, '  ') + '\n');
    grunt.log.ok('Version bumped to ' + config.newVersion);
  });

  grunt.registerTask('create-build-dir', 'Create the directory where the tarball will be placed & clear it if needed', function(){
    grunt.file.isDir(BUILD_DIR) || grunt.file.mkdir(BUILD_DIR);
  });

  grunt.registerTask('tar', ['clean', 'create-build-dir', 'compress']);

  grunt.registerTask('stage', 'git add files before running the release task', function () {
    var files = this.options().files;
    grunt.util.spawn({
      cmd: process.platform === 'win32' ? 'git.cmd' : 'git',
      args: ['add'].concat(files)
    }, grunt.task.current.async());
  });

  grunt.registerTask('pack', 'Deploy this package to gemfury', function(){
    var execSync = require('exec-sync');
    execSync('if [ -f generator-my-forked-angular-*.tgz ]; then rm generator-my-forked-angular-*.tgz; fi');
    execSync('npm pack');
  });

  grunt.registerTask('upload-gemfury', function(){
    // find the package file, we don't know the version
    var findupSync = require('findup-sync');
    var file = findupSync('generator-my-forked-angular-*.tgz', {
      nocase: false
    });
    
    var curlCmd = 'curl -F p1=@' + file + ' https://push.fury.io/' + GEMFURY_TOKEN + '/';
    console.log(curlCmd);

    var execSync = require('exec-sync');
    execSync(curlCmd);
  });

  grunt.registerTask('gemfury', function(){
    var tasks = ['pack', 'upload-gemfury'];

    grunt.option('force', true);
    grunt.task.run(tasks);
  });

  grunt.loadNpmTasks('grunt-release');
  grunt.loadNpmTasks('grunt-conventional-changelog');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-compress');

  grunt.registerTask('default', ['bump', 'changelog', 'stage', 'release']);
};
