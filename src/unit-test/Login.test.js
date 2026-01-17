import "@testing-library/jest-dom"; // ✅ FIX 1: Import this to fix "toBeInTheDocument" error
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import Login from "../pages/Login";

import {
  setPersistence,
  signInWithEmailAndPassword,
} from "firebase/auth";

// Navigation mock
const mockNavigate = jest.fn();

jest.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
  Link: ({ children }) => <>{children}</>,
}));

// ✅ FIX 2: Add signOut to the auth mock
jest.mock("../services/firebase", () => ({
  auth: {
    signOut: jest.fn(),
  },
}));

// Mock Firebase auth functions
jest.mock("firebase/auth", () => ({
  signInWithEmailAndPassword: jest.fn(),
  setPersistence: jest.fn(),
  browserLocalPersistence: {},
  sendPasswordResetEmail: jest.fn(),
}));

describe("Login Component (Jest)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setPersistence.mockResolvedValue();
  });

  const renderLogin = () => render(<Login />);

  test("renders email and password inputs", () => {
    renderLogin();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i, { selector: 'input' })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /log in/i })).toBeInTheDocument();
  });

  test("updates input values when typing", () => {
    renderLogin();
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "test@email.com" } });
    fireEvent.change(screen.getByLabelText(/password/i, { selector: 'input' }), { target: { value: "password123" } });
    expect(screen.getByLabelText(/email/i).value).toBe("test@email.com");
    expect(screen.getByLabelText(/password/i, { selector: 'input' }).value).toBe("password123");
  });

  test("calls Firebase login on submit", async () => {
    signInWithEmailAndPassword.mockResolvedValue({ user: { emailVerified: true } });
    renderLogin();

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "user@email.com" } });
    fireEvent.change(screen.getByLabelText(/password/i, { selector: 'input' }), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: /log in/i }));

    await waitFor(() => {
      expect(signInWithEmailAndPassword).toHaveBeenCalled();
    });
  });

  test("prevents login if email is not verified", async () => {
    signInWithEmailAndPassword.mockResolvedValue({ user: { emailVerified: false } });
    renderLogin();

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "unverified@email.com" } });
    fireEvent.change(screen.getByLabelText(/password/i, { selector: 'input' }), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: /log in/i }));

    await waitFor(() => {
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  test("shows error message on invalid login", async () => {
    // ✅ Mock console.error to keep output clean
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    
    signInWithEmailAndPassword.mockRejectedValue({ code: "auth/wrong-password" });
    renderLogin();

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "wrong@email.com" } });
    fireEvent.change(screen.getByLabelText(/password/i, { selector: 'input' }), { target: { value: "wrongpass" } });
    fireEvent.click(screen.getByRole("button", { name: /log in/i }));

    // ✅ Use findByText to wait for the popup
    const errorMessage = await screen.findByText(/invalid email or password/i);
    expect(errorMessage).toBeInTheDocument();

    consoleSpy.mockRestore();
  });

  test("toggles password visibility", () => {
    renderLogin();
    const passwordInput = screen.getByLabelText(/password/i, { selector: 'input' });
    const toggleButton = screen.getByRole("button", { name: /toggle password visibility/i });

    expect(passwordInput.type).toBe("password");
    fireEvent.click(toggleButton);
    expect(passwordInput.type).toBe("text");
    fireEvent.click(toggleButton);
    expect(passwordInput.type).toBe("password");
  });

  test("navigates to main page after successful login", async () => {
    signInWithEmailAndPassword.mockResolvedValue({ user: { emailVerified: true } });
    renderLogin();

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "success@email.com" } });
    fireEvent.change(screen.getByLabelText(/password/i, { selector: 'input' }), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: /log in/i }));

    // ✅ Wait long enough for the 1000ms setTimeout
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/main");
    }, { timeout: 2000 });
  });
});