import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import SignUp from "../pages/SignUp";

// Mock Firebase Auth functions
import {
  createUserWithEmailAndPassword,
  fetchSignInMethodsForEmail,
  sendEmailVerification,
} from "firebase/auth";

// Mock Firebase Realtime Database
import { get } from "firebase/database";

// Mock EmailJS
import emailjs from "@emailjs/browser";

// ✅ Consolidated Mocks
jest.mock("../services/firebase", () => ({
  auth: {},
  database: {},
}));

jest.mock("firebase/auth", () => ({
  createUserWithEmailAndPassword: jest.fn(),
  sendEmailVerification: jest.fn(),
  fetchSignInMethodsForEmail: jest.fn(),
}));

jest.mock("firebase/database", () => ({
  getDatabase: jest.fn(),
  ref: jest.fn(),
  get: jest.fn(),
}));

jest.mock("@emailjs/browser", () => ({
  send: jest.fn(),
}));

describe("SignUp Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderComponent = () =>
    render(
      <BrowserRouter>
        <SignUp />
      </BrowserRouter>
    );

  test("renders email and password fields", () => {
    renderComponent();

    expect(screen.getByPlaceholderText(/Enter your Email/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Enter your password/i)).toBeInTheDocument();
  });

  test("disables signup button when password is invalid", () => {
    renderComponent();
    const button = screen.getByRole("button", { name: /Send OTP Verification/i });
    expect(button).toBeDisabled();
  });

  test("shows password criteria checkmarks when typing password", () => {
    renderComponent();
    const passwordInput = screen.getByPlaceholderText(/Enter your password/i);

    fireEvent.change(passwordInput, { target: { value: "Ab1!" } });

    expect(screen.getByText(/At least 6 characters/i)).toBeInTheDocument();
    expect(screen.getByText(/At least 1 uppercase letter/i)).toBeInTheDocument();
    expect(screen.getByText(/At least 1 number/i)).toBeInTheDocument();
    expect(screen.getByText(/At least 1 special character/i)).toBeInTheDocument();
  });

  test("sends OTP when email is valid and not registered", async () => {
    fetchSignInMethodsForEmail.mockResolvedValue([]);
    get.mockResolvedValue({
      exists: () => true,
      val: () => "admin@example.com",
    });
    emailjs.send.mockResolvedValue({ status: 200 });

    renderComponent();

    const emailInput = screen.getByPlaceholderText(/Enter your Email/i);
    const passwordInput = screen.getByPlaceholderText(/Enter your password/i);
    const button = screen.getByRole("button", { name: /Send OTP Verification/i });

    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "Abcdef1!" } });

    fireEvent.click(button);

    // ✅ Fix: Using findByText to properly await the async status message appearance
    // This resolves MutationObserver issues by waiting for the re-render.
    expect(await screen.findByText(/OTP sent to admin email/i)).toBeInTheDocument();
    
    await waitFor(() => {
      expect(emailjs.send).toHaveBeenCalled();
    });
  });

  test("completes signup when OTP is correct", async () => {
    fetchSignInMethodsForEmail.mockResolvedValue([]);
    get.mockResolvedValue({
      exists: () => true,
      val: () => "admin@example.com",
    });
    emailjs.send.mockResolvedValue({ status: 200 });
    createUserWithEmailAndPassword.mockResolvedValue({
      user: { email: "test@example.com" },
    });
    sendEmailVerification.mockResolvedValue();

    renderComponent();

    const emailInput = screen.getByPlaceholderText(/Enter your Email/i);
    const passwordInput = screen.getByPlaceholderText(/Enter your password/i);
    const sendOtpButton = screen.getByRole("button", { name: /Send OTP Verification/i });

    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "Abcdef1!" } });

    fireEvent.click(sendOtpButton);

    // ✅ Fix: Await the transition to the OTP input screen
    // Using findBy ensures the element exists before trying to interact with it.
    const otpInput = await screen.findByPlaceholderText(/000000/i);
    const completeSignupButton = screen.getByRole("button", { name: /Complete Signup/i });

    fireEvent.change(otpInput, { target: { value: "123456" } });
    fireEvent.click(completeSignupButton);

    await waitFor(() => {
      expect(createUserWithEmailAndPassword).toHaveBeenCalled();
    });
  });
});