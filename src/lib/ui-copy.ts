/**
 * Centralized Russian UI chrome copy. Single source of truth for Plan 3.
 * Plan 7 (i18n) replaces this with next-intl message catalogs of the same shape.
 */
export const copy = {
  site: {
    name: "KRIPIPASTA",
    tagline: "Архив интернет-хоррора",
  },
  nav: {
    browse: "Обзор",
    categories: "Категории",
    trending: "Популярное",
    index: "Указатель",
  },
  header: {
    searchPlaceholder: "Поиск по архиву — истории, категории, эпохи",
    submit: "Добавить запись",
  },
  feed: {
    eyebrow: "Архив",
    heading: "Все истории",
    countTemplate: "Показано {shown} из {total}",
    sortLabel: "Сортировка",
    sortPopular: "Популярные",
    sortNewest: "Новые",
    allTag: "Все",
    loadMore: "Показать ещё",
    empty: "Пока нет опубликованных историй.",
  },
  hero: {
    featured: "История недели",
    read: "Читать историю →",
  },
  story: {
    backToArchive: "‹ Назад в архив",
    ratingLabel: "Рейтинг сообщества",
    votesTemplate: "{count} голосов · рейтинг сообщества",
    readingProgress: "Прогресс чтения",
    related: "Если вам понравилось",
    minRead: "мин чтения",
    by: "автор",
    posted: "Опубликовано",
  },
  footer: {
    aboutHeading: "KRIPIPASTA",
    about:
      "Архив интернет-хоррора, поддерживаемый сообществом, — истории, сущности и фольклор, который сеть придумывает о самой себе.",
    exploreHeading: "Разделы",
    explore: {
      all: "Все истории",
      categories: "Категории",
      trending: "Популярное",
      index: "Указатель",
    },
    communityHeading: "Сообщество",
    community: {
      contribute: "Предложить историю",
      guidelines: "Правила редактуры",
      recent: "Последние правки",
    },
    estLeft: "ОСН. MMV · РЕДАКТИРУЕТСЯ СООБЩЕСТВОМ",
    estRight: "ВСЕ ИСТОРИИ — ПЛОДЫ КОЛЛЕКТИВНОГО ВЫМЫСЛА",
  },
  notFound: {
    heading: "Страница потерялась в помехах",
    body: "Такой истории в архиве нет — возможно, она удалена или ещё не опубликована.",
    back: "На главную",
  },
} as const;
