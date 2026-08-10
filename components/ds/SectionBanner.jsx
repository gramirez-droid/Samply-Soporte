'use client';
import React from 'react';
import { Icon } from './Icon';

function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Samply SectionBanner — the product's signature full-width band introducing a block.
   tone='sky' (default, = logo medium bar) or 'navy' (emphasis). Centered white text. */
function SectionBanner({
  children,
  tone = 'sky',
  icon,
  align = 'center',
  size = 'md',
  actions,
  style,
  ...rest
}) {
  const bg = tone === 'navy' ? 'var(--surface-banner-navy)' : 'var(--surface-banner)';
  const sizes = {
    sm: {
      h: 36,
      fs: 13
    },
    md: {
      h: 44,
      fs: 15
    },
    lg: {
      h: 52,
      fs: 17
    }
  };
  const s = sizes[size] || sizes.md;
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: actions ? 'space-between' : align === 'center' ? 'center' : 'flex-start',
      gap: 10,
      minHeight: s.h,
      padding: '0 16px',
      background: bg,
      color: '#fff',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      fontFamily: 'var(--font-sans)',
      fontSize: s.fs,
      fontWeight: 600,
      letterSpacing: '0.01em'
    }
  }, icon && /*#__PURE__*/React.createElement(Icon, {
    name: icon,
    size: 18
  }), children), actions && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8
    }
  }, actions));
}

export { SectionBanner };
