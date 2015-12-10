'use strict';

var gulp = require( 'gulp' );
var runSequence = require('run-sequence');

gulp.task('build', function(callback) {
  runSequence(
    ['styles:voltrazord', 'scripts:voltrazord', 'clean:tmp'],
    ['template:readmes', 'copy:components:boilerplate'],
    ['copy:components:source', 'template:usage', 'copy:components:manifest'],
    ['styles:components', 'scripts:components']
  );
});
