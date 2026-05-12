// Input Sanitization — XSS Protection

export function sanitize(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

// Clean text — strip script tags but keep normal text
export function cleanText(input: string): string {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    .trim();
}

// Validate mobile number (Bangladesh)
export function isValidMobile(mobile: string): boolean {
  return /^01[3-9]\d{8}$/.test(mobile.trim());
}

// Validate NID (only digits, 10 or 17 digits)
export function isValidNID(nid: string): boolean {
  if (!nid.trim()) return true; // optional field
  return /^\d{10}$|^\d{17}$/.test(nid.trim());
}

// Backup JSON schema validation
export function validateBackupData(data: any): { valid: boolean; error?: string } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'ফাইলটি সঠিক JSON নয়' };
  }

  // Check required arrays
  const requiredArrays = ['customers', 'jobs', 'transactions', 'services'];
  for (const key of requiredArrays) {
    if (data[key] && !Array.isArray(data[key])) {
      return { valid: false, error: `"${key}" ডেটা সঠিক ফরম্যাটে নেই` };
    }
  }

  // Validate customers structure
  if (data.customers) {
    for (const c of data.customers) {
      if (!c.id || !c.name || !c.mobile) {
        return { valid: false, error: 'গ্রাহক ডেটায় id/name/mobile অনুপস্থিত' };
      }
    }
  }

  // Validate jobs structure
  if (data.jobs) {
    for (const j of data.jobs) {
      if (!j.id || j.totalAmount === undefined) {
        return { valid: false, error: 'কাজের ডেটায় id/totalAmount অনুপস্থিত' };
      }
    }
  }

  return { valid: true };
}
