// Импорт необходимых функций и плагинов Gulp
const { src, dest, watch, parallel, series } = require("gulp");

const scss = require("gulp-sass")(require("sass")); // Компиляция SCSS в CSS
const concat = require("gulp-concat"); // Объединение файлов
const uglify = require("gulp-uglify-es").default; // Минификация JS-файлов
const browserSync = require("browser-sync").create(); // Автоперезагрузка браузера
const autoprefixer = require("gulp-autoprefixer"); // Добавление CSS-префиксов
const clean = require("gulp-clean"); // Удаление файлов/папок
const avif = require("gulp-avif");
const webp = require("gulp-webp");
const imagemin = require("gulp-imagemin");
const cached = require("gulp-cached");
const newer = require("gulp-newer");

// Определение путей для исходных и выходных файлов
const paths = {
  dist: "dist",
  baseDir: "app/",
  html: "app/index.html",
  styles: {
    scss: "app/scss/style.scss",
    cssDest: "app/css",
  },
  scripts: {
    js: "app/js/main.js",
    jsDest: "app/js",
  },
  images: {
    src: "app/img/src/*.*",
    dest: "app/img/dist",
  },
};

function images() {
  return src([paths.images.src, "!app/img/src/*.svg"])
    .pipe(newer(paths.images.dest))

    .pipe(avif({ quality: 50 }))
    .pipe(src(paths.images.src))

    .pipe(webp())
    .pipe(src(paths.images.src))

    .pipe(imagemin())
    .pipe(dest(paths.images.dest));
}

// Компиляция, добавление префиксов, минификация SCSS и сохранение в выходной каталог
function styles() {
  return src(paths.styles.scss)
    .pipe(autoprefixer({ overrideBrowserslist: ["last 10 versions"] }))
    .pipe(scss({ outputStyle: "compressed" }))
    .pipe(concat("style.min.css"))
    .pipe(dest(paths.styles.cssDest))
    .pipe(browserSync.stream()); // Внесение изменений без перезагрузки
}

// Объединение, минификация JavaScript и сохранение в выходной каталог
function scripts() {
  return src(paths.js)
    .pipe(concat("main.min.js"))
    .pipe(uglify())
    .pipe(dest(paths.jsDest))
    .pipe(browserSync.stream()); // Внесение изменений без перезагрузки
}

// Наблюдение за изменениями в файлах и выполнение соответствующих задач
function watcher() {
  // Инициализация сервера BrowserSync и установка базового каталога
  browserSync.init({
    server: {
      baseDir: paths.baseDir,
    },
  });

  watch([paths.styles.scss], styles); // Отслеживание SCSS-файлов
  watch([paths.js], scripts); // Отслеживание JavaScript-файлов
  watch([`${paths.baseDir}*.html`]).on("change", browserSync.reload); // Отслеживание HTML-файлов
}

// Очистка папки с дистрибутивом перед сборкой
function cleanDist() {
  return src(paths.dist, { allowEmpty: true, read: false }).pipe(clean());
}

// Копирование HTML-файлов в папку с дистрибутивом
function copyHtml() {
  return src(paths.html).pipe(dest(paths.dist));
}

// Задача сборки для компиляции и перемещения файлов в папку с дистрибутивом
function building() {
  return src(
    [
      `${paths.styles.cssDest}/style.min.css`,
      `${paths.jsDest}/main.min.js`,
      `${paths.baseDir}**/*.html`,
    ],
    { base: paths.baseDir }
  ).pipe(dest(paths.dist));
}

// Экспорт задач для выполнения из командной строки
exports.images = images;
exports.styles = styles;
exports.scripts = scripts;
exports.watcher = watcher;
exports.cleanDist = cleanDist;
exports.copyHtml = copyHtml;

// Основная задача сборки: очистка папки dist, сборка файлов, копирование HTML
exports.build = series(cleanDist, images, building, copyHtml);

// Задача по умолчанию для разработки: компиляция ресурсов, запуск сервера, отслеживание файлов
exports.default = parallel(styles, scripts, watcher);
