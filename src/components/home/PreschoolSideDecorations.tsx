'use client'

import React from 'react'

/**
 * PreschoolSideDecorations — Classic Premium Preschool Perimeter Motifs
 * Design ID: PRE1-CLASSIC-PREMIUM-HOME-V1.0
 *
 * Implements the 4 perimeter illustrations specified in Section 05:
 * 1. Upper-Left: Hot-air balloon with 2 cheerful children, clouds, soft shadows
 * 2. Upper-Right: Soft pastel rainbow, clouds, subtle sparkle stars
 * 3. Lower-Left: Soft green leaves, flowers, garden atmosphere
 * 4. Lower-Right: Preschool schoolhouse (cream walls, coral roof, flag, hill, trees, pathway)
 *
 * Guaranteed Properties:
 * - Pointer-events-none & select-none: Zero interference with interactive module cards
 * - Perimeter positioning: Stays strictly within outer screen margins
 * - Responsive breakpoints: Gracefully tucked or hidden on tablets and mobile screens
 * - Crisp vector rendering: High-fidelity scalable SVGs with soft pastel palettes
 */
export function PreschoolSideDecorations() {
  return (
    <div
      className="preschool-side-decorations fixed inset-0 pointer-events-none select-none overflow-hidden z-0"
      aria-hidden="true"
    >
      {/* ══════════════════════════════════════════════════════════════════
          1. UPPER-LEFT: Hot-Air Balloon with Children & Puffy Clouds
          Visible on xl displays (>= 1280px) and comfortably positioned
          ══════════════════════════════════════════════════════════════════ */}
      <div
        className="hidden xl:block absolute top-12 left-2 2xl:left-8 w-44 2xl:w-56 h-auto origin-top-left transition-opacity duration-500 opacity-85 hover:opacity-100"
        style={{
          filter: 'drop-shadow(0 12px 24px rgba(139, 92, 246, 0.10))',
          animation: 'preoneFloatBalloon 8s ease-in-out infinite',
        }}
      >
        <svg viewBox="0 0 240 320" fill="none" className="w-full h-auto">
          <defs>
            {/* Balloon Segment Gradients */}
            <linearGradient id="balloonLilac" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#DDD6FE" />
              <stop offset="50%" stopColor="#C4B5FD" />
              <stop offset="100%" stopColor="#A78BFA" />
            </linearGradient>
            <linearGradient id="balloonCoral" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFE4E6" />
              <stop offset="50%" stopColor="#FDA4AF" />
              <stop offset="100%" stopColor="#FB7185" />
            </linearGradient>
            <linearGradient id="balloonGold" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FEF3C7" />
              <stop offset="50%" stopColor="#FDE68A" />
              <stop offset="100%" stopColor="#FCD34D" />
            </linearGradient>
            <linearGradient id="balloonMint" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ECFDF5" />
              <stop offset="50%" stopColor="#A7F3D0" />
              <stop offset="100%" stopColor="#6EE7B7" />
            </linearGradient>
            <linearGradient id="cloudWhite" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="100%" stopColor="#F1F5F9" />
            </linearGradient>
            <linearGradient id="basketWood" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FDE68A" />
              <stop offset="50%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#D97706" />
            </linearGradient>
          </defs>

          {/* Background Cloud behind balloon */}
          <g opacity="0.85">
            <path
              d="M10 80C10 66 22 55 36 55C42 42 56 34 72 34C92 34 108 47 112 65C118 64 125 66 130 71C137 77 140 86 138 95C146 99 152 108 152 118C152 131 141 142 128 142H28C18 142 10 134 10 124C10 119 12 114 16 110C12 102 10 92 10 80Z"
              fill="url(#cloudWhite)"
              opacity="0.95"
            />
          </g>

          {/* Balloon Canopy */}
          <g>
            {/* Outer Balloon Contour (Shadow/Halo) */}
            <ellipse cx="120" cy="115" rx="68" ry="76" fill="#DDD6FE" opacity="0.2" />

            {/* Leftmost Stripe (Mint) */}
            <path
              d="M120 40C88 40 56 75 56 115C56 148 76 174 94 186L102 186C88 172 74 146 74 115C74 80 94 48 120 40Z"
              fill="url(#balloonMint)"
            />

            {/* Middle-Left Stripe (Coral/Peach) */}
            <path
              d="M120 40C94 48 74 80 74 115C74 146 88 172 102 186L112 186C98 170 88 145 88 115C88 78 104 46 120 40Z"
              fill="url(#balloonCoral)"
            />

            {/* Center-Left Stripe (Lilac/Lavender) */}
            <path
              d="M120 40C104 46 88 78 88 115C88 145 98 170 112 186L120 186C112 170 106 144 106 115C106 74 114 44 120 40Z"
              fill="url(#balloonLilac)"
            />

            {/* Center-Right Stripe (Gold/Yellow) */}
            <path
              d="M120 40C126 44 134 74 134 115C134 144 128 170 120 186L128 186C142 170 152 145 152 115C152 78 136 46 120 40Z"
              fill="url(#balloonGold)"
            />

            {/* Middle-Right Stripe (Coral/Peach) */}
            <path
              d="M120 40C136 46 152 78 152 115C152 145 142 170 128 186L138 186C152 172 166 146 166 115C166 80 146 48 120 40Z"
              fill="url(#balloonCoral)"
            />

            {/* Rightmost Stripe (Mint) */}
            <path
              d="M120 40C146 48 166 80 166 115C166 146 152 172 138 186L146 186C164 174 184 148 184 115C184 75 152 40 120 40Z"
              fill="url(#balloonMint)"
            />

            {/* Balloon Top Cap */}
            <ellipse cx="120" cy="40" rx="14" ry="4" fill="#DDD6FE" />

            {/* Balloon Bottom Trim Ring */}
            <ellipse cx="120" cy="186" rx="26" ry="6" fill="#A78BFA" />
            <ellipse cx="120" cy="186" rx="22" ry="4" fill="#DDD6FE" />

            {/* Soft Shimmer Highlight */}
            <path
              d="M74 88C78 68 92 52 110 46"
              stroke="#FFFFFF"
              strokeWidth="3.5"
              strokeLinecap="round"
              opacity="0.65"
            />
          </g>

          {/* Rigging Ropes */}
          <g stroke="#94A3B8" strokeWidth="1.2" strokeLinecap="round" opacity="0.8">
            <line x1="98" y1="188" x2="104" y2="224" />
            <line x1="110" y1="190" x2="112" y2="224" />
            <line x1="130" y1="190" x2="128" y2="224" />
            <line x1="142" y1="188" x2="136" y2="224" />
            {/* Cross brace */}
            <path d="M102 206H138" strokeDasharray="2 3" strokeWidth="0.8" />
          </g>

          {/* Children Peeking From Basket */}
          <g>
            {/* Child 1: Left (Boy with blue cap) */}
            <circle cx="112" cy="216" r="9" fill="#FED7AA" />
            {/* Hair / Cap */}
            <path d="M103 214C103 208 108 206 114 206C119 206 122 209 122 214Z" fill="#38BDF8" />
            {/* Cap Visor */}
            <path d="M102 213C100 213 97 214 96 216C100 216 104 215 106 214Z" fill="#0284C7" />
            {/* Eyes */}
            <circle cx="109" cy="215" r="1.1" fill="#1E293B" />
            <circle cx="114" cy="215" r="1.1" fill="#1E293B" />
            {/* Smile */}
            <path d="M109 219C111 221 114 221 116 219" stroke="#E11D48" strokeWidth="1" strokeLinecap="round" fill="none" />
            {/* Waving Hand */}
            <circle cx="98" cy="216" r="3.5" fill="#FED7AA" />

            {/* Child 2: Right (Girl with brown pigtails) */}
            <circle cx="128" cy="216" r="9" fill="#FED7AA" />
            {/* Hair */}
            <path d="M120 214C120 207 125 205 130 205C136 205 137 209 137 214Z" fill="#92400E" />
            {/* Hair Ribbons & Pigtails */}
            <circle cx="137" cy="212" r="3" fill="#F43F5E" />
            <ellipse cx="139" cy="217" rx="2.5" ry="4" fill="#92400E" />
            {/* Eyes */}
            <circle cx="125" cy="215" r="1.1" fill="#1E293B" />
            <circle cx="130" cy="215" r="1.1" fill="#1E293B" />
            {/* Cheerful Smile */}
            <path d="M125 219C127 221 129 221 131 219" stroke="#E11D48" strokeWidth="1" strokeLinecap="round" fill="none" />
            {/* Rosy Cheeks */}
            <ellipse cx="123" cy="217" rx="1.8" ry="1.2" fill="#FDA4AF" opacity="0.6" />
            <ellipse cx="132" cy="217" rx="1.8" ry="1.2" fill="#FDA4AF" opacity="0.6" />
          </g>

          {/* Woven Basket */}
          <g>
            <rect x="100" y="224" width="40" height="26" rx="6" fill="url(#basketWood)" />
            {/* Basket Weave Details */}
            <line x1="102" y1="232" x2="138" y2="232" stroke="#B45309" strokeWidth="1.2" />
            <line x1="102" y1="240" x2="138" y2="240" stroke="#B45309" strokeWidth="1.2" />
            <line x1="110" y1="225" x2="110" y2="249" stroke="#B45309" strokeWidth="1" />
            <line x1="120" y1="225" x2="120" y2="249" stroke="#B45309" strokeWidth="1" />
            <line x1="130" y1="225" x2="130" y2="249" stroke="#B45309" strokeWidth="1" />
            {/* Basket Rim */}
            <rect x="98" y="222" width="44" height="4" rx="2" fill="#FDE68A" />
          </g>

          {/* Foreground Puffy Cloud Drifting Below Basket */}
          <g opacity="0.92">
            <path
              d="M70 270C70 258 80 248 92 248C96 238 108 232 120 232C134 232 146 241 150 252C155 251 161 253 165 257C171 262 174 270 172 278C179 281 184 288 184 296C184 307 175 316 164 316H84C74 316 66 308 66 298C66 294 68 290 71 287C68 281 67 274 70 270Z"
              fill="url(#cloudWhite)"
            />
          </g>

          {/* Tiny Floating Sparkles */}
          <path
            d="M50 180L52 185L57 187L52 189L50 194L48 189L43 187L48 185L50 180Z"
            fill="#FBBF24"
            opacity="0.8"
          />
          <path
            d="M190 140L191.5 144L196 145.5L191.5 147L190 151L188.5 147L184 145.5L188.5 144L190 140Z"
            fill="#F472B6"
            opacity="0.75"
          />
        </svg>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          2. UPPER-RIGHT: Soft Pastel Rainbow & Billowing Clouds
          Visible on lg+ displays (>= 1024px)
          ══════════════════════════════════════════════════════════════════ */}
      <div
        className="hidden xl:block absolute top-10 right-2 2xl:right-8 w-48 2xl:w-60 h-auto origin-top-right transition-opacity duration-500 opacity-80 hover:opacity-95"
        style={{
          filter: 'drop-shadow(0 10px 20px rgba(139, 92, 246, 0.08))',
          animation: 'preoneSubtleRainbow 10s ease-in-out infinite alternate',
        }}
      >
        <svg viewBox="0 0 280 200" fill="none" className="w-full h-auto">
          <defs>
            <linearGradient id="cloudGlow" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="100%" stopColor="#EDE9FE" />
            </linearGradient>
          </defs>

          {/* Rainbow Arcs: Pastel Harmony Palette */}
          <g opacity="0.88">
            {/* Arc 1: Soft Coral / Rose */}
            <path
              d="M40 160C40 94 94 40 160 40C226 40 280 94 280 160"
              stroke="#FDA4AF"
              strokeWidth="9"
              strokeLinecap="round"
            />
            {/* Arc 2: Warm Sunny Butter */}
            <path
              d="M49 160C49 99 99 49 160 49C221 49 271 99 271 160"
              stroke="#FDE68A"
              strokeWidth="9"
              strokeLinecap="round"
            />
            {/* Arc 3: Soft Fresh Mint */}
            <path
              d="M58 160C58 104 104 58 160 58C216 58 262 104 262 160"
              stroke="#A7F3D0"
              strokeWidth="9"
              strokeLinecap="round"
            />
            {/* Arc 4: Sky Blue */}
            <path
              d="M67 160C67 109 109 67 160 67C211 67 253 109 253 160"
              stroke="#BAE6FD"
              strokeWidth="9"
              strokeLinecap="round"
            />
            {/* Arc 5: Soft Lavender / Lilac */}
            <path
              d="M76 160C76 114 114 76 160 76C206 76 244 114 244 160"
              stroke="#DDD6FE"
              strokeWidth="9"
              strokeLinecap="round"
            />
          </g>

          {/* Left Cloud Cluster Anchor */}
          <g opacity="0.95">
            <path
              d="M20 170C20 156 32 145 46 145C52 133 64 125 78 125C96 125 111 137 114 153C120 152 126 155 130 160C136 166 138 174 136 182C143 186 148 193 148 200H32C25 200 20 195 20 188C20 184 22 180 25 177C22 173 20 168 20 170Z"
              fill="url(#cloudGlow)"
            />
          </g>

          {/* Right Cloud Cluster Anchor */}
          <g opacity="0.95">
            <path
              d="M170 170C170 156 182 145 196 145C202 133 214 125 228 125C246 125 261 137 264 153C270 152 276 155 280 160C286 166 288 174 286 182C293 186 298 193 298 200H182C175 200 170 195 170 188Z"
              fill="url(#cloudGlow)"
            />
          </g>

          {/* Golden Twinkle Sparkle Stars */}
          <path
            d="M100 36L102 41L107 43L102 45L100 50L98 45L93 43L98 41L100 36Z"
            fill="#FBBF24"
            opacity="0.85"
          />
          <path
            d="M210 28L211.5 32L216 33.5L211.5 35L210 39L208.5 35L204 33.5L208.5 32L210 28Z"
            fill="#F59E0B"
            opacity="0.9"
          />
          <circle cx="155" cy="24" r="2.5" fill="#C084FC" opacity="0.75" />
          <circle cx="180" cy="38" r="2" fill="#FDE047" opacity="0.8" />
          <circle cx="80" cy="54" r="1.8" fill="#38BDF8" opacity="0.65" />
        </svg>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          3. LOWER-LEFT: Gentle Garden Foliage, Pastel Flowers & Butterfly
          Visible on xl displays (>= 1280px)
          ══════════════════════════════════════════════════════════════════ */}
      <div
        className="hidden xl:block absolute bottom-12 left-2 2xl:left-6 w-40 2xl:w-52 h-auto origin-bottom-left transition-opacity duration-500 opacity-75 hover:opacity-90"
        style={{
          filter: 'drop-shadow(0 8px 18px rgba(16, 185, 129, 0.08))',
        }}
      >
        <svg viewBox="0 0 200 180" fill="none" className="w-full h-auto">
          <defs>
            <linearGradient id="leafGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#A7F3D0" />
              <stop offset="100%" stopColor="#34D399" />
            </linearGradient>
            <linearGradient id="leafGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6EE7B7" />
              <stop offset="100%" stopColor="#10B981" />
            </linearGradient>
            <linearGradient id="flowerRose" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFE4E6" />
              <stop offset="50%" stopColor="#FDA4AF" />
              <stop offset="100%" stopColor="#F43F5E" />
            </linearGradient>
            <linearGradient id="flowerLavender" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#EDE9FE" />
              <stop offset="50%" stopColor="#C4B5FD" />
              <stop offset="100%" stopColor="#8B5CF6" />
            </linearGradient>
          </defs>

          {/* Soft Ground/Mound Silhouette */}
          <path
            d="M-20 180C10 160 50 152 100 162C150 172 180 165 220 180H-20Z"
            fill="#D1FAE5"
            opacity="0.6"
          />

          {/* Stems */}
          <path d="M40 170C46 140 60 115 80 95" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M70 170C75 145 88 128 110 110" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M25 175C30 155 35 140 45 130" stroke="#059669" strokeWidth="2" strokeLinecap="round" />

          {/* Leaves */}
          {/* Leaf 1 */}
          <path
            d="M55 125C70 120 80 128 85 138C75 145 62 140 55 125Z"
            fill="url(#leafGrad1)"
          />
          {/* Leaf 2 */}
          <path
            d="M85 132C100 130 108 140 110 150C98 154 88 146 85 132Z"
            fill="url(#leafGrad2)"
          />
          {/* Leaf 3 */}
          <path
            d="M32 145C42 140 48 148 50 155C42 158 36 154 32 145Z"
            fill="url(#leafGrad1)"
          />

          {/* Main Blooming Flower (Pink / Rose) */}
          <g transform="translate(80, 95)">
            {/* Petals */}
            <circle cx="0" cy="-14" r="10" fill="url(#flowerRose)" opacity="0.9" />
            <circle cx="13" cy="-4" r="10" fill="url(#flowerRose)" opacity="0.9" />
            <circle cx="8" cy="11" r="10" fill="url(#flowerRose)" opacity="0.9" />
            <circle cx="-8" cy="11" r="10" fill="url(#flowerRose)" opacity="0.9" />
            <circle cx="-13" cy="-4" r="10" fill="url(#flowerRose)" opacity="0.9" />
            {/* Flower Center */}
            <circle cx="0" cy="0" r="8" fill="#FBBF24" />
            <circle cx="-2" cy="-2" r="2.5" fill="#FEF08A" />
          </g>

          {/* Secondary Flower (Lavender / Daisy) */}
          <g transform="translate(110, 110)">
            <circle cx="0" cy="-10" r="7" fill="url(#flowerLavender)" opacity="0.85" />
            <circle cx="9" cy="-3" r="7" fill="url(#flowerLavender)" opacity="0.85" />
            <circle cx="6" cy="8" r="7" fill="url(#flowerLavender)" opacity="0.85" />
            <circle cx="-6" cy="8" r="7" fill="url(#flowerLavender)" opacity="0.85" />
            <circle cx="-9" cy="-3" r="7" fill="url(#flowerLavender)" opacity="0.85" />
            <circle cx="0" cy="0" r="5.5" fill="#FDE047" />
          </g>

          {/* Small Bud Flower */}
          <g transform="translate(45, 130)">
            <ellipse cx="0" cy="0" rx="6" ry="8" fill="#F472B6" />
            <ellipse cx="0" cy="2" rx="4" ry="6" fill="#FDA4AF" />
          </g>

          {/* Fluttering Pastel Butterfly */}
          <g
            transform="translate(130, 60)"
            style={{
              animation: 'preoneButterflyHover 5s ease-in-out infinite',
            }}
          >
            {/* Wings */}
            <ellipse cx="-6" cy="-6" rx="9" ry="12" fill="#C084FC" opacity="0.85" transform="rotate(-25 -6 -6)" />
            <ellipse cx="6" cy="-6" rx="9" ry="12" fill="#C084FC" opacity="0.85" transform="rotate(25 6 -6)" />
            <ellipse cx="-4" cy="4" rx="6" ry="8" fill="#F472B6" opacity="0.8" transform="rotate(-15 -4 4)" />
            <ellipse cx="4" cy="4" rx="6" ry="8" fill="#F472B6" opacity="0.8" transform="rotate(15 4 4)" />
            {/* Wing Spots */}
            <circle cx="-6" cy="-8" r="2" fill="#FEF08A" />
            <circle cx="6" cy="-8" r="2" fill="#FEF08A" />
            {/* Body */}
            <ellipse cx="0" cy="0" rx="1.8" ry="8" fill="#475569" />
            {/* Antennae */}
            <path d="M-1 -8C-3 -12 -5 -13 -7 -13" stroke="#475569" strokeWidth="1" strokeLinecap="round" fill="none" />
            <path d="M1 -8C3 -12 5 -13 7 -13" stroke="#475569" strokeWidth="1" strokeLinecap="round" fill="none" />
          </g>
        </svg>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          4. LOWER-RIGHT: Preschool Schoolhouse, Hill & Trees
          Visible on xl displays (>= 1280px)
          ══════════════════════════════════════════════════════════════════ */}
      <div
        className="hidden xl:block absolute bottom-10 right-2 2xl:right-6 w-44 2xl:w-56 h-auto origin-bottom-right transition-opacity duration-500 opacity-75 hover:opacity-90"
        style={{
          filter: 'drop-shadow(0 10px 20px rgba(124, 58, 237, 0.08))',
        }}
      >
        <svg viewBox="0 0 240 200" fill="none" className="w-full h-auto">
          <defs>
            <linearGradient id="hillGreen" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#A7F3D0" />
              <stop offset="100%" stopColor="#6EE7B7" />
            </linearGradient>
            <linearGradient id="schoolWall" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FFFDF5" />
              <stop offset="100%" stopColor="#FEF3C7" />
            </linearGradient>
            <linearGradient id="roofCoral" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FDA4AF" />
              <stop offset="100%" stopColor="#F43F5E" />
            </linearGradient>
            <linearGradient id="treeGreen1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#86EFAC" />
              <stop offset="100%" stopColor="#22C55E" />
            </linearGradient>
            <linearGradient id="treeGreen2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6EE7B7" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
            <linearGradient id="pathGold" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FDE68A" />
              <stop offset="100%" stopColor="#F59E0B" />
            </linearGradient>
          </defs>

          {/* Rolling Green Hill */}
          <path
            d="M0 160C40 148 100 135 180 142C210 145 235 152 260 165V200H0V160Z"
            fill="url(#hillGreen)"
          />

          {/* Winding Yellow Cobblestone Pathway */}
          <path
            d="M120 145C118 160 128 175 135 185C140 192 145 198 152 200H118C110 192 106 182 108 170C110 160 114 150 116 145Z"
            fill="url(#pathGold)"
            opacity="0.85"
          />

          {/* Flanking Tree 1: Left */}
          <g transform="translate(48, 115)">
            <rect x="14" y="24" width="6" height="20" rx="3" fill="#92400E" />
            {/* Foliage */}
            <circle cx="17" cy="18" r="18" fill="url(#treeGreen1)" />
            <circle cx="12" cy="12" r="12" fill="#BBF7D0" opacity="0.4" />
            {/* Apple / Berry dots */}
            <circle cx="10" cy="18" r="2" fill="#F43F5E" />
            <circle cx="22" cy="14" r="2" fill="#F43F5E" />
            <circle cx="18" cy="24" r="2" fill="#F43F5E" />
          </g>

          {/* Flanking Tree 2: Right (Smaller) */}
          <g transform="translate(180, 125)">
            <rect x="10" y="20" width="5" height="18" rx="2.5" fill="#92400E" />
            <circle cx="12" cy="14" r="14" fill="url(#treeGreen2)" />
            <circle cx="9" cy="9" r="9" fill="#A7F3D0" opacity="0.4" />
            <circle cx="7" cy="14" r="1.8" fill="#F59E0B" />
            <circle cx="16" cy="11" r="1.8" fill="#F59E0B" />
          </g>

          {/* Schoolhouse Building */}
          <g transform="translate(85, 78)">
            {/* Base Wall */}
            <rect x="10" y="38" width="80" height="42" rx="4" fill="url(#schoolWall)" stroke="#E2E8F0" strokeWidth="1" />

            {/* Stepped Corner Bricks (Accent) */}
            <rect x="10" y="42" width="6" height="4" fill="#FDE68A" opacity="0.7" />
            <rect x="10" y="52" width="8" height="4" fill="#FDE68A" opacity="0.7" />
            <rect x="82" y="42" width="8" height="4" fill="#FDE68A" opacity="0.7" />
            <rect x="84" y="52" width="6" height="4" fill="#FDE68A" opacity="0.7" />

            {/* Main Coral Roof */}
            <polygon points="5,38 50,14 95,38" fill="url(#roofCoral)" />
            {/* Roof Eaves Highlight */}
            <line x1="4" y1="38" x2="96" y2="38" stroke="#FFE4E6" strokeWidth="2.5" strokeLinecap="round" />

            {/* Bell Tower / Belfry */}
            <rect x="42" y="4" width="16" height="12" rx="2" fill="url(#schoolWall)" stroke="#E2E8F0" strokeWidth="0.8" />
            {/* Belfry Roof */}
            <polygon points="39,4 50,-6 61,4" fill="url(#roofCoral)" />
            {/* School Bell */}
            <ellipse cx="50" cy="10" rx="3.5" ry="4" fill="#F59E0B" />

            {/* Golden Preschool Flag & Flagpole */}
            <line x1="50" y1="-6" x2="50" y2="-18" stroke="#64748B" strokeWidth="1.2" strokeLinecap="round" />
            <path
              d="M50 -18C56 -16 62 -20 68 -17C64 -14 58 -15 50 -13Z"
              fill="#FBBF24"
            />

            {/* Arched Preschool Entrance Door */}
            <path
              d="M42 80V58C42 53.5 45.5 50 50 50C54.5 50 58 53.5 58 58V80H42Z"
              fill="#0284C7"
            />
            {/* Door Window & Knob */}
            <circle cx="50" cy="58" r="3.5" fill="#BAE6FD" />
            <circle cx="55" cy="68" r="1.5" fill="#FDE047" />

            {/* Left Windows (Warm glow inside) */}
            <rect x="18" y="48" width="14" height="16" rx="2" fill="#FEF08A" stroke="#CBD5E1" strokeWidth="1" />
            <line x1="25" y1="48" x2="25" y2="64" stroke="#CBD5E1" strokeWidth="0.8" />
            <line x1="18" y1="56" x2="32" y2="56" stroke="#CBD5E1" strokeWidth="0.8" />

            {/* Right Windows (Warm glow inside) */}
            <rect x="68" y="48" width="14" height="16" rx="2" fill="#FEF08A" stroke="#CBD5E1" strokeWidth="1" />
            <line x1="75" y1="48" x2="75" y2="64" stroke="#CBD5E1" strokeWidth="0.8" />
            <line x1="68" y1="56" x2="82" y2="56" stroke="#CBD5E1" strokeWidth="0.8" />

            {/* Round Clock Above Door */}
            <circle cx="50" cy="30" r="5" fill="#FFFFFF" stroke="#94A3B8" strokeWidth="0.8" />
            <line x1="50" y1="30" x2="50" y2="27" stroke="#1E293B" strokeWidth="0.8" strokeLinecap="round" />
            <line x1="50" y1="30" x2="52.5" y2="30" stroke="#1E293B" strokeWidth="0.8" strokeLinecap="round" />
          </g>

          {/* Little Daisy Tufts in Lawn */}
          <circle cx="75" cy="162" r="2.5" fill="#FFFFFF" />
          <circle cx="75" cy="162" r="1.2" fill="#FBBF24" />
          <circle cx="160" cy="155" r="2.5" fill="#FFFFFF" />
          <circle cx="160" cy="155" r="1.2" fill="#FBBF24" />
          <circle cx="195" cy="172" r="2.5" fill="#FFFFFF" />
          <circle cx="195" cy="172" r="1.2" fill="#FBBF24" />
        </svg>
      </div>

      {/* ── Keyframe styles for gentle floating physics ── */}
      <style jsx global>{`
        @keyframes preoneFloatBalloon {
          0%, 100% {
            transform: translateY(0px) rotate(0deg);
          }
          50% {
            transform: translateY(-8px) rotate(1.2deg);
          }
        }
        @keyframes preoneSubtleRainbow {
          0% {
            transform: translateY(0px) scale(1);
          }
          100% {
            transform: translateY(-4px) scale(1.02);
          }
        }
        @keyframes preoneButterflyHover {
          0%, 100% {
            transform: translate(130px, 60px) rotate(0deg);
          }
          33% {
            transform: translate(134px, 54px) rotate(6deg);
          }
          66% {
            transform: translate(126px, 56px) rotate(-4deg);
          }
        }
      `}</style>
    </div>
  )
}
