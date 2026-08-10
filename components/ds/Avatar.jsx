'use client';
import React from 'react';

function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Samply Avatar — initials on a navy circle (user), or an image. Sizes sm/md/lg.
   Used in the sidebar/drawer footer and operation history. */
function Avatar({
  name = '',
  src,
  size = 'md',
  tone = 'navy',
  style,
  ...rest
}) {
  const sizes = {
    xs: 24,
    sm: 32,
    md: 40,
    lg: 48
  };
  const fs = {
    xs: 10,
    sm: 13,
    md: 15,
    lg: 18
  };
  const dim = sizes[size] || sizes.md;
  const initials = name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join('');
  const tones = {
    navy: {
      bg: 'var(--samply-navy)',
      color: '#fff'
    },
    blue: {
      bg: 'var(--samply-blue)',
      color: '#fff'
    },
    sky: {
      bg: 'var(--samply-blue-50)',
      color: 'var(--samply-blue)'
    }
  };
  const t = tones[tone] || tones.navy;
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      width: dim,
      height: dim,
      borderRadius: '50%',
      flex: 'none',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'var(--font-sans)',
      fontSize: fs[size] || 15,
      fontWeight: 600,
      overflow: 'hidden',
      background: t.bg,
      color: t.color,
      ...style
    }
  }, rest), src ? /*#__PURE__*/React.createElement("img", {
    src: src,
    alt: name,
    style: {
      width: '100%',
      height: '100%',
      objectFit: 'cover'
    }
  }) : initials);
}

export { Avatar };
