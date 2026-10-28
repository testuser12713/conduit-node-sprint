import calculateReadingTime from '../../app/routes/article/reading-time.utils';

const buildWords = (count: number): string =>
  Array.from({ length: count }, (_, index) => `word${index + 1}`).join(' ');

describe('ReadingTimeUtils', () => {
  describe('calculateReadingTime', () => {
    test('should return 1 for an empty body', () => {
      expect(calculateReadingTime('')).toEqual(1);
    });

    test('should return 1 for a whitespace-only body', () => {
      expect(calculateReadingTime('   \n\t  ')).toEqual(1);
    });

    test('should return 1 for a single word', () => {
      expect(calculateReadingTime('word')).toEqual(1);
    });

    test('should return 1 for 200 words', () => {
      expect(calculateReadingTime(buildWords(200))).toEqual(1);
    });

    test('should return 2 for 201 words', () => {
      expect(calculateReadingTime(buildWords(201))).toEqual(2);
    });

    test('should return 2 for 400 words', () => {
      expect(calculateReadingTime(buildWords(400))).toEqual(2);
    });

    test('should return 3 for 401 words', () => {
      expect(calculateReadingTime(buildWords(401))).toEqual(3);
    });

    test('should treat repeated whitespace, newlines and tabs as single spaces', () => {
      const body = buildWords(200)
        .split(' ')
        .join(' \n\t  ');

      expect(calculateReadingTime(body)).toEqual(1);
    });
  });
});
