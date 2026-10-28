const wordsPerMinute = 200;

const calculateReadingTime = (body: string): number => {
  const words = body.split(/\s+/).filter((word) => word.length > 0).length;

  return Math.max(1, Math.ceil(words / wordsPerMinute));
};

export default calculateReadingTime;
