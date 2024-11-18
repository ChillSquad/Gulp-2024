const { src, dest, watch, parallel, series } = require("gulp");

const pug = require("gulp-pug"); // Шаблонизатор HTML PUG
const concat = require("gulp-concat"); // Объединение файлов
const clean = require("gulp-clean"); // Удаление файлов/папок
const fs = require("fs"); // Модуль для работы с файловой системой
const imagemin = require("gulp-imagemin"); // Оптимизация изображений
const newer = require("gulp-newer"); // Обработка только новых файлов
const svgSprite = require("gulp-svg-sprite"); // Создание SVG-спрайтов
const avif = require("gulp-avif"); // Конвертация изображений в формат AVIF
const webp = require("gulp-webp"); // Конвертация изображений в формат WebP
const uglify = require("gulp-uglify-es").default; // Минификация JS-файлов
const scss = require("gulp-sass")(require("sass")); // Компиляция SCSS в CSS
const autoprefixer = require("gulp-autoprefixer"); // Добавление CSS-префиксов
const fonter = require("gulp-fonter"); // Конвертация шрифтов в разные форматы
const ttf2woff2 = require("gulp-ttf2woff2"); // Конвертация шрифтов TTF в WOFF2
const browserSync = require("browser-sync").create(); // Автоперезагрузка браузера

// Определение путей для исходных и выходных файлов
const paths = {
  baseDir: "app",
  dist: "dist",
  html: "app/*.html",
  pug: {
    src: "app/pug/src",
    dest: "app/pug/dist",
  },
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
  fonts: {
    src: "app/fonts/src",
    dest: "app/fonts/dist",
  },
};

// Шаблонизатор HTML PUG
function template() {
  return src(`${paths.pug.src}/*.pug`).pipe(pug()).pipe(dest(paths.baseDir));
}

// Конвертация шрифтов в TTF, WOFF, WOFF2
function fonts() {
  return src(`${paths.fonts.src}/*.*`) // Берем исходные шрифты
    .pipe(
      fonter({
        formats: ["woff", "ttf"], // Конвертация в WOFF и TTF
      })
    )
    .pipe(src(`${paths.fonts.dest}/*.ttf`)) // Получаем сгенерированные TTF
    .pipe(ttf2woff2()) // Конвертация TTF в WOFF2
    .pipe(dest(paths.fonts.dest)); // Сохраняем в папку назначения
}

// Компиляция SCSS, добавление префиксов, минификация и сохранение в выходной каталог
function styles() {
  return src(paths.styles.scss)
    .pipe(autoprefixer({ overrideBrowserslist: ["last 10 versions"] })) // Добавляем префиксы
    .pipe(scss({ outputStyle: "compressed" })) // Компилируем SCSS в минифицированный CSS
    .pipe(concat("style.min.css")) // Объединяем в один файл
    .pipe(dest(paths.styles.dest)) // Сохраняем в папку назначения
    .pipe(browserSync.stream()); // Внесение изменений без перезагрузки страницы
}

// Объединение, минификация JavaScript и сохранение в выходной каталог
function scripts() {
  return src(paths.scripts.js)
    .pipe(concat("main.min.js")) // Объединяем в один файл
    .pipe(uglify()) // Минифицируем
    .pipe(dest(paths.scripts.dest)) // Сохраняем в папку назначения
    .pipe(browserSync.stream()); // Внесение изменений без перезагрузки страницы
}

// Оптимизация изображений и конвертация в AVIF и WebP
function images() {
  return src([`${paths.images.src}/*.*`, "!app/img/src/*.svg"]) // Берем изображения, исключая SVG
    .pipe(newer(paths.images.dest)) // Пропускаем только новые файлы
    .pipe(avif({ quality: 50 })) // Конвертируем в AVIF
    .pipe(src(`${paths.images.src}/*.*`)) // Возвращаемся к исходным изображениям
    .pipe(newer(paths.images.dest)) // Пропускаем только новые файлы
    .pipe(webp()) // Конвертируем в WebP
    .pipe(src(`${paths.images.src}/*.*`)) // Возвращаемся к исходным изображениям
    .pipe(newer(paths.images.dest)) // Пропускаем только новые файлы
    .pipe(imagemin()) // Оптимизируем изображения
    .pipe(dest(paths.images.dest)); // Сохраняем в папку назначения
}

// Создание SVG-спрайта
function sprite() {
  return src(`${paths.images.dest}/*.svg`) // Берем все SVG из папки назначения
    .pipe(
      svgSprite({
        mode: {
          stack: {
            sprite: "../sprite.svg", // Итоговый файл спрайта
            example: true, // Включаем пример
          },
        },
      })
    )
    .pipe(dest(paths.images.dest)); // Сохраняем спрайт в папку назначения
}

// Наблюдение за изменениями в файлах
function watcher() {
  browserSync.init({
    server: {
      baseDir: paths.baseDir, // Базовая директория для сервера
    },
  });

  watch([paths.styles.scss], styles); // Отслеживаем изменения SCSS-файлов
  watch([paths.fonts.src], fonts); // Отслеживаем изменения шрифтов
  watch([paths.images.src], images); // Отслеживаем изменения изображений
  watch([paths.scripts.js], scripts); // Отслеживаем изменения JavaScript
  watch([`${paths.pug.src}/*.pug`]).on("change", template); // Отслеживаем изменения pug-файлов
  watch([`${paths.baseDir}/*.html`]).on("change", browserSync.reload); // Перезагружаем браузер при изменении HTML
}

// Очистка папки с дистрибутивом
function cleanDist() {
  return src(paths.dist, { allowEmpty: true, read: false }) // Берем папку с дистрибутивом
    .pipe(clean()); // Удаляем содержимое
}

// Копирование HTML-файлов в папку дистрибутива
function copyHtml() {
  return src(paths.html) // Берем HTML-файл
    .pipe(dest(paths.dist)); // Копируем в папку назначения
}

// Сборка проекта
function building() {
  const pathsToInclude = [
    `${paths.images.dest}/*.*`, // Оптимизированные изображения
    `!${paths.images.dest}/*.svg`, // Исключаем отдельные SVG
    `${paths.fonts.dest}/*.*`, // Конвертированные шрифты
    `${paths.styles.dest}/style.min.css`, // Минифицированный CSS
    `${paths.scripts.dest}/main.min.js`, // Минифицированный JavaScript
    `${paths.baseDir}/**/*.html`, // HTML-файлы
  ];

  // Добавляем sprite.svg только если он существует
  if (fs.existsSync(`${paths.images.dest}/sprite.svg`)) {
    pathsToInclude.push(`${paths.images.dest}/sprite.svg`);
  }

  return src(pathsToInclude, { base: paths.baseDir }).pipe(dest(paths.dist)); // Сохраняем в папку дистрибутива
}

// Экспортируем задачи для командной строки
exports.fonts = fonts;
exports.images = images;
exports.sprite = sprite;
exports.styles = styles;
exports.watcher = watcher;
exports.scripts = scripts;
exports.template = template;
exports.copyHtml = copyHtml;
exports.building = building;
exports.cleanDist = cleanDist;

// Основная задача сборки
exports.build = series(cleanDist, sprite, copyHtml, building);

// Задача по умолчанию для разработки
exports.default = parallel(template, styles, images, fonts, scripts, watcher);
