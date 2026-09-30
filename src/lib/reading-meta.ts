/** Shared enums for the reading collection (schema, pages, admin, CLI). */
export const READING_TYPES = ['book', 'article', 'paper', 'video', 'course'] as const;
export const READING_STATUS = ['reading', 'finished', 'want'] as const;
export type ReadingType = (typeof READING_TYPES)[number];
export type ReadingStatus = (typeof READING_STATUS)[number];

export const STATUS_LABEL: Record<ReadingStatus, string> = {
  reading: 'Reading now',
  finished: 'Finished',
  want: 'Want to read',
};
export const TYPE_LABEL: Record<ReadingType, string> = {
  book: 'Book',
  article: 'Article',
  paper: 'Paper',
  video: 'Video',
  course: 'Course',
};
