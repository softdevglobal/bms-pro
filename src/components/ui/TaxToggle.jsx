import React from 'react';

/**
 * TaxToggle - Box-style toggle button for selecting Inclusive or Exclusive Tax
 * @param {Object} props
 * @param {string} props.value - Current value: 'inclusive' or 'exclusive'
 * @param {function} props.onChange - Callback when value changes
 * @param {string} props.className - Additional CSS classes
 */
const TaxToggle = ({ value = 'inclusive', onChange, className = '' }) => {
  const isExclusive = value === 'exclusive';

  return (
    <div
      className={`relative inline-flex w-60 h-8 border border-gray-800 bg-gray-50 cursor-pointer select-none ${className}`}
      onClick={(e) => {
        e.stopPropagation();
        onChange(isExclusive ? 'inclusive' : 'exclusive');
      }}
    >
      {/* Active background */}
      <div
        className={`absolute top-0 left-0 bottom-0 w-1/2 bg-gray-800 transition-transform duration-300 ease-in-out ${
          isExclusive ? 'translate-x-full' : 'translate-x-0'
        }`}
      />

      {/* Inclusive Tax */}
      <div
        className={`relative flex-1 flex items-center justify-center text-center font-semibold text-sm z-10 transition-colors duration-300 ${
          !isExclusive ? 'text-white' : 'text-gray-800'
        }`}
      >
        <span className="pointer-events-none">Inclusive Tax</span>
      </div>

      {/* Exclusive Tax */}
      <div
        className={`relative flex-1 flex items-center justify-center text-center font-semibold text-sm z-10 transition-colors duration-300 ${
          isExclusive ? 'text-white' : 'text-gray-800'
        }`}
      >
        <span className="pointer-events-none">Exclusive Tax</span>
      </div>
    </div>
  );
};

export default TaxToggle;
