import calculateReadingTime from '../../app/routes/article/article.utils';

const generateWords = (count: number): string =>
  Array(count).fill('word').join(' ');

describe('ArticleUtils', () => {
  describe('calculateReadingTime', () => {
    test('should return 1 for an empty body', () => {
      expect(calculateReadingTime('')).toBe(1);
    });

    test('should return 1 for a whitespace-only body', () => {
      expect(calculateReadingTime('   \n\t  \r\n ')).toBe(1);
    });

    test('should return 1 for a single word', () => {
      expect(calculateReadingTime('word')).toBe(1);
    });

    test('should return 1 for exactly 200 words', () => {
      expect(calculateReadingTime(generateWords(200))).toBe(1);
    });

    test('should return 2 for 201 words', () => {
      expect(calculateReadingTime(generateWords(201))).toBe(2);
    });

    test('should return 2 for 400 words', () => {
      expect(calculateReadingTime(generateWords(400))).toBe(2);
    });

    test('should return 3 for 401 words', () => {
      expect(calculateReadingTime(generateWords(401))).toBe(3);
    });

    test('should count words regardless of the whitespace used', () => {
      const singleSpaces = generateWords(100);
      const mixedWhitespace = singleSpaces.replace(/ /g, '   \n\t');

      expect(calculateReadingTime(mixedWhitespace)).toBe(
        calculateReadingTime(singleSpaces)
      );
      expect(calculateReadingTime(mixedWhitespace)).toBe(1);
    });

    test('should return 1 for undefined or null input', () => {
      expect(calculateReadingTime(undefined as unknown as string)).toBe(1);
      expect(calculateReadingTime(null as unknown as string)).toBe(1);
    });

    test('should calculate the reading time of realistic prose', () => {
      const prose = generateWords(950);

      expect(calculateReadingTime(prose)).toBe(5);
    });

    test('should calculate the reading time of a very long body quickly', () => {
      const body = generateWords(100000);

      const start = Date.now();
      const readingTime = calculateReadingTime(body);
      const duration = Date.now() - start;

      expect(readingTime).toBe(500);
      expect(duration).toBeLessThan(1000);
    });
  });
});
