import React from 'react';

export const LockIcon = ({ className }: { className?: string }) => (
    <svg
        viewBox="0 0 100 125"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        fill="none"
    >
        {/* Shackle */}
        <path d="M32 70 V40 A18 18 0 0 1 68 40 V70"
            fill="none"
            stroke="#E6E6E6"
            strokeWidth="14"
            strokeLinecap="round" />

        {/* Main Body */}
        <circle cx="50" cy="80" r="40" fill="#F2F2F2" />

        {/* Inner Ring */}
        <circle cx="50" cy="80" r="22" fill="#E8E8E8" />

        {/* Center Button */}
        <circle cx="50" cy="80" r="12" fill="#D1D1D1" />

        {/* Subtle highlight */}
        <circle cx="50" cy="80" r="12" fill="url(#btnGradientLock)" opacity="0.1" />

        <defs>
            <linearGradient id="btnGradientLock" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="white" />
                <stop offset="100%" stopColor="black" />
            </linearGradient>
        </defs>
    </svg>
);

export const CubeIcon = ({ className }: { className?: string }) => (
    <svg
        viewBox="0 0 100 112"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        fill="none"
    >
        <defs>
            <linearGradient id="faceGradientCube" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#D9D9D9" stopOpacity="0.2" />
            </linearGradient>
        </defs>

        {/* BACKGROUND SHAPE */}
        <path d="M50 10 
             L85 30 
             L85 75 
             L50 95 
             L15 75 
             L15 30 Z"
            fill="#F2F2F2"
            stroke="#F2F2F2"
            strokeWidth="12"
            strokeLinejoin="round" />

        {/* INTERNAL GEOMETRY */}
        <g stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round">
            <line x1="50" y1="52" x2="50" y2="95" />
            <line x1="50" y1="52" x2="85" y2="30" />
            <line x1="50" y1="52" x2="15" y2="30" />
        </g>

        {/* LEFT FACE SHADING */}
        <path d="M50 52 L15 30 L15 75 L50 95 Z" fill="#E6E6E6" opacity="0.4" />

        {/* RIGHT FACE SHADING */}
        <path d="M50 52 L85 30 L85 75 L50 95 Z" fill="#D9D9D9" opacity="0.4" />

        {/* CENTER MECHANISM */}
        <circle cx="50" cy="52" r="20" fill="#F2F2F2" stroke="#E6E6E6" strokeWidth="3" />
        <circle cx="50" cy="52" r="14" fill="#E8E8E8" />
        <circle cx="50" cy="52" r="8" fill="#D1D1D1" />
        <circle cx="50" cy="52" r="8" fill="url(#faceGradientCube)" opacity="0.3" />
    </svg>
);

export const ZapIcon = ({ className }: { className?: string }) => (
    <svg
        viewBox="0 0 100 125"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        fill="none"
    >
        <defs>
            <linearGradient id="btnGradientZap" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="white" />
                <stop offset="100%" stopColor="black" />
            </linearGradient>

            <filter id="softShadowZap" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur in="SourceAlpha" stdDeviation="1" />
                <feOffset dx="0" dy="2" result="offsetblur" />
                <feComponentTransfer>
                    <feFuncA type="linear" slope="0.1" />
                </feComponentTransfer>
                <feMerge>
                    <feMergeNode />
                    <feMergeNode in="SourceGraphic" />
                </feMerge>
            </filter>
        </defs>

        <g filter="url(#softShadowZap)">
            {/* BOTTOM SEGMENT */}
            <path d="M 62 62 L 42 105"
                stroke="#E6E6E6"
                strokeWidth="24"
                strokeLinecap="round"
                fill="none" />

            <path d="M 62 62 L 42 105"
                stroke="#F2F2F2"
                strokeWidth="20"
                strokeLinecap="round"
                fill="none" />

            {/* TOP SEGMENT */}
            <path d="M 58 20 L 38 62"
                stroke="#E6E6E6"
                strokeWidth="24"
                strokeLinecap="round"
                fill="none" />

            <path d="M 58 20 L 38 62"
                stroke="#F2F2F2"
                strokeWidth="20"
                strokeLinecap="round"
                fill="none" />

            {/* CENTRAL JOINT */}
            <circle cx="50" cy="62" r="21" fill="white" />
            <circle cx="50" cy="62" r="18" fill="#F2F2F2" />
            <circle cx="50" cy="62" r="12" fill="#E8E8E8" />
            <circle cx="50" cy="62" r="7" fill="#D1D1D1" />
            <circle cx="50" cy="62" r="7" fill="url(#btnGradientZap)" opacity="0.1" />
        </g>
    </svg>
);
