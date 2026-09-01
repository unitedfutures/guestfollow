import { cn } from '@/lib/utils'

interface LogoProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'white'  // white = 白背景用、default = ダーク背景用
  iconOnly?: boolean
}

export function Logo({ className, size = 'md', variant = 'default', iconOnly = false }: LogoProps) {
  const sizes = { sm: 'h-8', md: 'h-10', lg: 'h-14' }
  const navyColor = variant === 'white' ? '#1C3461' : '#FFFFFF'
  const goldColor = '#C9A84C'

  return (
    <div className={cn('flex items-center gap-2.5', sizes[size], className)}>
      {/* アイコン: ドア + QRコード */}
      <svg
        viewBox="0 0 56 56"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-full w-auto"
      >
        {/* ドア本体（開いた状態・パース感あり） */}
        <path
          d="M8 6 L36 6 L36 50 L8 50 Z"
          fill={navyColor}
          opacity="0.15"
        />
        <path
          d="M10 8 L34 8 L34 48 L10 48 Z"
          fill={navyColor}
          opacity="0.25"
        />
        {/* ドアの開いた面（白い光） */}
        <path
          d="M34 8 L42 14 L42 50 L34 48 Z"
          fill={navyColor}
          opacity="0.08"
        />
        {/* ドア枠 */}
        <rect x="10" y="8" width="24" height="40" rx="1.5" fill={navyColor} opacity="0.9"/>
        {/* ドアノブ */}
        <circle cx="30" cy="28" r="2" fill={variant === 'white' ? '#FFFFFF' : '#1C3461'} opacity="0.9"/>
        {/* 開口部（白） */}
        <path d="M34 8 L44 13 L44 50 L34 48 Z" fill={variant === 'white' ? 'rgba(255,255,255,0.15)' : 'rgba(28,52,97,0.1)'}/>
        {/* ドアの影ライン */}
        <line x1="34" y1="8" x2="34" y2="48" stroke={navyColor} strokeWidth="1.5" opacity="0.6"/>

        {/* QRコード（右上） */}
        <g transform="translate(33, 3)" opacity="0.95">
          {/* 外枠 */}
          <rect x="0" y="0" width="8" height="8" rx="1" fill={navyColor}/>
          <rect x="1.5" y="1.5" width="5" height="5" rx="0.5" fill={variant === 'white' ? '#FFFFFF' : '#E8EEF8'}/>
          <rect x="2.5" y="2.5" width="3" height="3" rx="0.3" fill={navyColor}/>

          <rect x="10" y="0" width="8" height="8" rx="1" fill={navyColor}/>
          <rect x="11.5" y="1.5" width="5" height="5" rx="0.5" fill={variant === 'white' ? '#FFFFFF' : '#E8EEF8'}/>
          <rect x="12.5" y="2.5" width="3" height="3" rx="0.3" fill={navyColor}/>

          <rect x="0" y="10" width="8" height="8" rx="1" fill={navyColor}/>
          <rect x="1.5" y="11.5" width="5" height="5" rx="0.5" fill={variant === 'white' ? '#FFFFFF' : '#E8EEF8'}/>
          <rect x="2.5" y="12.5" width="3" height="3" rx="0.3" fill={navyColor}/>

          {/* 中央のドット群 */}
          <rect x="10" y="10" width="2" height="2" rx="0.3" fill={navyColor}/>
          <rect x="13" y="10" width="2" height="2" rx="0.3" fill={navyColor}/>
          <rect x="16" y="10" width="2" height="2" rx="0.3" fill={navyColor}/>
          <rect x="10" y="13" width="2" height="2" rx="0.3" fill={navyColor}/>
          <rect x="13" y="13" width="5" height="2" rx="0.3" fill={navyColor}/>
          <rect x="10" y="16" width="2" height="2" rx="0.3" fill={navyColor}/>
          <rect x="13" y="16" width="2" height="2" rx="0.3" fill={navyColor}/>
          <rect x="16" y="16" width="2" height="2" rx="0.3" fill={navyColor}/>
        </g>
      </svg>

      {/* テキスト */}
      {!iconOnly && (
        <div className="flex items-baseline gap-0 leading-none">
          <span
            style={{ color: navyColor, fontWeight: 700, fontSize: size === 'sm' ? '1.1rem' : size === 'md' ? '1.35rem' : '1.8rem', letterSpacing: '-0.02em', fontFamily: 'system-ui' }}
          >
            Guest
          </span>
          <span
            style={{ color: goldColor, fontWeight: 800, fontSize: size === 'sm' ? '1.1rem' : size === 'md' ? '1.35rem' : '1.8rem', letterSpacing: '-0.02em', fontFamily: 'system-ui' }}
          >
            Follow
          </span>
        </div>
      )}
    </div>
  )
}
