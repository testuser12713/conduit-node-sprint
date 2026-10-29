import { calculateReadingTime } from '../../app/routes/article/article.utils';

const buildWords = (count: number): string =>
  Array.from({ length: count }, (_, index) => `word${index}`).join(' ');

describe('ArticleUtils', () => {
  describe('calculateReadingTime', () => {
    test('should return 1 for an empty string', () => {
      // Given
      const body = '';

      // When
      const readingTime = calculateReadingTime(body);

      // Then
      expect(readingTime).toBe(1);
    });

    test('should return 1 for a whitespace-only body', () => {
      // Given
      const body = ' \n\t  \r\n   ';

      // When
      const readingTime = calculateReadingTime(body);

      // Then
      expect(readingTime).toBe(1);
    });

    test('should return 1 for a single word', () => {
      // Given
      const body = 'hello';

      // When
      const readingTime = calculateReadingTime(body);

      // Then
      expect(readingTime).toBe(1);
    });

    test('should return 1 for exactly 200 words', () => {
      // Given
      const body = buildWords(200);

      // When
      const readingTime = calculateReadingTime(body);

      // Then
      expect(readingTime).toBe(1);
    });

    test('should return 2 for 201 words', () => {
      // Given
      const body = buildWords(201);

      // When
      const readingTime = calculateReadingTime(body);

      // Then
      expect(readingTime).toBe(2);
    });

    test('should return 2 for 400 words', () => {
      // Given
      const body = buildWords(400);

      // When
      const readingTime = calculateReadingTime(body);

      // Then
      expect(readingTime).toBe(2);
    });

    test('should return 3 for 401 words', () => {
      // Given
      const body = buildWords(401);

      // When
      const readingTime = calculateReadingTime(body);

      // Then
      expect(readingTime).toBe(3);
    });

    test('should count words separated by line breaks, tabs and extra spaces', () => {
      // Given
      const words = buildWords(200).split(' ');
      const body = words
        .map((word, index) => {
          if (index === words.length - 1) {
            return word;
          }

          return index % 3 === 0
            ? `${word}\n\n`
            : index % 3 === 1
            ? `${word}\t\t`
            : `${word}    `;
        })
        .join('');

      // When
      const readingTime = calculateReadingTime(body);

      // Then
      expect(readingTime).toBe(1);
    });

    test('should handle a 1 MB whitespace-only body without throwing', () => {
      // Given
      const body = ' '.repeat(1024 * 1024);

      // When
      const readingTime = calculateReadingTime(body);

      // Then
      expect(Number.isInteger(readingTime)).toBe(true);
      expect(readingTime).toBeGreaterThanOrEqual(1);
    });

    test('should handle a 1 MB body without any whitespace without throwing', () => {
      // Given
      const body = 'a'.repeat(1024 * 1024);

      // When
      const readingTime = calculateReadingTime(body);

      // Then
      expect(Number.isInteger(readingTime)).toBe(true);
      expect(readingTime).toBeGreaterThanOrEqual(1);
    });
  });
});
