const WORDS_PER_MINUTE = 200;

export const calculateReadingTime = (body: string): number => {
  const wordCount = body.split(/\s+/).filter((word) => word.length > 0).length;
  return Math.max(1, Math.ceil(wordCount / WORDS_PER_MINUTE));
};
