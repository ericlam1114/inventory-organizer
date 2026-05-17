import { ImageResponse } from 'next/og';

export const runtime = 'nodejs';
export const alt = 'Archive by Straighten Up';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

async function loadFont(family: string, weight: number, italic = false) {
  const style = italic ? 'ital,wght@1,' : 'wght@';
  const url = `https://fonts.googleapis.com/css2?family=${family.replace(/ /g, '+')}:${style}${weight}&display=swap`;
  const css = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    },
  }).then((r) => r.text());
  const match = css.match(/src:\s*url\((.+?)\)\s*format\(['"]?[a-zA-Z0-9-]+['"]?\)/);
  if (!match) throw new Error(`Could not extract font url for ${family}`);
  return fetch(match[1]).then((r) => r.arrayBuffer());
}

export default async function OpengraphImage() {
  const [cormorantItalic, cormorantRegular, inter] = await Promise.all([
    loadFont('Cormorant Garamond', 500, true),
    loadFont('Cormorant Garamond', 500, false),
    loadFont('Inter', 500, false),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#F5F5F5',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px 88px',
          fontFamily: 'Inter',
          color: '#0E1B2C',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(120% 80% at 80% 10%, rgba(20,56,90,0.06), transparent 60%), radial-gradient(80% 60% at 10% 100%, rgba(20,56,90,0.05), transparent 60%)',
          }}
        />

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            fontSize: 18,
            letterSpacing: '0.32em',
            textTransform: 'uppercase',
            color: '#5C6A7A',
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#14385A"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z" />
            <path d="M12 22V12" />
            <polyline points="3.29 7 12 12 20.71 7" />
            <path d="m7.5 4.27 9 5.15" />
          </svg>
          <span>Straighten Up · Archive</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          <h1
            style={{
              fontFamily: 'Cormorant Garamond',
              fontWeight: 500,
              fontSize: 132,
              lineHeight: 1.02,
              letterSpacing: '-0.015em',
              margin: 0,
              color: '#0E1B2C',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <span>Archive by</span>
            <span style={{ fontStyle: 'italic' }}>Straighten Up.</span>
          </h1>
          <p
            style={{
              fontFamily: 'Inter',
              fontSize: 26,
              lineHeight: 1.45,
              maxWidth: 760,
              margin: 0,
              color: '#3A485A',
            }}
          >
            A private workspace to catalog, track, and share archived
            wardrobes, furniture, and personal collections.
          </p>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 18,
            color: '#5C6A7A',
          }}
        >
          <span style={{ letterSpacing: '0.24em', textTransform: 'uppercase' }}>
            Invite only
          </span>
          <span>straightenup.home</span>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: 'Cormorant Garamond',
          data: cormorantItalic,
          style: 'italic',
          weight: 500,
        },
        {
          name: 'Cormorant Garamond',
          data: cormorantRegular,
          style: 'normal',
          weight: 500,
        },
        {
          name: 'Inter',
          data: inter,
          style: 'normal',
          weight: 500,
        },
      ],
    },
  );
}
