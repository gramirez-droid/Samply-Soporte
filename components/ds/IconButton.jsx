'use client';
import React from 'react';
import { Icon } from './Icon';

function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Samply IconButton — square icon-only action, used in dense table rows & toolbars.
   Tones map to the product's row actions (info=amber, edit=blue, pdf/ok=green, delete=red). */
function IconButton({
  icon,
  tone = 'default',
  size = 'md',
  variant = 'soft',
  disabled = false,
  title,
  onClick,
  style,
  ...rest
}) {
  const sizes = {
    sm: 28,
    md: 34,
    lg: 40
  };
  const isz = {
    sm: 16,
    md: 18,
    lg: 20
  };
  const dim = sizes[size] || sizes.md;
  const tones = {
    default: 'var(--text-secondary)',
    primary: 'var(--color-primary)',
    info: 'var(--samply-amber)',
    success: 'var(--color-success)',
    danger: 'var(--color-danger)',
    ai: 'var(--color-ai)',
    onDark: '#fff'
  };
  const c = tones[tone] || tones.default;
  const soft = {
    background: 'transparent',
    color: c,
    border: '1px solid transparent'
  };
  const outline = {
    background: 'transparent',
    color: c,
    border: `1px solid ${c}`
  };
  const solid = {
    background: c,
    color: '#fff',
    border: `1px solid ${c}`
  };
  const vmap = {
    soft,
    outline,
    solid
  };
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    title: title,
    "aria-label": title,
    onClick: disabled ? undefined : onClick,
    disabled: disabled,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: dim,
      height: dim,
      borderRadius: 'var(--radius-sm)',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.45 : 1,
      transition: 'background var(--dur-fast) var(--ease-out)',
      ...(vmap[variant] || soft),
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement(Icon, {
    name: icon,
    size: isz[size] || 18
  }));
}

export { IconButton };
