// utils/normalizePhoneNumber.js

export const normalizePhoneNumber = (phoneNumber) => {
  if (!phoneNumber || typeof phoneNumber !== 'string') {
    return null; // Or throw an error, depending on your preference
  }

  // Remove non-numeric characters
  let normalized = phoneNumber.replace(/\D/g, '');

  // Add '234' if it's a Nigerian number starting with 0
  if (normalized.startsWith('0')) {
    normalized = '234' + normalized.slice(1);
  }

  // If already starts with 234 and is valid length
  if (normalized.startsWith('234') && normalized.length === 13) {
    return normalized;
  }

  return normalized;
};

  export default normalizePhoneNumber;