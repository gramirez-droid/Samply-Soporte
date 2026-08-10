'use client';
import React from 'react';

function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Samply Badge — status pills. Mirrors the product's order/route states.
   Tones: success, danger, warning, info(sky), neutral, ai. Styles: solid | soft | outline. */
function Badge({
  children,
  tone = 'neutral',
  variant = 'soft',
  size = 'md',
  dot = false,
  style,
  ...rest
}) {
  const palette = {
    success: {
      c: 'var(--samply-green)',
      bg: 'var(--samply-green-50)'
    },
    danger: {
      c: 'var(--samply-red)',
      bg: 'var(--samply-red-50)'
    },
    warning: {
      c: 'var(--samply-amber)',
      bg: 'var(--samply-amber-50)'
    },
    info: {
      c: 'var(--samply-blue)',
      bg: 'var(--samply-blue-50)'
    },
    sky: {
      c: '#fff',
      bg: 'var(--samply-sky)'
    },
    primary: {
      c: 'var(--samply-blue)',
      bg: 'var(--samply-blue-50)'
    },
    ai: {
      c: 'var(--samply-blue-light)',
      bg: 'var(--samply-blue-50)'
    },
    neutral: {
      c: 'var(--text-secondary)',
      bg: '#EEF3F8'
    }
  };
  const p = palette[tone] || palette.neutral;
  const sizes = {
    sm: {
      fs: 11,
      pad: '2px 8px',
      h: 18
    },
    md: {
      fs: 12,
      pad: '3px 10px',
      h: 22
    },
    lg: {
      fs: 13,
      pad: '4px 12px',
      h: 26
    }
  };
  const s = sizes[size] || sizes.md;
  let css;
  if (variant === 'solid') {
    css = {
      background: tone === 'sky' ? 'var(--samply-sky)' : p.c,
      color: '#fff',
      border: '1px solid transparent'
    };
  } else if (variant === 'outline') {
    css = {
      background: 'transparent',
      color: p.c,
      border: `1px solid ${p.c}`
    };
  } else {
    css = {
      background: p.bg,
      color: tone === 'sky' ? 'var(--samply-blue)' : p.c,
      border: '1px solid transparent'
    };
  }
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      height: s.h,
      padding: s.pad,
      fontFamily: 'var(--font-sans)',
      fontSize: s.fs,
      fontWeight: 600,
      lineHeight: 1,
      borderRadius: 'var(--radius-pill)',
      whiteSpace: 'nowrap',
      ...css,
      ...style
    }
  }, rest), dot && /*#__PURE__*/React.createElement("span", {
    style: {
      width: 6,
      height: 6,
      borderRadius: '50%',
      background: 'currentColor',
      flex: 'none'
    }
  }), children);
}

export { Badge };
