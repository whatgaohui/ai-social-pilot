import { NextRequest, NextResponse } from 'next/server';

const GRADIENTS = [
  ['#FF6B6B', '#FFE66D'], // warm coral-gold
  ['#4ECDC4', '#44CF6C'], // teal-green
  ['#667EEA', '#764BA2'], // purple-indigo
  ['#F093FB', '#F5576C'], // pink-rose
  ['#4FACFE', '#00F2FE'], // blue-cyan
  ['#43E97B', '#38F9D7'], // green-mint
];

function createSvgFallback(prompt: string): string {
  const gradientIndex = Math.floor(Math.random() * GRADIENTS.length);
  const [color1, color2] = GRADIENTS[gradientIndex];

  // Extract topic text (first 20 chars)
  const topicText = (prompt.replace(/一张精美的小红书风格封面图，主题：/, '').replace(/。.*/, '').slice(0, 20)) || prompt.slice(0, 20);

  // Generate decorative circles positions
  const circleSeed = Math.random();
  const cx1 = 60 + circleSeed * 80;
  const cy1 = 100 + circleSeed * 120;
  const r1 = 40 + circleSeed * 60;
  const cx2 = 500 - circleSeed * 80;
  const cy2 = 600 - circleSeed * 120;
  const r2 = 30 + circleSeed * 50;

  // Decorative line positions
  const lineY = 450 + Math.random() * 60;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800" viewBox="0 0 600 800">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${color1};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${color2};stop-opacity:1" />
    </linearGradient>
    <linearGradient id="shine" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:white;stop-opacity:0.15" />
      <stop offset="100%" style="stop-color:white;stop-opacity:0" />
    </linearGradient>
    <filter id="blur1">
      <feGaussianBlur stdDeviation="20" />
    </filter>
    <filter id="shadow">
      <feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="#00000030" />
    </filter>
  </defs>

  <!-- Background -->
  <rect width="600" height="800" fill="url(#bg)" />

  <!-- Shine overlay -->
  <rect width="600" height="800" fill="url(#shine)" />

  <!-- Decorative blurred circles -->
  <circle cx="${cx1}" cy="${cy1}" r="${r1}" fill="white" opacity="0.12" filter="url(#blur1)" />
  <circle cx="${cx2}" cy="${cy2}" r="${r2}" fill="white" opacity="0.1" filter="url(#blur1)" />

  <!-- Decorative small dots -->
  <circle cx="80" cy="120" r="3" fill="white" opacity="0.3" />
  <circle cx="520" cy="80" r="2" fill="white" opacity="0.25" />
  <circle cx="150" cy="680" r="2.5" fill="white" opacity="0.2" />
  <circle cx="480" cy="720" r="3" fill="white" opacity="0.3" />
  <circle cx="50" cy="400" r="2" fill="white" opacity="0.15" />
  <circle cx="550" cy="500" r="2.5" fill="white" opacity="0.2" />

  <!-- Decorative lines -->
  <line x1="100" y1="${lineY}" x2="500" y2="${lineY}" stroke="white" stroke-opacity="0.15" stroke-width="1" />
  <line x1="120" y1="${lineY + 8}" x2="480" y2="${lineY + 8}" stroke="white" stroke-opacity="0.1" stroke-width="0.5" />

  <!-- Corner decorations -->
  <path d="M40,40 L80,40 L40,80 Z" fill="white" opacity="0.15" />
  <path d="M560,760 L520,760 L560,720 Z" fill="white" opacity="0.15" />

  <!-- Central white card area -->
  <rect x="60" y="220" width="480" height="280" rx="20" ry="20" fill="white" opacity="0.18" />

  <!-- Main topic text -->
  <text x="300" y="340" font-family="'PingFang SC','Microsoft YaHei','Noto Sans SC',sans-serif" font-size="38" font-weight="700" fill="white" text-anchor="middle" filter="url(#shadow)">
    ${escapeXml(topicText)}
  </text>

  <!-- Subtitle line -->
  <text x="300" y="400" font-family="'PingFang SC','Microsoft YaHei','Noto Sans SC',sans-serif" font-size="16" font-weight="400" fill="white" text-anchor="middle" opacity="0.8">
    小红书 · 精选内容
  </text>

  <!-- Decorative separator -->
  <line x1="240" y1="430" x2="360" y2="430" stroke="white" stroke-opacity="0.3" stroke-width="1.5" stroke-linecap="round" />

  <!-- Bottom tag area -->
  <rect x="220" y="600" width="160" height="32" rx="16" ry="16" fill="white" opacity="0.2" />
  <text x="300" y="621" font-family="'PingFang SC','Microsoft YaHei','Noto Sans SC',sans-serif" font-size="12" font-weight="500" fill="white" text-anchor="middle" opacity="0.9">
    ✨ AI运营助手
  </text>

  <!-- Watermark -->
  <text x="300" y="770" font-family="'PingFang SC','Microsoft YaHei','Noto Sans SC',sans-serif" font-size="10" fill="white" text-anchor="middle" opacity="0.35">
    AI运营助手 · 智能封面生成
  </text>
</svg>`;

  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json();

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    // Try to use z-ai-web-dev-sdk for image generation
    let imageUrl: string | null = null;

    try {
      const ZAI = await import('z-ai-web-dev-sdk');
      const zai = await ZAI.default.create();

      // Attempt image generation
      const result = await zai.images.generate({
        prompt: prompt,
        size: '1024x1536',
      });

      if (result?.data?.[0]?.url) {
        // If the SDK returns a URL, fetch it and convert to base64
        const imageResponse = await fetch(result.data[0].url);
        if (imageResponse.ok) {
          const arrayBuffer = await imageResponse.arrayBuffer();
          const base64 = Buffer.from(arrayBuffer).toString('base64');
          imageUrl = `data:image/png;base64,${base64}`;
        }
      } else if (result?.data?.[0]?.b64_json) {
        imageUrl = `data:image/png;base64,${result.data[0].b64_json}`;
      }
    } catch (aiError) {
      console.warn('AI image generation failed, using SVG fallback:', aiError);
    }

    // Fallback to SVG if AI generation fails
    if (!imageUrl) {
      imageUrl = createSvgFallback(prompt);
    }

    return NextResponse.json({ imageUrl });
  } catch (error) {
    console.error('Cover generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate cover image', details: String(error) },
      { status: 500 }
    );
  }
}
