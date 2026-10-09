import tailwindcssAnimate from 'tailwindcss-animate'
import type { Config } from 'tailwindcss/types/config'

export default {
  darkMode: ['class'],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
        '3xl': '1748px',
      },
    },
    extend: {
      screens: {
        '3xl': '1792px',
      },
      colors: {
        /* Dark cyberpunk gamer palette */
        border: '#1A1F2E', // deep midnight blue border
        ring: '#0A0E1A', // very dark focus rings
        background: '#212121', // deep charcoal black background
        foreground: '#E6E8F0', // bright white-blue text
        black: '#0B0E14', // override black to use our softer background color
        primary: {
          DEFAULT: '#2ecc71', // keep original primary
          foreground: '#001A0C',
        },
        secondary: {
          DEFAULT: '#151925', // darker gunmetal secondary
          foreground: '#B8BCC8', // cooler secondary text
        },
        destructive: {
          DEFAULT: '#eb4d4d', // cyberpunk red
          foreground: '#FFE6EA',
        },
        muted: {
          DEFAULT: '#1C2030', // deep blue-gray muted
          foreground: '#71767b', // muted blue-gray text
        },
        accent: {
          DEFAULT: '#1E2332', // darker accent with blue tint
          foreground: '#E6E8F0',
        },
        popover: {
          DEFAULT: '#151925',
          foreground: '#E6E8F0',
        },
        card: {
          DEFAULT: '#151925',
          foreground: '#E6E8F0',
        },
        positive: {
          DEFAULT: '#00FF88', // bright cyberpunk green
        },
        warning: {
          DEFAULT: '#FFB000', // cyberpunk amber
        },
        // The panel's surface. Everything else here is a semantic token above;
        // a literal name survives because the shadow root's own background is
        // not a role, it is this colour.
        brown: '#212121',

        /* ---- The agent panel palette, kept separate from the tokens above ----
         * The research panel's chat UI has its own dark-theme palette, and
         * remapping it onto the tokens above flattened the design:
         * `text-faint` became `text-muted-foreground`, `text-brand` became
         * `text-primary`, and a deliberate three-step text hierarchy collapsed
         * into two. These values keep the classes the panel components use.
         *
         * `brand` is the agent panel's green and is NOT `primary` above, since the buy
         * flow and the ticker pages keep theirs. Two greens is a real cost; it is
         * the smaller one against rewriting every panel component.
         */
        brand: {
          DEFAULT: '#5eed87',
          foreground: '#06120a',
        },
        // The third step between `foreground` and `muted-foreground`. Without
        // it a handle, a timestamp and body copy all read at the same weight.
        faint: '#8f8f8f',
        /* Neutral surfaces, derived from the panel background.
         *
         * The values are relative to a #0a0a0a background: card sits a few
         * points lighter, border a few more, border-strong a few beyond that.
         * This panel sits on #212121, so the literals of a darker design do not
         * transfer: `#2a2a2a` copied verbatim is *darker* than this background and the
         * hairline disappears. The relationships are what carry over.
         *
         * `surface` is deliberately neutral. `card` above is #151925, a navy
         * that reads as a blue box on a grey panel; the agent palette is
         * greyscale and that is most of why its cards sit quietly.
         */
        surface: '#282828',
        'border-soft': '#323232',
        'border-strong': '#3d3d3d',
        // X's own, because the badge and the entity blue belong to X. Painting
        // them with this product's accent reads as this product vouching for
        // the account.
        'x-reply': '#1d9bf0',
        'x-repost': '#00ba7c',
        'x-like': '#f91880',
        'x-verified': '#1d9bf0',
      },
      borderRadius: {
        sm: '0.25rem',
        md: '0.375rem',
        lg: '0.5rem',
        10: '0.625rem',
        16: '1rem',
        20: '1.25rem',
        24: '1.5rem',
        32: '2rem',
      },
      keyframes: {
        // One entrance per card. A card that appears mid-answer
        // without it reads as a layout jump rather than as a result arriving.
        'artifact-rise': {
          from: { opacity: '0', transform: 'translateY(6px)' },
        },
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'caret-blink': {
          '0%,70%,100%': { opacity: '1' },
          '20%,50%': { opacity: '0' },
        },
        'checkbox-attention': {
          '0%, 100%': {
            transform: 'scale(1)',
            boxShadow: '0 0 0 0 rgba(220, 38, 38, 0.4)',
          },
          '50%': {
            transform: 'scale(1.1)',
            boxShadow: '0 0 0 4px rgba(220, 38, 38, 0.4)',
          },
        },
        attention: {
          '0%, 100%': {
            transform: 'scale(1)',
          },
          '50%': {
            transform: 'scale(1.02)',
          },
        },
        'pulse-ring': {
          '0%': {
            boxShadow: '0 0 0 0 rgba(46, 204, 113, 0.3)',
          },
          '50%': {
            boxShadow: '0 0 0 8px rgba(46, 204, 113, 0)',
          },
          '100%': {
            boxShadow: '0 0 0 0 rgba(46, 204, 113, 0)',
          },
        },
        'spinner-rotate': {
          '100%': {
            transform: 'rotate(360deg)',
          },
        },
        'spinner-dash': {
          '0%': {
            'stroke-dashoffset': '50',
          },
          '50%': {
            'stroke-dashoffset': '17',
          },
          '100%': {
            'stroke-dashoffset': '50',
          },
        },
        'spinner-glow': {
          '0%, 100%': {
            opacity: '0.3',
            r: '3',
          },
          '50%': {
            opacity: '0.8',
            r: '4',
          },
        },
        'text-loading-line': {
          '0%': {
            transform: 'translateX(-100%)',
          },
          '50%': {
            transform: 'translateX(100%)',
          },
          '100%': {
            transform: 'translateX(-100%)',
          },
        },
        'pulse-dot': {
          '0%': { opacity: '0.2' },
          '50%': { opacity: '1' },
          '100%': { opacity: '0.2' },
        },
        'checkmark-draw': {
          to: { strokeDashoffset: '0' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        slideDownAndFade: {
          from: { opacity: '0', transform: 'translateY(-2px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        slideLeftAndFade: {
          from: { opacity: '0', transform: 'translateX(2px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        slideUpAndFade: {
          from: { opacity: '0', transform: 'translateY(2px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        slideRightAndFade: {
          from: { opacity: '0', transform: 'translateX(-2px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
      },
      animation: {
        // A short rise that settles rather than eases
        // flatly, so several cards arriving together still read one at a time.
        'artifact-rise': 'artifact-rise 360ms cubic-bezier(0.2, 0.8, 0.2, 1) both',
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'caret-blink': 'caret-blink 1.25s ease-out infinite',
        'checkbox-attention': 'checkbox-attention 0.6s cubic-bezier(0.4, 0, 0.6, 1)',
        attention: 'attention 0.6s cubic-bezier(0.4, 0, 0.6, 1)',
        'spinner-rotate': 'spinner-rotate 2s linear infinite',
        'spinner-dash': 'spinner-dash 1.5s ease-in-out infinite',
        'spinner-glow': 'spinner-glow 1.5s ease-in-out infinite',
        'pulse-ring': 'pulse-ring 2s cubic-bezier(0.455, 0.03, 0.515, 0.955) infinite',
        'text-loading-line': 'text-loading-line 1.5s linear infinite',
        'pulse-dot': 'pulse-dot 1.5s ease-in-out infinite',
        'checkmark-draw': 'checkmark-draw 0.6s ease-in-out forwards',
        shimmer: 'shimmer 2s infinite',
        slideDownAndFade: 'slideDownAndFade 400ms cubic-bezier(0.16, 1, 0.3, 1)',
        slideLeftAndFade: 'slideLeftAndFade 400ms cubic-bezier(0.16, 1, 0.3, 1)',
        slideUpAndFade: 'slideUpAndFade 400ms cubic-bezier(0.16, 1, 0.3, 1)',
        slideRightAndFade: 'slideRightAndFade 400ms cubic-bezier(0.16, 1, 0.3, 1)',
      },
      fontFamily: {
        // The panel renders inside x.com, so it borrows x.com's typeface rather
        // than shipping one: an @font-face declared in the host document also
        // resolves inside our shadow root. Off x.com (popup, options) the name
        // matches nothing and the stack falls through to the system font --
        // which is what happened everywhere before, since Geist was never
        // bundled either.
        sans: [
          'TwitterChirp',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'Helvetica',
          'Arial',
          'sans-serif',
        ],
        mono: [
          '"Chivo Mono"',
          'Consolas',
          'Menlo',
          'Monaco',
          'Courier New',
          'Liberation Mono',
          'DejaVu Sans Mono',
          'monospace',
        ],
      },
      fontSize: {
        // The smallest step, kept by name so components do not have to be
        // rewritten onto the numeric scale below.
        xxs: ['10px', { lineHeight: '14px' }],
        10: '0.625rem',
        11: '0.6875rem',
        12: '0.75rem',
        13: '0.8125rem',
        14: '0.875rem',
        // Body size for post text, with its line height. Was
        // 0.9375rem (the same 15px), but leading-normal made a two-line
        // post sit looser than intended.
        15: ['0.9375rem', { lineHeight: '20px' }],
        16: '1rem',
        17: '1.0625rem',
        18: '1.125rem',
        19: '1.1875rem',
        20: '1.25rem',
        21: '1.3125rem',
        22: '1.375rem',
        23: '1.4375rem',
        24: '1.5rem',
        25: '1.5625rem',
        26: '1.625rem',
        27: '1.6875rem',
        28: '1.75rem',
        29: '1.8125rem',
        30: '1.875rem',
        32: '2rem',
        36: '2.25rem',
        40: '2.5rem',
        48: '3rem',
        56: '3.5rem',
        60: '3.75rem',
        64: '4rem',
        68: '4.25rem',
        72: '4.5rem',
        75: '4.6875rem',
        96: '6rem',
      },
      lineHeight: {
        relaxed: '1.63',
        16: '1rem',
        20: '1.25rem',
      },
      outline: {
        none: '1px solid transparent',
      },
      outlineWidth: {
        DEFAULT: '1px',
      },
      spacing: {
        4.5: '1.125rem',
        13: '3.25rem',
        15: '3.75rem',
        17: '4.25rem',
        18: '4.5rem',
        19: '4.75rem',
        22: '5.5rem',
        23: '5.75rem',
        25: '6.25rem',
        26: '6.5rem',
        27: '6.75rem',
        30: '7.5rem',
        34: '8.5rem',
        35: '8.75rem',
        37: '9.25rem',
        39: '9.75rem',
        41: '10.25rem',
        43: '10.75rem',
        44: '11rem',
        45: '11.25rem',
        47: '11.75rem',
        49: '12.25rem',
        50: '12.5rem',
        54: '13.5rem',
        55: '13.75rem',
        57: '14.25rem',
        59: '14.75rem',
        61: '15.25rem',
        65: '16.25rem',
        70: '17.5rem',
        75: '18.75rem',
        76: '19rem',
        83: '20.75rem',
        85: '21.25rem',
        90: '22.5rem',
        97: '24.25rem',
        98: '24.5rem',
        100: '25rem',
        106: '26.5rem',
        107: '26.75rem',
        120: '30rem',
        122: '30.5rem',
        130: '32.5rem',
        135: '33.75rem',
        140: '35rem',
        150: '37.5rem',
      },
      blur: {
        100: '100px',
        300: '300px',
        400: '400px',
      },
      opacity: {
        2: '0.02',
        4: '0.04',
        8: '0.08',
      },
      aria: {
        invalid: 'invalid="true"',
      },
    },
  },
  plugins: [tailwindcssAnimate],
} as Omit<Config, 'content'>
