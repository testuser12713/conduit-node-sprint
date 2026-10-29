const WORDS_PER_MINUTE = 200;

export const calculateReadingTime = (body: string): number => {
  if (!body) {
    return 1;
  }

  const trimmedBody = body.trim();

  if (trimmedBody.length === 0) {
    return 1;
  }

  const wordCount = trimmedBody.split(/\s+/).length;

  return Math.max(1, Math.ceil(wordCount / WORDS_PER_MINUTE));
};

export default calculateReadingTime;
