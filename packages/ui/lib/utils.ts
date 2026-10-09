import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

const customTwMerge = extendTailwindMerge({
  extend: {
    theme: {},
    classGroups: {
      // Every step the shared config defines. A size tailwind-merge does not
      // know is filed as a *colour*, so `cn('text-xxs', 'text-faint')` kept
      // the colour and silently dropped the size.
      'font-size': [
        {
          text: [
            'xxs',
            '10',
            '11',
            '12',
            '13',
            '14',
            '15',
            '16',
            '17',
            '18',
            '19',
            '20',
            '21',
            '22',
            '23',
            '24',
            '28',
            '30',
            '32',
            '36',
            '40',
            '48',
            '56',
            '64',
            '68',
            '72',
            '96',
          ],
        },
      ],
      blur: ['100', '400'],
    },
  },
})

export const cx = clsx

export function cn(...inputs: ClassValue[]) {
  return customTwMerge(clsx(inputs))
}
