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
const newer = require("gulp-newer");
// const svgSprite = require("gulp-svg-sprite");

// Определение путей для исходных и выходных файлов
const paths = {
  dist: "dist",
  baseDir: "app/",
  html: "app/index.html",
  styles: {
    scss: "app/scss/style.scss",
    dest: "app/css",
  },
  scripts: {
    js: "app/js/main.js",
    dest: "app/js",
  },
  images: {
    src: "app/img/src",
    dest: "app/img/dist",
  },
};

// function sprite() {
//   return src("app/img/dist/*.svg");
// }

// Компиляция, добавление префиксов, минификация SCSS и сохранение в выходной каталог
function styles() {
  return src(paths.styles.scss)
    .pipe(autoprefixer({ overrideBrowserslist: ["last 10 versions"] }))
    .pipe(scss({ outputStyle: "compressed" }))
    .pipe(concat("style.min.css"))
    .pipe(dest(paths.styles.dest))
    .pipe(browserSync.stream()); // Внесение изменений без перезагрузки
}

// Объединение, минификация JavaScript и сохранение в выходной каталог
function scripts() {
  return src(paths.scripts.js)
    .pipe(concat("main.min.js"))
    .pipe(uglify())
    .pipe(dest(paths.scripts.dest))
    .pipe(browserSync.stream()); // Внесение изменений без перезагрузки
}

function images() {
  return src([`${paths.images.src}/*.*`, "!app/img/src/*.svg"])
    .pipe(newer(paths.images.dest))
    .pipe(avif({ quality: 50 }))
    .pipe(src(`${paths.images.src}/*.*`))
    .pipe(newer(paths.images.dest))
    .pipe(webp())
    .pipe(src(`${paths.images.src}/*.*`))
    .pipe(newer(paths.images.dest))
    .pipe(imagemin())
    .pipe(dest(paths.images.dest));
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
  watch([paths.images.src], images); // Отслеживание изображений
  watch([paths.scripts.js], scripts); // Отслеживание JavaScript-файлов
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
      `${paths.styles.dest}/style.min.css`,
      `${paths.images.dest}/*.*`,
      `${paths.scripts.dest}/main.min.js`,
      `${paths.baseDir}**/*.html`,
    ],
    { base: paths.baseDir }
  ).pipe(dest(paths.dist));
}

// Экспорт задач для выполнения из командной строки
exports.styles = styles;
exports.scripts = scripts;
exports.images = images;
exports.sprite = sprite;
exports.watcher = watcher;
exports.cleanDist = cleanDist;
exports.copyHtml = copyHtml;

// Основная задача сборки: очистка папки dist, сборка файлов, копирование HTML
exports.build = series(cleanDist, images, building, copyHtml);

// Задача по умолчанию для разработки: компиляция ресурсов, запуск сервера, отслеживание файлов
exports.default = parallel(styles, scripts, watcher);
