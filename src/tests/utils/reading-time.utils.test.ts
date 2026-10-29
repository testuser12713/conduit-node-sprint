import { calculateReadingTime } from '../../app/routes/article/reading-time.utils';

const words = (count: number): string =>
  Array.from({ length: count }, (_, index) => `word${index + 1}`).join(' ');

describe('ReadingTimeUtils', () => {
  describe('calculateReadingTime', () => {
    test('returns 1 for 199 words', () => {
      expect(calculateReadingTime(words(199))).toBe(1);
    });

    test('returns 1 for exactly 200 words', () => {
      expect(calculateReadingTime(words(200))).toBe(1);
    });

    test('returns 2 for 201 words', () => {
      expect(calculateReadingTime(words(201))).toBe(2);
    });

    test('returns 2 for 400 words', () => {
      expect(calculateReadingTime(words(400))).toBe(2);
    });

    test('returns 3 for 401 words', () => {
      expect(calculateReadingTime(words(401))).toBe(3);
    });

    test('returns 1 for an empty body', () => {
      expect(calculateReadingTime('')).toBe(1);
    });

    test('returns 1 for a whitespace-only body', () => {
      expect(calculateReadingTime('   \t\n  \r\n ')).toBe(1);
    });

    test('does not inflate the count for multiple spaces, tabs and newlines', () => {
      const body = 'alpha   beta\t\tgamma\n\ndelta\r\n epsilon';

      expect(calculateReadingTime(body)).toBe(1);
    });

    test('ignores repeated whitespace when counting words', () => {
      const spaced = words(200).replace(/ /g, '   \t\n');

      expect(calculateReadingTime(spaced)).toBe(1);
    });

    test('handles a realistic longer Markdown article', () => {
      const tokens = Array.from(
        { length: 450 },
        (_, index) => `token${index + 1}`,
      );
      const body = [
        '# Understanding Reading Time',
        '',
        'Reading time gives readers a quick estimate of how long an article takes.',
        '',
        '## Why it matters',
        '',
        '- It sets expectations',
        '- It improves navigation',
        '- It respects the reader',
        '',
        '> A short summary quote sits here.',
        '',
        ...tokens.map((token, index) => `${index + 1}. ${token}`),
        '',
        '## Conclusion',
        '',
        'Keep the estimate simple, visible and consistent.',
      ].join('\n');

      expect(calculateReadingTime(body)).toBe(5);
    });
  });
});
