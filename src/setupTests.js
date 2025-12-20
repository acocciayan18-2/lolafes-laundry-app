// src/setupTests.js

import '@testing-library/jest-dom';
console.log('setupTests loaded');
process.env.REACT_APP_FIREBASE_API_KEY = 'fake-key';
process.env.REACT_APP_FIREBASE_AUTH_DOMAIN = 'fake-domain';
process.env.REACT_APP_FIREBASE_DATABASE_URL = 'https://fake.url';
process.env.REACT_APP_FIREBASE_PROJECT_ID = 'fake-project-id';
process.env.REACT_APP_FIREBASE_STORAGE_BUCKET = 'fake-bucket';
process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID = 'fake-sender-id';
process.env.REACT_APP_FIREBASE_APP_ID = 'fake-app-id';

jest.mock('./services/firebase', () => ({
  auth: {},
  database: {},
}));

jest.mock('firebase/app', () => ({ initializeApp: jest.fn() }));
jest.mock('firebase/database', () => ({ getDatabase: jest.fn() }));
jest.mock('firebase/auth', () => ({ getAuth: jest.fn() }));