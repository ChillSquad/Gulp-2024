const { src, dest, watch, parallel, series } = require("gulp");

const scss = require("gulp-sass")(require("sass")); // Компиляция SCSS в CSS
const concat = require("gulp-concat"); // Объединение файлов
const uglify = require("gulp-uglify-es").default; // Минификация JS-файлов
const browserSync = require("browser-sync").create(); // Автоперезагрузка браузера
const autoprefixer = require("gulp-autoprefixer"); // Добавление CSS-префиксов
const clean = require("gulp-clean"); // Удаление файлов/папок
const avif = require("gulp-avif"); // Конвертация изображений в формат AVIF
const webp = require("gulp-webp"); // Конвертация изображений в формат WebP
const imagemin = require("gulp-imagemin"); // Оптимизация изображений
const newer = require("gulp-newer"); // Обработка только новых файлов
const svgSprite = require("gulp-svg-sprite"); // Создание SVG-спрайтов
const fonter = require("gulp-fonter"); // Конвертация шрифтов в разные форматы
const ttf2woff2 = require("gulp-ttf2woff2"); // Конвертация шрифтов TTF в WOFF2
const pug = require("gulp-pug"); // Шаблонизатор HTML PUG

// Определение путей для исходных и выходных файлов
const paths = {
  baseDir: "app", // Базовая директория проекта
  dist: "dist", // Папка для итоговой сборки
  html: "app/*.html", // Путь к основному HTML-файлу
  pug: {
    src: "app/pug/src",
    dest: "app/pug/dist",
  },
  styles: {
    scss: "app/scss/style.scss", // Основной SCSS-файл
    dest: "app/css", // Папка для скомпилированных CSS
  },
  scripts: {
    js: "app/js/main.js", // Основной JavaScript-файл
    dest: "app/js", // Папка для минифицированных JS-файлов
  },
  images: {
    src: "app/img/src", // Исходные изображения
    dest: "app/img/dist", // Папка для оптимизированных изображений
  },
  fonts: {
    src: "app/fonts/src", // Исходные шрифты
    dest: "app/fonts/dist", // Папка для сконвертированных шрифтов
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
  return src(
    [
      `${paths.images.dest}/*.*`, // Оптимизированные изображения
      `!${paths.images.dest}/*.svg`, // Исключаем отдельные SVG
      `${paths.images.dest}/sprite.svg`, // Добавляем SVG-спрайт

      `${paths.fonts.dest}/*.*`, // Конвертированные шрифты
      `${paths.styles.dest}/style.min.css`, // Минифицированный CSS
      `${paths.scripts.dest}/main.min.js`, // Минифицированный JavaScript
      `${paths.baseDir}/**/*.html`, // HTML-файлы
    ],
    { base: paths.baseDir } // Сохраняем структуру папок
  ).pipe(dest(paths.dist)); // Сохраняем в папку дистрибутива
}

// Экспортируем задачи для командной строки
exports.template = template;
exports.styles = styles;
exports.building = building;
exports.scripts = scripts;
exports.images = images;
exports.sprite = sprite;
exports.fonts = fonts;
exports.watcher = watcher;
exports.cleanDist = cleanDist;
exports.copyHtml = copyHtml;

// Основная задача сборки
exports.build = series(cleanDist, sprite, copyHtml, building);

// Задача по умолчанию для разработки
exports.default = parallel(template, styles, images, fonts, scripts, watcher);
