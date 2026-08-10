'use client';
import React from 'react';

function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Samply Card — white surface, soft 8px radius, hairline border + subtle shadow.
   `pad` controls inner padding; `interactive` adds hover lift for clickable cards. */
function Card({
  children,
  pad = 'md',
  interactive = false,
  as = 'div',
  style,
  ...rest
}) {
  const Tag = as;
  const pads = {
    none: 0,
    sm: 'var(--space-3)',
    md: 'var(--space-4)',
    lg: 'var(--space-6)'
  };
  return /*#__PURE__*/React.createElement(Tag, _extends({
    style: {
      background: 'var(--color-surface)',
      border: 'var(--border)',
      borderRadius: 'var(--radius-md)',
      boxShadow: 'var(--shadow-sm)',
      padding: pads[pad] ?? pads.md,
      transition: interactive ? 'box-shadow var(--dur-base) var(--ease-out), transform var(--dur-base) var(--ease-out)' : undefined,
      cursor: interactive ? 'pointer' : undefined,
      ...style
    }
  }, rest), children);
}

export { Card };
