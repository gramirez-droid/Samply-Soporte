'use client';
import React from 'react';
import { Icon } from './Icon';

function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Samply Button — primary (solid blue), secondary (outline), ghost, subtle, danger.
   Flat by spec (no aggressive shadow). 4px radius. */
function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  fullWidth = false,
  disabled = false,
  type = 'button',
  onClick,
  style,
  ...rest
}) {
  const sizes = {
    sm: {
      padding: '0 12px',
      height: 32,
      fontSize: 13,
      gap: 6,
      isz: 16
    },
    md: {
      padding: '0 16px',
      height: 40,
      fontSize: 14,
      gap: 8,
      isz: 18
    },
    lg: {
      padding: '0 22px',
      height: 46,
      fontSize: 15,
      gap: 8,
      isz: 20
    }
  };
  const s = sizes[size] || sizes.md;
  const variants = {
    primary: {
      background: 'var(--color-primary)',
      color: 'var(--text-on-brand)',
      border: '1px solid var(--color-primary)'
    },
    secondary: {
      background: 'transparent',
      color: 'var(--color-primary)',
      border: '1px solid var(--color-primary)'
    },
    ghost: {
      background: 'transparent',
      color: 'var(--text-primary)',
      border: '1px solid transparent'
    },
    subtle: {
      background: 'var(--samply-blue-50)',
      color: 'var(--color-primary)',
      border: '1px solid transparent'
    },
    danger: {
      background: 'var(--color-danger)',
      color: '#fff',
      border: '1px solid var(--color-danger)'
    },
    success: {
      background: 'var(--color-success)',
      color: '#fff',
      border: '1px solid var(--color-success)'
    }
  };
  const v = variants[variant] || variants.primary;
  return /*#__PURE__*/React.createElement("button", _extends({
    type: type,
    onClick: disabled ? undefined : onClick,
    disabled: disabled,
    "data-variant": variant,
    style: {
      display: fullWidth ? 'flex' : 'inline-flex',
      width: fullWidth ? '100%' : undefined,
      alignItems: 'center',
      justifyContent: 'center',
      gap: s.gap,
      height: s.height,
      padding: s.padding,
      fontFamily: 'var(--font-sans)',
      fontSize: s.fontSize,
      fontWeight: 600,
      lineHeight: 1,
      letterSpacing: 0,
      borderRadius: 'var(--radius-sm)',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
      transition: 'background var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out)',
      whiteSpace: 'nowrap',
      ...v,
      ...style
    }
  }, rest), icon && /*#__PURE__*/React.createElement(Icon, {
    name: icon,
    size: s.isz
  }), children, iconRight && /*#__PURE__*/React.createElement(Icon, {
    name: iconRight,
    size: s.isz
  }));
}

export { Button };
