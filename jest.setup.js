// Mock uuid to avoid ESM issues
// UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
jest.mock('uuid', () => ({
  v4: jest.fn(() => {
    // Generate a proper UUID v4 format for validation
    const hex = '0123456789abcdef';
    let uuid = '';
    for (let i = 0; i < 36; i++) {
      if (i === 8 || i === 13 || i === 18 || i === 23) {
        uuid += '-';
      } else if (i === 14) {
        uuid += '4'; // UUID v4
      } else if (i === 19) {
        uuid += hex[(Math.random() * 4 | 8)]; // 8, 9, a, or b
      } else {
        uuid += hex[Math.floor(Math.random() * 16)];
      }
    }
    return uuid;
  }),
}));
