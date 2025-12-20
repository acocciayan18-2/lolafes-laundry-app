
jest.mock('../services/firebase', () => ({ auth: {} }));
jest.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: jest.fn(),
  setPersistence: jest.fn(),
  browserLocalPersistence: {},
  sendPasswordResetEmail: jest.fn(),
}));

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import Login from "../pages/Login";

import {
  signInWithEmailAndPassword,
  setPersistence,
} from "firebase/auth";

const mockNavigate = jest.fn();

jest.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
  Link: ({ children }) => <>{children}</>,
}));

// Mock Firebase auth instance
jest.mock("../services/firebase", () => ({
  auth: {},
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
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByText(/log in/i)).toBeInTheDocument();
  });

  test("updates input values when typing", () => {
    renderLogin();

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "test@email.com" },
    });

    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "password123" },
    });

    expect(screen.getByLabelText(/email/i).value).toBe("test@email.com");
    expect(screen.getByLabelText(/password/i).value).toBe("password123");
  });

  test("calls Firebase login on submit", async () => {
    signInWithEmailAndPassword.mockResolvedValue({
      user: { emailVerified: true },
    });

    renderLogin();

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "user@email.com" },
    });

    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "password123" },
    });

    fireEvent.click(screen.getByText(/log in/i));

    await waitFor(() => {
      expect(signInWithEmailAndPassword).toHaveBeenCalled();
    });
  });

  test("prevents login if email is not verified", async () => {
    signInWithEmailAndPassword.mockResolvedValue({
      user: { emailVerified: false },
    });

    renderLogin();

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "unverified@email.com" },
    });

    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "password123" },
    });

    fireEvent.click(screen.getByText(/log in/i));

    await waitFor(() => {
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  test("shows error message on invalid login", async () => {
    signInWithEmailAndPassword.mockRejectedValue({
      code: "auth/wrong-password",
    });

    renderLogin();

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "wrong@email.com" },
    });

    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "wrongpass" },
    });

    fireEvent.click(screen.getByText(/log in/i));

    await waitFor(() => {
      expect(
        screen.getByText(/invalid email or password/i)
      ).toBeInTheDocument();
    });
  });

  test("toggles password visibility", () => {
    renderLogin();

    //added , { selector: 'input' }
    const passwordInput = screen.getByLabelText(/password/i, { selector: 'input' });
    const toggleButton = screen.getByRole("button", {
      name: /toggle password visibility/i,
    });

    expect(passwordInput.type).toBe("password");

    fireEvent.click(toggleButton);
    expect(passwordInput.type).toBe("text");

    fireEvent.click(toggleButton);
    expect(passwordInput.type).toBe("password");
  });

  test("navigates to main page after successful login", async () => {
    signInWithEmailAndPassword.mockResolvedValue({
      user: { emailVerified: true },
    });

    renderLogin();

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "success@email.com" },
    });

    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "password123" },
    });

    fireEvent.click(screen.getByText(/log in/i));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/main");
    });
  });
});

