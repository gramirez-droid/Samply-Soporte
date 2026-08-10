'use client';
import React from 'react';
import { Icon } from './Icon';

function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Samply Input — light-fill field matching the backoffice filters/forms.
   Optional label, leading icon, hint/error. Focus lifts to white + blue ring. */
function Input({
  label,
  value,
  defaultValue,
  placeholder,
  type = 'text',
  icon,
  hint,
  error,
  disabled = false,
  required = false,
  onChange,
  id,
  style,
  ...rest
}) {
  const [focus, setFocus] = React.useState(false);
  const inputId = id || (label ? `in-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);
  const borderColor = error ? 'var(--color-danger)' : focus ? 'var(--color-primary)' : 'transparent';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      ...style
    }
  }, label && /*#__PURE__*/React.createElement("label", {
    htmlFor: inputId,
    style: {
      fontSize: 13,
      fontWeight: 500,
      color: 'var(--text-secondary)'
    }
  }, label, required && /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--color-danger)'
    }
  }, " *")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      height: 40,
      padding: '0 12px',
      background: disabled ? '#EEF2F7' : focus ? 'var(--color-surface)' : '#F1F5FB',
      border: `1px solid ${borderColor}`,
      borderRadius: 'var(--radius-sm)',
      boxShadow: focus && !error ? 'var(--focus-ring)' : 'none',
      transition: 'background var(--dur-fast), box-shadow var(--dur-fast), border-color var(--dur-fast)',
      opacity: disabled ? 0.6 : 1
    }
  }, icon && /*#__PURE__*/React.createElement(Icon, {
    name: icon,
    size: 18,
    color: "var(--text-secondary)"
  }), /*#__PURE__*/React.createElement("input", _extends({
    id: inputId,
    type: type,
    value: value,
    defaultValue: defaultValue,
    placeholder: placeholder,
    disabled: disabled,
    onChange: onChange,
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    style: {
      flex: 1,
      minWidth: 0,
      border: 'none',
      outline: 'none',
      background: 'transparent',
      fontFamily: 'var(--font-sans)',
      fontSize: 14,
      color: 'var(--text-primary)'
    }
  }, rest))), (hint || error) && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: error ? 'var(--color-danger)' : 'var(--text-secondary)'
    }
  }, error || hint));
}

export { Input };
