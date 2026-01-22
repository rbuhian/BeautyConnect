// Jest setup file

// Mock react-native before jest.requireActual
jest.mock('react-native', () => ({}), { virtual: true });
jest.mock('react-native-url-polyfill/auto', () => ({}));

// Mock supabase before importing anything
jest.mock('./src/services/supabase', () => ({
  supabase: {
    from: jest.fn(),
    channel: jest.fn(),
    removeChannel: jest.fn(),
  },
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}));
