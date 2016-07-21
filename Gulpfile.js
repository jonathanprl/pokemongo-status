var gulp  = require('gulp'),
  inject = require('gulp-inject'),
  jade = require('gulp-jade'),
  concat = require('gulp-concat'),
  bowerFiles = require('main-bower-files'),
  nodemon = require('gulp-nodemon'),
  less = require('gulp-less'),
  minifyCss = require('gulp-minify-css'),
  concat = require('gulp-concat'),
  minify = require('gulp-minify'),
  series = require('stream-series'),
  clean = require('gulp-clean'),
  livereload = require('gulp-livereload');

gulp.task('inject-production', ['concat-app', 'less'], function() {
  var vendorStream = gulp.src(['./dist/assets/js/vendor-min.js'], {read: false});
  var appStream = gulp.src(['./dist/assets/js/app-min.js'], {read: false});

  var stream = gulp.src(['./src/views/index/index.jade'])
    .pipe(inject(series(vendorStream, appStream), {name: 'app'}))
    .pipe(inject(gulp.src(['./dist/assets/css/*.css'])))
    .pipe(gulp.dest('./dist'));
  return stream;
});

gulp.task('concat-app', ['concat-vendor'], function() {
  var stream = gulp.src(['./src/js/*.js'])
    .pipe(concat('app.js'))
    .pipe(minify({
      ignoreFiles: ['-min.js']
    }))
    .pipe(gulp.dest('./dist/assets/js'));
  return stream;
});

gulp.task('concat-vendor', function() {
  var stream = gulp.src(bowerFiles({'filter': '**/*.js'}))
    .pipe(concat('vendor.js'))
    .pipe(minify({
      ignoreFiles: ['-min.js']
    }))
    .pipe(gulp.dest('./dist/assets/js'));
  return stream;
});

gulp.task('images', ['clean:images'], function() {
  var stream = gulp.src('./src/img/**/*')
    .pipe(gulp.dest('./dist/assets/img'));
  return stream;
});

gulp.task('less', ['clean:styles'], function() {
  var stream = gulp.src('./src/themes/default/app.less')
    .pipe(less())
    .pipe(minifyCss())
    .pipe(gulp.dest('./dist/assets/css'));
  return stream;
});

gulp.task('scripts', ['clean:scripts'], function() {
  var stream = gulp.src('./src/js/*.js')
    .pipe(gulp.dest('./dist/assets/js'));
  return stream;
});

gulp.task('views', ['less', 'scripts', 'vendor', 'images'], function() {
  var vendorStream = gulp.src(['./dist/assets/libs/*.js', '!./dist/assets/libs/jquery.js'], {read: false});
  var vendorDeps = gulp.src(['./dist/assets/libs/jquery.js'], {read: false});
  var appStream = gulp.src(['./dist/assets/js/*.js'], {read: false});

  var stream = gulp.src(['./src/views/**/*.jade'])
    .pipe(inject(appStream, {name: 'app', ignorePath: '/dist/assets'}))
    .pipe(inject(vendorDeps, {name: 'vendorDeps', ignorePath: '/dist/assets'}))
    .pipe(inject(vendorStream, {name: 'vendor', ignorePath: '/dist/assets'}))
    .pipe(inject(gulp.src(['./dist/assets/css/*.css'], {read: false}), {ignorePath: '/dist/assets'}))
    .pipe(gulp.dest('./dist/views'));
});

gulp.task('vendor', ['clean:vendor'], function(){
  return gulp.src(bowerFiles())
      .pipe(gulp.dest('./dist/assets/libs'));
});

gulp.task('clean:styles', function() {
  return gulp.src('./dist/assets/css', {read: false})
    .pipe(clean());
});

gulp.task('clean:views', function() {
  return gulp.src('./dist/views', {read: false})
    .pipe(clean());
});

gulp.task('clean:scripts', function() {
  return gulp.src('./dist/assets/js', {read: false})
    .pipe(clean());
});

gulp.task('clean:vendor', function() {
  return gulp.src('./dist/assets/libs', {read: false})
    .pipe(clean());
});

gulp.task('clean:images', function() {
  return gulp.src('./dist/assets/img', {read: false})
    .pipe(clean());
});

gulp.task('watch', function () {
  gulp.watch([
    './src/**/*.jade',
    './src/**/*.js',
    './src/themes/**/*.less'
  ], ['build']);
});

gulp.task('daemon', ['build'], function () {
  nodemon({
    script: 'server.js',
    ext: 'js',
    ignore: ['dist/*', 'src/*'],
    env: {
      'NODE_ENV': 'dev'
    }
  })
    .on('restart', function () {
      console.log('Restarted!');
      livereload.reload();
    });
});

gulp.task('default', ['build']);
gulp.task('build', ['views']);
gulp.task('production', ['inject-production']);
gulp.task('serve', ['daemon', 'watch']);
